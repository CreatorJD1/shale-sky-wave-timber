import { CALIBRATION } from './calibration.js';
/** Front-plane articulated character. Degrees are clockwise in screen coordinates.
 * R and L always mean the character's anatomical side, never the viewer's side.
 * No scale is applied to a skeletal segment. Depth rotation is not simulated.
 */
export type V={x:number;y:number};
export type Side='R'|'L';
export interface Arm{lift:number;flex:number;wrist:number;clavicle:number;bend:1|-1}
export interface Leg{hip:number;knee:number;ankle:number;toe:number}
export interface Pose{
 version:5;root:V;roll:number;spine:number;chest:number;neck:number;head:number;
 arms:Record<Side,Arm>;legs:Record<Side,Leg>;feetPinned:boolean;foreground:Side;
 shoulderAssist:boolean;reachAssist:boolean;softIK:boolean;
}
export const RIG_VERSION='5.0.0';
export const REST=CALIBRATION;
export const D=Math.PI/180;
export const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export const wrap=(a:number)=>((a+180)%360+360)%360-180;
export const add=(a:V,b:V):V=>({x:a.x+b.x,y:a.y+b.y});
export const sub=(a:V,b:V):V=>({x:a.x-b.x,y:a.y-b.y});
export const mul=(a:V,n:number):V=>({x:a.x*n,y:a.y*n});
export const len=(a:V)=>Math.hypot(a.x,a.y);
export const dist=(a:V,b:V)=>len(sub(a,b));
export function rot(v:V,a:number):V{const c=Math.cos(a*D),s=Math.sin(a*D);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c};}
export const heading=(v:V)=>Math.atan2(v.y,v.x)/D;
export const sideSign=(s:Side)=>s==='R'?1:-1;
const smooth=(t:number)=>{const u=clamp(t,0,1);return u*u*(3-2*u);};
const mix=(a:V,b:V,t:number):V=>add(a,mul(sub(b,a),t));
export const LIMITS={lift:[-6,112],flex:[0,112],wrist:[-24,24],clavicle:[-8,12],hip:[-6,30],knee:[0,38],ankle:[-18,18],toe:[-12,12],roll:[-8,8],spine:[-14,14],chest:[-13,13],neck:[-12,12],head:[-18,18]} as const;
export function neutral():Pose{return{version:5,root:{x:0,y:0},roll:0,spine:0,chest:0,neck:0,head:0,
 arms:{R:{lift:0,flex:0,wrist:0,clavicle:0,bend:1},L:{lift:0,flex:0,wrist:0,clavicle:0,bend:1}},
 legs:{R:{hip:0,knee:0,ankle:0,toe:0},L:{hip:0,knee:0,ankle:0,toe:0}},feetPinned:true,foreground:'R',shoulderAssist:true,reachAssist:true,softIK:true};}
