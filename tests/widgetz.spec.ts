import {test,expect} from '@playwright/test';
const api=(page:any,fn:any,arg?:unknown)=>page.evaluate(fn,arg);
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.locator('[data-ftz-id="brand-label"]')).toContainText('Fantaz Widgetz');});
test('notification remains two compact rows with exact fixed geometry',async({page})=>{
 await page.setViewportSize({width:284,height:64});await page.locator('[data-action="success"]').click();
 await expect(page.locator('[data-ftz-id="outcome"] .fw-run')).toHaveText('Download saved');
 const geometry=await page.evaluate(()=>{const css=(s:string)=>getComputedStyle(document.querySelector(s)!);return {pad:css('.fw-pad').padding,radius:css('.fw-pad').borderRadius,progress:css('.fw-progress').height,divider:css('.fw-divider').height,font:css('.fw-text').fontWeight,scroll:document.body.scrollWidth,width:innerWidth,height:document.querySelector('.fw-pad')!.scrollHeight};});
 expect(geometry).toEqual({pad:'4px',radius:'0px',progress:'3px',divider:'1px',font:'400',scroll:284,width:284,height:62});
 await page.screenshot({path:'.runtime/success-284x64.png'});
});
test('failure content and fixed close button do not invoke business operations',async({page})=>{
 await page.locator('[data-action="failure"]').click();await expect(page.locator('[data-ftz-id="outcome"] .fw-run')).toHaveText('Download failed');await expect(page.locator('[data-ftz-id="message"]')).toContainText('retained parts');
 await page.getByRole('button',{name:'Dismiss notification'}).click();await expect(page.locator('[data-ftz-id="brand-label"]')).toBeVisible();
});
test('identical updates retain nodes and rolling animation phase',async({page})=>{
 await page.setViewportSize({width:200,height:64});await page.locator('[data-action="failure"]').click();await page.waitForTimeout(80);
 const result=await page.evaluate(()=>{const f=(window as any).fantazTest;const el=document.querySelector('[data-ftz-id="message"]')!;const a=el.firstElementChild!.getAnimations()[0];const before=a.currentTime;f.view.update(f.view.design().pad);return {node:el===document.querySelector('[data-ftz-id="message"]'),animation:a===el.firstElementChild!.getAnimations()[0],before,after:a.currentTime};});
 expect(result.node).toBe(true);expect(result.animation).toBe(true);expect(Number(result.after)).toBeGreaterThanOrEqual(Number(result.before));
});
test('short centered text stays centered and has no animation',async({page})=>{
 await page.evaluate(()=>{(window as any).fantazTest.view.update({type:'pad',id:'root',children:[{type:'text',id:'label',content:'Short',align:'center',overflow:'roll'}]});});
 const state=await page.locator('[data-ftz-id="label"]').evaluate(el=>({align:getComputedStyle(el).textAlign,animated:el.getAnimations({subtree:true}).length}));expect(state).toEqual({align:'center',animated:0});
});
test('reduced motion stops automatic ticker and manual/accessible reading survives',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:200,height:64});await page.locator('[data-action="failure"]').click();
 const el=page.locator('[data-ftz-id="message"]');await expect(el).toHaveAttribute('aria-label',/very-long-example/);await el.focus();await page.keyboard.press('ArrowRight');
 expect(await el.evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);expect(await el.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
});
test('unknown style/font/padding/HTML hooks are rejected atomically',async({page})=>{
 for(const extra of [{padding:12},{font:'Arial'},{className:'free'},{style:{color:'red'}},{html:'<script>bad</script>'}]){
  const error=await api(page,({extra}:any)=>{try{(window as any).fantazTest.view.update({type:'pad',id:'root',children:[],...extra});return '';}catch(e){return String(e);}},{extra});expect(error).toContain('unsupported');
 }
 await expect(page.locator('[data-ftz-id="brand-label"] .fw-run')).toHaveText('Fantaz Widgetz · 0.1.0');
});
test('text uses literal content and unsafe images/colors are rejected',async({page})=>{
 const result=await page.evaluate(()=>{const f=(window as any).fantazTest;f.view.setText('brand-label','<img src=x onerror=alert(1)>');const errors=[];for(const n of [{type:'icon',id:'icon',source:{image:'https://example.com/photo.png'}},{type:'text',id:'text',content:'ok',color:'url(evil)'},{type:'icon',id:'icon',source:{image:'data:image/svg+xml,<svg/>'}}]){try{f.view.update({type:'pad',id:'root',children:[n]});}catch(e){errors.push(String(e));}}return {errors,images:document.querySelectorAll('img').length};});expect(result.errors).toHaveLength(3);expect(result.images).toBe(0);await expect(page.locator('[data-ftz-id="brand-label"] .fw-run')).toHaveText('<img src=x onerror=alert(1)>');
});
test('opacity mapping and inherited subtree compositing are explicit',async({page})=>{
 const result=await page.evaluate(()=>{const f=(window as any).fantazTest;f.view.update({type:'pad',id:'root',opacity:8,children:[{type:'text',id:'label',content:'Muted',opacity:5}]});return [getComputedStyle(document.querySelector('.fw-pad')!).opacity,getComputedStyle(document.querySelector('.fw-text')!).opacity];});expect(Number(result[0])).toBeCloseTo(7/9,5);expect(Number(result[1])).toBeCloseTo(4/9,5);
 for(const opacity of [0,11,4.5])expect(await api(page,(opacity:any)=>{try{(window as any).fantazTest.view.update({type:'pad',id:'root',opacity,children:[]});return '';}catch(e){return String(e);}},opacity)).toContain('integer');
});
test('simple animations are linear, replace per property and cancel cleanly',async({page})=>{
 const result=await page.evaluate(()=>{const f=(window as any).fantazTest;f.view.update({type:'pad',id:'root',children:[{type:'text',id:'text',content:'Motion'}]});const a={id:'text',property:'x',from:0,to:-40,durationMs:6000};f.view.animate(a);const cancel=f.view.animate({...a,to:-80});const el=document.querySelector('[data-ftz-id="text"]')!;const all=el.getAnimations({subtree:true});const easing=all[0].effect!.getTiming().easing;cancel();return {count:all.length,easing,after:el.getAnimations({subtree:true}).length};});expect(result).toEqual({count:1,easing:'linear',after:0});
});
test('removed colors clear and destroy cancels observers, actions and animations',async({page})=>{
 const r=await page.evaluate(()=>{const f=(window as any).fantazTest;const pad={type:'pad',id:'root',children:[{type:'text',id:'text',content:'Color',color:'#ff0000'}]};f.view.update(pad);delete (pad.children[0] as any).color;f.view.update(pad);const color=document.querySelector<HTMLElement>('.fw-text')!.style.color;f.view.animate({id:'text',property:'opacity',from:10,to:8,durationMs:2000,repeat:true});f.view.destroy();return {color,nodes:document.querySelector('#app')!.children.length,animations:document.getAnimations().length};});expect(r).toEqual({color:'',nodes:0,animations:0});
});
test('wrapped button labels are fixed-size and image/vector buttons render locally',async({page})=>{
 await page.evaluate(()=>{(window as any).fantazTest.view.update({type:'pad',id:'root',children:[{type:'row',id:'row',children:[{type:'button',id:'image',action:'a',label:'Image',text:'Image',icon:{image:'/fantaz.png'},textSize:13},{type:'button',id:'vector',action:'b',label:'Vector',icon:{glyph:'download'}}]}]});});
 await expect(page.locator('.fw-button img')).toBeVisible();expect(await page.locator('.fw-button svg').count()).toBe(1);expect(await page.locator('[data-ftz-id="image"]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('13px');
});
test('icon labels stay accessible when toggled between decorative and named',async({page})=>{
 await page.evaluate(()=>{const f=(window as any).fantazTest;const pad={type:'pad',id:'root',children:[{type:'icon',id:'logo',source:{glyph:'app'}}]};f.view.update(pad);(pad.children[0] as any).label='Your app';f.view.update(pad);});
 await expect(page.getByRole('img',{name:'Your app'})).toBeVisible();await expect(page.locator('[data-ftz-id="logo"]')).not.toHaveAttribute('aria-hidden','true');
});
test('FTZML templates parse and round-trip without introducing freedom',async({page})=>{
 for(const file of ['download-result','connection-monitor','linear-animation']){
  const result=await api(page,async(file:string)=>{const f=(window as any).fantazTest;const xml=await fetch(`/templates/${file}.ftzml`).then(r=>r.text());const design=f.parseFTZML(xml);const text=f.saveFTZML(design);return {before:design,after:f.parseFTZML(text),text};},file);expect(result.after).toEqual(result.before);expect(result.text).toContain('<ftzml version="1">');
 }
});
test('FTZML retains declared animation while reduced motion suppresses playback',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const result=await page.evaluate(async()=>{const f=(window as any).fantazTest;const d=f.parseFTZML(await fetch('/templates/linear-animation.ftzml').then(r=>r.text()));f.view.load(d);return {saved:f.parseFTZML(f.saveFTZML(f.view.design())),motions:document.getAnimations().length};});expect(result.saved.animations).toHaveLength(3);expect(result.motions).toBe(0);
});
test('FTZML escaping preserves literal content, opacity and disabled buttons',async({page})=>{
 const result=await page.evaluate(()=>{const f=(window as any).fantazTest;const d={version:1,pad:{type:'pad',id:'root',opacity:8,children:[{type:'text',id:'text',content:'<plain> & "quoted"\nsecond line'},{type:'button',id:'button',label:'Off',text:'[x]',action:'close',disabled:true,wrap:true,align:'center',textSize:11}]}};return {before:d,after:f.parseFTZML(f.saveFTZML(d))};});expect(result.after).toEqual(result.before);
});
test('FTZML rejects malformed/unsafe/unknown/oversized designs and duplicate animation',async({page})=>{
 const bad=['<!DOCTYPE ftzml [<!ENTITY bad SYSTEM "file:///secret">]><ftzml version="1"><pad id="p"/></ftzml>','<ftzml version="2"><pad id="p"/></ftzml>','<ftzml version="1"><pad id="p" padding="9"/></ftzml>','<ftzml version="1"><pad id="p"><text id="t"><b>raw</b></text></pad></ftzml>','<ftzml version="1"><pad id="same"><text id="same">x</text></pad></ftzml>','<ftzml version="1"><pad id="p"><pad id="p2"/></pad></ftzml>','<ftzml version="1"><pad id="p"><text id="t">x</text></pad><animate target="t" property="x" from="0" to="1" ms="1000"/><animate target="t" property="x" from="0" to="2" ms="1000"/></ftzml>','x'.repeat(262145)];
 for(const xml of bad)expect(await api(page,(xml:string)=>{try{(window as any).fantazTest.parseFTZML(xml);return '';}catch(e){return String(e);}},xml)).toContain('Fantaz Widgetz');
});
test('FTZML example renders and close returns to demo',async({page})=>{
 await page.locator('[data-action="ftzml"]').click();await expect(page.locator('[data-ftz-id="message"]')).toContainText('example-video.mp4');await page.locator('[data-action="dismiss"]').click();await expect(page.locator('[data-ftz-id="brand-label"]')).toBeVisible();
});
test('mobile in-app controls use touch targets and fixed template keeps its bounds',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:88},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();await page.goto('/');await page.locator('[data-action="failure"]').click();
 expect(await page.evaluate(()=>document.body.scrollWidth)).toBe(320);expect(await page.locator('[data-ftz-id="close"]').evaluate(e=>e.getBoundingClientRect().height)).toBe(44);await page.screenshot({path:'.runtime/failure-touch-320x88.png'});await context.close();
});


