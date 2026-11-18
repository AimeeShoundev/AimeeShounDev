import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {prepareTapes,TapeInspector} from './tapes.js';

const $=id=>document.getElementById(id);
const ui=$('ui'), surface=$('gesture-plane');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.02,60);
let renderer;
try {
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
} catch(error) {
  $('loading-text').textContent='This browser could not start 3D graphics. Open this page in an updated Chrome or Safari browser.';
  $('retry-load').hidden=false;
  $('retry-load').onclick=()=>location.reload();
  $('shelf-settings').hidden=true;
  $('support-note').textContent='3D graphics are unavailable in this browser.';
  $('help-button').onclick=()=>$('help-sheet').hidden=false;
  $('close-help').onclick=()=>$('help-sheet').hidden=true;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
renderer.xr.enabled=true;
renderer.xr.setReferenceSpaceType('local');
$('viewport').appendChild(renderer.domElement);

const controls=new OrbitControls(camera,surface);
controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;
controls.minDistance=1.3;controls.maxDistance=7;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.52;
const pmrem=new THREE.PMREMGenerator(renderer);
const roomEnvironment=new RoomEnvironment();
const env=pmrem.fromScene(roomEnvironment,.04);
scene.environment=env.texture;scene.environmentIntensity=.7;
roomEnvironment.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xe1eeff,0x5a647c,1.9));
const keyLight=new THREE.DirectionalLight(0xfff4e2,2.6);keyLight.position.set(2,5,4);scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0xc5deff,1.2);fillLight.position.set(-3,2,1);scene.add(fillLight);

// Separate tracked pose, user rotation and size: changing size never moves the floor contact.
const placement=new THREE.Group(), orientation=new THREE.Group(), shelfRoot=new THREE.Group();
scene.add(placement);placement.add(orientation);orientation.add(shelfRoot);
const previewDecor=new THREE.Group();scene.add(previewDecor);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
const ctx=shadowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,6,64,64,64);
gradient.addColorStop(0,'rgba(0,0,0,.5)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.001;previewDecor.add(shadow);
const grid=new THREE.GridHelper(20,40,0x47617f,0x34475f);grid.material.transparent=true;grid.material.opacity=.15;grid.position.y=-.005;previewDecor.add(grid);

const reticle=new THREE.Group();reticle.visible=false;reticle.matrixAutoUpdate=false;scene.add(reticle);
const ring=new THREE.Mesh(new THREE.RingGeometry(.09,.115,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xf5cb62,side:THREE.DoubleSide,depthTest:false}));
const dot=new THREE.Mesh(new THREE.CircleGeometry(.016,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xf5cb62,side:THREE.DoubleSide,depthTest:false}));
reticle.add(ring,dot);

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let model=null,records=[],inspector=null,loaded=false,arSupported=false;
let mode='preview',xrSession=null,hitSource=null,anchor=null,pendingPlace=false;
let placementGeneration=0,tracking=false,lastTrackingMessage=false;
let toastTimer=null,lastTime=0,activeSheet=null,previousFocus=null;
const poseMatrix=new THREE.Matrix4(),posePosition=new THREE.Vector3(),poseQuaternion=new THREE.Quaternion(),poseScale=new THREE.Vector3();
const viewPosition=new THREE.Vector3(),yawQuaternion=new THREE.Quaternion(),axisY=new THREE.Vector3(0,1,0);
const originalCameraPosition=new THREE.Vector3();

function announce(message,duration=4200) {
  $('toast').textContent=message;$('toast').hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,duration);
}

function viewCamera() {
  if(renderer.xr.isPresenting){const xrCamera=renderer.xr.getCamera();return xrCamera.cameras[0] || xrCamera;}
  return camera;
}