export function copy(p:Pose):Pose{return JSON.parse(JSON.stringify(p));}
const finite=(n:unknown,a:number,b:number)=>typeof n==='number'&&Number.isFinite(n)?clamp(n,a,b):0;
export function sanitize(data:unknown):Pose{
 const p=neutral();if(!data||typeof data!=='object'||(data as Pose).version!==5)return p;
 const a=data as Partial<Pose>;p.root={x:finite(a.root?.x,-55,55),y:finite(a.root?.y,-20,40)};
 for(const key of ['roll','spine','chest','neck','head'] as const)p[key]=finite(a[key],LIMITS[key][0],LIMITS[key][1]);
 p.feetPinned=a.feetPinned!==false;p.foreground=a.foreground==='L'?'L':'R';p.shoulderAssist=a.shoulderAssist!==false;p.reachAssist=a.reachAssist!==false;p.softIK=a.softIK!==false;
 for(const s of ['R','L'] as Side[]){for(const key of ['lift','flex','wrist','clavicle'] as const)p.arms[s][key]=finite(a.arms?.[s]?.[key],LIMITS[key][0],LIMITS[key][1]);
 p.arms[s].bend=a.arms?.[s]?.bend===-1?-1:1;
 for(const key of ['hip','knee','ankle','toe'] as const)p.legs[s][key]=finite(a.legs?.[s]?.[key],LIMITS[key][0],LIMITS[key][1]);}return p;
}
// The lumbar and thoracic rotations are distributed over separate lengths of the
// torso. Integrating orientation produces a continuous centreline, not cut plates.
export function bodyAngle(p:Pose,y:number){return p.roll+p.spine*smooth((REST.root.y-y)/137)+p.chest*smooth((420-y)/163);}
let spineKey='',spineSamples:V[]=[];
function spineLookup(p:Pose):V[]{
 const key=[p.root.x,p.root.y,p.roll,p.spine,p.chest].join(',');if(key===spineKey)return spineSamples;
 const samples:V[]=[add(REST.root,p.root)];
 for(let i=1;i<=180;i++){const a=bodyAngle(p,REST.root.y-(i-.5)*2);samples.push(add(samples[i-1],rot({x:0,y:-2},a)));}
 spineKey=key;spineSamples=samples;return samples;
}
export function bodyPoint(p:Pose,v:V):V{
 const l=REST.root.y-v.y;
 if(l<=0)return add(add(REST.root,p.root),rot(sub(v,REST.root),p.roll));
 const samples=spineLookup(p),t=clamp(l/2,0,180),i=Math.min(179,Math.floor(t));let c=mix(samples[i],samples[i+1],t-i);
 if(l>360)c=add(c,rot({x:0,y:-(l-360)},bodyAngle(p,REST.root.y-360)));
 return add(c,rot({x:v.x-REST.root.x,y:0},bodyAngle(p,v.y)));
}
const NECK_BASE:V={x:REST.neck.x,y:250},NECK_TOP:V={x:REST.neck.x,y:212};
export function neckPoint(p:Pose,v:V):V{
 const length=NECK_BASE.y-NECK_TOP.y,l=NECK_BASE.y-v.y,base=bodyPoint(p,NECK_BASE),a=bodyAngle(p,NECK_BASE.y);
 const ll=clamp(l,0,length);let c:V={x:0,y:-ll};
 if(Math.abs(p.neck)>1e-8){const k=p.neck*D/length;c={x:(1-Math.cos(k*ll))/k,y:-Math.sin(k*ll)/k};}
 const angle=a+p.neck*clamp(l/length,0,1);
 return add(add(base,rot(c,a)),rot({x:v.x-NECK_BASE.x,y:l<0?-l:0},angle));
}
export function headPoint(p:Pose,v:V):V{
 if(v.y>NECK_TOP.y)return neckPoint(p,v);
 return add(neckPoint(p,NECK_TOP),rot(sub(v,NECK_TOP),bodyAngle(p,NECK_BASE.y)+p.neck+p.head));
}
export const clavicleBase=(s:Side):V=>({x:REST.root.x-sideSign(s)*25,y:266});
export function clavicleAngle(p:Pose,s:Side){return p.arms[s].clavicle+(p.shoulderAssist?12*smooth((p.arms[s].lift-26)/95):0);}
export function girdlePoint(p:Pose,s:Side,v:V):V{
 const base=clavicleBase(s);return add(bodyPoint(p,base),rot(sub(v,base),bodyAngle(p,base.y)+sideSign(s)*clavicleAngle(p,s)));
}
export interface Chain{a:V;b:V;c:V;upper:number;lower:number;end:number}
export function armChain(p:Pose,s:Side):Chain{
 const r=REST[s],v=p.arms[s],k=sideSign(s),a=girdlePoint(p,s,r.shoulder);
 const upper=bodyAngle(p,clavicleBase(s).y)+k*clavicleAngle(p,s)+k*v.lift,lower=upper+k*v.bend*v.flex;
 const b=add(a,rot(sub(r.elbow,r.shoulder),upper)),c=add(b,rot(sub(r.wrist,r.elbow),lower));
 return{a,b,c,upper,lower,end:lower+k*v.wrist};
}
export function legChain(p:Pose,s:Side):Chain{
 const r=REST[s],v=p.legs[s],k=sideSign(s),a=bodyPoint(p,r.hip),upper=p.roll+k*v.hip,lower=upper-k*v.knee;
 const b=add(a,rot(sub(r.knee,r.hip),upper)),c=add(b,rot(sub(r.ankle,r.knee),lower));return{a,b,c,upper,lower,end:v.ankle};
}
// A filleted centreline with a local radius large enough for the sleeve. The bind
// corner is subtracted, so neutral registration stays exact and bone lengths stay
// constant. This is texture deformation, not a claim of anatomical tissue physics.
function prepareCorner(a:V,b:V,c:V,ch:Chain,radius:number):(v:V)=>V{
 const u0=sub(b,a),v0=sub(c,b),ul=len(u0),vl=len(v0),u=mul(u0,1/ul),w=mul(v0,1/vl),sum=add(u,w),axis=mul(sum,1/len(sum));
 const rigid=(v:V,angle:number)=>add(ch.b,rot(sub(v,b),angle));
 if(Math.abs(ch.lower-ch.upper)<.000001)return v=>rigid(v,ch.upper);
 const restAngle=wrap(heading(w)-heading(u)),posedAngle=wrap(restAngle+ch.lower-ch.upper);
 const trim=clamp(radius*Math.abs(Math.tan(posedAngle*D/2)),12,Math.min(ul,vl)*.64);
 function corner(origin:V,incoming:V,turn:number){
  if(Math.abs(turn)<.00001)return(t:number)=>add(origin,mul(incoming,t));
  const r=trim/Math.tan(Math.abs(turn)*D/2),sgn=turn<0?-1:1,start=add(origin,mul(incoming,-trim));
  const center=add(start,{x:-incoming.y*sgn*r,y:incoming.x*sgn*r}),v=sub(start,center);
  return(t:number)=>add(center,rot(v,turn*(t+trim)/(2*trim)));
 }
 const bind=corner(b,u,restAngle),posed=corner(ch.b,rot(u,ch.upper),posedAngle);
 return(v:V)=>{const t=(v.x-b.x)*axis.x+(v.y-b.y)*axis.y;
 if(t<=-trim)return rigid(v,ch.upper);if(t>=trim)return rigid(v,ch.lower);
 return add(posed(t),rot(sub(v,bind(t)),ch.upper+(posedAngle-restAngle)*(t+trim)/(2*trim)));};
}
/** One continuous pelvic surface shared by trousers AND torso attachments.
 * This avoids the horizontal cutout seam when the thighs swing under the pelvis. */
