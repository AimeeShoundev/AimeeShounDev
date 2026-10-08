import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// This is your existing pizza-maker URL. Change it here if the URL moves.
const PIZZA_MAKER_URL = 'https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/3dNeighborhoodGame/pizza-maker/index.html';

const $ = id => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x292438);
const camera = new THREE.PerspectiveCamera(53, innerWidth / innerHeight, .1, 120);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;
scene.add(new THREE.HemisphereLight(0xffe8c9,0x666d96,2.6));
const sun = new THREE.DirectionalLight(0xffe5c0,3.1);
sun.position.set(-5,13,9);scene.add(sun);
const fill = new THREE.DirectionalLight(0xaec9ff,1.3);
fill.position.set(5,6,-9);scene.add(fill);

const loader = new GLTFLoader();
let player, mixer, walkAction, playing = false, elapsed = 0;
let station = new THREE.Vector3(-2.5,0,-4.6); // overwritten by the named GLB node
const spawn = new THREE.Vector3(1.8,0,-1.6);
const keys = new Set();
const speed = 3.3;
const clock = new THREE.Clock();
const cameraTarget = new THREE.Vector3();
const idealCamera = new THREE.Vector3();
const movement = new THREE.Vector3();
const cameraLook = new THREE.Vector3();
// Drag the scene with the left mouse button to orbit around the player.
let orbitYaw = Math.atan2(2.2, 6.9);
let orbitPitch = 0.29;
let orbitDistance = 7.3;
let draggingCamera = false;
let lastMouseX = 0;
let lastMouseY = 0;
canvas.addEventListener('pointerdown', event => {
  if (!playing || event.pointerType === 'mouse' && event.button !== 0) return;
  draggingCamera = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!draggingCamera) return;
  const dx = event.clientX - lastMouseX;
  const dy = event.clientY - lastMouseY;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  orbitYaw -= dx * 0.006;
  orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * 0.004, -0.23, 1.08);
});
function stopCameraDrag(){ draggingCamera = false; }
canvas.addEventListener('pointerup', stopCameraDrag);
canvas.addEventListener('pointercancel', stopCameraDrag);
canvas.addEventListener('lostpointercapture', stopCameraDrag);
window.addEventListener('blur', stopCameraDrag);
canvas.addEventListener('wheel', event => {
  if (!playing) return;
  event.preventDefault();
  orbitDistance = THREE.MathUtils.clamp(orbitDistance + Math.sign(event.deltaY) * 0.55, 3, 11);
}, {passive:false});
const load = path => new Promise((resolve,reject) => {
  const timer=setTimeout(()=>reject(new Error('Timed out loading '+path+' — check that it exists in the extracted folder.')),20000);
  loader.load(path, v=>{clearTimeout(timer);resolve(v)}, undefined, e=>{clearTimeout(timer);reject(new Error('Failed to load '+path+': '+(e?.message||e)))});
});

function showError(err){
  console.error(err);
  $('errorText').textContent=String(err?.message||err);
  $('loading').classList.add('hidden');$('start').classList.add('hidden');
  $('error').classList.remove('hidden');
}

async function setup(){
  try{
    $('loadingText').textContent='Loading your pizza shop…';
    const shop = await load('./pizzashop.glb');
    scene.add(shop.scene);
    shop.scene.updateMatrixWorld(true);
    const targetNode = shop.scene.getObjectByName('PIZZA_STATION_BASE_INTERACTIVE');
    if(targetNode) targetNode.getWorldPosition(station);
    // Shop models include animated workers and customers.
    if(shop.animations.length){
      const shopMixer=new THREE.AnimationMixer(shop.scene);
      for(const clip of shop.animations) shopMixer.clipAction(clip).play();
      scene.userData.shopMixer=shopMixer;
    }
    $('progress').style.width='55%';
    $('loadingText').textContent='Loading your pizza guy…';
    const avatar = await load('./character2.glb');
    player = new THREE.Group();
    player.position.copy(spawn);
    const model = avatar.scene;
    // Rig uses Blender-style local forward (+Z). Rotate this model if your animation faces backward.
    model.rotation.y = 0;
    // Keep original model proportions; 1 unit = 1 meter in the shop.
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.getSize(new THREE.Vector3()).y;
    if(height > .1) model.scale.setScalar(1.85/height);
    model.updateMatrixWorld(true);
    const groundBounds = new THREE.Box3().setFromObject(model);
    model.position.y -= groundBounds.min.y;
    player.add(model);
    scene.add(player);
    mixer = new THREE.AnimationMixer(model);
    const walkClip = avatar.animations.find(a=>a.name==='Walk_Carry_Pizza_Box') || avatar.animations[0];
    if(walkClip){
      walkAction=mixer.clipAction(walkClip);
      walkAction.play();
      walkAction.paused=true;
    }
    // Distinct highlight on the actual location of the pizza-making station.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(.75,.95,40),
      new THREE.MeshBasicMaterial({color:0xffb647,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false})
    );
    ring.rotation.x=-Math.PI/2;
    ring.position.set(station.x, .045, station.z+1.75);
    scene.add(ring);
    scene.userData.ring=ring;
    camera.position.set(spawn.x+2.2,spawn.y+2.5,spawn.z+6.9);
    cameraLook.copy(player.position).add(new THREE.Vector3(0,1.3,-1.2));
    camera.lookAt(cameraLook);
    $('progress').style.width='100%';
    $('loading').classList.add('hidden');
    $('start').classList.remove('hidden');
    animate();
  }catch(err){showError(err)}
}

