import { PinchActions } from './PinchActions.js';

// Fist owns dragging; pinch is click-only in this scheme.
export class FistPinch {
  constructor(cfg){this.cfg=cfg;this.pinch=new PinchActions(cfg,{allowDrag:false});this.reset();}
  reset(){this.phase='rest';this.fistSince=null;this.pinch.reset();}
  update({fist,...pinch},now){
    if(fist){
      this.fistSince??=now;this.pinch.reset();
      this.phase=now-this.fistSince>=this.cfg.grabHoldMs?'grab':'fist';
      return {mode:this.phase==='grab'?'grab':'point',confirm:false,holding:false};
    }
    if(this.fistSince!==null){this.fistSince=null;this.pinch.reset();}
    const action=this.pinch.update(pinch,now);this.phase=this.pinch.phase;
    return action;
  }
}
