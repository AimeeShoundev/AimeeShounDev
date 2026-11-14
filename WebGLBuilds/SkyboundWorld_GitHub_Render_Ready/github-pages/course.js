import * as THREE from './vendor/three.module.min.js';

// Coordinates are in metres. Progress zero is the middle of the front straight.
const straight = 0.47;
const radius = 0.375;
const halfRoad = 0.119;
const laneWidth = 0.084;
const halfTurn = Math.PI * radius;
const perimeter = 4 * straight + 2 * halfTurn;
export const AR_SCALE = 0.8;
const boosts = [
  { start: 0.17, end: 0.245, lane: -0.62 },
  { start: 0.50, end: 0.575, lane: 0.62 },
  { start: 0.79, end: 0.865, lane: -0.62 }
];

export function laneFor(steer, slot) {
  const grid = slot === 0 ? -0.48 : 0.48;
  return grid + steer * (steer < 0 ? 1 + grid : 1 - grid);
}

export function onBoost(progress, lane) {
  const t = progress % 1;
  return boosts.some(zone => t >= zone.start && t <= zone.end && Math.abs(lane - zone.lane) < 0.48);
}

function point(progress, offset = 0) {
  let d = (((progress % 1) + 1) % 1) * perimeter;
  let x, z, dx, dz;
  if (d <= straight) {
    x = d; z = radius; dx = 1; dz = 0;
  } else if ((d -= straight) <= halfTurn) {
    const a = d / radius;
    x = straight + radius * Math.sin(a); z = radius * Math.cos(a);
    dx = Math.cos(a); dz = -Math.sin(a);
  } else if ((d -= halfTurn) <= 2 * straight) {
    x = straight - d; z = -radius; dx = -1; dz = 0;
  } else if ((d -= 2 * straight) <= halfTurn) {
    const a = d / radius;
    x = -straight - radius * Math.sin(a); z = -radius * Math.cos(a);
    dx = -Math.cos(a); dz = Math.sin(a);
  } else {
    x = -straight + (d - halfTurn); z = radius; dx = 1; dz = 0;
  }
  return { x: x - dz * offset, z: z + dx * offset, angle: -Math.atan2(dz, dx) };
}

// One draw call for the static diorama. Car bodies are batched separately so each can move.
function geometryBatch() {
  const positions = [], normals = [], colors = [];
  const object = new THREE.Object3D();
  const tint = new THREE.Color();
  function add(geometry, color, x = 0, y = 0, z = 0, yaw = 0, roll = 0) {
    object.position.set(x, y, z);
    object.rotation.set(0, yaw, roll, 'YXZ');
    object.updateMatrix();
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.applyMatrix4(object.matrix);
    positions.push(...flat.attributes.position.array);
    normals.push(...flat.attributes.normal.array);
    tint.set(color);
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(tint.r, tint.g, tint.b);
    if (geometry !== flat) geometry.dispose();
    flat.dispose();
  }
  function box(w, h, d, color, x, y, z, yaw = 0, roll = 0) {
    add(new THREE.BoxGeometry(w, h, d), color, x, y, z, yaw, roll);
  }
  function strip(inner, outer, y, color, from = 0, to = 1, steps = 128) {
    const v = [];
    let a = point(from, inner), b = point(from, outer);
    for (let i = 1; i <= steps; i++) {
      const t = from + (to - from) * i / steps;
      const c = point(t, inner), d = point(t, outer);
      v.push(a.x,y,a.z, b.x,y,b.z, c.x,y,c.z, c.x,y,c.z, b.x,y,b.z, d.x,y,d.z);
      a = c; b = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals(); add(g, color);
  }
  function build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.87 }));
  }
  return { add, box, strip, build };
}

const lacquer = ['#ff5b34', '#12bca9'];
const asphalt = '#303d3e', cream = '#f8ecd4', red = '#e75b3b';
const lime = '#c4f85e', pine = '#216856', green = '#548e65';
const deck = 0.047;

