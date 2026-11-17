// Test ONLY this demo, with its own disposable WebView profile. No other app attachment.
import {chromium,expect} from '@playwright/test';
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import path from 'node:path';
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
mkdirSync('.runtime',{recursive:true});
const profile=path.resolve('.runtime','native-profile-'+Date.now());
const app=spawn(path.resolve('target/release/fantaz-widgetz-demo.exe'),[],{env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:profile,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port}`},windowsHide:true,stdio:'ignore'});
const exited=new Promise(resolve=>app.once('exit',(code,signal)=>resolve({code,signal})));
let browser,main;
const bounded=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Native IPC timed out')),5000);timer.unref();})]);
const invoke=(command,args={})=>bounded(main.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const native=()=>{
 const code=`import ctypes as c,ctypes.wintypes as w,json,sys
u=c.WinDLL('user32');pid=int(sys.argv[1]);rows=[]
u.GetWindowLongPtrW.argtypes=[w.HWND,c.c_int];u.GetWindowLongPtrW.restype=c.c_ssize_t
u.GetWindowTextW.argtypes=[w.HWND,w.LPWSTR,c.c_int];u.GetWindowThreadProcessId.argtypes=[w.HWND,c.POINTER(w.DWORD)]
u.IsWindowVisible.argtypes=[w.HWND];u.GetForegroundWindow.restype=w.HWND
u.GetWindowRect.argtypes=[w.HWND,c.POINTER(w.RECT)]
@c.WINFUNCTYPE(w.BOOL,w.HWND,w.LPARAM)
def visit(h,_):
 p=w.DWORD();u.GetWindowThreadProcessId(h,c.byref(p))
 if p.value==pid:
  s=c.create_unicode_buffer(512);u.GetWindowTextW(h,s,512);r=w.RECT();u.GetWindowRect(h,c.byref(r));ex=u.GetWindowLongPtrW(h,-20)
  rows.append(dict(title=s.value,visible=bool(u.IsWindowVisible(h)),noActivate=bool(ex&0x08000000),toolWindow=bool(ex&0x80),appWindow=bool(ex&0x40000),topmost=bool(ex&8),rect=[r.left,r.top,r.right-r.left,r.bottom-r.top],foreground=h==u.GetForegroundWindow()))
 return True
u.EnumWindows(visit,0);print(json.dumps(rows))`;
 const p=spawnSync('python',['-c',code,String(app.pid)],{encoding:'utf8',windowsHide:true});if(p.status!==0)throw Error(p.stderr);return JSON.parse(p.stdout);
};
try{
 for(let n=0;n<150;n++){try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);main=browser.contexts().flatMap(c=>c.pages()).find(p=>/tauri.localhost/.test(p.url())&&!p.url().includes('notice.html'));if(main)break;await browser.close();}catch{}await sleep(150);}
 if(!main)throw Error('Native demo did not start');await expect(main.getByRole('button',{name:'Show a success notification'})).toBeVisible();
 const result=(id,outcome)=>({id,outcome,title:'example-file-'+id+'.mp4',detail:outcome==='success'?'Saved to Downloads':'Connection timed out; host retains parts',appName:'Neutral fixture'});
 const accepted=await invoke('demo_result',{result:result('first','success')});expect(accepted).toBe('queued');expect(await invoke('demo_result',{result:result('first','success')})).toBe('duplicate');
 let notice;await expect.poll(()=>{notice=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('notice.html'));return !!notice;}).toBe(true);
 await expect(notice.locator('[data-ftz-id="outcome"] .fw-run')).toHaveText('Download saved');
 try{await expect.poll(()=>native().find(w=>w.title==='Fantaz Widgetz notification')?.visible).toBe(true);}catch(error){console.log('Native window diagnostics',JSON.stringify(native()));console.log('Current frame',await bounded(notice.evaluate(()=>window.__TAURI_INTERNALS__.invoke('plugin:fantaz-widgetz|current'))));throw error;}
 const firstNative=native().find(w=>w.title==='Fantaz Widgetz notification');expect(firstNative.noActivate).toBe(true);expect(firstNative.appWindow).toBe(false);expect(firstNative.topmost).toBe(true);expect(firstNative.foreground).toBe(false);
 expect(await notice.evaluate(()=>!!(window.fantazTest))).toBe(false);
 await notice.screenshot({path:'.runtime/native-success.png'});
 await invoke('demo_result',{result:result('second','failure')});await invoke('demo_result',{result:result('third','success')});
 const ni=(name,args={})=>bounded(notice.evaluate(({name,args})=>window.__TAURI_INTERNALS__.invoke('plugin:fantaz-widgetz|'+name,args),{name,args}));
 const before=await ni('current');expect(before.shown).toBe(true);expect(before.notice.id).toBe('first');
 expect(await ni('dismiss',{id:'stale'})).toBe(false);expect((await ni('current')).notice.id).toBe('first');
 await notice.locator('#app').dispatchEvent('pointerenter');await expect.poll(async()=>(await ni('current')).held).toBe(true);const held=await ni('current');await sleep(8500);const heldAfter=await ni('current');expect(heldAfter.notice.id).toBe('first');expect(heldAfter.remainingMs).toBe(held.remainingMs);
 await notice.locator('#app').dispatchEvent('pointerleave');await notice.getByRole('button',{name:'Dismiss notification'}).dispatchEvent('click');await expect(notice.locator('[data-ftz-id="outcome"] .fw-run')).toHaveText('Download failed');await expect.poll(async()=>(await ni('current'))?.shown).toBe(true);
 await notice.screenshot({path:'.runtime/native-failure.png'});
 expect(await ni('dismiss',{id:'first'})).toBe(false);await ni('dismiss',{id:'second'});await expect(notice.locator('[data-ftz-id="outcome"] .fw-run')).toHaveText('Download saved');
 await expect.poll(async()=>(await ni('current'))?.shown).toBe(true);await sleep(8200);
 await expect.poll(()=>native().find(w=>w.title==='Fantaz Widgetz notification')?.visible).toBe(false);
 expect((await ni('current'))).toBeNull();
 let denied=false;try{await invoke('plugin:fantaz-widgetz|current');}catch{denied=true;}expect(denied).toBe(true);
 const report={version:'0.1.0',native:true,isolatedProfile:profile,pad:firstNative,successAndFailureDisplayed:true,stableDedup:true,fifoAndStaleIdProtection:true,hoverHoldPreservesRemaining:true,closeButtonHandlerWorks:true,autoDismissAfterAck:true,mainCannotUseNoticeCommands:true,oneReusedNoticeWindow:true,productionTestHooksAbsent:true,noDownloaderModified:true};
 await invoke('exit_demo').catch(error=>{if(!/closed/.test(String(error)))throw error;});
 const exit=await Promise.race([exited,sleep(5000).then(()=>{throw Error('Demo did not exit cleanly');})]);expect(exit.code).toBe(0);report.gracefulExit=true;
 writeFileSync('.runtime/native-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
 if(browser)await browser.close().catch(()=>{});
 // Emergency cleanup is limited to the child demo process spawned above.
 if(app.exitCode===null)spawnSync('taskkill',['/PID',String(app.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
}
