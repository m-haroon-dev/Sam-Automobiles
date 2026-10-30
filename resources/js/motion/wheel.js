/*
 * SAM vehicle wheel — adapted from ThreeUI Character Carousel / Wave.
 * Original: https://github.com/MengTo/threeui/blob/main/src/shaders/character-carousel/sources/character-wave.html
 * Copyright (c) 2026 Meng To. MIT License; retain accompanying LICENSE.
 *
 * Retains the authored cyclic phase wrapping, Gaussian focal weighting,
 * time-based easing. Wave's linear placement is adapted to a closed
 * elliptical orbit so each vehicle visibly rotates through the front.
 * SAM adaptations: transparent model car images, cursor-follow, scoped keyboard, drag + snap, no idle
 * autoplay, no orientation toggling, no blur, no grain or colored tiles,
 * no global scroll/keyboard capture, render only while moving, full cleanup.
 */

// Opaque tyre line and aspect ratio of each existing phone cutout. These
// optical anchors account for transparent padding without altering the images.
const phoneTyreLines = {
  'mercedes-s580e-l-2022': [640/427,382/427],
  'mercedes-amg-g63-model': [640/427,381/427],
  'porsche-taycan-2022': [2,301/320],
  'bmw-ix3-2022': [640/427,407/427],
  'lexus-lx570-2020': [640/427,414/427],
  'toyota-land-cruiser-2023': [640/427,398/427]
};

// Exact opaque tyre lines in the existing 1000px responsive tablet cutouts.
const tabletTyreLines = {
  'mercedes-s580e-l-2022': [1000/667,597/667],
  'mercedes-amg-g63-model': [1000/667,595/667],
  'porsche-taycan-2022': [2,471/500],
  'bmw-ix3-2022': [1000/667,637/667],
  'lexus-lx570-2020': [1000/667,646/667],
  'toyota-land-cruiser-2023': [1000/667,622/667]
};

