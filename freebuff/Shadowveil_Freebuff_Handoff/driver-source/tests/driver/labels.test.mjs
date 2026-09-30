import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../public/driver-foundation/modules/driver/driver.js';
import * as D from '../../public/driver-foundation/modules/driver/document.js';
import {jointPresentation as label,validLabelBasis} from '../../public/driver-foundation/modules/driver/labels.js';
const rig=R.provisionalRig(),pose=R.neutralDriver(rig),world=R.evaluateDriver(rig,pose);
const front={yaw:0,pitch:0,zoom:1},back={...front,yaw:180};
test('Front: visible-left wrist says Screen left, not anatomical right',()=>{
 assert.equal(label('hand-R',world,front).primary,'Screen left · Wrist');
 assert.equal(label('upper-R',world,front).marker,'Screen L');
});
test('Front: visible-right wrist says Screen right, not anatomical left',()=>{
 assert.equal(label('hand-L',world,front).primary,'Screen right · Wrist');
 assert.equal(label('upper-L',world,front).marker,'Screen R');
});
test('Back: labels follow projected position without swapping IDs',()=>{
 assert.equal(label('hand-R',world,back).primary,'Screen right · Wrist');
 assert.equal(label('hand-L',world,back).primary,'Screen left · Wrist');
 assert.equal(label('hand-L',world,back).id,'hand-L');
});
test('Anatomical mode always explicitly says Character and preserves identity',()=>{
 for(const cam of [front,back,{...front,yaw:90}]) {
  assert.equal(label('hand-L',world,cam,'anatomical').primary,'Character left · Wrist');
  assert.equal(label('hand-R',world,cam,'anatomical').primary,'Character right · Wrist');
 }
});
test('Midline body controls do not inherit arbitrary side labels when leaning',()=>{
 let p=R.withAngle(pose,'thorax','z',5),w=R.evaluateDriver(rig,p);
 for(const cam of [front,back])for(const id of ['pelvis','head','thorax','cervical'])
  assert.equal(label(id,w,cam).location,'midline');
});
test('Profile-view coincident pairs say overlap instead of flickering left/right',()=>{
 for(const yaw of [90,-90,89.9,90.1])for(const id of ['hand-L','hand-R'])
  assert.equal(label(id,world,{...front,yaw}).primary,'Screen overlap · Wrist');
});
test('Screen centre is neutral when a nonoverlapping hand reaches the midline',()=>{
 const w=structuredClone(world);w['hand-L'].position.x=w.pelvis.position.x;
 assert.equal(label('hand-L',w,front).primary,'Screen centre · Wrist');
});
test('Crossed-hand labeling follows actual position, anatomy stays in detail',()=>{
 const w=structuredClone(world);w['hand-L'].position.x=w.pelvis.position.x-90;
 assert.equal(label('hand-L',w,front).primary,'Screen left · Wrist');
 assert.equal(label('hand-L',w,front).anatomical,'Character left · Wrist');
 assert.equal(label('hand-L',w,front).detail,'Character left · Wrist · ID: hand-L');
});
test('Root translation does not change labels relative to the character midline',()=>{
 const w=structuredClone(world);for(const j of Object.values(w))j.position.x+=1000;
 for(const b of rig.bones)assert.equal(label(b.id,w,front).primary,label(b.id,world,front).primary);
});
test('Label computation never mutates rig, pose, weights or world transforms',()=>{
 const snapshot=JSON.stringify({rig,pose,world});
 for(const yaw of [-180,-90,-30,0,30,90,180])for(const b of rig.bones)for(const basis of ['screen','anatomical'])
  label(b.id,world,{yaw,pitch:20,zoom:1},basis);
 assert.equal(JSON.stringify({rig,pose,world}),snapshot);
});
test('Legacy project without preference defaults to screen and keeps physical state',async()=>{
 const old=D.createProject('asset','source');delete old.workspace.labelBasis;
 old.workspace.selectedBone='hand-L';old.workspace.camera=back;
 const before=structuredClone(old),next=await D.validateProject(old,'asset','source');
 assert.equal(next.workspace.labelBasis,'screen');
 assert.deepEqual(next.pose,before.pose);assert.deepEqual(next.driver,before.driver);
 assert.equal(next.workspace.selectedBone,'hand-L');assert.deepEqual(old,before);
});
test('Both label preferences round-trip with the unchanged project schema',async()=>{
 for(const basis of ['screen','anatomical']){
  const p=D.createProject('asset','source');p.workspace.labelBasis=basis;
  const q=await D.validateProject(JSON.parse(JSON.stringify(p)),'asset','source');
  assert.deepEqual(q,p);
 }
});
test('Invalid conventions and unknown nodes are rejected',async()=>{
 for(const value of ['mirror','left',null,3,{}]){
  assert.equal(validLabelBasis(value),false);
  const p=D.createProject('asset','source');p.workspace.labelBasis=value;
  await assert.rejects(()=>D.validateProject(p,'asset','source'),/label basis/);
 }
 assert.throws(()=>label('missing',world,front),/Unknown label node/);
 assert.throws(()=>label('hand-R',world,front,'mirror'),/Invalid label basis/);
});
