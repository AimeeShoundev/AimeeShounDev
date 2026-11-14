'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || true, methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const rooms = new Map();
const colors = [0x4ed5d0, 0xffb84d, 0xff719b, 0x9c8cff];
const CHECKPOINTS=8, LAPS=3;
const points=Array.from({length:CHECKPOINTS},(_,i)=>[22*Math.cos(-i*2*Math.PI/CHECKPOINTS),13*Math.sin(-i*2*Math.PI/CHECKPOINTS)]);
function safeName(value) {
  return String(value || 'Explorer').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 18) || 'Explorer';
}
function safeCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
function roomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({length: 5}, () => chars[Math.floor(Math.random() * chars.length)]).join(''); } while (rooms.has(code));
  return code;
}
function makeRoom(code) {
  const room = { code, players: new Map(), host:null, progress:new Map(), raceState:"waiting", startAt:0, finished:[], createdAt: Date.now() };
  rooms.set(code, room);
  return room;
}
function progressList(room){return [...room.progress].map(([id,progress])=>({id,...progress}));}
function snapshot(room) { return { code: room.code, players: [...room.players.values()], host:room.host, raceState:room.raceState, startAt:room.startAt, progress:progressList(room) }; }
function raceUpdate(room){io.to(room.code).emit("raceUpdate",{state:room.raceState,startAt:room.startAt,host:room.host,progress:progressList(room)});}
function ackReply(ack, payload) { if (typeof ack === 'function') ack(payload); }
function removePlayer(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  delete socket.data.roomCode;
  if (!room) return;
  room.players.delete(socket.id);room.progress.delete(socket.id);if(room.host===socket.id){room.host=room.players.keys().next().value||null;raceUpdate(room);}
  io.to(code).emit('playerLeft', socket.id);
  io.to(code).emit('systemMessage', `${socket.data.playerName || 'A player'} left the world.`);
  if (!room.players.size) rooms.delete(code);
}
io.on('connection', (socket) => {
  socket.on('joinRoom', (payload, ack) => {
    if (socket.data.roomCode) return ackReply(ack, {ok:false, error:'Already in a room. Leave first.'});
    const create = payload && payload.create === true;
    const code = create ? roomCode() : safeCode(payload && payload.code);
    let room = rooms.get(code);
    if (create) room = makeRoom(code);
    if (!room) return ackReply(ack, {ok:false, error:'Room not found. Check the code.'});
    if (room.players.size >= MAX_PLAYERS) return ackReply(ack, {ok:false, error:'This room is full (4 players).'});
    const name = safeName(payload && payload.name);
    const used = new Set([...room.players.values()].map(p => p.color));
    const color = colors.find(c => !used.has(c)) || colors[0];
    const index = room.players.size;
    const player = { id:socket.id, name, color, x: 22 + (index%2)*1.8 - .9, y:0, z: -index*2.3, rot:Math.PI, score:0, moving:false };
    room.players.set(socket.id, player);if(!room.host)room.host=socket.id;room.progress.set(socket.id,{lap:0,checkpoint:0,finished:false,place:null,eligible:room.raceState==="waiting"||room.raceState==="finished"});
    socket.data.roomCode = code;
    socket.data.playerName = name;
    socket.join(code);
    ackReply(ack, {ok:true, selfId:socket.id, world:snapshot(room)});
    socket.to(code).emit('playerJoined', player);raceUpdate(room);
    io.to(code).emit('systemMessage', `${name} joined the world!`);
  });
  socket.on('move', (state) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || !state || !Number.isFinite(state.x) || !Number.isFinite(state.z) || !Number.isFinite(state.rot)) return;
    // Server clamps the play area and rejects extreme position jumps.
    const x = Math.max(-31, Math.min(31, state.x));
    const z = Math.max(-23, Math.min(23, state.z));
    if (Math.hypot(x-player.x, z-player.z) > 5) return;
    player.x=x; player.z=z; player.rot=state.rot; player.moving=!!state.moving;
    socket.to(room.code).emit('playerMoved', {id:socket.id, x,z,rot:player.rot,moving:player.moving});
  });
  socket.on('startRace',(ack)=>{
    const room=rooms.get(socket.data.roomCode);
    if(!room||room.host!==socket.id)return ackReply(ack,{ok:false,error:'Only the room host can start the race.'});
    if(room.raceState==='running'||room.raceState==='countdown')return ackReply(ack,{ok:false,error:'Race already underway.'});
    room.raceState='countdown';room.startAt=Date.now()+3500;room.finished=[];
    let index=0;
    for(const [id,p] of room.players){p.x=22+(index%2)*1.8-.9;p.z=-Math.floor(index/2)*3.3;p.rot=Math.PI;index++;room.progress.set(id,{lap:0,checkpoint:0,finished:false,place:null,eligible:true});io.to(id).emit('raceReset',{x:p.x,z:p.z,rot:p.rot});}
    raceUpdate(room);ackReply(ack,{ok:true});
    setTimeout(()=>{if(rooms.get(room.code)!==room||room.raceState!=='countdown')return;room.raceState='running';raceUpdate(room);},3500);
  });
  socket.on('checkpoint',raw=>{
    const room=rooms.get(socket.data.roomCode);if(!room||room.raceState!=='running')return;
    const player=room.players.get(socket.id),p=room.progress.get(socket.id);if(!player||!p||p.finished||!p.eligible)return;
    const index=Number(raw);if(!Number.isInteger(index)||index!==p.checkpoint)return;
    const [x,z]=points[index];if(Math.hypot(player.x-x,player.z-z)>4.6)return;
    // A minimum travel interval prevents repeated checkpoint requests from skipping the track.
    const now=Date.now();if(p.lastCheckpointAt&&now-p.lastCheckpointAt<500)return;
    p.lastCheckpointAt=now;p.checkpoint++;
    if(p.checkpoint===CHECKPOINTS){p.checkpoint=0;p.lap++;}
    if(p.lap>=LAPS){p.finished=true;p.place=room.finished.length+1;room.finished.push(socket.id);io.to(room.code).emit('raceFinished',{id:socket.id,name:player.name,place:p.place});}
    io.to(room.code).emit('raceProgress',{id:socket.id,progress:p});
    if([...room.progress.values()].filter(q=>q.eligible).every(q=>q.finished)){room.raceState='finished';raceUpdate(room);}
  });
  socket.on('chat', (raw) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const message = String(raw || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 140);
    if (!message) return;
    const now=Date.now();
    if (now - (socket.data.lastChat || 0) < 750) return;
    socket.data.lastChat=now;
    io.to(room.code).emit('chat', {name:socket.data.playerName, message});
  });
  socket.on('leaveRoom', () => removePlayer(socket));
  socket.on('disconnect', () => removePlayer(socket));
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req,res) => res.json({ok:true, game:'skybound-turbo-car-racing', rooms:rooms.size}));
server.listen(PORT, '0.0.0.0', () => console.log(`Skybound World running at http://localhost:${PORT}`));