function pelvisPoint(p:Pose,v:V):V{
 const base=bodyPoint(p,v),t=smooth((v.y-503)/118);
 const width=40*(1-smooth((v.y-563)/60))+.001;
 const wL=smooth((v.x-REST.root.x+width/2)/width);
 let delta:V={x:0,y:0};
 for(const s of ['R','L'] as Side[]){const c=legChain(p,s),r=REST[s];
  const desired=add(c.a,rot(sub(v,r.hip),c.upper));delta=add(delta,mul(sub(desired,base),s==='R'?1-wL:wL));}
 return add(base,mul(delta,t));
}
function torsoMap(p:Pose,v:V):V{
 let point=v.y>503?pelvisPoint(p,v):bodyPoint(p,v);
 // Coupling limited to the shoulder/collar band; arms never drag the waist.
 for(const s of ['R','L'] as Side[]){const r=REST[s],outward=(v.x-REST.root.x)*(-sideSign(s));
 const weight=smooth((outward-42)/45)*smooth((v.y-225)/25)*(1-smooth((v.y-295)/53));
 if(weight>0)point=add(point,mul(sub(girdlePoint(p,s,v),bodyPoint(p,v)),weight));}
 return point;
}
export function palmRest(s:Side):V{return add(REST[s].wrist,{x:sideSign(s)*-1.5,y:43});}
export function heelRest(s:Side):V{return add(REST[s].ankle,{x:sideSign(s)*-11,y:47});}
export function ballRest(s:Side):V{return add(REST[s].ankle,{x:0,y:53});}
export function toeRest(s:Side):V{return add(REST[s].ankle,{x:sideSign(s)*10,y:71});}
export function createPartMapper(p:Pose,id:string):(v:V)=>V{
 if(id==='torso')return v=>torsoMap(p,v);
 if(id==='head')return v=>headPoint(p,v);
 const s:Side=id.endsWith('R')?'R':'L',r=REST[s];
 if(id.startsWith('arm-')){
  const ch=armChain(p,s),corner=prepareCorner(r.shoulder,r.elbow,r.wrist,ch,38),baseAngle=bodyAngle(p,clavicleBase(s).y)+sideSign(s)*clavicleAngle(p,s);
  return v=>{
   if(v.y<r.shoulder.y+80){const t=smooth((v.y-r.shoulder.y+50)/130),offset=sub(v,r.shoulder);return add(corner(v),sub(rot(offset,baseAngle+(ch.upper-baseAngle)*t),rot(offset,ch.upper)));}
   if(v.y>r.wrist.y-17){const t=smooth((v.y-r.wrist.y+17)/34);return add(ch.c,rot(sub(v,r.wrist),ch.lower+(ch.end-ch.lower)*t));}
   return corner(v);
  };
 }
 if(id.startsWith('hand-')){const ch=armChain(p,s);return v=>{
  const t=smooth((v.y-r.wrist.y+17)/34);return add(ch.c,rot(sub(v,r.wrist),ch.lower+(ch.end-ch.lower)*t));};}
 if(id.startsWith('leg-')){
  const ch=legChain(p,s),corner=prepareCorner(r.hip,r.knee,r.ankle,ch,43);
  return v=>{
   if(v.y<624)return pelvisPoint(p,v);
   if(v.y>r.ankle.y-20){const t=smooth((v.y-r.ankle.y+20)/40);return add(ch.c,rot(sub(v,r.ankle),ch.lower+(ch.end-ch.lower)*t));}
   return corner(v);
  };
 }
 if(id.startsWith('foot-')){
  const ch=legChain(p,s),ball=ballRest(s);return v=>{
   if(v.y<r.ankle.y+20){const t=smooth((v.y-r.ankle.y+20)/40);return add(ch.c,rot(sub(v,r.ankle),ch.lower+(ch.end-ch.lower)*t));}
   const q=sub(v,ball),angle=sideSign(s)*p.legs[s].toe*smooth((v.y-ball.y+10)/25);
   return add(ch.c,rot(add(sub(ball,r.ankle),rot(q,angle)),ch.end));};
 }
 return v=>v;
}
export function mapPoint(p:Pose,id:string,v:V){return createPartMapper(p,id)(v);}
function solve(a:V,b:V,c:V,origin:V,target:V,parent:number,branch:number,soft=0){
 const u=sub(b,a),v=sub(c,b),l1=len(u),l2=len(v),delta=sub(target,origin),reach=l1+l2;
 let d=len(delta);if(soft>0&&d>reach-soft)d=reach-soft+soft*(1-Math.exp(-(d-reach+soft)/soft));
 d=clamp(d,Math.abs(l1-l2)+.1,reach-.0001);
 const q=branch*Math.acos(clamp((d*d-l1*l1-l2*l2)/(2*l1*l2),-1,1));
 const theta=Math.atan2(delta.y,delta.x)-Math.atan2(l2*Math.sin(q),l1+l2*Math.cos(q));
 return{first:wrap(theta/D-heading(u)-parent),second:wrap(q/D-wrap(heading(v)-heading(u)))};
}
export function solveHand(input:Pose,s:Side,target:V,allowPoleSwitch=false):Pose{
 if(dist(armChain(input,s).c,target)<.00001)return copy(input);
 const r=REST[s],k=sideSign(s),current=input.arms[s];let best=copy(input),score=Infinity;
 const bends:readonly (1|-1)[]=allowPoleSwitch||current.flex<4?[1,-1]:[current.bend];
 for(const bend of bends){const p=copy(input);
  // Shoulder-assist changes the IK origin slightly; converge on that origin.
  for(let i=0;i<9;i++){
   const ch=armChain(p,s),parent=bodyAngle(p,clavicleBase(s).y)+k*clavicleAngle(p,s);
   const q=solve(r.shoulder,r.elbow,r.wrist,ch.a,target,parent,k*bend,p.softIK?7:0);
   p.arms[s].flex=clamp(q.second/(k*bend),...LIMITS.flex);p.arms[s].bend=bend;
   const endpoint=add(sub(r.elbow,r.shoulder),rot(sub(r.wrist,r.elbow),k*bend*p.arms[s].flex));
   p.arms[s].lift=clamp(wrap(heading(sub(target,ch.a))-heading(endpoint)-parent)/k,...LIMITS.lift);
  }
  const ch=armChain(p,s),inward=Math.max(0,(ch.b.x-ch.a.x)*k-10),error=dist(ch.c,target);
  const cost=error*20+Math.abs(p.arms[s].lift-current.lift)*.045+inward*.18;
  if(cost<score){score=cost;best=p;}
 }
 best.foreground=s;return best;
}
export function switchElbow(input:Pose,s:Side):Pose{const target=armChain(input,s).c,p=copy(input);p.arms[s].bend=p.arms[s].bend===1?-1:1;p.arms[s].flex=Math.max(4.01,p.arms[s].flex);return solveHand(p,s,target);}
export function solveFoot(input:Pose,s:Side,target:V):Pose{
 if(dist(legChain(input,s).c,target)<.00001)return copy(input);
 const p=copy(input),r=REST[s],k=sideSign(s),ch=legChain(p,s),q=solve(r.hip,r.knee,r.ankle,ch.a,target,p.roll,-k);
 p.legs[s].knee=clamp(q.second/(-k),...LIMITS.knee);
 const endpoint=add(sub(r.knee,r.hip),rot(sub(r.ankle,r.knee),-k*p.legs[s].knee));
 p.legs[s].hip=clamp(wrap(heading(sub(target,ch.a))-heading(endpoint)-p.roll)/k,...LIMITS.hip);return p;
}
export function pinFeet(input:Pose,t:Record<Side,V>,settlePelvis=false):Pose{
 if(!input.feetPinned)return input;const p=copy(input);
 // Tilting the pelvis can raise one hip beyond the leg's full reach. Lower the
 // pelvis minimally for a planted stance; never lengthen the leg to compensate.
 if(settlePelvis){for(let i=0;i<3;i++){let down=0;for(const s of ['R','L'] as Side[]){
  const r=REST[s],ch=legChain(p,s),reach=dist(r.hip,r.ankle)-.02,dx=t[s].x-ch.a.x;
  const minimumY=t[s].y-Math.sqrt(Math.max(0,reach*reach-dx*dx));down=Math.max(down,minimumY-ch.a.y);}
  p.root.y=clamp(p.root.y+down, -100,155);
 }}
 return solveFoot(solveFoot(p,'R',t.R),'L',t.L);
}
export function movePinnedRoot(initial:Pose,desired:V,t:Record<Side,V>):Pose{
 const evalAt=(u:number)=>{const p=copy(initial);p.root=mix(initial.root,desired,u);return pinFeet(p,t);};
 const valid=(p:Pose)=>Math.max(dist(legChain(p,'R').c,t.R),dist(legChain(p,'L').c,t.L))<.25;
 const full=evalAt(1);if(!initial.feetPinned||valid(full))return full;
 let lo=0,hi=1,best=copy(initial);for(let i=0;i<24;i++){const u=(lo+hi)/2,p=evalAt(u);if(valid(p)){best=p;lo=u;}else hi=u;}return best;
}
export function landmarks(p:Pose):Record<string,V>{
 const m:Record<string,V>={root:bodyPoint(p,REST.root),waist:bodyPoint(p,{x:REST.root.x,y:462}),chest:bodyPoint(p,{x:REST.root.x,y:360}),neck:neckPoint(p,{x:REST.root.x,y:229}),head:headPoint(p,REST.head)};
 for(const s of ['R','L'] as Side[]){const a=armChain(p,s),l=legChain(p,s);
 m['clavicle-'+s]=girdlePoint(p,s,mix(clavicleBase(s),REST[s].shoulder,.55));m['shoulder-'+s]=a.a;m['elbow-'+s]=a.b;m['wrist-'+s]=a.c;
 m['palm-'+s]=mapPoint(p,'hand-'+s,palmRest(s));m['hip-'+s]=l.a;m['knee-'+s]=l.b;m['ankle-'+s]=l.c;
 m['heel-'+s]=mapPoint(p,'foot-'+s,heelRest(s));m['toe-'+s]=mapPoint(p,'foot-'+s,toeRest(s));}
 return m;
}
export interface HandleDef{id:string;label:string;group:'body'|'arms'|'legs';hint:string}
export const HANDLES:HandleDef[]=[
 {id:'root',label:'Pelvis / root',group:'body',hint:'Drag to shift weight. Pinned feet limit pelvis travel.'},
 {id:'waist',label:'Lumbar spine',group:'body',hint:'Drag sideways to bend the lower spine.'},
 {id:'chest',label:'Thoracic spine',group:'body',hint:'Drag sideways to bend the upper spine independently.'},
 {id:'neck',label:'Cervical spine',group:'body',hint:'Drag sideways for a neck bend; head inherits the motion.'},
 {id:'head',label:'Head',group:'body',hint:'Drag sideways to tilt the head independently of the neck.'},
 ...(['R','L'] as Side[]).flatMap(s=>{const a=s==='R'?'Right':'Left';return[
 {id:'clavicle-'+s,label:a+' clavicle',group:'arms' as const,hint:'Drag up/down to raise or lower the shoulder girdle.'},
 {id:'shoulder-'+s,label:a+' shoulder',group:'arms' as const,hint:'Drag sideways for upper-arm swing. Clavicle is separate.'},
 {id:'elbow-'+s,label:a+' elbow',group:'arms' as const,hint:'Drag the elbow to steer the upper arm without changing flexion.'},
 {id:'wrist-'+s,label:a+' wrist / hand target',group:'arms' as const,hint:'IK: move the hand. FK: rotate the forearm around the elbow.'},
 {id:'palm-'+s,label:a+' palm / wrist rotation',group:'arms' as const,hint:'Drag the palm to rotate the hand around its wrist.'},
 {id:'hip-'+s,label:a+' hip',group:'legs' as const,hint:'Drag sideways to swing the thigh. This unpins the feet.'},
 {id:'knee-'+s,label:a+' knee',group:'legs' as const,hint:'Drag the knee to steer the thigh. This unpins the feet.'},
 {id:'ankle-'+s,label:a+' ankle target',group:'legs' as const,hint:'IK: move the ankle. FK: rotate the shin around the knee.'},
 {id:'heel-'+s,label:a+' heel / foot rotation',group:'legs' as const,hint:'Drag heel to rotate the foot about the ankle; feet unpin.'},
 {id:'toe-'+s,label:a+' toe / forefoot bend',group:'legs' as const,hint:'Drag sideways to bend the forefoot. No individual toe articulation.'}];})];
