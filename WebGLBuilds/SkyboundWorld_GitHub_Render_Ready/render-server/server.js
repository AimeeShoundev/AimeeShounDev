'use strict';
const express=require('express');const http=require('http');const {Server}=require('socket.io');
const app=express();app.get('/',(_,res)=>res.send('Skybound Ground AR Racing server online'));app.get('/health',(_,res)=>res.json({ok:true,rooms:rooms.size}));
const server=http.createServer(app);const io=new Server(server,{cors:{origin:'*',methods:['GET','POST']}});const rooms=new Map();
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){let c;do{c=Array.from({length:5},()=>alphabet[Math.random()*alphabet.length|0]).join('')}while(rooms.has(c));return c}
function snapshot(room){return {code:room.code,started:room.started,winner:room.winner,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,car:p.car,angle:p.angle,speed:p.speed,laps:p.laps,progress:p.progress,ready:p.ready}))}}
function broadcast(room){io.to(room.code).emit('roomState',snapshot(room))}
function join(socket,room,name){if(room.players.size>=2)return socket.emit('gameError','This room is full (2 players).');if(socket.data.room)leave(socket);socket.join(room.code);socket.data.room=room.code;const car=room.players.size;room.players.set(socket.id,{id:socket.id,name:String(name||'Driver').trim().slice(0,18)||'Driver',car,angle:-Math.PI/2+(car?-.22:0),speed:0,laps:0,progress:0,ready:false,last:Date.now()});socket.emit('joined',{code:room.code,id:socket.id,car});broadcast(room)}
function leave(socket){const c=socket.data.room;if(!c)return;const r=rooms.get(c);socket.leave(c);delete socket.data.room;if(!r)return;r.players.delete(socket.id);if(r.players.size===0)rooms.delete(c);else{r.started=false;r.winner=null;for(const p of r.players.values()){p.ready=false;p.laps=0;p.progress=0;p.angle=-Math.PI/2;p.speed=0}broadcast(r)}}
io.on('connection',socket=>{
 socket.on('createRoom',data=>{const c=code();const room={code:c,players:new Map(),started:false,winner:null};rooms.set(c,room);join(socket,room,data?.name)});
 socket.on('joinRoom',data=>{const c=String(data?.code||'').toUpperCase().trim();const r=rooms.get(c);if(!r)return socket.emit('gameError','Room not found. Check the code.');join(socket,r,data?.name)});
 socket.on('ready',()=>{const r=rooms.get(socket.data.room);const p=r?.players.get(socket.id);if(!p||r.started)return;p.ready=true;if(r.players.size===2&&[...r.players.values()].every(x=>x.ready)){r.started=true;r.winner=null;for(const q of r.players.values()){q.laps=0;q.progress=0;q.speed=0;q.angle=-Math.PI/2+(q.car?-.22:0);q.last=Date.now()}}broadcast(r)});
 socket.on('drive',data=>{const r=rooms.get(socket.data.room);const p=r?.players.get(socket.id);if(!p||!r.started||r.winner)return;const now=Date.now();const dt=Math.min((now-p.last)/1000,.15);if(dt<.025)return;p.last=now;const throttle=data?.throttle===true;const brake=data?.brake===true;const steer=Math.max(-1,Math.min(1,Number(data?.steer)||0));p.speed=Math.max(0,Math.min(.85,p.speed+(throttle?.62:-.34)*dt-(brake?1.2*dt:0)));const previous=p.progress;p.progress+=p.speed*dt*(1-Math.abs(steer)*.16);p.angle=-Math.PI/2+p.progress*2*Math.PI;p.laps=Math.min(3,Math.floor(p.progress));if(previous<3&&p.progress>=3){r.winner=p.id;r.started=false;io.to(r.code).emit('winner',{id:p.id,name:p.name})}broadcast(r)});
 socket.on('leaveRoom',()=>leave(socket));socket.on('disconnect',()=>leave(socket));
});
setInterval(()=>{for(const [c,r] of rooms){if(r.players.size===0)rooms.delete(c)}},60000).unref();
const port=process.env.PORT||3000;server.listen(port,'0.0.0.0',()=>console.log('Skybound AR racing listening on '+port));
