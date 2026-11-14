const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express(); const server = http.createServer(app);
const io = new Server(server, {cors:{origin:'*',methods:['GET','POST']}});
app.get('/', (_,res)=>res.json({game:'Skybound Android AR Racing',status:'online'}));
app.get('/health',(_,res)=>res.json({ok:true}));
const rooms = new Map();
function clean(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}
function snapshot(room){return {code:room.code,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,color:p.color,progress:p.progress,lane:p.lane,speed:p.speed,ready:p.ready})),started:room.started,winner:room.winner}}
function emit(room){io.to(room.code).emit('room',snapshot(room))}
function leave(socket){const code=socket.data.code;if(!code)return;const room=rooms.get(code);socket.leave(code);socket.data.code=null;if(!room)return;room.players.delete(socket.id);if(!room.players.size)rooms.delete(code);else {room.started=false;room.winner=null;for(const p of room.players.values()){p.ready=false;p.progress=0}emit(room)}}
io.on('connection',socket=>{
 socket.on('join',(data,ack)=>{try{leave(socket);const code=clean(data?.code);if(code.length<4)return ack?.({ok:false,error:'Enter a 4–6 character room code.'});let room=rooms.get(code);if(!room){room={code,players:new Map(),started:false,winner:null};rooms.set(code,room)}if(room.players.size>=2)return ack?.({ok:false,error:'Room is full (2 players maximum).'});if(room.started)return ack?.({ok:false,error:'Race already started.'});const color=room.players.size===0?0xffc04b:0x38d7df;room.players.set(socket.id,{id:socket.id,name:String(data?.name||'Racer').slice(0,18),color,progress:0,lane:0,speed:0,ready:false,last:Date.now()});socket.join(code);socket.data.code=code;ack?.({ok:true,id:socket.id});emit(room)}catch(e){ack?.({ok:false,error:'Unable to join room.'})}});
 socket.on('ready',()=>{const room=rooms.get(socket.data.code);if(!room||room.started)return;const p=room.players.get(socket.id);if(!p)return;p.ready=true;if(room.players.size===2&&[...room.players.values()].every(p=>p.ready)){room.started=true;room.winner=null;for(const player of room.players.values()){player.progress=0;player.speed=0;player.last=Date.now()}io.to(room.code).emit('start',{at:Date.now()})}emit(room)});
 socket.on('drive',data=>{const room=rooms.get(socket.data.code);if(!room?.started||room.winner)return;const p=room.players.get(socket.id);if(!p)return;const now=Date.now();const dt=Math.min((now-p.last)/1000,.2);p.last=now;const gas=Boolean(data?.gas),brake=Boolean(data?.brake);p.speed=Math.max(0,Math.min(1.1,p.speed+(gas?0.8:-0.45)*dt-(brake?1.6*dt:0)));p.lane=Math.max(-1,Math.min(1,p.lane+Math.max(-1,Math.min(1,Number(data?.steer)||0))*dt*1.35));p.progress+=p.speed*dt*.12;if(p.progress>=3){p.progress=3;room.winner=p.id;room.started=false;io.to(room.code).emit('finish',{id:p.id,name:p.name})}emit(room)});
 socket.on('restart',()=>{const room=rooms.get(socket.data.code);if(!room)return;room.started=false;room.winner=null;for(const p of room.players.values()){p.progress=0;p.speed=0;p.ready=false}emit(room)});
 socket.on('disconnect',()=>leave(socket));
});
setInterval(()=>{for(const room of rooms.values())if(room.started){for(const p of room.players.values())if(Date.now()-p.last>900){p.speed=0;p.last=Date.now()}emit(room)}},250);
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Skybound Android AR Racing listening'));
