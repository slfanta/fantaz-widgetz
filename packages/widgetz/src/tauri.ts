/** Optional adapter. Importing the renderer itself never imports Tauri. */
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {mount,type WidgetView} from './renderer.js';
import {downloadNotice} from './templates.js';
import type {DownloadResult,NoticeOptions} from './types.js';
export interface NoticeFrame {notice:DownloadResult;shown:boolean;held:boolean;remainingMs:number;pending:number}
export interface NoticeConnection {view:WidgetView;destroy():void}
export async function connectNotifications(target:HTMLElement,options:NoticeOptions={}):Promise<NoticeConnection>{
 const view=mount(target);let current:NoticeFrame|null=null;let dead=false;let timer:ReturnType<typeof setTimeout>|undefined;
 let countdown:Animation|undefined;let hover=false;let focus=false;let version=0;let lastSignature='';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const command=<T>(name:string,args:Record<string,unknown>={})=>invoke<T>('plugin:fantaz-widgetz|'+name,args);
 async function ready(id:string,attempt=0){
  if(dead||current?.notice.id!==id)return;
  try{await command('ready',{id});if((hover||focus)&&current?.notice.id===id)await command('hold',{id,held:true});}
  catch(error){if(attempt<2){timer=setTimeout(()=>{void ready(id,attempt+1);},250*(attempt+1));}else target.dispatchEvent(new CustomEvent('fantaz-error',{detail:String(error)}));}
 }
 function remaining(frame:NoticeFrame){
  countdown?.cancel();countdown=undefined;
  const fill=target.querySelector<HTMLElement>('[data-ftz-id="lifetime"] .fw-progress-fill');if(!fill)return;
  const lifetime=frame.notice.outcome==='success'?8000:12000;const fraction=Math.max(0,Math.min(1,frame.remainingMs/lifetime));
  fill.style.transform=`scaleX(${fraction})`;
  if(frame.shown&&!frame.held&&!reduced.matches)countdown=fill.animate([{transform:`scaleX(${fraction})`},{transform:'scaleX(0)'}],{duration:Math.max(1,frame.remainingMs),easing:'linear',fill:'forwards'});
 }
 function apply(frame:NoticeFrame|null){
  if(dead)return;
  if(!frame){current=null;target.hidden=true;countdown?.cancel();lastSignature='';return;}
  target.hidden=false;const signature=JSON.stringify(frame.notice);const changed=signature!==lastSignature;current=frame;
  if(changed){lastSignature=signature;view.update(downloadNotice(frame.notice,options));target.setAttribute('aria-label',`${frame.notice.appName}: ${frame.notice.outcome==='success'?'Download saved':'Download failed'}`);}
  remaining(frame);if(!frame.shown){clearTimeout(timer);void ready(frame.notice.id);}
 }
 const unlisten=await listen<NoticeFrame>('fantaz-widgetz:changed',event=>{version++;apply(event.payload);});
 const requestVersion=version;
 try{const initial=await command<NoticeFrame|null>('current');if(version===requestVersion)apply(initial);}catch(error){unlisten();view.destroy();throw error;}
 const disposeAction=view.onAction(action=>{if(action==='dismiss'&&current)void command('dismiss',{id:current.notice.id}).catch(error=>target.dispatchEvent(new CustomEvent('fantaz-error',{detail:String(error)})));});
 function setHold(){if(current?.shown)void command('hold',{id:current.notice.id,held:hover||focus}).catch(()=>{});}
 const enter=()=>{hover=true;setHold();};const leave=()=>{hover=false;setHold();};
 const focusin=()=>{focus=true;setHold();};const focusout=(e:FocusEvent)=>{if(!target.contains(e.relatedTarget as globalThis.Node|null)){focus=false;setHold();}};
 const motion=()=>{if(current)remaining(current);};
 target.addEventListener('pointerenter',enter);target.addEventListener('pointerleave',leave);target.addEventListener('focusin',focusin);target.addEventListener('focusout',focusout);reduced.addEventListener('change',motion);
 return {view,destroy(){dead=true;clearTimeout(timer);countdown?.cancel();unlisten();disposeAction();target.removeEventListener('pointerenter',enter);target.removeEventListener('pointerleave',leave);target.removeEventListener('focusin',focusin);target.removeEventListener('focusout',focusout);reduced.removeEventListener('change',motion);view.destroy();}};
}
