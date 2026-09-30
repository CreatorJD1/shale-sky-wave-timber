/** Central pose acceptance gate. No input source can bypass this gate in the UI.
 * These envelopes are conservative limits for this FRONT-PLANE artwork, not
 * medical human ranges of motion and not a 3D collision/soft-body simulation.
 */
import {type Pose,type V,type Side,neutral,copy,sanitize,clamp,dist,sub,add,mul,rot,REST,armChain,legChain,bodyPoint,bodyAngle,createPartMapper,pinFeet} from './core.js';
import {type Binding,skinFrames,skinVertexBound} from './skinning.js';
export interface GuardMesh {part:{id:string;x:number;y:number;w:number;h:number};bind:V[];bindings:Binding[];indices:number[];opaque:boolean[]}
export interface DeformationMetric {stretch:number;compression:number;area:number}
export interface GuardHealth {valid:boolean;opaqueTriangles:number;inverted:number;overstretched:number;compressed:number;maxStretch:number;minCompression:number;maxSeamGap:number;rules:string[];worst:{part:string;x:number;y:number;stretch:number;compression:number}[]}
export interface GuardResult {pose:Pose;limited:boolean;acceptedFraction:number;reasons:string[];source:string;health:GuardHealth;requestedHealth?:GuardHealth}
export const SAFETY_PROFILE={name:'Front-view protected',maxTorsoTotal:22,maxSpineEffort:25,maxNeckHead:23,maxHeadWorld:39,maxShoulderTotal:123,maxFootShin:24,maxFootToe:25,minAnkleSeparation:32,pinTolerance:.85, maxSeamGap:.03} as const;
export function poseViolations(p:Pose,previous?:Pose):string[]{const issues:string[]=[];
 if(Math.abs(p.roll+p.spine+p.chest)>SAFETY_PROFILE.maxTorsoTotal+.001)issues.push('Combined torso bend');
 if(Math.abs(p.spine)+Math.abs(p.chest)>SAFETY_PROFILE.maxSpineEffort+.001)issues.push('Combined spine strain');
 if(Math.abs(p.neck+p.head)>SAFETY_PROFILE.maxNeckHead+.001)issues.push('Combined neck / head bend');
 if(Math.abs(p.roll+p.spine+p.chest+p.neck+p.head)>SAFETY_PROFILE.maxHeadWorld+.001)issues.push('Head-to-pelvis alignment');
 const knees:V[]=[],feet:V[]=[];
 for(const s of ['R','L'] as Side[]){const a=armChain(p,s),l=legChain(p,s),k=s==='R'?1:-1;
  if(Math.abs(a.upper-bodyAngle(p,266))>SAFETY_PROFILE.maxShoulderTotal)issues.push(s+' shoulder / clavicle combination');
  // Upper arms may approach the ribcage, but not pass through its centre.
  const local=rot(sub(a.b,bodyPoint(p,{x:REST.root.x,y:REST[s].elbow.y})), -bodyAngle(p,350));
  if(local.x*(-k)<43)issues.push(s+' upper arm through ribcage');
  if(Math.abs(l.end-l.lower)>SAFETY_PROFILE.maxFootShin)issues.push(s+' ankle relative to shin');
  if(Math.abs(l.end+k*p.legs[s].toe)>SAFETY_PROFILE.maxFootToe)issues.push(s+' combined foot / forefoot angle');
  if(previous?.feetPinned&&p.feetPinned&&dist(l.c,legChain(previous,s).c)>SAFETY_PROFILE.pinTolerance)issues.push(s+' planted foot drift');
  knees.push(l.b);feet.push(l.c);
 }
 if(knees[1].x-knees[0].x<34)issues.push('Crossed knee chains');
 if(Math.abs(feet[1].y-feet[0].y)<95&&feet[1].x-feet[0].x<SAFETY_PROFILE.minAnkleSeparation)issues.push('Overlapping / crossed feet');
 return issues;
}
export function triangleMetric(a:V,b:V,c:V,A:V,B:V,C:V):DeformationMetric{
 const x1=b.x-a.x,y1=b.y-a.y,x2=c.x-a.x,y2=c.y-a.y,det=x1*y2-x2*y1;
 const X1=B.x-A.x,Y1=B.y-A.y,X2=C.x-A.x,Y2=C.y-A.y;
 const m00=(X1*y2-X2*y1)/det,m01=(X2*x1-X1*x2)/det,m10=(Y1*y2-Y2*y1)/det,m11=(Y2*x1-Y1*x2)/det;
 const a0=m00*m00+m10*m10,b0=m00*m01+m10*m11,d0=m01*m01+m11*m11;
 const root=Math.sqrt(Math.max(0,(a0-d0)**2+4*b0*b0)),t=a0+d0;
 return{stretch:Math.sqrt(Math.max(0,(t+root)/2)),compression:Math.sqrt(Math.max(0,(t-root)/2)),area:m00*m11-m01*m10};
}
/** Per-material *projected mesh* deformation thresholds, exposed in the UI. */
export function materialLimits(id:string,v:V):{min:number;max:number;material:string}{
 const s:Side=id.endsWith('R')?'R':'L';
 if(id==='head'&&v.y<209)return{min:.82,max:1.18,material:'face / hair'};
 if(id==='head'||id==='torso'&&v.y<253)return{min:.60,max:1.55,material:'neck / collar'};
 if(id.startsWith('arm')&&Math.abs(v.y-REST[s].elbow.y)<85)return{min:.38,max:1.85,material:'elbow flex zone'};
 if(id.startsWith('arm')&&v.y<350||id==='torso'&&v.y<330)return{min:.55,max:1.70,material:'shoulder socket'};
 if(id.startsWith('leg')&&v.y>625&&Math.abs(v.y-REST[s].knee.y)<107)return{min:.53,max:1.60,material:'knee flex zone'};
 if(id.startsWith('leg')&&v.y<625||id==='torso'&&v.y>490)return{min:.61,max:1.48,material:'pelvic bridge'};
 if(id==='torso')return{min:.66,max:1.42,material:'torso mesh'};
 if(id.startsWith('hand')||id.startsWith('foot'))return{min:.68,max:1.45,material:'wrist / foot'};
 return{min:.65,max:1.45,material:'limb / suit'};
}
interface ShapeEdge {a:number;b:number;rest:number;min:number;max:number}
const shapeEdgeCache=new WeakMap<GuardMesh,ShapeEdge[]>();
export const CORRECTION_LIMIT_PX=8;
function shapeEdges(m:GuardMesh):ShapeEdge[]{let out=shapeEdgeCache.get(m);if(out)return out;out=[];const seen=new Set<string>();
 for(let i=0;i<m.indices.length;i+=3){if(!m.opaque[i/3])continue;for(let j=0;j<3;j++){const aa=m.indices[i+j],bb=m.indices[i+(j+1)%3],a=Math.min(aa,bb),b=Math.max(aa,bb),key=a+','+b;if(seen.has(key))continue;seen.add(key);const A=m.bind[a],B=m.bind[b],mid={x:(A.x+B.x)/2,y:(A.y+B.y)/2},mat=materialLimits(m.part.id,mid),flex=mat.material.includes('flex')||mat.material.includes('socket');out.push({a,b,rest:dist(A,B),min:flex?.76:.86,max:flex?1.28:1.19});}}
 shapeEdgeCache.set(m,out);return out;
}
/** Bounded pose-space shape correction. Stiff material regions resist edge
 * stretch; flexible joint bands have a wider envelope. Welded vertices remain
 * fixed throughout. A failed result is rejected by the triangle guard below.
 * This is a 2D deformation corrector, not tissue/cloth physics. */
