import * as THREE from './vendor/three.module.min.js';

const rules = globalThis.SkyboundBasketball, c = rules.COURT;
export const AR_SCALE = 0.58;
const TAU = Math.PI * 2;

function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}
function randomSource(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function courtPaint() {
  return texture(1024, 1024, (g, w, h) => {
    const random = randomSource(182);
    g.fillStyle = '#cb9761'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 36; row++) {
      const y = row * h / 36, height = h / 36, offset = -random() * 170;
      for (let x = offset; x < w; x += 170) {
        const light = Math.round(57 + random() * 10);
        g.fillStyle = 'hsl(31,45%,' + light + '%)'; g.fillRect(x, y, 169, height - 1);
        for (let j = 0; j < 7; j++) {
          g.fillStyle = 'rgba(91,57,31,' + (0.03 + random() * 0.06) + ')';
          g.fillRect(x + random() * 26, y + random() * height, 40 + random() * 110, 0.7);
        }
      }
    }
    const X = x => (x + 4.6) / 9.2 * w, Z = z => (z + 1.65) / 8.6 * h;
    g.fillStyle = '#245c4d'; g.fillRect(X(-1.38), Z(-0.81), X(1.38) - X(-1.38), Z(3.4) - Z(-0.81));
    g.strokeStyle = '#f8ebcd'; g.lineWidth = 4.5; g.lineJoin = 'round';
    function line(points) {
      g.beginPath(); points.forEach(([x,z],i) => { if (i) g.lineTo(X(x),Z(z)); else g.moveTo(X(x),Z(z)); }); g.stroke();
    }
    line([[-4.18,-0.81],[4.18,-0.81],[4.18,6.53],[-4.18,6.53],[-4.18,-0.81]]);
    line([[-1.38,-0.81],[-1.38,3.4],[1.38,3.4],[1.38,-0.81]]);
    function arc(x,z,r,from,to) {
      g.beginPath(); g.ellipse(X(x),Z(z),r*w/9.2,r*h/8.6,0,from,to); g.stroke();
    }
    arc(0,3.4,1.38,0,Math.PI);
    g.setLineDash([13,12]); arc(0,3.4,1.38,Math.PI,TAU); g.setLineDash([]);
    arc(0,0.55,3.60,0,Math.PI);
    line([[-3.60,-0.81],[-3.60,0.55]]); line([[3.60,-0.81],[3.60,0.55]]);
    for (const x of [-1,1]) for (const z of [.55,1.15,1.75,2.35]) line([[1.38*x,z],[1.55*x,z]]);
    arc(0,6.53,0.84,Math.PI,TAU);
    g.save(); g.translate(X(-.01),Z(5.58)); g.fillStyle = '#473e2e';
    g.textAlign = 'center'; g.font = 'italic 800 39px sans-serif'; g.fillText('S K Y B O U N D', 0, 0); g.restore();
  });
}
function boardPaint() {
  return texture(768,448,(g,w,h) => {
    g.fillStyle='#eee9d6'; g.fillRect(0,0,w,h);
    g.strokeStyle='#28443d'; g.lineWidth=13; g.strokeRect(13,13,w-26,h-26);
    g.strokeStyle='#e66232'; g.lineWidth=10; g.strokeRect(w*.343,h*.46,w*.314,h*.34);
    g.fillStyle='#28443d'; g.font='bold 18px sans-serif'; g.textAlign='center'; g.fillText('S K Y B O U N D',w/2,59);
    for (const x of [30,w-30]) for (const y of [30,h-30]) {g.beginPath();g.arc(x,y,3.4,0,TAU);g.fill();}
  });
}
function ballPaint() {
  return texture(1024,512,(g,w,h) => {
    const random=randomSource(73);
    g.fillStyle='#e87832';g.fillRect(0,0,w,h);
    for (let i=0;i<29000;i++) {
      const x=random()*w,y=random()*h, glow=random();
      g.fillStyle=glow>.5?'rgba(255,206,125,0.27)':'rgba(83,42,22,0.25)';
      g.beginPath();g.ellipse(x,y,0.7+glow,0.8+glow*.6,0,0,TAU);g.fill();
    }
    g.strokeStyle='#342c25';g.lineWidth=6;g.lineJoin='round';
    function curve(fn) {
      g.beginPath(); for(let x=0;x<=w;x+=2){const y=fn(x);if(x===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();
    }
    curve(()=>h*.5);
    curve(x=>h*(.5+.29*Math.sin(x/w*TAU)));
    curve(x=>h*(.23+.095*Math.cos(x/w*TAU*2)));
    curve(x=>h*(.77-.095*Math.cos(x/w*TAU*2)));
    for (const x of [0,w*.5,w]) {g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
  });
}
function mesh(geometry, material, parent, x=0, y=0, z=0) {
  const out=new THREE.Mesh(geometry,material);out.position.set(x,y,z);parent.add(out);return out;
}
const mat = (color,extra={}) => new THREE.MeshStandardMaterial({color,roughness:0.70,...extra});
function box(parent,material,w,h,d,x,y,z) {
  return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z);
}
function rod(parent, material, a,b,r) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);
  const out=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),material,parent);
  out.position.copy(start).lerp(end,.5);
  out.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return out;
}
function hoopModel() {
  const hoop=new THREE.Group(), dark=mat('#263a35'), steel=mat('#83918a',{metalness:.34});
  const orange=mat('#f25b29',{roughness:.41,metalness:.12}), green=mat('#1d5144');
  box(hoop,dark,1.03,.14,.87,0,.07,-.86);
  box(hoop,green,.30,2.25,.31,0,1.22,-.91);
  box(hoop,steel,.19,.91,.18,0,2.79,-.91);
  for(const x of [-.35,.35]) {
    rod(hoop,steel,[0,2.62,-.91],[x,3.56,-.53],.044);
    rod(hoop,dark,[0,3.18,-.91],[x,3.24,-.50],.042);
  }
  box(hoop,dark,c.boardWidth+.035,c.boardHeight+.04,c.boardDepth,0,c.boardY,c.boardZ);
  mesh(new THREE.PlaneGeometry(c.boardWidth,c.boardHeight),mat('#ffffff',{map:boardPaint(),roughness:.78}),hoop,0,c.boardY,c.boardZ+c.boardDepth*.5+.002);
  box(hoop,orange,.26,.16,.07,0,c.rimY-.02,c.boardZ+.067);
  box(hoop,orange,.17,.058,.14,0,c.rimY-.01,-.319);
  const rim=mesh(new THREE.TorusGeometry(c.rimRadius,c.tubeRadius,12,72),orange,hoop,0,c.rimY,0);rim.rotation.x=Math.PI/2;
  const net=new THREE.Group();net.position.y=c.rimY-.018;hoop.add(net);
  const white=mat('#fff2d3'), segments=[], rings=12;
  const levels=[[c.rimRadius,-.005],[.277,-.143],[.234,-.272],[.196,-.398],[.18,-.505]];
  function knot(row,i) {
    const [radius,y]=levels[row],a=(i+(row%2)*.5)/rings*TAU;return new THREE.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius);
  }
  function cord(a,b,r) {
    const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,delta.length(),5,1,true);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    const m=new THREE.Matrix4().compose(a.clone().lerp(b,.5),q,new THREE.Vector3(1,1,1));
    const flat=g.toNonIndexed();flat.applyMatrix4(m);segments.push(...flat.attributes.position.array);flat.dispose();g.dispose();
  }
  for(let i=0;i<rings;i++){
    for(let row=0;row<levels.length-1;row++){
      const a=knot(row,i);cord(a,knot(row+1,i),.0085);cord(a,knot(row+1,i+(row%2?1:-1)),.0085);
    }
    cord(knot(4,i),knot(4,i+1),.009);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));geometry.computeVertexNormals();
  mesh(geometry,white,net);return {hoop,net};
}
function shadow(parent,w,d,opacity) {
  const map=texture(96,96,(g,size)=>{
    const grad=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    grad.addColorStop(0,'rgba(0,0,0,0.85)');grad.addColorStop(.47,'rgba(0,0,0,0.4)');grad.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=grad;g.fillRect(0,0,size,size);
  });
  const item=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map,transparent:true,opacity,depthWrite:false}),parent);
  item.rotation.x=-Math.PI/2;return item;
}

