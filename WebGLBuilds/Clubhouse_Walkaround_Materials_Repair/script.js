import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91b2ce);
const camera = new THREE.PerspectiveCamera(76, 1, .04, 400);
scene.add(new THREE.HemisphereLight(0xffffff,0xb5af9f,1.8));
const sun = new THREE.DirectionalLight(0xffffff,1.05);
sun.position.set(1,9,4); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff,0.45);
fill.position.set(-4,4,-6);scene.add(fill);
let bounds = new THREE.Box3(new THREE.Vector3(-3,0,-7),new THREE.Vector3(5,3,3));
let player = new THREE.Vector3(1.6,1.6,-4.7);
let yaw = 0.25, pitch = -0.05, overview = false;
const keys = new Set();const touch = new Set();
function inside(){overview=false;player.set(1.6,1.55,-4.7);yaw=.15;pitch=0;camera.fov=76;camera.updateProjectionMatrix();updateCamera();}
function showOverview(){overview=true;const ctr=bounds.getCenter(new THREE.Vector3());const size=bounds.getSize(new THREE.Vector3());camera.position.set(ctr.x,Math.max(size.x,size.z)*1.25+4,ctr.z+Math.max(size.x,size.z)*.38);camera.lookAt(ctr);camera.fov=65;camera.updateProjectionMatrix();}
function updateCamera(){if(overview)return;camera.position.copy(player);camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;camera.rotation.z=0;}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();inside();
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touch.clear();});
for(const b of document.querySelectorAll('[data-move]')){const dir=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(dir);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>touch.delete(dir));}
let dragging=false,lastX=0,lastY=0,dragPointer=null;
canvas.addEventListener('pointerdown',e=>{if(overview)return;dragging=true;dragPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragPointer||overview)return;let dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.0035,-1.35,1.35);updateCamera();});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>dragging=false);
document.getElementById('inside').addEventListener('click',inside);
document.getElementById('overview').addEventListener('click',showOverview);
document.getElementById('fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.();});
const clock = new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.055);if(!overview){const f=Number(keys.has('KeyW')||keys.has('ArrowUp')||touch.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||touch.has('backward'));const r=Number(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'));if(f||r){const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const move=forward.multiplyScalar(f).addScaledVector(right,r).normalize();const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?4.2:2.1;player.addScaledVector(move,speed*dt); // constrain wandering to building area; no wall collision
player.x=THREE.MathUtils.clamp(player.x,bounds.min.x+.4,bounds.max.x-.4);
player.z=THREE.MathUtils.clamp(player.z,bounds.min.z+.4,bounds.max.z-.4);
updateCamera();}}renderer.render(scene,camera);}
animate();
const loader=new GLTFLoader();
loader.load('assets/clubhouse.glb?v=materials-repair-20261115',gltf=>{
 const root=gltf.scene;scene.add(root);
 const roomBox=new THREE.Box3();
 root.traverse(obj=>{
  if(!obj.isMesh)return;
  // Ignore the original large sky backdrop and distant ping-pong test objects.
  if(/SM_SkySphere|SkySphere|^UCX_|Ping_Pong_Ball_bp/i.test(obj.name)){obj.visible=false;return;}
  obj.frustumCulled=false;
  // Keep the exact PBR materials imported from the GLB. Never replace them with flat color materials.
  if(obj.material){
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const mat of mats){
      if(mat.map){ mat.map.colorSpace=THREE.SRGBColorSpace; mat.map.needsUpdate=true; }
      if(mat.emissiveMap){mat.emissiveMap.colorSpace=THREE.SRGBColorSpace;}
      mat.needsUpdate=true;
    }
  }
  const bb=new THREE.Box3().setFromObject(obj);
  if(!bb.isEmpty()&&bb.getSize(new THREE.Vector3()).length()<40&&Math.abs(bb.getCenter(new THREE.Vector3()).x)<20&&Math.abs(bb.getCenter(new THREE.Vector3()).z)<20)roomBox.union(bb);
 });
 if(!roomBox.isEmpty())bounds.copy(roomBox);
 // Known good interior spawn based on the building footprint in the uploaded model.
 inside();
 const allMats=new Set();let texturedMats=0, meshCount=0;
 root.traverse(o=>{if(o.isMesh&&o.visible){meshCount++;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m)allMats.add(m);});}});
 allMats.forEach(m=>{if(m.map)texturedMats++;});
 document.getElementById('modelStatus').textContent=`Model loaded · ${meshCount} meshes · ${texturedMats} image-textured materials`;
 document.getElementById('loading').style.display='none';
},evt=>{if(evt.total){document.getElementById('progress').style.width=Math.round(evt.loaded/evt.total*100)+'%';document.getElementById('loadText').textContent=Math.round(evt.loaded/1048576)+' MB loaded';}},err=>{
 document.getElementById('loading').style.display='none';document.getElementById('error').hidden=false;document.getElementById('errorDetail').textContent=String(err?.message||err);
});
