use tauri::command;
use data_encoding::{Specification, Encoding};
use base_x;
use base91;
use base85;

fn get_custom_encoding(base_len: usize, alphabet: &str) -> Result<Encoding, String> {
    let mut spec = Specification::new();
    spec.symbols.push_str(alphabet);
    match base_len {
        64 => {
             spec.padding = Some('=');
        }
        32 => {
             spec.padding = Some('=');
        }
        _ => {}
    }
    spec.encoding().map_err(|e| e.to_string())
}

#[command]
pub fn basex_encode(input: String, base: String, alphabet: Option<String>) -> Result<String, String> {
    let input_bytes = input.as_bytes();
    
    // Check if custom alphabet is requested
    if let Some(alpha) = alphabet {
        if !alpha.is_empty() {
             return match base.as_str() {
                 "base16" | "base32" | "base64" => {
                     let expected_len = match base.as_str() {
                         "base16" => 16,
                         "base32" => 32,
                         "base64" => 64,
                         _ => 0
                     };
                     if alpha.chars().count() != expected_len {
                         return Err(format!("Custom alphabet for {} must be {} characters", base, expected_len));
                     }
                     let encoding = get_custom_encoding(expected_len, &alpha)?;
                     Ok(encoding.encode(input_bytes))
                 },
                 "base58" | "base62" => {
                     Ok(base_x::encode(alpha.as_str(), input_bytes))
                 },
                 "base85" | "base91" => {
                     Err(format!("Custom alphabet not supported for {}", base))
                 }
                 _ => Err("Unknown base".to_string())
             };
        }
    }

    // Default behaviors
    match base.as_str() {
        "base16" => Ok(data_encoding::HEXLOWER.encode(input_bytes)),
        "base32" => Ok(data_encoding::BASE32.encode(input_bytes)),
        "base58" => Ok(base_x::encode("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", input_bytes)), // Bitcoin
        "base62" => Ok(base_x::encode("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", input_bytes)),
        "base64" => Ok(data_encoding::BASE64.encode(input_bytes)),
        "base85" => Ok(base85::encode(input_bytes)),
        "base91" => {
            let encoded_bytes = base91::slice_encode(input_bytes); 
            String::from_utf8(encoded_bytes).map_err(|e| e.to_string())
        },
        _ => Err("Unknown base".to_string())
    }
}

#[command]
pub fn basex_decode(input: String, base: String, alphabet: Option<String>) -> Result<String, String> {
    // For decode, we first get the bytes
    let bytes = if let Some(alpha) = alphabet {
        if !alpha.is_empty() {
             match base.as_str() {
                 "base16" | "base32" | "base64" => {
                     let expected_len = match base.as_str() {
                         "base16" => 16,
                         "base32" => 32,
                         "base64" => 64,
                         _ => 0
                     };
                     if alpha.chars().count() != expected_len {
                         return Err(format!("Custom alphabet for {} must be {} characters", base, expected_len));
                     }
                     let encoding = get_custom_encoding(expected_len, &alpha)?;
                     // Remove newlines/spaces if necessary? data-encoding usually strict.
                     // We will strip whitespace for user convenience
                     let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                     encoding.decode(clean_input.as_bytes()).map_err(|e| e.to_string())?
                 },
                 "base58" | "base62" => {
                     let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                     base_x::decode(alpha.as_str(), &clean_input).map_err(|e| format!("Decode error: {:?}", e))?
                 },
                 "base85" | "base91" => {
                     return Err(format!("Custom alphabet not supported for {}", base));
                 }
                 _ => return Err("Unknown base".to_string())
             }
        } else {
             // Fallback to default if alpha is empty
             return basex_decode(input, base, None);
        }
    } else {
        // Default behaviors
        match base.as_str() {
            "base16" => {
                let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                data_encoding::HEXLOWER_PERMISSIVE.decode(clean_input.as_bytes()).map_err(|e| e.to_string())?
            },
            "base32" => {
                let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                data_encoding::BASE32.decode(clean_input.as_bytes()).map_err(|e| e.to_string())?
            },
            "base58" => {
                let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                base_x::decode("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", &clean_input).map_err(|_| "Decode error".to_string())?
            },
            "base62" => {
                let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                base_x::decode("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", &clean_input).map_err(|_| "Decode error".to_string())?
            },
            "base64" => {
                let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                data_encoding::BASE64.decode(clean_input.as_bytes()).map_err(|e| e.to_string())?
            },
            "base85" => {
                let clean_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
                base85::decode(&clean_input).map_err(|e| e.to_string())?
            },
            "base91" => {
                base91::slice_decode(input.as_bytes())
            },
            _ => return Err("Unknown base".to_string())
        }
    };

    String::from_utf8(bytes).map_err(|_| "Decoded data is not valid UTF-8 text".to_string())
}