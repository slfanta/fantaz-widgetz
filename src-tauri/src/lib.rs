use widgetz_tauri::{DownloadResult,NotificationExt,Outcome};
#[tauri::command]
fn demo_result(app:tauri::AppHandle,result:DownloadResult)->Result<widgetz_tauri::Accepted,String>{app.notify_result(result)}
#[tauri::command]
fn exit_demo(app:tauri::AppHandle){app.exit(0)}
pub fn run(){
    let _=Outcome::Success; // Public host API has no downloader dependency.
    tauri::Builder::default()
        .plugin(widgetz_tauri::init(Default::default()))
        .invoke_handler(tauri::generate_handler![demo_result,exit_demo])
        .run(tauri::generate_context!()).expect("Could not run Fantaz Widgetz demo");
}
