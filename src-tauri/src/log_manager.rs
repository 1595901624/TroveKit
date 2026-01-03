use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime, State};
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: i64,
    pub message: Option<String>,
    pub method: Option<String>,
    pub input: Option<String>,
    pub output: Option<String>,
    pub details: Option<String>,
    pub note: Option<String>,
    #[serde(rename = "type")]
    pub log_type: String, // "info" | "success" | "error" | "warning"
    // 加密相关字段
    pub algorithm: Option<String>,
    pub mode: Option<String>,
    pub key_size: Option<String>,
    pub padding: Option<String>,
    pub format: Option<String>,
    pub iv: Option<String>,
    pub key_type: Option<String>,
}

pub struct LogState {
    pub current_file: Mutex<Option<PathBuf>>,
}

impl LogState {
    pub fn new() -> Self {
        Self {
            current_file: Mutex::new(None),
        }
    }
}

fn get_logs_dir<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("operation_log")
}

fn generate_new_log_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    let dir = get_logs_dir(app);
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
    dir.join(format!("log_{}.jsonl", timestamp))
}

fn get_current_log_path<R: Runtime>(app: &AppHandle<R>, state: &State<LogState>) -> PathBuf {
    let mut current_file = state.current_file.lock().unwrap();
    
    if let Some(path) = current_file.as_ref() {
        if path.exists() {
            return path.clone();
        }
    }

    // If no file set or file doesn't exist, create a new one
    let new_path = generate_new_log_path(app);
    *current_file = Some(new_path.clone());
    new_path
}

#[tauri::command]
pub fn start_new_log<R: Runtime>(app: AppHandle<R>, state: State<LogState>) -> Result<(), String> {
    let new_path = generate_new_log_path(&app);
    let mut current_file = state.current_file.lock().map_err(|e| e.to_string())?;
    *current_file = Some(new_path);
    Ok(())
}

#[tauri::command]
pub fn append_log<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
    entry: LogEntry,
) -> Result<(), String> {
    let file_path = get_current_log_path(&app, &state);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
        .map_err(|e| e.to_string())?;

    let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    writeln!(file, "{}", json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn load_logs<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
) -> Result<Vec<LogEntry>, String> {
    let file_path = get_current_log_path(&app, &state);
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let file = fs::File::open(file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut logs = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if let Ok(entry) = serde_json::from_str::<LogEntry>(&line) {
            logs.push(entry);
        }
    }

    // Sort by timestamp desc (newest first)
    logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(logs)
}

#[tauri::command]
pub fn clear_logs_file<R: Runtime>(app: AppHandle<R>, state: State<LogState>) -> Result<(), String> {
    let file_path = get_current_log_path(&app, &state);
    if file_path.exists() {
        // Instead of deleting, we truncate it since it's the current session file
        fs::File::create(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn update_log_note<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
    log_id: String,
    note: String,
) -> Result<(), String> {
    let file_path = get_current_log_path(&app, &state);
    
    if !file_path.exists() {
        return Ok(());
    }

    // Read all logs
    let file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut logs = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if let Ok(mut entry) = serde_json::from_str::<LogEntry>(&line) {
            if entry.id == log_id {
                entry.note = Some(note.clone());
            }
            logs.push(entry);
        }
    }

    // Rewrite the file with updated logs
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(file_path)
        .map_err(|e| e.to_string())?;

    for entry in logs {
        let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
        writeln!(file, "{}", json).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn remove_log_note<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
    log_id: String,
) -> Result<(), String> {
    let file_path = get_current_log_path(&app, &state);
    
    if !file_path.exists() {
        return Ok(());
    }

    // Read all logs
    let file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut logs = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if let Ok(mut entry) = serde_json::from_str::<LogEntry>(&line) {
            if entry.id == log_id {
                entry.note = None;
            }
            logs.push(entry);
        }
    }

    // Rewrite the file with updated logs
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(file_path)
        .map_err(|e| e.to_string())?;

    for entry in logs {
        let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
        writeln!(file, "{}", json).map_err(|e| e.to_string())?;
    }

    Ok(())
}
