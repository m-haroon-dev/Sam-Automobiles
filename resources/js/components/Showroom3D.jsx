import React, {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {useShowroom} from '../state/ShowroomContext';

// three.js is downloaded only as the visitor scrolls near this section.
const loadCar3D = () => import('./Car3D'), Car3D = lazy(loadCar3D);

// The car shown in 3D: an available car with an uploaded model (featured ones first),
// otherwise an available pickup, otherwise a grey one: the section is always shown with the built-in illustrative model.
export function showroom3DCar(cars) {
  const available = cars.filter(c => c.status === 'available'), featuredFirst = (a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
  return available.filter(c => c.model3d).sort(featuredFirst)[0] || available.filter(c => /pick\s*-?\s*up/i.test(c.body || '')).sort(featuredFirst)[0] || {id: 'showroom-pickup', name: 'Pickup', colour: 'Grey'};
}

// Homepage section: a full-width stage where the visitor turns and zooms a car, under a short heading.
export function Showroom3D() {
  const {cars} = useShowroom(), car = showroom3DCar(cars), stage = useRef(null), [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    if (!('IntersectionObserver' in window)) { setNear(true); return; }
    const watcher = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); watcher.disconnect(); } }, {rootMargin: '600px 0px'});
    watcher.observe(stage.current);
    return () => watcher.disconnect();
  }, [car?.id, near]);
  const waiting = <div className="car-3d car-3d--dark"><p className="car-3d-status" role="status">Loading 3D view…</p></div>;

  return <section className="dark showroom-3d" aria-labelledby="showroom-3d-title" data-showroom-3d={car.id}>
    <div className="showroom-3d-stage" ref={stage}>{near ? <Suspense fallback={waiting}><Car3D car={car} tone="dark" shift={0.17}/></Suspense> : waiting}</div>
    <div className="wrap showroom-3d-copy">
      <div className="showroom-3d-text">
        <p className="eyebrow" data-reveal="">Explore in 3D</p>
        <h2 id="showroom-3d-title" data-reveal="">Turn it. Tilt it. Take a closer look.</h2>
        <p data-reveal="">Drag to walk around the car from every side.</p>
      </div>
    </div>
  </section>;
}
