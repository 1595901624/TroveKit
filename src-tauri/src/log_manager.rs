use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime, State};
use uuid::Uuid;

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
    /// 可扩展的加密参数：JSON 对象（例如 {"algorithm":"AES","mode":"CBC",...} ）
    /// 前端字段名使用 camelCase：cryptoParams
    #[serde(rename = "cryptoParams", default)]
    pub crypto_params: Option<Value>,

    // 兼容旧前端字段：仍可由 cryptoParams 派生填充（便于现有 LogPanel 展示）
    #[serde(default)]
    pub algorithm: Option<String>,
    #[serde(default)]
    pub mode: Option<String>,
    #[serde(default)]
    pub key_size: Option<String>,
    #[serde(default)]
    pub padding: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub iv: Option<String>,
    #[serde(default)]
    pub key_type: Option<String>,
}

pub struct LogState {
    pub current_session_id: Mutex<String>,
}

impl LogState {
    pub fn new() -> Self {
        Self {
            current_session_id: Mutex::new(Uuid::new_v4().to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogSessionSummary {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "latestTimestamp")]
    pub latest_timestamp: i64,
    pub count: i64,
}

fn get_db_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("operation_log");

    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("logs.db"))
}

fn open_conn<R: Runtime>(app: &AppHandle<R>) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(db_path).map_err(|e| e.to_string())
}

