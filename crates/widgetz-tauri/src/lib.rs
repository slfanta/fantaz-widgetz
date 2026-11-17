//! Desktop-only Tauri 2 adapter. Embedded rendering does not require this crate.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod desktop;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub use desktop::{NotificationExt, Options, init};
pub use widgetz_core::{Accepted, DownloadResult, Outcome};
