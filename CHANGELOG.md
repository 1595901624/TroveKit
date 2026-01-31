# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-01-25

### Changed
- Optimized startup speed to reduce application cold-start time and improve perceived responsiveness.
- Optimized sidebar log rendering to prevent UI jank when the sidebar contains a large number of logs.

### Added
- **RSA encryption/decryption**: Added RSA public-key encryption/decryption tool (supports 512, 1024, 2048, and 4096-bit key sizes).
- **SM2 encryption/decryption**: Added SM2 public-key encryption/decryption tool (supports Hex input/output).
- **SM3 hash**: Added SM3 hash algorithm support.
- **SM4 encryption/decryption**: Added SM4 symmetric encryption/decryption tool (CBC mode, 128-bit key, supports PKCS7/Zero/None padding).
- **Brainfuck / Ook encoding/decoding**: Added Brainfuck and Ook encoder/decoder tools.
- **Subnet calculation**: Added subnet calculation tool supporting IPv4 CIDR and subnet mask conversion, calculating network address, broadcast address, host range, and number of hosts.

## [0.1.12] - 2026-01-24

### Added
- **Trivium encryption/decryption**: Added Trivium encrypt/decrypt tool (80-bit key/IV, supports Hex/Base64 input/output).
- **ChaCha20 encryption/decryption**: Added ChaCha20 encrypt/decrypt tool (supports 256-bit key and standard nonce; Hex/Base64 I/O).

