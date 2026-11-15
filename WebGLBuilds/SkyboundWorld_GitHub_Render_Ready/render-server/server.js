'use strict';
const express = require('express');
const http = require('node:http');
const {randomBytes, randomInt, randomUUID} = require('node:crypto');
const {Server} = require('socket.io');
const rules = require('./basketball.js');

const app = express(), server = http.createServer(app);
const io = new Server(server, {cors: {origin: '*', methods: ['GET', 'POST']}, maxHttpBufferSize: 16000});
const rooms = new Map();
const GRACE = 90000;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

app.get('/', (_, res) => res.json({game: 'Skybound Basketball', protocol: rules.PROTOCOL, status: 'online'}));
app.get('/health', (_, res) => res.json({ok: true, game: 'Skybound Basketball'}));
function createCode() {
  let code = '';
  do { code = Array.from({length: 5}, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
  return code;
}
function snapshot(room) {
  return {...room.match, players: room.match.players.map(p => ({...p})), now: Date.now(), protocol: rules.PROTOCOL};
}
function broadcast(room) { io.to(room.match.code).emit('room', snapshot(room)); }
function current(socket) {
  const room = rooms.get(socket.data.code);
  const seat = room?.seats.get(socket.data.id);
  if (seat?.socketId !== socket.id) return null;
  return {room, seat, player: room.match.players.find(p => p.id === socket.data.id)};
}
function removeSeat(room, id) {
  const seat = room.seats.get(id);
  if (!seat) return;
  clearTimeout(seat.expiry); clearTimeout(room.shotTimer);
  room.seats.delete(id);
  room.match.players = room.match.players.filter(p => p.id !== id);
  if (!room.match.players.length) { rooms.delete(room.match.code); return; }
  rules.reset(room.match); broadcast(room);
}
function displayName(raw, fallback) {
  return typeof raw === 'string' && raw.trim() ? raw.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 18) || fallback : fallback;
}
io.on('connection', socket => {
  socket.on('join', (data, ack) => {
    if (typeof ack !== 'function') return;
    if (data?.protocol !== rules.PROTOCOL) return ack({ok: false, error: 'Open the Skybound Basketball page to join.'});
    const fail = error => ack({ok: false, protocol: rules.PROTOCOL, error});
    const existing = current(socket);
    if (existing && existing.room.match.code !== data.code) return fail('Leave your current room before opening another.');
    const isResume = typeof data.token === 'string' && data.token.length > 0;
    const code = data.create && !isResume ? createCode() : String(data.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,6}$/.test(code)) return fail('Enter a 4–6 character room code.');
    let room = rooms.get(code);
    if (!room && isResume) return fail('Your room expired. Create a new room or join your friend again.');
    if (!room && !data.create) return fail('Room not found. Check the code your friend shared.');
    if (!room) {
      room = {match: rules.createMatch(code), seats: new Map(), shotTimer: null};
      rooms.set(code, room);
    }
    let seat = null;
    if (isResume) {
      seat = [...room.seats.values()].find(s => s.token === data.token);
      if (!seat) return fail('This seat expired. Join again with your room code.');
    } else if (existing) {
      seat = existing.seat;
    } else {
      if (room.seats.size >= 2) return fail('This room already has two players.');
      const id = randomUUID();
      seat = {id, token: randomBytes(24).toString('hex'), socketId: null, expiry: null};
      room.seats.set(id, seat);
      room.match.players.push(rules.player(id, displayName(data.name, 'Player ' + room.seats.size)));
    }
    clearTimeout(seat.expiry);
    const previous = seat.socketId;
    seat.socketId = socket.id;
    if (previous && previous !== socket.id) io.sockets.sockets.get(previous)?.disconnect(true);
    const player = room.match.players.find(p => p.id === seat.id);
    player.connected = true;
    socket.data.code = code; socket.data.id = seat.id; socket.join(code);
    ack({ok: true, protocol: rules.PROTOCOL, id: seat.id, token: seat.token, room: snapshot(room)});
    broadcast(room);
  });
  socket.on('ready', value => {
    const active = current(socket);
    if (!active || typeof value !== 'boolean') return;
    active.player.ready = value;
    rules.startIfReady(active.room.match); broadcast(active.room);
  });
  socket.on('shoot', (request, ack) => {
    const active = current(socket);
    if (!active || typeof ack !== 'function') return;
    const {room, player} = active;
    const result = rules.shoot(room.match, player.id, request, Date.now() + 65);
    if (result.error) return ack({ok: false, error: result.error, room: snapshot(room)});
    ack({ok: true}); broadcast(room);
    room.shotTimer = setTimeout(() => {
      if (rules.settle(room.match, result)) broadcast(room);
    }, Math.max(0, result.shot.at + result.shot.duration * 1000 - Date.now()));
  });
  socket.on('sync', ack => {
    const active = current(socket);
    if (active && typeof ack === 'function') ack(snapshot(active.room));
  });
  socket.on('restart', generation => {
    const active = current(socket);
    if (!active || active.room.match.phase !== 'finished' || active.room.match.generation !== generation) return;
    rules.reset(active.room.match); rules.startIfReady(active.room.match); broadcast(active.room);
  });
  socket.on('leave', ack => {
    const active = current(socket);
    if (active) {
      socket.leave(active.room.match.code); removeSeat(active.room, active.player.id);
      socket.data.code = null; socket.data.id = null;
    }
    if (typeof ack === 'function') ack({ok: true});
  });
  socket.on('disconnect', () => {
    const active = current(socket);
    if (!active) return;
    const {room, player, seat} = active;
    seat.socketId = null; player.connected = false; player.ready = false;
    seat.expiry = setTimeout(() => { if (!seat.socketId) removeSeat(room, player.id); }, GRACE);
    broadcast(room);
  });
});
server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Skybound Basketball listening'));