fn init_db(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            type TEXT NOT NULL,
            message TEXT,
            method TEXT,
            input TEXT,
            output TEXT,
            details TEXT,
            note TEXT,
            crypto_params TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_logs_session_ts ON logs(session_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
        CREATE INDEX IF NOT EXISTS idx_logs_method ON logs(method);
        "#,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn merge_crypto_params(entry: &LogEntry) -> Value {
    let mut v = entry.crypto_params.clone().unwrap_or_else(|| json!({}));

    if !v.is_object() {
        v = json!({});
    }

    // 将旧字段合并进 JSON（不覆盖已有 key）
    let obj = v.as_object_mut().expect("crypto_params should be object");

    let set_if_missing = |obj: &mut serde_json::Map<String, Value>, key: &str, val: &Option<String>| {
        if obj.get(key).is_none() {
            if let Some(s) = val {
                obj.insert(key.to_string(), Value::String(s.clone()));
            }
        }
    };

    set_if_missing(obj, "algorithm", &entry.algorithm);
    set_if_missing(obj, "mode", &entry.mode);
    set_if_missing(obj, "key_size", &entry.key_size);
    set_if_missing(obj, "padding", &entry.padding);
    set_if_missing(obj, "format", &entry.format);
    set_if_missing(obj, "iv", &entry.iv);
    set_if_missing(obj, "key_type", &entry.key_type);

    Value::Object(obj.clone())
}

fn fill_legacy_crypto_fields(entry: &mut LogEntry, crypto: &Value) {
    let Some(obj) = crypto.as_object() else { return };

    let get_str = |k: &str| -> Option<String> {
        obj.get(k)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    };

    if entry.algorithm.is_none() {
        entry.algorithm = get_str("algorithm");
    }
    if entry.mode.is_none() {
        entry.mode = get_str("mode");
    }
    if entry.key_size.is_none() {
        entry.key_size = get_str("key_size");
    }
    if entry.padding.is_none() {
        entry.padding = get_str("padding");
    }
    if entry.format.is_none() {
        entry.format = get_str("format");
    }
    if entry.iv.is_none() {
        entry.iv = get_str("iv");
    }
    if entry.key_type.is_none() {
        entry.key_type = get_str("key_type");
    }
}

#[tauri::command]
pub fn start_new_log<R: Runtime>(app: AppHandle<R>, state: State<LogState>) -> Result<(), String> {
    // 保持与旧语义一致：新建日志 = 新会话
    let _ = open_conn(&app).and_then(|conn| init_db(&conn));
    let mut sid = state
        .current_session_id
        .lock()
        .map_err(|e| e.to_string())?;
    *sid = Uuid::new_v4().to_string();
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn append_log<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
    entry: LogEntry,
) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    let session_id = state
        .current_session_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let crypto = merge_crypto_params(&entry);
    let crypto_str = serde_json::to_string(&crypto).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT OR REPLACE INTO logs (
            id, session_id, timestamp, type, message, method, input, output, details, note, crypto_params
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        "#,
        params![
            entry.id,
            session_id,
            entry.timestamp,
            entry.log_type,
            entry.message,
            entry.method,
            entry.input,
            entry.output,
            entry.details,
            entry.note,
            crypto_str
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn load_logs<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
) -> Result<Vec<LogEntry>, String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    let session_id = state
        .current_session_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, timestamp, message, method, input, output, details, note, type, crypto_params
            FROM logs
            WHERE session_id = ?1
            ORDER BY timestamp DESC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![session_id], |row| {
            let crypto_str: Option<String> = row.get(9)?;
            Ok((
                LogEntry {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    message: row.get(2)?,
                    method: row.get(3)?,
                    input: row.get(4)?,
                    output: row.get(5)?,
                    details: row.get(6)?,
                    note: row.get(7)?,
                    log_type: row.get(8)?,
                    crypto_params: None,
                    algorithm: None,
                    mode: None,
                    key_size: None,
                    padding: None,
                    format: None,
                    iv: None,
                    key_type: None,
                },
                crypto_str,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for r in rows {
        let (mut entry, crypto_str) = r.map_err(|e| e.to_string())?;
        if let Some(s) = crypto_str {
            if let Ok(v) = serde_json::from_str::<Value>(&s) {
                fill_legacy_crypto_fields(&mut entry, &v);
                entry.crypto_params = Some(v);
            }
        }
        logs.push(entry);
    }

    Ok(logs)
}

#[tauri::command]
pub fn clear_logs_file<R: Runtime>(app: AppHandle<R>, state: State<LogState>) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    let session_id = state
        .current_session_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    conn.execute("DELETE FROM logs WHERE session_id = ?1", params![session_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn update_log_note<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
    log_id: String,
    note: String,
) -> Result<(), String> {
    let _ = state; // 保持签名不变，避免前端改动；未来可用于权限/会话校验
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    conn.execute(
        "UPDATE logs SET note = ?1 WHERE id = ?2",
        params![note, log_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn remove_log_note<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
    log_id: String,
) -> Result<(), String> {
    let _ = state;
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    conn.execute(
        "UPDATE logs SET note = NULL WHERE id = ?1",
        params![log_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// 管理端：列出所有会话（按最新时间倒序）
#[tauri::command(rename_all = "camelCase")]
pub fn list_log_sessions<R: Runtime>(app: AppHandle<R>) -> Result<Vec<LogSessionSummary>, String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT session_id, MAX(timestamp) AS latest_ts, COUNT(*) AS cnt
            FROM logs
            GROUP BY session_id
            ORDER BY latest_ts DESC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(LogSessionSummary {
                session_id: row.get(0)?,
                latest_timestamp: row.get(1)?,
                count: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

/// 管理端：按 session 查询日志
#[tauri::command(rename_all = "camelCase")]
pub fn get_logs_by_session<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
) -> Result<Vec<LogEntry>, String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, timestamp, message, method, input, output, details, note, type, crypto_params
            FROM logs
            WHERE session_id = ?1
            ORDER BY timestamp DESC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![session_id], |row| {
            let crypto_str: Option<String> = row.get(9)?;
            Ok((
                LogEntry {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    message: row.get(2)?,
                    method: row.get(3)?,
                    input: row.get(4)?,
                    output: row.get(5)?,
                    details: row.get(6)?,
                    note: row.get(7)?,
                    log_type: row.get(8)?,
                    crypto_params: None,
                    algorithm: None,
                    mode: None,
                    key_size: None,
                    padding: None,
                    format: None,
                    iv: None,
                    key_type: None,
                },
                crypto_str,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for r in rows {
        let (mut entry, crypto_str) = r.map_err(|e| e.to_string())?;
        if let Some(s) = crypto_str {
            if let Ok(v) = serde_json::from_str::<Value>(&s) {
                fill_legacy_crypto_fields(&mut entry, &v);
                entry.crypto_params = Some(v);
            }
        }
        logs.push(entry);
    }
    Ok(logs)
}

/// 管理端：删除单条日志
#[tauri::command(rename_all = "camelCase")]
pub fn delete_log<R: Runtime>(app: AppHandle<R>, id: String) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    conn.execute("DELETE FROM logs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 管理端：删除整个会话
#[tauri::command(rename_all = "camelCase")]
pub fn delete_log_session<R: Runtime>(app: AppHandle<R>, session_id: String) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    conn.execute("DELETE FROM logs WHERE session_id = ?1", params![session_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 管理端：更新日志字段（只更新传入的字段）
#[tauri::command(rename_all = "camelCase")]
pub fn update_log_fields<R: Runtime>(
    app: AppHandle<R>,
    id: String,
    message: Option<String>,
    details: Option<String>,
    note: Option<String>,
) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    if let Some(v) = message {
        conn.execute("UPDATE logs SET message = ?1 WHERE id = ?2", params![v, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = details {
        conn.execute("UPDATE logs SET details = ?1 WHERE id = ?2", params![v, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = note {
        conn.execute("UPDATE logs SET note = ?1 WHERE id = ?2", params![v, &id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