### Fixed
- Fixed: Formatting tool remained stuck on loading (Fixes #18).

## [0.1.11] - 2026-01-21

### Changed
- Migrated tool state persistence from `localStorage` to the async Tauri-backed `store` (via `src/lib/store.ts`) across many tools to improve reliability and desktop integration; added automatic migration from existing localStorage entries.
- Replaced synchronous `localStorage` helpers with `getStoredItem` / `setStoredItem` / `removeStoredItem` and adopted an async load/save pattern (with an `isLoaded` guard) in tools that persist state.
- Clarified migration behavior in `src/contexts/LogContext.tsx` and kept `Settings.tsx` full-cache clear (`localStorage.clear()` + store clear) for thorough cleanup.

### Added
- **JWT Token parsing (experimental)**: Added basic JWT parsing, signing and verification helpers for testing and debugging within the `JwtTab`.
- **Clear Cache and Reload Feature**: Added a new "Clear Cache" button in Settings that clears all localStorage and Tauri store data, then automatically reloads the application to apply changes.


### Files Updated
- **Hash tools**: `AesTab`, `DesTab`, `Rc4Tab`, `Md5Tab`, `Md4Tab`, `Md2Tab`, `HmacMd5Tab`, `ShaTab`
- **Encoder tools**: `Base32Tab`, `Base64Tab`, `BaseXTab`, `HexTab`, `UrlTab`, `JwtTab`
- **Classical tools**: `BaconTab`, `CaesarTab`, `MorseTab`
- **Formatter tools**: `XmlTab`, `SqlTab`, `CssTab`
- **Generator**: `UuidTab`

### Fixed
- Fixed type and JSX issues introduced during the migration process (e.g., SQL formatter typing, CSS tab JSX syntax). Build and bundling succeed after fixes.
- Fixed issue #3: Resolved macOS application launch failure.
- Fixed issue #6: Set default language to match system language on first launch.
- Fixed issue #11: Updated T-SQL label to include SQL Server for clarity.
- Fixed: Language selector flags not rendering on macOS — added explicit sizing (`className="w-full h-full"`) and `aria-label`s to flag SVGs to ensure consistent rendering across platforms.

### Notes
- `src/lib/store.ts` contains migration logic: on first read the library falls back to `localStorage` for existing keys and migrates them into the Tauri `store` so existing user data remains available.

## [0.1.10] - 2026-01-17

### Fixed
- **TitleBar**: Adjusted pointer events for SearchTrigger and layout elements (#1).

## [0.1.9] - 2026-01-17

### Added
- **Global Feature Search**: Added global feature search functionality to quickly find and navigate to tools and features across the application.
- **HMAC-MD5 Tool**: Added new HMAC-MD5 hash algorithm support.
- **Log Panel Enhancements**: Optimized log interaction by highlighting trailing whitespaces (spaces, tabs, and newlines) with visual markers (`·`, `→`, `↵`) and descriptive tooltips.
- **BaseX Algorithm Logging**: Added algorithm field to BaseXTab logs to track user-selected base encoding (base16, base32, base58, etc.).
- **Log Panel Session Notes**: Added session note editing functionality to the log panel, allowing users to add and edit notes for log sessions.

### Changed
- **Log Management View**: Optimized the log viewing interface in the log management page for better readability and user experience.
- **Encryption Algorithm Logs**: Optimized log display for encryption algorithms.
- **BaseXTab**: Removed custom alphabet feature (commented out).
- **Toast Implementation**: Optimized toast notifications by replacing custom implementation with HeroUI's built-in addToast functionality for better consistency and maintainability.

### Fixed
- **Log Panel Tooltip**: Fixed an issue where the "New Log" button tooltip was not correctly localized.

## [0.1.8] - 2026-01-10

### Added
- **Timestamp Converter**: Added new timestamp converter tool supporting bidirectional conversion between timestamps (s/ms/μs/ns) and dates, with high-precision real-time system clock display.
- **Hex Encoder**: Added new Hex encoding/decoding tool with support for customizable newline modes (LF/CRLF).
- **JSON/YAML Converter**: Added new converter tool for bidirectional conversion between JSON and YAML formats with real-time processing, syntax highlighting, and example data support.
- **Bacon Cipher**: Added new Bacon cipher tool with support for Standard (26 letters) and Traditional (24 letters) alphabets, multiple symbol modes (A/B, a/b, 0/1, custom), and automatic space recognition during decoding.
- **JSON/XML Converter**: Added new converter tool for bidirectional conversion between JSON and XML formats with real-time processing, syntax highlighting, and example data support.
<!-- - **Log Management Tool**: Added a dedicated log management tool in the sidebar for viewing, searching, and managing saved logs. -->
- **Collapsible Sidebar**: Added support for collapsing and expanding the sidebar to maximize workspace. The sidebar state is now persisted in local storage.

### Changed
- **Log Management Tool Redesign**: Completely refactored the log management interface with a modern master-detail layout. Replaced native confirmation dialogs with HeroUI Modals and added support for deleting individual log entries and entire sessions.
<!-- - **Log Storage Format**: Logs are now stored in a SQLite database instead of JSONL files (experimental feature). -->

## [0.1.7] - 2026-01-03

### Added
- **Operation Logs(Experimental feature)**: Added session-based operation logging. Supports creating new log files (sessions) with automatic real-time persistence to local disk (`.jsonl` format).
- **RC4 Tool**: Added new RC4 encryption/decryption tool with support for Text/Hex keys and Base64/Hex I/O formats.
- **XML Formatter**: Added XML formatting and minification tool.
- **CSS Formatter**: Added CSS formatting and minification tool.
- **SQL Formatter**: Added SQL formatting and minification tool with support for multiple SQL dialects (MySQL, PostgreSQL, SQLite, T-SQL, etc.) and offline processing.
- **UUID Generator**: Added UUID v4 generator with batch support (up to 5000), real-time case/hyphen toggle, and multiple output formats (String, Hex, Binary, Base64).
- **Log Panel Notes**: Added note functionality to log panel, allowing users to add comments to log entries for better context and documentation.

### Changed
- **Sidebar Layout**: Optimized sidebar layout by moving the Settings button to the footer next to the version number for a cleaner navigation experience.
- **Text Size & Translation Optimization**: Improved text sizing across the application and enhanced translation quality for all supported languages (English, Simplified Chinese, Traditional Chinese, Japanese).

## [0.1.6] - 2025-12-30

### Added
- **MD4 Hash Tool**: Added new MD4 hash algorithm support with RFC 1320 compliance
- **MD2 Hash Tool**: Added new MD2 hash algorithm support with case selection (upper/lower)
- **Morse Code Tool**: Encode/decode Morse code with customizable settings
- **AES Tool**: Added support for Hex and Base64 input/output formats
- **DES Tool**: Added support for Hex and Base64 input/output formats
- **State Persistence**: Added ability to save AES, MD5, SHA, DES, Base32, Base64, BaseX, URL, Caesar, Morse, QR Code, and JSON Formatter tool states

### Changed

### Fixed

### Removed

## [0.1.5] - 2025-12-28

### Added
- **QR Code Generator**: Generate QR codes from text/URL, Wi-Fi QR codes, customizable styles, PNG export with Unicode support
- **Caesar Cipher Tool**: Encode/decode with configurable shift, flexible non-letter character handling
- **Multi-language README support**: Added Simplified Chinese, Traditional Chinese (HK/TW), and Japanese README files
- Language switcher in all README files

### Changed
- Restructured README for better readability and mainstream project style
- Emphasized pure offline mode (no network dependencies)
- Centered badges and converted to HTML img tags
- Improved tool descriptions and feature highlights

### Fixed

### Removed

## [0.1.4] - 2025-12-26

### Added
- Initial release with Hash, AES, Encoders-Decoders, JSON Formatter, Logs & Toasts
- Basic UI with light/dark theme support
- i18n support for English, Simplified Chinese, Traditional Chinese, Japanese

### Changed

### Fixed

### Removed

## [0.1.2] - 2025-12-23

### Added
- Project initialization
- Set up development environment and toolchain
