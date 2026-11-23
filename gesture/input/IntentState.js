/**
 * The shared language between input devices and the experience.
 *
 * Any input source (camera hands, mouse, keyboard, a future Kinect or
 * depth camera) only ever does four things here:
 *
 *   intent.setState(sourceId, { present, mode, x, y, pinch })
 *       present – is someone there?
 *       mode    – 'aim' (pointing at things) or 'navigate' (turning the world)
 *       x, y    – where they are pointing, as 0–1 fractions of the screen
 *       pinch   – 0–1, how close a click gesture is to completing (optional)
 *       hands   – tracked hand skeletons to draw (optional; see HandAvatar)
 *   intent.pan(dx, dy)     – turn the world (fractions of the screen)
 *   intent.emit('confirm' | 'back')
 *
 * The experience reads one combined snapshot per frame with `frame()`.
 * When several sources are present, the one with the highest priority wins
 * (the camera outranks the mouse).
 */
export class IntentState {
  constructor() {
    this.sources = new Map();
    this._pan = { x: 0, y: 0 };
    this._events = new Set();
  }

  register(id, priority = 0) {
    this.sources.set(id, { id, priority, present: false, mode: 'aim', x: 0.5, y: 0.5, pinch: 0 });
  }

  setState(id, state) {
    const s = this.sources.get(id);
    if (!s) throw new Error(`Unknown input source "${id}". Call register() first.`);
    Object.assign(s, state);
  }

  pan(dx, dy) {
    this._pan.x += dx;
    this._pan.y += dy;
  }

  emit(name) {
    this._events.add(name);
  }

  /** The active source: highest-priority source that currently sees someone. */
  active() {
    let best = null;
    for (const s of this.sources.values()) {
      if (s.present && (!best || s.priority > best.priority)) best = s;
    }
    return best;
  }

  frame() {
    const a = this.active();
    const out = {
      present: !!a,
      source: a ? a.id : null,
      mode: a ? a.mode : 'none',
      pointer: { x: a ? a.x : 0.5, y: a ? a.y : 0.5 },
      pinch: a ? a.pinch || 0 : 0,
      hands: a ? a.hands || null : null,
      pan: { ...this._pan },
      confirm: this._events.has('confirm'),
      back: this._events.has('back'),
    };
    this._pan.x = this._pan.y = 0;
    this._events.clear();
    return out;
  }
}
