import * as THREE from 'three';

const TITLES = {
  candyman:'Candyman', waterworld:'Waterworld', romeojuliet:'Romeo + Juliet',
  delicatessen:'Delicatessen', strangedays:'Strange Days', talented_mr_ripley:'The Talented Mr. Ripley',
  cruel_expectation:'Cruel Intentions', matrix:'The Hurricane', fievel:'An American Tail: Fievel Goes West',
  wildthings:'Wild Things', thx:'THX 1138', eternal:'Eternal Sunshine of the Spotless Mind',
  ghost:'Ghostbusters', loganrun:"Logan’s Run", evildead:'Evil Dead 2',
  nakedlunch:'Naked Lunch', chasingamy:'Chasing Amy', mallratz:'Mallrats',
  neverending:'The NeverEnding Story', reailitybites:'Reality Bites', toy:'Toys'
};

/** A centered pivot for each actual case, preserving its mesh, UVs and materials. */
export function prepareTapes(model) {
  const meshes=[];
  model.traverse(o=>{if(o.isMesh && /^Video_Case/i.test(o.name)) meshes.push(o);});
  const records=meshes.map(mesh=>{
    mesh.geometry.computeBoundingBox();
    const center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    const parent=mesh.parent;
    mesh.updateMatrix();
    const pivot=new THREE.Group();
    pivot.name='TapePivot_'+mesh.name;
    pivot.position.copy(center.applyMatrix4(mesh.matrix));
    parent.add(pivot);
    // Mesh remains unmodified except for translation into its centered parent.
    mesh.position.sub(pivot.position);
    pivot.add(mesh);
    pivot.updateWorldMatrix(true,true);
    const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
    const key=material.name.replace(/^tape[-_]/,'').replace(/\.\d+$/,'');
    const record={
      pivot, mesh, parent, title:TITLES[key] || key.replace(/[_-]/g,' '),
      homePosition:pivot.position.clone(), homeQuaternion:pivot.quaternion.clone(), homeScale:pivot.scale.clone(),
      row:0, index:0
    };
    mesh.userData.tapeRecord=record;
    return record;
  });
  records.sort((a,b)=> Math.abs(a.homePosition.y-b.homePosition.y)>.5 ? b.homePosition.y-a.homePosition.y : a.homePosition.x-b.homePosition.x);
  let row=1, previousY=records[0]?.homePosition.y;
  records.forEach((r,i)=>{if(Math.abs(previousY-r.homePosition.y)>.5){row++;previousY=r.homePosition.y;}r.index=i;r.row=row;});
  return records;
}

export function homeWorldPose(record, position, quaternion, scale) {
  record.parent.updateWorldMatrix(true,false);
  const local=new THREE.Matrix4().compose(record.homePosition,record.homeQuaternion,record.homeScale);
  new THREE.Matrix4().multiplyMatrices(record.parent.matrixWorld,local).decompose(position,quaternion,scale);
}

export function restoreTape(record) {
  record.parent.add(record.pivot);
  record.pivot.position.copy(record.homePosition);
  record.pivot.quaternion.copy(record.homeQuaternion);
  record.pivot.scale.copy(record.homeScale);
  record.pivot.updateMatrixWorld(true);
}

