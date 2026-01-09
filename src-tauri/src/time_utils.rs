use std::time::{SystemTime, UNIX_EPOCH};
use serde::Serialize;

#[derive(Serialize)]
pub struct TimeInfo {
    secs: String,
    millis: String,
    micros: String,
    nanos: String,
}

#[tauri::command]
pub fn get_system_time() -> TimeInfo {
    let now = SystemTime::now();
    let duration = now.duration_since(UNIX_EPOCH).expect("Time went backwards");
    
    let total_nanos = duration.as_nanos(); // u128
    let total_micros = duration.as_micros(); // u128
    let total_millis = duration.as_millis(); // u128
    let total_secs = duration.as_secs(); // u64

    TimeInfo {
        secs: total_secs.to_string(),
        millis: total_millis.to_string(),
        micros: total_micros.to_string(),
        nanos: total_nanos.to_string(),
    }
}
