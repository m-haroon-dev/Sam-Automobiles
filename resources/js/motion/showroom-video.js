// The original scene is prerendered at 60 fps. Native video handles movement;
// this controller does chapter selection, visibility and accessible links only.
export function initVehicleWheel(root,{onSelect,initialIndex=0,motion=true}={}){
 const stage=root.querySelector('[data-road-stage]'),video=root.querySelector('[data-showroom-motion]');
 const cards=[...stage.querySelectorAll('[data-wheel-id]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const phone=matchMedia('(max-width:767px)');
 const seconds=7,cleanup=[];let active=-1,visible=true,focused=false,destroyed=false,blocked=false,gesture=null,pendingSeek=null,suppressUntil=0;
 const normalize=i=>((i%cards.length)+cards.length)%cards.length;
 const animate=()=>motion&&!reduced.matches&&!navigator.connection?.saveData&&!blocked;
 const listen=(target,event,fn,options)=>{target?.addEventListener?.(event,fn,options);cleanup.push(()=>target?.removeEventListener?.(event,fn,options));};
 function show(index){
  index=normalize(index);if(index===active)return;
  active=index;cards.forEach((card,i)=>{card.hidden=i!==index;card.tabIndex=i===index?0:-1;card.setAttribute('aria-hidden',String(i!==index));});
  stage.dataset.roadIndex=String(index);if(!video.getAttribute('src')||!animate())video.poster=`/assets/showroom-motion/${cards[index].dataset.wheelId}.webp`;
  onSelect?.(cards[index],index);
 }
 function sync(){
  if(!animate()){
   video.pause();stage.dataset.roadPlaying='false';stage.dataset.videoState='still';
   video.poster=`/assets/showroom-motion/${cards[active].dataset.wheelId}.webp`;
   if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}
   return;
  }
  const running=!destroyed&&visible&&!document.hidden&&!focused;
  if(!running){video.pause();stage.dataset.roadPlaying='false';return;}
  if(!video.getAttribute('src'))video.src=phone.matches?video.dataset.phoneSrc:video.dataset.desktopSrc;
  const promise=video.play();promise?.catch(error=>{
   if(error.name==='AbortError')return; // Scrolling offscreen may cancel pending play; resume later.
   // iOS Low Power Mode can refuse autoplay. Keep a useful, selectable still.
   if(destroyed)return;blocked=true;stage.dataset.roadPlaying='false';stage.dataset.videoState='still';video.poster=`/assets/showroom-motion/${cards[active].dataset.wheelId}.webp`;video.removeAttribute('src');video.load();
  });
 }
 function chapter(){if(!animate()){sync();return;}if(!video.seeking&&Number.isFinite(video.currentTime))show(Math.min(cards.length-1,Math.floor(video.currentTime/seconds)));}
 function select(index){
  if(!Number.isFinite(index)||destroyed)return;
  index=normalize(Math.round(index));show(index);
  if(animate()){
   pendingSeek=index*seconds+.001;
   if(video.readyState>=1){video.currentTime=pendingSeek;pendingSeek=null;}
   sync();
  }
 }
 listen(video,'loadedmetadata',()=>{if(pendingSeek!==null){video.currentTime=pendingSeek;pendingSeek=null;}});
 listen(video,'loadeddata',()=>{stage.dataset.videoState='ready';sync();});
 listen(video,'timeupdate',chapter);
 listen(video,'playing',()=>{stage.dataset.roadPlaying='true';stage.dataset.videoState='playing';});
 listen(video,'pause',()=>{stage.dataset.roadPlaying='false';});
 listen(video,'error',()=>{blocked=true;stage.dataset.roadPlaying='false';stage.dataset.videoState='still';video.poster=`/assets/showroom-motion/${cards[active].dataset.wheelId}.webp`;video.removeAttribute('src');video.load();});
 listen(root.querySelector('[data-wheel-prev]'),'click',()=>select(active-1));
 listen(root.querySelector('[data-wheel-next]'),'click',()=>select(active+1));
 listen(stage,'keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();select(active+(event.key==='ArrowRight'?1:-1));cards[active].focus({preventScroll:true});}});
 listen(stage,'dragstart',event=>event.preventDefault());
 listen(stage,'pointerdown',event=>{if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false,vertical:false};});
 listen(stage,'pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id||gesture.vertical)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.horizontal){if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)){gesture.vertical=true;return;}if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.2)return;gesture.horizontal=true;stage.setPointerCapture?.(event.pointerId);}
  gesture.dx=dx;if(event.cancelable)event.preventDefault();
 },{passive:false});
 const finish=event=>{if(!gesture||gesture.id!==event.pointerId)return;const g=gesture;gesture=null;if(g.horizontal){suppressUntil=performance.now()+450;if(Math.abs(g.dx)>36)select(active+(g.dx<0?1:-1));}if(stage.hasPointerCapture?.(g.id))stage.releasePointerCapture(g.id);};
 listen(window,'pointerup',finish);listen(stage,'pointercancel',()=>{gesture=null;});
 listen(stage,'click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopPropagation();}},true);
 listen(root,'focusin',event=>{focused=Boolean(event.target.matches?.(':focus-visible'));sync();});
 listen(root,'focusout',event=>{focused=Boolean(event.relatedTarget?.matches?.(':focus-visible')&&root.contains(event.relatedTarget));sync();});
 listen(document,'visibilitychange',sync);
 listen(navigator.connection,'change',sync);
 listen(reduced,'change',()=>{
  if(reduced.matches){video.poster=`/assets/showroom-motion/${cards[active].dataset.wheelId}.webp`;video.pause();video.removeAttribute('src');video.load();stage.dataset.videoState='still';}
  else blocked=false;
  sync();
 });
 const observer=new IntersectionObserver(([entry])=>{visible=Boolean(entry?.isIntersecting);sync();},{threshold:0});observer.observe(stage);
 stage.dataset.roadInterval=String(seconds*1000);stage.dataset.videoState='poster';stage.dataset.roadPlaying='false';
 show(initialIndex);sync();
 return {select,destroy(){destroyed=true;video.pause();observer.disconnect();cleanup.forEach(fn=>fn());video.removeAttribute('src');video.load();}};
}