function buildCar(slot) {
  const b = geometryBatch();
  const paint = lacquer[slot], rubber = '#222b2b', glass = '#304d52';
  b.box(0.090, 0.014, 0.050, rubber, 0, 0.016, 0);
  b.box(0.098, 0.017, 0.046, paint, 0, 0.029, 0);
  b.box(0.050, 0.010, 0.030, paint, 0.025, 0.038, 0);
  b.box(0.030, 0.015, 0.032, glass, -0.009, 0.044, 0);
  b.box(0.021, 0.006, 0.028, cream, -0.011, 0.053, 0);
  b.box(0.035, 0.002, 0.006, cream, 0.030, 0.044, 0);
  for (const z of [-0.025, 0.025]) {
    for (const x of [-0.029, 0.028]) {
      const tire = new THREE.CylinderGeometry(0.0135, 0.0135, 0.012, 10);
      tire.rotateX(Math.PI / 2); b.add(tire, rubber, x, 0.016, z);
      const hub = new THREE.CylinderGeometry(0.0065, 0.0065, 0.013, 8);
      hub.rotateX(Math.PI / 2); b.add(hub, '#cfbda1', x, 0.016, z);
    }
    b.box(0.005, 0.021, 0.004, rubber, -0.041, 0.041, z * 0.68);
    b.box(0.006, 0.005, 0.011, '#fff3ae', 0.049, 0.031, z * 0.64);
  }
  b.box(0.016, 0.005, 0.065, paint, -0.043, 0.052, 0);
  return b.build();
}

function stadiumBase(batch) {
  const outline = new THREE.Shape();
  const r = 0.576;
  outline.moveTo(-straight, -r); outline.lineTo(straight, -r);
  outline.absarc(straight, 0, r, -Math.PI / 2, Math.PI / 2, false);
  outline.lineTo(-straight, r);
  outline.absarc(-straight, 0, r, Math.PI / 2, 3 * Math.PI / 2, false);
  outline.closePath();
  function layer(depth, y, color, size) {
    const g = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 36 });
    g.rotateX(-Math.PI / 2); g.scale(size, 1, size);
    batch.add(g, color, 0, y, 0);
  }
  layer(0.023, 0.002, '#36564b', 1);
  layer(0.019, 0.025, '#7fba86', 0.999);
  layer(0.002, 0.044, '#95c889', 0.994);
}

function tree(b, x, z, height, tone) {
  const trunk = new THREE.CylinderGeometry(0.009, 0.012, height * 0.32, 7);
  b.add(trunk, '#815b43', x, deck + height * 0.16, z);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.ConeGeometry(height * (0.25 - i * 0.042), height * (0.45 - i * 0.035), 7);
    b.add(cone, i === 2 ? green : tone, x, deck + height * (0.43 + i * 0.19), z, i);
  }
}

function scenery(b) {
  const dark = '#31584f';
  // Terraced spectator seats, a striped canopy, and a compact timing tower.
  for (let i = 0; i < 4; i++) {
    b.box(0.38, 0.018 + 0.013 * i, 0.027, i % 2 ? '#f9c4a2' : red,
      -0.20, deck + 0.009 + 0.0065 * i, -0.10 - i * 0.025);
  }
  for (const x of [-0.40, -0.19, 0.01]) b.box(0.009, 0.14, 0.009, dark, x, deck + 0.07, -0.19);
  b.box(0.445, 0.012, 0.092, dark, -0.196, deck + 0.144, -0.154);
  for (let i = 0; i < 10; i++) b.box(0.043, 0.009, 0.094,
    i % 2 ? cream : red, -0.395 + i * 0.044, deck + 0.152, -0.154);
  b.box(0.105, 0.12, 0.083, cream, 0.143, deck + 0.060, -0.14);
  b.box(0.129, 0.038, 0.096, '#426366', 0.143, deck + 0.129, -0.14);
  b.box(0.144, 0.01, 0.113, red, 0.143, deck + 0.153, -0.14);
  for (const x of [0.101, 0.141, 0.182]) b.box(0.004, 0.033, 0.099, cream, x, deck + 0.13, -0.14);
  [[-.57,-.1,.14],[-.64,.04,.20],[-.49,.045,.16],[.56,-.01,.19],[.65,.04,.16],[.49,.11,.14],[-.34,.16,.11]]
    .forEach(([x,z,h], i) => tree(b, x, z, h, i % 2 ? pine : '#337859'));
  // Start gantry on the finish stripe, with lights facing the front straight.
  for (const edge of [-1, 1]) {
    const z = radius + edge * (halfRoad + 0.022);
    b.box(0.029, 0.014, 0.032, dark, 0, deck + 0.007, z);
    b.box(0.014, 0.125, 0.015, red, 0, deck + 0.068, z);
  }
  b.box(0.029, 0.029, 0.304, dark, 0, deck + 0.135, radius);
  for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) {
    if ((i+j)%2) b.box(0.031, 0.011, 0.020, cream, 0, deck + 0.128 + j*0.012, radius+(i-6.5)*0.021);
  }
  // Barrier posts are outside both driving lanes.
  for (const [start, end] of [[0.085,0.34],[0.59,0.90]]) {
    b.strip(halfRoad + 0.020, halfRoad + 0.029, deck + 0.022, cream, start, end, 44);
    for (let t = start; t < end; t += 0.019) {
      const p = point(t, halfRoad + 0.025);
      b.box(0.008, 0.026, 0.009, dark, p.x, deck + 0.013, p.z, p.angle);
    }
  }
}

