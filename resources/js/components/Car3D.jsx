import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Icon} from './Icon';
import {buildPickup} from '../three/pickupModel';

// The homepage's 3D showroom stage. It shows the uploaded .glb model when the car has one,
// otherwise an illustrative pickup in the car's colour. Drag turns the car; Ctrl + scroll (a trackpad pinch) or the buttons zoom,
// so a plain scroll over the stage still scrolls the page. Rendering pauses while the stage is off screen.
const HOME = new THREE.Vector3(6.3, 2.6, 7.2).normalize(), TARGET = new THREE.Vector3(0, 0.85, 0), CAR_LENGTH = 5.27;

// Scales and seats an uploaded model so it matches the stage: about 5.3 m long, nose along x, wheels on the ground.
function seat(model) {
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  if (size.z > size.x) { model.rotation.y = Math.PI / 2; box.setFromObject(model); box.getSize(size); }
  model.scale.multiplyScalar(CAR_LENGTH / Math.max(size.x, 0.001));
  box.setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  model.position.x -= centre.x; model.position.z -= centre.z; model.position.y -= box.min.y;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return model;
}

// A soft round shadow under the car, drawn once on a canvas.
function contactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d'), gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(20,18,14,.55)'); gradient.addColorStop(.55, 'rgba(20,18,14,.22)'); gradient.addColorStop(1, 'rgba(20,18,14,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.6), new THREE.MeshBasicMaterial({map: texture, transparent: true, depthWrite: false}));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.002;
  return mesh;
}

