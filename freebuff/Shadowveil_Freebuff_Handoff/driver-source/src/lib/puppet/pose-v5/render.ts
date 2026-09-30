import { SurfaceRenderer } from './surface.js';
import {type V,type Pose,type Side,REST,D,rot,sub,add,bodyPoint,bodyAngle,armChain,legChain,mapPoint,landmarks,HANDLES} from './core.js';
export interface AtlasPart{id:string;src:string;x:number;y:number;w:number;h:number}
export interface Atlas{version:number;source_sha256?:string;parts:AtlasPart[];coverage:Record<string,number>}
export interface Camera{scale:number;x:number;y:number}
export type Background='dark'|'light'|'checker'|'transparent';
export type Images=Record<string,HTMLImageElement>;
export function imageLoad(src:string):Promise<HTMLImageElement>{return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error(`Image failed to load: ${src.slice(0,100)}`));i.src=src;});}
export const cameraFor=(w:number,h:number,zoom=1):Camera=>{const s=Math.min(w/690,Math.max(120,h-40)/1100)*.97*zoom;return{scale:s,x:w/2-256*s,y:(h-40-1100*s)/2+4};};
export const toWorld=(v:V,c:Camera):V=>({x:(v.x-c.x)/c.scale,y:(v.y-c.y)/c.scale});
export const toScreen=(v:V,c:Camera):V=>({x:v.x*c.scale+c.x,y:v.y*c.scale+c.y});
export class Renderer{
 surfaces:SurfaceRenderer;controlFilter='all';labels=false;
 ctx:CanvasRenderingContext2D;camera:Camera={scale:1,x:0,y:0};width=0;height=0;dpr=1;
 constructor(public canvas:HTMLCanvasElement,public atlas:Atlas,public images:Images,preferGPU=false){const c=canvas.getContext('2d',{alpha:true});if(!c)throw new Error('Canvas 2D is unavailable');this.ctx=c;this.surfaces=new SurfaceRenderer(atlas,images);}
 resize(w:number,h:number){this.width=Math.max(1,w);this.height=Math.max(1,h);this.dpr=Math.min(2,window.devicePixelRatio||1);const pw=Math.round(this.width*this.dpr),ph=Math.round(this.height*this.dpr);if(this.canvas.width!==pw)this.canvas.width=pw;if(this.canvas.height!==ph)this.canvas.height=ph;}
 background(kind:Background){const c=this.ctx,w=this.width,h=this.height;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
 if(kind==='transparent')return;c.fillStyle=kind==='dark'?'#11151c':kind==='light'?'#f4f4f2':'#d3d6da';c.fillRect(0,0,w,h);
 if(kind==='checker'){c.fillStyle='#aeb4bd';for(let y=0;y<h;y+=18)for(let x=0;x<w;x+=18)if((x/18+y/18)%2===0)c.fillRect(x,y,18,18);}}
 draw(p:Pose,bg:Background='dark',joints=false,selected='',zoom=1,refImage?:HTMLImageElement){
 this.camera=cameraFor(this.width,this.height,zoom);this.background(bg);const c=this.ctx,k=this.camera;
 c.setTransform(this.dpr*k.scale,0,0,this.dpr*k.scale,this.dpr*k.x,this.dpr*k.y);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 if(refImage){c.drawImage(refImage,0,0,512,1100);return;}
 const back=p.foreground==='R'?'L':'R';
 const order=['foot-R','foot-L','leg-R','leg-L','arm-R:back','arm-L:back','torso','head','arm-'+back+':front','hand-'+back,'arm-'+p.foreground+':front','hand-'+p.foreground];
 const image=this.surfaces.draw(p,k,this.width,this.height,this.dpr,order);
 c.setTransform(this.dpr,0,0,this.dpr,0,0);c.drawImage(image,0,0,this.width,this.height);
 c.setTransform(this.dpr*k.scale,0,0,this.dpr*k.scale,this.dpr*k.x,this.dpr*k.y);
 if(this.surfaces.wireframe){c.strokeStyle='#15233388';c.lineWidth=.5/k.scale;for(const [id,m] of this.surfaces.surfaces){const points=this.surfaces.lastPoints.get(id)!;c.beginPath();for(let i=0;i<m.indices.length;i+=3){if(!m.opaque[i/3])continue;const a=points[m.indices[i]],b=points[m.indices[i+1]],d=points[m.indices[i+2]];c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(d.x,d.y);c.closePath();}c.stroke();}}
 if(joints)this.drawControls(p,selected);
 }
 drawControls(p:Pose,selected:string){
 const c=this.ctx,k=this.camera,m=landmarks(p);c.save();
 c.lineWidth=1.15/k.scale;c.strokeStyle='rgba(137,199,215,.65)';
 const chains=[['root','waist','chest','neck','head'],...(['R','L'] as const).flatMap(s=>[['neck','clavicle-'+s,'shoulder-'+s,'elbow-'+s,'wrist-'+s,'palm-'+s],['root','hip-'+s,'knee-'+s,'ankle-'+s,'heel-'+s,'toe-'+s]])];
 for(const seq of chains){c.beginPath();seq.forEach((n,i)=>{const q=m[n];if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.stroke();}
 for(const def of HANDLES){const name=def.id,q=m[name],active=name===selected;if(this.controlFilter!=='all'&&this.controlFilter!==def.group&&!active)continue;
 const target=name.startsWith('wrist')||name.startsWith('ankle'),small=name.startsWith('clavicle')||name.startsWith('heel')||name.startsWith('toe');
 const r=(target?6.5:small?3.8:5)/k.scale;
 if(active){c.beginPath();c.arc(q.x,q.y,r+4/k.scale,0,Math.PI*2);c.strokeStyle='#f4c078';c.lineWidth=1.8/k.scale;c.stroke();}
 c.beginPath();if(name.startsWith('clavicle')||name==='root'){c.moveTo(q.x,q.y-r*1.25);c.lineTo(q.x+r*1.25,q.y);c.lineTo(q.x,q.y+r*1.25);c.lineTo(q.x-r*1.25,q.y);c.closePath();}else c.arc(q.x,q.y,r,0,Math.PI*2);
 c.fillStyle=active?'#ffdd99':def.group==='body'?'#e1b676':target?'#80d3cb':small?'#a6b4d9':'#e3eef1';c.fill();c.strokeStyle='#142935';c.lineWidth=1.5/k.scale;c.stroke();
 if(this.labels||active){const text=def.label,tx=q.x+(q.x>258?10:-10)/k.scale,ty=q.y-9/k.scale;c.font=`${10/k.scale}px system-ui`;c.textAlign=q.x>258?'left':'right';c.strokeStyle='#0e1922';c.lineWidth=3/k.scale;c.strokeText(text,tx,ty);c.fillStyle='#fff';c.fillText(text,tx,ty);}
 }
 c.restore();
 }
}
