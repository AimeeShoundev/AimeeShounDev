import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
const $=id=>document.getElementById(id);const serverURL=window.SKYBOUND_SERVER_URL;
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,150);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;$('stage').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x435a75,2.6));const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(2,6,4);scene.add(sun);
const world=new THREE.Group();scene.add(world);world.visible=false;
const mat=(c,roughness=.7)=>new THREE.MeshStandardMaterial({color:c,roughness,metalness:.12});
const asphalt=mat(0x273645),grass=mat(0x247f64),white=mat(0xe9f2e8),gold=mat(0xf9c34e),red=mat(0xf25858),blue=mat(0x37d5e6);
function mesh(geo,m,parent=world,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o}
mesh(new THREE.CylinderGeometry(1.55,1.55,.055,72),grass,world,0,-.055,0);
// Flat elliptical racing road: scaled ring, with a visible central island.
const road=mesh(new THREE.RingGeometry(.66,1.12,96),asphalt);road.rotation.x=-Math.PI/2;road.scale.set(1.12,.78,1);road.position.y=.005;
const island=mesh(new THREE.CircleGeometry(.65,96),mat(0x329b75));island.rotation.x=-Math.PI/2;island.scale.set(1.12,.78,1);island.position.y=.012;
for(let i=0;i<48;i++){const a=i*Math.PI*2/48;const stripe=mesh(new THREE.BoxGeometry(.055,.004,.025),white);stripe.position.set(Math.cos(a)*.89*1.12,.017,Math.sin(a)*.89*.78);stripe.rotation.y=-a;}
for(let i=0;i<16;i++){const a=i*Math.PI*2/16;const edge=mesh(new THREE.BoxGeometry(.12,.013,.045),i%2?white:red);edge.position.set(Math.cos(a)*1.12*1.10,.018,Math.sin(a)*.78*1.10);edge.rotation.y=-a;}
for(let j=0;j<8;j++){const tile=mesh(new THREE.BoxGeometry(.055,.005,.055),j%2?white:asphalt);tile.position.set(.89*1.12,.021,(j-3.5)*.04);}
function createCar(color){const group=new THREE.Group();world.add(group);mesh(new THREE.BoxGeometry(.12,.055,.20),mat(color,.35),group,0,.06,0);mesh(new THREE.BoxGeometry(.09,.04,.09),mat(0x9cecff,.15),group,0,.105,-.015);for(const x of [-.067,.067])for(const z of [-.063,.063]){const wheel=mesh(new THREE.BoxGeometry(.025,.047,.045),mat(0x131b26),group,x,.04,z);wheel.rotation.z=.1;}mesh(new THREE.BoxGeometry(.09,.012,.015),gold,group,0,.067,-.104);return group}
const cars=[createCar(0xffbf4a),createCar(0x3bdbf0)];const ghost=mesh(new THREE.RingGeometry(.095,.12,32),new THREE.MeshBasicMaterial({color:0x8cfff0,side:THREE.DoubleSide}),scene);ghost.rotation.x=-Math.PI/2;ghost.visible=false;
const socket=window.io?io(serverURL,{autoConnect:true,transports:['websocket','polling'],reconnection:true}):null;
let me=null,room=null,placed=false,arActive=false,preview=false,hitSource=null,viewerSpace=null,refSpace=null,started=false,latestWinner=null,hitPose=null,arSession=null;
const controls={gas:false,brake:false,left:false,right:false};let lastDrive=0;
function toast(s){$('toast').textContent=s;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),3800)}
function status(s){$('status').textContent=s}
if(!socket){status('Multiplayer library failed to load');toast('Socket.IO did not load. Check your internet connection.')}else{socket.on('connect',()=>status('Server connected'));socket.on('disconnect',()=>status('Reconnecting to Render…'));socket.on('connect_error',()=>status('Render waking up…'));socket.on('room',r=>{room=r;updateRoom();updateCars()});socket.on('start',()=>{started=true;latestWinner=null;$('winner').classList.add('hidden');toast('GO! Three laps to win!');updateRoom()});socket.on('finish',r=>{started=false;latestWinner=r;$('winnerText').textContent=(r.id===me?'🏆 You win!':'🏁 '+r.name+' wins!');$('winner').classList.remove('hidden');updateRoom()})}
function updateRoom(){if(!room)return;const players=room.players;$('roomTitle').textContent='Room '+room.code;$('players').textContent=players.map(p=>`${p.name}${p.id===me?' (you)':''}${p.ready?' ✓ Ready':''}`).join('   •   ')+'  — '+players.length+'/2 racers';const mine=players.find(p=>p.id===me);$('ready').disabled=!(placed&&players.length===2&&!started&&!mine?.ready);$('ready').textContent=mine?.ready?'Waiting for opponent…':'Ready to race';$('roomPanel').classList.toggle('hidden',started||Boolean(latestWinner));$('controls').classList.toggle('hidden',!started);$('score').classList.toggle('hidden',!started);if(mine){$('lap').textContent='Lap '+Math.min(3,Math.floor(mine.progress)+1)+' / 3';$('speed').textContent=Math.round(mine.speed*110)+' km/h';$('place').textContent=players.length===2?(mine.progress>=Math.max(...players.filter(p=>p.id!==me).map(p=>p.progress))?'1st place':'2nd place'):'Waiting'}}
function updateCars(){if(!room)return;room.players.forEach((p,i)=>{const car=cars[i];car.visible=true;const a=-Math.PI/2+p.progress*Math.PI*2;const radius=.89+p.lane*.11;car.position.set(Math.cos(a)*radius*1.12,.03,Math.sin(a)*radius*.78);car.rotation.y=-a;});cars.forEach((c,i)=>{if(i>=room.players.length)c.visible=false});}
$('join').onclick=()=>{if(!socket?.connected){toast('Waiting for Render server. Try again in a minute.');return}socket.emit('join',{code:$('roomCode').value,name:$('name').value},r=>{if(!r?.ok){toast(r?.error||'Could not join');return}me=r.id;$('menu').classList.add('hidden');$('roomPanel').classList.remove('hidden');toast('Room joined! Choose Ground AR or 3D Preview.');updateRoom()})};
$('ready').onclick=()=>{if(!placed){toast('Place the racetrack first.');return}socket?.emit('ready')};$('reset').onclick=$('again').onclick=()=>{socket?.emit('restart');latestWinner=null;$('winner').classList.add('hidden')};
function setPlaced(){placed=true;world.visible=true;ghost.visible=false;$('roomPanel').classList.toggle('hidden',!room);$('placeTrack').classList.add('hidden');$('crosshair').classList.add('hidden');$('placement').textContent='Track placed! Both players can now tap Ready to race.';updateRoom();toast('Track placed on the ground!')}
function startPreview(){preview=true;arActive=false;renderer.xr.enabled=true;scene.background=new THREE.Color(0x102d46);world.position.set(0,0,0);world.scale.setScalar(1);world.rotation.set(0,0,0);camera.position.set(0,2.4,2.7);camera.lookAt(0,0,0);setPlaced();$('menu').classList.add('hidden');$('roomPanel').classList.toggle('hidden',!room);if(!room)toast('Join a multiplayer room to race.');}
$('preview').onclick=startPreview;$('previewRoom').onclick=startPreview;
// True markerless Android ARCore surface detection using WebXR hit-test.
// Requires Chrome on an ARCore-compatible Android phone, HTTPS, and Google Play Services for AR.
async function checkAR(){
 if(!window.isSecureContext || !navigator.xr){$('help').textContent='Ground AR requires HTTPS and Android Chrome on an ARCore-supported phone.';return}
 try{const ok=await navigator.xr.isSessionSupported('immersive-ar');$('ar').disabled=!ok;$('arRoom').disabled=!ok;
 $('help').textContent=ok?'Ground AR available. Tap Start Ground AR, scan the floor, then Place Track.':'AR unavailable: update Chrome and Google Play Services for AR, or try an ARCore-supported phone.'}
 catch(e){$('help').textContent='AR support check failed: '+e.message}
}
checkAR();
function placeAtHit(){
 if(!arActive||placed||!hitPose){toast('No plane detected yet. Move the phone slowly over a textured, well-lit floor.');return}
 world.position.copy(ghost.position);world.quaternion.copy(ghost.quaternion);world.scale.setScalar(.72);setPlaced();
}
$('placeTrack').addEventListener('click',e=>{e.preventDefault();placeAtHit()});
async function launchAR(){
 if(!navigator.xr){toast('WebXR is not available on this phone.');return}
 try{
 // DOM overlay is required so steering and Place Track buttons remain usable in immersive AR.
 // local-floor is NOT required: many valid ARCore devices support local but reject local-floor.
 const session=await navigator.xr.requestSession('immersive-ar',{
   requiredFeatures:['hit-test','dom-overlay'],
   optionalFeatures:['local-floor'],
   domOverlay:{root:document.body}
 });
 arSession=session;arActive=true;preview=false;placed=false;hitPose=null;
 world.visible=false;scene.background=null;
 renderer.xr.setReferenceSpaceType('local');
 await renderer.xr.setSession(session);
 refSpace=await session.requestReferenceSpace('local');
 viewerSpace=await session.requestReferenceSpace('viewer');
 hitSource=await session.requestHitTestSource({space:viewerSpace});
 $('menu').classList.add('hidden');$('roomPanel').classList.add('hidden');
 $('crosshair').classList.remove('hidden');$('placeTrack').classList.remove('hidden');$('placeTrack').disabled=true;
 $('placement').textContent='Scan the floor until the green ring appears, then tap Place Track.';
 $('crosshair').textContent='Scan a well-lit floor slowly to find a horizontal surface…';
 session.addEventListener('select',()=>{if(!placed&&hitPose)placeAtHit()});
 session.addEventListener('end',()=>{
  arActive=false;arSession=null;hitPose=null;hitSource?.cancel?.();hitSource=null;ghost.visible=false;
  $('crosshair').classList.add('hidden');$('placeTrack').classList.add('hidden');
  if(!preview){world.visible=false;placed=false;updateRoom();$('roomPanel').classList.toggle('hidden',!room);toast('AR ended. Restart Ground AR or use 3D Preview.')}
 });
 }catch(e){
  arActive=false;arSession=null;hitPose=null;
  $('placeTrack').classList.add('hidden');$('crosshair').classList.add('hidden');
  toast('Could not start ground AR: '+e.message);
  $('help').textContent='AR error: '+e.message+' — Chrome and Google Play Services for AR must be up to date.';
 }
}
$('ar').onclick=launchAR;$('arRoom').onclick=launchAR;
function hold(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);controls[key]=true});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>controls[key]=false)}hold('gas','gas');hold('brake','brake');hold('left','left');hold('right','right');
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const k={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(k){controls[k]=true;e.preventDefault()}});window.addEventListener('keyup',e=>{const k={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'}[e.code];if(k)controls[k]=false});
renderer.setAnimationLoop((t,frame)=>{if(arActive&&frame&&hitSource&&!placed){const hits=frame.getHitTestResults(hitSource);hitPose=hits.length?hits[0].getPose(refSpace):null;if(hitPose){ghost.visible=true;ghost.position.set(hitPose.transform.position.x,hitPose.transform.position.y+.012,hitPose.transform.position.z);ghost.quaternion.set(hitPose.transform.orientation.x,hitPose.transform.orientation.y,hitPose.transform.orientation.z,hitPose.transform.orientation.w);$('placeTrack').disabled=false;$('crosshair').textContent='Surface detected! Tap PLACE TRACK.'}else{ghost.visible=false;$('placeTrack').disabled=true;$('crosshair').textContent='Scan slowly over a well-lit, textured floor.'}}if(started&&socket?.connected&&t-lastDrive>80){lastDrive=t;socket.emit('drive',{gas:controls.gas,brake:controls.brake,steer:Number(controls.right)-Number(controls.left)})}renderer.render(scene,camera)});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
