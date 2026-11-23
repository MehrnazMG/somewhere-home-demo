const channel=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export const luminance=(r,g,b)=>.2126*channel(r)+.7152*channel(g)+.0722*channel(b);
const contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
export function chooseInk(values){
  if(!values.length)return 'light';
  // Geometric mean balances bright/dark patches without a single grain pixel deciding.
  const score=ink=>values.reduce((sum,bg)=>sum+Math.log(contrast(ink,bg)),0)/values.length;
  return score(.018)>score(1)?'dark':'light';
}

// Sample the image composition, never a screenshot with text already drawn over it.
export function createSceneContrast(room){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const images={blue:room.querySelector('.shared-home-image'),winter:room.querySelector('[data-winter-background]'),house:room.querySelector('[data-winter-house]'),outline:room.querySelector('[data-winter-outline]')};
  const targets=[room.querySelector('.room-location'),room.querySelector('[data-room-title]'),room.querySelector('#backToGlobe')];
  const ready=image=>image.complete&&image.naturalWidth>0;
  function cover(image,w,h){const s=Math.max(w/image.naturalWidth,h/image.naturalHeight);ctx.drawImage(image,(w-image.naturalWidth*s)/2,(h-image.naturalHeight*s)/2,image.naturalWidth*s,image.naturalHeight*s);}
  function update(){
    if(room.hidden||!ctx)return;
    const viewport=room.getBoundingClientRect();if(!viewport.width||!viewport.height)return;
    const ratio=Math.min(1,480/viewport.width);canvas.width=Math.round(viewport.width*ratio);canvas.height=Math.round(viewport.height*ratio);
    const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    if(room.dataset.scene==='winter'){
      if(!ready(images.winter)||!ready(images.house))return;
      cover(images.winter,w,h);
      const s=Math.min(viewport.width/1058,viewport.height/799)*ratio;
      const x=(w-1058*s)/2,y=(h-799*s)/2;
      ctx.drawImage(images.house,x+319.57*s,y+229*s,421*s,493*s);
      if(ready(images.outline))ctx.drawImage(images.outline,x+310*s,y+223*s,438.143*s,517.931*s);
    }else{
      if(!ready(images.blue))return;cover(images.blue,w,h);
    }
    const pixels=ctx.getImageData(0,0,w,h).data;
    for(const target of targets){
      if(target.hidden)continue;
      const r=target.getBoundingClientRect();const values=[];
      for(let row=0;row<9;row++)for(let col=0;col<19;col++){
        const x=Math.max(0,Math.min(w-1,Math.floor((r.left-viewport.left+r.width*(col+.5)/19)*ratio)));
        const y=Math.max(0,Math.min(h-1,Math.floor((r.top-viewport.top+r.height*(row+.5)/9)*ratio)));
        const i=(y*w+x)*4;values.push(luminance(pixels[i],pixels[i+1],pixels[i+2]));
      }
      target.dataset.ink=chooseInk(values);
    }
  }
  for(const image of Object.values(images))image.addEventListener('load',update);
  window.addEventListener('resize',update);
  return {update,dispose(){window.removeEventListener('resize',update);for(const image of Object.values(images))image.removeEventListener('load',update);}};
}
