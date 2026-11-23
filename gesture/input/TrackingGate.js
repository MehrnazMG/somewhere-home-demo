// Check raw camera landmarks before clamping them to screen edges.
// A partly visible hand can yield a plausible-looking but unrelated corner position.
export class TrackingGate {
  constructor(cfg) { this.cfg=cfg;this.reset(); }
  reset() { this.last=null;this.candidate=null;this.frames=0;this.lastTime=0; }
  accept(lm, now) {
    const ids=[0,5,9,13,17,8];
    if (!lm || ids.some(i=>!lm[i]||!Number.isFinite(lm[i].x)||!Number.isFinite(lm[i].y))) return false;
    // Permit fingertip travel past the active region, but not an off-camera palm.
    if ([0,5,9,13,17].some(i=>lm[i].x<0||lm[i].x>1||lm[i].y<0||lm[i].y>1)) return false;
    const p={x:0,y:0,tipX:lm[8].x,tipY:lm[8].y};
    for(const i of [0,5,9,13,17]) {p.x+=lm[i].x/5;p.y+=lm[i].y/5;}
    if (now-this.lastTime>this.cfg.reacquireAfterMs) this.last=null;
    const jump=this.last&&(Math.hypot(p.x-this.last.x,p.y-this.last.y)>this.cfg.maxPalmJump||Math.hypot(p.tipX-this.last.tipX,p.tipY-this.last.tipY)>.45);
    if (!this.last||jump) {
      if (this.candidate&&Math.hypot(p.x-this.candidate.x,p.y-this.candidate.y)<this.cfg.reacquireRadius&&Math.hypot(p.tipX-this.candidate.tipX,p.tipY-this.candidate.tipY)<.15) this.frames++;
      else this.frames=1;
      this.candidate=p;
      if(this.frames<this.cfg.reacquireFrames)return false;
    }
    this.last=p;this.lastTime=now;this.candidate=null;this.frames=0;
    return true;
  }
}
