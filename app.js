import * as THREE from 'three';
import { createHomeVisit } from './home-visit.js';
import { createGestureBridge } from './gesture/bridge.js';
import { DREAM_DEFAULTS } from './dream-defaults.js?v=3';
import { createStarfield } from './stars.js?v=4';
import { createDreamMaterial } from './dream.js?v=grid-2';
import { createNeonGlobe } from './neon.js';
import { OrbitControls } from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id);
const starKeys=['stars','starStyle','starColor','starDensity','starSize','starBrightness','starSoftness'];
const defaults={houseOutlineWidth:1.4,houseOutlineGlow:.45,houseTilt:22,houseOrientation:'radial',houseContact:.7,houseSpill:.45,houseWindowLight:1.3,houseLight:1,houseGlow:.65,houseShading:.28,dreamGridOpacity:1,dreamGridWidth:1.2,starSoftness:0,stars:true,starStyle:'hand',starColor:'#ffffff',starDensity:.45,starSize:1.75,starBrightness:.78,dreamBackgroundGrain:.35,dreamOcean:'#3656eb',dreamLand:'#cdc0e8',dreamAccent:'#89c989',dreamBackground:'#302d40',dreamGrain:.68,dreamSoftness:.65,dreamDepth:.12,viewMode:'solid',neonColor:'#ffb269',cageColor:'#806a50',neonWidth:1,neonGlow:1.3,cageBrightness:.65,rearVisibility:.2,countries:true,countryStrength:.85,borderWidth:.65,borderColor:'#81523a',country1:'#b75335',country2:'#cb833e',country3:'#9d9c52',country4:'#d3ab62',country5:'#936049',country6:'#b97253',country7:'#c5b080',outlineColor:'#755136',outlineWidth:1.5,ocean:'#f5c879',land:'#a97741',glowColor:'#ffba55',houseColor:'#fff8ed',material:'paper',unevenness:.65,diffusion:.7,brightness:1.35,glow:0.35,texture:0.56,houseSize:1,speed:0.3,rotate:true,grid:true,homes:true};
const presets={dream:{...defaults,...DREAM_DEFAULTS},neon:{...defaults,viewMode:'neon',homes:false,glow:.08,speed:.18},lantern:{...defaults},atlas:{...defaults,ocean:'#92b0a3',land:'#d8b764',glowColor:'#eac483',brightness:0.9,glow:0.34,texture:0.62},ember:{...defaults,ocean:'#db8e41',land:'#8e4c2c',glowColor:'#ff8a32',brightness:1.05,glow:0.9,texture:0.42}};
let config={...presets.dream};try{config={...presets.dream,...JSON.parse(localStorage.getItem('home-globe-gestures-v1')||'{}')}}catch{}
// Keep initialization recoverable without touching saved styles.
async function startRenderer(){
 for(const powerPreference of ['default','low-power']){
  try{return new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:false,stencil:false,powerPreference});}
  catch(error){console.warn('Globe graphics initialization failed:',error.message);if(powerPreference==='default')await new Promise(resolve=>setTimeout(resolve,450));}
 }
 const loading=$('loading');loading.hidden=false;loading.replaceChildren();
 const message=document.createElement('p');message.textContent='The 3D view could not start. Your style settings are saved.';
 const retry=document.createElement('button');retry.textContent='Try loading again';retry.onclick=()=>location.reload();loading.append(message,retry);document.body.classList.add('graphics-unavailable');
 return null;
}
const renderer=await startRenderer();
if(renderer){
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#070705');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;$('stage').appendChild(renderer.domElement);renderer.autoClear=false;const starfield=createStarfield();
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(-.3,1.3,7.7);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI;controls.minDistance=3.5;controls.maxDistance=26;controls.autoRotate=true;controls.autoRotateSpeed=.3;
const world=new THREE.Group();world.rotation.y=-1.9;scene.add(world);
const neonGlobe=createNeonGlobe(world);
const geo=new THREE.SphereGeometry(2,128,96);
let coastCanvas=null,coastContext=null,coastData=null,coastTexture=null,lastCoastWidth=null;
let countryData=null,countryCanvas=null,countryBorderCanvas=null,countryMap=null,countryBorderMap=null,countryDrawKey=null;
const uniforms={countryMap:{value:null},countryBorderMap:{value:null},countryStrength:{value:.85},borderColor:{value:new THREE.Color()},outlineMap:{value:null},outlineColor:{value:new THREE.Color()},map:{value:null},ocean:{value:new THREE.Color()},land:{value:new THREE.Color()},glowColor:{value:new THREE.Color()},brightness:{value:1},grain:{value:.3},grid:{value:1},unevenness:{value:.65},diffusion:{value:.7},material:{value:0}};
const globeMat=new THREE.ShaderMaterial({uniforms,vertexShader:`
varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition; varying vec3 vLocal;
void main(){vUv=uv;vLocal=position;vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`,fragmentShader:`
uniform sampler2D map,outlineMap,countryMap,countryBorderMap;
uniform vec3 ocean,land,glowColor,outlineColor,borderColor;
uniform float countryStrength;
uniform float brightness,grain,grid,unevenness,diffusion,material;
varying vec2 vUv;varying vec3 vNormal,vPosition,vLocal;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.55+noise(p*2.03+7.)*.28+noise(p*4.07+13.)*.17;}
void main(){
 float mask=texture2D(map,vUv).r;
 vec3 n=normalize(vNormal),view=normalize(-vPosition);float facing=max(dot(n,view),0.);
 // Fine surface tooth remains; broad patchy thickness noise is intentionally removed.
 float pulp=fbm(vLocal*29.);
 float fine=noise(vLocal*210.);
 float fiber=noise(vLocal*vec3(130.,780.,130.));
 float paper=1.-step(.5,material),glass=step(.5,material)*(1.-step(1.5,material));
 float ceramic=step(1.5,material);
 float thickness=1.;
 thickness=max(.12,thickness);
 // Printed land absorbs more of the same inner light than the unprinted ocean.
 float ink=mix(.42,.82,paper)*mask;
 float transmission=exp(-thickness*(.58+ink*.48));
 float bulbFacing=max(dot(n,normalize(vec3(-.32,-.22,1.))),0.);
 float bulb=pow(bulbFacing,mix(5.,1.15,diffusion));
 float interior=mix(.95,.30+1.5*bulb,unevenness)*transmission*brightness;
 float edge=pow(facing,.32);
 float surface=max(dot(n,normalize(vec3(-.6,.8,1.))),0.);
 vec3 printedCountry=pow(texture2D(countryMap,vUv).rgb,vec3(2.2));
 vec3 landInk=mix(land,printedCountry,countryStrength);
 vec3 col=mix(ocean,landInk,mask);
 // Fine print/paper tooth modulates both the ink and transmitted light.
 float tooth=(fine-.5)*.20+(fiber-.5)*.10;
 float grainAmount=grain*(paper+glass*.35+ceramic*.14);
 col*=1.+tooth*grainAmount;
 vec2 cells=abs(sin(vUv*vec2(24.,12.)*3.14159265));
 float line=1.-smoothstep(.008,.027,min(cells.x,cells.y));col*=1.-line*.16*grid;
 col=mix(col,borderColor,texture2D(countryBorderMap,vUv).r*step(.001,countryStrength));
 col=mix(col,outlineColor,texture2D(outlineMap,vUv).r);
 col*=.16+surface*.15+interior*(.65+.35*edge);
 // A gentle amber tint appears where more light passes through the shell.
 col+=glowColor*interior*.12;
 vec3 halfVector=normalize(view+normalize(vec3(-.6,.8,1.)));
 float highlight=pow(max(dot(n,halfVector),0.),mix(14.,38.,ceramic));
 col+=vec3(1.,.87,.66)*highlight*(glass*.12+ceramic*.23);
 col+=glowColor*pow(1.-facing,3.)*.035;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});
const dreamGlobe=createDreamMaterial();
const globe=new THREE.Mesh(geo,globeMat);world.add(globe);
// Soft halo stays in world space around the globe; it does not rotate with the map.
const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=256;const hc=haloCanvas.getContext('2d');const grad=hc.createRadialGradient(128,128,30,128,128,128);grad.addColorStop(0,'rgba(255,255,255,0.7)');grad.addColorStop(.48,'rgba(255,255,255,0.2)');grad.addColorStop(.72,'rgba(255,255,255,0.045)');grad.addColorStop(1,'rgba(255,255,255,0)');hc.fillStyle=grad;hc.fillRect(0,0,256,256);const haloMat=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(haloCanvas),color:'#ffba55',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});const halo=new THREE.Sprite(haloMat);halo.scale.set(8.7,8.7,1);scene.add(halo);
scene.add(new THREE.AmbientLight('#ffe7c0',2.2));const sun=new THREE.DirectionalLight('#fff4da',3.2);sun.position.set(-3,5,6);scene.add(sun);
const houseGroup=new THREE.Group();world.add(houseGroup);
if(config.houseColor==='#fff0cc')config.houseColor='#fff8ed';
if(config.houseShading===.12)config.houseShading=.28;
const milkUniforms={color:{value:new THREE.Color(config.houseColor)},light:{value:config.houseLight},shading:{value:config.houseShading},windowLight:{value:config.houseWindowLight}};
const houseMat=new THREE.ShaderMaterial({uniforms:milkUniforms,vertexShader:`varying vec3 vNormal,vLocal,vLocalNormal;void main(){vLocal=position;vLocalNormal=normal;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 color;uniform float light,shading,windowLight,hoverLight,visibility;varying vec3 vNormal,vLocal,vLocalNormal;
float rectangle(vec2 p,vec2 extent){vec2 aa=fwidth(p);vec2 mask=1.-smoothstep(extent-aa,extent+aa,abs(p));return mask.x*mask.y;}
void main(){float diffuse=max(dot(normalize(vNormal),normalize(vec3(-.6,.8,1.))),0.);
 float fiber=fract(sin(dot(floor(vLocal*2400.),vec3(12.9898,78.233,34.12)))*43758.5453)-.5;
 float lowerWall=exp(-length(vec2(vLocal.x,vLocal.y-.045))*17.);
 vec3 milk=color*(.58+.16*diffuse)*(1.-shading*(1.-diffuse))*(1.+fiber*.045);
 milk+=vec3(1.,.75,.42)*light*lowerWall*.045;
 float roof=step(.25,vLocalNormal.y);milk*=mix(vec3(1.),vec3(.91,.92,.96),roof);
 // Windows on the gable and side faces transmit more light; the cross stays opaque.
 vec2 front=vLocal.xy-vec2(0.,.053),side=vLocal.zy-vec2(0.,.053);
 float frontGlass=rectangle(front,vec2(.021,.019))*smoothstep(.0018,.003,abs(front.x))*smoothstep(.0018,.003,abs(front.y));
 float sideGlass=rectangle(side,vec2(.021,.019))*smoothstep(.0018,.003,abs(side.x))*smoothstep(.0018,.003,abs(side.y));
 float windowMask=max(frontGlass*step(.95,abs(vLocalNormal.z)),sideGlass*step(.95,abs(vLocalNormal.x)));
 vec3 windowGlow=vec3(1.,.91,.69)*(.85+windowLight*.24);
 float center=exp(-dot((vLocal.xy-vec2(0.,.055))/vec2(.05,.052),(vLocal.xy-vec2(0.,.055))/vec2(.05,.052))*1.6);
 milk=mix(milk,milk*vec3(1.18,.88,.46),hoverLight*.7);
 milk+=vec3(1.,.56,.12)*hoverLight*(.07+center*.65);
 windowGlow=mix(windowGlow,vec3(1.65,1.24,.52),hoverLight);
 vec3 surface=mix(milk,windowGlow,windowMask);gl_FragColor=vec4(surface,visibility);
#include <colorspace_fragment>
}`});
const houseHaloCanvas=document.createElement('canvas');houseHaloCanvas.width=houseHaloCanvas.height=128;const houseHaloCtx=houseHaloCanvas.getContext('2d');const houseHaloGradient=houseHaloCtx.createRadialGradient(64,64,0,64,64,64);houseHaloGradient.addColorStop(0,'rgba(255,255,255,.48)');houseHaloGradient.addColorStop(.25,'rgba(255,255,255,.28)');houseHaloGradient.addColorStop(.55,'rgba(255,255,255,.07)');houseHaloGradient.addColorStop(1,'rgba(255,255,255,0)');houseHaloCtx.fillStyle=houseHaloGradient;houseHaloCtx.fillRect(0,0,128,128);
const houseHaloMaterial=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(houseHaloCanvas),color:'#ffdfa7',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,opacity:.3});

const locations=[['Ljubljana, Slovenia',46.05,14.5],['Amsterdam, Netherlands',52.37,4.9],['Istanbul, Türkiye',41,29],['Kyoto, Japan',35,135.8],['Taipei, Taiwan',25,121.5],['Chiang Mai, Thailand',18.8,99],['Melbourne, Australia',-37.8,145],['Cape Town, South Africa',-33.9,18.4],['Marrakesh, Morocco',31.6,-8],['Reykjavík, Iceland',64.1,-21.9],['Mexico City, Mexico',19.4,-99.1],['Vancouver, Canada',49.3,-123.1],['Valparaíso, Chile',-33,-71.6],['Salvador, Brazil',-13,-38.5]];
function position(lat,lon,r){const p=THREE.MathUtils.degToRad(lon+180),t=THREE.MathUtils.degToRad(lat);return new THREE.Vector3(-Math.cos(p)*Math.cos(t),Math.sin(t),Math.sin(p)*Math.cos(t)).multiplyScalar(r)}
const houseShape=new THREE.Shape();houseShape.moveTo(-.07,0);houseShape.lineTo(.07,0);houseShape.lineTo(.07,.09);houseShape.lineTo(0,.15);houseShape.lineTo(-.07,.09);houseShape.closePath();
const houseGeometry=new THREE.ExtrudeGeometry(houseShape,{depth:.095,bevelEnabled:true,bevelThickness:.0012,bevelSize:.0012,bevelSegments:1,steps:1});houseGeometry.translate(0,0,-.0475);
// Curved decals attach contact shade and window spill to the globe, not to the camera.
function groundTexture(light){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.translate(64,64);ctx.scale(1,light?.85:.7);const g=ctx.createRadialGradient(light?0:8,0,4,light?0:8,0,60);g.addColorStop(0,light?'rgba(255,255,255,.6)':'rgba(255,255,255,.72)');g.addColorStop(.35,light?'rgba(255,255,255,.32)':'rgba(255,255,255,.48)');g.addColorStop(.72,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(-80,-100,160,200);return new THREE.CanvasTexture(c)}
const contactMat=new THREE.MeshBasicMaterial({map:groundTexture(false),color:'#17182f',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,opacity:.7});
const spillMat=new THREE.MeshBasicMaterial({map:groundTexture(true),color:'#ffe5b5',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,opacity:.15});
const contactGeometry=new THREE.PlaneGeometry(.38,.3,12,12);contactGeometry.rotateX(-Math.PI/2);const spillGeometry=contactGeometry.clone();
function fitGround(scale){for(const [g,height]of [[contactGeometry,.001],[spillGeometry,.0015]]){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)*scale,z=p.getZ(i)*scale;p.setY(i,(Math.sqrt(Math.max(.001,4-x*x-z*z))-2+height-.005)/scale)}p.needsUpdate=true;g.computeBoundingSphere()}}

// Screen-space white ink with a soft halo; width remains consistent at every zoom.
const houseOutlineMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,uniforms:{width:{value:1.4},glow:{value:.45},visibility:{value:1},resolution:{value:new THREE.Vector2(innerWidth,innerHeight)}},vertexShader:`attribute vec3 other;attribute float side;attribute float edgeAcross;uniform vec2 resolution;uniform float width;varying float across;void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vec4 q=projectionMatrix*modelViewMatrix*vec4(other,1.);vec2 d=normalize((q.xy/q.w-p.xy/p.w)*resolution);vec2 normal=vec2(-d.y,d.x);p.xy+=normal*side*(width+6.)/resolution*p.w;across=edgeAcross;gl_Position=p;}`,fragmentShader:`uniform float width,glow,visibility;varying float across;void main(){float distance=abs(across)*(width+6.)*.5;float core=1.-smoothstep(width*.5-.3,width*.5+.6,distance);float halo=exp(-distance*distance/5.)*glow*.55;gl_FragColor=vec4(vec3(1.),max(core,halo)*visibility);}`});
const outlineCorners=[];for(const z of [-.0487,.0487])for(const [x,y]of [[-.0712,-.0012],[.0712,-.0012],[.0712,.09],[0,.1512],[-.0712,.09]])outlineCorners.push(new THREE.Vector3(x,y,z));
function updateHouseOutline(visual){
 const outline=visual.getObjectByName('White outline');if(!outline)return;
 const points=outlineCorners.map(local=>{const p=visual.localToWorld(local.clone()).project(camera);return {x:p.x,y:p.y,local}}).sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const lower=[],upper=[];for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p)}for(const p of [...points].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p)}
 const hull=lower.slice(0,-1).concat(upper.slice(0,-1)),geometry=outline.geometry,positions=geometry.attributes.position,other=geometry.attributes.other,sides=geometry.attributes.side,edgeAcross=geometry.attributes.edgeAcross;let count=0;
 for(let i=0;i<hull.length;i++){const a=hull[i].local,b=hull[(i+1)%hull.length].local;if(a.y<.001&&b.y<.001)continue;
 for(const [end,side]of [[0,-1],[1,1],[0,1],[0,-1],[1,-1],[1,1]]){const p=end?b:a,q=end?a:b;positions.setXYZ(count,p.x,p.y,p.z);other.setXYZ(count,q.x,q.y,q.z);sides.setX(count,side*(end?-1:1));edgeAcross.setX(count,side);count++;}}
 positions.needsUpdate=true;other.needsUpdate=true;sides.needsUpdate=true;edgeAcross.needsUpdate=true;geometry.setDrawRange(0,count);

}
const homeMeshes=[];for(const [name,lat,lon]of locations){const home=new THREE.Group();home.position.copy(position(lat,lon,2.005));home.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),home.position.clone().normalize());home.userData.name=name;
 const visual=new THREE.Group();visual.name='House visual';home.add(visual);const material=houseMat.clone();material.uniforms={...milkUniforms,hoverLight:{value:0},visibility:{value:1}};material.transparent=true;const body=new THREE.Mesh(houseGeometry,material);body.name='House body';body.renderOrder=10;visual.add(body);const outlineGeometry=new THREE.BufferGeometry();outlineGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(180),3));outlineGeometry.setAttribute('other',new THREE.BufferAttribute(new Float32Array(180),3));outlineGeometry.setAttribute('side',new THREE.BufferAttribute(new Float32Array(60),1));outlineGeometry.setAttribute('edgeAcross',new THREE.BufferAttribute(new Float32Array(60),1));const outlineMaterial=houseOutlineMat.clone();const outline=new THREE.Mesh(outlineGeometry,outlineMaterial);outline.name='White outline';outline.renderOrder=12;outline.frustumCulled=false;visual.add(outline);
 const contact=new THREE.Mesh(contactGeometry,contactMat),spill=new THREE.Mesh(spillGeometry,spillMat);contact.name='Contact shadow';spill.name='Warm light on globe';home.add(contact,spill);
 const glow=new THREE.Sprite(houseHaloMaterial.clone());glow.position.y=.055;glow.scale.set(.24,.24,1);glow.name='Lantern glow';glow.renderOrder=11;visual.add(glow);houseGroup.add(home);homeMeshes.push(home)}

// Draw geographic land to a local canvas texture, keeping map detail independent of palette.
async function loadMap(){const response=await fetch('./assets/land.geojson');if(!response.ok)throw Error('Could not load map data');const data=await response.json();const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';for(const feature of data.features){const g=feature.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const poly of polys){ctx.beginPath();for(const ring of poly){ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*c.width,y=(90-lat)/180*c.height;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.closePath()}ctx.fill('evenodd')}}const texture=new THREE.CanvasTexture(c);texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();uniforms.map.value=texture;dreamGlobe.setMap(c);dreamGlobe.apply(config,renderer.getPixelRatio());coastData=data;neonGlobe.setLand(data);coastCanvas=document.createElement('canvas');coastCanvas.width=2048;coastCanvas.height=1024;coastContext=coastCanvas.getContext('2d');coastTexture=new THREE.CanvasTexture(coastCanvas);coastTexture.wrapS=THREE.RepeatWrapping;coastTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();uniforms.outlineMap.value=coastTexture;drawCoastline();await loadCountries();$('loading').hidden=true;}
// Independent coastline ink layer; width is measured in the 2048px map texture.
function drawCoastline(){
 if(!coastContext||lastCoastWidth===config.outlineWidth)return;
 const ctx=coastContext,w=coastCanvas.width,h=coastCanvas.height;
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
 if(config.outlineWidth>0){ctx.strokeStyle='#fff';ctx.lineWidth=config.outlineWidth;ctx.lineJoin='round';ctx.lineCap='round';
 for(const feature of coastData.features){const g=feature.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const poly of polys)for(const ring of poly){ctx.beginPath();let prev=null;for(const [lon,lat]of ring){const x=(lon+180)/360*w,y=(90-lat)/180*h;if(!prev||Math.abs(x-prev[0])>w/2)ctx.moveTo(x,y);else ctx.lineTo(x,y);prev=[x,y]}ctx.stroke()}}}
 coastTexture.needsUpdate=true;lastCoastWidth=config.outlineWidth;
}
function tracePolygon(ctx,poly,w,h){
 ctx.beginPath();for(const ring of poly){let previous=null;for(const [lon,lat]of ring){const x=(lon+180)/360*w,y=(90-lat)/180*h;if(!previous||Math.abs(x-previous[0])>w/2)ctx.moveTo(x,y);else ctx.lineTo(x,y);previous=[x,y]}ctx.closePath()}
}
async function loadCountries(){
 const response=await fetch('./assets/countries.geojson');if(!response.ok)throw Error('Could not load country boundaries');countryData=await response.json();
 countryCanvas=document.createElement('canvas');countryBorderCanvas=document.createElement('canvas');
 for(const c of [countryCanvas,countryBorderCanvas]){c.width=2048;c.height=1024}
 countryMap=new THREE.CanvasTexture(countryCanvas);countryBorderMap=new THREE.CanvasTexture(countryBorderCanvas);
 for(const t of [countryMap,countryBorderMap]){t.wrapS=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy()}
 uniforms.countryMap.value=countryMap;uniforms.countryBorderMap.value=countryBorderMap;drawCountries();
}
function drawCountries(){
 if(!countryData)return;
 const palette=Array.from({length:7},(_,i)=>config['country'+(i+1)]);
 const key=JSON.stringify([palette,config.borderWidth]);if(key===countryDrawKey)return;
 const c=countryCanvas.getContext('2d'),b=countryBorderCanvas.getContext('2d'),w=countryCanvas.width,h=countryCanvas.height;
 c.fillStyle=palette[0];c.fillRect(0,0,w,h);b.fillStyle='#000';b.fillRect(0,0,w,h);b.strokeStyle='#fff';b.lineWidth=config.borderWidth*2;b.lineJoin='round';
 countryData.features.forEach((f,i)=>{const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const colorIndex=Number(f.properties.MAPCOLOR7)||i+1;c.fillStyle=palette[(colorIndex-1)%7];for(const poly of polys){tracePolygon(c,poly,w,h);c.fill('evenodd');if(config.borderWidth>0){tracePolygon(b,poly,w,h);b.stroke()}}});
 countryMap.needsUpdate=true;countryBorderMap.needsUpdate=true;countryDrawKey=key;
}
const sliderDefs=[['houseOutlineWidth','Outline width',0,4,.1],['houseOutlineGlow','Outline glow',0,2,.01],['dreamGridWidth','Grid width',.3,5,.1],['dreamGridOpacity','Grid opacity',0,1,.01],['dreamBackgroundGrain','Background grain',0,1,.01],['dreamSoftness','Dreamy coast',0,1,.01],['dreamGrain','Print grain',0,1,.01],['dreamDepth','Sphere shading',0,1,.01],['neonWidth','Neon tube width',.4,2.5,.05],['neonGlow','Neon glow',.3,3,.05],['cageBrightness','Cage brightness',.1,1,.01],['rearVisibility','Rear lines',0,.7,.01],['countryStrength','Country colors',0,1,.01],['borderWidth','Country border width',0,3,.05],['outlineWidth','Coastline width',0,5,.1],['brightness','Inner light',.3,2,.01],['glow','Outer glow',0,1.5,.01],['unevenness','Light variation',0,1,.01],['diffusion','Light softness',0,1,.01],['texture','Surface texture',0,1,.01],['houseSize','House size',.5,2,.01],['houseTilt','House tilt',0,45,1],['houseLight','House inner light',0,2,.01],['houseWindowLight','Window light',0,3,.01],['houseGlow','House glow',0,2,.01],['houseShading','House shading',0,.5,.01],['houseContact','Contact shadow',0,1,.01],['houseSpill','Ground light',0,1,.01],['speed','Rotation speed',0,1.5,.01]];
for(const[id,label,min,max,step]of sliderDefs){const el=document.createElement('label');el.className='slider';el.innerHTML=`<span>${label}<output id="${id}Value"></output></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}">`;$(id.startsWith('house')?'houseSliders':'sliders').append(el)}
function apply(save=true){$('starSoftness').closest('.slider').hidden=config.starStyle!=='hand';starfield.apply(config,innerWidth,innerHeight,renderer.getPixelRatio());const isNeon=config.viewMode==='neon',isDream=config.viewMode==='dream';neonGlobe.apply(config);dreamGlobe.apply(config,renderer.getPixelRatio());globe.material=isDream?dreamGlobe.material:globeMat;globe.visible=!isNeon;halo.visible=!isNeon&&!isDream;renderer.setClearColor(isDream?config.dreamBackground:'#070705');document.body.classList.toggle('neon-mode',isNeon);document.body.classList.toggle('dream-mode',isDream);for(const [id]of sliderDefs){const neonOnly=['neonWidth','neonGlow','cageBrightness','rearVisibility'].includes(id);const dreamOnly=id.startsWith('dream');const common=['houseOutlineWidth','houseOutlineGlow','houseSize','houseTilt','houseLight','houseWindowLight','houseGlow','houseShading','houseContact','houseSpill','speed'].includes(id);$(id).closest('.slider').hidden=!common&&(isNeon?!neonOnly:isDream?!dreamOnly:neonOnly||dreamOnly);}drawCoastline();drawCountries();uniforms.countryStrength.value=config.countries?config.countryStrength:0;uniforms.borderColor.value.set(config.borderColor);for(const key of ['ocean','land','glowColor','outlineColor'])uniforms[key].value.set(config[key]);uniforms.material.value=['paper','frosted','porcelain'].indexOf(config.material);uniforms.unevenness.value=config.unevenness;uniforms.diffusion.value=config.diffusion;$('materialHint').textContent={paper:'Warm light through a fine-grained printed globe. No patchy texture.',frosted:'Soft, cloudy diffusion with a finer surface.',porcelain:'A smoother shell with a gentle satin highlight.'}[config.material];uniforms.brightness.value=config.brightness;uniforms.grain.value=config.texture;uniforms.grid.value=Number(config.grid);haloMat.color.set(config.glowColor);haloMat.opacity=config.glow*.85;halo.scale.setScalar(7.4+config.glow*2);fitGround(config.houseSize);contactMat.opacity=config.houseContact;spillMat.opacity=config.houseSpill*.3;milkUniforms.color.value.set(config.houseColor);milkUniforms.light.value=config.houseLight;milkUniforms.windowLight.value=config.houseWindowLight;milkUniforms.shading.value=config.houseShading;houseHaloMaterial.opacity=config.houseGlow*.16;houseOutlineMat.depthTest=config.houseOrientation!=='upright';houseMat.depthTest=config.houseOrientation!=='upright';houseHaloMaterial.depthTest=config.houseOrientation!=='upright';houseGroup.visible=config.homes;for(const h of homeMeshes){h.scale.setScalar(config.houseSize);h.getObjectByName('House body').material.depthTest=config.houseOrientation!=='upright';h.getObjectByName('White outline').material.depthTest=config.houseOrientation!=='upright';h.getObjectByName('Lantern glow').material.depthTest=config.houseOrientation!=='upright';h.getObjectByName('Contact shadow').visible=!isNeon;h.getObjectByName('Warm light on globe').visible=!isNeon;}controls.autoRotate=config.rotate;controls.autoRotateSpeed=config.speed;for(const key of Object.keys(defaults)){const el=$(key);if(el.type==='checkbox')el.checked=config[key];else el.value=config[key];if($(key+'Value'))$(key+'Value').value=Number(config[key]).toFixed(2)}if(save)try{localStorage.setItem('home-globe-gestures-v1',JSON.stringify(config))}catch{}}
for(const key of Object.keys(defaults))$(key).addEventListener('input',e=>{config[key]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value):e.target.value;document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'));apply()});
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{const starSettings=Object.fromEntries(starKeys.map(key=>[key,config[key]]));config={...presets[b.dataset.preset],...starSettings};apply();document.querySelectorAll('[data-preset]').forEach(p=>p.classList.toggle('active',p===b))};
$('reset').onclick=()=>{config={...presets.dream};camera.position.set(-.3,1.3,7.7).setLength(viewFit);controls.target.set(0,0,0);controls.update();apply();document.querySelectorAll('[data-preset]').forEach(p=>p.classList.toggle('active',p.dataset.preset==='dream'))};
function toggleUI(){document.body.classList.toggle('clean');$('hide').textContent=document.body.classList.contains('clean')?'Show controls':'Hide controls';resize()};$('hide').onclick=toggleUI;addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))toggleUI()});
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}$('export').onclick=()=>download(new Blob([JSON.stringify(config,null,2)],{type:'application/json'}),'home-globe-style.json');$('capture').onclick=()=>{renderFrame();renderer.domElement.toBlob(b=>{if(b)download(b,'home-globe.png')})};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,hover=null;
function pick(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...(globe.visible?[globe]:[]),...houseGroup.children],true);const hit=hits.find(hit=>(hit.object===globe&&config.houseOrientation!=='upright')||(hit.object.geometry===houseGeometry&&hit.object.parent.visible&&hit.object.parent.parent.visible&&hit.object.parent.parent.userData.visibility>.65));if(!hit||hit.object===globe||!config.homes)return null;let node=hit.object;while(node.parent!==houseGroup&&node.parent)node=node.parent;return node.parent===houseGroup?node:null}
const cardProjection=new THREE.Vector3();
const visitFlow=createHomeVisit({
 projectHome(home){home.getWorldPosition(cardProjection);cardProjection.project(camera);return {x:(cardProjection.x*.5+.5)*innerWidth,y:(-cardProjection.y*.5+.5)*innerHeight,visible:home.visible&&houseGroup.visible&&home.userData.visibility>.65};},
 onPreview(home){hover=home;controls.autoRotate=config.rotate&&!home&&!visitFlow.isOpen;},
 onEnter(){hover=null;controls.enabled=false;controls.autoRotate=false;},
 onReturn(){controls.enabled=true;controls.autoRotate=config.rotate;}
});
renderer.domElement.addEventListener('pointermove',e=>{if(visitFlow.isOpen)return;const home=pick(e);renderer.domElement.style.cursor=home?'pointer':'grab';visitFlow.offer(home);});
renderer.domElement.addEventListener('pointerleave',()=>visitFlow.offer(null));
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(moved<=6&&!visitFlow.isOpen)visitFlow.offer(pick(e));});
const gestureBridge=createGestureBridge({camera,world,controls,homes:homeMeshes,
 setHover(home){visitFlow.offer(home);},
 hoverPreview(over){visitFlow.handOverCard(over);},
 hoverReturn(over){visitFlow.handOverBack(over);},
 enterPreview(){return visitFlow.enter();},
 canReturn(){return visitFlow.canReturn;},
 closeHome(){visitFlow.leave();},isHomeOpen(){return visitFlow.isOpen;},
 hasPreview(){return !!visitFlow.preview;},
 projectHome(home){return visitFlow.project(home);}
});
let viewFit=7.7;
const houseAnchor=new THREE.Vector3(),houseView=new THREE.Vector3();
const tiltAxis=new THREE.Vector3(1,0,0),houseTilt=new THREE.Quaternion();
const uprightWorld=new THREE.Quaternion(),uprightParent=new THREE.Quaternion(),houseYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.11);
function orientHouses(){
 houseTilt.setFromAxisAngle(tiltAxis,THREE.MathUtils.degToRad(config.houseTilt));
 world.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 for(const home of homeMeshes){
  const visual=home.getObjectByName('House visual');home.getWorldPosition(houseAnchor);houseView.copy(camera.position).sub(houseAnchor).normalize();
  const facing=houseAnchor.clone().normalize().dot(houseView);
  const visibility=THREE.MathUtils.smoothstep(facing,.38,.58);home.userData.visibility=visibility;home.visible=visibility>.001;
  const target=home===hover&&visibility>.65?1:0;home.userData.warmth=target?1:THREE.MathUtils.lerp(home.userData.warmth||0,0,.14);
  const warmth=home.userData.warmth,body=home.getObjectByName('House body'),glow=home.getObjectByName('Lantern glow'),outline=home.getObjectByName('White outline');
  body.material.uniforms.hoverLight.value=warmth;body.material.uniforms.visibility.value=visibility;
  outline.material.uniforms.visibility.value=config.houseOutlineWidth>0?visibility:0;outline.material.uniforms.width.value=config.houseOutlineWidth;outline.material.uniforms.glow.value=config.houseOutlineGlow;outline.material.uniforms.resolution.value.set(innerWidth,innerHeight);
  glow.material.opacity=(config.houseGlow*.16+warmth*.8)*visibility;glow.material.color.set(warmth>.01?'#ffc15a':'#ffdfa7');glow.scale.setScalar(.24+warmth*.055);
  if(config.houseOrientation==='upright'){
   home.getWorldQuaternion(uprightParent);uprightWorld.copy(camera.quaternion).multiply(houseTilt).multiply(houseYaw);visual.quaternion.copy(uprightParent).invert().multiply(uprightWorld);
  }else visual.quaternion.identity();
 }
}
function renderFrame(){visitFlow.update();orientHouses();world.updateMatrixWorld(true);camera.updateMatrixWorld(true);if(config.homes)for(const home of homeMeshes){const visual=home.getObjectByName('House visual');if(visual.visible)updateHouseOutline(visual)}renderer.clear();starfield.render(renderer);renderer.render(scene,camera)}
function resize(){const availableWidth=innerWidth>820&&!document.body.classList.contains('clean')?innerWidth-330:innerWidth;const nextFit=7.7/Math.min(availableWidth/innerHeight,1);camera.position.multiplyScalar(nextFit/viewFit);viewFit=nextFit;renderer.setSize(innerWidth,innerHeight);starfield.apply(config,innerWidth,innerHeight,renderer.getPixelRatio());camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,innerWidth>820&&!document.body.classList.contains('clean')?140:0,0,innerWidth,innerHeight);camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();apply(false);loadMap().catch(e=>{$('loading').textContent=e.message});const clock=new THREE.Clock();let lastFrame=0;function animate(){const now=performance.now();if(document.hidden||now-lastFrame<1000/30)return;lastFrame=now;const dt=Math.min(clock.getDelta(),.1);gestureBridge.update(dt);if(!visitFlow.isOpen)controls.update(dt);if(visitFlow.isOpen)visitFlow.update();else renderFrame()}renderer.setAnimationLoop(animate);

// Explicitly release this page's GPU resources on navigation/reload.
let released=false;
function releaseGraphics(){if(released)return;released=true;renderer.setAnimationLoop(null);gestureBridge.dispose();visitFlow.dispose();controls.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material)});for(const m of materials){for(const value of Object.values(m))if(value&&value.isTexture)textures.add(value);if(m.uniforms)for(const uniform of Object.values(m.uniforms))if(uniform.value&&uniform.value.isTexture)textures.add(uniform.value);m.dispose()}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss()}
addEventListener('pagehide',releaseGraphics,{once:true});
addEventListener('pageshow',event=>{if(event.persisted&&released)location.reload()});
renderer.domElement.addEventListener('webglcontextlost',event=>{if(released)return;event.preventDefault();renderer.setAnimationLoop(null);const loading=$('loading');loading.hidden=false;loading.textContent='The 3D view paused. Recovering…';});
renderer.domElement.addEventListener('webglcontextrestored',()=>{if(released)return;$('loading').hidden=true;clock.getDelta();renderer.setAnimationLoop(animate)});
}