// The front checkout counter is intentionally NOT a collision barrier.
// This lets the player walk from the customer area behind the counter
// and reach the pizza-making station. The prep counter remains solid.
const blocks = [
  {minX:-7.2,maxX:3.6,minZ:-5.9,maxZ:-4.05}, // pizza prep counter only
];
function canStand(x,z){
  const r=.34;
  if(x<-8.2+r || x>8.2-r || z<-6.45+r || z>6.45-r)return false;
  return !blocks.some(b=>x>b.minX-r && x<b.maxX+r && z>b.minZ-r && z<b.maxZ+r);
}
function interact(){
  if(playing && !$('interact').classList.contains('hidden')) window.location.assign(PIZZA_MAKER_URL);
}
$('play').addEventListener('click',()=>{$('start').classList.add('hidden'); playing=true;});
$('makePizza').addEventListener('click',interact);
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if((k==='enter'||k==='e')&&playing){interact();return;}
  keys.add(k);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
for(const btn of document.querySelectorAll('[data-dir]')){
  const direction=btn.dataset.dir;
  const down=e=>{e.preventDefault();keys.add(direction);btn.classList.add('pressed');if(btn.setPointerCapture)btn.setPointerCapture(e.pointerId)};
  const up=e=>{e.preventDefault();keys.delete(direction);btn.classList.remove('pressed')};
  btn.addEventListener('pointerdown',down);
  btn.addEventListener('pointerup',up);
  btn.addEventListener('pointercancel',up);
  btn.addEventListener('lostpointercapture',up);
}
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  elapsed += dt;
  if(scene.userData.shopMixer)scene.userData.shopMixer.update(dt);
  movement.set(0,0,0);
  if(playing){
    if(keys.has('w')||keys.has('arrowup')||keys.has('up'))movement.z-=1;
    if(keys.has('s')||keys.has('arrowdown')||keys.has('down'))movement.z+=1;
    if(keys.has('a')||keys.has('arrowleft')||keys.has('left'))movement.x-=1;
    if(keys.has('d')||keys.has('arrowright')||keys.has('right'))movement.x+=1;
  }
  const walking=movement.lengthSq()>0;
  if(walking){
    movement.normalize().multiplyScalar(speed*dt);
    if(canStand(player.position.x+movement.x,player.position.z))player.position.x+=movement.x;
    if(canStand(player.position.x,player.position.z+movement.z))player.position.z+=movement.z;
    // Model's natural facing direction is +Z.
    const desiredYaw=Math.atan2(movement.x,movement.z);
    const diff=Math.atan2(Math.sin(desiredYaw-player.rotation.y),Math.cos(desiredYaw-player.rotation.y));
    player.rotation.y+=diff*Math.min(1,dt*11);
  }
  if(walkAction)walkAction.paused=!walking;
  if(mixer && walking)mixer.update(dt);
  // Smooth third-person orbit camera. Height always follows the player's floor level.
  cameraLook.set(player.position.x, player.position.y + 1.25, player.position.z);
  const horizontalDistance = Math.cos(orbitPitch) * orbitDistance;
  cameraTarget.set(
    player.position.x + Math.sin(orbitYaw) * horizontalDistance,
    player.position.y + 1.25 + Math.sin(orbitPitch) * orbitDistance,
    player.position.z + Math.cos(orbitYaw) * horizontalDistance
  );
  idealCamera.copy(cameraTarget);
  camera.position.lerp(idealCamera, 1 - Math.exp(-dt * 9));
  camera.lookAt(cameraLook);
  const d=Math.hypot(player.position.x-station.x,player.position.z-(station.z+1.65));
  const near=playing && d<2.15;
  $('interact').classList.toggle('hidden',!near);
  $('objective').textContent=near?'Press Enter to make pizza':'Head to the pizza station';
  if(scene.userData.ring){
    const ring=scene.userData.ring;
    ring.material.opacity=.45+.4*(.5+.5*Math.sin(elapsed*3));
    ring.scale.setScalar(1+.07*Math.sin(elapsed*3));
  }
  renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
setup();
