import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// An illustrative double-cab pickup built from code, used when a car has no uploaded .glb model.
// Proportions follow a current double-cab pickup such as the Isuzu D-Max V-Cross: 5.27 m long,
// 1.87 m wide, 1.79 m tall, 3.125 m wheelbase on 265/60 R18 tyres. Units are metres; the nose
// points along +x, y is up and the car sits on y = 0.
const L = 2.635, FRONT_AXLE = 1.695, REAR_AXLE = -1.43, WHEEL_R = 0.388, ARCH_R = 0.46, SILL = 0.52;
const BODY_HALF = 0.87, CAB_HALF = 0.8, BELT = 1.23, BED_FLOOR = 0.98, BED_TOP = 1.25, CAB_BACK = -1.08;
// The rounded edges push the nose and tail 4.8 cm past the profile; parts on them are placed from these faces.
const F = L + 0.048, R = -L - 0.048, BED_LEN = CAB_BACK - R;

// Paint names as written in listings, mapped to a metallic paint colour.
const PAINT = [[/white|pearl|ivory/, '#e8e8e4'], [/black|onyx|obsidian/, '#17191b'], [/silver/, '#b4b8bd'], [/grey|gray|graphite|gunmetal|titanium/, '#4d5156'],
  [/red|maroon|burgundy/, '#8e1c20'], [/blue|navy/, '#1e3a66'], [/green|olive/, '#3b4a34'], [/brown|bronze|beige|gold|champagne/, '#8a6b45'], [/orange/, '#c25a1c']];
export function paintFor(colour = '') {
  const name = String(colour).toLowerCase();
  return (PAINT.find(([pattern]) => pattern.test(name)) || [null, '#4d5156'])[1];
}

// Extrudes a side profile across the car's width, centred on z = 0, with rounded edges.
function extrudeSide(shape, halfWidth, bevel = 0.05, segments = 4) {
  const depth = 2 * (halfWidth - bevel);
  const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: segments, curveSegments: 28});
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

// A flat panel (window glass) lying in a plane given by four corners.
function quad(a, b, c, d) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function lowerBody() {
  const s = new THREE.Shape(), a = Math.asin((SILL - WHEEL_R) / ARCH_R);
  s.moveTo(-L, 0.62);
  s.lineTo(-L + 0.14, SILL);
  s.lineTo(REAR_AXLE - ARCH_R * Math.cos(a), SILL);
  s.absarc(REAR_AXLE, WHEEL_R, ARCH_R, Math.PI - a, a, true);
  s.lineTo(FRONT_AXLE - ARCH_R * Math.cos(a), SILL);
  s.absarc(FRONT_AXLE, WHEEL_R, ARCH_R, Math.PI - a, a, true);
  s.lineTo(L - 0.24, SILL);
  s.lineTo(L - 0.04, 0.62);
  s.lineTo(L + 0.005, 0.8);
  s.lineTo(L - 0.02, 1.02);
  s.quadraticCurveTo(L - 0.04, 1.11, L - 0.18, 1.12);
  s.lineTo(1.04, BELT);
  s.lineTo(CAB_BACK, BELT);
  s.lineTo(CAB_BACK, BED_FLOOR);
  s.lineTo(-L, BED_FLOOR);
  s.closePath();
  return extrudeSide(s, BODY_HALF, 0.06, 5);
}

// The cabin above the beltline; its outline is reused to place the glass.
// The roof outline sits 7 cm below the real roof: the rounded edges add that back (1.79 m overall).
const CABIN = [[1.05, BELT], [0.28, 1.7], [-0.3, 1.72], [-0.98, 1.705], [CAB_BACK, BELT]];
function cabin() {
  const s = new THREE.Shape();
  s.moveTo(...CABIN[0]);
  s.lineTo(...CABIN[1]);
  s.quadraticCurveTo(0.1, 1.718, -0.3, 1.72);
  s.quadraticCurveTo(-0.9, 1.724, -0.98, 1.705);
  s.lineTo(...CABIN[4]);
  s.closePath();
  return extrudeSide(s, CAB_HALF, 0.09, 6);
}

