import { describeHome } from './home-scenes.js';
import { createSceneContrast } from './scene-contrast.js';
// The globe stays mounted: returning preserves its view, settings and hand scheme.
export function createHomeVisit({projectHome,onPreview,onEnter,onReturn,returnDelay=2000}) {
  const card=document.getElementById('homeCard');
  const room=document.getElementById('sharedHome');
  const back=document.getElementById('backToGlobe');
  const adaptiveContrast=createSceneContrast(room);
  const media=card.querySelector('.home-card-image');
  const blueImage=card.querySelector('.home-card-image > img');
  const winterImages=[...card.querySelectorAll('.winter-scene img')];
  const previewImages=[blueImage,...winterImages];
  function updatePreviewReadiness(){
    const images=card.dataset.scene==='winter'?winterImages:[blueImage];
    const ready=images.length>0&&images.every(image=>image.complete&&image.naturalWidth>0);
    media.dataset.ready=String(ready);media.setAttribute('aria-busy',String(!ready));
  }
  for(const image of previewImages){image.addEventListener('load',updatePreviewReadiness);image.addEventListener('error',updatePreviewReadiness);}
  updatePreviewReadiness();
  let preview=null,opened=null,enteredAt=0,hideAt=0,mouseOver=false,handOver=false;
  let cardSize={width:287,height:281};
  const observer=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r?.height)cardSize={width:card.offsetWidth,height:card.offsetHeight};});
  observer.observe(card);
  const describe=describeHome;
  const artObserver=new ResizeObserver(entries=>{for(const entry of entries){const {width,height}=entry.contentRect;entry.target.style.setProperty('--scene-scale',Math.min(width/1058,height/799));}});
  for(const scene of document.querySelectorAll('.winter-scene'))artObserver.observe(scene);
  function hideCard(){preview=null;hideAt=0;card.hidden=true;card.classList.remove('is-visible','is-hand-hover');onPreview(null);}
  function positionCard(){
    if(!preview)return;
    const point=projectHome(preview);if(!point.visible){hideCard();return;}
    const right=innerWidth>820&&!document.body.classList.contains('clean')?innerWidth-345:innerWidth-20;
    let x=point.x+34;if(x+cardSize.width>right)x=point.x-cardSize.width-34;
    x=Math.max(16,Math.min(x,innerWidth-cardSize.width-16));
    const y=Math.max(20,Math.min(point.y-120,innerHeight-cardSize.height-200));
    card.style.left=x+'px';card.style.top=y+'px';
  }
  function offer(home){
    if(opened)return;
    if(!home){if(preview&&!mouseOver&&!handOver&&!hideAt)hideAt=performance.now()+800;return;}
    if((mouseOver||handOver)&&preview&&home!==preview)return;
    hideAt=0;
    if(preview===home)return;
    preview=home;onPreview(home);const data=describe(home);card.dataset.scene=data.scene;updatePreviewReadiness();
    card.querySelector('[data-card-title]').textContent=data.title;
    card.querySelector('[data-card-location]').textContent=data.location;
    card.setAttribute('aria-label','Visit '+data.location+' — '+data.title);
    card.hidden=false;positionCard();card.classList.add('is-visible');
  }
  function enter(){
    if(!preview||opened)return false;
    opened=preview;const data=describe(opened);hideCard();mouseOver=false;handOver=false;
    room.dataset.scene=data.scene;
    room.querySelector('[data-room-title]').textContent=data.title.replace('Slovenia sitting room.','Slovenia\nsitting room.');
    room.querySelector('[data-room-location]').textContent=data.location;
    back.hidden=true;back.disabled=true;back.classList.remove('is-visible','is-hand-hover');
    room.hidden=false;document.body.classList.add('in-shared-home');
    enteredAt=performance.now();room.focus({preventScroll:true});adaptiveContrast.update();onEnter(opened);return true;
  }
  function leave(){
    if(!opened)return;
    opened=null;room.hidden=true;back.hidden=true;back.disabled=true;
    document.body.classList.remove('in-shared-home');onReturn();
  }
  card.addEventListener('pointerenter',()=>{mouseOver=true;hideAt=0;});
  card.addEventListener('pointerleave',()=>{mouseOver=false;offer(null);});
  card.addEventListener('focus',()=>{mouseOver=true;hideAt=0;});
  card.addEventListener('blur',()=>{mouseOver=false;offer(null);});
  card.addEventListener('click',enter);back.addEventListener('click',()=>{if(!back.disabled)leave();});
  return {
    offer,enter,leave,
    project:projectHome,
    get isOpen(){return !!opened;},
    get preview(){return preview;},
    get canReturn(){return !!opened&&!back.disabled;},
    handOverCard(over){handOver=over;card.classList.toggle('is-hand-hover',over);if(over)hideAt=0;else offer(null);},
    handOverBack(over){back.classList.toggle('is-hand-hover',over&&!back.disabled);},
    update(now=performance.now()){
      if(opened){
        if(now-enteredAt>=returnDelay&&back.disabled){back.hidden=false;back.disabled=false;requestAnimationFrame(()=>{if(opened&&!back.disabled){back.classList.add('is-visible');adaptiveContrast.update();}});}
        return;
      }
      if(preview){if(hideAt&&now>=hideAt&&!mouseOver&&!handOver)hideCard();else positionCard();}
    },
    dispose(){observer.disconnect();artObserver.disconnect();adaptiveContrast.dispose();for(const image of previewImages){image.removeEventListener('load',updatePreviewReadiness);image.removeEventListener('error',updatePreviewReadiness);}}
  };
}
