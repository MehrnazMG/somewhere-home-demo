import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('../gesture/input/WiperClick.js',import.meta.url),'utf8');
const {WiperClick,fingerSwingAngle}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const cfg={clickArmMs:180,grabHoldMs:430,clickCooldownMs:280,wiperDownAngle:20,wiperReturnAngle:9,wiperRestAngle:6,wiperDownMs:240,wiperReturnMs:550,wiperPalmTolerance:.05};
const sample=(swing=10,extra={})=>({straight:true,fist:false,swing,palm:{x:.5,y:.5},...extra});
function ready(){const f=new WiperClick(cfg);f.update(sample(),0);f.update(sample(),200);assert.equal(f.phase,'armed');return f;}
const click=ready();click.update(sample(20),230);assert.equal(click.update(sample(35),300).confirm,false);assert.equal(click.phase,'swing');assert.equal(click.update(sample(12),400).confirm,true);assert.equal(click.update(sample(),433).confirm,false);
const slow=ready();slow.update(sample(18),250);slow.update(sample(24),550);assert.equal(slow.update(sample(10),600).confirm,false);
const move=ready();move.update(sample(35),250);assert.equal(move.update(sample(10,{palm:{x:.7,y:.5}}),350).confirm,false);
const grab=ready();grab.update(sample(35),250);grab.update(sample(35,{straight:false,fist:true}),300);assert.equal(grab.update(sample(35,{straight:false,fist:true}),750).mode,'grab');assert.equal(grab.update(sample(),800).confirm,false);
const missing=ready();missing.update(sample(35),250);missing.reset();assert.equal(missing.update(sample(),400).confirm,false);
const lm=Array.from({length:21},()=>({x:0,y:0,z:0}));lm[0]={x:0,y:0,z:0};lm[9]={x:0,y:1,z:0};lm[5]={x:.1,y:1,z:0};lm[8]={x:.2,y:2,z:.5};
const angle=fingerSwingAngle(lm);
const rotated=lm.map(p=>({x:-p.y+2,y:p.x+3,z:p.z+4}));assert.ok(Math.abs(fingerSwingAngle(rotated)-angle)<1e-8,'whole-hand rotation and translation must not count as a finger swing');
console.log('Passed: down-return click, slow-motion rejection, palm-motion cancellation, fist grab, hand loss, hand-relative angle invariance.');
