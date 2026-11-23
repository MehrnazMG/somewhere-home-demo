// Pure helpers for reading MediaPipe hand landmarks. No DOM, no Three.js,
// so they are easy to test and to swap for another tracker.
//
// Landmark indices (MediaPipe Hands):
//   0 wrist · thumb 1–4 · index 5–8 · middle 9–12 · ring 13–16 · pinky 17–20

const FINGERS = {
  index: { mcp: 5, pip: 6, tip: 8 },
  middle: { mcp: 9, pip: 10, tip: 12 },
  ring: { mcp: 13, pip: 14, tip: 16 },
  pinky: { mcp: 17, pip: 18, tip: 20 },
};

/** Distance between landmarks, correcting x for the camera's aspect ratio. */
export function dist(a, b, aspect = 1) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

function isExtended(lm, f, aspect) {
  const w = lm[0];
  const tip = dist(w, lm[f.tip], aspect);
  return tip > dist(w, lm[f.pip], aspect) * 1.12 && tip > dist(w, lm[f.mcp], aspect) * 1.4;
}

/**
 * Classifies a hand as:
 *   'point' – index finger out, the others curled → aim at things
 *   'open'  – open palm → turn the world
 *   'fist'  – all fingers curled → also turns the world (a "grab")
 *   'other' – anything ambiguous (caller keeps the previous pose)
 */
export function classifyPose(lm, aspect = 1) {
  const index = isExtended(lm, FINGERS.index, aspect);
  const middle = isExtended(lm, FINGERS.middle, aspect);
  const ring = isExtended(lm, FINGERS.ring, aspect);
  const pinky = isExtended(lm, FINGERS.pinky, aspect);
  const others = [middle, ring, pinky].filter(Boolean).length;

  if (index && others === 0) return 'point';
  if (index && others >= 2) return 'open';
  if (!index && others === 0) return 'fist';
  return 'other';
}

/** Gap between thumb tip and index tip, relative to palm size (≈0.15 touching, ≈0.8+ apart). */
export function pinchRatio(lm, aspect = 1) {
  return dist(lm[4], lm[8], aspect) / palmSize(lm, aspect);
}

/**
 * How far the index fingertip is from the palm, relative to palm size.
 * Low in a fist (fingertip tucked in), higher in a pinch (fingertip out in the air).
 */
export function indexReach(lm, aspect = 1) {
  return dist(palmCenter(lm), lm[8], aspect) / palmSize(lm, aspect);
}

/** How far the thumb tip sticks out from the index knuckle, relative to palm size (tucked ≈ 0.5, "L" ≈ 1.1+). */
export function thumbSpread(lm, aspect = 1) {
  return dist(lm[4], lm[5], aspect) / palmSize(lm, aspect);
}

/** Centre of the palm: average of wrist and knuckles. */
export function palmCenter(lm) {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  for (const i of ids) {
    x += lm[i].x;
    y += lm[i].y;
  }
  return { x: x / ids.length, y: y / ids.length };
}

/**
 * Apparent size of the palm in the image. It grows as the hand moves toward
 * the camera (the screen), which we read as reaching into the world.
 */
export function palmSize(lm, aspect = 1) {
  return (dist(lm[0], lm[5], aspect) + dist(lm[0], lm[17], aspect) + dist(lm[5], lm[17], aspect)) / 3;
}

/**
 * One-Euro filter: smooths jitter when the hand is still while staying
 * responsive when it moves fast. (Casiez, Roussel & Vogel, CHI 2012)
 */
export class OneEuroFilter {
  constructor({ minCutoff = 1.0, beta = 0.0, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.reset();
  }

  reset() {
    this.x = null;
    this.dx = 0;
    this.t = null;
  }

  static alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value, tSeconds) {
    if (this.x == null) {
      this.x = value;
      this.t = tSeconds;
      return value;
    }
    const dt = Math.max(1e-3, tSeconds - this.t);
    this.t = tSeconds;
    const dx = (value - this.x) / dt;
    this.dx += OneEuroFilter.alpha(this.dCutoff, dt) * (dx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuroFilter.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}
