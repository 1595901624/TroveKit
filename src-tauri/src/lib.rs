// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod basex;
mod log_manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(log_manager::LogState::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            basex::basex_encode,
            basex::basex_decode,
            log_manager::append_log,
            log_manager::load_logs,
            log_manager::clear_logs_file,
            log_manager::start_new_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
