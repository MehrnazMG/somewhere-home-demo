import { cameraVideoConstraints } from '../camera-devices.js';
import { PinchActions } from './PinchActions.js';
import { AutoComfort } from './AutoComfort.js';
import { TrackingGate } from './TrackingGate.js';
import { FistPinch } from './FistPinch.js';
import { fingerSwingAngle } from './WiperClick.js';
import { indexAngle } from './FingerClick.js';
import { CONFIG } from '../config.js';
import { classifyPose, palmCenter, palmSize, pinchRatio, indexReach, OneEuroFilter } from './gestures.js';

/**
 * Camera input via MediaPipe Hand Landmarker. Translates what the camera
 * sees into the same intents the mouse produces:
 *
 * One hand only:
 *   point your finger             → cursor (like moving a mouse)
 *   touch thumb and index finger  → click (like Apple Vision Pro)
 *   make a fist and move          → turn the world
 */
export class HandTrackingSource {
  constructor(intent, { id = 'hand', priority = 10, debugCanvas = null } = {}) {
    this.intent = intent;
    this.id = id;
    intent.register(id, priority);

    this.cfg = CONFIG.hands;
    this.clickGesture = new FistPinch(this.cfg);
    this.pinchActions = new PinchActions(this.cfg);
    this.gestureMode='fist';
    try{if(localStorage.getItem('home-gesture-mode-v1')==='pinch')this.gestureMode='pinch';}catch{}
    this.trackingGate = new TrackingGate(this.cfg);
    this.needsReanchor = true;
    this.palmSamples = [];
    this.calibrationTarget = {x:.5,y:.5};
    this.calibration = null;
    this.autoComfort = new AutoComfort(this.cfg);
    this.autoComfortEnabled = false; // parked for this handed-position trial
    this.handedness=null;this.handCandidate=null;this.handCandidateFrames=0;
    this.selectedCameraId='';
    this.startGeneration=0;
    this.status = 'off'; // off | loading | running | error
    this.error = null;
    this.debugCanvas = debugCanvas;
    this.debug = false;

    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;

    const f = this.cfg.filter;
    this.fx = new OneEuroFilter(f);
    this.fy = new OneEuroFilter(f);
    this.fz = new OneEuroFilter({ minCutoff: 0.8, beta: 0.6, dCutoff: 1 });

    this.gesture = null; // point | pinch | grab
    this.pinching = false;
    this.candidate = null;
    this.candidateFrames = 0;
    this.lastSeen = 0;
    this.prev = null; // previous cursor position while grabbing
    this.lastVideoTime = -1;
    this.lastResult = null;
    this._raf = null;
  }

