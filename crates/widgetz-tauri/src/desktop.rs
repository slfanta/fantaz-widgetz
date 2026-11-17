use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::{
    Emitter, Manager, PhysicalPosition, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    plugin::{Builder, TauriPlugin},
};
use tokio::sync::Notify;
use widgetz_core::{Accepted, DownloadResult, Frame, Queue, Rect, bottom_right};
const LABEL: &str = "fantaz-notice";
const EVENT: &str = "fantaz-widgetz:changed";
#[derive(Clone)]
pub struct Options {
    pub page: String,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            page: "notice.html".into(),
        }
    }
}
struct Service {
    queue: Mutex<Queue>,
    wake: Arc<Notify>,
    epoch: Instant,
}
impl Service {
    fn now(&self) -> u64 {
        self.epoch.elapsed().as_millis().min(u128::from(u64::MAX)) as u64
    }
}
pub trait NotificationExt<R: Runtime>: Manager<R> {
    /// Call after the HOST has confirmed a saved download or final failure.
    /// Queue pressure is returned to the host; results are never silently dropped.
    fn notify_result(&self, result: DownloadResult) -> Result<Accepted, String> {
        let s = self
            .try_state::<Service>()
            .ok_or("Fantaz Widgetz plugin is not installed")?;
        let accepted = s
            .queue
            .lock()
            .map_err(|_| "Notification queue unavailable")?
            .enqueue(result)?;
        s.wake.notify_one();
        Ok(accepted)
    }
}
impl<R: Runtime, T: Manager<R>> NotificationExt<R> for T {}
fn check<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    if window.label() == LABEL {
        Ok(())
    } else {
        Err("Only the notification view can use this command".into())
    }
}
#[tauri::command]
fn current<R: Runtime>(
    window: WebviewWindow<R>,
    state: tauri::State<'_, Service>,
) -> Result<Option<Frame>, String> {
    check(&window)?;
    Ok(state
        .queue
        .lock()
        .map_err(|_| "Queue unavailable")?
        .frame(state.now()))
}
#[tauri::command]
async fn ready<R: Runtime>(
    window: WebviewWindow<R>,
    state: tauri::State<'_, Service>,
    id: String,
) -> Result<bool, String> {
    check(&window)?;
    if !state
        .queue
        .lock()
        .map_err(|_| "Queue unavailable")?
        .is_current(&id)
    {
        return Ok(false);
    }
    if let Some(monitor) = window.primary_monitor().map_err(|e| e.to_string())? {
        let area = monitor.work_area();
        let scale = monitor.scale_factor();
        let size = window.outer_size().map_err(|e| e.to_string())?;
        let (x, y) = bottom_right(
            Rect {
                x: area.position.x,
                y: area.position.y,
                width: area.size.width,
                height: area.size.height,
            },
            (size.width, size.height),
            (12.0 * scale).round() as u32,
        );
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
    }
    // Never set_focus. Showing this window must not interrupt the user's app.
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SW_SHOWNOACTIVATE, ShowWindow};
        // SW_SHOW can activate despite a nonfocusable builder flag. This
        // explicit native verb preserves the user's foreground window.
        unsafe {
            ShowWindow(
                window.hwnd().map_err(|e| e.to_string())?.0,
                SW_SHOWNOACTIVATE,
            );
        }
    }
    #[cfg(not(windows))]
    window.show().map_err(|e| e.to_string())?;
    #[cfg(windows)]
    mark_tool_window(&window).map_err(|e| e.to_string())?;
    let accepted = state
        .queue
        .lock()
        .map_err(|_| "Queue unavailable")?
        .acknowledge(&id, state.now());
    if accepted {
        state.wake.notify_one();
    } else {
        let _ = hide_notice(&window);
    }
    Ok(accepted)
}
#[tauri::command]
async fn dismiss<R: Runtime>(
    window: WebviewWindow<R>,
    state: tauri::State<'_, Service>,
    id: String,
) -> Result<bool, String> {
    check(&window)?;
    let dismissed = state
        .queue
        .lock()
        .map_err(|_| "Queue unavailable")?
        .dismiss(&id);
    if dismissed {
        hide_notice(&window).map_err(|e| e.to_string())?;
        state.wake.notify_one();
    }
    Ok(dismissed)
}
#[tauri::command]
fn hold<R: Runtime>(
    window: WebviewWindow<R>,
    state: tauri::State<'_, Service>,
    id: String,
    held: bool,
) -> Result<bool, String> {
    check(&window)?;
    let changed = state
        .queue
        .lock()
        .map_err(|_| "Queue unavailable")?
        .hold(&id, held, state.now());
    state.wake.notify_one();
    Ok(changed)
}
#[cfg(windows)]
fn mark_tool_window<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<()> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GetWindowLongPtrW, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        SWP_NOZORDER, SetWindowLongPtrW, SetWindowPos, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    };
    let hwnd = window.hwnd()?.0;
    // Tao reapplies its cached flags when shown; enforce the tool-window style
    // after show as well as before, without activating/resizing this HWND.
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(
            hwnd,
            GWL_EXSTYLE,
            (style | WS_EX_TOOLWINDOW as isize) & !(WS_EX_APPWINDOW as isize),
        );
        SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
        );
    }
    Ok(())
}
fn hide_notice<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<()> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SW_HIDE, ShowWindow};
        // Pair with the nonactivating native show; do not rely on Tao's cached
        // visibility after changing HWND visibility with ShowWindow.
        unsafe {
            ShowWindow(window.hwnd()?.0, SW_HIDE);
        }
        Ok(())
    }
    #[cfg(not(windows))]
    window.hide()
}
fn ensure_window<R: Runtime>(
    app: &tauri::AppHandle<R>,
    options: &Options,
) -> tauri::Result<WebviewWindow<R>> {
    if let Some(window) = app.get_webview_window(LABEL) {
        return Ok(window);
    }
    let window =
        WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App(options.page.clone().into()))
            .title("Fantaz Widgetz notification")
            .inner_size(284.0, 64.0)
            .decorations(false)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focusable(false)
            .focused(false)
            .visible(false)
            .shadow(false)
            .transparent(true)
            .background_color(tauri::window::Color(0, 0, 0, 0))
            .build()?;
    #[cfg(windows)]
    mark_tool_window(&window)?;
    Ok(window)
}
pub fn init<R: Runtime>(options: Options) -> TauriPlugin<R> {
    Builder::new("fantaz-widgetz")
        .invoke_handler(tauri::generate_handler![current,ready,dismiss,hold])
        .setup(move|app,_|{
            if options.page.is_empty()||options.page.contains(":")||options.page.starts_with('/')||options.page.contains(".."){
                return Err("Notification page must be a bundled relative path".into());
            }
            app.manage(Service{queue:Mutex::new(Queue::default()),wake:Arc::new(Notify::new()),epoch:Instant::now()});
            let app=app.clone();let options=options.clone();
            tauri::async_runtime::spawn(async move{
                let mut previous:Option<String>=None;
                loop{
                    let state=app.state::<Service>();
                    let(frame,deadline,failed)={let mut q=state.queue.lock().unwrap();let now=state.now();let failed=q.advance(now);(q.frame(now),q.next_deadline(),failed)};
                    if let Some(id)=failed{let _=app.emit("fantaz-widgetz:delivery-failed",id);}
                    if let Some(frame)=&frame{
                        if previous.as_deref()!=Some(&frame.notice.id)&&let Some(w)=app.get_webview_window(LABEL){let _=hide_notice(&w);}
                        match ensure_window(&app,&options){
                            Ok(window)=>{let _=window.emit(EVENT,frame);}
                            Err(error)=>{let _=app.emit("fantaz-widgetz:host-error",error.to_string());}
                        }
                    }else if previous.is_some()&&let Some(window)=app.get_webview_window(LABEL){let _=hide_notice(&window);}
                    previous=frame.map(|f|f.notice.id);
                    let wake=state.wake.clone();
                    // No timer exists while idle/held; producers or exact deadlines wake us.
                    if let Some(deadline)=deadline{
                        let delay=deadline.saturating_sub(state.now());
                        tokio::select!{_=wake.notified()=>{},_=tokio::time::sleep(Duration::from_millis(delay.max(1)))=>{}}
                    }else{wake.notified().await;}
                }
            });Ok(())
        }).build()
}
