import {mount,type Pad} from '@fantaz/widgetz';
import '@fantaz/widgetz/style.css';

const view=mount(document.querySelector<HTMLElement>('#reference')!);
let enabled=true;
const design=():Pad=>({type:'pad',id:'reference',children:[
 {type:'row',id:'green-row',children:[{type:'text',id:'green-label',content:'Feature'},{type:'switch',id:'green',action:'toggle',label:'Feature enabled',state:enabled?'on':'off',onColor:'#298c7b',offColor:'#42414a'}]},
 {type:'row',id:'on-row',children:[{type:'text',id:'on-label',content:'On'},{type:'switch',id:'on',action:'example-on',label:'On example',state:'on'}]},
 {type:'row',id:'off-row',children:[{type:'text',id:'off-label',content:'Off'},{type:'switch',id:'off',action:'example-off',label:'Off example',state:'off'}]},
]});
view.update(design());
view.onAction(action=>{if(action==='toggle'){enabled=!enabled;view.update(design());}});
const positioned=mount(document.querySelector<HTMLElement>('#geometry')!);
positioned.update({type:'pad',id:'geometry',children:[{type:'text',id:'scale-label',content:'Shared geometry',position:{x:8,y:8}},{type:'switch',id:'scaled',state:'on',action:'scaled',label:'Larger control',size:{width:34,height:20},position:{x:220,y:18}}]});
window.addEventListener('pagehide',()=>{view.destroy();positioned.destroy();},{once:true});