function glass(group, glassMat) {
  // Side windows sit on the flat sides of the cabin, split by the B-pillar.
  const side = (points, z) => {
    const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.008, bevelEnabled: false});
    const mesh = new THREE.Mesh(g, glassMat);
    mesh.position.z = z > 0 ? z - 0.003 : z - 0.005;
    group.add(mesh);
  };
  const front = [[0.82, 1.29], [0.232, 1.65], [-0.02, 1.66], [-0.02, 1.29]];
  const rear = [[-0.1, 1.29], [-0.1, 1.66], [-0.8, 1.655], [-0.85, 1.63], [-0.925, 1.29]];
  for (const z of [CAB_HALF, -CAB_HALF]) { side(front, z); side(rear, z); }

  // Windscreen and rear window follow the cabin's sloped faces, a hair outside them.
  const panel = ([x1, y1], [x2, y2], inset, halfWidth, lift) => {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = uy, ny = -ux;
    const p = t => [x1 + ux * t + nx * lift, y1 + uy * t + ny * lift];
    const [ax, ay] = p(inset), [bx, by] = p(len - inset);
    return new THREE.Mesh(quad([ax, ay, halfWidth], [bx, by, halfWidth], [bx, by, -halfWidth], [ax, ay, -halfWidth]), glassMat);
  };
  const windscreen = panel(CABIN[0], CABIN[1], 0.05, CAB_HALF - 0.12, 0.08);
  const rearWindow = panel(CABIN[3], CABIN[4], 0.08, CAB_HALF - 0.26, 0.08);
  windscreen.material = rearWindow.material = glassMat.clone();
  windscreen.material.side = rearWindow.material.side = THREE.DoubleSide;
  group.add(windscreen, rearWindow);
}

function wheel(mats) {
  const w = new THREE.Group();
  // Tyre: a lathed profile with rounded shoulders, turned so the axle runs along z.
  const profile = [[0.24, -0.118], [0.33, -0.128], [0.372, -0.12], [WHEEL_R, -0.09], [WHEEL_R, 0.09], [0.372, 0.12], [0.33, 0.128], [0.24, 0.118]].map(([r, h]) => new THREE.Vector2(r, h));
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(profile, 56), mats.rubber);
  tyre.rotation.x = Math.PI / 2;
  // Tread blocks around the crown.
  const tread = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R + 0.004, WHEEL_R + 0.004, 0.17, 56, 1, true), mats.tread);
  tread.rotation.x = Math.PI / 2;
  // The rim barrel is open at the face so the spokes show against a dark wheel well and the brake disc.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.2, 40, 1, true), mats.liner);
  barrel.rotation.x = Math.PI / 2;
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.235, 40), mats.shadow);
  back.position.z = -0.06;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32), mats.steel);
  disc.rotation.x = Math.PI / 2; disc.position.z = 0.02;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.228, 0.014, 10, 48), mats.alloy);
  lip.position.z = 0.1;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 24), mats.alloy);
  hub.rotation.x = Math.PI / 2; hub.position.z = 0.09;
  w.add(tyre, tread, barrel, back, disc, lip, hub);
  // Six twin spokes in a dark alloy finish.
  for (let i = 0; i < 6; i++) {
    for (const offset of [-0.09, 0.09]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.035), mats.alloy);
      const angle = (i / 6) * Math.PI * 2 + offset;
      spoke.position.set(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0.085);
      spoke.rotation.z = angle;
      w.add(spoke);
    }
  }
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.05), mats.caliper);
  caliper.position.set(0.12, 0.08, 0.03);
  w.add(caliper);
  return w;
}

// Black plastic arch flares that frame the wheels.
function flare(axleX) {
  const a = Math.asin((SILL - 0.03 - WHEEL_R) / (ARCH_R + 0.07)), b = Math.asin((SILL - 0.03 - WHEEL_R) / ARCH_R);
  const s = new THREE.Shape();
  s.absarc(axleX, WHEEL_R, ARCH_R + 0.07, a, Math.PI - a, false);
  s.absarc(axleX, WHEEL_R, ARCH_R - 0.005, Math.PI - b, b, true);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3, curveSegments: 32});
}

// Dark liners inside each arch so the wheel wells read as openings, not painted metal.
function archLiner(axleX, mat) {
  const a = Math.asin((SILL - WHEEL_R) / ARCH_R);
  const g = new THREE.CylinderGeometry(ARCH_R - 0.01, ARCH_R - 0.01, 2 * BODY_HALF - 0.04, 40, 1, true, a + Math.PI / 2, Math.PI - 2 * a);
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = Math.PI / 2; m.position.set(axleX, WHEEL_R, 0);
  return m;
}

