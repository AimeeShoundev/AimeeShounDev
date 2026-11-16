import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/+esm';
import {MODEL_PATH, MOVABLE_NAMES, STATIC_NAMES, START_POSITION, MODEL_SCALE} from './settings.js';
const status=document.querySelector('#status'), names=document.querySelector('#names');
window.addEventListener('error',e=>{status.textContent='Error: '+e.message});window.addEventListener('unhandledrejection',e=>{status.textContent='Error: '+(e.reason?.message||e.reason)});
const scene=new THREE.Scene();scene.background=new THREE.Color('#263e57');scene.add(new THREE.HemisphereLight(0xffffff,0x4d5c6c,2.2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(8,15,6);scene.add(sun);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,400);camera.position.set(...START_POSITION);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.prepend(renderer.domElement);
const clock=new THREE.Clock(), ray=new THREE.Raycaster(), move=new Set();let yaw=0,pitch=0,world,held=null,entities=[],sceneRoot=null,playerBody,playerCollider,controller,verticalSpeed=0,playerReady=false;const tmp=new THREE.Vector3();
function boxCollider(obj,type){obj.updateWorldMatrix(true,false);const bounds=new THREE.Box3().setFromObject(obj);if(bounds.isEmpty())return;const size=bounds.getSize(new THREE.Vector3());if(Math.min(size.x,size.y,size.z)<.001)return;const center=bounds.getCenter(new THREE.Vector3());const body=world.createRigidBody(type==='dynamic'?RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x,center.y,center.z).setLinearDamping(1.5).setAngularDamping(2):RAPIER.RigidBodyDesc.fixed().setTranslation(center.x,center.y,center.z));world.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(.01,size.x/2),Math.max(.01,size.y/2),Math.max(.01,size.z/2)).setFriction(.8).setRestitution(type==='dynamic'?.25:0),body);return {body,center};}
function addMovable(obj){
  obj.updateWorldMatrix(true,false);
  const bounds=new THREE.Box3().setFromObject(obj), size=bounds.getSize(new THREE.Vector3()), center=bounds.getCenter(new THREE.Vector3());
  const wrapper=new THREE.Group();wrapper.position.copy(center);scene.add(wrapper);wrapper.attach(obj);
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x,center.y,center.z).setLinearDamping(1.7).setAngularDamping(2.2));
  const isBall=/ball/i.test(obj.name);
  const collider=isBall?RAPIER.ColliderDesc.ball(Math.max(.025,Math.max(size.x,size.y,size.z)/2)):RAPIER.ColliderDesc.cuboid(Math.max(.025,size.x/2),Math.max(.025,size.y/2),Math.max(.025,size.z/2));
  world.createCollider(collider.setFriction(.75).setRestitution(isBall?.7:.08),body);
  entities.push({obj,wrapper,body,localCtr:new THREE.Vector3()});
}
function staticTriCollider(mesh){
  // Preserve the real clubhouse mesh; collider follows its actual triangles, not a giant box.
  mesh.updateWorldMatrix(true,false);
  const g=mesh.geometry, pos=g.getAttribute('position'); if(!pos)return;
  const vertices=new Float32Array(pos.count*3), v=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);vertices[i*3]=v.x;vertices[i*3+1]=v.y;vertices[i*3+2]=v.z;}
  const indices=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:pos.count},(_,i)=>i);
  if(indices.length<3)return;
  try{world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,indices).setFriction(.85));}catch(err){console.warn('Collider skipped',mesh.name,err)}
}
try {await RAPIER.init();}catch(e){status.textContent='Physics engine failed: '+e.message;throw e;}world=new RAPIER.World({x:0,y:-9.81,z:0});
// Kinematic capsule player: the character controller resolves movement against
// floor, walls, furniture, and dynamic rigid bodies.
const EYE_HEIGHT=1.47, PLAYER_HALF_HEIGHT=.48, PLAYER_RADIUS=.27;
function initializePlayer(){
  const feetY=camera.position.y-EYE_HEIGHT;
  playerBody=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(camera.position.x,feetY+PLAYER_HALF_HEIGHT+PLAYER_RADIUS,camera.position.z));
  playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_HALF_HEIGHT,PLAYER_RADIUS)
    .setFriction(.7),playerBody);
  controller=world.createCharacterController(.035);
  controller.enableAutostep(.3,.12,true);
  controller.enableSnapToGround(.25);
  controller.setMaxSlopeClimbAngle(Math.PI/4);
  playerReady=true;
}
status.textContent='Loading original clubhouse...';
new GLTFLoader().load(MODEL_PATH,gltf=>{
 sceneRoot=gltf.scene;sceneRoot.scale.setScalar(MODEL_SCALE);scene.add(sceneRoot);sceneRoot.updateWorldMatrix(true,true);
 const player=sceneRoot.getObjectByName('PlayerStart');
 if(player){const p=player.getWorldPosition(new THREE.Vector3());camera.position.set(p.x,p.y+0.55,p.z);}
 const all=[];sceneRoot.traverse(o=>{if(o.isMesh)all.push(o)});
 const isMove=o=>/^(Video_Case_Bp|Blank_tape_bp|Ping_Pong_Paddle_Bp|Ping_Pong_Ball_bp)/i.test(o.name)&&!/UCX_/i.test(o.name);
 const movable=all.filter(isMove);
 // Collider meshes only for non-moving scenery. UCX meshes are invisible source collision proxies.
 const statics=all.filter(o=>!isMove(o)&&!/^(UCX_|RecastNavMesh)/i.test(o.name));
 for(const obj of statics){
   if(/^(House|shelf_bp|Ping_Pong_Shelf_Bp|Ping_Pong_Bp|TV_Stand_Bp|Cube2|door)/i.test(obj.name))staticTriCollider(obj);
 }
 // Detailed static triangle colliders already include shelf boards and table pieces.
 // Reinforce the ping-pong tabletop with a solid box to stop tunneling.
 const tableSurfaces=statics.filter(o=>/^Ping_Pong_Bp/i.test(o.name))
  .map(o=>({o,b:new THREE.Box3().setFromObject(o)}))
  .filter(({b})=>{const sz=b.getSize(new THREE.Vector3());return sz.x>1.2&&sz.z>2&&sz.y<.08&&b.min.y>.65&&b.max.y<.85;});
 if(tableSurfaces.length){
  const b=tableSurfaces[0].b,c=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3());
  const thickness=Math.max(.035,sz.y);
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(c.x,b.max.y-thickness/2,c.z));
  world.createCollider(RAPIER.ColliderDesc.cuboid(sz.x/2,thickness/2,sz.z/2).setFriction(.9).setRestitution(.12),body);
 }
 console.info('Shelf collider meshes:',statics.filter(o=>/^(shelf_bp|Ping_Pong_Shelf_Bp)/i.test(o.name)).length,'Table meshes:',statics.filter(o=>/^Ping_Pong_Bp/i.test(o.name)).length);
 // Dedicated SOLID floor slab. The clubhouse's actual floor is the thin
 // House mesh (approximately y=-0.01 to 0.10 in this GLB).
 // Trimesh alone can let the character start below/through a thin surface.
 const floorMesh=statics.filter(o=>/^House/i.test(o.name))
   .map(o=>({o,b:new THREE.Box3().setFromObject(o)}))
   .filter(x=>x.b.max.y<.35&&x.b.min.y>-.5)
   .sort((a,b)=>(b.b.max.x-b.b.min.x)*(b.b.max.z-b.b.min.z)-(a.b.max.x-a.b.min.x)*(a.b.max.z-a.b.min.z))[0];
 if(floorMesh){
   const b=floorMesh.b, c=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3());
   const slabThickness=.24, floorTop=b.max.y-.015;
   const slabBody=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(c.x,floorTop-slabThickness/2,c.z));
   world.createCollider(RAPIER.ColliderDesc.cuboid(sz.x/2,slabThickness/2,sz.z/2).setFriction(1),slabBody);
   // Start the player ABOVE the slab, not intersecting the surface.
   camera.position.y=Math.max(camera.position.y,floorTop+EYE_HEIGHT+.12);
   console.info('Solid clubhouse floor collider:',floorMesh.o.name,'top',floorTop,'bounds',b.min.toArray(),b.max.toArray());
 }else{
   console.warn('No dedicated House floor mesh detected. Using fallback clubhouse floor.');
   const slabBody=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(.9,-.10,-2.1));
   world.createCollider(RAPIER.ColliderDesc.cuboid(4,.18,4.5).setFriction(1),slabBody);
   camera.position.y=Math.max(camera.position.y,EYE_HEIGHT+.2);
 }
 initializePlayer();
 for(const obj of movable){
   const center=new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
   if(center.distanceTo(camera.position)>30){console.warn('Movable outside clubhouse skipped',obj.name,center.toArray());continue;}
   addMovable(obj);
 }
 names.textContent=all.map(o=>(isMove(o)?'[GRABBABLE] ':'')+o.name).join('\n');
 status.textContent=`Original clubhouse loaded — ${entities.length} grabbable objects. Aim at a tape and press E or click.`;
},e=>{if(e.total)status.textContent='Loading clubhouse '+Math.round(e.loaded/e.total*100)+'%';},e=>{
 status.textContent='ERROR: Original clubhouse GLB did not load. Check assets/clubhouse.glb and browser console.';console.error(e);
});
function look(dx,dy){yaw-=dx*.003;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.003));camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)}
let pointer=false,lastX=0,lastY=0,downX=0,downY=0;renderer.domElement.addEventListener('pointerdown',e=>{pointer=true;lastX=downX=e.clientX;lastY=downY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(pointer){look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY}});renderer.domElement.addEventListener('pointerup',e=>{pointer=false;if(Math.hypot(e.clientX-downX,e.clientY-downY)<8)toggleGrab()});
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF'].includes(e.code))e.preventDefault();move.add(e.code);if(!e.repeat&&e.code==='KeyE')toggleGrab();if(!e.repeat&&e.code==='KeyF')throwHeld()});window.addEventListener('keyup',e=>move.delete(e.code));document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();move.add(b.dataset.key)});for(const t of ['pointerup','pointercancel','pointerleave'])b.addEventListener(t,()=>move.delete(b.dataset.key))});document.querySelector('#grab').onclick=toggleGrab;document.querySelector('#throw').onclick=throwHeld;document.querySelector('#inspect').onclick=()=>names.hidden=!names.hidden;
function toggleGrab(){if(held){held.body.setGravityScale(1,true);held=null;return}ray.setFromCamera(new THREE.Vector2(0,0),camera);const hit=ray.intersectObjects(entities.map(e=>e.wrapper),true).find(h=>h.distance<4);if(hit){held=entities.find(e=>{let o=hit.object;while(o){if(o===e.wrapper)return true;o=o.parent}return false});held.body.setGravityScale(0,true);held.body.setLinvel({x:0,y:0,z:0},true)}}
function throwHeld(){if(!held)return;const dir=new THREE.Vector3();camera.getWorldDirection(dir);held.body.setGravityScale(1,true);held.body.setLinvel({x:dir.x*9,y:dir.y*9+2,z:dir.z*9},true);held=null}
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.033);
 const forward=(move.has('KeyW')||move.has('ArrowUp')?1:0)-(move.has('KeyS')||move.has('ArrowDown')?1:0);
 const side=(move.has('KeyD')||move.has('ArrowRight')?1:0)-(move.has('KeyA')||move.has('ArrowLeft')?1:0);
 const dir=new THREE.Vector3(side,0,-forward);
 if(dir.lengthSq())dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
 if(playerReady){
   verticalSpeed=Math.max(-20,verticalSpeed-9.81*dt);
   const desired={x:dir.x*dt*3.2,y:verticalSpeed*dt,z:dir.z*dt*3.2};
   controller.computeColliderMovement(playerCollider,desired);
   const correction=controller.computedMovement();
   const current=playerBody.translation();
   playerBody.setNextKinematicTranslation({x:current.x+correction.x,y:current.y+correction.y,z:current.z+correction.z});
   if(controller.computedGrounded()&&verticalSpeed<0)verticalSpeed=0;
   camera.position.set(current.x+correction.x,current.y+correction.y+EYE_HEIGHT-(PLAYER_HALF_HEIGHT+PLAYER_RADIUS),current.z+correction.z);
 }
 if(held){
   const f=new THREE.Vector3();camera.getWorldDirection(f);
   const target=camera.position.clone().addScaledVector(f,1.6);
   const p=held.body.translation();
   held.body.setLinvel({x:(target.x-p.x)*12,y:(target.y-p.y)*12,z:(target.z-p.z)*12},true);
 }
 world.timestep=dt;world.step();
 for(const e of entities){
   const p=e.body.translation(),q=e.body.rotation();
   e.wrapper.quaternion.set(q.x,q.y,q.z,q.w);
   e.wrapper.position.set(p.x,p.y,p.z).sub(e.localCtr.clone().applyQuaternion(e.wrapper.quaternion));
 }
 renderer.render(scene,camera);
}
animate();window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