// tone: 'light' (ivory) or 'dark' (charcoal) ground. shift: on wide stages, moves the car right by this share
// of the width so copy can sit on the left.
export default function Car3D({car, tone = 'light', shift = 0}) {
  const stage = useRef(null), api = useRef(null), [state, setState] = useState(car.model3d ? 'loading' : 'ready'), [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = stage.current, calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'car-3d-canvas';
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.9;
    const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 100);
    camera.position.copy(TARGET).addScaledVector(HOME, 9.4);

    scene.add(new THREE.HemisphereLight('#fffaf0', '#8a7f6c', 0.6));
    const sun = new THREE.DirectionalLight('#fff6e8', 2.2);
    sun.position.set(4, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 22});
    sun.shadow.bias = -0.0004; sun.shadow.radius = 6;
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({opacity: tone === 'dark' ? 0.4 : 0.18}));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground, contactShadow());

    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 5.5, maxDistance: 14, minPolarAngle: 0.3, maxPolarAngle: 1.5,
      rotateSpeed: 0.8, zoomSpeed: 0.7, autoRotate: !calm, autoRotateSpeed: 1.1});
    controls.target.copy(TARGET);
    controls.update();
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    // Vertical swipes keep scrolling the page on phones; sideways drags turn the car.
    renderer.domElement.style.touchAction = 'pan-y';
    let zoomed = false;
    renderer.domElement.addEventListener('wheel', () => { zoomed = true; }, {passive: true});

    // A plain wheel scroll belongs to the page; a trackpad pinch (Ctrl + wheel) zooms the car.
    // Caught on the stage before it reaches the canvas, where OrbitControls would zoom and block the scroll.
    const wheel = e => { if (!e.ctrlKey) e.stopPropagation(); };
    el.addEventListener('wheel', wheel, {capture: true});

    let model = null, disposed = false;
    if (car.model3d) {
      new GLTFLoader().load(car.model3d, gltf => {
        if (disposed) return;
        model = seat(gltf.scene); scene.add(model); setState('ready');
      }, e => { if (e.total) setProgress(Math.round(e.loaded / e.total * 100)); }, () => { if (!disposed) { model = buildPickup(car); scene.add(model); setState('fallback'); } });
    } else {
      model = buildPickup(car); scene.add(model);
    }

    // The distance at which the whole car, turning, fits the stage: about 3.8 m either side and 2.4 m above and below.
    // When the car is shifted right, only the stage width it is centred in counts.
    let shifted = 0;
    const fit = () => {
      const v = THREE.MathUtils.degToRad(camera.fov) / 2, h = Math.atan(Math.tan(v) * camera.aspect * (1 - 2 * shifted));
      return Math.max(2.4 / Math.tan(v), (shifted ? 3.8 : 3.3) / Math.tan(h));
    };
    const resize = () => {
      const {width, height} = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      shifted = shift && width >= 900 ? shift : 0;
      if (shifted) camera.setViewOffset(width, height, -width * shifted, 0, width, height); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      const d = fit();
      controls.minDistance = d * 0.55; controls.maxDistance = d * 1.5;
      if (!zoomed) camera.position.sub(controls.target).setLength(d).add(controls.target);
    };
    const sizer = new ResizeObserver(resize);
    sizer.observe(el); resize();

    // Draw only while the stage is on screen and the tab is visible.
    let onScreen = true;
    const run = () => renderer.setAnimationLoop(onScreen && !document.hidden ? () => { controls.update(); renderer.render(scene, camera); } : null);
    const watcher = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; run(); });
    watcher.observe(el);
    document.addEventListener('visibilitychange', run);
    run();

    const orbit = (turn, tilt = 0) => {
      controls.autoRotate = false;
      const offset = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(offset);
      s.theta += turn; s.phi = THREE.MathUtils.clamp(s.phi + tilt, controls.minPolarAngle, controls.maxPolarAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
    };
    const zoom = factor => {
      zoomed = true;
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
    };
    api.current = {
      left: () => orbit(-Math.PI / 8), right: () => orbit(Math.PI / 8), up: () => orbit(0, -0.15), down: () => orbit(0, 0.15),
      zoomIn: () => zoom(0.85), zoomOut: () => zoom(1 / 0.85),
      reset: () => { zoomed = false; controls.target.copy(TARGET); camera.position.copy(TARGET).addScaledVector(HOME, fit()); controls.autoRotate = !calm; },
    };

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      watcher.disconnect(); sizer.disconnect();
      document.removeEventListener('visibilitychange', run);
      el.removeEventListener('wheel', wheel, {capture: true});
      controls.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        for (const m of [].concat(o.material || [])) { for (const value of Object.values(m)) if (value?.isTexture) value.dispose(); m.dispose(); }
      });
      scene.environment?.dispose(); pmrem.dispose(); room.dispose?.();
      renderer.dispose(); renderer.domElement.remove();
      api.current = null;
    };
  }, [car.id, car.model3d, car.colour, tone, shift]);

  // Arrow keys turn and tilt the car, + and − zoom, Home resets the view.
  const keys = e => {
    const a = api.current, action = {ArrowLeft: a?.left, ArrowRight: a?.right, ArrowUp: a?.up, ArrowDown: a?.down, '+': a?.zoomIn, '=': a?.zoomIn, '-': a?.zoomOut, Home: a?.reset}[e.key];
    if (action) { e.preventDefault(); action(); }
  };
  const tool = (label, onClick, children) => <button type="button" className="car-3d-tool" aria-label={label} title={label} onClick={() => api.current && onClick(api.current)}>{children}</button>;

  return <div className={'car-3d car-3d--' + tone} ref={stage} tabIndex={0} role="img" aria-roledescription="3D model" onKeyDown={keys}
    aria-label={'3D car model. Drag, or use the arrow keys, to turn it. Ctrl + scroll or the plus and minus keys zoom.'}>
    {state === 'loading' && <p className="car-3d-status" role="status">Loading 3D model{progress ? ' · ' + progress + '%' : '…'}</p>}
    <div className="car-3d-tools">
      {tool('Turn left', a => a.left(), <Icon name="left"/>)}
      {tool('Turn right', a => a.right(), <Icon name="right"/>)}
      {tool('Zoom in', a => a.zoomIn(), <Icon name="plus"/>)}
      {tool('Zoom out', a => a.zoomOut(), <Icon name="minus"/>)}
      {tool('Reset view', a => a.reset(), <Icon name="reset"/>)}
    </div>
    <p className="car-3d-hint">Drag to turn · Ctrl + scroll to zoom</p>
  </div>;
}
