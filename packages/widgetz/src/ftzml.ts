/** FTZML v1: deliberately tiny XML, exactly the public model, no executable data. */
import type {Design,Motion,Node,Pad,Palette} from './types.js';
import {fail,validateDesign} from './validate.js';
const attrs:Record<string,string[]>={pad:[],row:[],column:[],text:['role','align','wrap','overflow'],icon:['label','glyph','image','iconSize'],led:['label','state'],divider:[],progress:['label','value'],button:['label','action','text','glyph','image','textSize','wrap','align','disabled'],switch:['label','action','state','disabled','onColor','offColor']};
const geometryAttrs=['x','y','width','height','anchor'];
const paletteKeys=['surface','text','muted','accent','success','failure','warning','border','divider'];
function attributes(el:globalThis.Element,allowed:string[]){const v:Record<string,string>={};for(const a of [...el.attributes]){if(!allowed.includes(a.name))fail(`FTZML <${el.tagName}>: unsupported attribute '${a.name}'`);v[a.name]=a.value;}return v;}
function noContent(el:globalThis.Element){if(el.children.length||el.textContent?.trim())fail(`FTZML <${el.tagName}> must be empty`);}
function number(s:string,label:string){if(!s.trim()||!Number.isFinite(Number(s)))fail(`FTZML ${label} must be numeric`);return Number(s);}
function bool(s:string,label:string){if(s!=='true'&&s!=='false')fail(`FTZML ${label} must be true or false`);return s==='true';}
export function parseFTZML(xml:string):Design {
 if(typeof xml!=='string'||xml.length>262144)fail('FTZML maximum size is 256 KiB');
 // No DTD, entities, processing instructions, scripts, external includes or namespaces.
 const source=xml.replace(/^\uFEFF?\s*<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>/i,'');
 if(/<!DOCTYPE|<!ENTITY|<\?/i.test(source))fail('FTZML forbids DTD/entities/processing instructions');
 const document=new DOMParser().parseFromString(source,'application/xml');
 if(document.querySelector('parsererror'))fail('FTZML is not well-formed XML');
 const root=document.documentElement;if(root.tagName!=='ftzml'||root.namespaceURI)fail('FTZML needs an unnamespaced <ftzml> root');
 const version=attributes(root,['version']).version;if(version!=='1')fail('FTZML version must be 1');
 let pad:Pad|undefined;let palette:Partial<Palette>|undefined;const animations:Motion[]=[];
 function element(el:globalThis.Element,depth:number):Node {
  if(depth>8)fail('FTZML exceeds 8 layout levels');const type=el.tagName;if(!Object.hasOwn(attrs,type))fail(`FTZML unknown element <${type}>`);
  const common=type==='switch'?['id']:['id','color','opacity'];
  const a=attributes(el,[...common,...geometryAttrs,...attrs[type]]);const n:Record<string,unknown>={type,...a};
  if(a.opacity!==undefined)n.opacity=number(a.opacity,'opacity');
  if(type==='pad'||type==='row'||type==='column'){
   for(const child of [...el.childNodes])if(child.nodeType===3&&child.textContent?.trim())fail(`FTZML <${type}> accepts elements only`);
   n.children=[...el.children].map(c=>element(c,depth+1));
  }else if(type==='text'){
   if(el.children.length)fail('FTZML text cannot contain markup');n.content=el.textContent||'';
  }else noContent(el);
  if(a.wrap!==undefined)n.wrap=bool(a.wrap,'wrap');if(a.disabled!==undefined)n.disabled=bool(a.disabled,'disabled');if(a.textSize!==undefined)n.textSize=number(a.textSize,'textSize');
  if(a.iconSize!==undefined)n.iconSize=number(a.iconSize,'iconSize');
  if(a.width!==undefined||a.height!==undefined){n.size={width:number(a.width||'','width'),height:number(a.height||'','height')};}
  if(a.x!==undefined||a.y!==undefined){
   const defaultOffset=a.anchor===undefined?'':'0';
   n.position={x:number(a.x??defaultOffset,'x'),y:number(a.y??defaultOffset,'y')};
  }
  for(const key of geometryAttrs)delete n[key];
  if(a.anchor!==undefined)n.anchor=a.anchor;
  if(a.value!==undefined)n.value=number(a.value,'progress value');
  if(type==='icon'||type==='button'){
   if(a.glyph!==undefined&&a.image!==undefined)fail('FTZML choose glyph OR image');
   const icon=a.glyph!==undefined?{glyph:a.glyph}:a.image!==undefined?{image:a.image}:undefined;
   delete n.glyph;delete n.image;if(type==='icon')n.source=icon;else if(icon)n.icon=icon;
  }
  return n as unknown as Node;
 }
 for(const node of [...root.childNodes]){
  if(node.nodeType===8)continue;if(node.nodeType===3){if(node.textContent?.trim())fail('FTZML root accepts elements only');continue;}
  if(node.nodeType!==1)fail('FTZML contains an unsupported node');const el=node as globalThis.Element;
  if(el.tagName==='palette'){if(palette)fail('FTZML accepts one palette');noContent(el);palette=attributes(el,paletteKeys) as Partial<Palette>;}
  else if(el.tagName==='pad'){if(pad)fail('FTZML accepts one outer pad');pad=element(el,0) as Pad;}
  else if(el.tagName==='animate'){
   noContent(el);const a=attributes(el,['target','property','from','to','ms','repeat']);
   const motion={id:a.target,property:a.property,from:a.property==='color'?a.from:number(a.from||'','animation from'),to:a.property==='color'?a.to:number(a.to||'','animation to'),durationMs:number(a.ms||'','animation ms'),...(a.repeat===undefined?{}:{repeat:bool(a.repeat,'repeat')})};animations.push(motion as Motion);
  }else fail(`FTZML unknown root element <${el.tagName}>`);
 }
 if(!pad)fail('FTZML needs one pad');if(palette)pad.palette=palette;
 const result={version:1,pad,...(animations.length?{animations}:{})};validateDesign(result);return result;
}
const escape=(v:unknown)=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;');
function attr(values:Record<string,unknown>){return Object.entries(values).filter(([,v])=>v!==undefined).map(([k,v])=>` ${k}="${escape(v)}"`).join('');}
export function saveFTZML(design:Design):string {
 validateDesign(design);const lines=['<?xml version="1.0" encoding="UTF-8"?>','<ftzml version="1">'];
 if(design.pad.palette)lines.push('  <palette'+attr(design.pad.palette)+'/>');
 function write(n:Node,level:number){
  const a:Record<string,unknown>={id:n.id,...(!('opacity'in n)||n.opacity===undefined?{}:{opacity:n.opacity})};
  for(const [k,v]of Object.entries(n))if(!['id','type','opacity','palette','content','children','source','icon','size','position'].includes(k))a[k]=v;
  if(n.size)Object.assign(a,n.size);if(n.position)Object.assign(a,n.position);
  const icon=n.type==='icon'?n.source:n.type==='button'?n.icon:undefined;if(icon)Object.assign(a,icon);
  const prefix='  '.repeat(level)+'<'+n.type+attr(a);
  if('children'in n){lines.push(prefix+'>');n.children.forEach(c=>write(c,level+1));lines.push('  '.repeat(level)+`</${n.type}>`);}
  else if(n.type==='text')lines.push(prefix+'>'+escape(n.content)+`</text>`);
  else lines.push(prefix+'/>');
 }
 write(design.pad,1);for(const m of design.animations||[])lines.push('  <animate'+attr({target:m.id,property:m.property,from:m.from,to:m.to,ms:m.durationMs,repeat:m.repeat})+'/>');
 lines.push('</ftzml>');return lines.join('\n')+'\n';
}
