use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
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
    /// 可扩展加密参数对象（JSON），所有加密相关字段统一放在此处。
    /// 前端字段名使用 camelCase：cryptoParams
    ///
    /// 支持的 key：
    /// - algorithm: 加密算法 (如 "AES", "DES", "3DES", "SM4", "RSA", "SM2" 等)
    /// - mode: 加密模式 (如 "CBC", "ECB", "CFB", "OFB", "CTR", "GCM" 等)
    /// - key_size: 密钥长度 (如 "128", "192", "256", "512", "1024", "2048", "4096" 等)
    /// - padding: 填充方式 (如 "PKCS7", "PKCS5", "ZeroPadding", "NoPadding", "ISO10126", "ANSIX923" 等)
    /// - format: 输出格式 (如 "hex", "base64", "utf8" 等)
    /// - iv: 初始向量 (Base64 或 Hex 编码的字符串)
    /// - key: 加密密钥 (字符串)
    /// - key_type: 密钥类型 (如 "public", "private", "symmetric" 等)
    /// - hash: 哈希算法 (如 "MD5", "SHA1", "SHA256", "SHA512", "SM3" 等)
    /// - encoding: 编码方式 (如 "utf8", "gbk", "base64", "hex" 等)
    /// - salt: 盐值
    /// - iterations: 迭代次数 (用于 PBKDF2 等)
    /// - tag_length: 认证标签长度 (用于 GCM 模式)
    #[serde(rename = "cryptoParams", default)]
    pub crypto_params: Option<Value>,
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
    /// 会话备注
    pub note: Option<String>,
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

        CREATE TABLE IF NOT EXISTS session_notes (
            session_id TEXT PRIMARY KEY,
            note TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_logs_session_ts ON logs(session_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
        CREATE INDEX IF NOT EXISTS idx_logs_method ON logs(method);
        "#,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
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

    let crypto_str = entry
        .crypto_params
        .as_ref()
        .map(|v| serde_json::to_string(v))
        .transpose()
        .map_err(|e| e.to_string())?;

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
            let crypto_params = crypto_str
                .and_then(|s| serde_json::from_str::<Value>(&s).ok());
            Ok(LogEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                message: row.get(2)?,
                method: row.get(3)?,
                input: row.get(4)?,
                output: row.get(5)?,
                details: row.get(6)?,
                note: row.get(7)?,
                log_type: row.get(8)?,
                crypto_params,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for r in rows {
        logs.push(r.map_err(|e| e.to_string())?);
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
            SELECT l.session_id, MAX(l.timestamp) AS latest_ts, COUNT(*) AS cnt, sn.note
            FROM logs l
            LEFT JOIN session_notes sn ON l.session_id = sn.session_id
            GROUP BY l.session_id
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
                note: row.get(3)?,
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
            let crypto_params = crypto_str
                .and_then(|s| serde_json::from_str::<Value>(&s).ok());
            Ok(LogEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                message: row.get(2)?,
                method: row.get(3)?,
                input: row.get(4)?,
                output: row.get(5)?,
                details: row.get(6)?,
                note: row.get(7)?,
                log_type: row.get(8)?,
                crypto_params,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for r in rows {
        logs.push(r.map_err(|e| e.to_string())?);
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

/// 管理端：更新会话备注
#[tauri::command(rename_all = "camelCase")]
pub fn update_session_note<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
    note: String,
) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    conn.execute(
        "INSERT OR REPLACE INTO session_notes (session_id, note) VALUES (?1, ?2)",
        params![session_id, note],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// 管理端：删除会话备注
#[tauri::command(rename_all = "camelCase")]
pub fn remove_session_note<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    conn.execute(
        "DELETE FROM session_notes WHERE session_id = ?1",
        params![session_id],
    )
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
