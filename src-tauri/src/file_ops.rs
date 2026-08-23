use aes_gcm::{
    aead::{AeadInPlace, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD, read::DecoderReader, write::EncoderWriter};
use hmac::{Hmac, Mac};
use md5::Md5;
use rand::{rngs::OsRng, RngCore};
use serde::Serialize;
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha512};
use std::{
    fs::{self, File},
    io::{self, BufReader, BufWriter, Read, Write},
    path::{Path, PathBuf},
};
use tauri::ipc::Channel;
use zeroize::Zeroizing;

const BUFFER_SIZE: usize = 256 * 1024;
const AES_CHUNK_SIZE: usize = 1024 * 1024;
const AES_MAGIC: &[u8; 8] = b"TKAESF2\0";
const AES_HEADER_SIZE: usize = 8 + 4 + 8 + 16 + 4;
const AES_TAG_SIZE: usize = 16;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileProgress {
    processed_bytes: u64,
    total_bytes: u64,
    percent: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileOperationResult {
    output_path: String,
    processed_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHashResult {
    algorithm: String,
    digest: String,
    processed_bytes: u64,
}

#[derive(Clone)]
struct ProgressReporter {
    channel: Option<Channel<FileProgress>>,
    total: u64,
    last_reported: u64,
}

impl ProgressReporter {
    fn new(channel: Option<Channel<FileProgress>>, total: u64) -> Self {
        Self {
            channel,
            total,
            last_reported: 0,
        }
    }

    fn report(&mut self, processed: u64, force: bool) {
        if !force && processed.saturating_sub(self.last_reported) < BUFFER_SIZE as u64 {
            return;
        }
        self.last_reported = processed;
        if let Some(channel) = &self.channel {
            let percent = if self.total == 0 {
                100.0
            } else {
                (processed.min(self.total) as f64 / self.total as f64) * 100.0
            };
            let _ = channel.send(FileProgress {
                processed_bytes: processed,
                total_bytes: self.total,
                percent,
            });
        }
    }
}

struct ProgressReader<R> {
    inner: R,
    processed: u64,
    reporter: ProgressReporter,
}

impl<R> ProgressReader<R> {
    fn new(inner: R, reporter: ProgressReporter) -> Self {
        Self {
            inner,
            processed: 0,
            reporter,
        }
    }

    fn finish_progress(&mut self) {
        self.reporter.report(self.processed, true);
    }
}

impl<R: Read> Read for ProgressReader<R> {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        let count = self.inner.read(buffer)?;
        self.processed += count as u64;
        self.reporter.report(self.processed, false);
        Ok(count)
    }
}

struct WhitespaceStrippingReader<R> {
    inner: R,
    pending: Vec<u8>,
    cursor: usize,
}

impl<R> WhitespaceStrippingReader<R> {
    fn new(inner: R) -> Self {
        Self {
            inner,
            pending: Vec::new(),
            cursor: 0,
        }
    }
}

impl<R: Read> Read for WhitespaceStrippingReader<R> {
    fn read(&mut self, output: &mut [u8]) -> io::Result<usize> {
        if output.is_empty() {
            return Ok(0);
        }

        let mut written = 0;
        loop {
            while self.cursor < self.pending.len() && written < output.len() {
                output[written] = self.pending[self.cursor];
                self.cursor += 1;
                written += 1;
            }
            if written == output.len() {
                return Ok(written);
            }

            self.pending.clear();
            self.cursor = 0;
            let mut input = [0_u8; 8192];
            let count = self.inner.read(&mut input)?;
            if count == 0 {
                return Ok(written);
            }
            self.pending.extend(
                input[..count]
                    .iter()
                    .copied()
                    .filter(|byte| !byte.is_ascii_whitespace()),
            );
        }
    }
}

struct AtomicOutput {
    final_path: PathBuf,
    temp_path: PathBuf,
    committed: bool,
}

impl AtomicOutput {
    fn new(final_path: &Path) -> Result<(Self, File), String> {
        validate_output_path(final_path)?;
        let file_name = final_path
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| "Invalid output file name".to_string())?;
        let temp_path =
            final_path.with_file_name(format!(".{file_name}.{}.part", uuid::Uuid::new_v4()));
        let file = File::create(&temp_path).map_err(error_message)?;
        Ok((
            Self {
                final_path: final_path.to_path_buf(),
                temp_path,
                committed: false,
            },
            file,
        ))
    }

    fn commit(mut self) -> Result<(), String> {
        let backup_path = self.final_path.exists().then(|| {
            let file_name = self
                .final_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("output");
            self.final_path
                .with_file_name(format!(".{file_name}.{}.backup", uuid::Uuid::new_v4()))
        });
        if let Some(backup) = &backup_path {
            fs::rename(&self.final_path, backup).map_err(error_message)?;
        }
        if let Err(error) = fs::rename(&self.temp_path, &self.final_path) {
            if let Some(backup) = &backup_path {
                let _ = fs::rename(backup, &self.final_path);
            }
            return Err(error_message(error));
        }
        self.committed = true;
        if let Some(backup) = backup_path {
            let _ = fs::remove_file(backup);
        }
        Ok(())
    }
}