export function createCourt(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(45,1,.035,70);
  scene.add(camera,new THREE.HemisphereLight('#fff1d7','#9ab5aa',1.9));
  const sun=new THREE.DirectionalLight('#fff0d6',2.45);sun.position.set(-3,7,5);scene.add(sun);
  const edge=new THREE.DirectionalLight('#dfefe5',1.00);edge.position.set(4,4,-4);scene.add(edge);

  const world=new THREE.Group();scene.add(world);
  const court=new THREE.Group();world.add(court);
  box(court,mat('#1c352e'),9.32,.18,8.72,0,-.153,2.65);
  box(court,mat('#ad774c'),9.25,.069,8.65,0,-.050,2.65);
  const floor=mesh(new THREE.PlaneGeometry(9.2,8.6),mat('#ffffff',{map:courtPaint(),roughness:.84}),court,0,-.012,2.65);floor.rotation.x=-Math.PI/2;
  const pad=shadow(world,1.98,1.62,.47);pad.position.set(.06,.004,-.71);
  const {hoop,net}=hoopModel();world.add(hoop);
  const ballMaterial=mat('#ffffff',{map:ballPaint(),roughness:.90});
  const ball=mesh(new THREE.SphereGeometry(c.ballRadius,40,28),ballMaterial,world);
  const ballShadow=shadow(world,.48,.48,.34);ballShadow.visible=false;
  const demoBall=mesh(new THREE.SphereGeometry(.20,48,32),ballMaterial,world);
  const guide=new THREE.Group();world.add(guide);
  const dotted=new THREE.MeshBasicMaterial({color:'#f9bd69'}), bead=new THREE.SphereGeometry(.024,8,6);
  for(let i=0;i<9;i++) mesh(bead,dotted,guide);
  const reticle=new THREE.Group();scene.add(reticle);reticle.visible=false;
  const ring=mesh(new THREE.RingGeometry(.115,.129,48),new THREE.MeshBasicMaterial({color:'#c7ff9c',side:THREE.DoubleSide}),reticle);
  ring.rotation.x=-Math.PI/2;
  for (let i=0;i<4;i++) {
    const m=mesh(new THREE.BoxGeometry(.018,.003,.05),ring.material,reticle);
    const a=i*Math.PI/2;m.rotation.y=a;m.position.set(Math.sin(a)*.145,0,Math.cos(a)*.145);
  }
  const eyePoint=new THREE.Vector3(), viewDir=new THREE.Vector3(), inv=new THREE.Matrix4(), guidePos=[0,0,0];
  let mode='home', sizeKey='', activeCamera=camera;
  function resize() {
    if(renderer.xr.isPresenting) return;
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),key=[w,h,mode].join('/');
    if(key===sizeKey)return;sizeKey=key;
    renderer.setSize(w,h,false);camera.aspect=w/h;
    if(mode==='home'){
      // A close three-quarter view keeps the rim recognizable at phone sizes.
      const wide=camera.aspect>1.55;
      camera.fov=camera.aspect<.83?47:wide?34:40;
      camera.position.set(wide?3.70:4.25,wide?3.05:3.35,wide?5.05:5.90);
      camera.lookAt(0,wide?2.45:2.16,.02);
    }else{
      camera.fov=camera.aspect<.84?54:48;
      camera.position.set(0,1.86,4.90);camera.lookAt(0,2.33,0);
    }
    camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  }
  function setMode(next) {
    mode=next;court.visible=next!=='ar';demoBall.visible=next==='home';ball.visible=false;ballShadow.visible=false;guide.visible=false;
    if(next!=='ar') resetWorld();else world.visible=false;
    resize();
  }
  function resetWorld() {
    world.matrixAutoUpdate=true;world.position.set(0,0,0);world.quaternion.identity();world.scale.set(1,1,1);
    world.updateMatrix();world.updateMatrixWorld(true);world.visible=true;reticle.visible=false;
  }
  function frameView(xrFrame) {
    activeCamera=camera;
    if(mode==='ar' && xrFrame && renderer.xr.isPresenting){
      const space=renderer.xr.getReferenceSpace(), pose=space && xrFrame.getViewerPose(space);
      // The XR renderer updates its camera on render. Read this frame's center-eye pose for input.
      if(pose?.views.length) {
        const xrView=pose.views[0];
        xrInputCamera.matrixWorld.fromArray(xrView.transform.matrix);
        xrInputCamera.matrixWorldInverse.copy(xrInputCamera.matrixWorld).invert();
        xrInputCamera.projectionMatrix.fromArray(xrView.projectionMatrix);
        xrInputCamera.projectionMatrixInverse.copy(xrInputCamera.projectionMatrix).invert();
        activeCamera=xrInputCamera;
      }
    }
  }
  const xrInputCamera=new THREE.PerspectiveCamera();
  function held() {
    // Put the ball at the same touch target on every screen, with launch origin in hoop-local coordinates.
    const cameraDepth=mode==='ar'?.48:1.08;
    eyePoint.set(0,-.47,0).applyMatrix4(activeCamera.projectionMatrixInverse);
    eyePoint.multiplyScalar(-cameraDepth/eyePoint.z).applyMatrix4(activeCamera.matrixWorld);
    world.updateWorldMatrix(true,false);inv.copy(world.matrixWorld).invert();
    eyePoint.applyMatrix4(inv);
    viewDir.set(0,0,-1).transformDirection(activeCamera.matrixWorld).transformDirection(inv);
    return {origin:eyePoint.toArray(),facing:Math.atan2(viewDir.x,viewDir.z)};
  }
  const rimPoint=new THREE.Vector3();
  function aimCue() {
    if(mode!=='ar'||!world.visible)return '';
    world.updateWorldMatrix(true,false);
    rimPoint.set(0,c.rimY,0).applyMatrix4(world.matrixWorld).applyMatrix4(activeCamera.matrixWorldInverse);
    if(rimPoint.z>=-.04)return 'Turn toward the hoop you placed.';
    rimPoint.applyMatrix4(activeCamera.projectionMatrix);
    if(rimPoint.y>.95)return 'Tilt your phone up until you see the rim.';
    if(rimPoint.y<-.95)return 'Tilt your phone down until you see the rim.';
    if(Math.abs(rimPoint.x)>.97)return 'Turn '+(rimPoint.x<0?'left':'right')+' to bring the hoop into view.';
    return '';
  }
  function draw(time,shot,timeInFlight,showHeld,aimInput) {
    if(mode==='home'){
      demoBall.position.set(.71,3.41+Math.sin(time*.00088)*.055,.50);
      demoBall.rotation.set(.22,time*.00014,.51);ball.visible=false;
    }else{
      ball.visible=Boolean(shot||showHeld) && world.visible;ballShadow.visible=ball.visible;
      if(shot){
        rules.sample(shot,timeInFlight,guidePos);ball.position.fromArray(guidePos);
        ball.rotation.set(-timeInFlight*4.6,.28,timeInFlight*.72+.22);
      }else if(showHeld) {
        ball.position.fromArray(held().origin);ball.rotation.set(.18,.45,-.31);
      }
      ballShadow.position.set(ball.position.x,.005,ball.position.z);
      ballShadow.material.opacity=.27/(1+Math.max(0,ball.position.y)*.35);
    }
    const netTime=shot?.madeAt==null?-1:timeInFlight-shot.madeAt;
    const swing=netTime>=0?Math.sin(netTime*23)*Math.exp(-netTime*5):0;
    net.scale.set(1-swing*.09,1+swing*.20,1-swing*.09);net.rotation.x=swing*.11;
    guide.visible=Boolean(aimInput&&showHeld&&!shot&&world.visible);
    if(guide.visible){
      const velocity=rules.launch(aimInput);
      guide.children.forEach((dot,i)=>{
        const t=.074+i*.055, o=aimInput.origin;
        dot.position.set(o[0]+velocity[0]*t,o[1]+velocity[1]*t-4.905*t*t,o[2]+velocity[2]*t);
        dot.scale.setScalar(1-i*.066);
      });
    }
    renderer.render(scene,camera);
  }
  return {renderer,world,reticle,resize,resetWorld,setMode,frameView,held,aimCue,draw};
}
