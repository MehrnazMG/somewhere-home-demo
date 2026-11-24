import { CONFIG } from '../config.js';
import { damp } from '../globe/geo.js';

/**
 * The illustrated glove cursor, one drawing per state:
 *
 *   normal – open palm (the same palm visitors see on the welcome screen)
 *   hover  – open palm, lifted, over something you can choose
 *   pinch  – thumb and index closing      click – open palm pressing in, the moment of choosing
 *   grab   – turning the world
 * (The pointing-finger drawings were removed by design request, Nov 2026.)
 *
 * `hotspot` is the point of each drawing that sits exactly on the pointer
 * (as a fraction of the image), so the fingertip, or the gap between thumb
 * and index, is always where the action happens.
 *
 * Same update() contract as the other cursors (see CONFIG.ui.cursor).
 */
// All active illustrations align around the palm, not different fingertips/knuckles.
const STATES = {
  normal: { src: './assets/cursor/palm.png', w: 203, hotspot: [0.50, 0.57] },
  hover: { src: './assets/cursor/palm.png', w: 203, hotspot: [0.50, 0.57] },
  click: { src: './assets/cursor/palm.png', w: 203, hotspot: [0.50, 0.57] },
  pinch: { src: './assets/cursor/pinch.png', w: 238, hotspot: [0.58, 0.60] },
  grab: { src: './assets/cursor/grab.png', w: 206, hotspot: [0.58, 0.60] },
};
const IMAGE_H = 220;

// Click ripple, drawn around the hotspot (in px at 1080p; scaled with the glove).
// (The decorative spark lines beside the glove were removed by design request, Nov 2026.)
const EFFECTS = `
  <svg class="glove__fx" viewBox="-80 -80 160 160" aria-hidden="true">
    <g class="fx fx--ripple">
      <circle r="16"/><circle r="28"/>
    </g>
  </svg>`;

export class GloveCursor {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'glove';
    this.el.innerHTML =
      Object.entries(STATES)
        .map(([name, s]) => `<img class="glove__img" data-state="${name}" src="${s.src}" alt="" draggable="false">`)
        .join('') + EFFECTS;
    parent.appendChild(this.el);
    this.imgs = Object.fromEntries([...this.el.querySelectorAll('.glove__img')].map((i) => [i.dataset.state, i]));
    this.fx = this.el.querySelector('.glove__fx');
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.state = null;
    this.clickUntil = 0;
    this.changedAt = 0;
    this._layout();
    window.addEventListener('resize', () => this._layout());
  }

  _layout() {
    const scale = Math.min(1.6, Math.max(0.7, window.innerHeight / 1080));
    this.h = CONFIG.ui.gloveSize * scale;
    this.fxScale = scale;
    for (const [name, img] of Object.entries(this.imgs)) {
      const s = STATES[name];
      const w = (s.w / IMAGE_H) * this.h;
      img.style.width = `${w}px`;
      img.style.height = `${this.h}px`;
      img.style.left = `${-s.hotspot[0] * w}px`;
      img.style.top = `${-s.hotspot[1] * this.h}px`;
    }
    this.fx.style.width = this.fx.style.height = `${160 * scale}px`;
  }

  /** Called when something is chosen: the click glove and a ripple. */
  click() {
    this.clickUntil = performance.now() + 380;
    this.fx.classList.remove('is-click');
    void this.fx.getBoundingClientRect();
    this.fx.classList.add('is-click');
  }

  _pick({ mode, locked, pinch, demo }) {
    if (performance.now() < this.clickUntil) return 'click';
    if (mode === 'navigate') return 'grab';
    // Teaching (onboarding): resting on a home shows the pinch glove itself, looping a pinch.
    if (demo === 'pinch') return 'pinch';
    // Hysteresis: the pinch drawing appears when the fingers are well on their way
    // and stays until they have clearly opened again, so it can't flutter.
    const pinching = this.state === 'pinch' ? pinch > 0.35 : pinch > 0.65;
    if (pinching) return 'pinch';
    if (locked) return 'hover';
    return 'normal';
  }

  update({ visible, x, y, mode, locked, pinch = 0, immediate, demo = null }, dt) {
    if (immediate) {
      this.x = x;
      this.y = y;
    } else {
      this.x = damp(this.x, x, 22, dt);
      this.y = damp(this.y, y, 22, dt);
    }
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    this.el.classList.toggle('is-visible', !!visible);

    let state = this._pick({ mode, locked, pinch, demo });
    // The demo animation plays until the visitor really pinches; then the glove holds still and glows.
    this.el.classList.toggle('is-demo-pinch', demo === 'pinch' && state === 'pinch' && pinch <= 0.5);
    this.el.classList.toggle('is-pinching', state === 'pinch' && pinch > 0.5);
    // Each drawing stays at least a moment (click and grab always show at once).
    const now = performance.now();
    const instant = state === 'click' || state === 'grab'; // these must answer the moment you act
    if (state !== this.state && !instant && this.state && now - this.changedAt < 120) state = this.state;
    if (state !== this.state) {
      this.changedAt = now;
      if (this.state) this.imgs[this.state].classList.remove('is-active');
      this.imgs[state].classList.add('is-active');
      this.el.dataset.state = state;
      this.state = state;
    }
  }
}
