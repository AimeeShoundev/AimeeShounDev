import {createCourse, laneFor, onBoost} from './course.js';
import {createGroundTracking} from './tracking.js';

const element = id => document.getElementById(id);
const app = element('app'), overlay = element('overlay');
const setText = (id,value) => { const el=element(id); if (el.textContent !== value) el.textContent = value; };
const show = (id,visible) => { element(id).hidden = !visible; };
const game = {
  view:null, tracking:null, socket:null, supported:false, supportNote:'Checking ground AR…',
  room:null, id:null, membership:null, joining:false, mode:'none', groundMessage:'', roomError:'', lobbyError:'',
  audio:null, sound:true, pendingReady:false, joinEpoch:0, seenId:null, graphicsError:'', noticeTimer:0
};
const held = {left:false,right:false,gas:false,brake:false};
const models = [{progress:0,lane:0},{progress:0,lane:0}];
let lastRender = 0, wasStarted = false, lastWinner = null, notice = '', lastDrive = '', lastDriveAt = 0;

function storage(key, value) {
  try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key,value); } catch {}
}
game.sound = storage('skybound-sound') !== 'off';
element('name').value = storage('skybound-racer') || '';
function soundLabel() {
  setText('sound',game.sound ? 'Sound on' : 'Sound off');
  element('sound').setAttribute('aria-label',game.sound ? 'Mute sound' : 'Unmute sound');
  element('sound').setAttribute('aria-pressed',String(game.sound));
}
function unlockSound() {
  if (!game.sound) return;
  try {
    if (!game.audio) game.audio = new (window.AudioContext || window.webkitAudioContext)();
    if (game.audio.state === 'suspended') game.audio.resume().catch(()=>{});
  } catch {}
}
function chime(notes) {
  if (!game.sound || game.audio?.state !== 'running') return;
  const audio=game.audio, now=audio.currentTime;
  notes.forEach((pitch,index) => {
    const at=now+index*0.10, osc=audio.createOscillator(), volume=audio.createGain();
    osc.type='sine'; osc.frequency.value=pitch;
    volume.gain.setValueAtTime(0.0001,at); volume.gain.exponentialRampToValueAtTime(0.09,at+0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001,at+0.13);
    osc.connect(volume); volume.connect(audio.destination); osc.start(at); osc.stop(at+0.14);
  });
}
element('sound').onclick = () => { game.sound=!game.sound; storage('skybound-sound',game.sound?'on':'off'); soundLabel(); if(game.sound){unlockSound();chime([560]);} };
soundLabel();

