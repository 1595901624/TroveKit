use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime, State};
use uuid::Uuid;

const MAX_CURRENT_LOGS: i64 = 100;
const MAX_SESSION_LOGS: i64 = 500;
const DEFAULT_LOG_PAGE_SIZE: i64 = 40;
const MAX_LOG_PAGE_SIZE: i64 = 100;
const MAX_LOG_PREVIEW_CHARS: usize = 320;
const MAX_LOG_TEXT_CHARS: usize = 4000;
const MAX_LOG_PARAM_CHARS: usize = 1000;
const TRUNCATED_SUFFIX: &str = "\n...[truncated]";

// 后端是日志持久化入口，在入库和读库时都做截断，防止历史大日志拖慢恢复现场。
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

// Rust 侧按 Unicode 字符截断，避免中文或 emoji 被截成非法边界。
fn truncate_text(value: Option<String>, limit: usize) -> Option<String> {
    value.map(|text| {
        if text.chars().count() <= limit {
            text
        } else {
            let mut truncated: String = text.chars().take(limit).collect();
            truncated.push_str(TRUNCATED_SUFFIX);
            truncated
        }
    })
}

// crypto_params 是 JSON 结构，递归处理所有字符串字段，避免嵌套大字段占用 SQLite 和前端内存。
fn truncate_json_strings(value: Value, limit: usize) -> Value {
    match value {
        Value::String(text) => {
            if text.chars().count() <= limit {
                Value::String(text)
            } else {
                let mut truncated: String = text.chars().take(limit).collect();
                truncated.push_str(TRUNCATED_SUFFIX);
                Value::String(truncated)
            }
        }
        Value::Array(items) => Value::Array(
            items
                .into_iter()
                .map(|item| truncate_json_strings(item, limit))
                .collect(),
        ),
        Value::Object(map) => Value::Object(
            map.into_iter()
                .map(|(key, item)| (key, truncate_json_strings(item, limit)))
                .collect(),
        ),
        other => other,
    }
}

// 统一清洗单条日志，保证新增、加载历史会话时使用同一套内存上限。
fn sanitize_log_entry(mut entry: LogEntry) -> LogEntry {
    entry.message = truncate_text(entry.message, MAX_LOG_TEXT_CHARS);
    entry.input = truncate_text(entry.input, MAX_LOG_TEXT_CHARS);
    entry.output = truncate_text(entry.output, MAX_LOG_TEXT_CHARS);
    entry.details = truncate_text(entry.details, MAX_LOG_TEXT_CHARS);
    entry.note = truncate_text(entry.note, 500);
    entry.crypto_params = entry
        .crypto_params
        .map(|value| truncate_json_strings(value, MAX_LOG_PARAM_CHARS));
    entry
}

fn redact_preview_secrets(value: Value) -> Value {
    match value {
        Value::Object(map) => Value::Object(
            map.into_iter()
                .map(|(key, item)| {
                    let normalized_key = key.to_ascii_lowercase().replace(['_', '-'], "");
                    let value = match normalized_key.as_str() {
                        "key" | "privatekey" | "secret" | "password" => {
                            Value::String("••••••••".into())
                        }
                        _ => redact_preview_secrets(item),
                    };
                    (key, value)
                })
                .collect(),
        ),
        Value::Array(items) => {
            Value::Array(items.into_iter().map(redact_preview_secrets).collect())
        }
        other => other,
    }
}

// 管理页列表只需要可识别的摘要。完整字段按日志 ID 单独读取，避免一次把
// 数百条长 input/output/details 同时复制到 WebView 和 React state。
fn preview_log_entry(mut entry: LogEntry) -> LogEntry {
    entry.message = truncate_text(entry.message, MAX_LOG_PREVIEW_CHARS);
    entry.input = truncate_text(entry.input, MAX_LOG_PREVIEW_CHARS);
    entry.output = truncate_text(entry.output, MAX_LOG_PREVIEW_CHARS);
    entry.details = truncate_text(entry.details, MAX_LOG_PREVIEW_CHARS);
    entry.crypto_params = entry
        .crypto_params
        .map(redact_preview_secrets)
        .map(|value| truncate_json_strings(value, MAX_LOG_PREVIEW_CHARS));
    entry
}

