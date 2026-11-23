import * as THREE from 'three';
import { IntentState } from './input/IntentState.js';
import { HandTrackingSource } from './input/HandTrackingSource.js';
import { GloveCursor } from './ui/GloveCursor.js';
import { cameraChoices } from './camera-devices.js';
import { CONFIG } from './config.js';
import { orbitHandPan } from './orbit-navigation.js';
import { createOnboarding } from './onboarding/Onboarding.js';

// Adapt the original input language to the existing globe. No replacement renderer or visual UI.
export function createGestureBridge(view) {
  const intent = new IntentState();
  const debugCanvas = document.getElementById('gestureCamera');
  const hands = new HandTrackingSource(intent, { debugCanvas });
  const cursor = new GloveCursor(document.body);
  const button = document.getElementById('cameraToggle');
  const status = document.getElementById('gestureStatus');
  const cameraSelect=document.getElementById('cameraDevice');
  let cameraListGeneration=0;
  async function refreshCameras(){
    if(!navigator.mediaDevices?.enumerateDevices){cameraSelect.disabled=true;cameraSelect.title='Camera selection is unavailable in this browser.';return;}
    const generation=++cameraListGeneration;
    try{
      const devices=await navigator.mediaDevices.enumerateDevices();
      if(generation!==cameraListGeneration||disposed)return;
      const active=hands.stream?.getVideoTracks()[0]?.getSettings().deviceId;
      const {options,value}=cameraChoices(devices,active||hands.selectedCameraId||cameraSelect.value);
      cameraSelect.replaceChildren(...options.map(option=>new Option(option.label,option.value)));
      cameraSelect.value=value;hands.selectedCameraId=value;
      cameraSelect.title=devices.some(device=>device.kind==='videoinput'&&device.label)?'Choose the camera used for hand tracking.':'Enable hand control to allow access and reveal camera names.';
    }catch{cameraSelect.title='Could not list cameras. Enable hand control and try again.';}
  }
  cameraSelect.onchange=async()=>{await hands.selectCamera(cameraSelect.value);await refreshCameras();};
  const camerasChanged=()=>refreshCameras();
  navigator.mediaDevices?.addEventListener?.('devicechange',camerasChanged);
  const modeSelect=document.getElementById('gestureMode');
  const instructions=()=>hands.gestureMode==='pinch'?'Pinch and move to turn · pinch and release to select':'Hold a fist to turn · pinch and release to select';
  modeSelect.value=hands.gestureMode;status.textContent=instructions();
  modeSelect.onchange=()=>{hands.setGestureMode(modeSelect.value);focused=null;view.setHover(null);cursor.update({visible:false,x:cursor.x,y:cursor.y,mode:'aim',locked:false},0);status.textContent=instructions();};
  const projected = new THREE.Vector3();
  const centre = new THREE.Vector3();
  // Hand onboarding: shown at the start of every visitor session (?tutorial=off to skip while testing).
  const onboarding = createOnboarding({
    getScheme:()=>hands.gestureMode, homes:view.homes, projectHome:view.projectHome,
    globeCenter(){view.world.getWorldPosition(centre);centre.project(view.camera);return {x:(centre.x*.5+.5)*innerWidth,y:(-centre.y*.5+.5)*innerHeight};},
    cameraStatus:()=>hands.status, startCamera:()=>hands.start(),
    enabled:new URLSearchParams(location.search).get('tutorial')!=='off',
  });
  // Installations: start the camera without a click when permission was already granted.
  navigator.permissions?.query({name:'camera'}).then(p=>{if(p.state==='granted'&&hands.status==='off'&&!disposed)hands.start();}).catch(()=>{});
  const visitState=()=>({roomOpen:view.isHomeOpen(),cardVisible:view.hasPreview(),canReturn:view.canReturn()});
  const comfortStatus=document.getElementById('comfortStatus');
  const autoSwitch=document.getElementById('autoComfort');
  autoSwitch.checked=hands.autoComfortEnabled;
  autoSwitch.onchange=()=>{hands.setAutoComfort(autoSwitch.checked);focused=null;view.setHover(null);};
  let focused = null, wasPresent = false, disposed = false;
  hands.onStatus = (message, error, state) => {
    status.textContent = message;
    button.textContent = state === 'running' ? 'Disable hand control' : state === 'loading' ? 'Starting camera…' : 'Enable hand control';
    button.disabled = state === 'loading';cameraSelect.disabled=state==='loading';
    if(state==='running'||state==='error')refreshCameras();
  };
  button.onclick = () => hands.toggle();
  refreshCameras();
  function toggleDebug() {
    hands.debug = !hands.debug;debugCanvas.hidden = !hands.debug;
    document.getElementById('gestureDebug').textContent = hands.debug ? 'Hide camera view' : 'Camera view';
  }
  document.getElementById('gestureDebug').onclick = toggleDebug;
  function key(e) {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'c') hands.toggle();
    if (e.key.toLowerCase() === 'd') toggleDebug();
    if (e.key === 'Escape') view.closeHome();
    // Operator: T restarts the tutorial for the next visitor, N skips the current step.
    if (e.key.toLowerCase() === 't') { view.closeHome();view.setHover(null);focused=null;onboarding.reset(); }
    if (e.key.toLowerCase() === 'n') onboarding.skip();
  }
  window.addEventListener('keydown', key);
  // Mouse stand-in for the onboarding while no camera is running (previews, laptops without a webcam,
  // team testing): moving = hand in view, side-to-side wiggle = wave, drag = grab, click a card = pinch.
  const mouse={x:.5,y:.5,down:false,last:-1e9,panX:0,panY:0};
  function mouseMove(e){const x=e.clientX/innerWidth,y=e.clientY/innerHeight;if(mouse.down){mouse.panX+=x-mouse.x;mouse.panY+=y-mouse.y;}mouse.x=x;mouse.y=y;mouse.last=performance.now();}
  function mouseDown(e){mouseMove(e);mouse.down=true;}
  function mouseUp(){mouse.down=false;}
  window.addEventListener('pointermove',mouseMove,true);window.addEventListener('pointerdown',mouseDown,true);window.addEventListener('pointerup',mouseUp,true);window.addEventListener('pointercancel',mouseUp,true);
  // Screen point the cursor aims at for a house: its middle, slightly above the geographic anchor.
  function homePoint(home) {
    home.getWorldPosition(projected);projected.project(view.camera);
    return {x:(projected.x*.5+.5)*innerWidth,y:(-projected.y*.5+.5)*innerHeight-22};
  }
  function targetAt(x, y) {
    view.world.updateMatrixWorld(true);view.camera.updateMatrixWorld(true);
    let best = null, distance = Infinity;
    const radius = CONFIG.focus.pickRadiusPx * Math.max(.65, innerHeight / 1080);
    for (const home of view.homes) {
      if (!home.parent.visible || !home.visible || home.userData.visibility <= .65) continue;
      home.getWorldPosition(projected);projected.project(view.camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const sx = (projected.x*.5+.5)*innerWidth, sy = (-projected.y*.5+.5)*innerHeight;
      // Aim at the middle of the house, slightly above its geographic anchor.
      const d = Math.hypot(sx-x, sy-22-y);
      if (home === focused && d < radius*CONFIG.focus.releaseFactor) return home;
      if (d < radius && d < distance) { best=home;distance=d; }
    }
    return best;
  }
  return {
    update(dt) {
      if (disposed) return;
      view.world.updateMatrixWorld(true);view.camera.updateMatrixWorld(true);
      view.world.getWorldPosition(projected);projected.project(view.camera);
      hands.calibrationTarget={x:projected.x*.5+.5,y:-projected.y*.5+.5};
      comfortStatus.textContent=!hands.autoComfortEnabled?'Off · original position':hands.autoComfort.anchor?'Comfortable position set':hands.status!=='running'?'Enable hand control to begin':hands.autoComfort.samples.length?'Finding your comfortable position… hold naturally for a moment':'Raise a relaxed hand to begin';
      const f = intent.frame();
      if (!f.present) {
        cursor.update({visible:false,x:cursor.x,y:cursor.y,mode:'aim',locked:false},dt);
        if (wasPresent) { view.setHover(null);focused=null; }
        view.controls.enabled=!view.isHomeOpen();if(wasPresent){view.hoverPreview(false);view.hoverReturn(false);}wasPresent=false;
        const now=performance.now(), standIn=hands.status!=='running';
        const active=standIn&&(mouse.down||now-mouse.last<1500);
        onboarding.update(now,{present:active,x:mouse.x,y:mouse.y,mode:mouse.down?'navigate':'aim',pan:{x:mouse.panX,y:mouse.panY},mouseStandIn:standIn,...visitState()});
        mouse.panX=mouse.panY=0;return;
      }
      const entering=!wasPresent;
      wasPresent=true;view.controls.enabled=false;view.controls.autoRotate=false;
      const x=f.pointer.x*innerWidth,y=f.pointer.y*innerHeight;
      const overlay = document.elementFromPoint(x,y);
      const cardHit=!!overlay?.closest('[data-visit-card]');
      const backHit=!!overlay?.closest('#backToGlobe')&&view.canReturn();
      view.hoverPreview(cardHit);view.hoverReturn(backHit);
      const blocked = overlay?.closest('#panel,footer,.gesture-bar,.comfort-bar,.gesture-mode-bar,[data-visit-card]');
      if (f.mode === 'navigate' && !view.isHomeOpen() && onboarding.allows('rotate')) {
        // Feed the same bounded, Y-up orbit used by mouse dragging in globe study.
        orbitHandPan(view.controls, f.pan.x, f.pan.y, innerWidth, innerHeight);
        focused=null;
      } else focused=blocked||view.isHomeOpen()||!onboarding.allows('hover')?null:targetAt(x,y);
      view.setHover(focused);
      if (f.confirm) {
        if (view.isHomeOpen()) {
          if (backHit) { view.closeHome();cursor.click(); }
        } else if (cardHit&&onboarding.allows('enter')&&view.enterPreview()) {cursor.click(); }
        else if (focused&&onboarding.allows('enter')) { view.setHover(focused);if(view.enterPreview())cursor.click(); }
      }
      onboarding.update(performance.now(),{present:true,x:f.pointer.x,y:f.pointer.y,mode:f.mode,pan:f.pan,...visitState()});
      // Magnetic cursor: once a house is chosen the glove is pulled onto it and stays there
      // (focus is released only past CONFIG.focus.releaseFactor pick radii), so small hand tremor
      // or the finger movement of a pinch doesn't slip off the house.
      let cx=x, cy=y;
      if (focused) { const h=homePoint(focused), k=CONFIG.focus.magnet; cx=x+(h.x-x)*k; cy=y+(h.y-y)*k; }
      cursor.update({visible:onboarding.showsCursor,x:cx,y:cy,mode:f.mode,locked:!!focused||cardHit||backHit,pinch:f.pinch,immediate:entering},dt);
      status.textContent=hands.gestureMode==='pinch'
        ?f.mode==='navigate'?'Pinch held · move to turn':hands.pinchActions.phase==='pinch'?'Release to select · move to drag':instructions()
        :hands.clickGesture.phase==='pinch'?'Release to select':f.mode==='navigate'?'Holding the globe':focused?'Pinch and release to select':instructions();
    },
    dispose() { disposed=true;cameraListGeneration++;navigator.mediaDevices?.removeEventListener?.('devicechange',camerasChanged);hands.stop();cursor.el.remove();onboarding.dispose();window.removeEventListener('keydown',key);window.removeEventListener('pointermove',mouseMove,true);window.removeEventListener('pointerdown',mouseDown,true);window.removeEventListener('pointerup',mouseUp,true);window.removeEventListener('pointercancel',mouseUp,true); }
  };
}