export function relaxSurface(m:GuardMesh,target:V[]):V[]{const out=target.map(v=>({...v})),edges=shapeEdges(m),fixed=m.bindings.map(b=>b.locked);
 for(let pass=0;pass<12;pass++){
  for(let k=0;k<edges.length;k++){const e=edges[pass%2?edges.length-1-k:k],a=out[e.a],b=out[e.b],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);if(l<1e-8)continue;const desired=clamp(l,e.rest*e.min,e.rest*e.max),wa=fixed[e.a]?0:1,wb=fixed[e.b]?0:1,sum=wa+wb;if(!sum||Math.abs(l-desired)<1e-7)continue;const amount=(l-desired)/l*.72/sum;if(wa){a.x+=dx*amount;a.y+=dy*amount;}if(wb){b.x-=dx*amount;b.y-=dy*amount;}}
  for(let i=0;i<out.length;i++){if(fixed[i])continue;let dx=out[i].x-target[i].x,dy=out[i].y-target[i].y,l=Math.hypot(dx,dy),f=l>CORRECTION_LIMIT_PX?CORRECTION_LIMIT_PX/l:1;f*=.985;out[i].x=target[i].x+dx*f;out[i].y=target[i].y+dy*f;}
 }
 return out;
}
export function posedMeshes(p:Pose,meshes:GuardMesh[],correctives=true):Map<string,V[]>{
 const f=skinFrames(p),result=new Map<string,V[]>();
 for(const m of meshes){const mapper=createPartMapper(p,m.part.id),weighted=m.bind.map((v,i)=>skinVertexBound(v,m.bindings[i],f,p,m.part.id,mapper,correctives));result.set(m.part.id,correctives?relaxSurface(m,weighted):weighted);}return result;
}

