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
const gems = [
  [-18, -15], [-12, 14], [16, -12], [19, 12], [0, 19],
  [-22, 2], [7, -20], [23, -4], [-6, 8], [11, 6],
  [-17, 19], [20, 20]
];
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
  const room = { code, players: new Map(), collected: new Set(), createdAt: Date.now() };
  rooms.set(code, room);
  return room;
}
function snapshot(room) { return { code: room.code, players: [...room.players.values()], collected: [...room.collected], gems }; }
function ackReply(ack, payload) { if (typeof ack === 'function') ack(payload); }
function removePlayer(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  delete socket.data.roomCode;
  if (!room) return;
  room.players.delete(socket.id);
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
    const player = { id:socket.id, name, color, x: index * 2 - 3, y:0, z:0, rot:0, score:0, moving:false };
    room.players.set(socket.id, player);
    socket.data.roomCode = code;
    socket.data.playerName = name;
    socket.join(code);
    ackReply(ack, {ok:true, selfId:socket.id, world:snapshot(room)});
    socket.to(code).emit('playerJoined', player);
    io.to(code).emit('systemMessage', `${name} joined the world!`);
  });
  socket.on('move', (state) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || !state || !Number.isFinite(state.x) || !Number.isFinite(state.z) || !Number.isFinite(state.rot)) return;
    // Server clamps the play area and rejects extreme position jumps.
    const x = Math.max(-27, Math.min(27, state.x));
    const z = Math.max(-27, Math.min(27, state.z));
    if (Math.hypot(x-player.x, z-player.z) > 5) return;
    player.x=x; player.z=z; player.rot=state.rot; player.moving=!!state.moving;
    socket.to(room.code).emit('playerMoved', {id:socket.id, x,z,rot:player.rot,moving:player.moving});
  });
  socket.on('collect', (rawIndex) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    const index = Number(rawIndex);
    if (!player || !Number.isInteger(index) || index < 0 || index >= gems.length || room.collected.has(index)) return;
    const [gx,gz] = gems[index];
    if (Math.hypot(player.x-gx, player.z-gz) > 2.6) return;
    room.collected.add(index);
    player.score++;
    io.to(room.code).emit('gemCollected', {index, id:socket.id, score:player.score});
    if (room.collected.size === gems.length) {
      io.to(room.code).emit('allCollected', {winner:player.name});
      setTimeout(() => {
        if (rooms.get(room.code) !== room) return;
        room.collected.clear();
        io.to(room.code).emit('gemsReset');
      }, 7000);
    }
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
app.get('/health', (_req,res) => res.json({ok:true, rooms:rooms.size}));
server.listen(PORT, '0.0.0.0', () => console.log(`Skybound World running at http://localhost:${PORT}`));
