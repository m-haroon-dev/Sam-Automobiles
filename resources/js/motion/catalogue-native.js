// Phone scrolling belongs to the browser compositor, not a JS drag timeline.
// JavaScript only updates the nearest card and the accessible controls.
export function initNativeCatalogue(root,{win=window}={}){
 const viewport=root.querySelector('[data-catalogue-viewport]');
 const cards=[...root.querySelectorAll('[data-catalogue-car]')];
 const contents=cards.map(c=>c.querySelector('[data-stage-content]'));
 const selectors=cards.map(c=>c.querySelector('[data-stage-select]'));
 const controls=root.querySelector('[data-stage-controls]');
 const previous=root.querySelector('[data-stage-prev]'),next=root.querySelector('[data-stage-next]');
 const current=root.querySelector('[data-stage-current]'),total=root.querySelector('[data-stage-total]');
 const bar=root.querySelector('[data-stage-progress]'),fill=root.querySelector('[data-stage-fill]');
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 const cleanup=[];let active=-1,pendingIndex=null,viewportWidth=0,centres=[],frame=0,destroyed=false;
 const listen=(node,event,fn,options)=>{node?.addEventListener(event,fn,options);cleanup.push(()=>node?.removeEventListener(event,fn,options));};
 function update(index){
  if(index===active||destroyed)return;
  const focused=root.ownerDocument.activeElement;
  if(cards.some((c,i)=>i!==index&&c.contains(focused)))root.focus({preventScroll:true});
  active=index;
  cards.forEach((card,i)=>{
   card.classList.toggle('is-centre',i===active);
   contents[i].inert=i!==active;
   contents[i].setAttribute('aria-hidden',String(i!==active));
   // Every photograph stays in the native scroll rail. Adjacent covers have
   // a simple selection target; the selected cover opens its real listing.
   selectors[i].hidden=i===active;
   selectors[i].tabIndex=Math.abs(i-active)===1?0:-1;
  });
  // taste-skill-ignore: real carousel position and total, not decorative section indices.
  current.textContent=String(index+1).padStart(2,'0');total.textContent=String(cards.length).padStart(2,'0');
  bar.setAttribute('aria-valuenow',String(index+1));bar.setAttribute('aria-valuemax',String(cards.length));
  fill.style.transform=`scaleX(${(index+1)/cards.length})`;
  root.dataset.activeCar=cards[index].dataset.catalogueCar;
 }
 function nearest(){
  frame=0;if(destroyed||!centres.length)return;
  const left=viewport.scrollLeft;
  let index=0;for(let i=1;i<centres.length;i++)if(Math.abs(centres[i]-left)<Math.abs(centres[index]-left))index=i;
  if(index===pendingIndex&&Math.abs(centres[index]-left)<2)pendingIndex=null;
  update(index);
 }
 function scroll(){if(!frame)frame=win.requestAnimationFrame(nearest);}
 function layout(){
  if(destroyed)return;
  const width=viewport.clientWidth;
  if(viewportWidth!==width){pendingIndex=null;viewportWidth=width;}
  // Only resize reads layout; scroll handling reads a cached list and scrollLeft.
  centres=cards.map(card=>card.offsetLeft-(width-card.offsetWidth)/2);
  nearest();
 }
 function select(index,{animate=true}={}){
  if(!centres.length||!Number.isFinite(index))return;
  const selected=((Math.round(index)%cards.length)+cards.length)%cards.length;
  pendingIndex=selected;
  viewport.scrollTo({left:centres[selected],behavior:animate&&!reduced.matches?'smooth':'instant'});
  if(!animate||reduced.matches){pendingIndex=null;update(selected);}
 }
 listen(viewport,'scroll',scroll,{passive:true});
 listen(viewport,'scrollend',nearest,{passive:true});
 // Keep rapid button/keyboard intent separate from the visual centre while a
 // native smooth scroll is still travelling. Touch and wheel input take over.
 listen(previous,'click',()=>select((pendingIndex??active)-1));listen(next,'click',()=>select((pendingIndex??active)+1));
 listen(viewport,'pointerdown',()=>{pendingIndex=null;},{passive:true});
 listen(viewport,'wheel',()=>{pendingIndex=null;},{passive:true});
 selectors.forEach((button,index)=>listen(button,'click',()=>select(index)));
 listen(root,'keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select'))return;
  const base=pendingIndex??active;
  const index=event.key==='ArrowRight'?base+1:event.key==='ArrowLeft'?base-1:event.key==='Home'?0:event.key==='End'?cards.length-1:null;
  if(index!==null){event.preventDefault();select(index);}
 });
 root.classList.add('is-enhanced','is-native');root.dataset.autoplay='off';root.dataset.scrollEngine='native';
 controls.hidden=false;previous.disabled=next.disabled=cards.length<2;
 const resize=new win.ResizeObserver(layout);resize.observe(viewport);layout();
 root.ownerDocument.fonts?.ready.then(()=>{if(!destroyed)layout();});
 return {select,get activeIndex(){return active;},destroy(){destroyed=true;resize.disconnect();if(frame)win.cancelAnimationFrame(frame);cleanup.forEach(fn=>fn());root.classList.remove('is-enhanced','is-native');delete root.dataset.scrollEngine;delete root.dataset.activeCar;controls.hidden=true;cards.forEach((card,i)=>{contents[i].inert=false;contents[i].removeAttribute('aria-hidden');selectors[i].hidden=true;});}};
}