export type ControlMode='ik'|'fk';
/** One interaction implementation is used by pointer, keyboard and tests. */
export function dragHandle(initial:Pose,current:Pose,id:string,start:V,point:V,mode:ControlMode='ik'):Pose{
 const delta=sub(point,start);if(len(delta)<1e-8)return copy(initial);
 const s:Side=id.endsWith('R')?'R':'L',k=sideSign(s),m=landmarks(initial),target=add(m[id],delta);let p=copy(initial);
 const arc=(pivot:V)=>wrap(heading(sub(target,pivot))-heading(sub(m[id],pivot)));
 if(id==='root')return movePinnedRoot(initial,{x:clamp(initial.root.x+delta.x,-100,100),y:clamp(initial.root.y+delta.y,-100,155)},{R:legChain(initial,'R').c,L:legChain(initial,'L').c});
 if(id==='waist')p.spine+=delta.x*.23;
 else if(id==='chest')p.chest+=delta.x*.29;
 else if(id==='neck')p.neck+=delta.x*.65;
 else if(id==='head')p.head+=delta.x*.48;
 else if(id.startsWith('clavicle'))p.arms[s].clavicle-=delta.y*.55;
 else if(id.startsWith('shoulder'))p.arms[s].lift-=k*delta.x*.62;
 else if(id.startsWith('elbow'))p.arms[s].lift+=arc(armChain(initial,s).a)/k;
 else if(id.startsWith('wrist')){
  if(mode==='ik'){
   if(p.reachAssist){p.chest+=clamp(delta.x*.024,-4,4);p.neck-=clamp(delta.x*.01,-1.5,1.5);}
   // Preserve the established pole from the previous update, not a rest-side guess.
   p.arms[s].bend=current.arms[s].bend;p.arms[s].flex=current.arms[s].flex;p.arms[s].lift=current.arms[s].lift;
   return sanitize(solveHand(p,s,target));
  }else p.arms[s].flex+=arc(armChain(initial,s).b)/(k*p.arms[s].bend);
 }
 else if(id.startsWith('palm'))p.arms[s].wrist+=arc(armChain(initial,s).c)/k;
 else if(id.startsWith('hip')){p.legs[s].hip-=k*delta.x*.5;p.feetPinned=false;}
 else if(id.startsWith('knee')){p.legs[s].hip+=arc(legChain(initial,s).a)/k;p.feetPinned=false;}
 else if(id.startsWith('ankle')){if(mode==='ik')p=solveFoot(p,s,target);else p.legs[s].knee-=arc(legChain(initial,s).b)/k;p.feetPinned=false;}
 else if(id.startsWith('heel')){p.legs[s].ankle+=arc(legChain(initial,s).c);p.feetPinned=false;}
 else if(id.startsWith('toe')){p.legs[s].toe-=k*delta.x*.6;p.feetPinned=false;}
 if(['clavicle','shoulder','elbow','wrist','palm'].some(a=>id.startsWith(a)))p.foreground=s;
 return sanitize(p);
}
/** Presets stay inside the measured mesh envelope. A raised forearm is not a
 * palm-facing wave; that would need replacement hand/depth artwork. */