function player() { return game.room?.players.find(p=>p.id===game.id); }
function mySlot() { return game.room?.players.findIndex(p=>p.id===game.id) ?? -1; }
function announce(message, duration=3000) {
  clearTimeout(game.noticeTimer); notice=message; setText('notice',message); show('notice',Boolean(message));
  if(message && duration) game.noticeTimer=setTimeout(()=>{notice='';show('notice',false);},duration);
}
function errors() {
  setText('lobbyError',game.lobbyError||game.graphicsError);show('lobbyError',Boolean(game.lobbyError||game.graphicsError));
  setText('roomError',game.roomError||game.graphicsError);show('roomError',Boolean(game.roomError||game.graphicsError));
}
function network(state,label) { element('network').dataset.state=state; setText('netText',label); }
function resize() { game.view?.resize(app.dataset.screen==='lobby'); }
function updateHUD() {
  const p=player(); if(!p || !game.room.started) return;
  const rival=game.room.players.find(r=>r.id!==p.id);
  const delta=p.progress-(rival?.progress||0);
  setText('position',Math.abs(delta)<0.0005?'Level':delta>0?'1st':'2nd');
  setText('lap','Lap '+ Math.min(3,Math.floor(p.progress)+1)+' / 3');
  setText('boost',onBoost(p.progress,laneFor(p.lane,mySlot())) && held.gas ? 'Boost' : 'Drive');
}
function screenState() {
  const t=game.tracking;
  if(t?.active && t.phase!=='placed') return 'place';
  if(!game.membership) return t?.phase==='placed' ? 'demo' : 'lobby';
  if(game.room?.winner) return 'finish';
  if(game.room?.started) return 'race';
  return 'pit';
}
function drawUI() {
  const screen=screenState(), previous=app.dataset.screen, t=game.tracking;
  app.dataset.screen=screen;
  overlay.classList.toggle('in-ar',Boolean(t?.active));
  show('lobby',screen==='lobby'); show('pit',screen==='pit'); show('setup',screen==='place');
  show('demo',screen==='demo'); show('finish',screen==='finish');
  show('raceHud',screen==='race'); show('controls',screen==='race' && (game.mode==='preview'||Boolean(t?.usable)));
  show('resumeExit',screen==='race' && Boolean(t?.active));
  show('roomTag',Boolean(game.membership));
  const slot=mySlot(), p=player(), placed=game.mode==='preview'||(t?.phase==='placed'&&t.usable);
  if(game.membership) {
    setText('roomCode','Room '+game.membership.code);
    setText('myCar',slot<0?'Connecting':slot===0?'Orange car':'Teal car');
    element('myCar').style.setProperty('--car',slot===0?'#ff764e':'#4ad9c1');
  }
  element('join').disabled=game.joining||Boolean(game.graphicsError);
  element('join').firstChild.textContent=game.joining?(game.socket?.connected?'Joining… ':'Connecting… '):'Join room ';
  setText('deviceNote',game.supportNote);
  element('testGround').disabled=!game.supported||!game.view||game.joining;
  show('testGround',game.supported);
  if(screen==='pit') {
    setText('pitTitle', placed?'Starting grid':'Set up your track');
    const lineup=game.room?.players.map(r=>r.name+(r.id===game.id?' (you)':'')+(r.ready?' ✓':'')).join(' · ');
    setText('lineup',lineup ? lineup+'  ·  '+game.room.players.length+'/2' : 'Rejoining your room…');
    let hint=game.supported?'Each driver scans the floor and places a track on their own phone.':game.supportNote;
    if(placed) hint=game.room?.players.length===2?'Both drivers tap Ready. Hold Gas and steer onto the green boost strips.':'Ask the other driver to join room '+game.membership.code+'.';
    if(p?.ready||game.pendingReady) hint='You’re ready. Waiting for the other driver.';
    if(t?.phase==='placed'&&!t.usable) hint=game.groundMessage;
    setText('pitHelp',hint);
    const chooseAR=!t?.active&&game.mode!=='preview';
    show('startAR',chooseAR); element('startAR').disabled=!game.supported||!game.view||!p;
    show('preview',chooseAR); element('preview').disabled=!game.view||!p;
    show('ready',placed); element('ready').disabled=!p||!game.socket?.connected||game.room.players.length!==2||p.ready||game.pendingReady;
    element('ready').firstChild.textContent=p?.ready||game.pendingReady?'Ready ✓ ':'Ready to race ';
    show('reposition',(t?.phase==='placed'||game.mode==='preview')&&!p?.ready&&!game.pendingReady);
    setText('reposition',game.mode==='preview'?'Change view':'Reposition');
  }
  if(screen==='place') {
    setText('scanTitle',t.phase==='detected'?'Ground found':t.phase==='starting'?'Opening AR':'Find the floor');
    setText('scanHelp',game.groundMessage);element('place').disabled=!t.canPlace; element('exitAR').disabled=t.phase==='starting';
  }
  if(screen==='finish') {
    const winner=game.room.players.find(r=>r.id===game.room.winner);
    setText('finishTitle',winner?.id===game.id?'You win!':(winner?.name||'Opponent')+' wins!');
    setText('finishBody',winner?.id===game.id?'You crossed the line first after three laps.':(winner?.name||'The other driver')+' crossed the line first after three laps.');
  }
  if(screen==='demo' || screen==='race') {
    if(t?.phase==='placed' && !t.usable) { if(notice!==game.groundMessage) announce(game.groundMessage,0); }
    else if(notice.startsWith('Tracking paused')) announce('');
  }
  updateHUD(); errors();
  if(previous!==screen) resize();
}

