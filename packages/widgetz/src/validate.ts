import type {Design,Motion,Node,Pad,Palette} from './types.js';
import {widgetAnchors} from './types.js';
const geometryFields=['id','type','size','position','anchor'];
const common=[...geometryFields,'color','opacity'];
const fields:Record<string,string[]>={pad:['children','palette'],row:['children'],column:['children'],text:['content','role','align','wrap','overflow'],icon:['source','label','iconSize'],led:['state','label'],divider:[],progress:['value','label'],button:['action','label','text','icon','textSize','wrap','align','disabled'],switch:['action','label','state','disabled','onColor','offColor']};
const paletteKeys: (keyof Palette)[]=['surface','text','muted','accent','success','failure','warning','border','divider'];
export function fail(message:string):never {throw new Error(`Fantaz Widgetz: ${message}`);}
function object(v:unknown,label:string):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))fail(`${label} must be an object`);return v as Record<string,unknown>;}
function keys(v:Record<string,unknown>,allowed:string[],label:string){for(const k of Object.keys(v))if(!allowed.includes(k))fail(`${label}: unsupported '${k}'`);}
function geometry(n:Record<string,unknown>){
 if(n.size!==undefined){const size=object(n.size,'size');keys(size,['width','height'],'size');for(const key of ['width','height'])if(!Number.isInteger(size[key])||Number(size[key])<1||Number(size[key])>4096)fail('size width/height must be integer pixels from 1 to 4096');}
 if(n.anchor!==undefined)choice(n.anchor,widgetAnchors,'anchor');
 if(n.position!==undefined){
  const position=object(n.position,'position');
  keys(position,['x','y'],'position');
  for(const key of ['x','y']){
   const offset=position[key];
   if(!Number.isInteger(offset)||Math.abs(Number(offset))>8192)fail('position x/y must be integer pixels within +/-8192');
  }
 }
}
function text(v:unknown,label:string,max=4096){if(typeof v!=='string'||v.length>max)fail(`${label} must be text of at most ${max} characters`);if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v))fail(`${label} contains characters not representable in XML 1.0`);}
function choice(v:unknown,values:readonly unknown[],label:string){if(!values.includes(v))fail(`${label} must be ${values.join(' / ')}`);}
export function opacity(v:unknown){if(!Number.isInteger(v)||Number(v)<1||Number(v)>10)fail('opacity must be an integer 1–10');return (Number(v)-1)/9;}
export function color(v:unknown):asserts v is `#${string}` {if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))fail('color must be #RRGGBB');}
function source(v:unknown){const s=object(v,'icon source');keys(s,['glyph','image'],'icon source');if('glyph'in s&&'image'in s)fail('choose glyph OR image');if('glyph'in s)choice(s.glyph,['app','download','check','fail','close','info'],'glyph');else {
 text(s.image,'image',262144);const url=s.image as string;
 if(!url||url.includes('\\')||url.startsWith('//')||/[\u0000-\u001f]/.test(url))fail('image must be a bundled local image');
 if(/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url))return;
 if(/^[a-z][a-z0-9+.-]*:/i.test(url))fail('image must be a relative bundled path or PNG/JPEG/WebP data URL');
 if(!/\.(png|jpe?g|webp|svg)(?:[?#].*)?$/i.test(url))fail('image must be a bundled image file');
}}
export function validatePad(value:unknown):asserts value is Pad {
 const ids=new Set<string>();let count=0;
 function walk(input:unknown,depth:number,root=false){
  const n=object(input,'element');const t=String(n.type);
  if(!Object.hasOwn(fields,t))fail(`unknown element '${t}'`);if(++count>64||depth>8)fail('design exceeds 64 elements or 8 layout levels');
  keys(n,[...(t==='switch'?geometryFields:common),...fields[t]],t);geometry(n);if(root?t!=='pad':t==='pad')fail('exactly one outer pad is required');
  if(typeof n.id!=='string'||!(/^[a-z][a-z0-9_-]{0,63}$/i.test(n.id)))fail('id must start with a letter, max 64 letters/digits/_/-');
  if(ids.has(n.id))fail(`duplicate id '${n.id}'`);ids.add(n.id);
  if(n.opacity!==undefined)opacity(n.opacity);if(n.color!==undefined)color(n.color);
  if(n.align!==undefined)choice(n.align,['start','center','end'],'align');for(const k of ['wrap','disabled'])if(n[k]!==undefined&&typeof n[k]!=='boolean')fail(`${k} must be true or false`);
  if('children'in n){if(!Array.isArray(n.children)||n.children.length>32)fail('children must be an array of up to 32 elements');n.children.forEach(c=>walk(c,depth+1));}
  if(['pad','row','column'].includes(t)&&!Array.isArray(n.children))fail(`${t} needs children`);
  switch(t){
   case 'pad':if(n.palette!==undefined){const p=object(n.palette,'palette');keys(p,paletteKeys,'palette');Object.values(p).forEach(color);}break;
   case 'text':text(n.content,'text content');if(n.role!==undefined)choice(n.role,['normal','secondary'],'text role');if(n.overflow!==undefined)choice(n.overflow,['clip','roll'],'overflow');if(n.wrap===true&&n.overflow==='roll')fail('text cannot wrap AND roll');break;
   case 'icon':if(n.iconSize!==undefined)choice(n.iconSize,[16,20],'iconSize');source(n.source);if(n.label!==undefined)text(n.label,'icon label',256);break;
   case 'led':choice(n.state,['on','off'],'LED state');text(n.label,'LED label',256);break;
   case 'progress':if(typeof n.value!=='number'||!Number.isFinite(n.value)||n.value<0||n.value>1)fail('progress value must be 0–1');text(n.label,'progress label',256);break;
   case 'switch':
    text(n.action,'switch action',64);
    text(n.label,'switch accessible label',256);
    choice(n.state,['on','off'],'switch state');
    if(n.onColor!==undefined)color(n.onColor);
    if(n.offColor!==undefined)color(n.offColor);
    break;
   case 'button':text(n.action,'button action',64);text(n.label,'button accessible label',256);if(n.text!==undefined)text(n.text,'button text',256);if(n.icon!==undefined)source(n.icon);if(n.text===undefined&&n.icon===undefined)fail('button needs text or icon');if(n.textSize!==undefined)choice(n.textSize,[11,12,13,14],'button textSize');break;
  }
 }
 walk(value,0,true);
}
export function validateMotion(v:unknown,pad:Pad):asserts v is Motion {
 const m=object(v,'animation');keys(m,['id','property','from','to','durationMs','repeat'],'animation');
 const nodes=new Map<string,Node>();function walk(n:Node){nodes.set(n.id,n);if('children'in n)n.children.forEach(walk);}walk(pad);
 const node=nodes.get(String(m.id));if(!node)fail(`animation target '${m.id}' is missing`);
 choice(m.property,['x','opacity','color'],'animation property');
 if(m.repeat!==undefined&&typeof m.repeat!=='boolean')fail('repeat must be boolean');
 if(!Number.isInteger(m.durationMs)||Number(m.durationMs)<100||Number(m.durationMs)>600000)fail('animation duration must be 100–600000 ms');
 if(m.property==='x'){if(node.type!=='text')fail('x animation requires text');for(const k of ['from','to'])if(typeof m[k]!=='number'||!Number.isFinite(m[k])||Math.abs(Number(m[k]))>8192)fail('text x must be finite, within ±8192 px');}
 if(m.property==='opacity'){if(node.type==='switch')fail('switch appearance supports only inherited size/position and onColor/offColor');opacity(m.from);opacity(m.to);}
 if(m.property==='color'){if(!['text','icon','led','divider','progress','button'].includes(node.type))fail('color animation requires a visible content element');color(m.from);color(m.to);}
}
export function validateDesign(v:unknown):asserts v is Design {
 const d=object(v,'design');keys(d,['version','pad','animations'],'design');if(d.version!==1)fail('design version must be 1');validatePad(d.pad);
 if(d.animations!==undefined){if(!Array.isArray(d.animations)||d.animations.length>16)fail('at most 16 animations allowed');const seen=new Set<string>();for(const m of d.animations){validateMotion(m,d.pad);const key=m.id+':'+m.property;if(seen.has(key))fail(`duplicate animation for ${key}`);seen.add(key);}}
}
