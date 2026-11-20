import type {Switch} from './types.js';

// Predetermined RGB565 geometry/palette rules, shared by every consuming app.
const quantize=(value:number,steps:number)=>Math.round(Math.round(Math.max(0,Math.min(255,value))*steps/255)*255/steps);
function rgb565(channels:number[]){return '#'+channels.map((value,i)=>quantize(value,i===1?63:31).toString(16).padStart(2,'0')).join('');}
function channels(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function switchGraphic(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('fw-switch-rail');svg.setAttribute('viewBox','0 0 32 16');svg.setAttribute('aria-hidden','true');svg.setAttribute('shape-rendering','crispEdges');
 for(const [name,d] of [
  ['track','M6 0h20v1h3v1h1v2h1v2h1v4h-1v2h-1v2h-1v1h-3v1H6v-1H3v-1H2v-2H1v-2H0V6h1V4h1V2h1V1h3Z'],
  ['thumb','M6 2h4v1h2v1h1v2h1v4h-1v2h-1v1h-2v1H6v-1H4v-1H3v-2H2V6h1V4h1V3h2Z'],
 ]){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('class','fw-switch-'+name);path.setAttribute('d',d);svg.append(path);}
 return svg;
}
export function paintSwitch(el:HTMLElement,spec:Switch){
 const base=channels(rgb565(channels(spec.state==='on'?(spec.onColor??'#b54d29'):(spec.offColor??'#42414a'))));
 el.style.setProperty('--fw-switch-track',rgb565(base));
 el.style.setProperty('--fw-switch-hover',rgb565(base.map(value=>value*.78)));
 el.style.setProperty('--fw-switch-circle',rgb565(base.map(value=>value+66)));
 el.style.setProperty('--fw-switch-size',String(spec.size?spec.size.width/34:1));
 el.querySelector('.fw-switch-thumb')!.setAttribute('transform',spec.state==='on'?'translate(16 0)':'translate(0 0)');
}