async function checkSupport() {
  let available=false;
  try { available=Boolean(window.isSecureContext && navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch {}
  game.supported=available;
  game.supportNote=available?'Ground AR is available on this device.':!isSecureContext?'Open the HTTPS game page to use ground AR.':'Ground AR needs Android Chrome on an ARCore phone with Google Play Services for AR. You can race here in 3D.';
  drawUI();
}
function beginAR() {
  if(!game.supported||game.tracking?.active||!game.tracking || (game.membership&&!player())) return;
  game.lobbyError=''; game.roomError=''; unlockSound(); announce('');
  void game.tracking.start();
}
function stopKeys() {
  for(const key of Object.keys(held)){ held[key]=false; element(key).classList.remove('held'); }
  sendDrive(true);
}
async function endView() {
  if(game.tracking?.active) await game.tracking.end();
  else { game.mode='none'; game.view?.resetWorld(); drawUI(); resize(); }
}
function leaveRoom() {
  const socket=game.socket;
  game.joinEpoch++; game.joining=false; game.membership=null; game.room=null; game.id=null; game.seenId=null; game.pendingReady=false;
  wasStarted=false; lastWinner=null; game.mode='none'; game.roomError=''; game.lobbyError=''; announce(''); stopKeys();
  // Closing the old socket uses the deployed server’s existing disconnect/leave path.
  if(socket){socket.disconnect();socket.connect();}
  void endView(); drawUI();
}
function joined(snapshot) {
  if(!snapshot || snapshot.code!==game.membership?.code || !snapshot.players?.some(p=>p.id===game.id)) return;
  game.room=snapshot;
  if(snapshot.started&&!wasStarted) { chime([420,630,840]); announce('Go! Green strips boost your car.'); }
  if((wasStarted||lastWinner)&&!snapshot.started&&!snapshot.winner) {
    stopKeys(); announce(snapshot.players.length===1?'The other driver left. Invite a driver to this room.':'Back on the grid.');
  }
  if(snapshot.winner&&snapshot.winner!==lastWinner) { chime(snapshot.winner===game.id?[520,660,830,1040]:[620,480]); announce(''); stopKeys(); }
  if(!snapshot.started && !snapshot.winner) {
    snapshot.players.forEach((p,index)=>{ models[index].progress=p.progress;models[index].lane=p.lane; });
  }
  if(player()?.ready || snapshot.started || snapshot.winner) game.pendingReady=false;
  wasStarted=snapshot.started; lastWinner=snapshot.winner;
  drawUI();
}
function sendJoin() {
  const socket=game.socket, entry=game.membership;
  if(!socket?.connected||!entry||game.seenId===socket.id) return;
  const epoch=game.joinEpoch, connection=socket.id; game.seenId=connection;
  socket.timeout(21000).emit('join',entry,(timeout,reply)=>{
    if(epoch!==game.joinEpoch||connection!==socket.id) return;
    game.joining=false;
    if(timeout||!reply?.ok) {
      game.membership=null; game.id=null; game.seenId=null; game.room=null; game.mode='none';
      game.lobbyError=timeout?'The room did not answer. Tap Join room to try again.':(reply?.error||'Could not join this room.');
      if(timeout){socket.disconnect();socket.connect();}
      void endView(); drawUI();return;
    }
    game.id=reply.id; game.roomError=''; game.lobbyError=''; storage('skybound-racer',entry.name); drawUI();
  });
}
function connect() {
  const serverURL=window.SKYBOUND_SERVER_URL;
  if(!window.io||!serverURL) {network('wait','Offline');game.lobbyError='The multiplayer client could not load. Reload the game page.';drawUI();return;}
  const socket=window.io(serverURL,{autoConnect:false,reconnection:true,timeout:18000,reconnectionDelayMax:4500,tryAllTransports:true});
  game.socket=socket;
  socket.on('connect',()=>{network('online','Online'); sendJoin(); drawUI();});
  socket.on('connect_error',()=>{network('wait','Reconnecting'); if(game.membership){game.roomError='The multiplayer server is connecting. Your room will open as soon as it responds.';}drawUI();});
  socket.on('disconnect',()=>{
    network('wait','Reconnecting');game.seenId=null;game.id=null;game.room=null;game.pendingReady=false;wasStarted=false;lastWinner=null;
    if(game.membership) game.roomError='Connection interrupted. Rejoining room '+game.membership.code+'…';
    stopKeys();drawUI();
  });
  socket.on('room',joined);socket.connect();
}
element('roomForm').onsubmit=event=>{
  event.preventDefault(); if(game.joining||!game.socket) return;
  const name=element('name').value.trim()||'Racer', code=element('code').value.trim().toUpperCase();
  if(!/^[A-Z0-9]{4,6}$/.test(code)){game.lobbyError='Enter a room code with 4–6 letters or numbers.';errors();element('code').focus();return;}
  unlockSound();game.joinEpoch++;game.membership={name,code};game.joining=true;game.seenId=null;game.lobbyError='';game.roomError='';
  element('code').value=code; document.activeElement?.blur();
  if(!game.socket.connected){game.roomError='Connecting to multiplayer. Your room will open when the server responds.';game.socket.connect();}
  sendJoin();drawUI();
};
element('code').addEventListener('input',()=>{element('code').value=element('code').value.toUpperCase();if(game.lobbyError){game.lobbyError='';errors();}});
element('testGround').onclick=element('startAR').onclick=beginAR;
element('exitAR').onclick=element('demoDone').onclick=element('resumeExit').onclick=()=>void endView();
element('place').onclick=()=>game.tracking?.queuePlacement();
element('demoMove').onclick=()=>game.tracking?.scan();
element('reposition').onclick=()=>{if(game.mode==='preview') void endView(); else game.tracking?.scan();};
element('preview').onclick=()=>{if(game.tracking?.active)return;unlockSound();game.mode='preview';game.view.resetWorld();game.roomError='';drawUI();resize();};
element('leave').onclick=element('finishLeave').onclick=leaveRoom;
element('ready').onclick=()=>{
  if(element('ready').disabled) return;
  unlockSound();game.pendingReady=true;game.socket.emit('ready');drawUI();
};
element('again').onclick=()=>{if(game.socket?.connected)game.socket.emit('restart');};
overlay.addEventListener('beforexrselect',event=>{if(event.target.closest?.('button,input,.panel,.setup-bar'))event.preventDefault();});

function sendDrive(force=false) {
  const p=player(); if(!p||!game.room?.started||!game.socket?.connected)return;
  const driveable=!document.hidden&&(game.mode==='preview'||Boolean(game.tracking?.usable));
  const gas=driveable&&held.gas,brake=driveable&&held.brake,steer=driveable ? Number(held.right)-Number(held.left) : 0;
  // The deployed server owns speed and position. Boost strips release the normal throttle limit.
  const boost=onBoost(p.progress,laneFor(p.lane,mySlot()));
  const now=performance.now();
  const input={gas:gas && (boost || p.speed < 0.79),brake,steer}, signature=JSON.stringify(input);
  if(!force && signature===lastDrive && now-lastDriveAt<92)return;
  lastDriveAt=now;lastDrive=signature;game.socket.volatile.emit('drive',input);
}
const keyMap={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake'};
function pushKey(key,pressed) {
  if(pressed && (!game.room?.started||game.joining))return;
  if(held[key]===pressed)return;
  held[key]=pressed;element(key).classList.toggle('held',pressed);sendDrive(true);
}
for(const key of Object.keys(held)) {
  const b=element(key);
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pushKey(key,true);});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>pushKey(key,false));
  b.addEventListener('contextmenu',e=>e.preventDefault());
}
window.addEventListener('keydown',e=>{const key=keyMap[e.code];if(key&&game.room?.started&&e.target.tagName!=='INPUT'){e.preventDefault();pushKey(key,true);}});
window.addEventListener('keyup',e=>{if(keyMap[e.code])pushKey(keyMap[e.code],false);});
window.addEventListener('blur',stopKeys); document.addEventListener('visibilitychange',()=>{if(document.hidden)stopKeys();});
setInterval(()=>sendDrive(),55);
function frame(t,xrFrame) {
  const view=game.view; if(!view)return;
  game.tracking.frame(t,xrFrame);
  const dt=lastRender?Math.min(.15,(t-lastRender)/1000):.016;lastRender=t;
  const blend=1-Math.exp(-dt*17);
  for(let i=0;i<2;i++) {
    const p=game.room?.players[i],model=models[i];
    view.cars[i].visible=!game.room||Boolean(p);
    if(p) {
      model.progress+=(p.progress-model.progress)*blend;model.lane+=(p.lane-model.lane)*blend;
      view.setCar(i,model.progress,model.lane);
    } else if(!game.room) view.setCar(i,(i?0.56:0.027)+t*(i?0.000030:0.000035),0);
  }
  view.render();
}
try {
  game.view=createCourse(element('course'));
  game.tracking=createGroundTracking(game.view,overlay,state=>{
    const justPlaced=state.phase==='placed'&&game.mode!=='ar';
    game.groundMessage=state.message;
    if(state.phase==='placed'){game.mode='ar';if(justPlaced)chime([540,790]);}
    else if(state.phase!=='idle')game.mode='none';
    drawUI();
  }, failure=>{
    if(game.membership && (game.room?.started||player()?.ready||game.pendingReady) && !game.room?.winner) game.socket?.emit('restart');
    stopKeys();game.mode='none';game.pendingReady=false;
    if(failure){if(game.membership)game.roomError=failure;else game.lobbyError=failure;}
    requestAnimationFrame(()=>{drawUI();resize();});
  });
  game.view.renderer.setAnimationLoop(frame);
  new ResizeObserver(resize).observe(element('stage'));
  element('course').addEventListener('webglcontextlost',e=>{e.preventDefault();announce('Graphics paused. Return to Chrome or reload the game page.',0);stopKeys();});
  element('course').addEventListener('webglcontextrestored',()=>{announce('Graphics restored.');resize();});
} catch(error) {
  game.graphicsError='3D graphics could not start. Open the page directly in Chrome with hardware acceleration enabled.';
  console.error('Skybound 3D initialization',error);
}
window.addEventListener('resize',resize);checkSupport();connect();drawUI();resize();
