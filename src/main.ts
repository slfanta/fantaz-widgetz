import {mount,downloadNotice,parseFTZML,saveFTZML,palette,type Design,type DownloadResult,type Opacity,type Pad} from '@fantaz/widgetz';
import {invoke,isTauri} from '@tauri-apps/api/core';
import '@fantaz/widgetz/style.css';import './host.css';
const host=document.getElementById('app')!;const view=mount(host);let serial=0;let level:Opacity=10;let preview=false;let controlOn=true;
function demoPad():Pad{return {type:'pad',id:'demo',children:[
 {type:'row',id:'brand',children:[{type:'icon',id:'brand-icon',source:{glyph:'app'}},{type:'text',id:'brand-label',content:'Fantaz Widgetz · 0.3.2',overflow:'clip'},{type:'button',id:'exit',action:'exit',text:'[x]',label:'Exit demo',textSize:11}]},
 {type:'divider',id:'divider'},
 {type:'text',id:'hint',role:'secondary',content:'Two rows. Fixed style. Your content.',wrap:true},
 {type:'row',id:'switch-example',children:[{type:'icon',id:'switch-icon',source:{glyph:'app'}},{type:'text',id:'switch-label',content:'On / off control',overflow:'clip'},{type:'switch',id:'sample-switch',action:'toggle-sample',label:'Example control enabled',state:controlOn?'on':'off',onColor:'#b54d29',offColor:'#42414a'}]},
 {type:'row',id:'actions',children:[{type:'button',id:'success',action:'success',text:'Success',icon:{glyph:'check'},label:'Show a success notification',color:palette.success},{type:'button',id:'failure',action:'failure',text:'Failure',icon:{glyph:'fail'},label:'Show a failure notification',color:palette.failure},{type:'button',id:'burst',action:'burst',text:'Queue ×3',label:'Queue three notification examples'}]},
 {type:'row',id:'formats',children:[{type:'button',id:'ftzml',action:'ftzml',text:'FTZML',label:'Load and round-trip the FTZML example'},{type:'button',id:'opacity',action:'opacity',text:'Opacity',label:'Preview opacity levels 10, 8 and 6'},{type:'button',id:'back',action:'back',text:'Reset',label:'Restore demo'}]},
 {type:'text',id:'status',role:'secondary',content:isTauri()?'Native corner pad ready':'Browser demo · results preview here',overflow:'roll'},
 {type:'progress',id:'sample-bar',value:.62,label:'Example progress 62 percent'}
]};}
view.update(demoPad());
const sample=(success:boolean):DownloadResult=>({id:'demo-'+Date.now()+'-'+(++serial),outcome:success?'success':'failure',title:success?'example-video.mp4':'very-long-example-video-name-for-demonstrating-continuous-readable-rolling.mp4',detail:success?'Saved to Downloads':'Connection timed out · retained parts can be retried by the host',appName:'Example downloader'});
async function send(success:boolean){const result=sample(success);if(isTauri()){await invoke('demo_result',{result});view.setText('status',`${success?'Success':'Failure'} queued · ${result.id}`);}else {preview=true;view.update(downloadNotice(result,{opacity:level}));}}
view.onAction(action=>{void (async()=>{
 if(action==='exit'){if(isTauri())await invoke('exit_demo');else host.hidden=true;return;}
 if(action==='dismiss'||action==='back'){preview=false;view.update(demoPad());return;}
 if(action==='toggle-sample'){controlOn=!controlOn;view.update(demoPad());return;}
 if(action==='success'||action==='failure')await send(action==='success');
 if(action==='burst'){if(isTauri()){for(const ok of [true,false,true])await send(ok);}else await send(false);}
 if(action==='opacity'){level=(level===10?8:level===8?6:10);preview=true;view.update(downloadNotice(sample(true),{opacity:level}));}
 if(action==='ftzml'){
  const text=await fetch('/templates/download-result.ftzml').then(r=>{if(!r.ok)throw Error('Template not found');return r.text();});const design=parseFTZML(text);const roundtrip=parseFTZML(saveFTZML(design));preview=true;view.load(roundtrip);
 }
 })().catch(error=>{if(!preview)view.setText('status',String(error));});});
// Development/testing entry point, tree-shaken from production builds.
if(import.meta.env.DEV)Object.assign(window,{fantazTest:{view,mount,downloadNotice,parseFTZML,saveFTZML,palette,preview:(d:Design)=>view.load(d)}});
