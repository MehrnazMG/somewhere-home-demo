// One pinch can be either a short click OR a drag, never both.
export class PinchActions {
  constructor(cfg,{allowDrag=true}={}){this.cfg=cfg;this.allowDrag=allowDrag;this.reset();}
  reset(){this.phase='rest';this.waitingOpen=true;this.anchor=null;this.since=0;}
  update({ratio,x,y,canStart=true},now){
    const c=this.cfg;
    const result=(confirm=false,pointer=null)=>({mode:this.phase==='grab'?'grab':'point',confirm,holding:this.phase==='pinch',pointer});
    if(!Number.isFinite(ratio)){this.reset();return result();}
    if(this.waitingOpen){if(ratio>=c.pinchOff)this.waitingOpen=false;return result();}
    if(this.phase==='rest'){
      if(ratio<c.pinchOn&&canStart){this.phase='pinch';this.anchor={x,y};this.since=now;}
      return result(false,this.phase==='pinch'?this.anchor:null);
    }
    // Check travel even on the release frame so a quick drag never becomes a click.
    const moved=Math.hypot(x-this.anchor.x,y-this.anchor.y)>c.pinchDragDistance;
    if(moved||now-this.since>c.pinchClickMaxMs)this.phase=this.allowDrag?'grab':'cancel';
    if(ratio>=c.pinchOff){
      const confirm=this.phase==='pinch'&&now-this.since>=c.pinchClickMinMs;
      const pointer=confirm?this.anchor:null;
      this.phase='rest';this.anchor=null;
      return result(confirm,pointer);
    }
    return result(false,this.phase==='pinch'?this.anchor:null);
  }
}
