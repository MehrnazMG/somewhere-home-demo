import * as THREE from 'three';
export function createDreamMaterial(){
 const uniforms={map:{value:null},sea:{value:new THREE.Color()},land:{value:new THREE.Color()},accent:{value:new THREE.Color()},grain:{value:.65},depth:{value:.12},pixelScale:{value:1},showGrid:{value:0},gridWidth:{value:1.2},gridOpacity:{value:1}};
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:`varying vec2 vUv;varying vec3 vLocal,vNormal,vView;void main(){vUv=uv;vLocal=position;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}`,
 fragmentShader:`uniform sampler2D map;uniform vec3 sea,land,accent;uniform float grain,depth,pixelScale,showGrid,gridWidth,gridOpacity;varying vec2 vUv;varying vec3 vLocal,vNormal,vView;
 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 void main(){float m=texture2D(map,vUv).r;
 float continent=smoothstep(.035,.78,m);
 float green=smoothstep(.44,.72,noise(vLocal*2.1+3.))*smoothstep(.68,.99,m);
 vec3 col=mix(sea,land,continent);col=mix(col,accent,green*.92);
 float shade=.45+.55*max(dot(normalize(vNormal),normalize(vec3(-.5,.7,1.))),0.);
 col*=mix(1.,shade,depth);
 // Screen-space antialiasing keeps grid thickness adjustable at any zoom.
 vec2 cell=vUv*vec2(24.,12.);
 vec2 distanceToLine=abs(fract(cell+.5)-.5)/max(fwidth(cell),vec2(.00001));
 float line=1.-smoothstep(max(0.,gridWidth*.5-.6),gridWidth*.5+.6,min(distanceToLine.x,distanceToLine.y));
 col=mix(col,vec3(1.),line*showGrid*gridOpacity);
 // Fixed print grain: no time animation, flickering or moving cloud patches.
 vec2 pixel=floor(gl_FragCoord.xy/pixelScale);float ink=hash(vec3(pixel,7.))-.5;
 col*=1.+ink*grain*.65;col+=vec3(ink*grain*.09);
 gl_FragColor=vec4(max(col,vec3(0.)),1.);
 #include <colorspace_fragment>
 }`});
 let source=null,canvas=null,ctx=null,texture=null,lastSoftness=null;
 return {material,setMap(landCanvas){source=landCanvas;canvas=document.createElement('canvas');canvas.width=landCanvas.width;canvas.height=landCanvas.height;ctx=canvas.getContext('2d');texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;uniforms.map.value=texture;},
 apply(config,pixelRatio){uniforms.gridOpacity.value=config.dreamGridOpacity;uniforms.showGrid.value=Number(config.grid);uniforms.gridWidth.value=config.dreamGridWidth*pixelRatio;uniforms.sea.value.set(config.dreamOcean);uniforms.land.value.set(config.dreamLand);uniforms.accent.value.set(config.dreamAccent);uniforms.grain.value=config.dreamGrain;uniforms.depth.value=config.dreamDepth;uniforms.pixelScale.value=pixelRatio*1.25;
 if(ctx&&lastSoftness!==config.dreamSoftness){const blur=1+config.dreamSoftness*18;ctx.filter='none';ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.filter=`blur(${blur}px)`;for(const x of [-canvas.width,0,canvas.width])ctx.drawImage(source,x,0);ctx.filter='none';texture.needsUpdate=true;lastSoftness=config.dreamSoftness;}}
 };
}