export function initVehicleWheel(root, { onSelect, initialIndex = 0, motion = true } = {}) {
  const stage = root.querySelector('.wheel-stage');
  const cards = [...root.querySelectorAll('.wheel-card')];
  const previous = root.querySelector('[data-wheel-prev]');
  const next = root.querySelector('[data-wheel-next]');
  if (!stage || !cards.length) return { select() {}, destroy() {} };

  const count = cards.length;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
  const touchLayoutMedia = window.matchMedia('(max-width:767px), (max-width:1199px) and (pointer:coarse)');
  const normalize = index => ((index % count) + count) % count;
  const start = Math.min(count - 1, Math.max(0, Math.round(initialIndex)));
  const state = { phase: start, targetPhase: start, basePhase: start };
  const listeners = [];
  let frame = 0;
  let previousTime = performance.now();
  let activeIndex = -1;
  let destroyed = false;
  let visible = true;
  let drag = null;
  let hover = null;
  let settle = null;
  let suppressClickUntil = 0;
  let wheelTimer = 0;
  let geometry;
  const rendered = cards.map(() => ({}));
  function style(card,index,key,value) {
    if(rendered[index][key] === value) return;
    rendered[index][key] = value;
    if(key.startsWith("--"))card.style.setProperty(key,value);else card.style[key]=value;
  }

  stage.tabIndex = stage.hasAttribute('tabindex') ? stage.tabIndex : 0;
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-roledescription', 'carousel');
  if (!stage.hasAttribute('aria-label')) stage.setAttribute('aria-label', 'Vehicle selection. Move your pointer, use left and right arrow keys, or swipe.');
  stage.style.touchAction = 'pan-y pinch-zoom';

  function listen(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    listeners.push(() => target.removeEventListener(name, listener, options));
  }

  // Exact authored ThreeUI phase wrapping.
  function wrappedDelta(index, phase) {
    let delta = index - phase;
    while (delta > count / 2) delta -= count;
    while (delta < -count / 2) delta += count;
    return delta;
  }

  function nearestIndex() { return normalize(Math.round(state.phase)); }

  function notifySelection(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    cards.forEach((card, cardIndex) => {
      card.setAttribute('aria-current', cardIndex === index ? 'true' : 'false');
      card.tabIndex = cardIndex === index ? 0 : -1;
    });
    onSelect?.(cards[index], index);
  }

  function measure() {
    const width=stage.clientWidth,height=stage.clientHeight,phone=window.matchMedia('(max-width:767px)').matches,mobile=touchLayoutMedia.matches;
    if(geometry && drag && (width!==geometry.width || height!==geometry.height))finishDrag({pointerId:drag.id,type:'pointercancel'});
    let tyreOffsets=[];
    if(mobile){
      const box=getComputedStyle(cards[0]);
      const cardWidth=parseFloat(box.width),cardHeight=parseFloat(box.height);
      tyreOffsets=cards.map(card=>{
        const image=card.querySelector('img');
        const [aspect,line]=(phone?phoneTyreLines:tabletTyreLines)[card.dataset.wheelId]||[image?.naturalWidth/image?.naturalHeight||1.5,.94];
        return Math.min(cardHeight,cardWidth/aspect)*(line-.5);
      });
    }
    geometry={width,height,mobile,tyreOffsets,
      radiusX:mobile?width*.46:Math.min(210,Math.max(72,width*.25)),
      radiusY:Math.min(64,Math.max(36,height*.13)),
      radiusZ:Math.min(mobile?64:110,Math.max(50,width*.15))};
    paint();
  }
  function paint() {
    if(!geometry)return;
    const {radiusX,radiusY,radiusZ,height,mobile,tyreOffsets}=geometry;
    const angleStep = Math.PI * 2 / count;
    const currentIndex = nearestIndex();
    cards.forEach((card, index) => {
      const delta = wrappedDelta(index, state.phase);
      const distance = Math.abs(delta);

      // The authored ThreeUI Gaussian still controls selection emphasis.
      const focus = Math.exp(-Math.pow(distance, 2) * 1.05);
      // SAM adaptation: closed elliptical wheel, front at angle zero.
      // Positive/negative sine carries plates around either side; cosine
      // supplies the stage arc, physical depth and a smaller rear tier.
      const angle = delta * angleStep;
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      const depth = (cosine + 1) / 2;
      const x = sine * radiusX;
      const z = mobile ? 0 : cosine * radiusZ;
      const scale = 0.44 + depth * 0.21 + focus * 0.35;
      // Touch cards and the oval share their CSS ground anchor. Keep the
      // scaled tyre line on that plane throughout the orbit; reads stay in
      // measure(), never in the animation loop. Desktop geometry is retained.
      const y = (cosine - 1) * radiusY + (mobile ? -tyreOffsets[index]*scale : height*.085);
      const rotateY = mobile ? 0 : -sine * 12;

      const visibility = mobile ? Math.max(0,Math.min(1,(1.75-distance)/.75)) : 1;
      if(!mobile){style(card,index,'--focus',focus.toFixed(4));style(card,index,'--wheel-depth',depth.toFixed(4));}
      style(card,index,'zIndex',String(mobile?(index===currentIndex?3:distance<1.75?2:1):Math.round(depth*1000)));
      style(card,index,'opacity',((.42+depth*.4+focus*.18)*visibility).toFixed(4));
      style(card,index,'visibility',visibility>.001?'visible':'hidden');
      if(visibility>.001||rendered[index].wasVisible)style(card,index,'transform',[
        'translate(-50%, -50%)',
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px)`,
        ...(mobile?[]:[`rotateY(${rotateY.toFixed(2)}deg)`,'rotateZ(0deg)']),
        `scale(${scale.toFixed(4)})`
      ].join(' '));
      rendered[index].wasVisible=visibility>.001;
      // Only transparent car silhouettes overlap. The caption is outside this stage.
      style(card,index,'pointerEvents',depth>=.25&&visibility>.001?'auto':'none');
    });
    notifySelection(currentIndex);
  }

  function render(time) {
    frame = 0;
    if (destroyed) return;
    const deltaTime = Math.min(32, time - previousTime);
    previousTime = time;
    if(settle){
      // A finite, velocity-matched curve avoids the old sub-pixel easing tail.
      // RAF timestamps preserve the same duration on 60Hz and 120Hz displays.
      const t=Math.max(0,Math.min(1,(time-settle.start)/settle.duration));
      const eased=t*t*(3-2*t)+settle.slope*t*(1-t)*(1-t);
      state.phase=settle.from+(settle.to-settle.from)*eased;
      if(t===1){state.phase=state.targetPhase;settle=null;}
    }else{
      const ease = !motion || media.matches ? 1 : 1 - Math.exp(-14 * deltaTime / 1000);
      state.phase += (state.targetPhase - state.phase) * ease;
      if (Math.abs(state.targetPhase - state.phase) < 0.0005) state.phase = state.targetPhase;
    }
    paint();
    if (state.phase !== state.targetPhase && visible && !document.hidden) frame = requestAnimationFrame(render);
  }

  function requestPaint() {
    if (destroyed) return;
    if (!motion || media.matches) {
      settle = null;
      state.phase = state.targetPhase;
      paint();
      return;
    }
    if (!frame && visible && !document.hidden) {
      previousTime = performance.now();
      frame = requestAnimationFrame(render);
    }
  }

  function settleTo(target,velocity=null){
    state.basePhase=state.targetPhase=target;
    const distance=target-state.phase;
    settle=null;
    if(geometry?.mobile && motion && !media.matches && Math.abs(distance)>.0005){
      const duration=Math.min(340,220+Math.abs(distance)*100);
      // A monotone Hermite curve carries the release speed into the snap,
      // arrives at zero velocity, and never overshoots the chosen car.
      const slope=velocity===null?2:Math.max(0,Math.min(2.8,velocity*duration/1000/distance));
      settle={from:state.phase,to:target,start:performance.now(),duration,slope};
    }
    requestPaint();
  }

  function select(index) {
    if (destroyed || !Number.isFinite(index)) return;
    if(wheelTimer){window.clearTimeout(wheelTimer);wheelTimer=0;}
    const current = normalize(Math.round(state.basePhase));
    let delta = normalize(Math.round(index)) - current;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    settleTo(state.basePhase+delta);
  }

  function step(direction) {
    if(wheelTimer){window.clearTimeout(wheelTimer);wheelTimer=0;}
    settleTo(Math.round(state.basePhase)+direction);
  }

  cards.forEach((card, index) => listen(card, 'click', event => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    select(index);
  }, true));
  if (previous) listen(previous, 'click', () => step(-1));
  if (next) listen(next, 'click', () => step(1));

  listen(stage, 'keydown', event => {
    if (event.target !== stage && !event.target.closest('.wheel-card')) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    hover = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      select(event.key === 'Home' ? 0 : count - 1);
    }
  });

  listen(stage, 'pointerenter', event => {
    if (!hoverMedia.matches || event.pointerType === 'touch' || drag) return;
    hover = { x: event.clientX, phase: state.targetPhase };
  });
  function settleHover() {
    if (!hover) return;
    hover = null;
    if (drag) return;
    settleTo(Math.round(state.targetPhase));
  }
  listen(stage, 'pointerleave', settleHover);
  listen(hoverMedia, 'change', () => { if (!hoverMedia.matches) settleHover(); });

  listen(stage, 'pointerdown', event => {
    if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if(wheelTimer){window.clearTimeout(wheelTimer);wheelTimer=0;}
    // Take ownership at the currently drawn position. An unfinished snap must
    // not keep moving underneath a new finger or jump back on its first move.
    if(frame){cancelAnimationFrame(frame);frame=0;}
    settle=null;
    state.targetPhase=state.basePhase=state.phase;
    hover = null;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, phase: state.phase, moved: false, vertical: false,
      samples:[{phase:state.phase,time:event.timeStamp}] };
  });
  listen(stage, 'pointermove', event => {
    if (!drag) {
      if (!hoverMedia.matches || event.pointerType === 'touch' || event.isPrimary === false) return;
      if (!hover) hover = { x: event.clientX, phase: state.phase };
      settle=null;
      const pixelsPerCar = Math.max(65, geometry.width / count);
      state.targetPhase = hover.phase - (event.clientX - hover.x) / pixelsPerCar;
      state.basePhase = Math.round(state.targetPhase);
      requestPaint();
      return;
    }
    if (drag.id !== event.pointerId || drag.vertical) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      drag.vertical = true;
      return;
    }
    if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      drag.moved = true;
      stage.setPointerCapture?.(event.pointerId);
      stage.classList.add('is-dragging');
    }
    if (!drag.moved) return;
    state.targetPhase = drag.phase - dx / Math.max(90, geometry.width * .28);
    const samples=drag.samples;
    samples.push({phase:state.targetPhase,time:event.timeStamp});
    while(samples.length>2 && samples[1].time<event.timeStamp-90)samples.shift();
    // Direct manipulation follows the finger, including reduced motion. Only
    // the release snap/hover has easing; no animation chases a held gesture.
    state.phase = state.targetPhase;
    requestPaint();
  // touch-action owns horizontal intent; a passive move listener keeps native
  // vertical scrolling and pinch zoom out of the animation's critical path.
  }, {passive:true});
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const {moved,phase,samples}=drag;
    const first=samples[0],last=samples.at(-1);
    const recent=event.type==='pointerup' && event.timeStamp-last.time<110;
    const velocity=recent?(last.phase-first.phase)/Math.max(16,last.time-first.time)*1000:0;
    drag = null;
    stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!moved) {settleTo(Math.round(state.phase));return;}
    suppressClickUntil = performance.now() + 350;
    // A short, deliberate flick advances without flinging past several cars.
    // Holding before release and system-cancelled gestures discard momentum.
    const momentum=recent && Math.abs(velocity)>.55 && Math.abs(state.phase-phase)>.12
      ?Math.max(-.45,Math.min(.45,velocity*.18)):0;
    settleTo(Math.round(state.phase+momentum),velocity);
  }
  listen(stage, 'pointerup', finishDrag);
  listen(stage, 'pointercancel', finishDrag);
  listen(window,'pointerup',finishDrag);
  listen(stage,'dragstart',event=>event.preventDefault());
  listen(stage, 'lostpointercapture', event => {
    // A touched car has implicit capture. Its bubbling loss when capture moves
    // to the stage is a transfer, not the end of the user's swipe.
    if(event.target===stage && !stage.hasPointerCapture?.(event.pointerId))finishDrag(event);
  });
  listen(stage,'wheel',event=>{
    if(drag||event.ctrlKey||event.metaKey||count<2)return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?geometry.width:1;
    const dx=(event.shiftKey&&!event.deltaX?event.deltaY:event.deltaX)*unit;
    const dy=event.shiftKey?0:event.deltaY*unit;
    if(Math.abs(dx)<.5||Math.abs(dx)<=Math.abs(dy)*1.15)return;
    if(event.cancelable)event.preventDefault();
    hover=null;
    settle=null;
    state.phase+=dx/Math.max(90,geometry.width*.28);
    state.targetPhase=state.basePhase=state.phase;
    requestPaint();
    if(wheelTimer)window.clearTimeout(wheelTimer);
    wheelTimer=window.setTimeout(()=>{
      wheelTimer=0;settleTo(Math.round(state.phase));
    },110);
  },{passive:false});

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) requestPaint();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  intersectionObserver.observe(stage);
  listen(document, 'visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else requestPaint();
  });
  listen(media, 'change', requestPaint);
  listen(touchLayoutMedia, 'change', measure);
  cards.forEach(card=>card.querySelector('img')?.decode?.().catch(()=>{}));
  measure();

  return {
    select,
    destroy() {
      destroyed = true;
      if(wheelTimer)window.clearTimeout(wheelTimer);
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      listeners.forEach(remove => remove());
      stage.classList.remove('is-dragging');
      cards.forEach(card => {
        card.style.removeProperty('--focus');
        card.style.removeProperty('--wheel-depth');
        ['transform', 'z-index', 'opacity', 'pointer-events', 'visibility'].forEach(property => card.style.removeProperty(property));
      });
    }
  };
}
