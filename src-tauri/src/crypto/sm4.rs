use cfb_mode::cipher::AsyncStreamCipher;
use cipher::{
	block_padding::NoPadding, BlockDecryptMut, BlockEncryptMut, KeyInit, KeyIvInit, StreamCipher,
};
use data_encoding::{BASE64, HEXLOWER, HEXLOWER_PERMISSIVE};
use serde::Deserialize;
use sm4::Sm4;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sm4Mode {
	Ecb,
	Cbc,
	Cfb,
	Ofb,
	Ctr,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sm4Padding {
	Pkcs7,
	Zero,
	None,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sm4Format {
	Hex,
	Base64,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sm4KeyType {
	Text,
	Hex,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sm4Request {
	pub input: String,
	pub mode: Sm4Mode,
	pub padding: Sm4Padding,
	/// Encrypt: output format; Decrypt: input format.
	pub format: Sm4Format,
	pub key: String,
	pub key_type: Sm4KeyType,
	pub iv: Option<String>,
	pub iv_type: Option<Sm4KeyType>,
}

fn clean_whitespace(s: &str) -> String {
	s.chars().filter(|c| !c.is_whitespace()).collect()
}

fn decode_hex_to_bytes(input: &str) -> Result<Vec<u8>, String> {
	let clean = clean_whitespace(input).to_ascii_lowercase();
	HEXLOWER_PERMISSIVE
		.decode(clean.as_bytes())
		.map_err(|e| format!("Invalid hex: {e}"))
}

fn decode_base64_to_bytes(input: &str) -> Result<Vec<u8>, String> {
	let clean = clean_whitespace(input);
	BASE64
		.decode(clean.as_bytes())
		.map_err(|e| format!("Invalid base64: {e}"))
}

fn encode_bytes(bytes: &[u8], format: Sm4Format) -> String {
	match format {
		Sm4Format::Hex => HEXLOWER.encode(bytes),
		Sm4Format::Base64 => BASE64.encode(bytes),
	}
}

fn parse_fixed_16(value: &str, ty: Sm4KeyType, name: &str) -> Result<[u8; 16], String> {
	match ty {
		Sm4KeyType::Hex => {
			let bytes = decode_hex_to_bytes(value)?;
			if bytes.len() != 16 {
				return Err(format!(
					"{name} must be 16 bytes (32 hex chars), got {} bytes",
					bytes.len()
				));
			}
			let mut out = [0u8; 16];
			out.copy_from_slice(&bytes);
			Ok(out)
		}
		Sm4KeyType::Text => {
			let bytes = value.as_bytes();
			if bytes.len() != 16 {
				return Err(format!(
					"{name} must be exactly 16 bytes in UTF-8, got {} bytes",
					bytes.len()
				));
			}
			let mut out = [0u8; 16];
			out.copy_from_slice(bytes);
			Ok(out)
		}
	}
}

fn require_iv(mode: Sm4Mode) -> bool {
	!matches!(mode, Sm4Mode::Ecb)
}

fn apply_padding(mut data: Vec<u8>, padding: Sm4Padding) -> Result<Vec<u8>, String> {
	const BLOCK: usize = 16;
	match padding {
		Sm4Padding::None => {
			if data.len() % BLOCK != 0 {
				return Err(
					"Data length must be a multiple of 16 bytes when padding is none".to_string(),
				);
			}
			Ok(data)
		}
		Sm4Padding::Zero => {
			let rem = data.len() % BLOCK;
			if rem != 0 {
				data.extend(std::iter::repeat(0u8).take(BLOCK - rem));
			}
			Ok(data)
		}
		Sm4Padding::Pkcs7 => {
			let pad = BLOCK - (data.len() % BLOCK);
			data.extend(std::iter::repeat(pad as u8).take(pad));
			Ok(data)
		}
	}
}

fn remove_padding(mut data: Vec<u8>, padding: Sm4Padding) -> Result<Vec<u8>, String> {
	const BLOCK: usize = 16;
	match padding {
		Sm4Padding::None => Ok(data),
		Sm4Padding::Zero => {
			while matches!(data.last(), Some(0u8)) {
				data.pop();
			}
			Ok(data)
		}
		Sm4Padding::Pkcs7 => {
			if data.is_empty() || data.len() % BLOCK != 0 {
				return Err("Invalid plaintext length for PKCS7 unpadding".to_string());
			}
			let pad = *data.last().unwrap() as usize;
			if pad == 0 || pad > BLOCK || pad > data.len() {
				return Err("Invalid PKCS7 padding".to_string());
			}
			if !data[data.len() - pad..]
				.iter()
				.all(|&b| b as usize == pad)
			{
				return Err("Invalid PKCS7 padding".to_string());
			}
			data.truncate(data.len() - pad);
			Ok(data)
		}
	}
}

fn decode_cipher_input(input: &str, format: Sm4Format) -> Result<Vec<u8>, String> {
	match format {
		Sm4Format::Hex => decode_hex_to_bytes(input),
		Sm4Format::Base64 => decode_base64_to_bytes(input),
	}
}

fn sm4_encrypt_bytes(
	plaintext: &[u8],
	key: [u8; 16],
	iv: Option<[u8; 16]>,
	mode: Sm4Mode,
	padding: Sm4Padding,
) -> Result<Vec<u8>, String> {
	let padded = apply_padding(plaintext.to_vec(), padding)?;

	match mode {
		Sm4Mode::Ecb => {
			let cipher = ecb::Encryptor::<Sm4>::new(&key.into());
			let mut buf = padded;
			let msg_len = buf.len();
			let out = cipher
				.encrypt_padded_mut::<NoPadding>(&mut buf, msg_len)
				.map_err(|e| format!("Encrypt failed: {e}"))?;
			Ok(out.to_vec())
		}
		Sm4Mode::Cbc => {
			let iv = iv.ok_or_else(|| "IV is required for CBC mode".to_string())?;
			let cipher = cbc::Encryptor::<Sm4>::new(&key.into(), &iv.into());
			let mut buf = padded;
			let msg_len = buf.len();
			let out = cipher
				.encrypt_padded_mut::<NoPadding>(&mut buf, msg_len)
				.map_err(|e| format!("Encrypt failed: {e}"))?;
			Ok(out.to_vec())
		}
		Sm4Mode::Cfb => {
			let iv = iv.ok_or_else(|| "IV is required for CFB mode".to_string())?;
			let mut buf = padded;
			let cipher = cfb_mode::Encryptor::<Sm4>::new(&key.into(), &iv.into());
			cipher.encrypt(&mut buf);
			Ok(buf)
		}
		Sm4Mode::Ofb => {
			let iv = iv.ok_or_else(|| "IV is required for OFB mode".to_string())?;
			let mut buf = padded;
			let mut cipher = ofb::Ofb::<Sm4>::new(&key.into(), &iv.into());
			cipher.apply_keystream(&mut buf);
			Ok(buf)
		}
		Sm4Mode::Ctr => {
			let iv = iv.ok_or_else(|| "IV is required for CTR mode".to_string())?;
			let mut buf = padded;
			let mut cipher = ctr::Ctr128BE::<Sm4>::new(&key.into(), &iv.into());
			cipher.apply_keystream(&mut buf);
			Ok(buf)
		}
	}
}

fn sm4_decrypt_bytes(
	ciphertext: &[u8],
	key: [u8; 16],
	iv: Option<[u8; 16]>,
	mode: Sm4Mode,
	padding: Sm4Padding,
) -> Result<Vec<u8>, String> {
	let plaintext_padded = match mode {
		Sm4Mode::Ecb => {
			let cipher = ecb::Decryptor::<Sm4>::new(&key.into());
			let mut buf = ciphertext.to_vec();
			let out = cipher
				.decrypt_padded_mut::<NoPadding>(&mut buf)
				.map_err(|e| format!("Decrypt failed: {e}"))?;
			out.to_vec()
		}
		Sm4Mode::Cbc => {
			let iv = iv.ok_or_else(|| "IV is required for CBC mode".to_string())?;
			let cipher = cbc::Decryptor::<Sm4>::new(&key.into(), &iv.into());
			let mut buf = ciphertext.to_vec();
			let out = cipher
				.decrypt_padded_mut::<NoPadding>(&mut buf)
				.map_err(|e| format!("Decrypt failed: {e}"))?;
			out.to_vec()
		}
		Sm4Mode::Cfb => {
			let iv = iv.ok_or_else(|| "IV is required for CFB mode".to_string())?;
			let mut buf = ciphertext.to_vec();
			let cipher = cfb_mode::Decryptor::<Sm4>::new(&key.into(), &iv.into());
			cipher.decrypt(&mut buf);
			buf
		}
		Sm4Mode::Ofb => {
			let iv = iv.ok_or_else(|| "IV is required for OFB mode".to_string())?;
			let mut buf = ciphertext.to_vec();
			let mut cipher = ofb::Ofb::<Sm4>::new(&key.into(), &iv.into());
			cipher.apply_keystream(&mut buf);
			buf
		}
		Sm4Mode::Ctr => {
			let iv = iv.ok_or_else(|| "IV is required for CTR mode".to_string())?;
			let mut buf = ciphertext.to_vec();
			let mut cipher = ctr::Ctr128BE::<Sm4>::new(&key.into(), &iv.into());
			cipher.apply_keystream(&mut buf);
			buf
		}
	};

	remove_padding(plaintext_padded, padding)
}

#[tauri::command]
pub fn sm4_encrypt(request: Sm4Request) -> Result<String, String> {
	let key = parse_fixed_16(&request.key, request.key_type, "Key")?;

	let iv = if require_iv(request.mode) {
		let iv_value = request
			.iv
			.as_deref()
			.ok_or_else(|| "IV is required for this mode".to_string())?;
		let iv_type = request
			.iv_type
			.ok_or_else(|| "ivType is required when IV is provided".to_string())?;
		Some(parse_fixed_16(iv_value, iv_type, "IV")?)
	} else {
		None
	};

	let ciphertext = sm4_encrypt_bytes(
		request.input.as_bytes(),
		key,
		iv,
		request.mode,
		request.padding,
	)?;

	Ok(encode_bytes(&ciphertext, request.format))
}

#[tauri::command]
pub fn sm4_decrypt(request: Sm4Request) -> Result<String, String> {
	let key = parse_fixed_16(&request.key, request.key_type, "Key")?;

	let iv = if require_iv(request.mode) {
		let iv_value = request
			.iv
			.as_deref()
			.ok_or_else(|| "IV is required for this mode".to_string())?;
		let iv_type = request
			.iv_type
			.ok_or_else(|| "ivType is required when IV is provided".to_string())?;
		Some(parse_fixed_16(iv_value, iv_type, "IV")?)
	} else {
		None
	};

	let ciphertext = decode_cipher_input(&request.input, request.format)?;
	let plaintext_bytes = sm4_decrypt_bytes(
		&ciphertext,
		key,
		iv,
		request.mode,
		request.padding,
	)?;

	String::from_utf8(plaintext_bytes)
		.map_err(|_| "Decrypted data is not valid UTF-8 text".to_string())
}

#[cfg(test)]
mod tests {
	use super::*;

	const PLAINTEXT: &str = "0123456789abcdeffedcba9876543210";
	const KEY_TEXT: &str = "1234567890123456";
	const IV_TEXT: &str = "1234567890123456";

	fn enc_req(mode: Sm4Mode) -> Sm4Request {
		Sm4Request {
			input: PLAINTEXT.to_string(),
			mode,
			padding: Sm4Padding::Pkcs7,
			format: Sm4Format::Hex,
			key: KEY_TEXT.to_string(),
			key_type: Sm4KeyType::Text,
			iv: Some(IV_TEXT.to_string()),
			iv_type: Some(Sm4KeyType::Text),
		}
	}

	fn dec_req(mode: Sm4Mode, ciphertext_hex: &str) -> Sm4Request {
		Sm4Request {
			input: ciphertext_hex.to_string(),
			mode,
			padding: Sm4Padding::Pkcs7,
			format: Sm4Format::Hex,
			key: KEY_TEXT.to_string(),
			key_type: Sm4KeyType::Text,
			iv: Some(IV_TEXT.to_string()),
			iv_type: Some(Sm4KeyType::Text),
		}
	}

	#[test]
	fn sm4_cbc_pkcs7_vector() {
		let expected = "50AAF1EA1040E2B564A39F88D79F140119D813B078261D344CB6EFF909384015265D7CC8ADFE8D99477442FB5912539D";
		let got = sm4_encrypt(enc_req(Sm4Mode::Cbc)).unwrap();
		assert_eq!(got.to_ascii_lowercase(), expected.to_ascii_lowercase());

		let out = sm4_decrypt(dec_req(Sm4Mode::Cbc, expected)).unwrap();
		assert_eq!(out, PLAINTEXT);
	}

	#[test]
	fn sm4_ecb_pkcs7_vector() {
		let expected = "BA611296FD1F3F27299EFF1C29B18D63DE48B88F34351E6D653B381CE1355CA66C88F739AF2A29A735381F5677BADEF7";
		let mut req = enc_req(Sm4Mode::Ecb);
		req.iv = None;
		req.iv_type = None;
		let got = sm4_encrypt(req).unwrap();
		assert_eq!(got.to_ascii_lowercase(), expected.to_ascii_lowercase());

		let mut dreq = dec_req(Sm4Mode::Ecb, expected);
		dreq.iv = None;
		dreq.iv_type = None;
		let out = sm4_decrypt(dreq).unwrap();
		assert_eq!(out, PLAINTEXT);
	}

	#[test]
	fn sm4_ofb_vector() {
		let expected = "80B2EEF39DC37DEEC2DB9BEEF00A5811052C7433380B380F300571626D4498FECAD5947E958E9F1823260B144963213A";
		let got = sm4_encrypt(enc_req(Sm4Mode::Ofb)).unwrap();
		assert_eq!(got.to_ascii_lowercase(), expected.to_ascii_lowercase());

		let out = sm4_decrypt(dec_req(Sm4Mode::Ofb, expected)).unwrap();
		assert_eq!(out, PLAINTEXT);
	}

	#[test]
	fn sm4_cfb_vector() {
		let expected = "80B2EEF39DC37DEEC2DB9BEEF00A58111CA93628EE96AD2C29C91379C729C05F649C4BD0852DDDE13384464C912E6C22";
		let got = sm4_encrypt(enc_req(Sm4Mode::Cfb)).unwrap();
		assert_eq!(got.to_ascii_lowercase(), expected.to_ascii_lowercase());

		let out = sm4_decrypt(dec_req(Sm4Mode::Cfb, expected)).unwrap();
		assert_eq!(out, PLAINTEXT);
	}

	#[test]
	fn sm4_ctr_vector() {
		let expected = "80b2eef39dc37deec2db9beef00a581128692ce012c17cfd95986ded8b1c824fa629037b38944cc69e23312e2f94dbf6";
		let got = sm4_encrypt(enc_req(Sm4Mode::Ctr)).unwrap();
		assert_eq!(got.to_ascii_lowercase(), expected.to_ascii_lowercase());

		let out = sm4_decrypt(dec_req(Sm4Mode::Ctr, expected)).unwrap();
		assert_eq!(out, PLAINTEXT);
	}
}
