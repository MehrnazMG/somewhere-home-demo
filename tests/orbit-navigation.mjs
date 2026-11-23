import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'globe-orbit-test-'));
try {
 const vendor=new URL('../vendor/',import.meta.url);
 await writeFile(join(temp,'three.mjs'),await readFile(new URL('three.module.js',vendor)));
 await writeFile(join(temp,'orbit.mjs'),(await readFile(new URL('OrbitControls.js',vendor),'utf8')).replace("from 'three'","from './three.mjs'"));
 await writeFile(join(temp,'navigation.mjs'),await readFile(new URL('../gesture/orbit-navigation.js',import.meta.url)));
 const THREE=await import(pathToFileURL(join(temp,'three.mjs')));
 const {OrbitControls}=await import(pathToFileURL(join(temp,'orbit.mjs')));
 const {orbitHandPan}=await import(pathToFileURL(join(temp,'navigation.mjs')));
 const camera=new THREE.PerspectiveCamera(37,16/9,.1,100);camera.position.set(-.3,1.3,7.7);
 const controls=new OrbitControls(camera,null);controls.enableDamping=true;controls.dampingFactor=.055;
 const radius=camera.position.length();
 function check(){
  const north=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion.clone().invert());
  assert.ok(Math.abs(north.x)<1e-8,'north/south axis must not roll sideways');
  assert.ok(north.y>=-1e-9,'north must never project below south');
  assert.ok(controls.getPolarAngle()>0&&controls.getPolarAngle()<Math.PI,'must stop at poles');
  assert.ok(Math.abs(camera.position.length()-radius)<1e-8,'no unexpected zoom');
 }
 for(let i=0;i<600;i++){
  orbitHandPan(controls,Math.sin(i*.14)*.01,Math.cos(i*.07)*.012,1280,720);
  controls.update(1/30);check();
 }
 for(const dy of [.025,-.025]){
  for(let i=0;i<180;i++){orbitHandPan(controls,.012,dy,1280,720);controls.update(1/30);check();}
  for(let i=0;i<180;i++){controls.update(1/30);check();}
  const atPole=controls.getPolarAngle();
  orbitHandPan(controls,0,-Math.sign(dy)*.01,1280,720);controls.update(1/30);check();
  assert.ok(Math.abs(controls.getPolarAngle()-atPole)>.0001,'reverse motion must leave the pole');
 }
 console.log('Passed: mixed-axis turns, both pole limits, no roll/inversion, constant distance, reverse from poles.');
}finally{await rm(temp,{recursive:true,force:true});}
