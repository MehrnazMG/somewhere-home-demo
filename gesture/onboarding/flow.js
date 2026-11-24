/**
 * Hand onboarding state machine (no DOM). Teaches one gesture at a time and
 * only advances after the visitor has actually performed it.
 *
 *   intro (title, half globe) ─timer─▶ welcome ─wave, Hello─▶ grab ─turn the earth─▶ touch ─card shows─▶ visit (pinch house or card)
 *      ▲                                                        │ room opens
 *      │ operator reset (T)                                      ▼
 *    free ◀──────────── done ◀──── back to globe ──────────── return
 *
 * Feed it one snapshot per display frame with update(now, input).
 * input = { present, x, y, mode: 'aim'|'navigate', pan:{x,y},
 *           cardVisible, roomOpen, canReturn }
 */
export const TEACHING_STEPS = ['grab', 'touch', 'visit'];

export const ONBOARDING_DEFAULTS = {
  introFor: 3200,        // title-only opening before the earth rises and the wave prompt appears
  waveAmplitude: 0.035,  // screen fraction a hand must travel before a change of direction counts
  waveReversals: 2,      // left → right → left
  waveWindow: 1600,      // ms of history used to recognise a wave
  holdFallback: 6000,    // a raised, steady hand also begins after this long (for visitors who can't wave)
  grabDistance: 0.22,    // total hand travel (screen fractions) while grabbing
  helloFor: 1600,        // how long Hello stays before the next step
  touchHold: 250,        // card must stay up this long to count as a touch
  celebrate: 1100,       // success moment before the next step
  lostAfter: 1200,       // hand out of view this long → show "raise your hand"
  hint1: 9000,           // ms of hand-present time before a more specific hint
  hint2: 18000,          // …and the most specific one
  doneFor: 3800,         // closing message duration
};

export class OnboardingFlow {
  constructor(options = {}) {
    this.o = { ...ONBOARDING_DEFAULTS, ...options };
    this.reset(0);
  }

  reset(now = 0) {
    this._go('intro', now);
    this.presentSince = null;
    this.absentSince = now;
    this.lastNow = now;
    this.events = [];
  }

  /** Finished (or skipped) tutorials no longer restrict anything. */
  get active() { return this.state !== 'free'; }

  /** What the globe may do right now: 'rotate' | 'hover' | 'enter'. */
  allows(what) {
    switch (this.state) {
      case 'intro': case 'welcome': return false;
      case 'grab': return what === 'rotate';
      default: return true;
    }
  }

  /** Operator: move on without the gesture (does not open rooms). */
  skip(now) {
    const order = ['intro', 'welcome', 'grab', 'touch', 'visit', 'return', 'done', 'free'];
    let next = order[Math.min(order.indexOf(this.state) + 1, order.length - 1)];
    if (next === 'return') next = 'done'; // can't fake a room visit
    this._go(next, now);
    this.events.push('step');
  }

  /** Leave the tutorial entirely (e.g. ?tutorial=off). */
  finish(now) { this._go('free', now); }

  _go(state, now) {
    this.state = state;
    this.enteredAt = now;
    this.activeTime = 0;
    this.progress = 0;
    this.samples = [];
    this.touchSince = null;
    this.celebrateUntil = 0;
    this.next = null;
  }

  _succeed(next, now, duration = this.o.celebrate) {
    if (this.celebrateUntil) return;
    this.progress = 1;
    this.celebrateUntil = now + duration;
    this.next = next;
    this.events.push('success');
  }

  _isWave() {
    const { waveAmplitude: amp, waveReversals } = this.o;
    if (this.samples.length < 3) return false;
    let extreme = this.samples[0].x, dir = 0, reversals = 0;
    for (const { x } of this.samples) {
      if (dir === 0) {
        if (Math.abs(x - extreme) > amp) { dir = Math.sign(x - extreme); extreme = x; }
      } else if (dir > 0) {
        if (x > extreme) extreme = x;
        else if (extreme - x > amp) { reversals++; dir = -1; extreme = x; }
      } else {
        if (x < extreme) extreme = x;
        else if (x - extreme > amp) { reversals++; dir = 1; extreme = x; }
      }
    }
    return reversals >= waveReversals;
  }

  update(now, input) {
    const dt = Math.max(0, Math.min(now - this.lastNow, 250));
    this.lastNow = now;
    const present = !!input.present;
    if (present) { this.presentSince ??= now; this.absentSince = null; }
    else { this.presentSince = null; this.absentSince ??= now; }

    // The room is the real goal: entering it from any teaching step counts.
    if (input.roomOpen && ['intro', 'welcome', 'grab', 'touch', 'visit'].includes(this.state)) {
      this._go('return', now); this.events.push('success');
    } else if (this.state === 'return' && !input.roomOpen) {
      this._go('done', now); this.events.push('success');
    } else if (this.celebrateUntil) {
      if (now >= this.celebrateUntil) { this._go(this.next, now); this.events.push('step'); }
    } else {
      if (present) this.activeTime += dt;
      switch (this.state) {
        case 'intro':
          if (now - this.enteredAt >= this.o.introFor) { this._go('welcome', now); this.events.push('step'); }
          break;
        case 'welcome': {
          if (present) {
            this.samples.push({ t: now, x: input.x });
            while (this.samples.length && now - this.samples[0].t > this.o.waveWindow) this.samples.shift();
            if (this._isWave() || now - this.presentSince >= this.o.holdFallback) this._succeed('grab', now, this.o.helloFor);
          } else this.samples = [];
          break;
        }
        case 'grab': {
          if (present && input.mode === 'navigate') {
            const pan = input.pan || { x: 0, y: 0 };
            this.progress = Math.min(1, this.progress + Math.hypot(pan.x, pan.y) / this.o.grabDistance);
            if (this.progress >= 1) this._succeed('touch', now);
          }
          break;
        }
        case 'touch': {
          if (present && input.cardVisible) {
            this.touchSince ??= now;
            if (now - this.touchSince >= this.o.touchHold) this._succeed('visit', now);
          } else this.touchSince = null;
          break;
        }
        case 'done':
          if (now - this.enteredAt >= this.o.doneFor) { this._go('free', now); this.events.push('step'); }
          break;
      }
    }

    const events = this.events; this.events = [];
    const a = this.activeTime;
    return {
      state: this.state,
      progress: this.progress,
      celebrating: !!this.celebrateUntil,
      hint: a >= this.o.hint2 ? 2 : a >= this.o.hint1 ? 1 : 0,
      lost: TEACHING_STEPS.includes(this.state) && !present && this.absentSince != null && now - this.absentSince >= this.o.lostAfter,
      present,
      gripping: present && input.mode === 'navigate',
      pinching: present && (input.pinch || 0) > 0.5,
      needsCard: this.state === 'visit' && !input.cardVisible,
      canReturn: !!input.canReturn,
      step: TEACHING_STEPS.indexOf(this.state),
      events,
    };
  }
}
