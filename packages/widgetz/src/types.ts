/** 1 = transparent, 10 = opaque. No other opacity representation is public. */
export type Opacity = 1|2|3|4|5|6|7|8|9|10;
export type Color = `#${string}`;
export type Glyph = 'app'|'download'|'check'|'fail'|'close'|'info';
export type IconSource = {glyph:Glyph; image?:never}|{image:string; glyph?:never};
export type Align = 'start'|'center'|'end';
export interface Palette {surface:Color; text:Color; muted:Color; accent:Color; success:Color; failure:Color; warning:Color; border:Color; divider:Color}
export const palette: Readonly<Palette> = Object.freeze({surface:'#171b2a',text:'#e7eef9',muted:'#b9c5d9',accent:'#ad94ff',success:'#83e6ae',failure:'#f1a7b3',warning:'#e6c36a',border:'#665691',divider:'#38364a'});
export interface WidgetSize {width:number; height:number}
export interface WidgetPosition {x:number; y:number}
/** Optional integer-pixel geometry, inherited by every widget. Layout owns omitted geometry. */
export interface Widget {id:string; size?:WidgetSize; position?:WidgetPosition}
interface Base extends Widget {opacity?:Opacity}
export interface Pad extends Base {type:'pad'; children:Element[]; palette?:Partial<Palette>}
export interface Row extends Base {type:'row'; children:Element[]}
export interface Column extends Base {type:'column'; children:Element[]}
export interface Text extends Base {type:'text'; content:string; color?:Color; role?:'normal'|'secondary'; align?:Align; wrap?:boolean; overflow?:'clip'|'roll'}
export interface Icon extends Base {type:'icon'; source:IconSource; color?:Color; label?:string; iconSize?:16|20}
export interface Led extends Base {type:'led'; state:'on'|'off'; color?:Color; label:string}
export interface Divider extends Base {type:'divider'}
export interface Progress extends Base {type:'progress'; value:number; color?:Color; label:string}
export interface Button extends Base {type:'button'; action:string; label:string; text?:string; icon?:IconSource; color?:Color; textSize?:11|12|13|14; wrap?:boolean; align?:Align; disabled?:boolean}
/** Appearance is limited to integer pixel scale and two state colors. */
export interface Switch extends Widget {type:'switch'; action:string; label:string; state:'on'|'off'; disabled?:boolean; onColor?:Color; offColor?:Color}
export type Element = Row|Column|Text|Icon|Led|Divider|Progress|Button|Switch;
export type Node = Pad|Element;
export type Motion = {id:string; property:'x'; from:number; to:number; durationMs:number; repeat?:boolean}|{id:string; property:'opacity'; from:Opacity; to:Opacity; durationMs:number; repeat?:boolean}|{id:string; property:'color'; from:Color; to:Color; durationMs:number; repeat?:boolean};
export interface Design {version:1; pad:Pad; animations?:Motion[]}
export interface DownloadResult {id:string; outcome:'success'|'failure'; title:string; detail:string; appName:string}
export interface NoticeOptions {icon?:IconSource; palette?:Partial<Palette>; opacity?:Opacity}