impl Drop for AtomicOutput {
    fn drop(&mut self) {
        if !self.committed {
            let _ = fs::remove_file(&self.temp_path);
        }
    }
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn hex_string(bytes: impl AsRef<[u8]>) -> String {
    bytes
        .as_ref()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn validate_input_path(path: &Path) -> Result<u64, String> {
    let metadata = fs::metadata(path).map_err(error_message)?;
    if !metadata.is_file() {
        return Err("The selected input is not a file".to_string());
    }
    Ok(metadata.len())
}

fn validate_output_path(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "The output path has no parent directory".to_string())?;
    if !parent.is_dir() {
        return Err("The output directory does not exist".to_string());
    }
    Ok(())
}

fn ensure_distinct_paths(input: &Path, output: &Path) -> Result<(), String> {
    let input = fs::canonicalize(input).map_err(error_message)?;
    let output_parent = output
        .parent()
        .ok_or_else(|| "The output path has no parent directory".to_string())?;
    let output_parent = fs::canonicalize(output_parent).map_err(error_message)?;
    let output_name = output
        .file_name()
        .ok_or_else(|| "Invalid output file name".to_string())?;
    if input == output_parent.join(output_name) {
        return Err("Input and output paths must be different".to_string());
    }
    Ok(())
}

fn process_base64(
    input_path: &Path,
    output_path: &Path,
    operation: &str,
    progress: Option<Channel<FileProgress>>,
) -> Result<FileOperationResult, String> {
    let total = validate_input_path(input_path)?;
    ensure_distinct_paths(input_path, output_path)?;
    let input = File::open(input_path).map_err(error_message)?;
    let reporter = ProgressReporter::new(progress, total);
    let mut reader = ProgressReader::new(BufReader::with_capacity(BUFFER_SIZE, input), reporter);
    let (atomic_output, output) = AtomicOutput::new(output_path)?;
    let mut writer = BufWriter::with_capacity(BUFFER_SIZE, output);

    match operation {
        "encode" => {
            let mut encoder = EncoderWriter::new(&mut writer, &STANDARD);
            io::copy(&mut reader, &mut encoder).map_err(error_message)?;
            encoder.finish().map_err(error_message)?;
        }
        "decode" => {
            let stripped = WhitespaceStrippingReader::new(&mut reader);
            let mut decoder = DecoderReader::new(stripped, &STANDARD);
            io::copy(&mut decoder, &mut writer)
                .map_err(|error| format!("Invalid Base64 file: {error}"))?;
        }
        _ => return Err("Unsupported Base64 operation".to_string()),
    }

    reader.finish_progress();
    writer.flush().map_err(error_message)?;
    drop(writer);
    atomic_output.commit()?;
    Ok(FileOperationResult {
        output_path: output_path.to_string_lossy().into_owned(),
        processed_bytes: total,
    })
}

fn hash_digest<D: Digest + Default>(
    input_path: &Path,
    total: u64,
    progress: Option<Channel<FileProgress>>,
) -> Result<String, String> {
    let input = File::open(input_path).map_err(error_message)?;
    let mut reader = ProgressReader::new(
        BufReader::with_capacity(BUFFER_SIZE, input),
        ProgressReporter::new(progress, total),
    );
    let mut digest = D::default();
    let mut buffer = vec![0_u8; BUFFER_SIZE];
    loop {
        let count = reader.read(&mut buffer).map_err(error_message)?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count]);
    }
    reader.finish_progress();
    Ok(hex_string(digest.finalize()))
}