export function inspectPose(p:Pose,meshes:GuardMesh[],previous?:Pose,quick=false):GuardHealth{
 const health:GuardHealth={valid:true,opaqueTriangles:0,inverted:0,overstretched:0,compressed:0,maxStretch:1,minCompression:1,maxSeamGap:0,rules:poseViolations(p,previous),worst:[]};
 if(quick&&health.rules.length){health.valid=false;return health;}
 const points=posedMeshes(p,meshes),seams=new Map<string,V>();
 for(const m of meshes){const ps=points.get(m.part.id)!;
  for(let i=0;i<m.bind.length;i++){if(!m.bindings[i].locked)continue;const b=m.bind[i],key=b.x+','+b.y,q=ps[i],last=seams.get(key);if(last)health.maxSeamGap=Math.max(health.maxSeamGap,dist(last,q));else seams.set(key,q);}
  for(let i=0;i<m.indices.length;i+=3){if(!m.opaque[i/3])continue;const [ai,bi,ci]=m.indices.slice(i,i+3),a=m.bind[ai],b=m.bind[bi],c=m.bind[ci],mid={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3};
   const d=triangleMetric(a,b,c,ps[ai],ps[bi],ps[ci]),limits=materialLimits(m.part.id,mid);health.opaqueTriangles++;health.maxStretch=Math.max(health.maxStretch,d.stretch);health.minCompression=Math.min(health.minCompression,d.compression);
   const bad=d.area<=.00001||d.stretch>limits.max+.0001||d.compression<limits.min-.0001;
   if(d.area<=.00001)health.inverted++;if(d.stretch>limits.max+.0001)health.overstretched++;if(d.compression<limits.min-.0001)health.compressed++;
   if(bad&&health.worst.length<8)health.worst.push({part:m.part.id,x:mid.x,y:mid.y,stretch:d.stretch,compression:d.compression});
   if(quick&&bad){health.valid=false;return health;}
  }
 }
 if(health.inverted)health.rules.push('Mesh fold-over');if(health.overstretched)health.rules.push('Local stretch limit');if(health.compressed)health.rules.push('Local compression limit');if(health.maxSeamGap>SAFETY_PROFILE.maxSeamGap)health.rules.push('Attachment weld separation');
 health.valid=health.rules.length===0;return health;
}
export function interpolatePose(a:Pose,b:Pose,t:number):Pose{const p=copy(a);p.root=add(a.root,mul(sub(b.root,a.root),t));
 for(const k of ['roll','spine','chest','neck','head'] as const)p[k]=a[k]+(b[k]-a[k])*t;
 for(const s of ['R','L'] as Side[]){for(const k of ['lift','flex','wrist','clavicle'] as const)p.arms[s][k]=a.arms[s][k]+(b.arms[s][k]-a.arms[s][k])*t;for(const k of ['hip','knee','ankle','toe'] as const)p.legs[s][k]=a.legs[s][k]+(b.legs[s][k]-a.legs[s][k])*t;p.arms[s].bend=b.arms[s].bend;}
 p.feetPinned=b.feetPinned;p.foreground=b.foreground;p.shoulderAssist=b.shoulderAssist;p.reachAssist=b.reachAssist;p.softIK=b.softIK;return p;}
