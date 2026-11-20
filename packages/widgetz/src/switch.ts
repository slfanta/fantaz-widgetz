import type {Switch} from './types.js';

// RGB565 applies to the solid fills. SVG supplies the smooth edges.
const quantize=(value:number,steps:number)=>Math.round(Math.round(Math.max(0,Math.min(255,value))*steps/255)*255/steps);
function rgb565(channels:number[]){return '#'+channels.map((value,i)=>quantize(value,i===1?63:31).toString(16).padStart(2,'0')).join('');}
function channels(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function switchGraphic() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('fw-switch-rail');
  svg.setAttribute('viewBox', '0 0 32 16');
  svg.setAttribute('aria-hidden', 'true');

  const track = document.createElementNS(ns, 'rect');
  track.classList.add('fw-switch-track');
  track.setAttribute('width', '32');
  track.setAttribute('height', '16');
  track.setAttribute('rx', '8');

  const thumb = document.createElementNS(ns, 'circle');
  thumb.classList.add('fw-switch-thumb');
  thumb.setAttribute('cy', '8');
  thumb.setAttribute('r', '6');
  svg.append(track, thumb);
  return svg;
}

export function paintSwitch(el: HTMLElement, spec: Switch) {
  const on = spec.state === 'on';
  const trackColor = rgb565(channels(on ? (spec.onColor ?? '#b54d29') : (spec.offColor ?? '#42414a')));
  const base = channels(trackColor);
  el.style.setProperty('--fw-switch-track', trackColor);
  el.style.setProperty('--fw-switch-hover', rgb565(base.map(value => value * .78)));
  el.style.setProperty('--fw-switch-circle', rgb565(base.map(value => value + 66)));

  // Preserve the artwork scale of explicitly sized designs from 0.3.0.
  const svg = el.querySelector('svg')!;
  svg.setAttribute('width', String(spec.size ? spec.size.width * 32 / 34 : 16));
  svg.setAttribute('height', String(spec.size ? spec.size.height * 16 / 20 : 8));
  el.querySelector('circle')!.setAttribute('cx', on ? '24' : '8');
}