fn hash_hmac_sha256(
    input_path: &Path,
    total: u64,
    key: &[u8],
    progress: Option<Channel<FileProgress>>,
) -> Result<String, String> {
    let input = File::open(input_path).map_err(error_message)?;
    let mut reader = ProgressReader::new(
        BufReader::with_capacity(BUFFER_SIZE, input),
        ProgressReporter::new(progress, total),
    );
    let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(key).map_err(error_message)?;
    let mut buffer = vec![0_u8; BUFFER_SIZE];
    loop {
        let count = reader.read(&mut buffer).map_err(error_message)?;
        if count == 0 {
            break;
        }
        mac.update(&buffer[..count]);
    }
    reader.finish_progress();
    Ok(hex_string(mac.finalize().into_bytes()))
}

fn hash_file_inner(
    input_path: &Path,
    algorithm: &str,
    key: Option<&str>,
    progress: Option<Channel<FileProgress>>,
) -> Result<FileHashResult, String> {
    let total = validate_input_path(input_path)?;
    let normalized = algorithm.trim().to_ascii_uppercase().replace('-', "");
    let digest = match normalized.as_str() {
        "MD5" => hash_digest::<Md5>(input_path, total, progress)?,
        "SHA1" => hash_digest::<Sha1>(input_path, total, progress)?,
        "SHA256" => hash_digest::<Sha256>(input_path, total, progress)?,
        "SHA512" => hash_digest::<Sha512>(input_path, total, progress)?,
        "HMACSHA256" => {
            let key = key
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "A key is required for HMAC-SHA256".to_string())?;
            hash_hmac_sha256(input_path, total, key.as_bytes(), progress)?
        }
        _ => return Err("Unsupported file digest algorithm".to_string()),
    };
    Ok(FileHashResult {
        algorithm: match normalized.as_str() {
            "HMACSHA256" => "HMAC-SHA256".to_string(),
            "SHA1" => "SHA-1".to_string(),
            "SHA256" => "SHA-256".to_string(),
            "SHA512" => "SHA-512".to_string(),
            _ => "MD5".to_string(),
        },
        digest,
        processed_bytes: total,
    })
}

fn aes_aad(index: u64, plain_len: u32, total: u64) -> [u8; 20] {
    let mut aad = [0_u8; 20];
    aad[..8].copy_from_slice(&index.to_le_bytes());
    aad[8..12].copy_from_slice(&plain_len.to_le_bytes());
    aad[12..].copy_from_slice(&total.to_le_bytes());
    aad
}