  async start() {
    if (this.status === 'running' || this.status === 'loading') return;
    if(this.autoComfortEnabled){this.autoComfort.reset();this.calibration=null;this.resetAfterCalibration();}
    const generation=++this.startGeneration;
    this.status = 'loading';
    this._report('Starting camera…');
    let step = 'camera';
    try {
      // 1. Ask for the camera first, so the permission prompt appears straight away.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('insecure');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraVideoConstraints(this.selectedCameraId),
        audio: false,
      });
      if(generation!==this.startGeneration){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;
      stream.getVideoTracks()[0]?.addEventListener('ended',()=>{
        if(this.stream!==stream)return;
        this.stop();this._report('Camera disconnected. Choose another camera and enable hand control.',true);
      },{once:true});
      this.video.srcObject = stream;
      await this.video.play();
      if(generation!==this.startGeneration)return;

      // 2. Load MediaPipe and the hand model.
      step = 'library';
      this._report('Loading hand tracking…');
      const vision = await import(/* @vite-ignore */ this.cfg.visionModule);
      const fileset = await vision.FilesetResolver.forVisionTasks(this.cfg.wasmRoot);
      if(generation!==this.startGeneration)return;
      step = 'model';
      const landmarker = await this._createLandmarker(vision, fileset, 'GPU').catch((err) => {
        console.warn('[hands] GPU tracking failed, trying CPU', err);
        return this._createLandmarker(vision, fileset, 'CPU');
      });

      if(generation!==this.startGeneration){landmarker.close();return;}
      this.landmarker=landmarker;
      this.status = 'running';
      this._report('Camera on. Hands are being tracked.');
      this._loop();
    } catch (err) {
      if(generation!==this.startGeneration)return;
      this.status = 'error';
      this.error = err;
      this.stream?.getTracks().forEach((t) => t.stop());
      this._report(explain(err, step), true);
      console.warn('[hands] camera tracking unavailable, mouse and keyboard still work:', err);
    }
  }

  async selectCamera(deviceId) {
    if(this.status==='loading')return;
    this.selectedCameraId=deviceId;
    if(this.status==='running'){
      this.stop();
      await this.start();
    }
  }

  _createLandmarker(vision, fileset, delegate) {
    return vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: this.cfg.modelAssetPath, delegate },
      runningMode: 'VIDEO',
      numHands: 1, // one participant, one hand
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
  }

  _report(message, isError = false) {
    this.message = message;
    this.onStatus?.(message, isError, this.status);
  }

  stop() {
    this.startGeneration++;
    cancelAnimationFrame(this._raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.status = 'off';
    this._report('Camera off. Press C to turn it on.');
    this._lose();
    this.landmarker?.close();this.landmarker=null;
  }

  toggle() {
    this.status === 'running' ? this.stop() : this.start();
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const v = this.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    const now = performance.now();
    let result;
    try {
      result = this.landmarker.detectForVideo(v, now);
    } catch (err) {
      console.warn('[hands] tracking error', err);
      return;
    }
    this.lastResult = result;
    this._process(result, now);
    if (this.debug) this._drawDebug(result);
  }

  _process(result, now) {
    const aspect = this.video.videoWidth / this.video.videoHeight || 16 / 9;
    const all = result.landmarks || [];

    if (!all.length) {
      this.autoComfort.interrupt();
      if (now - this.lastSeen > this.cfg.lostAfterMs) this._lose();
      return;
    }
    if (!this.trackingGate.accept(all[0], now)) {
      // Cancel an unfinished click/drag immediately; never turn a false corner into movement.
      this.autoComfort.interrupt();
      this.clickGesture.reset();this.pinchActions.reset();this._clutch();this.needsReanchor=true;
      this.intent.setState(this.id,{present:false,pinch:0,hands:null});
      return;
    }
    if (now-this.lastSeen>this.cfg.reacquireAfterMs) this.needsReanchor=true;
    if (this.needsReanchor) {
      this.fx.reset();this.fy.reset();this._clutch();this.clickGesture.reset();this.pinchActions.reset();
      this.needsReanchor=false;
    }
    this.lastSeen = now;
    const t = now / 1000;
    const cfg = this.cfg;

    // One hand only: the tracker is set to find a single hand.
    const lm = all[0];
    // VIDEO input is unmirrored; labels refer to the participant's actual hand.
    const category=(result.handednesses||result.handedness)?.[0]?.[0];
    this.updateHandedness(category);
    const world = (result.worldLandmarks || [])[0];
    const pose = classifyPose(lm, aspect);
    const ratio = pinchRatio(lm, aspect); // thumb–index gap ÷ palm size
    const reach = indexReach(lm, aspect);
    const center = palmCenter(lm);
    this.palmSamples.push({x:1-center.x,y:center.y,time:now});
    this.palmSamples=this.palmSamples.filter(p=>now-p.time<700);
    // One reference point for every pose. Curling fingers must not move the pointer.
    const { x, y } = this._toScreen(center, t);

    // Reuse the original tracking, palm mapping and filters; replace pinch interpretation.
    // Prefer tracker-provided world geometry for the finger angle; palm pointer stays unchanged.
    const fingerPoints=world?.length===21?world:lm;
    const fingerAspect=fingerPoints===world?1:aspect;
    const angle = indexAngle(fingerPoints, fingerAspect);
    this.swingAngle=fingerSwingAngle(fingerPoints,fingerAspect);
    const straight = angle >= cfg.indexStraightAngle && reach >= cfg.fistReach;
    const bent = angle <= cfg.indexBentAngle;
    if(this.autoComfortEnabled&&!this.autoComfort.anchor){
      const relaxed=angle>=cfg.indexStraightAngle&&ratio>=cfg.pinchOff&&(pose==='point'||pose==='open');
      const anchor=this.autoComfort.update({x:1-center.x,y:center.y},now,relaxed);
      if(anchor){this.calibration=anchor;this.resetAfterCalibration();}
      else {this.clickGesture.reset();this.pinchActions.reset();this._clutch();this.intent.setState(this.id,{present:false,pinch:0,hands:null});}
      return;
    }
    const action = this.gestureMode==='pinch'
      ?this.pinchActions.update({ratio,x,y,canStart:reach>=cfg.fistReach},now)
      :this.clickGesture.update({fist:pose==='fist'&&bent,ratio,x,y,canStart:reach>=cfg.fistReach},now);
    const gesture = action.mode;
    if (this.gesture !== gesture) this._clutch();
    this.gesture = gesture;
    this.angle = angle;
    this.holding = action.holding;
    if (action.confirm) this.intent.emit('confirm');
    const shown = (anchor) => [{ world, anchor, primary: true }];

    if (gesture === 'grab') {
      this.intent.setState(this.id, { present: true, mode: 'navigate', x, y, pinch: 0, hands: shown('palm') });
      if (this.prev) {
        // Ignore tiny tremors so a still fist holds the world still.
        const dx = x - this.prev.x;
        const dy = y - this.prev.y;
        if (Math.hypot(dx, dy) > cfg.grabDeadzone) {
          this.intent.pan(dx * cfg.grabGain, dy * cfg.grabGain);
          this.prev = { x, y };
        }
      } else this.prev = { x, y };
      return;
    }

    const pointer=action.pointer||{x,y};
    this.intent.setState(this.id, { present: true, mode: 'aim', x:pointer.x, y:pointer.y, pinch:action.holding?1:0, hands: shown('palm') });
  }

  setGestureMode(mode) {
    if(!['fist','pinch'].includes(mode))return;
    this.gestureMode=mode;this.clickGesture.reset();this.pinchActions.reset();this._clutch();
    this.gesture=null;this.holding=false;
    this.intent.frame(); // discard any pending action from the previous scheme
    this.intent.setState(this.id,{present:false,pinch:0,hands:null});
    try{localStorage.setItem('home-gesture-mode-v1',mode);}catch{}
  }

  updateHandedness(category) {
    const label=category?.categoryName;
    if(!['Left','Right'].includes(label)||(category.score??0)<this.cfg.handednessConfidence){
      this.handCandidate=null;this.handCandidateFrames=0;return;
    }
    if(label===this.handCandidate)this.handCandidateFrames++;
    else {this.handCandidate=label;this.handCandidateFrames=1;}
    if(this.handCandidateFrames>=this.cfg.handednessFrames&&this.handedness!==label){
      this.handedness=label;
      // A different mapping must establish a fresh drag anchor, never rotate the globe.
      this.resetAfterCalibration();
    }
  }

  getActiveRegion() {
    const base=this.cfg.activeRegion;
    const position=this.cfg.handedRegions?.[this.handedness];
    return {...base,...(position||{y:.30})};
  }

  /** Camera coordinates → 0–1 screen fractions, mirrored. */
  _map(p) {
    const r = this.getActiveRegion();
    if(this.calibration) return {
      x:Math.min(1,Math.max(0,this.calibrationTarget.x+(1-p.x-this.calibration.x)/r.width)),
      y:Math.min(1,Math.max(0,this.calibrationTarget.y+(p.y-this.calibration.y)/r.height))
    };
    return {
      x: Math.min(1, Math.max(0, (1 - p.x - r.x) / r.width)),
      y: Math.min(1, Math.max(0, (p.y - r.y) / r.height)),
    };
  }

  setAutoComfort(enabled) {
    this.autoComfortEnabled=enabled;this.autoComfort.reset();this.calibration=null;
    try{localStorage.setItem('home-gesture-auto-comfort-v1',String(enabled));}catch{}
    this.resetAfterCalibration();
  }

  resetAfterCalibration() {
    this.fx.reset();this.fy.reset();this._clutch();this.clickGesture.reset();this.pinchActions.reset();this.palmSamples=[];
    this.intent.setState(this.id,{present:false,pinch:0,hands:null});
  }

  /** Same, smoothed (for the cursor). */
  _toScreen(p, t) {
    const { x, y } = this._map(p);
    return { x: this.fx.filter(x, t), y: this.fy.filter(y, t) };
  }

  /** Reset relative tracking when the gesture changes, so switching never jolts the world. */
  _clutch() {
    this.prev = null;
    this.fz.reset();
  }

  _lose() {
    this.clickGesture.reset();this.pinchActions.reset();
    this.trackingGate.reset();this.needsReanchor=true;this.palmSamples=[];
    this.intent.setState(this.id, { present: false, pinch: 0, hands: null });
    this.fx.reset();
    this.fy.reset();
    this._clutch();
    this.gesture = null;
    this.candidate = null;
    this.pinching = false;
    this.holding = false;
  }

  // Small diagnostic view (toggle with D). Hidden from participants by default.
  _drawDebug(result) {
    const c = this.debugCanvas;
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = (c.width = 320);
    const h = (c.height = Math.round(320 / (this.video.videoWidth / this.video.videoHeight || 16 / 9)));
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(this.video, 0, 0, w, h);
    ctx.globalAlpha = 1;
    const r = this.getActiveRegion();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    const left=this.calibration?this.calibration.x-this.calibrationTarget.x*r.width:r.x;
    const top=this.calibration?this.calibration.y-this.calibrationTarget.y*r.height:r.y;
    ctx.strokeRect((1-left-r.width)*w,top*h,r.width*w,r.height*h);
    ctx.fillStyle = '#ffc98a';
    for (const lm of result.landmarks || []) {
      for (const p of lm) ctx.fillRect(p.x * w - 2, p.y * h - 2, 4, 4);
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(`gesture: ${this.autoComfortEnabled&&!this.autoComfort.anchor?'calibrating':this.gestureMode==='pinch'?this.pinchActions.phase:this.clickGesture.phase} ${this.handedness||'?'} (${Math.round(this.angle||0)}° / swing ${Math.round(this.swingAngle||0)}°) ${this.gesture ?? '–'}  hands: ${(result.landmarks || []).length}`, 8, h - 8);
  }
}

/** Turns a camera or MediaPipe failure into something the operator can act on. */
function explain(err, step) {
  const name = err?.name || '';
  if (err?.message === 'insecure') {
    return 'Camera blocked: open the page through http://localhost:8000, not by double-clicking index.html.';
  }
  if (step === 'camera') {
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Camera permission denied. Click the camera icon in Chrome’s address bar → Allow, then reload. On a Mac also check System Settings → Privacy & Security → Camera → Google Chrome.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Selected camera is unavailable. Choose another camera and enable hand control.';
    if (name === 'NotReadableError' || name === 'AbortError') {
      return 'The camera is busy. Close other apps using it (Zoom, Teams, FaceTime, Photo Booth), then press C.';
    }
    return `Camera could not start (${name || err}). Press C to try again.`;
  }
  return `Hand tracking could not load (${name || err?.message || err}). Check the internet connection, then press C.`;
}
