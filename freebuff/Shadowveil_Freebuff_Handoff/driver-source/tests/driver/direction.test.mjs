import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../../public/driver-foundation/modules/driver/controls.js';
import * as R from '../../public/driver-foundation/modules/driver/driver.js';
import * as M from '../../public/driver-foundation/modules/driver/math3.js';
const rig=R.provisionalRig(), neutral=R.neutralDriver(rig);
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
const nearV=(a,b)=>['x','y','z'].forEach(k=>near(a[k],b[k]));
const camera={yaw:0,pitch:0,zoom:1};
function prepared(){let p=structuredClone(neutral);for(const s of ['R','L']){p=R.withAngle(p,'upper-'+s,'z',s==='R'?-15:15);p=R.withAngle(p,'forearm-'+s,'z',s==='R'?-25:25);p=R.withAngle(p,'shin-'+s,'z',s==='R'?10:-10);p=R.withAngle(p,'thigh-'+s,'z',s==='R'?-7:7);}return p;}
const p=prepared();
function movement(g,pose){const a=M.project3(g.start,g.camera),b=M.project3(R.evaluateDriver(rig,pose)[g.bone].position,g.camera);return {x:(b.x-a.x)*g.scale,y:-(b.y-a.y)*g.scale};}
function nonReverse(r,dx,dy){if(Math.abs(dx)>.25)assert.ok(r.x*Math.sign(dx)>=-.051,JSON.stringify({r,dx,dy}));if(Math.abs(dy)>.25)assert.ok(r.y*Math.sign(dy)>=-.051,JSON.stringify({r,dx,dy}));}