fn derive_aes_key(password: &str, salt: &[u8; 16]) -> Result<[u8; 32], String> {
    if password.is_empty() {
        return Err("A password is required".to_string());
    }
    let mut key = [0_u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(error_message)?;
    Ok(key)
}

fn write_aes_header(
    writer: &mut impl Write,
    total: u64,
    salt: &[u8; 16],
    nonce_prefix: &[u8; 4],
) -> Result<(), String> {
    writer.write_all(AES_MAGIC).map_err(error_message)?;
    writer
        .write_all(&(AES_CHUNK_SIZE as u32).to_le_bytes())
        .map_err(error_message)?;
    writer
        .write_all(&total.to_le_bytes())
        .map_err(error_message)?;
    writer.write_all(salt).map_err(error_message)?;
    writer.write_all(nonce_prefix).map_err(error_message)?;
    Ok(())
}

fn read_exact_array<const N: usize>(reader: &mut impl Read) -> Result<[u8; N], String> {
    let mut value = [0_u8; N];
    reader.read_exact(&mut value).map_err(error_message)?;
    Ok(value)
}

fn encrypt_aes_file(
    input_path: &Path,
    output_path: &Path,
    password: &str,
    progress: Option<Channel<FileProgress>>,
) -> Result<FileOperationResult, String> {
    let total = validate_input_path(input_path)?;
    ensure_distinct_paths(input_path, output_path)?;
    let mut salt = [0_u8; 16];
    let mut nonce_prefix = [0_u8; 4];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_prefix);
    let key = Zeroizing::new(derive_aes_key(password, &salt)?);
    let cipher = Aes256Gcm::new_from_slice(key.as_ref()).map_err(error_message)?;

    let input = File::open(input_path).map_err(error_message)?;
    let mut reader = BufReader::with_capacity(AES_CHUNK_SIZE, input);
    let (atomic_output, output) = AtomicOutput::new(output_path)?;
    let mut writer = BufWriter::with_capacity(BUFFER_SIZE, output);
    write_aes_header(&mut writer, total, &salt, &nonce_prefix)?;

    let mut reporter = ProgressReporter::new(progress, total);
    let mut processed = 0_u64;
    let mut index = 0_u64;
    let mut buffer = vec![0_u8; AES_CHUNK_SIZE];
    while processed < total {
        let wanted = ((total - processed) as usize).min(AES_CHUNK_SIZE);
        reader
            .read_exact(&mut buffer[..wanted])
            .map_err(error_message)?;
        let mut nonce_bytes = [0_u8; 12];
        nonce_bytes[..4].copy_from_slice(&nonce_prefix);
        nonce_bytes[4..].copy_from_slice(&index.to_le_bytes());
        let plain_len = wanted as u32;
        let aad = aes_aad(index, plain_len, total);
        let tag = cipher
            .encrypt_in_place_detached(Nonce::from_slice(&nonce_bytes), &aad, &mut buffer[..wanted])
            .map_err(|_| "AES file encryption failed".to_string())?;
        writer
            .write_all(&plain_len.to_le_bytes())
            .and_then(|_| writer.write_all(&buffer[..wanted]))
            .and_then(|_| writer.write_all(tag.as_slice()))
            .map_err(error_message)?;
        processed += wanted as u64;
        index += 1;
        reporter.report(processed, false);
    }
    reporter.report(processed, true);
    writer.flush().map_err(error_message)?;
    drop(writer);
    atomic_output.commit()?;
    Ok(FileOperationResult {
        output_path: output_path.to_string_lossy().into_owned(),
        processed_bytes: total,
    })
}

