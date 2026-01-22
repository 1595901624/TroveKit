use tauri::command;

const KEY_BYTES: usize = 10;
const IV_BYTES: usize = 10;

#[derive(Debug, Clone, Copy)]
enum BitOrder {
    Msb,
    Lsb,
}

#[derive(Debug, Clone, Copy)]
enum PackOrder {
    Lsb,
}

fn parse_bit_order(bit_order: Option<String>) -> Result<BitOrder, String> {
    match bit_order.as_deref().map(|s| s.trim().to_ascii_lowercase()) {
        None => Ok(BitOrder::Msb),
        Some(s) if s == "msb" || s == "msb-first" || s == "msb_first" => Ok(BitOrder::Msb),
        Some(s) if s == "lsb" || s == "lsb-first" || s == "lsb_first" => Ok(BitOrder::Lsb),
        Some(s) => Err(format!("Unsupported bitOrder: {s} (expected 'msb' or 'lsb')")),
    }
}

fn normalize_to_fixed(input: &[u8], target_len: usize) -> [u8; KEY_BYTES] {
    // NOTE: target_len is always 10 in our usage; keep small and simple.
    let mut out = [0u8; KEY_BYTES];
    let n = input.len().min(target_len);
    out[..n].copy_from_slice(&input[..n]);
    out
}

fn get_bit(bytes: &[u8], bit_index: usize, order: BitOrder) -> u8 {
    let byte_index = bit_index >> 3;
    let bit_in_byte = bit_index & 7;
    if byte_index >= bytes.len() {
        return 0;
    }
    let b = bytes[byte_index];
    match order {
        // bit_index 0 is the MSB of the first byte
        BitOrder::Msb => (b >> (7 - bit_in_byte)) & 1,
        // bit_index 0 is the LSB of the first byte
        BitOrder::Lsb => (b >> bit_in_byte) & 1,
    }
}

#[derive(Clone)]
struct Trivium {
    s1: [u8; 93],
    s2: [u8; 84],
    s3: [u8; 111],
    pack_order: PackOrder,
}

impl Trivium {
    fn new(key_raw: &[u8], iv_raw: &[u8], load_order: BitOrder, pack_order: PackOrder) -> Self {
        let key = normalize_to_fixed(key_raw, KEY_BYTES);
        let iv = normalize_to_fixed(iv_raw, IV_BYTES);

        let mut s1 = [0u8; 93];
        let mut s2 = [0u8; 84];
        let mut s3 = [0u8; 111];

        // s1: 80-bit key then 13 zeros
        for i in 0..80 {
            s1[i] = get_bit(&key, i, load_order);
        }

        // s2: 80-bit IV then 4 zeros
        for i in 0..80 {
            s2[i] = get_bit(&iv, i, load_order);
        }

        // s3: 108 zeros then 3 ones
        s3[108] = 1;
        s3[109] = 1;
        s3[110] = 1;

        let mut st = Self {
            s1,
            s2,
            s3,
            pack_order,
        };

        // Warm-up: 4 * 288 = 1152 steps
        for _ in 0..(4 * 288) {
            let _ = st.next_bit();
        }

        st
    }

    #[inline]
    fn shift_in(reg: &mut [u8], new_bit: u8) {
        for i in (1..reg.len()).rev() {
            reg[i] = reg[i - 1];
        }
        reg[0] = new_bit & 1;
    }

    fn next_bit(&mut self) -> u8 {
        // Indices are 0-based (spec positions minus 1)
        let t1 = self.s1[65] ^ self.s1[92];
        let t2 = self.s2[68] ^ self.s2[83];
        let t3 = self.s3[65] ^ self.s3[110];
        let z = t1 ^ t2 ^ t3;

        let t1n = t1 ^ (self.s1[90] & self.s1[91]) ^ self.s2[77];
        let t2n = t2 ^ (self.s2[81] & self.s2[82]) ^ self.s3[86];
        let t3n = t3 ^ (self.s3[108] & self.s3[109]) ^ self.s1[68];

        Self::shift_in(&mut self.s1, t3n);
        Self::shift_in(&mut self.s2, t1n);
        Self::shift_in(&mut self.s3, t2n);

        z & 1
    }