export class TapeInspector {
  constructor(scene,records,onChange=()=>{}) {
    this.scene=scene;this.records=records;this.onChange=onChange;
    this.record=null;this.phase='idle';this.elapsed=0;this.duration=.55;
    this.rotation=new THREE.Quaternion();this.targetRotation=new THREE.Quaternion();
    this.distanceFactor=1;this.autoSpin=false;
    this.fromPosition=new THREE.Vector3();this.fromQuaternion=new THREE.Quaternion();this.fromScale=new THREE.Vector3();
    this.goalPosition=new THREE.Vector3();this.goalQuaternion=new THREE.Quaternion();this.goalScale=new THREE.Vector3();
    this.viewQuaternion=new THREE.Quaternion();this.offset=new THREE.Vector3();this.deltaQ=new THREE.Quaternion();
    this.up=new THREE.Vector3(0,1,0);this.right=new THREE.Vector3(1,0,0);
  }
  pick(record) {
    if(this.record || !this.records.includes(record))return false;
    this.record=record;this.phase='out';this.elapsed=0;this.distanceFactor=1;this.autoSpin=false;
    this.rotation.identity();this.targetRotation.identity();
    record.pivot.updateWorldMatrix(true,true);
    const box=new THREE.Box3().setFromObject(record.pivot);
    const height=Math.max(.01,box.max.y-box.min.y);
    this.scene.attach(record.pivot);
    this.capture();
    // A comfortable 30 cm inspection height, independent of shelf size.
    this.inspectScale=record.pivot.scale.clone().multiplyScalar(.30/height);
    this.onChange();return true;
  }
  capture() {
    this.fromPosition.copy(this.record.pivot.position);
    this.fromQuaternion.copy(this.record.pivot.quaternion);
    this.fromScale.copy(this.record.pivot.scale);
  }
  returnToShelf() {
    if(!this.record || this.phase==='back')return false;
    this.phase='back';this.elapsed=0;this.autoSpin=false;this.capture();this.onChange();return true;
  }
  reset() {
    if(this.record)restoreTape(this.record);
    this.record=null;this.phase='idle';this.autoSpin=false;this.onChange();
  }
  rotate(dx,dy) {
    if(!this.record||this.phase==='back')return;
    this.autoSpin=false;
    this.deltaQ.setFromAxisAngle(this.up,dx*.009);this.targetRotation.premultiply(this.deltaQ);
    this.deltaQ.setFromAxisAngle(this.right,dy*.009);this.targetRotation.premultiply(this.deltaQ);
    this.targetRotation.normalize();this.rotation.copy(this.targetRotation);
  }
  face(back=false) {this.autoSpin=false;this.targetRotation.setFromAxisAngle(this.up,back?Math.PI:0);}
  zoom(factor) {this.distanceFactor=THREE.MathUtils.clamp(this.distanceFactor*factor,.65,1.65);}
  update(dt,view) {
    if(!this.record)return;
    dt=Math.min(dt,.05);this.elapsed+=dt;
    const pivot=this.record.pivot;
    if(this.phase==='back') {
      homeWorldPose(this.record,this.goalPosition,this.goalQuaternion,this.goalScale);
    } else {
      view.getWorldQuaternion(this.viewQuaternion);
      view.getWorldPosition(this.goalPosition);
      const tanHalfFov=1/Math.max(.5,view.projectionMatrix.elements[5]);
      const distance=Math.max(.38,.30/(2*tanHalfFov*.48))*this.distanceFactor;
      const p=view.projectionMatrix.elements;
      this.offset.set(distance*p[8]/p[0],distance*(.15+p[9])/p[5],-distance).applyQuaternion(this.viewQuaternion);
      this.goalPosition.add(this.offset);
      if(this.autoSpin){this.deltaQ.setFromAxisAngle(this.up,dt*.65);this.targetRotation.premultiply(this.deltaQ);}
      this.rotation.slerp(this.targetRotation,1-Math.exp(-18*dt));
      this.goalQuaternion.copy(this.viewQuaternion).multiply(this.rotation);
      this.goalScale.copy(this.inspectScale);
    }
    if(this.phase==='held') {
      pivot.position.lerp(this.goalPosition,1-Math.exp(-24*dt));
      pivot.quaternion.slerp(this.goalQuaternion,1-Math.exp(-30*dt));
      pivot.scale.copy(this.goalScale);
    } else {
      const t=Math.min(1,this.elapsed/this.duration);const e=t*t*(3-2*t);
      pivot.position.lerpVectors(this.fromPosition,this.goalPosition,e);
      pivot.quaternion.slerpQuaternions(this.fromQuaternion,this.goalQuaternion,e);
      pivot.scale.lerpVectors(this.fromScale,this.goalScale,e);
      if(t===1){
        if(this.phase==='back'){this.reset();}else{this.phase='held';this.onChange();}
      }
    }
  }
}