fn decrypt_aes_file(
    input_path: &Path,
    output_path: &Path,
    password: &str,
    progress: Option<Channel<FileProgress>>,
) -> Result<FileOperationResult, String> {
    let encrypted_total = validate_input_path(input_path)?;
    ensure_distinct_paths(input_path, output_path)?;
    if encrypted_total < AES_HEADER_SIZE as u64 {
        return Err("Invalid or unsupported encrypted file".to_string());
    }

    let input = File::open(input_path).map_err(error_message)?;
    let mut reader = BufReader::with_capacity(AES_CHUNK_SIZE + AES_TAG_SIZE, input);
    if &read_exact_array::<8>(&mut reader)? != AES_MAGIC {
        return Err("Unsupported encrypted file format (expected TKAESF2)".to_string());
    }
    let chunk_size = u32::from_le_bytes(read_exact_array::<4>(&mut reader)?) as usize;
    if chunk_size == 0 || chunk_size > AES_CHUNK_SIZE * 4 {
        return Err("Invalid encrypted file chunk size".to_string());
    }
    let original_total = u64::from_le_bytes(read_exact_array::<8>(&mut reader)?);
    let salt = read_exact_array::<16>(&mut reader)?;
    let nonce_prefix = read_exact_array::<4>(&mut reader)?;
    let key = Zeroizing::new(derive_aes_key(password, &salt)?);
    let cipher = Aes256Gcm::new_from_slice(key.as_ref()).map_err(error_message)?;

    let (atomic_output, output) = AtomicOutput::new(output_path)?;
    let mut writer = BufWriter::with_capacity(BUFFER_SIZE, output);
    let mut reporter = ProgressReporter::new(progress, original_total);
    let mut processed = 0_u64;
    let mut index = 0_u64;
    while processed < original_total {
        let plain_len = u32::from_le_bytes(read_exact_array::<4>(&mut reader)?) as usize;
        if plain_len == 0 || plain_len > chunk_size || processed + plain_len as u64 > original_total
        {
            return Err("Invalid encrypted file chunk".to_string());
        }
        let mut buffer = vec![0_u8; plain_len];
        reader.read_exact(&mut buffer).map_err(error_message)?;
        let tag = read_exact_array::<AES_TAG_SIZE>(&mut reader)?;
        let mut nonce_bytes = [0_u8; 12];
        nonce_bytes[..4].copy_from_slice(&nonce_prefix);
        nonce_bytes[4..].copy_from_slice(&index.to_le_bytes());
        let aad = aes_aad(index, plain_len as u32, original_total);
        cipher
            .decrypt_in_place_detached(
                Nonce::from_slice(&nonce_bytes),
                &aad,
                &mut buffer,
                (&tag).into(),
            )
            .map_err(|_| "Wrong password or encrypted file authentication failed".to_string())?;
        writer.write_all(&buffer).map_err(error_message)?;
        processed += plain_len as u64;
        index += 1;
        reporter.report(processed, false);
    }
    let mut trailing = [0_u8; 1];
    if reader.read(&mut trailing).map_err(error_message)? != 0 {
        return Err("Encrypted file contains unexpected trailing data".to_string());
    }
    reporter.report(processed, true);
    writer.flush().map_err(error_message)?;
    drop(writer);
    atomic_output.commit()?;
    Ok(FileOperationResult {
        output_path: output_path.to_string_lossy().into_owned(),
        processed_bytes: original_total,
    })
}

#[tauri::command]
pub async fn process_base64_file(
    input_path: String,
    output_path: String,
    operation: String,
    on_progress: Channel<FileProgress>,
) -> Result<FileOperationResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        process_base64(
            Path::new(&input_path),
            Path::new(&output_path),
            &operation,
            Some(on_progress),
        )
    })
    .await
    .map_err(error_message)?
}

#[tauri::command]
pub async fn hash_file(
    input_path: String,
    algorithm: String,
    key: Option<String>,
    on_progress: Channel<FileProgress>,
) -> Result<FileHashResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        hash_file_inner(
            Path::new(&input_path),
            &algorithm,
            key.as_deref(),
            Some(on_progress),
        )
    })
    .await
    .map_err(error_message)?
}

#[tauri::command]
pub async fn aes_encrypt_file(
    input_path: String,
    output_path: String,
    password: String,
    on_progress: Channel<FileProgress>,
) -> Result<FileOperationResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let password = Zeroizing::new(password);
        encrypt_aes_file(
            Path::new(&input_path),
            Path::new(&output_path),
            password.as_str(),
            Some(on_progress),
        )
    })
    .await
    .map_err(error_message)?
}