function buildTrack() {
  const b = geometryBatch(); stadiumBase(b);
  b.strip(-halfRoad, halfRoad, deck, asphalt);
  for (const side of [-1, 1]) {
    const a = side * (halfRoad - 0.018), c = side * (halfRoad - 0.013);
    b.strip(Math.min(a,c), Math.max(a,c), deck + 0.001, cream);
    for (let i = 0; i < 112; i++) {
      const k = side * halfRoad, l = side * (halfRoad + 0.013);
      b.strip(Math.min(k,l), Math.max(k,l), deck + 0.0015, i%2 ? cream : red, i/112, (i+1)/112, 2);
    }
  }
  for (let i = 0; i < 55; i++) b.strip(-0.0022, 0.0022, deck + 0.001, '#aeb5af', i/55, (i+0.38)/55, 2);
  for (let i=0; i<10; i++) for (let j=0; j<2; j++) {
    b.box(0.016, 0.001, 0.021, (i+j)%2 ? cream : '#1b2929',
      (j-0.5)*0.016, deck + 0.002, radius + (i-4.5)*0.021);
  }
  for (const zone of boosts) {
    const offset = zone.lane * laneWidth;
    b.strip(offset-0.029, offset+0.029, deck+0.0014, '#56784e', zone.start, zone.end, 16);
    for (let i=0; i<5; i++) {
      const t = zone.start+(i+0.5)*(zone.end-zone.start)/5;
      for (const side of [-1,1]) {
        const p = point(t, offset+side*0.010);
        b.box(0.006, 0.001, 0.024, lime, p.x, deck+0.0027, p.z, p.angle-side*0.52);
      }
    }
  }
  scenery(b);
  return b.build();
}

function reticleMesh() {
  const group = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({color: 0xc8ff70, depthTest: false, side: THREE.DoubleSide});
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.062,0.069,52).rotateX(-Math.PI/2),m);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.070,0.075,52).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x17342b,depthTest:false}));
  group.add(rim,ring);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2, tick=new THREE.Mesh(new THREE.BoxGeometry(0.026,0.002,0.005),m);
    tick.position.set(Math.cos(a)*0.083,0.002,Math.sin(a)*0.083); tick.rotation.y=-a; group.add(tick);
  }
  group.renderOrder=9; group.visible=false;
  return group;
}

export function createCourse(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000,0);
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType('local');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34,1,0.01,30);
  scene.add(new THREE.HemisphereLight(0xfff7e5,0xadc6ac,2.05));
  const sun=new THREE.DirectionalLight(0xffefdc,2.0); sun.position.set(-2,5,3); scene.add(sun);
  const world=new THREE.Group(); world.add(buildTrack()); scene.add(world);
  const cars=[buildCar(0),buildCar(1)]; world.add(...cars);
  const reticle=reticleMesh(); scene.add(reticle);
  function setCar(slot,progress,lane) {
    const p=point(progress,laneFor(lane,slot)*laneWidth);
    cars[slot].position.set(p.x,deck+0.003,p.z); cars[slot].rotation.y=p.angle;
  }
  function resetWorld() {
    world.matrixAutoUpdate=true; world.position.set(0,0,0); world.rotation.set(0,0,0);
    world.scale.setScalar(1); world.updateMatrix(); world.visible=true; reticle.visible=false;
  }
  function resize(showcase) {
    if(renderer.xr.isPresenting) return;
    const {width,height}=canvas.parentElement.getBoundingClientRect();
    if(width<2 || height<2) return;
    renderer.setSize(Math.round(width),Math.round(height),false);
    camera.aspect=width/height; camera.updateProjectionMatrix();
    const direction = showcase ? new THREE.Vector3(0.90,1.18,1.55) : new THREE.Vector3(0.14,1.95,1.08);
    const distance = Math.max(showcase ? 2.32 : 2.42, (showcase ? 3.90 : 3.80)/camera.aspect);
    camera.position.copy(direction.normalize().multiplyScalar(distance));
    camera.lookAt(0,0.035,0); camera.updateMatrixWorld();
  }
  function render() { renderer.render(scene,camera); }
  return {renderer,scene,camera,world,reticle,cars,setCar,resize,resetWorld,render};
}
