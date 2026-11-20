import type {Design,IconSource,Motion,Node,Pad} from './types.js';
import {color,fail,opacity,validateDesign,validateMotion,validatePad} from './validate.js';

// Trusted bundled vector vocabulary. Consumers never supply SVG markup.
const paths={app:'M4 19V5h13M4 11h10M8 19v-8',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',check:'M4 12l5 5L20 6',fail:'M6 6l12 12M18 6 6 18',close:'M7 7l10 10M17 7 7 17',info:'M12 10v7m0-11v1M4 4h16v16H4z'};
interface RecordNode {el:HTMLElement; spec:Node; track?:HTMLSpanElement; run?:HTMLSpanElement; copy?:HTMLSpanElement; rolling?:Animation; distance?:number; focused?:boolean; manualX?:boolean}
export interface WidgetView {
 update(pad:Pad):void;
 load(design:Design):void;
 design():Design;
 setText(id:string,content:string):void;
 setIcon(id:string,source:IconSource):void;
 setProgress(id:string,value:number):void;
 animate(motion:Motion):()=>void;
 onAction(handler:(action:string)=>void):()=>void;
 destroy():void;
}
function icon(source:IconSource):HTMLElement {
 const holder=document.createElement('span');holder.className='fw-icon';holder.setAttribute('aria-hidden','true');
 if(source.glyph){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[source.glyph]);svg.append(p);holder.append(svg);}
 else {const img=document.createElement('img');img.src=source.image;img.alt='';img.draggable=false;img.decoding='async';holder.append(img);}
 return holder;
}
export function mount(target:HTMLElement):WidgetView {
 const records=new Map<string,RecordNode>();const actions=new Set<(id:string)=>void>();
 const motions=new Map<string,{animation:Animation;motion:Motion}>();
 const declared=new Map<string,Motion>();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let current:Design|null=null;let dead=false;
 const observer=new ResizeObserver(entries=>{for(const e of entries){const r=records.get((e.target as HTMLElement).dataset.ftzId!);if(r)measure(r);}});
 function cancelRoll(r:RecordNode){r.rolling?.cancel();r.rolling=undefined;r.distance=undefined;if(r.copy)r.copy.hidden=true;r.el.dataset.rolling='false';}
 function measure(r:RecordNode){
  if(r.spec.type!=='text'||!r.track||!r.run||!r.copy)return;
  if(r.spec.wrap||r.spec.overflow!=='roll'||reduced.matches||r.focused||r.manualX){cancelRoll(r);return;}
  const width=r.run.getBoundingClientRect().width;const available=r.el.clientWidth;
  if(available<1||width<=available+1){cancelRoll(r);return;}
  const distance=width+24;if(r.distance===distance&&r.rolling)return;
  cancelRoll(r);r.copy.hidden=false;r.el.dataset.rolling='true';r.distance=distance;
  r.rolling=r.track.animate([{transform:'translateX(0)'},{transform:`translateX(${-distance}px)`}],{duration:Math.max(2000,distance/24*1000),iterations:Infinity,easing:'linear'});
 }
 function stopMotion(key:string,forget=true){if(forget)declared.delete(key);const m=motions.get(key);if(!m)return;m.animation.cancel();motions.delete(key);const r=records.get(m.motion.id);if(r&&m.motion.property==='x'){r.manualX=false;measure(r);}}
 function newRecord(spec:Node):RecordNode {
  const el=document.createElement((spec.type==='button'||spec.type==='switch')?'button':'div');el.className=`fw-${spec.type}`;el.dataset.ftzId=spec.id;
  const r:RecordNode={el,spec};
  if(spec.type==='text'){
   r.track=document.createElement('span');r.track.className='fw-track';r.run=document.createElement('span');r.run.className='fw-run';r.copy=document.createElement('span');r.copy.className='fw-copy';r.copy.setAttribute('aria-hidden','true');r.copy.hidden=true;r.track.append(r.run,r.copy);el.append(r.track);
   el.addEventListener('focus',()=>{r.focused=true;measure(r);});el.addEventListener('blur',()=>{r.focused=false;el.scrollLeft=0;measure(r);});observer.observe(el);
  }
  if(spec.type==='progress'){const fill=document.createElement('div');fill.className='fw-progress-fill';el.append(fill);el.setAttribute('role','progressbar');el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax','100');}
  if(spec.type==='divider')el.setAttribute('role','separator');
  if(spec.type==='button'||spec.type==='switch')(el as HTMLButtonElement).type='button';
  if(spec.type==='switch'){const rail=document.createElement('span');rail.className='fw-switch-rail';rail.setAttribute('aria-hidden','true');const thumb=document.createElement('span');thumb.className='fw-switch-thumb';rail.append(thumb);el.append(rail);}
  return r;
 }
 function patch(r:RecordNode,s:Node,fresh:boolean){
  const old=r.spec;
  if(fresh||old.opacity!==s.opacity){stopMotion(s.id+':opacity');r.el.style.opacity=s.opacity===undefined?'':String(opacity(s.opacity));}
  const newColor='color'in s?s.color:undefined;const oldColor='color'in old?old.color:undefined;
  if(fresh||newColor!==oldColor){stopMotion(s.id+':color');r.el.style.color=newColor||'';}
  if(s.type==='pad')for(const [k,v]of Object.entries({...{surface:'#171b2a',text:'#e7eef9',muted:'#b9c5d9',accent:'#ad94ff',success:'#83e6ae',failure:'#f1a7b3',warning:'#e6c36a',border:'#665691',divider:'#38364a'},...s.palette}))r.el.style.setProperty('--fw-'+k,v);
  switch(s.type){
   case 'text':{
    const changed=fresh||old.type!=='text'||old.content!==s.content;
    if(changed){stopMotion(s.id+':x');cancelRoll(r);r.run!.textContent=s.content;r.copy!.textContent=s.content;}
    r.el.dataset.role=s.role||'normal';r.el.dataset.wrap=String(!!s.wrap);r.el.dataset.align=s.align||'start';r.el.dataset.overflow=s.overflow||'clip';r.el.setAttribute('aria-label',s.content);r.el.title=s.content;
    // Focusable overflowing fields retain manual reading when motion is off.
    r.el.tabIndex=s.overflow==='roll'?0:-1;break;
   }
   case 'icon':r.el.dataset.size=String(s.size||16);if(fresh||old.type!=='icon'||JSON.stringify(old.source)!==JSON.stringify(s.source))r.el.replaceChildren(...icon(s.source).childNodes);if(s.label){r.el.removeAttribute('aria-hidden');r.el.setAttribute('role','img');r.el.setAttribute('aria-label',s.label);}else{r.el.removeAttribute('role');r.el.removeAttribute('aria-label');r.el.setAttribute('aria-hidden','true');}break;
   case 'led':r.el.dataset.state=s.state;r.el.setAttribute('role','img');r.el.setAttribute('aria-label',s.label);break;
   case 'progress':r.el.firstElementChild!.setAttribute('style',`transform:scaleX(${s.value})`);r.el.setAttribute('aria-valuenow',String(Math.round(s.value*100)));r.el.setAttribute('aria-label',s.label);break;
   case 'switch':{r.el.dataset.action=s.action;r.el.dataset.state=s.state;r.el.setAttribute('role','switch');r.el.setAttribute('aria-checked',String(s.state==='on'));r.el.setAttribute('aria-label',s.label);r.el.title=s.label;(r.el as HTMLButtonElement).disabled=!!s.disabled;break;}
   case 'button':{
    r.el.dataset.action=s.action;r.el.dataset.wrap=String(!!s.wrap);r.el.dataset.align=s.align||'center';r.el.setAttribute('aria-label',s.label);r.el.title=s.label;(r.el as HTMLButtonElement).disabled=!!s.disabled;
    if(fresh||old.type!=='button'||old.text!==s.text||JSON.stringify(old.icon)!==JSON.stringify(s.icon)){
     r.el.replaceChildren();if(s.icon)r.el.append(icon(s.icon));if(s.text!==undefined){const label=document.createElement('span');label.className='fw-button-label';label.textContent=s.text;r.el.append(label);}
    }
    r.el.style.fontSize=`${s.textSize||12}px`;break;
   }
  }
  r.spec=structuredClone(s);
 }
 function update(pad:Pad){
  if(dead)fail('view was destroyed');validatePad(pad);const next=structuredClone(pad);const seen=new Set<string>();
  function walk(s:Node,parent:HTMLElement,index:number){
   let r=records.get(s.id);if(r&&r.spec.type!==s.type){remove(s.id);r=undefined;}
   const fresh=!r;if(!r){r=newRecord(s);records.set(s.id,r);}seen.add(s.id);patch(r,s,fresh);
   if(parent.children[index]!==r.el)parent.insertBefore(r.el,parent.children[index]||null);
   if('children'in s)s.children.forEach((c,i)=>walk(c,r!.el,i));
  }
  walk(next,target,0);for(const id of records.keys())if(!seen.has(id))remove(id);
  current={version:1,pad:next,animations:current?.animations?.filter(a=>seen.has(a.id))};
  for(const r of records.values())measure(r);
 }
 function remove(id:string){const r=records.get(id);if(!r)return;for(const key of [...declared.keys()])if(key.startsWith(id+':'))stopMotion(key);cancelRoll(r);observer.unobserve(r.el);r.el.remove();records.delete(id);}
 function animate(m:Motion){
  if(dead||!current)fail('mount/update a pad first');validateMotion(m,current.pad);const key=m.id+':'+m.property;stopMotion(key);const declaration=structuredClone(m);declared.set(key,declaration);const r=records.get(m.id)!;
  const el=m.property==='x'?r.track!:r.el;
  let frames:Keyframe[];
  if(m.property==='x'){cancelRoll(r);r.manualX=true;frames=[{transform:`translateX(${m.from}px)`},{transform:`translateX(${m.to}px)`}];}
  else if(m.property==='opacity')frames=[{opacity:opacity(m.from)},{opacity:opacity(m.to)}];
  else {color(m.from);color(m.to);frames=[{color:m.from},{color:m.to}];}
  const cancel=()=>{if(declared.get(key)===declaration)stopMotion(key);};
  if(reduced.matches){if(m.property==='x')r.manualX=false;return cancel;}
  const animation=el.animate(frames,{duration:m.durationMs,iterations:m.repeat?Infinity:1,fill:'forwards',easing:'linear'});motions.set(key,{animation,motion:structuredClone(m)});
  return cancel;
 }
 function mutate(id:string,fn:(n:Node)=>void){if(!current)fail('update a pad first');const pad=structuredClone(current.pad);let found=false;function walk(n:Node){if(n.id===id){fn(n);found=true;}if('children'in n)n.children.forEach(walk);}walk(pad);if(!found)fail(`unknown id '${id}'`);update(pad);}
 const click=(e:Event)=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('.fw-button,.fw-switch');if(!b||!target.contains(b)||b.disabled)return;for(const f of actions)f(b.dataset.action!);};
 const context=(e:Event)=>e.preventDefault();
 const motionChange=()=>{for(const key of [...motions.keys()])stopMotion(key,false);if(!reduced.matches)for(const m of [...declared.values()])animate(m);for(const r of records.values())measure(r);};
 target.addEventListener('click',click);target.addEventListener('contextmenu',context);reduced.addEventListener('change',motionChange);
 return {
  update,animate,
  load(d){validateDesign(d);for(const key of [...declared.keys()])stopMotion(key);update(d.pad);current=structuredClone(d);for(const m of d.animations||[])animate(m);},
  design(){if(!current)fail('no design loaded');return structuredClone({...current,animations:[...declared.values()]});},
  setText(id,content){mutate(id,n=>{if(n.type!=='text')fail('setText needs text');n.content=content;});},
  setIcon(id,source){mutate(id,n=>{if(n.type!=='icon')fail('setIcon needs icon');n.source=source;});},
  setProgress(id,value){mutate(id,n=>{if(n.type!=='progress')fail('setProgress needs progress');n.value=value;});},
  onAction(f){actions.add(f);return ()=>actions.delete(f);},
  destroy(){if(dead)return;dead=true;for(const id of [...records.keys()])remove(id);observer.disconnect();reduced.removeEventListener('change',motionChange);target.removeEventListener('click',click);target.removeEventListener('contextmenu',context);actions.clear();current=null;}
 };
}
