import { PinchActions } from './PinchActions.js';

// Fist owns dragging; pinch is click-only in this scheme.
// Because a pinch can never drag here, the click can be forgiving (first-time visitors pinch
// slowly and move a little while closing their fingers): see fistPinchClickMaxMs /
// fistPinchMoveTolerance in config. Scheme 2 (PinchActions with dragging) keeps the strict values.
export class FistPinch {
  constructor(cfg){
    this.cfg=cfg;
    this.pinch=new PinchActions({...cfg,
      pinchClickMaxMs:cfg.fistPinchClickMaxMs??cfg.pinchClickMaxMs,
      pinchDragDistance:cfg.fistPinchMoveTolerance??cfg.pinchDragDistance},{allowDrag:false});
    this.reset();
  }
  reset(){this.phase='rest';this.fistSince=null;this.pinch.reset();}
  update({fist,...pinch},now){
    // A pinch already under way stays a pinch: the other fingers curl while pinching, and a
    // momentary "fist" reading must not throw the click away.
    if(fist&&this.pinch.phase!=='pinch'){
      this.fistSince??=now;this.pinch.reset();
      this.phase=now-this.fistSince>=this.cfg.grabHoldMs?'grab':'fist';
      return {mode:this.phase==='grab'?'grab':'point',confirm:false,holding:false};
    }
    if(this.fistSince!==null){this.fistSince=null;this.pinch.reset();}
    const action=this.pinch.update(pinch,now);this.phase=this.pinch.phase;
    return action;
  }
}
