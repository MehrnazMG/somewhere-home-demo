// A session acquires one neutral point, then never follows later movement.
export class AutoComfort {
  constructor(cfg) { this.cfg=cfg;this.reset(); }
  reset() { this.anchor=null;this.samples=[]; }
  interrupt() { if(!this.anchor)this.samples=[]; }
  update(p, now, relaxed) {
    if(this.anchor)return this.anchor;
    if(!relaxed){this.interrupt();return null;}
    const samples=this.samples;
    if(samples.length&&(now-samples.at(-1).time>this.cfg.autoComfortGapMs||samples.some(s=>Math.hypot(s.x-p.x,s.y-p.y)>this.cfg.autoComfortRadius)))samples.length=0;
    samples.push({...p,time:now});
    if(now-samples[0].time<this.cfg.autoComfortMs||samples.length<8)return null;
    this.anchor={x:samples.reduce((s,p)=>s+p.x,0)/samples.length,y:samples.reduce((s,p)=>s+p.y,0)/samples.length};
    this.samples=[];
    return this.anchor;
  }
}