test('pixel switch round-trips on/off actions colors disabled and large icon through FTZML',async({page})=>{
 const r=await page.evaluate(()=>{const f=(window as any).fantazTest;const design={version:1,pad:{type:'pad',id:'pad',children:[{type:'row',id:'row',children:[{type:'icon',id:'icon',source:{glyph:'app'},size:20},{type:'switch',id:'switch',state:'on',action:'route',label:'Routing',color:'#63dfbd',disabled:true}]}]}};return {design,xml:f.saveFTZML(design),roundtrip:f.parseFTZML(f.saveFTZML(design))};});
 expect(r.roundtrip).toEqual(r.design);expect(r.xml).toContain('<switch');expect(r.xml).toContain('size="20"');
});

test('pixel switch is controlled accessible keyboard-operable and disabled-safe',async({page})=>{
 await page.evaluate(()=>{const f=(window as any).fantazTest;(window as any).switchActions=[];f.view.onAction((id:string)=>(window as any).switchActions.push(id));f.view.update({type:'pad',id:'pad',children:[{type:'switch',id:'switch',state:'off',action:'route',label:'Routing'}]});});
 const toggle=page.getByRole('switch',{name:'Routing'});await expect(toggle).toHaveAttribute('aria-checked','false');await toggle.click();
 expect(await page.evaluate(()=>(window as any).switchActions)).toEqual(['route']);await expect(toggle).toHaveAttribute('aria-checked','false');
 await toggle.focus();await page.keyboard.press('Space');await page.keyboard.press('Enter');expect(await page.evaluate(()=>(window as any).switchActions)).toHaveLength(3);
 const result=await page.evaluate(()=>{const f=(window as any).fantazTest;const node=document.querySelector('.fw-switch');const d=f.view.design();d.pad.children[0].state='on';d.pad.children[0].disabled=true;f.view.update(d.pad);return {same:node===document.querySelector('.fw-switch'),geometry:getComputedStyle(document.querySelector('.fw-switch')!).width,animations:document.getAnimations().length};});
 expect(result).toEqual({same:true,geometry:'34px',animations:0});await expect(toggle).toHaveAttribute('aria-checked','true');await expect(toggle).toBeDisabled();
 await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('.fw-switch')!.click();});expect(await page.evaluate(()=>(window as any).switchActions)).toHaveLength(3);
});

