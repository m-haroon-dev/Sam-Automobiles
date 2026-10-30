import {initNativeCatalogue} from './catalogue-native.js';
export const CATALOGUE_DURATION = 0.6;
const modulo = (value, count) => ((value % count) + count) % count;
export function slideDistance(index, active, count) {
  if (count < 2) return 0;
  const distance = modulo(index - active, count);
  return distance > count / 2 ? distance - count : distance;
}
export function catalogueLayout(width, mobile = width < 768) {
  const sideScale = mobile ? .74 : .68;
  const gap = mobile ? 12 : 28;
  // Wide screens have room for complete neighbours, including their names.
  // Smaller viewports retain the familiar photographic swipe peeks.
  const cardWidth = mobile ? width * .82 : width >= 1100 ? Math.min(600,(width-2*gap)/(1+2*sideScale)) : Math.min(600,width*.56);
  return {mobile, cardWidth, sideScale, stride: cardWidth * (1 + sideScale) / 2 + gap};
}

export function initCatalogueCarousel(root, {win = window, gsap = win.gsap} = {}) {
  if(win.navigator&&win.matchMedia('(pointer: coarse)').matches)return initNativeCatalogue(root,{win});
  const viewport = root.querySelector('[data-catalogue-viewport]');
  const cards = [...root.querySelectorAll('[data-catalogue-car]')];
  const noop = {select() {}, destroy() {}, get activeIndex() { return 0; }};
  if (!viewport || !cards.length || !gsap || !win.ResizeObserver) return noop;
  const doc = root.ownerDocument;
  const media = win.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = root.querySelector('[data-stage-controls]');
  const current = root.querySelector('[data-stage-current]');
  const total = root.querySelector('[data-stage-total]');
  const progressBar = root.querySelector('[data-stage-progress]');
  const progressFill = root.querySelector('[data-stage-fill]');
  const prev = root.querySelector('[data-stage-prev]');
  const next = root.querySelector('[data-stage-next]');
  const contents = cards.map(card => card.querySelector('[data-stage-content]'));
  const selectors = cards.map(card => card.querySelector('[data-stage-select]'));
  // One continuous rail position drives every card. Input never translates a
  // fixed group of three photos or resets it at the end of a gesture.
  const rail = {value: 0}, progress = {value: 1 / cards.length};
  const rendered = cards.map(() => ({}));
  let active = 0, metrics, width = 0, height = 0, animation = null;
  let pointer = null, suppressUntil = 0, destroyed = false, visualCentre = -1;
  let frame = 0, layoutFrame = 0, wheel = null, wheelTimer = 0, renderedProgress = '';
  let nearViewport = !win.IntersectionObserver;
  const cleanup = [];
  function listen(target, event, handler, options) {
    target?.addEventListener(event, handler, options);
    cleanup.push(() => target?.removeEventListener(event, handler, options));
  }
  // These are only the nine featured cover photos, not detail galleries. Eager,
  // low-priority responsive requests start in HTML; decode hidden cards as well
  // so a fast swipe never waits for a photo to become visible before fetching.
  cards.forEach(card => {
    const image = card.querySelector('img');
    if (image?.tagName !== 'IMG') return;
    image.loading = 'eager';
    image.decode?.().catch(() => {});
  });
  function retainVisibleLayers() {
    cards.forEach((card, index) => {
      const keep = nearViewport && !media.matches && Math.abs(slideDistance(index, rail.value, cards.length)) < 2;
      if (rendered[index].layer === keep) return;
      if (keep) card.style.willChange = 'transform, opacity';
      else card.style.removeProperty('will-change');
      rendered[index].layer = keep;
    });
  }
  function schedulePaint() {
    if (frame) return;
    if (!win.requestAnimationFrame) { paint(); return; }
    frame = win.requestAnimationFrame(() => { frame = 0; if (!destroyed) paint(); });
  }
  function cancelFrame() { if (frame) { win.cancelAnimationFrame?.(frame); frame = 0; } }
  function stopAnimation() {
    cancelFrame(); animation?.kill(); animation = null;
    root.removeAttribute('data-transitioning');
  }
  function releaseWheel() {
    if (wheelTimer) { if (win.clearTimeout) win.clearTimeout(wheelTimer); else clearTimeout(wheelTimer); }
    wheelTimer = 0; wheel = null; root.classList.remove('is-wheeling');
  }
  function finishGesture(start, pixels, threshold) {
    const base = Math.round(start), desired = start + pixels / metrics.stride;
    let target = Math.round(desired);
    if (Math.abs(pixels) < threshold) target = base;
    else target = pixels > 0 ? Math.max(Math.floor(start + .000001) + 1, target) : Math.min(Math.ceil(start - .000001) - 1, target);
    const duration = Math.min(.42, .18 + Math.abs(target - rail.value) * .24);
    select(target, {duration});
  }
  function finishWheel() {
    if (!wheel || destroyed) return;
    const {start, dx} = wheel; releaseWheel();
    suppressUntil = Date.now() + 350;
    finishGesture(start, dx, Math.max(32, metrics.cardWidth * .1));
  }
  function paint() {
    const nearest = modulo(Math.round(rail.value), cards.length);
    if (nearest !== visualCentre) {
      visualCentre = nearest;
      cards.forEach((card,index) => {
        card.classList.toggle('is-centre', index === nearest);
        card.style.zIndex = index === nearest ? '2' : '1';
      });
    }
    cards.forEach((card, index) => {
      const distance = slideDistance(index, rail.value, cards.length), magnitude = Math.abs(distance);
      const focus = Math.max(0, 1 - magnitude), scale = metrics.sideScale + (1 - metrics.sideScale) * focus;
      const opacity = magnitude <= 1 ? .44 + .56 * focus : .44 * Math.max(0, 2 - magnitude);
      const visible = opacity > .001, cache = rendered[index];
      if (visible || cache.visible) {
        const y = metrics.cardWidth * .75 * (1 - scale) / 2;
        const transform = `translateX(-50%) translate3d(${(distance * metrics.stride).toFixed(3)}px,${y.toFixed(3)}px,0) scale(${scale.toFixed(4)})`;
        if (cache.transform !== transform) { card.style.transform = transform; cache.transform = transform; }
      }
      const alpha = opacity.toFixed(4);
      if (cache.opacity !== alpha) { card.style.opacity = alpha; cache.opacity = alpha; }
      if (cache.visible !== visible) { card.style.visibility = visible ? 'visible' : 'hidden'; cache.visible = visible; }
    });
    retainVisibleLayers();
    const fill = `scaleX(${progress.value.toFixed(5)})`;
    if (renderedProgress !== fill) { progressFill.style.transform = fill; renderedProgress = fill; }
  }
  function accessibility() {
    cards.forEach((card, index) => {
      const distance = Math.abs(slideDistance(index, active, cards.length));
      card.inert = distance > 1;
      card.setAttribute('aria-hidden', String(distance > 1));
      contents[index].inert = index !== active;
      contents[index].setAttribute('aria-hidden', String(index !== active));
      selectors[index].hidden = index === active || distance > 1;
      selectors[index].tabIndex = distance === 1 ? 0 : -1;
      card.style.pointerEvents = distance <= 1 ? 'auto' : 'none';
    });
    current.textContent = String(active + 1).padStart(2, '0');
    total.textContent = String(cards.length).padStart(2, '0');
    progressBar.setAttribute('aria-valuenow', String(active + 1));
    progressBar.setAttribute('aria-valuemax', String(cards.length));
    root.dataset.activeCar = cards[active].dataset.catalogueCar;
  }
  function settle(animate = true, duration = CATALOGUE_DURATION) {
    if (!metrics) return;
    stopAnimation();
    const target = rail.value + slideDistance(active, rail.value, cards.length);
    accessibility();
    if (animate && !media.matches && Math.abs(target - rail.value) > .0001) {
      animation = gsap.timeline({paused: true, onUpdate: paint, onComplete() {
        // Equivalent wrapped coordinates keep the rail bounded without moving
        // a visible card. There is no per-card reset at either end of the list.
        rail.value = active; paint();
        root.removeAttribute('data-transitioning');
      }});
      root.setAttribute('data-transitioning', 'true');
      animation.to(rail, {value: target, duration, ease: 'power3.out'}, 0);
      animation.to(progress, {value: (active + 1) / cards.length, duration, ease: 'power3.out'}, 0);
      animation.play();
    } else {
      rail.value = active; progress.value = (active + 1) / cards.length;
      root.removeAttribute('data-transitioning'); paint();
    }
  }
  function select(index, {animate = true, duration = CATALOGUE_DURATION} = {}) {
    if (destroyed || !metrics || !Number.isFinite(index)) return;
    releaseWheel();
    active = modulo(Math.round(index), cards.length);
    // Keep focus outside any content or side button that is about to be hidden.
    const focused = doc.activeElement;
    if (focused && cards.some((card, i) => card.contains(focused) &&
      (Math.abs(slideDistance(i, active, cards.length)) > 1 ||
       (i !== active && contents[i].contains(focused)) || (i === active && selectors[i] === focused)))) root.focus({preventScroll: true});
    settle(animate, duration);
  }
  function releasePointer() {
    const id = pointer?.id;
    pointer = null; root.classList.remove('is-dragging');
    if (id != null && viewport.hasPointerCapture?.(id)) viewport.releasePointerCapture(id);
  }
  function cancelDrag(event) {
    if (!pointer || (event?.pointerId != null && event.pointerId !== pointer.id)) return;
    const moved = pointer.horizontal;
    releasePointer();
    if (moved) { suppressUntil = Date.now() + 450; settle(); }
  }
  function layout() {
    if (destroyed || viewport.clientWidth <= 0) return;
    const changed = width !== viewport.clientWidth;
    width = viewport.clientWidth; metrics = catalogueLayout(width, win.matchMedia('(max-width: 767px)').matches);
    root.style.setProperty('--stage-card-width', `${metrics.cardWidth}px`);
    const nextHeight = Math.ceil(Math.max(...cards.map(card => card.offsetHeight)) + 58);
    if (nextHeight !== height) { height = nextHeight; viewport.style.height = `${height}px`; }
    if (changed) { releasePointer(); releaseWheel(); settle(false); }
  }
  // Resizing changes the card width and then the measured rail height. Batch
  // those writes outside ResizeObserver delivery to avoid a Safari feedback loop.
  function scheduleLayout() {
    if (destroyed || layoutFrame) return;
    if (!win.requestAnimationFrame) { layout(); return; }
    layoutFrame = win.requestAnimationFrame(() => { layoutFrame = 0; if (!destroyed) layout(); });
  }
  listen(prev, 'click', () => select(active - 1));
  listen(next, 'click', () => select(active + 1));
  selectors.forEach((button, index) => listen(button, 'click', () => {
    if (doc.activeElement === button) root.focus({preventScroll: true});
    select(index);
  }));
  listen(root, 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    const index = event.key === 'ArrowRight' ? active + 1 : event.key === 'ArrowLeft' ? active - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : null;
    if (index != null) { event.preventDefault(); select(index); }
  });
  listen(viewport, 'dragstart', event => event.preventDefault());
  listen(viewport, 'pointerdown', event => {
    if (!metrics || (event.pointerType === 'mouse' && event.button !== 0) || event.isPrimary === false || cards.length < 2) return;
    if (wheel) finishWheel();
    suppressUntil = 0;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, start: rail.value, horizontal: false, vertical: false};
  });
  listen(viewport, 'pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId || pointer.vertical) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) { cancelDrag(event); return; }
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.horizontal) {
      if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) { pointer.vertical = true; return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      pointer.horizontal = true; stopAnimation(); pointer.start = rail.value;
      viewport.setPointerCapture?.(event.pointerId); root.classList.add('is-dragging');
    }
    pointer.dx = dx;
    if (event.cancelable) event.preventDefault();
    rail.value = pointer.start - dx / metrics.stride; schedulePaint();
  }, {passive: false});
  function finishPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const {horizontal, dx, start} = pointer;
    releasePointer();
    if (!horizontal) return;
    suppressUntil = Date.now() + 450;
    finishGesture(start, -dx, Math.max(36, metrics.cardWidth * .12));
  }
  listen(viewport, 'pointerup', finishPointer);
  listen(win, 'pointerup', finishPointer);
  listen(win, 'blur', cancelDrag);
  listen(viewport, 'pointercancel', cancelDrag);
  listen(viewport, 'lostpointercapture', event => {
    // Touch images receive implicit capture. Moving capture to the viewport
    // emits a bubbling lostpointercapture on that image; it is not a cancelled
    // gesture. Only loss of our own capture should end a drag.
    if (event.target === viewport && !viewport.hasPointerCapture?.(event.pointerId)) cancelDrag(event);
  });
  listen(viewport, 'click', event => {
    if (Date.now() < suppressUntil && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  // Safari/Mac trackpad swipes arrive as WheelEvents, not PointerEvents.
  // Only consume clear horizontal intent; native vertical scrolling/pinch stay.
  listen(viewport, 'wheel', event => {
    if (!metrics || pointer || event.ctrlKey || event.metaKey || cards.length < 2) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width : 1;
    const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit;
    const dy = event.shiftKey ? 0 : event.deltaY * unit;
    if (Math.abs(dx) < .5 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    if (event.cancelable) event.preventDefault();
    if (!wheel) { stopAnimation(); wheel = {dx: 0, start: rail.value}; root.classList.add('is-wheeling'); }
    wheel.dx += dx;
    rail.value = wheel.start + wheel.dx / metrics.stride; schedulePaint();
    if (wheelTimer) { if (win.clearTimeout) win.clearTimeout(wheelTimer); else clearTimeout(wheelTimer); }
    wheelTimer = win.setTimeout ? win.setTimeout(finishWheel, 90) : setTimeout(finishWheel, 90);
  }, {passive: false});
  listen(media, 'change', () => { releasePointer(); releaseWheel(); settle(false); });
  const resize = new win.ResizeObserver(scheduleLayout);
  const proximity = win.IntersectionObserver ? new win.IntersectionObserver(entries=>{
    nearViewport=entries.some(entry=>entry.isIntersecting);retainVisibleLayers();
  },{rootMargin:'400px 0px'}) : null;
  // Retain the car a visitor reached with native scrolling before this module
  // loaded, then clear that scroll offset before switching to transforms.
  if(viewport.scrollLeft>0&&cards.length>1){
    const step=cards[1].offsetLeft-cards[0].offsetLeft;
    if(step>0){active=Math.max(0,Math.min(cards.length-1,Math.round(viewport.scrollLeft/step)));rail.value=active;progress.value=(active+1)/cards.length;}
  }
  root.classList.add('is-enhanced'); viewport.scrollLeft=0; root.dataset.autoplay = 'off';
  controls.hidden = false; prev.disabled = next.disabled = cards.length < 2;
  layout(); resize.observe(viewport); cards.forEach(card => resize.observe(card));
  proximity?.observe(root);
  doc.fonts?.ready?.then(scheduleLayout);
  return {
    select, get activeIndex() { return active; },
    destroy() {
      destroyed = true; cancelFrame(); if(layoutFrame)win.cancelAnimationFrame?.(layoutFrame); layoutFrame=0; releaseWheel(); animation?.kill(); releasePointer(); resize.disconnect(); proximity?.disconnect(); cleanup.forEach(remove => remove());
      root.classList.remove('is-enhanced'); root.style.removeProperty('--stage-card-width');
      root.removeAttribute('data-transitioning'); delete root.dataset.activeCar;
      controls.hidden = true; viewport.style.removeProperty('height');
      cards.forEach((card, index) => {
        card.inert = false; card.removeAttribute('aria-hidden'); contents[index].inert = false;
        contents[index].removeAttribute('aria-hidden'); selectors[index].hidden = true;
        card.classList.toggle('is-centre', index === 0);
        for (const property of ['transform','opacity','visibility','z-index','pointer-events','will-change']) card.style.removeProperty(property);
      });
    }
  };
}
