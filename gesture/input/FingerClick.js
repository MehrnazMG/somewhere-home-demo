// A click completes on reopening. Holding a curl becomes a grab instead.
export class FingerClick {
  constructor(cfg) { this.cfg = cfg; this.reset(); }
  reset() { this.phase = 'rest'; this.since = null; this.coolUntil = 0; this.restPose = null; }
  update({ straight, bent, fist }, now) {
    const c = this.cfg;
    let confirm = false;
    if (this.phase === 'rest') {
      const pose = straight ? 'point' : fist ? 'fist' : null;
      if (pose !== this.restPose) this.since = null;
      this.restPose = pose;
    }
    if (this.phase === 'grab') {
      if (!fist) { this.phase = 'rest'; this.since = null; }
      return { mode: fist ? 'grab' : 'point', confirm, holding: false };
    }
    if (this.phase === 'bend') {
      const elapsed = now - this.since;
      if (elapsed >= c.clickMaxMs) {
        this.phase = fist ? 'grab' : 'rest'; this.since = null;
      } else if (straight) {
        confirm = elapsed >= c.clickMinMs;
        this.phase = 'rest'; this.since = null; this.coolUntil = now + c.clickCooldownMs;
      }
    } else if (this.phase === 'armed') {
      if (bent) { this.phase = 'bend'; this.since = now; }
      // A real curl passes through the gap between straight and bent thresholds.
      // Stay armed through that transition; only a completed bend starts the click timer.
    } else if (straight && now >= this.coolUntil) {
      this.since ??= now;
      if (now - this.since >= c.clickArmMs) { this.phase = 'armed'; this.since = null; }
    } else if (fist) {
      this.since ??= now;
      if (now - this.since >= c.grabHoldMs) { this.phase = 'grab'; this.since = null; }
    } else this.since = null;
    return { mode: this.phase === 'grab' ? 'grab' : 'point', confirm, holding: this.phase === 'bend' };
  }
}

// Joint angle is independent of hand size. Aspect correction matches the borrowed helpers.
export function indexAngle(lm, aspect = 1) {
  const a = lm[5], b = lm[6], c = lm[8];
  const u = [(a.x-b.x)*aspect, a.y-b.y, ((a.z||0)-(b.z||0))*aspect];
  const v = [(c.x-b.x)*aspect, c.y-b.y, ((c.z||0)-(b.z||0))*aspect];
  const dot = u.reduce((s,x,i)=>s+x*v[i],0);
  return Math.acos(Math.max(-1,Math.min(1,dot/Math.max(1e-8,Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;
}
