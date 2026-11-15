import {createCourt} from './course.js?v=hoops-1';
import {createGroundTracking} from './tracking.js?v=hoops-1';
import {onlineRoom,passAndPlay,previousSeat} from './multiplayer.js';

const rules=globalThis.SkyboundBasketball, $=id=>document.getElementById(id);
const show=(id,yes)=>{$(id).hidden=!yes;};
const put=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
function label(id,text){put(id,text);show(id,Boolean(text));}
function preference(key,value) {
  try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch{}
}
let court=null, tracker=null, mode='home', entry=null, room=null, myId=null, tab='create', linkStatus='', homeError='';
let arSupported=false, supportChecked=false, groundMessage='', drawnScreen='', toastTimer=null, graphicsError='';
let arAimCue='', pending=false, gesture=null, keyAim=0, currentFlight=null, flightId='', nextSound=0, lastMatch='', closing=false;
let soundOn=preference('skybound-sound')!=='off', audio=null;
const zone=$('throwZone'), body=document.body, overlay=$('overlay');
$('name').value=preference('skybound-hoops-name')||'';

function unlock() {
  if(!soundOn)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}
}
function tone(from,to,length,volume=.075,type='sine',delay=0){
  if(!soundOn||audio?.state!=='running')return;
  const start=audio.currentTime+delay,osc=audio.createOscillator(),env=audio.createGain();
  osc.type=type;osc.frequency.setValueAtTime(from,start);osc.frequency.exponentialRampToValueAtTime(to,start+length);
  env.gain.setValueAtTime(.001,start);env.gain.exponentialRampToValueAtTime(volume,start+.012);env.gain.exponentialRampToValueAtTime(.001,start+length);
  osc.connect(env);env.connect(audio.destination);osc.start(start);osc.stop(start+length+.01);
}
function sfx(which) {
  if(which==='net'){tone(590,760,.10,.06,'triangle');tone(740,970,.12,.07,'sine',.09);}
  else if(which==='rim')tone(680,370,.11,.06,'triangle');
  else if(which==='board')tone(205,90,.09,.06,'triangle');
  else if(which==='floor')tone(144,47,.12,.10);
  else if(which==='win'){[420,540,665,840].forEach((n,i)=>tone(n,n*1.08,.18,.05,'triangle',i*.095));}
}
function soundLabel(){put('soundLabel',soundOn?'Sound on':'Muted');$('mute').setAttribute('aria-pressed',String(!soundOn));$('mute').setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');}
$('mute').onclick=()=>{soundOn=!soundOn;preference('skybound-sound',soundOn?'on':'off');soundLabel();unlock();if(soundOn)tone(480,610,.10);};
soundLabel();
function notice(message){
  clearTimeout(toastTimer);label('toast',message);
  if(message)toastTimer=setTimeout(()=>show('toast',false),3400);
}
function mounted(){return mode==='flat'||(mode==='ar'&&tracker?.phase==='placed'&&tracker.usable);}
function localGame(){return entry?.type==='local';}
function shooter(){return room?.players.find(p=>p.id===room.turn);}
function canShoot(){
  return Boolean(mounted()&&!arAimCue&&entry?.connected&&room?.phase==='playing'&&rules.allReady(room)&&!pending&&!room.shot&&(localGame()||room.turn===myId));
}
function cancelGesture(){
  if(gesture?.pointer!=null&&zone.hasPointerCapture(gesture.pointer))zone.releasePointerCapture(gesture.pointer);
  gesture=null;show('power',false);
}
function configureTab(next) {
  tab=next;homeError='';show('codeLabel',tab==='join');
  $('createTab').setAttribute('aria-pressed',String(tab==='create'));$('joinTab').setAttribute('aria-pressed',String(tab==='join'));
  $('code').required=tab==='join';drawUI();
}
$('createTab').onclick=()=>configureTab('create');$('joinTab').onclick=()=>configureTab('join');
$('code').oninput=()=>{$('code').value=$('code').value.toUpperCase().replace(/[^A-Z0-9]/g,'');};
function scene(next) {arAimCue='';mode=next;court?.setMode(next==='ar'?'ar':next==='flat'?'flat':'home');}
function statusLine() {
  if(!entry?.connected)return linkStatus||'Reconnecting…';
  if(room.players.some(p=>!p.connected))return 'Waiting for your friend to reconnect';
  if(room.players.length<2)return 'Invite a friend · room '+room.code;
  if(!rules.allReady(room))return 'Waiting for both hoops';
  if(room.shot)return (room.players.find(p=>p.id===room.shot.by)?.name||'Player')+' is shooting';
  return localGame()?shooter()?.name+'’s turn':room.turn===myId?'Your shot':(shooter()?.name||'Opponent')+'’s turn';
}
function helpText() {
  if(!entry?.connected)return 'Your seat is reserved while you reconnect.';
  if(mode==='ar'&&!tracker.usable)return 'Tracking paused. Point your phone back at the hoop.';
  if(room.players.length<2)return 'Share the room code above so your friend can join.';
  if(!rules.allReady(room))return 'Both players can shoot once their hoops are ready.';
  if(arAimCue)return arAimCue;
  if(room.shot)return 'Watch the ball.';
  if(canShoot())return 'Swipe the ball up. Release in the green.';
  return (shooter()?.name||'Your friend')+' has the ball.';
}
function drawUI() {
  const isLocal=localGame(), inRoom=Boolean(room), scanning=mode==='ar'&&tracker?.phase!=='placed';
  const screen=!inRoom?'home':scanning?'scan':mode==='choose'?'choose':room.phase==='finished'?'finish':'play';
  body.dataset.screen=screen;
  for(const [id,key] of [['home','home'],['chooser','choose'],['scan','scan'],['scoreboard','play'],['playDock','play'],['turnBox','play'],['finish','finish']])show(id,screen===key);
  overlay.classList.toggle('in-ar',mode==='ar');
  show('throwZone',screen==='play'||screen==='scan');
  show('leave',inRoom);show('roomTag',inRoom&&!isLocal);if(inRoom&&!isLocal)put('headerCode',room.code);
  const busy=Boolean(entry&&!room);
  $('enter').disabled=Boolean(graphicsError)||busy;$('local').disabled=Boolean(graphicsError)||busy;
  for(const id of ['name','code','createTab','joinTab'])$(id).disabled=busy;
  show('cancelJoin',busy);
  put('enterLabel',busy?'Connecting…':tab==='join'?'Join this room':'Create a room');
  label('homeStatus',graphicsError||homeError||(busy?linkStatus:''));
  if(screen==='choose'){
    show('roomInfo',!isLocal);if(!isLocal)put('lobbyCode',room.code);
    put('roomLine',isLocal?'Two players share this device and take turns shooting.':room.players.length===1?'Share this code with your friend, then choose your court.':room.players.map(p=>p.name).join(' vs. '));
    put('device',arSupported?'For AR, scan the floor where you want the base of the hoop. Each phone places its own hoop.':!supportChecked?'Checking ground AR support…':'For ground AR, open this page in Chrome on an ARCore-supported Android phone. You can play this match in 3D here.');
    $('ar').disabled=!arSupported||Boolean(graphicsError);$('flat').disabled=Boolean(graphicsError);
    label('roomStatus',linkStatus||groundMessage);
  }
  if(screen==='scan'){
    const detected=tracker.phase==='detected';put('scanTitle',detected?'Floor found':tracker.phase==='starting'?'Opening AR':'Find the floor');
    put('scanHelp',groundMessage||'Move your phone slowly over a well-lit floor.');$('place').disabled=!tracker.canPlace;$('scanBack').disabled=tracker.phase==='starting';
  }
  if(screen==='play'){
    for(let i=0;i<2;i++){
      const p=room.players[i];put('name'+i,p?p.name+(!isLocal&&p.id===myId?' · you':''):'Waiting…');put('score'+i,String(p?.score||0));
      $('p'+i).classList.toggle('active',Boolean(p&&p.id===room.turn));
    }
    put('turnText',statusLine());put('hint',helpText());show('keys',canShoot()&&mode==='flat');
    $('viewChoice').disabled=false;
  }
  if(!canShoot() && gesture)cancelGesture();
  const last=screen==='play'&&room.last&&!room.shot?room.last:null;
  const who=last?room.players.find(p=>p.id===last.by)?.name||'Player':'';
  label('result',last?(last.made?who+' +1':who+' missed'):'');
  if(screen==='finish'){
    const winner=room.players.find(p=>p.id===room.winner);
    put('winner',winner?.name+' wins!');put('finalScore',room.players.map(p=>p.score).join(' – '));put('finalNames',room.players.map(p=>p.name).join(' vs. '));
    $('again').disabled=!entry.connected;
  }
  if(screen!==drawnScreen){drawnScreen=screen;court?.resize();}
}

function onRoom(next,id) {
  const was=room;
  if(!room){scene('choose');homeError='';groundMessage='';}
  room=next;myId=id;
  const turnSignature=[next.generation,next.seq,next.turn].join('/');
  if(turnSignature!==lastMatch){cancelGesture();keyAim=0;pending=false;lastMatch=turnSignature;}
  if(next.shot&&next.shot.id!==flightId){
    cancelGesture();pending=false;flightId=next.shot.id;currentFlight=rules.simulate(next.shot.input);nextSound=0;
    const elapsed=(entry.now()-next.shot.at)/1000;
    while(nextSound<currentFlight.events.length&&currentFlight.events[nextSound].time<elapsed-.13)nextSound++;
  }
  if(!next.shot){currentFlight=null;flightId='';}
  if(next.winner && was && next.winner!==was.winner)sfx('win');
  drawUI();
}
const callbacks={onRoom,onStatus(message){linkStatus=message;drawUI();},onError(message){leaveGame(message);}};
function online(intent) {
  if(entry||graphicsError)return;
  if(!window.io||!window.SKYBOUND_SERVER_URL){homeError='The multiplayer files are missing. Re-upload the contents of github-pages.';drawUI();return;}
  unlock();homeError='';groundMessage='';document.activeElement?.blur();
  entry=onlineRoom(callbacks);entry.open(intent);drawUI();
}
$('entryForm').onsubmit=e=>{
  e.preventDefault();const name=$('name').value.trim(),code=$('code').value.trim();
  if(tab==='join'&&!/^[A-Z0-9]{4,6}$/.test(code)){homeError='Enter the 4–6 character code from your friend.';drawUI();$('code').focus();return;}
  preference('skybound-hoops-name',name);online({name,code,create:tab==='create'});
};
$('local').onclick=()=>{
  if(entry||graphicsError)return;
  unlock();groundMessage='';const name=$('name').value.trim();preference('skybound-hoops-name',name);document.activeElement?.blur();
  entry=passAndPlay(callbacks,name);entry.open();drawUI();
};
function leaveGame(message='') {
  const active=entry;entry=null;room=null;myId=null;pending=false;gesture=null;keyAim=0;currentFlight=null;flightId='';lastMatch='';
  active?.close();linkStatus='';homeError=message;groundMessage='';notice('');
  if(tracker?.active){closing=true;void tracker.end();}
  scene('home');cancelGesture();drawUI();
}
$('leave').onclick=$('finishHome').onclick=$('cancelJoin').onclick=()=>leaveGame();
function copyCode(){
  if(!room)return;const code=room.code;
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>notice('Copied room code '+code)).catch(()=>notice('Room code: '+code));
  else notice('Room code: '+code);
}
$('copy').onclick=$('roomTag').onclick=copyCode;
$('ar').onclick=()=>{if(!tracker||!arSupported||tracker.active)return;unlock();groundMessage='';scene('ar');void tracker.start();};
$('flat').onclick=()=>{unlock();groundMessage='';scene('flat');entry.ready(true);drawUI();};
$('place').onclick=()=>tracker?.queuePlacement();
function changeView(){
  cancelGesture();pending=false;entry?.ready(false);groundMessage='';
  if(tracker?.active){void tracker.end();return;}
  scene('choose');drawUI();
}
$('viewChoice').onclick=$('scanBack').onclick=changeView;
$('again').onclick=()=>{unlock();entry?.restart();};
overlay.addEventListener('beforexrselect',e=>{if(e.target.closest?.('button,input,.card,.scan-panel,#throwZone'))e.preventDefault();});