fn escape_like_query(query: &str) -> String {
    query
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

impl LogState {
    pub fn new() -> Self {
        Self {
            current_session_id: Mutex::new(String::new()),
        }
    }
}

pub fn init_log_state<R: Runtime>(app: &AppHandle<R>, state: &LogState) -> Result<(), String> {
    let conn = open_conn(app)?;
    init_db(&conn)?;

    let latest_session: Option<String> = conn
        .query_row(
            "SELECT session_id FROM logs ORDER BY timestamp DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    let session_id = latest_session.unwrap_or_else(|| Uuid::new_v4().to_string());

    let mut sid = state.current_session_id.lock().map_err(|e| e.to_string())?;
    *sid = session_id;

    Ok(())
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogCursor {
    pub timestamp: i64,
    pub id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogPage {
    pub logs: Vec<LogEntry>,
    pub next_cursor: Option<LogCursor>,
    pub total: i64,
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
        CREATE INDEX IF NOT EXISTS idx_logs_session_cursor ON logs(session_id, timestamp DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
        CREATE INDEX IF NOT EXISTS idx_logs_method ON logs(method);
        "#,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CurrentSessionInfo {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub note: Option<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn get_current_session_info<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
) -> Result<CurrentSessionInfo, String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    let session_id = state
        .current_session_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let note: Option<String> = conn
        .query_row(
            "SELECT note FROM session_notes WHERE session_id = ?1",
            params![&session_id],
            |row| row.get(0),
        )
        .ok();

    Ok(CurrentSessionInfo { session_id, note })
}

#[tauri::command]
pub fn start_new_log<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
) -> Result<String, String> {
    // 保持与旧语义一致：新建日志 = 新会话
    let _ = open_conn(&app).and_then(|conn| init_db(&conn));
    let mut sid = state.current_session_id.lock().map_err(|e| e.to_string())?;
    let new_sid = Uuid::new_v4().to_string();
    *sid = new_sid.clone();
    Ok(new_sid)
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

    // 日志来自用户输入/转换结果，可能很大；入库前截断，避免 SQLite 和前端恢复时内存持续膨胀。
    let entry = sanitize_log_entry(entry);

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
            LIMIT ?2
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![session_id, MAX_CURRENT_LOGS], |row| {
            let crypto_str: Option<String> = row.get(9)?;
            let crypto_params = crypto_str.and_then(|s| serde_json::from_str::<Value>(&s).ok());
            Ok(sanitize_log_entry(LogEntry {
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
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for r in rows {
        logs.push(r.map_err(|e| e.to_string())?);
    }

    Ok(logs)
}

#[tauri::command]
pub fn clear_logs_file<R: Runtime>(
    app: AppHandle<R>,
    state: State<LogState>,
) -> Result<(), String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;
    let session_id = state
        .current_session_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    conn.execute(
        "DELETE FROM logs WHERE session_id = ?1",
        params![session_id],
    )
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
    conn.execute("UPDATE logs SET note = NULL WHERE id = ?1", params![log_id])
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
            LIMIT ?2
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![session_id, MAX_SESSION_LOGS], |row| {
            let crypto_str: Option<String> = row.get(9)?;
            let crypto_params = crypto_str.and_then(|s| serde_json::from_str::<Value>(&s).ok());
            Ok(sanitize_log_entry(LogEntry {
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
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for r in rows {
        logs.push(r.map_err(|e| e.to_string())?);
    }
    Ok(logs)
}

/// 管理端：游标分页读取日志摘要，并在 SQLite 中完成搜索。
///
/// 游标由 `(timestamp, id)` 组成，保证相同时间戳下仍能稳定翻页；前端任一时刻
/// 只保留一页摘要，展开单条日志时再调用 `get_log_detail`。
#[tauri::command(rename_all = "camelCase")]
pub fn get_logs_page<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
    cursor: Option<LogCursor>,
    query: Option<String>,
    limit: Option<i64>,
) -> Result<LogPage, String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    query_logs_page(&conn, session_id, cursor, query, limit)
}

fn query_logs_page(
    conn: &Connection,
    session_id: String,
    cursor: Option<LogCursor>,
    query: Option<String>,
    limit: Option<i64>,
) -> Result<LogPage, String> {
    let page_size = limit
        .unwrap_or(DEFAULT_LOG_PAGE_SIZE)
        .clamp(1, MAX_LOG_PAGE_SIZE);
    let cursor_timestamp = cursor.as_ref().map(|value| value.timestamp);
    let cursor_id = cursor.as_ref().map(|value| value.id.as_str());
    let normalized_query = query.unwrap_or_default().trim().to_lowercase();
    let like_query = if normalized_query.is_empty() {
        String::new()
    } else {
        format!("%{}%", escape_like_query(&normalized_query))
    };

    let search_clause = r#"
        (?4 = '' OR LOWER(
            COALESCE(message, '') || char(10) ||
            COALESCE(method, '') || char(10) ||
            COALESCE(input, '') || char(10) ||
            COALESCE(output, '') || char(10) ||
            COALESCE(details, '') || char(10) ||
            COALESCE(note, '') || char(10) ||
            COALESCE(type, '')
        ) LIKE ?5 ESCAPE '\')
    "#;

    let sql = format!(
        r#"
        SELECT id, timestamp, message, method, input, output, details, note, type, crypto_params
        FROM logs
        WHERE session_id = ?1
          AND (?2 IS NULL OR timestamp < ?2 OR (timestamp = ?2 AND id < ?3))
          AND {search_clause}
        ORDER BY timestamp DESC, id DESC
        LIMIT ?6
        "#
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(
            params![
                &session_id,
                cursor_timestamp,
                cursor_id,
                &normalized_query,
                &like_query,
                page_size + 1
            ],
            |row| {
                let crypto_str: Option<String> = row.get(9)?;
                let crypto_params =
                    crypto_str.and_then(|value| serde_json::from_str::<Value>(&value).ok());
                Ok(preview_log_entry(sanitize_log_entry(LogEntry {
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
                })))
            },
        )
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::with_capacity((page_size + 1) as usize);
    for row in rows {
        logs.push(row.map_err(|e| e.to_string())?);
    }
    let has_more = logs.len() > page_size as usize;
    if has_more {
        logs.pop();
    }
    let next_cursor = if has_more {
        logs.last().map(|log| LogCursor {
            timestamp: log.timestamp,
            id: log.id.clone(),
        })
    } else {
        None
    };

    let count_sql = format!(
        r#"
        SELECT COUNT(*)
        FROM logs
        WHERE session_id = ?1 AND {search_clause}
        "#
    );
    let total = conn
        .query_row(
            &count_sql,
            params![
                &session_id,
                Option::<i64>::None,
                Option::<String>::None,
                &normalized_query,
                &like_query
            ],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(LogPage {
        logs,
        next_cursor,
        total,
    })
}

/// 管理端：仅在用户展开某条日志时读取完整（但仍受全局安全上限约束）的内容。
#[tauri::command(rename_all = "camelCase")]
pub fn get_log_detail<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
    id: String,
) -> Result<LogEntry, String> {
    let conn = open_conn(&app)?;
    init_db(&conn)?;

    conn.query_row(
        r#"
        SELECT id, timestamp, message, method, input, output, details, note, type, crypto_params
        FROM logs
        WHERE session_id = ?1 AND id = ?2
        LIMIT 1
        "#,
        params![session_id, id],
        |row| {
            let crypto_str: Option<String> = row.get(9)?;
            let crypto_params =
                crypto_str.and_then(|value| serde_json::from_str::<Value>(&value).ok());
            Ok(sanitize_log_entry(LogEntry {
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
            }))
        },
    )
    .map_err(|e| e.to_string())
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
    conn.execute(
        "DELETE FROM logs WHERE session_id = ?1",
        params![session_id],
    )
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

/// 切换当前会话（用于 LogPanel 切换到历史会话）
#[tauri::command(rename_all = "camelCase")]
pub fn switch_to_session<R: Runtime>(
    _app: AppHandle<R>,
    state: State<LogState>,
    session_id: String,
) -> Result<(), String> {
    let mut sid = state.current_session_id.lock().map_err(|e| e.to_string())?;
    *sid = session_id;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn long_log() -> LogEntry {
        LogEntry {
            id: "log-1".into(),
            timestamp: 1,
            message: Some("m".repeat(1_000)),
            method: Some("AES".into()),
            input: Some("i".repeat(1_000)),
            output: Some("o".repeat(1_000)),
            details: Some("d".repeat(1_000)),
            note: Some("note".into()),
            log_type: "success".into(),
            crypto_params: Some(serde_json::json!({ "key": "k".repeat(1_000) })),
        }
    }

    #[test]
    fn preview_bounds_every_large_text_field() {
        let preview = preview_log_entry(long_log());
        let maximum_with_suffix = MAX_LOG_PREVIEW_CHARS + TRUNCATED_SUFFIX.len();

        assert!(preview.message.unwrap().len() <= maximum_with_suffix);
        assert!(preview.input.unwrap().len() <= maximum_with_suffix);
        assert!(preview.output.unwrap().len() <= maximum_with_suffix);
        assert!(preview.details.unwrap().len() <= maximum_with_suffix);
        assert_eq!(preview.crypto_params.unwrap()["key"], "••••••••");
    }

    #[test]
    fn like_search_escapes_user_wildcards() {
        assert_eq!(escape_like_query(r"100%_done\ok"), r"100\%\_done\\ok");
    }

    #[test]
    fn cursor_page_is_stable_and_search_is_literal() {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        for (id, timestamp, message) in [
            ("b", 200_i64, "newest"),
            ("a", 200_i64, "100% complete"),
            ("c", 100_i64, "older"),
        ] {
            conn.execute(
                "INSERT INTO logs (id, session_id, timestamp, type, message) VALUES (?1, 's1', ?2, 'info', ?3)",
                params![id, timestamp, message],
            )
            .unwrap();
        }

        let first = query_logs_page(&conn, "s1".into(), None, None, Some(2)).unwrap();
        assert_eq!(first.logs.iter().map(|log| log.id.as_str()).collect::<Vec<_>>(), ["b", "a"]);
        assert_eq!(first.total, 3);

        let second = query_logs_page(
            &conn,
            "s1".into(),
            first.next_cursor,
            None,
            Some(2),
        )
        .unwrap();
        assert_eq!(second.logs.iter().map(|log| log.id.as_str()).collect::<Vec<_>>(), ["c"]);

        let search = query_logs_page(&conn, "s1".into(), None, Some("100%".into()), Some(10)).unwrap();
        assert_eq!(search.total, 1);
        assert_eq!(search.logs[0].id, "a");
    }
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
        conn.execute(
            "UPDATE logs SET message = ?1 WHERE id = ?2",
            params![v, &id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(v) = details {
        conn.execute(
            "UPDATE logs SET details = ?1 WHERE id = ?2",
            params![v, &id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(v) = note {
        conn.execute("UPDATE logs SET note = ?1 WHERE id = ?2", params![v, &id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
