const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express();const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*',methods:['GET','POST']}});
const rooms=new Map();
app.get('/',(_,res)=>res.json({ok:true,game:'Skybound AR Racer',rooms:rooms.size}));
app.get('/health',(_,res)=>res.json({ok:true}));
const clean=s=>String(s||'').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,18);
function code(){let c;do{c=Math.random().toString(36).slice(2,6).toUpperCase()}while(rooms.has(c));return c}
function broadcast(r){io.to(r.code).emit('room', {code:r.code,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,slot:p.slot,lap:p.lap,progress:p.progress,finished:p.finished})),started:r.started,winner:r.winner});}
function leave(s){const c=s.data.room;if(!c)return;const r=rooms.get(c);s.leave(c);delete s.data.room;if(!r)return;delete r.players[s.id];if(!Object.keys(r.players).length)rooms.delete(c);else{if(r.started&&!r.winner){r.started=false;Object.values(r.players).forEach(p=>{p.lap=0;p.progress=0;p.finished=false});io.to(c).emit('resetRace')}broadcast(r)}}
function join(s,r,name){if(Object.keys(r.players).length>=2)return s.emit('notice','This room already has two players.');leave(s);const taken=Object.values(r.players).map(p=>p.slot);const slot=taken.includes(0)?1:0;r.players[s.id]={id:s.id,name:clean(name)||'Racer',slot,lap:0,progress:0,finished:false};s.data.room=r.code;s.join(r.code);s.emit('joined',{code:r.code,slot,id:s.id});broadcast(r)}
io.on('connection',s=>{
 s.on('create',({name}={})=>{const c=code();const r={code:c,players:{},started:false,winner:null};rooms.set(c,r);join(s,r,name)});
 s.on('join',({code:c,name}={})=>{const r=rooms.get(String(c||'').trim().toUpperCase());if(!r)return s.emit('notice','Room not found. Check the code.');if(r.started)return s.emit('notice','Race already started.');join(s,r,name)});
 s.on('start',()=>{const r=rooms.get(s.data.room);if(!r||Object.keys(r.players).length!==2)return s.emit('notice','Wait for the second player.');r.started=true;r.winner=null;Object.values(r.players).forEach(p=>{p.lap=0;p.progress=0;p.finished=false});broadcast(r);io.to(r.code).emit('raceStart',{at:Date.now()+2500})});
 s.on('drive',({progress,lap}={})=>{const r=rooms.get(s.data.room);if(!r||!r.started||r.winner)return;const p=r.players[s.id];if(!p)return;const n=Number(progress);const l=Number(lap);if(!Number.isFinite(n)||!Number.isInteger(l)||l<0||l>3)return;const delta=(l+n)-(p.lap+p.progress);if(delta<-.12||delta>.16)return;p.progress=Math.max(0,Math.min(.999,n));p.lap=l; s.to(r.code).emit('opponent',{id:s.id,progress:p.progress,lap:p.lap});if(l>=3){p.finished=true;r.winner=p.name;io.to(r.code).emit('winner',{name:p.name,id:s.id});broadcast(r)}});
 s.on('leave',()=>leave(s));s.on('disconnect',()=>leave(s));
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Skybound AR Racer listening'));