function powerFromGesture(g) {
  return rules.clamp(g.keyboard?(performance.now()-g.start)/940:(g.startY-g.y)/g.span,0,1);
}
function inputFor(g,release=false) {
  const held=court.held(),[x,,z]=held.origin,center=Math.atan2(-x,-z);
  const cameraError=Math.atan2(Math.sin(center-held.facing),Math.cos(center-held.facing));
  const lateral=g.keyboard?keyAim:(g.x-g.startX)/Math.max(95,Math.min(innerWidth*.51,390))*.66;
  const level=powerFromGesture(g);
  const speed=g.keyboard?0:rules.clamp((g.startY-g.y)/g.span/Math.max(.07,(performance.now()-g.start)/1000)-1.7,-1.7,1.7);
  return {origin:held.origin,aim:rules.clamp(cameraError*.46+lateral,-.745,.745),power:rules.clamp(1+(level-.56)*.565+(release?speed*.009:0),.68,1.36)};
}
function powerUI(g){
  const n=powerFromGesture(g);show('power',true);$('needle').style.left=(n*100).toFixed(1)+'%';
  put('powerWord',n<.49?'More power':n<=.64?'Good power':'Strong');
}
function submit(g) {
  if(!canShoot()){cancelGesture();return;}
  const level=powerFromGesture(g),input=inputFor(g,true);
  cancelGesture();
  if(level<.075){notice('Flick the ball upward to shoot.');return;}
  if(!rules.validThrow(input)){notice('Face the hoop and stand about 1–5 metres from it.');return;}
  pending=true;drawUI();
  entry.shoot({generation:room.generation,seq:room.seq,input},error=>{
    if(error){pending=false;notice(error);drawUI();}
  });
}
zone.addEventListener('pointerdown',e=>{
  if(mode==='ar'&&tracker?.phase!=='placed'){if(e.isPrimary)tracker.queuePlacement();return;}
  if(!e.isPrimary||e.button!==0||!canShoot()||gesture)return;
  const w=zone.clientWidth,h=zone.clientHeight;
  // The rendered ball is centered at NDC (0, -.47). Give fingers a little extra catch area.
  const rx=Math.max(48,Math.min(w*.29,h*.18)),ry=Math.max(48,Math.min(h*.18,w*.37));
  if(Math.abs(e.clientX-w*.5)>rx||Math.abs(e.clientY-h*.735)>ry){notice('Start your swipe on the basketball.');return;}
  e.preventDefault();unlock();notice('');zone.setPointerCapture(e.pointerId);
  gesture={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,start:performance.now(),span:Math.max(130,Math.min(h*.55,w*.88,435))};powerUI(gesture);
});
zone.addEventListener('pointermove',e=>{if(gesture?.pointer!==e.pointerId)return;gesture.x=e.clientX;gesture.y=e.clientY;powerUI(gesture);});
zone.addEventListener('pointerup',e=>{if(gesture?.pointer!==e.pointerId)return;const g=gesture;g.x=e.clientX;g.y=e.clientY;e.preventDefault();submit(g);});
zone.addEventListener('pointercancel',cancelGesture);
zone.addEventListener('lostpointercapture',e=>{if(gesture?.pointer===e.pointerId)cancelGesture();});
document.addEventListener('keydown',e=>{
  if(typeof e.target?.matches==='function'&&e.target.matches('input,textarea'))return;
  if(mode!=='flat'||!canShoot()||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){
    e.preventDefault();keyAim=rules.clamp(keyAim+(e.code==='ArrowLeft'?-.027:.027),-.55,.55);
    if(!gesture)notice('Aim '+(Math.abs(keyAim)<.012?'center':Math.abs(Math.round(keyAim*180/Math.PI))+'° '+(keyAim<0?'left':'right')));
  }
  if(e.code==='Space' && !e.target?.closest?.('button:focus-visible')){
    e.preventDefault();if(e.repeat||gesture)return;unlock();notice('');gesture={keyboard:true,start:performance.now()};powerUI(gesture);
  }
});
document.addEventListener('keyup',e=>{if(e.code==='Space'&&gesture?.keyboard){e.preventDefault();submit(gesture);}});
window.addEventListener('blur',cancelGesture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture();else entry?.sync();});
function frame(time,xrFrame){
  if(mode==='ar')tracker?.frame(time,xrFrame);
  court.frameView(xrFrame);
  const cue=mode==='ar'&&tracker.usable?court.aimCue():'';
  if(cue!==arAimCue){arAimCue=cue;drawUI();}
  let elapsed=0;
  if(room?.shot&&currentFlight){elapsed=(entry.now()-room.shot.at)/1000;
    while(nextSound<currentFlight.events.length&&currentFlight.events[nextSound].time<=elapsed){
      const event=currentFlight.events[nextSound++];if(elapsed-event.time<.19&&mounted())sfx(event.kind);
    }
  }
  if(gesture)powerUI(gesture);
  court.draw(time,currentFlight,elapsed,canShoot(),gesture&&canShoot()?inputFor(gesture):null);
}
try{
  court=createCourt($('courtCanvas'));
  tracker=createGroundTracking(court,overlay,info=>{
    groundMessage=info.message;
    if(mode==='ar'&&entry){
      entry.ready(info.phase==='placed'&&info.usable);
      if(info.phase==='placed'&&info.usable&&drawnScreen==='scan')notice('Hoop placed. Step back and face the rim.');
    }
    drawUI();
  },failure=>{
    if(closing){closing=false;return;}
    if(entry){entry.ready(false);scene('choose');groundMessage=failure||'';}else scene('home');
    drawUI();
  });
  court.setMode('home');court.renderer.setAnimationLoop(frame);
  new ResizeObserver(()=>court.resize()).observe($('courtCanvas'));
}catch(error){console.error(error);graphicsError='The 3D court needs WebGL 2. Enable hardware acceleration or open this page in an updated browser.';}
async function checkAR(){
  try{arSupported=Boolean(isSecureContext&&navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
  supportChecked=true;drawUI();
}
void checkAR();configureTab('create');
const resume=previousSeat();if(resume&&!graphicsError)online(resume);