#[tauri::command]
pub async fn aes_decrypt_file(
    input_path: String,
    output_path: String,
    password: String,
    on_progress: Channel<FileProgress>,
) -> Result<FileOperationResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let password = Zeroizing::new(password);
        decrypt_aes_file(
            Path::new(&input_path),
            Path::new(&output_path),
            password.as_str(),
            Some(on_progress),
        )
    })
    .await
    .map_err(error_message)?
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestFiles {
        directory: PathBuf,
    }

    impl TestFiles {
        fn new() -> Self {
            let directory =
                std::env::temp_dir().join(format!("trovekit-file-ops-{}", uuid::Uuid::new_v4()));
            fs::create_dir_all(&directory).unwrap();
            Self { directory }
        }

        fn path(&self, name: &str) -> PathBuf {
            self.directory.join(name)
        }
    }

    impl Drop for TestFiles {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.directory);
        }
    }

    #[test]
    fn base64_file_round_trip_accepts_whitespace() {
        let files = TestFiles::new();
        let input = files.path("input.bin");
        let encoded = files.path("encoded.txt");
        let wrapped = files.path("wrapped.txt");
        let decoded = files.path("decoded.bin");
        let source: Vec<u8> = (0..=255).cycle().take(900_123).collect();
        fs::write(&input, &source).unwrap();
        process_base64(&input, &encoded, "encode", None).unwrap();
        let encoded_text = fs::read_to_string(&encoded).unwrap();
        let wrapped_text = encoded_text
            .as_bytes()
            .chunks(76)
            .map(|chunk| std::str::from_utf8(chunk).unwrap())
            .collect::<Vec<_>>()
            .join("\r\n");
        fs::write(&wrapped, wrapped_text).unwrap();
        process_base64(&wrapped, &decoded, "decode", None).unwrap();
        assert_eq!(fs::read(decoded).unwrap(), source);
    }

    #[test]
    fn file_hashes_match_known_vectors() {
        let files = TestFiles::new();
        let input = files.path("abc.txt");
        fs::write(&input, b"abc").unwrap();
        assert_eq!(
            hash_file_inner(&input, "MD5", None, None).unwrap().digest,
            "900150983cd24fb0d6963f7d28e17f72"
        );
        assert_eq!(
            hash_file_inner(&input, "SHA-1", None, None).unwrap().digest,
            "a9993e364706816aba3e25717850c26c9cd0d89d"
        );
        assert_eq!(
            hash_file_inner(&input, "SHA-256", None, None)
                .unwrap()
                .digest,
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            hash_file_inner(&input, "HMAC-SHA256", Some("key"), None)
                .unwrap()
                .digest,
            "9c196e32dc0175f86f4b1cb89289d6619de6bee699e4c378e68309ed97a1a6ab"
        );
    }

    #[test]
    fn aes_file_round_trip_and_authentication() {
        let files = TestFiles::new();
        let input = files.path("input.bin");
        let encrypted = files.path("input.bin.tkaes");
        let decrypted = files.path("decrypted.bin");
        let source: Vec<u8> = (0..=255).cycle().take(AES_CHUNK_SIZE * 2 + 37).collect();
        fs::write(&input, &source).unwrap();
        encrypt_aes_file(&input, &encrypted, "correct horse battery staple", None).unwrap();
        decrypt_aes_file(&encrypted, &decrypted, "correct horse battery staple", None).unwrap();
        assert_eq!(fs::read(&decrypted).unwrap(), source);

        let wrong_output = files.path("wrong.bin");
        assert!(decrypt_aes_file(&encrypted, &wrong_output, "wrong password", None).is_err());
        assert!(!wrong_output.exists());

        let mut tampered = fs::read(&encrypted).unwrap();
        tampered[AES_HEADER_SIZE + 10] ^= 0x80;
        fs::write(&encrypted, tampered).unwrap();
        let tampered_output = files.path("tampered.bin");
        assert!(decrypt_aes_file(
            &encrypted,
            &tampered_output,
            "correct horse battery staple",
            None
        )
        .is_err());
        assert!(!tampered_output.exists());
    }
}
