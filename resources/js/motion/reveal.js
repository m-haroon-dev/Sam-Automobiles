import {gsap} from 'gsap';

// Sections, cards and figures rise and fade into place as they scroll into view, a few at a time,
// and whole-number figures count up. The filmed hero, the featured carousel and dialogs animate
// themselves and are left alone. Runs before paint (useGSAP), so nothing flashes; visitors who ask
// for reduced motion see the page as it is.
const TARGETS = ['[data-reveal]', '.section-heading > *', '.car-card', '.buying-steps li', '.testimonial', '.trust-stats > div',
  '.sell-feature-layout > *', '.showroom-story-copy > *', '.showroom-film', '.instagram-grid article', '.attraction-facts > div',
  '.vehicle-enquiry', '.filter-panel', '.trade-form', '.visit-form', '.spec-table', '.footer-top > *', '.footer-location > *'].join(',');
const SKIP = '.road-hero, .catalogue-stage, dialog, .compare-tray';

function countUp(el) {
  const target = Number(el.textContent.replace(/[,\s]/g, ''));
  // Years read as dates, not quantities, so they stay as they are.
  if (!Number.isInteger(target) || target < 10 || (target >= 1900 && target <= 2100)) return;
  const final = el.textContent, counter = {n: 0};
  gsap.to(counter, {n: target, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(counter.n).toLocaleString('en-GB'); }, onComplete: () => { el.textContent = final; }});
}

export function initReveal(root, win = window) {
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in win)) return () => {};
  const items = [...root.querySelectorAll(TARGETS)].filter(el => !el.closest(SKIP) && !el.parentElement.closest(TARGETS));
  if (!items.length) return () => {};
  const phone = win.matchMedia('(max-width: 767px)').matches, rise = phone ? 22 : 36;
  gsap.set(items, {autoAlpha: 0, y: rise});
  items.forEach(el => el.querySelectorAll('.car-photo img').forEach(img => gsap.set(img, {scale: 1.06})));

  const show = els => {
    gsap.to(els, {autoAlpha: 1, y: 0, duration: phone ? .7 : .95, ease: 'power3.out', stagger: .09, clearProps: 'opacity,visibility,transform'});
    els.forEach(el => {
      el.querySelectorAll('.car-photo img').forEach(img => gsap.to(img, {scale: 1, duration: 1.4, ease: 'power2.out', clearProps: 'transform'}));
      if (el.matches('.trust-stats > div')) el.querySelectorAll('dd').forEach(countUp);
    });
  };
  const observer = new win.IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).map(e => e.target);
    visible.forEach(el => observer.unobserve(el));
    if (visible.length) show(visible);
  }, {rootMargin: '0px 0px -8% 0px', threshold: .08});
  items.forEach(el => observer.observe(el));

  // Printing shows everything at once.
  const reveal = () => { observer.disconnect(); gsap.set(items, {clearProps: 'opacity,visibility,transform'}); };
  win.addEventListener('beforeprint', reveal);
  return () => { observer.disconnect(); win.removeEventListener('beforeprint', reveal); };
}