test('Existing fixed-sign drag is a negative control: rightwards gesture pushes distal wrist left',()=>{
 const old=R.withAngle(neutral,'forearm-R','z',-20*.3),w0=R.evaluateDriver(rig,neutral),w1=R.evaluateDriver(rig,old);
 nearV(w0['forearm-R'].position,w1['forearm-R'].position);
 assert.ok(w1['hand-R'].position.x<w0['hand-R'].position.x);
});
test('Projection inverse round-trips simultaneous yaw and pitch',()=>{for(const yaw of [-180,-90,-45,0,32,90,180])for(const pitch of [-60,-20,0,40,60]){const cam={yaw,pitch,zoom:1};nearV(C.cameraToWorld(M.project3(M.v3(18,234,-67),cam),cam),M.v3(18,234,-67));}});
test('Screen-root displacement handles all four directions, zoom scales and combined camera angles',()=>{
 for(const yaw of [-180,-90,-35,0,45,90,180])for(const pitch of [-50,0,30])for(const scale of [.2,.65,1.2])for(const [dx,dy]of[[-3,0],[3,0],[0,-3],[0,3]]){
  const cam={yaw,pitch,zoom:1}, g=C.beginNodeGrab(rig,neutral,'pelvis',cam,scale),r=C.solveNodeGrab(rig,g,dx,dy),v=movement(g,r.pose);near(v.x,dx);near(v.y,dy);
 }
});
test('Root remains at the same camera-plane depth while dragging',()=>{
 const cam={yaw:48,pitch:31,zoom:.7},g=C.beginNodeGrab(rig,neutral,'pelvis',cam,.5),r=C.solveNodeGrab(rig,g,12,-7);
 near(M.project3(R.evaluateDriver(rig,r.pose).pelvis.position,cam).z,M.project3(g.start,cam).z);
});
test('Anatomical IDs never change with front or back views',()=>{
 const world=R.evaluateDriver(rig,neutral);assert.equal(C.anatomicalSide('hand-R'),'right');assert.equal(C.anatomicalSide('hand-L'),'left');
 assert.equal(C.screenSide('hand-R',world,camera),'screen-left');assert.equal(C.screenSide('hand-L',world,camera),'screen-right');
 assert.equal(C.screenSide('hand-R',world,{...camera,yaw:180}),'screen-right');
 assert.equal(C.screenSide('hand-L',world,{...camera,yaw:180}),'screen-left');
});
test('Node labels distinguish anatomy from screen-relative directions',()=>{
 assert.equal(C.nodeLabel('forearm-R'),'Her right · Elbow');assert.equal(C.nodeLabel('hand-L'),'Her left · Wrist');
});
test('A node placement changes ancestors, not the node bone rotation itself',()=>{
 const g=C.beginNodeGrab(rig,p,'forearm-R',camera,.5),r=C.solveNodeGrab(rig,g,-5,0);
 ['x','y','z','w'].forEach(k=>near(r.pose.rotations['forearm-R'][k],p.rotations['forearm-R'][k],1e-12));assert.notDeepEqual(r.pose.rotations['upper-R'],p.rotations['upper-R']);
 assert.ok(movement(g,r.pose).x<-3);
});
test('Wrist placement adjusts its arm chain, not the opposite arm',()=>{
 const g=C.beginNodeGrab(rig,p,'hand-L',camera,.5),r=C.solveNodeGrab(rig,g,5,-5);
 for(const id of ['upper-R','forearm-R','hand-R'])['x','y','z','w'].forEach(k=>near(r.pose.rotations[id][k],p.rotations[id][k],1e-12));
 assert.ok(r.errorPixels<.4);assert.deepEqual(r.pose.root,p.root);
});
test('Stationary grab exactly preserves pose and zero displacement after a moved event returns start',()=>{
 for(const id of rig.bones.map(b=>b.id)){const g=C.beginNodeGrab(rig,p,id,camera,.5);C.solveNodeGrab(rig,g,8,3);const z=C.solveNodeGrab(rig,g,0,0);assert.deepEqual(z.pose,p);assert.equal(z.errorPixels,0);}
});
test('Both wrists track reachable horizontal and vertical requests in front, angled, side and back views',()=>{
 for(const yaw of [0,35,90,180,-90])for(const id of ['hand-R','hand-L'])for(const [dx,dy]of[[4,0],[-4,0],[0,4],[0,-4]]){
  const cam={yaw,pitch:15,zoom:1},g=C.beginNodeGrab(rig,p,id,cam,.5),r=C.solveNodeGrab(rig,g,dx,dy);nonReverse(movement(g,r.pose),dx,dy);assert.ok(r.errorPixels<.8,`${id} ${yaw} ${r.errorPixels}`);
 }
});
test('Both elbows and feet keep requested signs; range-limited directions may stop',()=>{
 for(const yaw of [0,45,90,180,-90])for(const pitch of [0,20])for(const id of ['forearm-R','forearm-L','foot-R','foot-L'])for(const [dx,dy]of[[6,0],[-6,0],[0,6],[0,-6]]){
  const cam={yaw,pitch,zoom:1},g=C.beginNodeGrab(rig,p,id,cam,.5),r=C.solveNodeGrab(rig,g,dx,dy);nonReverse(movement(g,r.pose),dx,dy);
  if(r.errorPixels>.8)assert.equal(r.limited,true);
 }
});
test('Parent torso rotation does not invert hand drags',()=>{
 let pose=R.withAngle(p,'thorax','z',6);pose=R.withAngle(pose,'lumbar','z',3);pose=R.withAngle(pose,'pelvis','z',2);
 for(const id of ['hand-R','hand-L'])for(const [dx,dy]of[[-5,0],[5,0],[0,-5],[0,5]]){
  const g=C.beginNodeGrab(rig,pose,id,{yaw:10,pitch:6,zoom:.8},.6),r=C.solveNodeGrab(rig,g,dx,dy);nonReverse(movement(g,r.pose),dx,dy);assert.ok(r.errorPixels<.6);
 }
});
test('Extreme requests do not bypass angular envelopes or produce reversed accepted displacement',()=>{
 for(let i=0;i<100;i++){
  const id=i%2?'hand-L':'hand-R',cam={yaw:(i*47)%360-180,pitch:Math.sin(i)*35,zoom:1},g=C.beginNodeGrab(rig,p,id,cam,.5);
  const dx=Math.sin(i+1)*300,dy=Math.cos(i*.7)*300,r=C.solveNodeGrab(rig,g,dx,dy);nonReverse(movement(g,r.pose),dx,dy);
  for(const b of rig.bones)for(const a of C.AXES){const e=M.toXYZ(r.pose.rotations[b.id])[a];assert.ok(e>=b.limits[a][0]-1e-6&&e<=b.limits[a][1]+1e-6);}
 }
});
test('All link lengths survive camera-plane placements',()=>{
 for(const id of rig.bones.map(b=>b.id)){
  const g=C.beginNodeGrab(rig,p,id,{yaw:40,pitch:20,zoom:1},.5),r=C.solveNodeGrab(rig,g,12,-10),w=R.evaluateDriver(rig,r.pose);
  for(const b of rig.bones)if(b.parent){const par=rig.bones.find(q=>q.id===b.parent);near(M.distance3(w[b.id].position,w[b.parent].position),M.distance3(b.bind,par.bind));}
 }
});
test('Ring rotation is clockwise on screen across camera angles and parent transforms',()=>{
 for(const yaw of [0,45,90,180,-90])for(const pitch of [-25,0,30])for(const id of ['head','upper-L','upper-R','forearm-L','forearm-R']){
  const cam={yaw,pitch,zoom:1},world=R.evaluateDriver(rig,p),pivot=world[id].position;
  const restTip=M.plus(rig.bones.find(b=>b.id===id).bind,M.v3(26,-80,18));
  const toPoint=w=>M.plus(w[id].position,M.rotate3(w[id].rotation,M.minus(restTip,rig.bones.find(b=>b.id===id).bind)));
  const a=M.project3(M.minus(toPoint(world),pivot),cam),next=R.evaluateDriver(rig,C.rotateInView(rig,p,id,cam,7)),b=M.project3(M.minus(toPoint(next),pivot),cam);
  near(C.shortestDegrees((Math.atan2(-b.y,b.x)-Math.atan2(-a.y,a.x))*180/Math.PI),7);
 }
});
test('Ring rotation does not move its pivot or mutate other local rotations',()=>{
 const world=R.evaluateDriver(rig,p),r=C.rotateInView(rig,p,'hand-R',{yaw:30,pitch:15,zoom:1},-8),next=R.evaluateDriver(rig,r);
 nearV(next['hand-R'].position,world['hand-R'].position);for(const id of Object.keys(p.rotations))if(id!=='hand-R')assert.deepEqual(r.rotations[id],p.rotations[id]);
});
test('Screen ring branch wrap has no ±360 degree snap',()=>{near(C.shortestDegrees(-179-179),2);near(C.shortestDegrees(179-(-179)),-2);});
test('Coincident shoulder and clavicle can both be selected deterministically',()=>{
 const fit={x:0,y:0,scale:.7},world=R.evaluateDriver(rig,p),point=C.projectScreen(world['upper-R'].position,camera,fit);
 assert.equal(C.pickNode(rig,p,camera,fit,point,'clavicle-R'),'clavicle-R');assert.equal(C.pickNode(rig,p,camera,fit,point,'upper-R'),'upper-R');
 assert.equal(C.pickNode(rig,p,camera,fit,point,'pelvis'),'upper-R');
});
test('Side-on coincident left/right nodes respect the already selected anatomical joint',()=>{
 const cam={yaw:90,pitch:0,zoom:1},fit={x:0,y:0,scale:.7},world=R.evaluateDriver(rig,neutral),point=C.projectScreen(world['hand-R'].position,cam,fit);
 assert.equal(C.pickNode(rig,neutral,cam,fit,point,'hand-R'),'hand-R');assert.equal(C.pickNode(rig,neutral,cam,fit,point,'hand-L'),'hand-L');
});
test('Input errors and malformed axes do not return a corrupted pose',()=>{
 assert.throws(()=>C.screenDeltaToWorld(NaN,1,camera,1));assert.throws(()=>C.screenDeltaToWorld(1,1,camera,0));assert.throws(()=>C.beginNodeGrab(rig,p,'fake',camera,1));
});
test('No arbitrary horizontal drag-to-Z shortcut remains in the runtime',()=>{
 const s=fs.readFileSync(new URL('../../src/lib/puppet/driver/app.ts',import.meta.url),'utf8');assert.ok(!s.includes('z - dx * .3'));assert.ok(s.includes('solveNodeGrab'));assert.ok(s.includes('Requested screen direction blocked'));
});