function syncUI() {
  const holding=Boolean(inspector?.record);
  document.body.classList.toggle('inspect',holding);
  $('browse-dock').hidden=holding;$('inspect-dock').hidden=!holding;
  $('shelf-settings').hidden=holding || !loaded;
  $('browse-button').disabled=!loaded||mode==='scanning';
  controls.enabled=mode==='preview' && !holding && !activeSheet;
  if(holding){
    $('tape-title').textContent=inspector.record.title;
    $('tape-count').textContent=`${String(inspector.record.index+1).padStart(2,'0')} / ${records.length}`;
    $('return-button').disabled=inspector.phase==='back';
    $('return-button').textContent=inspector.phase==='back'?'Returning…':'Return to shelf';
    $('spin-button').setAttribute('aria-pressed',String(inspector.autoSpin));
    for(const id of ['front-button','back-button','spin-button','closer-button','farther-button'])$(id).disabled=inspector.phase==='back';
  }
  $('enter-ar').hidden=mode!=='preview';
  $('place-button').hidden=mode!=='scanning';
  $('ar-controls').hidden=mode!=='placed';
  $('exit-ar').hidden=mode==='preview';
  $('mode-label').textContent=mode==='preview'?'3D PREVIEW':'ROOM AR';
  $('dock-eyebrow').textContent=mode==='scanning'?'FIND YOUR SPOT':mode==='placed'?'YOUR ROOM, YOUR COLLECTION':'TAKE YOUR PICK';
  $('dock-title').textContent=mode==='scanning'?'Slowly scan an open floor.':'Pick a tape. Take a closer look.';
  $('dock-hint').textContent=mode==='scanning'?'Move your phone gently until the gold placement ring appears.':mode==='placed'?'Tap a tape to bring it closer, then drag to turn it.':'Tap any cover to pick it up. Drag the view to explore the shelf.';
  updateLayout();
}

function updateLayout() {
  if(renderer.xr.isPresenting)return;
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h);camera.aspect=w/h;
  // Leave space for the collection introduction and the bottom controls.
  const wide=w>760, dock=$('browse-dock');
  const dockHeight=dock.hidden?$('inspect-dock').getBoundingClientRect().height:dock.getBoundingClientRect().height;
  camera.setViewOffset(w,h,wide?-w*.15:0,Math.max(15,(dockHeight-65)*.45),w,h);
  camera.updateProjectionMatrix();
}

function frameShelf() {
  const h=Number($('shelf-height').value)/100;
  const aspect=innerWidth/innerHeight;
  const usableFraction=innerWidth>760?.68:innerHeight<500?.65:.52;
  const fitHeight=h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*usableFraction);
  const fitWidth=h*1.16/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*aspect*(innerWidth>760?.55:.88));
  const distance=Math.max(fitHeight,fitWidth);
  camera.position.set(.16,h*.55,distance);
  controls.target.set(0,h*.48,0);controls.update();
  originalCameraPosition.copy(camera.position);controls.saveState();updateLayout();
}

