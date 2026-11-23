import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
let src=await readFile(new URL('../home-visit.js',import.meta.url),'utf8');
for(const name of ['home-scenes.js','scene-contrast.js']){
 const dependency=await readFile(new URL('../'+name,import.meta.url),'utf8');
 src=src.replace("'./"+name+"'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(dependency).toString('base64')));
}
const {createHomeVisit}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
let now=0;
const element=()=>({hidden:true,disabled:false,dataset:{},style:{},fields:{},events:{},offsetWidth:287,offsetHeight:281,
 classList:{values:new Set(),add(...xs){xs.forEach(x=>this.values.add(x));},remove(...xs){xs.forEach(x=>this.values.delete(x));},contains(x){return this.values.has(x);},toggle(x,on){on?this.add(x):this.remove(x);}},
 querySelectorAll(){return [];},
 querySelector(s){return this.fields[s]??=(element());},setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.events[k]=f;},removeEventListener(){},focus(){}});
const card=element(),room=element(),back=element(),body=element();
globalThis.window={addEventListener(){},removeEventListener(){}};
globalThis.document={createElement:()=>({getContext:()=>null}),querySelectorAll:()=>[],getElementById:id=>({homeCard:card,sharedHome:room,backToGlobe:back})[id],body};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.innerWidth=1280;globalThis.innerHeight=900;
const originalPerformance=globalThis.performance;
globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=f=>f();
try {
 let preview=null,enters=0,returns=0;
 const flow=createHomeVisit({projectHome:()=>({x:500,y:300,visible:true}),onPreview:h=>preview=h,onEnter:()=>enters++,onReturn:()=>returns++});
 const home={userData:{name:'Ljubljana, Slovenia'}};
 flow.offer(home);assert.equal(card.hidden,false);assert.equal(preview,home);assert.equal(flow.isOpen,false);
 assert.equal(card.fields['.home-card-image'].dataset.ready,'false','show placeholder while image is unavailable');
 assert.equal(card.fields['[data-card-title]'].textContent,'This is my cozy Slovenia sitting room.','text appears before image loads');
 const image=card.fields['.home-card-image > img'];image.complete=true;image.naturalWidth=1804;image.events.load();
 assert.equal(card.fields['.home-card-image'].dataset.ready,'true','fill image after independent load');
 assert.equal(card.hidden,false);assert.equal(preview,home,'image loading cannot delay or clear house highlight');
 flow.offer(null);now=700;flow.update();assert.equal(card.hidden,false,'allow movement toward card');
 flow.handOverCard(true);now=1200;flow.update();assert.equal(card.hidden,false,'hand over card keeps preview');
 assert.equal(flow.enter(),true);assert.equal(flow.isOpen,true);assert.equal(card.hidden,true);assert.equal(back.hidden,true);assert.equal(enters,1);
 now=3199;flow.update();assert.equal(back.hidden,true,'return not available before 2 seconds');
 now=3200;flow.update();assert.equal(back.hidden,false);assert.equal(flow.canReturn,true);
 back.events.click();assert.equal(flow.isOpen,false);assert.equal(room.hidden,true);assert.equal(returns,1);
 flow.offer(home);flow.enter();assert.equal(back.hidden,true,'re-enter restarts delay');
 flow.leave();assert.equal(returns,2);now=9000;flow.update();assert.equal(back.hidden,true,'old room delay cannot reveal a stale button');
 flow.offer(home);flow.offer(null);now=9900;flow.update();assert.equal(card.hidden,true,'unused preview dismisses after grace');
 flow.dispose();console.log('Passed: hover card, hand transit grace, enter, delayed return, return/re-entry and stale timer cancellation.');
} finally {
 globalThis.performance=originalPerformance;
 for(const k of ['document','window','ResizeObserver','innerWidth','innerHeight','requestAnimationFrame'])delete globalThis[k];
}