export class PoseGuard{
 last:GuardResult;constructor(public meshes:GuardMesh[]){const p=neutral(),health=inspectPose(p,meshes);if(!health.valid)throw new Error('Neutral binding failed: '+health.rules.join(', '));this.last={pose:p,limited:false,acceptedFraction:1,reasons:[],source:'startup',health};}
 accept(previous:Pose,request:Pose,source='interaction',transition=true):GuardResult{
  const target=sanitize(request),reasons:string[]=[];
  if(JSON.stringify(target)!==JSON.stringify(request))reasons.push('Joint envelope / malformed data clamped');
  // Never reverse an established 2D elbow pole during a continuous gesture.
  for(const s of ['R','L'] as Side[])if(transition&&previous.arms[s].flex>8&&previous.arms[s].bend!==target.arms[s].bend){target.arms[s].bend=previous.arms[s].bend;reasons.push(s+' elbow bend direction locked');}
  const pin=transition?previous:undefined,full=inspectPose(target,this.meshes,pin);
  const anchors={R:legChain(previous,'R').c,L:legChain(previous,'L').c};
  const samePins=!!pin&&previous.feetPinned&&target.feetPinned&&(['R','L'] as Side[]).every(side=>dist(legChain(target,side).c,anchors[side])<=SAFETY_PROFILE.pinTolerance);
  // For a genuinely planted endpoint, re-solve IK at each intermediate sample.
  // Linearly blending knee angles alone would make an otherwise valid weight
  // shift appear to slide its feet. Imports with moved targets are NOT repaired.
  const at=(t:number)=>{const p=interpolatePose(previous,target,t);return samePins?pinFeet(p,anchors):p;};
  let accepted=target,fraction=1,health=full;
  // Conservative advancement stops at the FIRST bad sample on a gesture.
  // Adaptive subdivision limits each checked angular step to <=5 degrees and
  // each root step to <=8 bind pixels; it never jumps across a rejected sample.
  let lower=0,upper=1,pathFailed=false;
  if(transition){let maxAngle=0;for(const key of ['roll','spine','chest','neck','head'] as const)maxAngle=Math.max(maxAngle,Math.abs(target[key]-previous[key]));
   for(const side of ['R','L'] as Side[]){for(const key of ['lift','flex','wrist','clavicle'] as const)maxAngle=Math.max(maxAngle,Math.abs(target.arms[side][key]-previous.arms[side][key]));for(const key of ['hip','knee','ankle','toe'] as const)maxAngle=Math.max(maxAngle,Math.abs(target.legs[side][key]-previous.legs[side][key]));}
   const steps=Math.max(1,Math.ceil(maxAngle/5),Math.ceil(dist(previous.root,target.root)/8));
   for(let i=1;i<=steps;i++){const t=i/steps,q=at(t);if(!inspectPose(q,this.meshes,pin,true).valid){upper=t;pathFailed=true;break;}lower=t;}
  }
  if(!full.valid||pathFailed){
   if(!pathFailed){lower=0;upper=1;}
   let best=at(lower);if(!inspectPose(best,this.meshes,pin,true).valid){best=copy(previous);lower=0;}
   for(let i=0;i<12;i++){const t=(lower+upper)/2,q=at(t);if(inspectPose(q,this.meshes,pin,true).valid){lower=t;best=q;}else upper=t;}
   accepted=best;fraction=lower;health=inspectPose(accepted,this.meshes,pin);
   if(!health.valid){accepted=copy(previous);fraction=0;health=inspectPose(accepted,this.meshes);}
   reasons.push(...full.rules);if(pathFailed&&full.valid)reasons.push('Unsafe transition blocked');
  }

  this.last={pose:accepted,limited:reasons.length>0||fraction<.9999,acceptedFraction:fraction,reasons:[...new Set(reasons)],source,health,...(!full.valid?{requestedHealth:full}:{})};return this.last;
 }
}
