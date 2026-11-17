import type {DownloadResult,NoticeOptions,Pad} from './types.js';
import {palette} from './types.js';
export function downloadNotice(result:DownloadResult,options:NoticeOptions={}):Pad {
 const colors={...palette,...options.palette};const ok=result.outcome==='success';const status=ok?'Download saved':'Download failed';const tone=ok?colors.success:colors.failure;
 return {type:'pad',id:'notice',opacity:options.opacity??10,palette:options.palette,children:[
  {type:'row',id:'heading',children:[
   {type:'icon',id:'app-icon',source:options.icon||{glyph:'app'},label:result.appName},
   {type:'text',id:'outcome',content:status,color:tone,overflow:'clip'},
   {type:'button',id:'close',action:'dismiss',label:'Dismiss notification',text:'[x]',textSize:11,color:colors.muted}
  ]},
  {type:'divider',id:'separator'},
  {type:'row',id:'body',children:[
   {type:'led',id:'outcome-led',state:'on',color:tone,label:status},
   {type:'text',id:'message',role:'secondary',overflow:'roll',content:result.title+(result.detail?' · '+result.detail:'')}
  ]},
  {type:'progress',id:'lifetime',value:1,color:tone,label:'Notification display time remaining'}
 ]};
}
