const rules = globalThis.SkyboundBasketball;
const resumeKey = 'skybound-basketball-seat-v1';
function stored(value) {
  try {
    if (value === undefined) return JSON.parse(sessionStorage.getItem(resumeKey) || 'null');
    if (value === null) sessionStorage.removeItem(resumeKey);
    else sessionStorage.setItem(resumeKey,JSON.stringify(value));
  } catch {}
  return null;
}
export function previousSeat() {
  const saved=stored();return saved && /^[A-Z0-9]{4,6}$/.test(saved.code) && typeof saved.token==='string' ? saved : null;
}

export function onlineRoom(callbacks) {
  const {onRoom,onStatus,onError}=callbacks;
  const socket=window.io(window.SKYBOUND_SERVER_URL,{autoConnect:false,timeout:20000,reconnection:true,reconnectionDelayMax:4500,tryAllTransports:true});
  let intent=null, ticket=0, joiningTimer=null, id=null, alive=true, joined=false, desiredReady=false;
  let offset=Date.now()-performance.now(), latency=0, state=null;
  function receive(next) {
    if(!alive||!joined||!next || next.protocol!==rules.PROTOCOL||!next.players.some(p=>p.id===id))return;
    state=next;offset=next.now+latency-performance.now();onRoom(next,id);
  }
  function sync() {
    if(!socket.connected||!joined)return;
    const start=performance.now(),connection=socket.id;
    socket.timeout(4500).emit('sync',(error,next)=>{
      if(error||socket.id!==connection||!alive||!joined||!next)return;
      latency=Math.min(400,(performance.now()-start)/2);receive(next);
    });
  }
  function abandon(message) {
    clearTimeout(joiningTimer);stored(null);joined=false;alive=false;socket.disconnect();onError(message);
  }
  socket.on('connect',()=>{
    if(!intent||!alive)return;
    const attempt=++ticket,connection=socket.id;
    onStatus(state?'Rejoining your room…':'Opening your room…');
    socket.timeout(10000).emit('join',{...intent,protocol:rules.PROTOCOL},(err,reply)=>{
      if(!alive||attempt!==ticket||socket.id!==connection)return;
      if(err) {abandon('The server did not answer. Try again after the Render deployment finishes.');return;}
      if(reply?.protocol!==rules.PROTOCOL) {abandon('The server is still running racing. Deploy this ZIP’s render-server folder to your existing Render service, then try again.');return;}
      if(!reply.ok) {abandon(reply.error||'The room could not be opened.');return;}
      clearTimeout(joiningTimer);joined=true;id=reply.id;
      intent={code:reply.room.code,token:reply.token,name:intent.name};stored(intent);
      onStatus('');receive(reply.room);
      if(reply.room.players.find(p=>p.id===id)?.ready!==desiredReady)socket.emit('ready',desiredReady);
      sync();
    });
  });
  socket.on('room',receive);
  socket.on('disconnect',reason=>{
    ticket++;joined=false;if(!alive)return;
    if(reason==='io server disconnect') {abandon('Your seat was opened in another tab.');return;}
    onStatus(state?'Connection lost. Rejoining your room…':'Connecting to Render…');
  });
  socket.on('connect_error',()=>{
    if(alive)onStatus(state?'Reconnecting to your room…':'Waiting for the Render service to wake up…');
  });
  return {
    type:'online', get connected(){return joined && socket.connected;}, now:()=>performance.now()+offset,
    open(entry) {
      intent={...entry};onStatus('Connecting to Render. The first connection can take a moment…');
      joiningTimer=setTimeout(()=>{if(alive&&!joined)onStatus('Still connecting. You can wait or cancel and try again.');},50000);
      socket.connect();
    },
    ready(value) {
      if(desiredReady===value)return;desiredReady=value;
      if(joined&&socket.connected)socket.emit('ready',value);
    },
    shoot(request,done) {
      if(!joined||!socket.connected){done('Reconnecting…');return;}
      socket.timeout(6500).emit('shoot',request,(err,reply)=>{
        if(!alive)return;
        if(err) {sync();done('Checking the shot with the server…');return;}
        if(reply?.room)receive(reply.room);
        done(reply?.ok?'':reply?.error||'Please try your shot again.');
      });
    },
    restart(){if(joined&&state)socket.emit('restart',state.generation);},
    sync,
    close() {
      alive=false;ticket++;clearTimeout(joiningTimer);stored(null);
      if(joined&&socket.connected) socket.timeout(1200).emit('leave',()=>socket.disconnect());
      else socket.disconnect();
    }
  };
}

export function passAndPlay(callbacks,name) {
  const match=rules.createMatch('LOCAL');
  match.players=[rules.player('one',name||'Player 1'),rules.player('two','Player 2')];
  let timer=null;
  function publish(){callbacks.onRoom({...match,players:match.players.map(p=>({...p})),now:Date.now()},null);}
  return {
    type:'local', connected:true, now:Date.now, open:publish, sync:publish,
    ready(value){for(const p of match.players)p.ready=value;rules.startIfReady(match);publish();},
    shoot(request,done){
      const result=rules.shoot(match,match.turn,request,Date.now());
      if(result.error){done(result.error);return;}
      done('');publish();
      timer=setTimeout(()=>{if(rules.settle(match,result))publish();},result.shot.duration*1000);
    },
    restart(){if(match.phase!=='finished')return;rules.reset(match);rules.startIfReady(match);publish();},
    close(){clearTimeout(timer);}
  };
}