export const PRESETS=['Neutral','Relaxed stance','Forearm lift','Present','Hand on hip','S-curve','Soft stance','Counterbalance'] as const;
export function preset(name:string):Pose{
 let p=neutral();if(name==='Neutral')return p;
 if(name==='Relaxed stance'){p.root.y=4;p=pinFeet(p,{R:REST.R.ankle,L:REST.L.ankle});p.roll=-2;p.spine=5;p.chest=-4;p.neck=2;p.head=-3;p.arms.R={lift:6,flex:10,wrist:-9,clavicle:-3,bend:1};p.arms.L={lift:1,flex:7,wrist:5,clavicle:3,bend:1};}
 if(name==='Forearm lift'){p.spine=-2;p.chest=3;p.neck=-1;p.head=-2;p.arms.R={lift:24,flex:68,wrist:-12,clavicle:1,bend:1};}
 if(name==='Present'){p.spine=2;p.chest=-3;p.neck=1;p.head=3;p.arms.L={lift:25,flex:40,wrist:9,clavicle:1,bend:1};p.arms.R={lift:3,flex:6,wrist:-5,clavicle:-1,bend:1};}
 if(name==='Hand on hip'){p.spine=2;p.chest=-3;p.arms.R={lift:22,flex:70,wrist:8,clavicle:1,bend:-1};}
 if(name==='S-curve'){p.roll=-2;p.spine=10;p.chest=-9;p.neck=3;p.head=-2;p.arms.R={lift:6,flex:14,wrist:-8,clavicle:2,bend:1};p.arms.L={lift:7,flex:5,wrist:5,clavicle:-1,bend:1};}
 if(name==='Soft stance'){p=movePinnedRoot(p,{x:0,y:10},{R:REST.R.ankle,L:REST.L.ankle});p.spine=-3;p.chest=5;p.neck=-1;p.arms.R.lift=7;p.arms.L.lift=7;}
 if(name==='Counterbalance'){p.feetPinned=false;p.root.y=-3;p.roll=2;p.spine=-7;p.chest=8;p.neck=-2;p.head=2;p.arms.R={lift:20,flex:12,wrist:-8,clavicle:2,bend:1};p.arms.L={lift:12,flex:35,wrist:7,clavicle:-1,bend:1};p.legs.L={hip:8,knee:14,ankle:-4,toe:3};}
 if(p.feetPinned)p=pinFeet(p,{R:REST.R.ankle,L:REST.L.ankle},true);return sanitize(p);
}
/** Small coordinated gesture, not a full shoulder/depth wave. */
export function waveAt(seconds:number):Pose{
 const p=preset('Forearm lift'),t=seconds*2;p.arms.R.flex+=3*Math.sin(t);p.arms.R.wrist+=3*Math.sin(t-.5);p.arms.R.clavicle+=.5*Math.sin(t-.7);p.chest+=.5*Math.sin(t*.5);p.neck-=.3*Math.sin(t*.5);return sanitize(p);
}
