import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const sceneEl=document.getElementById('scene');
const status=document.getElementById('loadStatus');
const errorBox=document.getElementById('errorBox');
const errorMessage=document.getElementById('errorMessage');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#a9c9e4');
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.035,1500);
camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.45;
sceneEl.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x7b91ad,3.4));
const sun=new THREE.DirectionalLight(0xffffff,2.1);sun.position.set(-75,110,45);scene.add(sun);
const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(45,50,-70);scene.add(fill);
const keys=new Set(), touchMoves=new Set();
const clock=new THREE.Clock();
let yaw=0,pitch=0,loaded=false,dragging=false,activePointer=null,lastX=0,lastY=0;
// Coordinates converted from the PlayerStart object embedded in House_Level.fbx.
const start=new THREE.Vector3(-60.433,1.65,47.50);
const lookTarget=new THREE.Vector3(-61,1.4,44.0);
const speed=3.8;
function setView(y,p){yaw=y;pitch=THREE.MathUtils.clamp(p,-1.52,1.52);camera.rotation.set(pitch,yaw,0,'YXZ');}
function face(target){const d=target.clone().sub(camera.position);setView(Math.atan2(-d.x,-d.z),Math.atan2(d.y,Math.hypot(d.x,d.z)));}
function reset(){camera.position.copy(start);face(lookTarget);}
reset();
function error(message){loaded=false;status.hidden=true;status.style.display='none';errorBox.hidden=false;errorMessage.textContent=message;console.error(message);}
const timeout=setTimeout(()=>{if(!loaded)error('Model loading took too long. Check that assets/house.glb was uploaded and that the site is hosted over HTTPS.');},25000);
new GLTFLoader().load('assets/house.glb',gltf=>{
 clearTimeout(timeout);
 scene.add(gltf.scene);
 let count=0;
 gltf.scene.traverse(obj=>{
  if(obj.isMesh){count++;obj.material.side=THREE.DoubleSide;obj.frustumCulled=false;}
 });
 if(!count){error('The converted model contained no meshes.');return;}
 loaded=true;
 errorBox.hidden=true;
 status.style.display='none';status.hidden=true;
 console.log('House ready:',count,'meshes');
},e=>{if(e.total)status.textContent=`Loading 3D house… ${Math.round(100*e.loaded/e.total)}%`;},e=>{clearTimeout(timeout);error('Could not open assets/house.glb: '+(e?.message||e));});

window.addEventListener('keydown',e=>{
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.code==='KeyR')reset();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touchMoves.clear();dragging=false;});
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{dragging=true;activePointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
 if(!dragging||activePointer!==e.pointerId||!loaded)return;
 setView(yaw-(e.clientX-lastX)*.0038,pitch-(e.clientY-lastY)*.0038);
 lastX=e.clientX;lastY=e.clientY;
});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,e=>{if(e.pointerId===activePointer)dragging=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const mouseBtn=document.getElementById('viewBtn');
mouseBtn.addEventListener('click',()=>{if(document.pointerLockElement===canvas)document.exitPointerLock();else canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{mouseBtn.textContent=document.pointerLockElement===canvas?'Mouse look: On':'Mouse look: Off';});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&loaded)setView(yaw-e.movementX*.002,pitch-e.movementY*.002);});
document.getElementById('homeBtn').addEventListener('click',reset);
for(const btn of document.querySelectorAll('[data-move]')){
 const dir=btn.dataset.move;
 btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);touchMoves.add(dir);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>touchMoves.delete(dir));
}
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.06);
 if(loaded){
  const forward=Number(keys.has('KeyW')||keys.has('ArrowUp')||touchMoves.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||touchMoves.has('back'));
  const side=Number(keys.has('KeyD')||keys.has('ArrowRight')||touchMoves.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||touchMoves.has('left'));
  if(forward||side){const step=speed*(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.2:1)*dt/Math.hypot(forward,side);
   camera.position.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*step;
   camera.position.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*step;
  }
 }
 renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
animate();