    fn keystream_byte(&mut self) -> u8 {
        match self.pack_order {
            PackOrder::Lsb => {
                // Pack bits LSB-first within each output byte: first output bit becomes bit 0.
                let mut b = 0u8;
                for j in 0..8 {
                    b |= (self.next_bit() & 1) << j;
                }
                b
            }
        }
    }

    fn xor_bytes(mut self, data: &[u8]) -> Vec<u8> {
        let mut out = Vec::with_capacity(data.len());
        for &v in data {
            let k = self.keystream_byte();
            out.push(v ^ k);
        }
        out
    }
}

/// Trivium stream cipher XOR (encrypt/decrypt)
///
/// - `key` / `iv`: arbitrary-length bytes; will be truncated/padded to 10 bytes (80-bit)
/// - `data`: input bytes
/// - `bitOrder`: optional ("msb" default, or "lsb")
#[command(rename_all = "camelCase")]
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

#[cfg(test)]
mod tests {
    use super::*;

    fn hex_to_bytes(s: &str) -> Vec<u8> {
        let clean: String = s
            .chars()
            .filter(|c| !c.is_whitespace())
            .collect::<String>()
            .trim_start_matches("0x")
            .to_string();
        assert!(clean.len() % 2 == 0, "hex must have even length");
        (0..clean.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&clean[i..i + 2], 16).expect("hex byte"))
            .collect()
    }

    fn make_prng(seed: u32) -> impl FnMut() -> u32 {
        let mut x = seed;
        move || {
            x ^= x << 13;
            x ^= x >> 17;
            x ^= x << 5;
            x
        }
    }

    fn random_bytes(mut prng: impl FnMut() -> u32, len: usize) -> Vec<u8> {
        let mut out = vec![0u8; len];
        for b in &mut out {
            *b = (prng() & 0xff) as u8;
        }
        out
    }

    #[test]
    fn xor_is_symmetric_msb() {
        let mut prng = make_prng(0x1234_5678);

        for _ in 0..64 {
            let key = random_bytes(&mut prng, 10);
            let iv = random_bytes(&mut prng, 10);
            let msg_len = (prng() as usize) % 512;
            let msg = random_bytes(&mut prng, msg_len);

            let ct = trivium_xor(key.clone(), iv.clone(), msg.clone(), Some("msb".into()))
                .expect("encrypt");
            let pt = trivium_xor(key, iv, ct, Some("msb".into())).expect("decrypt");

            assert_eq!(pt, msg);
        }
    }

    #[test]
    fn xor_is_symmetric_lsb() {
        let mut prng = make_prng(0x9e37_79b9);

        for _ in 0..64 {
            let key = random_bytes(&mut prng, 10);
            let iv = random_bytes(&mut prng, 10);
            let msg_len = (prng() as usize) % 512;
            let msg = random_bytes(&mut prng, msg_len);

            let ct = trivium_xor(key.clone(), iv.clone(), msg.clone(), Some("lsb".into()))
                .expect("encrypt");
            let pt = trivium_xor(key, iv, ct, Some("lsb".into())).expect("decrypt");

            assert_eq!(pt, msg);
        }
    }

    #[test]
    fn accepts_short_key_iv_by_padding_with_zeros() {
        let key = vec![1, 2, 3];
        let iv = vec![4, 5];
        let msg = b"hello".to_vec();

        let ct = trivium_xor(key.clone(), iv.clone(), msg.clone(), None).unwrap();
        let pt = trivium_xor(key, iv, ct, None).unwrap();

        assert_eq!(pt, msg);
    }

    #[test]
    fn known_vector_hello_key_iv() {
        // User-provided known-answer test:
        // plaintext: "hello"
        // key (hex): 00000010000000000000
        // iv  (hex): 00000000000000000000
        // expected ciphertext (hex): 9f804f6861
        let key = hex_to_bytes("00000010000000000000");
        let iv = hex_to_bytes("00000000000000000000");
        let msg = b"hello".to_vec();

        let expected = hex_to_bytes("9f804f6861");

        // This project interprets HEX key/IV as big-endian 80-bit values in the UI,
        // then reverses the 10-byte sequence before sending to Rust.
        // The backend reads bits MSB-first (bitOrder=msb) and packs keystream bytes LSB-first.
        let mut key_reversed = key.clone();
        key_reversed.reverse();

        let ct = trivium_xor(key_reversed, iv, msg, Some("msb".into())).unwrap();
        assert_eq!(ct, expected);
    }
}