const box = (w, h, d, mat, x, y, z, radius = 0) => {
  const m = new THREE.Mesh(radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
};

export function buildPickup({colour} = {}) {
  const paint = new THREE.MeshPhysicalMaterial({color: paintFor(colour), metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06});
  const mats = {
    paint,
    glass: new THREE.MeshPhysicalMaterial({color: '#0d1114', metalness: 0.3, roughness: 0.04, clearcoat: 1}),
    plastic: new THREE.MeshStandardMaterial({color: '#1b1c1d', roughness: 0.72, metalness: 0.05}),
    trim: new THREE.MeshStandardMaterial({color: '#2a2c2f', roughness: 0.38, metalness: 0.75}),
    chrome: new THREE.MeshStandardMaterial({color: '#d4d6d8', roughness: 0.16, metalness: 1}),
    rubber: new THREE.MeshStandardMaterial({color: '#151515', roughness: 0.92}),
    tread: new THREE.MeshStandardMaterial({color: '#101010', roughness: 1}),
    shadow: new THREE.MeshStandardMaterial({color: '#0a0a0a', roughness: 1}),
    liner: new THREE.MeshStandardMaterial({color: '#0e0e0f', roughness: 1, side: THREE.DoubleSide}),
    bedLiner: new THREE.MeshStandardMaterial({color: '#202122', roughness: 0.95}),
    alloy: new THREE.MeshStandardMaterial({color: '#6a6f76', roughness: 0.24, metalness: 0.9}),
    steel: new THREE.MeshStandardMaterial({color: '#8a8d90', roughness: 0.45, metalness: 0.9}),
    caliper: new THREE.MeshStandardMaterial({color: '#2b2d30', roughness: 0.5, metalness: 0.4}),
    lamp: new THREE.MeshPhysicalMaterial({color: '#8d99a4', emissive: '#cfe3ff', emissiveIntensity: 0.12, metalness: 0.6, roughness: 0.06, clearcoat: 1}),
    drl: new THREE.MeshStandardMaterial({color: '#ffffff', emissive: '#e6f1ff', emissiveIntensity: 1.4}),
    tail: new THREE.MeshPhysicalMaterial({color: '#7d0b10', emissive: '#a5111a', emissiveIntensity: 0.55, roughness: 0.12, clearcoat: 1}),
    plate: new THREE.MeshStandardMaterial({color: '#f1f1ec', roughness: 0.5}),
  };
  const car = new THREE.Group();
  car.name = 'Illustrative pickup';

  car.add(new THREE.Mesh(lowerBody(), paint), new THREE.Mesh(cabin(), paint));
  glass(car, mats.glass);

  // Load bed: side walls, bulkhead, tailgate and a dark liner.
  for (const side of [1, -1]) car.add(box(BED_LEN, BED_TOP - 0.9, 0.075, paint, (CAB_BACK + R) / 2, (BED_TOP + 0.9) / 2, side * (BODY_HALF - 0.0375), 0.025));
  car.add(box(0.07, BED_TOP - 0.9, 2 * BODY_HALF - 0.02, paint, CAB_BACK - 0.03, (BED_TOP + 0.9) / 2, 0, 0.025));
  car.add(box(0.075, BED_TOP - 0.62, 2 * BODY_HALF - 0.02, paint, R + 0.0375, (BED_TOP + 0.62) / 2, 0, 0.025));
  car.add(box(BED_LEN - 0.16, 0.012, 2 * BODY_HALF - 0.16, mats.bedLiner, (CAB_BACK + R) / 2, BED_FLOOR + 0.06, 0));
  car.add(box(0.02, 0.05, 0.3, mats.plastic, R - 0.005, 1.15, 0));

  // Sports bar behind the cab.
  const bar = (from, to) => {
    const curve = new THREE.LineCurve3(new THREE.Vector3(...from), new THREE.Vector3(...to));
    car.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 1, 0.032, 14), mats.plastic));
  };
  const barX = CAB_BACK - 0.28, barTop = 1.62, barZ = BODY_HALF - 0.12;
  for (const side of [1, -1]) {
    bar([barX, BED_TOP, side * barZ], [barX + 0.04, barTop, side * (barZ - 0.06)]);
    bar([barX - 0.45, BED_TOP, side * barZ], [barX + 0.02, barTop - 0.02, side * (barZ - 0.06)]);
  }
  bar([barX + 0.04, barTop, barZ - 0.06], [barX + 0.04, barTop, -(barZ - 0.06)]);

  // Nose: grille with bars, headlamps with a daytime running light, bumper, skid plate, fog lamps and plate.
  car.add(box(0.05, 0.36, 1.12, mats.plastic, F - 0.01, 0.9, 0, 0.02));
  for (const y of [0.78, 0.85, 0.92, 0.99]) car.add(box(0.03, 0.02, 1.04, mats.trim, F + 0.02, y, 0));
  car.add(box(0.035, 0.045, 1.16, mats.chrome, F + 0.015, 1.05, 0, 0.01));
  car.add(box(0.02, 0.035, 0.3, mats.chrome, F + 0.035, 1.05, 0));
  for (const side of [1, -1]) {
    const lamp = box(0.08, 0.12, 0.3, mats.lamp, F - 0.03, 1.03, side * 0.72, 0.03);
    lamp.rotation.z = -0.2;
    const wrap = box(0.3, 0.085, 0.02, mats.lamp, F - 0.17, 1.06, side * (BODY_HALF + 0.004), 0.01);
    wrap.rotation.z = 0.12;
    const drl = box(0.012, 0.014, 0.28, mats.drl, F + 0.012, 0.985, side * 0.72);
    car.add(wrap, box(0.24, 0.012, 0.012, mats.drl, F - 0.15, 1.035, side * (BODY_HALF + 0.012)));
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20), mats.lamp);
    fog.rotation.z = Math.PI / 2; fog.position.set(F + 0.01, 0.66, side * 0.66);
    car.add(lamp, drl, fog, box(0.03, 0.08, 0.2, mats.plastic, F - 0.005, 0.66, side * 0.66, 0.015));
  }
  car.add(box(0.2, 0.08, 1.2, mats.steel, L - 0.12, 0.5, 0, 0.02));
  car.add(box(0.012, 0.11, 0.36, mats.plate, F + 0.008, 0.7, 0));

  // Tail: lamps, step bumper and plate.
  for (const side of [1, -1]) car.add(box(0.04, 0.3, 0.09, mats.tail, R - 0.005, 1.06, side * (BODY_HALF - 0.06), 0.015));
  car.add(box(0.16, 0.13, 1.72, mats.trim, R - 0.03, 0.56, 0, 0.03));
  car.add(box(0.012, 0.11, 0.36, mats.plate, R - 0.004, 0.8, 0));

  // Sides: mirrors, door handles, steps, arch flares and liners.
  for (const side of [1, -1]) {
    const mirror = box(0.2, 0.14, 0.13, mats.chrome, 0.86, 1.36, side * (CAB_HALF + 0.16), 0.045);
    const stalk = box(0.09, 0.04, 0.16, mats.plastic, 0.9, 1.31, side * (CAB_HALF + 0.07));
    car.add(mirror, stalk, box(2.05, 0.04, 0.2, mats.steel, 0.13, 0.46, side * (BODY_HALF - 0.01), 0.015));
    for (const x of [0.3, -0.62]) car.add(box(0.16, 0.035, 0.03, mats.chrome, x, 1.13, side * (BODY_HALF + 0.005), 0.012));
    // Door shut lines: front door leading edge, B-pillar and rear door trailing edge.
    for (const [x, top] of [[1.0, 1.2], [-0.06, 1.27], [-1.0, 1.27]]) car.add(box(0.007, top - 0.56, 0.006, mats.shadow, x, (top + 0.56) / 2, side * (BODY_HALF + 0.001)));
    // Roof rails on short feet.
    car.add(box(1.05, 0.03, 0.045, mats.steel, -0.38, 1.815, side * 0.6, 0.012));
    for (const x of [0.1, -0.86]) car.add(box(0.07, 0.05, 0.05, mats.plastic, x, 1.79, side * 0.6, 0.01));
    for (const axle of [FRONT_AXLE, REAR_AXLE]) {
      const f = new THREE.Mesh(flare(axle), mats.plastic);
      f.position.z = side > 0 ? BODY_HALF - 0.08 : -BODY_HALF - 0.02;
      car.add(f);
    }
  }
  for (const axle of [FRONT_AXLE, REAR_AXLE]) car.add(archLiner(axle, mats.liner));

  // Underbody so the car does not look hollow from low angles.
  car.add(box(2 * L - 0.5, 0.18, 1.2, mats.shadow, -0.1, 0.43, 0));
  for (const axle of [FRONT_AXLE, REAR_AXLE]) for (const side of [1, -1]) {
    const w = wheel(mats);
    w.position.set(axle, WHEEL_R, side * 0.78);
    if (side < 0) w.rotation.y = Math.PI;
    car.add(w);
  }

  car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return car;
}
