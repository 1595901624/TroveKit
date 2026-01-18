// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

mod basex;
mod log_manager;
mod time_utils;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(log_manager::LogState::new())
        .setup(|app| {
            let state = app.state::<log_manager::LogState>();
            if let Err(e) = log_manager::init_log_state(app.handle(), &state) {
                eprintln!("Failed to init log state: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            basex::basex_encode,
            basex::basex_decode,
            log_manager::append_log,
            log_manager::load_logs,
            log_manager::clear_logs_file,
            log_manager::start_new_log,
            log_manager::get_current_session_info,
            log_manager::update_log_note,
            log_manager::remove_log_note,
            log_manager::list_log_sessions,
            log_manager::get_logs_by_session,
            log_manager::delete_log,
            log_manager::delete_log_session,
            log_manager::update_log_fields,
            log_manager::update_session_note,
            log_manager::remove_session_note,
            log_manager::switch_to_session,
            time_utils::get_system_time
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
