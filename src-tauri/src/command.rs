use trivium::BitOrder;
use trivium::{PackOrder, Trivium};

#[tauri::command]
pub fn trivium_xor(
    key: Vec<u8>,
    iv: Vec<u8>,
    data: Vec<u8>,
    bit_order: Option<String>,
) -> Result<Vec<u8>, String> {
    let order = parse_bit_order(bit_order)?;
    // Match common "byte-oriented" usage in tools: keystream is typically presented LSB-first per byte.
    // Keep `bitOrder` to control ONLY how key/IV bits are read within each byte.
    let trivium = Trivium::new(&key, &iv, order, PackOrder::Lsb);
    Ok(trivium.xor_bytes(&data))
}

fn parse_bit_order(bit_order: Option<String>) -> Result<BitOrder, String> {
    match bit_order.as_deref().map(|s| s.trim().to_ascii_lowercase()) {
        None => Ok(BitOrder::Msb),
        Some(s) if s == "msb" || s == "msb-first" || s == "msb_first" => Ok(BitOrder::Msb),
        Some(s) if s == "lsb" || s == "lsb-first" || s == "lsb_first" => Ok(BitOrder::Lsb),
        Some(s) => Err(format!(
            "Unsupported bitOrder: {s} (expected 'msb' or 'lsb')"
        )),
    }
}