async function checkSupport() {
  if(!window.isSecureContext){$('support-note').textContent='Room AR needs an HTTPS link. You can still explore in 3D.';return;}
  try{arSupported=Boolean(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar'));}catch{arSupported=false;}
  $('support-note').textContent=arSupported?'Room AR is available. Camera access starts when you choose it.':'3D preview · Open on a supported Android phone in Chrome for room AR.';
}

function chooseTape(record) {
  if(!loaded||mode==='scanning'||inspector.record)return;
  closeSheet();
  if(inspector.pick(record)) {
    surface.style.cursor='grab';
    $('return-button').focus({preventScroll:true});
  }
}

function pickAt(x,y) {
  if(!loaded||inspector.record||mode==='scanning'||activeSheet)return;
  const rect=surface.getBoundingClientRect();
  pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
  scene.updateMatrixWorld(true);
  raycaster.setFromCamera(pointer,viewCamera());
  const hit=raycaster.intersectObject(shelfRoot,true)[0];
  if(hit?.object.userData.tapeRecord)chooseTape(hit.object.userData.tapeRecord);
}

function populateLibrary() {
  $('tape-list').replaceChildren();
  const counts=new Map();records.forEach(r=>counts.set(r.title,(counts.get(r.title)||0)+1));
  const seen=new Map();
  records.forEach(record=>{
    const copy=(seen.get(record.title)||0)+1;seen.set(record.title,copy);
    const button=document.createElement('button');button.className='tape-option';
    const number=document.createElement('span');number.className='tape-number';number.textContent=String(record.index+1).padStart(2,'0');
    const name=document.createElement('span');name.textContent=record.title;
    const row=document.createElement('small');row.textContent=`Shelf ${record.row}${counts.get(record.title)>1?` · Copy ${copy}`:''}`;name.appendChild(row);
    button.append(number,name);button.addEventListener('click',()=>chooseTape(record));$('tape-list').appendChild(button);
  });
}

async function loadModel() {
  $('retry-load').hidden=true;$('loading').hidden=false;$('loading-text').textContent='Unpacking your collection…';
  try {
    const gltf=await new GLTFLoader().loadAsync(new URL('./assets/blockbustervideoshelfwithtapes.glb',import.meta.url).href,event=>{
      const progress=event.total?event.loaded/event.total:Math.min(.95,event.loaded/18384476);
      $('load-fill').style.width=`${Math.round(progress*100)}%`;
      $('loading-text').textContent=progress>=1?'Preparing the original cover textures…':`Loading your collection… ${Math.round(progress*100)}%`;
    });
    model=gltf.scene;
    model.traverse(object=>{
      if(object.isMesh){
        const materials=Array.isArray(object.material)?object.material:[object.material];
        for(const material of materials){if(material.map)material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
      }
    });
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const scale=1.75/size.y;
    model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    shelfRoot.add(model);
    records=prepareTapes(model);
    if(records.length!==22)throw new Error(`Expected 22 tape cases; found ${records.length}.`);
    inspector=new TapeInspector(scene,records,()=>{
      syncUI();
      if(inspector.phase==='idle')surface.style.cursor='grab';
    });
    loaded=true;$('enter-ar').disabled=false;$('loading').hidden=true;
    populateLibrary();frameShelf();syncUI();await checkSupport();
  } catch(error) {
    console.error('Model loading failed',error);
    $('loading-text').textContent='The model could not finish loading. Check your connection and keep the assets folder beside index.html.';
    $('retry-load').hidden=false;$('support-note').textContent='The original model needs to load before you can enter AR.';
  }
}

function openSheet(id) {
  if(activeSheet)$(activeSheet).hidden=true;
  previousFocus=document.activeElement;activeSheet=id;$(id).hidden=false;
  controls.enabled=false;$(id).querySelector('button').focus({preventScroll:true});
}
function closeSheet() {
  if(!activeSheet)return;$(activeSheet).hidden=true;activeSheet=null;
  if(previousFocus instanceof HTMLElement)previousFocus.focus({preventScroll:true});
  controls.enabled=mode==='preview'&&!inspector?.record;
}

function clearAnchor() {
  placementGeneration++;pendingPlace=false;
  if(anchor){try{anchor.delete();}catch{}anchor=null;}
}

async function startAR() {
  if(!loaded || xrSession)return;
  if(!arSupported){
    openSheet('help-sheet');
    $('device-heading').textContent='This browser is showing the 3D preview';
    $('device-detail').textContent=!window.isSecureContext?'Open the HTTPS version of this page on a supported Android phone in Chrome. A local file or an ordinary HTTP link cannot start room AR.':'This browser cannot start room AR. Open this same link in Chrome on an ARCore-supported Android phone with Google Play Services for AR. iPhone/iPad Safari can use the 3D preview, but cannot run this interactive room AR mode.';
    return;
  }
  $('enter-ar').disabled=true;
  let session;
  try {
    // Call directly from the user's button event, preserving transient activation.
    session=await navigator.xr.requestSession('immersive-ar',{
      requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors','local-floor'],domOverlay:{root:ui}
    });
    xrSession=session;session.addEventListener('end',endAR,{once:true});
    closeSheet();inspector.reset();mode='scanning';tracking=false;
    document.body.classList.add('ar');previewDecor.visible=false;placement.visible=false;
    camera.clearViewOffset();camera.updateProjectionMatrix();
    controls.enabled=false;
    await renderer.xr.setSession(session);
    if(xrSession!==session)return;
    const viewerSpace=await session.requestReferenceSpace('viewer');
    const source=await session.requestHitTestSource({space:viewerSpace});
    if(xrSession!==session){source.cancel();return;}
    hitSource=source;syncUI();
    announce('Scan a well-lit floor. Move your phone slowly to find a surface.',5500);
  } catch(error) {
    console.error('AR could not start',error);
    if(session){try{await session.end();}catch{} if(xrSession===session)endAR();}
    $('enter-ar').disabled=false;
    const reason=error.name==='NotAllowedError'?'AR access was not allowed. You can allow it in your browser’s site settings and try again.':error.name==='NotSupportedError'?'This device needs AR hit testing and touch overlay support. Use updated Chrome and Google Play Services for AR on a compatible Android phone.':'AR could not start. Close any other camera apps, check Chrome and Google Play Services for AR, then try again.';
    announce(reason,8500);
  }
}

function endAR() {
  clearAnchor();if(hitSource){try{hitSource.cancel();}catch{}hitSource=null;}
  xrSession=null;reticle.visible=false;tracking=false;pendingPlace=false;mode='preview';
  inspector?.reset();placement.position.set(0,0,0);placement.quaternion.identity();orientation.quaternion.identity();
  placement.visible=true;previewDecor.visible=true;document.body.classList.remove('ar');
  $('enter-ar').disabled=!loaded;$('place-button').disabled=true;
  // Three.js restores its canvas state after its own session-end listeners.
  requestAnimationFrame(()=>{frameShelf();syncUI();});
}

function reposition() {
  if(!xrSession)return;
  inspector.reset();clearAnchor();mode='scanning';placement.visible=false;reticle.visible=false;
  $('place-button').disabled=true;syncUI();announce('Scan the floor again, then choose Place shelf here.');
}

function commitPlacement(hit,frame,space) {
  const pose=hit.getPose(space);if(!pose)return;
  poseMatrix.fromArray(pose.transform.matrix);poseMatrix.decompose(posePosition,poseQuaternion,poseScale);
  clearAnchor();const generation=placementGeneration;const session=xrSession;
  placement.position.copy(posePosition);placement.quaternion.copy(poseQuaternion);
  viewCamera().getWorldPosition(viewPosition);
  const yaw=Math.atan2(viewPosition.x-posePosition.x,viewPosition.z-posePosition.z);
  yawQuaternion.setFromAxisAngle(axisY,yaw);
  orientation.quaternion.copy(poseQuaternion).invert().multiply(yawQuaternion);
  placement.visible=true;reticle.visible=false;mode='placed';pendingPlace=false;syncUI();
  announce('Shelf placed. Tap any tape to pick it up.');
  // An XRHitTestResult can create an anchor only while its XRFrame is active.
  if(typeof hit.createAnchor==='function'){
    hit.createAnchor().then(created=>{
      if(xrSession===session&&placementGeneration===generation&&mode==='placed')anchor=created;
      else created.delete();
    }).catch(()=>{/* Local reference-space tracking remains usable without anchors. */});
  }
}

function updateXR(frame) {
  if(!frame||!xrSession)return;
  const space=renderer.xr.getReferenceSpace();if(!space)return;
  tracking=Boolean(frame.getViewerPose(space));
  if(!tracking){
    reticle.visible=false;$('place-button').disabled=true;
    if(!lastTrackingMessage){announce('Tracking paused. Move your phone slowly in a well-lit area.',5500);lastTrackingMessage=true;}
    return;
  }
  lastTrackingMessage=false;
  if(anchor&&mode==='placed'){
    const pose=frame.getPose(anchor.anchorSpace,space);
    if(pose){poseMatrix.fromArray(pose.transform.matrix);poseMatrix.decompose(placement.position,placement.quaternion,poseScale);}
  }
  if(mode!=='scanning'||!hitSource)return;
  let floorHit=null;
  for(const hit of frame.getHitTestResults(hitSource)){
    const pose=hit.getPose(space);if(!pose)continue;
    // Ignore walls: the model is a floor-standing shelf, not a wall attachment.
    if(pose.transform.matrix[5]>.9){floorHit=hit;reticle.matrix.fromArray(pose.transform.matrix);break;}
  }
  reticle.visible=Boolean(floorHit);$('place-button').disabled=!floorHit;
  if(floorHit){
    $('dock-title').textContent='A good spot for movie night.';
    $('dock-hint').textContent='The ring marks the shelf’s center on the floor.';
    if(pendingPlace)commitPlacement(floorHit,frame,space);
  }else{
    $('dock-title').textContent='Slowly scan an open floor.';
    $('dock-hint').textContent='Move your phone gently until the gold placement ring appears.';
    pendingPlace=false;
  }
}

// DOM events drive both preview and AR. Prevent their duplicate WebXR select event.
ui.addEventListener('beforexrselect',event=>event.preventDefault());
const touches=new Map();let gesture=null,pinchDistance=0;
surface.addEventListener('pointerdown',event=>{
  if(activeSheet)return;
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(touches.size===1)gesture={startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};
  if(touches.size===2){const[a,b]=[...touches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);if(gesture)gesture.moved=true;}
  if(inspector?.record || mode!=='preview')surface.setPointerCapture(event.pointerId);
});
surface.addEventListener('pointermove',event=>{
  if(!touches.has(event.pointerId))return;
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(!gesture)return;
  if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>6)gesture.moved=true;
  if(inspector?.record){
    if(touches.size===2){const[a,b]=[...touches.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0&&distance>0)inspector.zoom(pinchDistance/distance);pinchDistance=distance;}
    else if(touches.size===1){inspector.rotate(event.clientX-gesture.lastX,event.clientY-gesture.lastY);$('spin-button').setAttribute('aria-pressed','false');}
  }
  gesture.lastX=event.clientX;gesture.lastY=event.clientY;
});
function pointerEnd(event,cancel=false){
  if(!touches.has(event.pointerId))return;
  const tapped=!cancel&&touches.size===1&&gesture&&!gesture.moved;
  touches.delete(event.pointerId);
  if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);
  if(tapped)pickAt(event.clientX,event.clientY);
  if(touches.size===0){gesture=null;pinchDistance=0;}
  else{const remaining=[...touches.values()][0];gesture={startX:remaining.x,startY:remaining.y,lastX:remaining.x,lastY:remaining.y,moved:true};}
}
surface.addEventListener('pointerup',e=>pointerEnd(e));
surface.addEventListener('pointercancel',e=>pointerEnd(e,true));
surface.addEventListener('wheel',event=>{if(inspector?.record){event.preventDefault();inspector.zoom(Math.exp(event.deltaY*.001));}},{passive:false});
surface.addEventListener('contextmenu',e=>e.preventDefault());

$('enter-ar').addEventListener('click',startAR);
$('exit-ar').addEventListener('click',()=>xrSession?.end().catch(()=>announce('Use your browser’s AR close control to exit.')));
$('place-button').addEventListener('click',()=>{if(reticle.visible&&tracking)pendingPlace=true;});
$('reposition').addEventListener('click',reposition);
$('turn-left').addEventListener('click',()=>orientation.rotateY(Math.PI/12));
$('turn-right').addEventListener('click',()=>orientation.rotateY(-Math.PI/12));
$('return-button').addEventListener('click',()=>inspector.returnToShelf());
$('front-button').addEventListener('click',()=>{inspector.face(false);syncUI();});
$('back-button').addEventListener('click',()=>{inspector.face(true);syncUI();});
$('spin-button').addEventListener('click',()=>{inspector.autoSpin=!inspector.autoSpin;syncUI();});
$('closer-button').addEventListener('click',()=>inspector.zoom(.9));
$('farther-button').addEventListener('click',()=>inspector.zoom(1.1));
$('help-button').addEventListener('click',()=>openSheet('help-sheet'));
$('browse-button').addEventListener('click',()=>openSheet('library-sheet'));
$('close-help').addEventListener('click',closeSheet);$('close-library').addEventListener('click',closeSheet);
$('retry-load').addEventListener('click',()=>location.reload());
$('shelf-height').addEventListener('input',event=>{
  const cm=Number(event.target.value);shelfRoot.scale.setScalar(cm/175);$('height-output').textContent=`${cm} cm`;
  if(mode==='preview')frameShelf();
});
window.addEventListener('keydown',event=>{
  if(activeSheet){
    if(event.key==='Escape'){event.preventDefault();closeSheet();return;}
    if(event.key==='Tab'){
      const items=[...$(activeSheet).querySelectorAll('button:not(:disabled),input,[tabindex="0"]')];
      if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
      else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
    }
    return;
  }
  if(!inspector?.record || event.target instanceof HTMLInputElement)return;
  if(event.key==='Escape')inspector.returnToShelf();
  else if(event.key==='ArrowLeft')inspector.rotate(-15,0);
  else if(event.key==='ArrowRight')inspector.rotate(15,0);
  else if(event.key==='ArrowUp')inspector.rotate(0,-15);
  else if(event.key==='ArrowDown')inspector.rotate(0,15);
  else if(event.key==='+'||event.key==='=')inspector.zoom(.9);
  else if(event.key==='-')inspector.zoom(1.1);
  else return;
  event.preventDefault();$('spin-button').setAttribute('aria-pressed',String(inspector.autoSpin));
});
window.addEventListener('resize',()=>{if(mode==='preview'&&loaded&&!inspector?.record)frameShelf();else updateLayout();});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();announce('3D graphics paused. Reload this page to restore the scene.',30000);});

renderer.setAnimationLoop((time,frame)=>{
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):1/60;lastTime=time;
  if(xrSession)updateXR(frame);
  if(controls.enabled)controls.update();
  if(inspector?.record && (!xrSession||tracking))inspector.update(dt,viewCamera());
  renderer.render(scene,camera);
});
loadModel();