test('pixel switch FTZML rejects invalid state injected attributes and arbitrary sizes atomically',async({page})=>{
 for(const body of ['<switch id="s" state="maybe" action="x" label="X"/>','<switch id="s" state="on" action="x" label="X" onclick="evil"/>','<icon id="i" glyph="app" size="19"/>','<switch id="s" state="off" action="x" label="X" disabled="yes"/>']){
  const error=await page.evaluate(body=>{try{(window as any).fantazTest.view.load((window as any).fantazTest.parseFTZML('<ftzml version="1"><pad id="p">'+body+'</pad></ftzml>'));return '';}catch(e){return String(e);}},body);expect(error).toContain('Fantaz Widgetz');
 }
 await expect(page.locator('[data-ftz-id="brand-label"]')).toContainText('Fantaz Widgetz');
});

test('pixel switch gets a 44px touch target without changing compact rail',async({browser})=>{
 const context=await browser.newContext({viewport:{width:180,height:60},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/');await page.evaluate(()=>{(window as any).fantazTest.view.update({type:'pad',id:'p',children:[{type:'switch',id:'s',action:'toggle',state:'off',label:'Routing'}]});});
 const size=await page.getByRole('switch').evaluate(el=>({height:el.getBoundingClientRect().height,rail:el.querySelector('.fw-switch-rail')!.getBoundingClientRect().height}));expect(size).toEqual({height:44,rail:16});await context.close();
});
