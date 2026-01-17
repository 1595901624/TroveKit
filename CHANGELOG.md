# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
