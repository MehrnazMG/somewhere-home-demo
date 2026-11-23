import * as THREE from 'three';

// A shared transparent background layer, independent of globe rotation and style.
export function createStarfield(){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const material=new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
 const grainMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{amount:{value:0},pixelScale:{value:1}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`uniform float amount,pixelScale;void main(){vec2 p=floor(gl_FragCoord.xy/pixelScale);float n=fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);gl_FragColor=vec4(vec3(step(.5,n)),abs(n-.5)*amount*.55);}`});
 const grainQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),grainMaterial);grainQuad.renderOrder=-1;grainQuad.frustumCulled=false;scene.add(grainQuad);
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(quad);
 let texture=null,key='',enabled=false;
 function randomFactory(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return ((n^n>>>14)>>>0)/4294967296;}}
 function draw(config,w,h,dpr){
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const rand=randomFactory(74029),hand=config.starStyle==='hand';
  const count=Math.round(w*h/100000*(hand?95:350)*config.starDensity);
  const base=new THREE.Color(config.starColor);const rgb=[base.r,base.g,base.b].map(c=>Math.round(THREE.MathUtils.clamp(THREE.ColorManagement.fromWorkingColorSpace(new THREE.Color(c,c,c),THREE.SRGBColorSpace).r,0,1)*255));
  // In the hand-drawn version brightness changes ink color, never opacity.
  ctx.filter=hand&&config.starSoftness>0?`blur(${config.starSoftness*3*config.starSize*dpr}px)`:'none';
  const color=rgb.map(c=>hand?Math.round(c*config.starBrightness):c).join(',');
  for(let i=0;i<count;i++){
   const x=rand()*w,y=rand()*h,size=(.45+Math.pow(rand(),4)*(hand?2.5:1.65))*config.starSize;
   const alpha=hand?1:(.15+Math.pow(rand(),1.4)*.72)*config.starBrightness;
   ctx.save();ctx.translate(x,y);ctx.rotate(rand()*Math.PI);ctx.fillStyle=`rgba(${color},${alpha})`;ctx.strokeStyle=`rgba(${color},${alpha})`;
   if(hand&&rand()<.09){
    const tips=rand()<.35?4:5,r=(3+rand()*4)*config.starSize;ctx.beginPath();
    for(let k=0;k<tips*2;k++){const angle=k*Math.PI/tips-Math.PI/2,rr=r*(k%2?.28+rand()*.14:.8+rand()*.25);const px=Math.cos(angle)*rr,py=Math.sin(angle)*rr;if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath();ctx.fill();
   }else if(hand){ctx.beginPath();ctx.ellipse(0,0,size*.8,size*(.6+rand()*.5),0,0,Math.PI*2);ctx.fill();}
   else{
    // Uneven photographic pinpoints with tiny warm/cool variations and soft grain.
    const tint=rand();let c=color;if(tint<.12)c='164,185,232';else if(tint>.88)c='226,153,112';
    if(size>1.15){const glow=ctx.createRadialGradient(0,0,0,0,0,size*2.5);glow.addColorStop(0,`rgba(${c},${alpha*.6})`);glow.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=glow;ctx.fillRect(-size*2.5,-size*2.5,size*5,size*5)}
    ctx.fillStyle=`rgba(${c},${alpha})`;ctx.beginPath();ctx.arc(0,0,size*.45,0,Math.PI*2);ctx.fill();
    for(let j=0;j<3;j++){ctx.globalAlpha=.18+rand()*.3;ctx.fillRect((rand()-.5)*size*2,(rand()-.5)*size*2,.4,.4)}
   }ctx.restore();
  }
  if(texture)texture.dispose();texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;material.needsUpdate=true;
 }
 return {apply(config,w,h,dpr){enabled=config.stars;quad.visible=enabled;grainQuad.visible=config.viewMode==='dream'&&config.dreamBackgroundGrain>0;grainMaterial.uniforms.amount.value=config.dreamBackgroundGrain;grainMaterial.uniforms.pixelScale.value=dpr*1.2;const next=JSON.stringify([w,h,dpr,config.starStyle,config.starColor,config.starDensity,config.starSize,config.starBrightness,config.starSoftness]);if(enabled&&next!==key){draw(config,w,h,dpr);key=next}},render(renderer){if(enabled||grainQuad.visible)renderer.render(scene,camera)}};
}
