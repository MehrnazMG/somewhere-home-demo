// A straight finger swings from its base and returns. Fist grabbing is independent.
export class WiperClick {
  constructor(cfg){this.cfg=cfg;this.reset();}
  reset(){this.phase='rest';this.baseline=null;this.since=null;this.departed=null;this.coolUntil=0;this.palm=null;}
  update({straight,fist,swing,palm},now){
    const c=this.cfg;
    const out=(confirm=false)=>({mode:this.phase==='grab'?'grab':'point',confirm,holding:this.phase==='swing'});
    if(fist){
      if(this.phase!=='fist'&&this.phase!=='grab'){this.phase='fist';this.since=now;}
      if(now-this.since>=c.grabHoldMs)this.phase='grab';
      return out();
    }
    if(this.phase==='grab'||this.phase==='fist'){this.reset();return out();}
    if(!straight||!Number.isFinite(swing)){this.phase='rest';this.baseline=null;this.since=null;return out();}
    if(this.phase==='swing'){
      if(now-this.since>c.wiperReturnMs||Math.hypot(palm.x-this.palm.x,palm.y-this.palm.y)>c.wiperPalmTolerance){this.phase='rest';this.baseline=null;this.since=null;return out();}
      if(Math.abs(swing-this.baseline)<=c.wiperReturnAngle){this.phase='rest';this.baseline=null;this.since=null;this.coolUntil=now+c.clickCooldownMs;return out(true);}
      return out();
    }
    if(this.phase==='armed'){
      if(Math.hypot(palm.x-this.palm.x,palm.y-this.palm.y)>c.wiperPalmTolerance){this.phase='rest';this.baseline=null;this.since=null;return out();}
      const delta=swing-this.baseline;
      if(delta>c.wiperRestAngle&&this.departed===null)this.departed=now;
      if(this.departed!==null&&now-this.departed>c.wiperDownMs){this.phase='rest';this.baseline=null;this.since=null;return out();}
      if(delta>=c.wiperDownAngle){this.phase='swing';this.since=now;}
      else if(Math.abs(delta)<=c.wiperRestAngle)this.departed=null;
      return out();
    }
    if(now<this.coolUntil)return out();
    if(this.baseline===null||Math.abs(swing-this.baseline)>c.wiperRestAngle){this.baseline=swing;this.since=now;this.palm={...palm};}
    if(now-this.since>=c.clickArmMs){this.phase='armed';this.departed=null;}
    return out();
  }
}

// Palm-relative angle: rotating/translating the whole hand does not change it.
export function fingerSwingAngle(lm,aspect=1){
  const delta=(a,b)=>[(a.x-b.x)*aspect,a.y-b.y,((a.z||0)-(b.z||0))*aspect];
  const a=delta(lm[8],lm[5]),b=delta(lm[9],lm[0]);
  const denominator=Math.hypot(...a)*Math.hypot(...b);
  if(denominator<1e-8)return NaN;
  return Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0)/denominator)))*180/Math.PI;
}
