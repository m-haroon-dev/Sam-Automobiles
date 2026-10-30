// Keep the fixed enquiry link clear of comparison/enquiry bars and the hero's
// controls, including when scrolling or text zoom changes their positions.
export function contactLift(button, tray, gap = 12) {
  if (!tray || button.right <= tray.left - gap || button.left >= tray.right + gap || button.bottom <= tray.top - gap || button.top >= tray.bottom + gap) return 0;
  return Math.max(0, button.bottom - tray.top + gap);
}

export function initContactButton(doc = document, win = window) {
  const button = doc.querySelector('[data-whatsapp-float]');
  if (!button) return () => {};
  const tray = doc.querySelector('[data-compare-tray]');
  const bar = doc.querySelector('[data-mobile-enquiry]');
  const heroControls = [...doc.querySelectorAll('.hero .wheel-controls, .hero .hero-primary, .hero [data-wheel-link]')];
  let lift = 0;
  let frame = null;
  const place = () => {
    const rect = button.getBoundingClientRect();
    const base = {left: rect.left, right: rect.right, top: rect.top + lift, bottom: rect.bottom + lift};
    const obstacles = [tray && !tray.hidden ? tray : null, bar, ...heroControls]
      .filter(Boolean).map(element => element.getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0).sort((a,b) => b.top-a.top);
    lift = 0;
    // Work upwards so clearing a lower bar cannot put the link over a higher
    // control. Measure only on resize/scroll, never on the car animation ticker.
    for (const obstacle of obstacles) {
      const step = Math.ceil(contactLift(base, obstacle));
      lift += step; base.top -= step; base.bottom -= step;
    }
    button.style.setProperty('--whatsapp-lift', `${Math.ceil(lift)}px`);
  };
  const schedule = () => {
    if (frame !== null) return;
    frame = win.requestAnimationFrame(() => { frame = null; place(); });
  };
  const resize = new win.ResizeObserver(place);
  resize.observe(button);
  if (tray) resize.observe(tray);
  if (bar) resize.observe(bar);
  heroControls.forEach(control => resize.observe(control));
  const mutation = new win.MutationObserver(place);
  if (tray) mutation.observe(tray, {attributes: true, attributeFilter: ['hidden', 'class']});
  win.addEventListener('resize', place);
  if (heroControls.length) win.addEventListener('scroll', schedule, {passive: true});
  win.visualViewport?.addEventListener('resize', place);
  place();
  return () => {
    resize.disconnect(); mutation.disconnect();
    win.removeEventListener('resize', place);
    win.removeEventListener('scroll', schedule);
    if (frame !== null) win.cancelAnimationFrame(frame);
    win.visualViewport?.removeEventListener('resize', place);
  };
}
