import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'palm-anchor-'));
try {
 await mkdir(join(temp,'input'));
 await writeFile(join(temp,'package.json'),'{"type":"module"}');
 for(const file of ['config.js','camera-devices.js','input/HandTrackingSource.js','input/IntentState.js','input/gestures.js','input/FingerClick.js','input/WiperClick.js','input/PinchActions.js','input/FistPinch.js','input/TrackingGate.js','input/AutoComfort.js']){
  await writeFile(join(temp,file),await readFile(new URL('../gesture/'+file,import.meta.url)));
 }
 globalThis.document={createElement:()=>({videoWidth:960,videoHeight:540})};
 const {HandTrackingSource}=await import(pathToFileURL(join(temp,'input/HandTrackingSource.js')));
 const {IntentState}=await import(pathToFileURL(join(temp,'input/IntentState.js')));
 const intent=new IntentState(),source=new HandTrackingSource(intent);source.setAutoComfort(false);
 function hand(fist,dx=0){
  const lm=Array.from({length:21},()=>({x:.5+dx,y:.65,z:0}));
  lm[0]={x:.5+dx,y:.78,z:0};
  for(const [i,x]of [[5,.46],[9,.5],[13,.54],[17,.58]]){
   lm[i]={x:x+dx,y:.6,z:0};lm[i+1]={x:x+dx,y:.5,z:0};
   lm[i+2]={x:x+dx,y:.6,z:0};lm[i+3]={x:x+dx,y:.65,z:0};
  }
  if(!fist){lm[7]={x:.46+dx,y:.38,z:0};lm[8]={x:.46+dx,y:.3,z:0};}
  return lm;
 }
 let lastTime=1000;
 function tick(fist,time,dx=0){for(let t=lastTime+33;t<time;t+=33){source._process({landmarks:[hand(fist,dx)]},t);intent.frame();}lastTime=time;source._process({landmarks:[hand(fist,dx)]},time);return intent.frame();}
 tick(false,1000);tick(false,1033);tick(false,1066);tick(false,1266);
 const before=tick(false,1300);assert.equal(before.mode,'aim');
 tick(true,1333);tick(true,1500);const grabbed=tick(true,1800);
 assert.equal(grabbed.mode,'navigate');
 assert.ok(Math.abs(grabbed.pointer.x-before.pointer.x)<1e-9&&Math.abs(grabbed.pointer.y-before.pointer.y)<1e-9,'same palm must not jump when fist closes');
 assert.deepEqual(grabbed.pan,{x:0,y:0},'first grab frame must only establish anchor');
 const moved=tick(true,1833,.025);assert.ok(Math.abs(moved.pan.x)>0,'moving a held fist must turn globe');
 const released=tick(false,1866,.025);assert.equal(released.mode,'aim');assert.deepEqual(released.pan,{x:0,y:0});
 // Move the released hand, then grab again. Earlier motion must not carry into new drag.
 tick(false,2000,.04);tick(false,2200,.04);tick(true,2233,.04);tick(true,2450,.04);
 const regrab=tick(true,2700,.04);assert.equal(regrab.mode,'navigate');assert.deepEqual(regrab.pan,{x:0,y:0});
 source.status='running';source.calibrationTarget={x:.34,y:.51};
 const rawPalm={x:.556,y:.636};
 const beforeMap=source._map(rawPalm),beforeStep=source._map({x:rawPalm.x+.01,y:rawPalm.y+.01});
 source.setAutoComfort(true);tick(false,4700,.04);
 assert.ok(source.autoComfort.anchor,'automatic observation locks a stable palm');
 const afterMap=source._map(rawPalm),afterStep=source._map({x:rawPalm.x+.01,y:rawPalm.y+.01});
 assert.ok(Math.abs(afterMap.x-.34)<1e-9&&Math.abs(afterMap.y-.51)<1e-9,'neutral palm maps to actual globe center');
 assert.ok(Math.abs((afterStep.x-afterMap.x)-(beforeStep.x-beforeMap.x))<1e-9,'horizontal gain must not change');
 assert.ok(Math.abs((afterStep.y-afterMap.y)-(beforeStep.y-beforeMap.y))<1e-9,'vertical gain must not change');
 assert.equal(source.prev,null,'calibration clears drag anchor');
 source.setAutoComfort(false);assert.deepEqual(source._map(rawPalm),beforeMap,'reset restores original mapping');

 for(let i=0;i<5;i++)source.updateHandedness({categoryName:'Right',score:.95});
 assert.equal(source.handedness,'Right');
 const rightRegion=source.getActiveRegion();
 assert.equal(rightRegion.width,.64);assert.equal(rightRegion.height,.62);assert.equal(rightRegion.y,.30);
 assert.deepEqual(source._map({x:1-(rightRegion.x+rightRegion.width/2),y:rightRegion.y+rightRegion.height/2}),{x:.5,y:.5});
 source.prev={x:1,y:1};
 for(let i=0;i<4;i++)source.updateHandedness({categoryName:'Left',score:.95});
 assert.equal(source.handedness,'Right','transient label must not move region');
 source.updateHandedness({categoryName:'Left',score:.95});
 assert.equal(source.handedness,'Left');assert.equal(source.prev,null,'switching hand resets drag anchor');
 assert.ok(source.getActiveRegion().x<rightRegion.x);
 source.updateHandedness({categoryName:'Right',score:.6});assert.equal(source.handedness,'Left');
 source.status='off';await source.selectCamera('external');assert.equal(source.selectedCameraId,'external');
 source.status='loading';await source.selectCamera('internal');assert.equal(source.selectedCameraId,'external','do not switch during loading');
 const calls=[];source.status='running';source.stop=()=>{calls.push('stop');source.status='off';};source.start=async()=>{calls.push('start');source.status='running';};
 await source.selectCamera('internal');assert.deepEqual(calls,['stop','start'],'stop old camera before restarting');assert.equal(source.selectedCameraId,'internal');
 console.log('Passed: camera selection while off, loading guard and ordered camera restart.');
 console.log('Passed: left/right region centers, fixed region dimensions, lower placement, label hysteresis and anchor reset.');
 console.log('Passed: neutral-position calibration, unchanged X/Y gain, cleared drag, reset and missing-camera guard.');
 console.log('Passed: actual tracker keeps palm position across fist change, first grab has zero movement, held movement rotates, release and regrab reset drag.');
}finally{delete globalThis.document;await rm(temp,{recursive:true,force:true});}
