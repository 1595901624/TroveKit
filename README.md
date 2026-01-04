<div align="center">
<img src="app-icon.svg" width="48" height="48">
<h1>TroveKit</h1>

An open-source, lightweight, fully offline, cross-platform toolbox.

English | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [繁體中文（台灣）](README.zh-TW.md) | [日本語](README.ja.md)
</div>

<div align="center">
<img src="https://img.shields.io/badge/version-v0.1.7-blue" alt="Version">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
<img src="https://img.shields.io/badge/Windows-Supported-blue" alt="Windows">
<img src="https://img.shields.io/badge/macOS-Supported-blue" alt="macOS">
<img src="https://img.shields.io/badge/Linux-Supported-blue" alt="Linux">
</div>

![Home Dashboard](demo/home.png)

## Why TroveKit

You probably use these "small utilities" all the time—hashing, encryption/decryption, encoding/decoding, JSON formatting, QR codes, and simple classical ciphers.
TroveKit bundles them into a fast desktop app, aiming for:

- **Pure offline**: all data processing is local
- **Fast workflow**: instant results (real-time updates supported)
- **Traceable**: operation logs + one-click copy
- **Cross-platform**: Windows / macOS / Linux

Built with [Tauri v2](https://v2.tauri.app/) + [React](https://react.dev/), TroveKit focuses on a pure offline workflow.

## ✨ Highlights

- All-in-one utilities: Hash / AES / DES / RC4 / Encoders-Decoders / JSON / XML / **Converters** / QR / Caesar cipher / **Log Management**
- Modern UI: light/dark theme, responsive layout, smooth animations
- **Enhanced i18n**: English / 简体中文 / 繁體中文（HK/TW）/ 日本語 with optimized text sizing and translation quality
- Logs & toasts: history, error feedback, copy buttons with **note functionality**
- **State Persistence**: auto-save tool states (never lose your input)

## 🧰 Utilities

### 📷 QR Code Generator

- Generate QR codes from **Text / URL**
- Generate **Wi‑Fi QR codes** (SSID / password / encryption / hidden)
- Customize style: colors, error correction level, optional logo
- Export **PNG** (Unicode supported)

### 🔐 Classical Ciphers

- **Caesar Cipher**: encode/decode with configurable shift
- **Morse Code**: encode/decode with customizable separator/dash/dot
- Non-letter handling: keep / ignore / shift ASCII (experimental; may produce non-printable characters)

### 🔒 Hash & Cryptography

- **MD5 / MD4 / MD2**: 16 / 32 chars, upper/lower case
- **SHA family**: SHA1 / SHA224 / SHA256 / SHA384 / SHA512 / SHA3
- **AES / DES / RC4**: Multiple modes and paddings supported (Hex/Base64 input/output)

### 🔢 Encoders & Decoders

- Real-time URL / Base64 encode & decode
- Base32 / Hex(Base16) / Base58 / Base62 / Base91 / custom alphabets

### 📝 Formatters

- **JSON**: format, minify, validate, and tree view
- **XML**: format and minify
- **CSS**: format and minify
- **SQL**: format and minify with support for multiple SQL dialects (MySQL, PostgreSQL, SQLite, T-SQL, etc.)

### 🔄 Converters

- **JSON ↔ XML**: Bidirectional conversion with real-time processing
- Syntax highlighting for both formats
- Example data support for quick testing
- Error validation and helpful feedback

### 🧾 Logs & Toasts

- Side panel for operation history with **session-based persistence (Experimental)**
- **Real-time auto-save**: all operations are saved to local **SQLite database** automatically
- Support for **manual log session creation** (New Log)
- **Note functionality**: add comments/notes to log entries for better context and documentation
- **Log Management Panel**: dedicated tool for viewing, searching, and managing all saved logs
- **Enhanced UUID logging**: displays generated UUIDs with configurable format (String/Hex/Base64/Binary), case, and hyphens. Shows count and format details in logs. Maximum 10 UUIDs displayed in log entries with clear indication when limit is reached
- Structured method/input/output view
- Error/success toasts + one-click copy

## 🗺️ Roadmap

- Formatters: YAML
- Generators: Lorem Ipsum / random passwords, etc.

## 🎨 UI / UX

- **Theme**: Dark/Light mode with system sync
- **Visuals**: built with **HeroUI** and **TailwindCSS**
- **Animations**: powered by **Framer Motion**
- **Optimized Text Sizing**: improved readability across all tools and languages

## 🌍 Internationalization

- **Languages**: English, Simplified Chinese (简体中文), Traditional Chinese (繁體中文 - HK/TW), and Japanese (日本語)

## 📸 Screenshots

| Hash Tool | Encoder Tool |
|:---:|:---:|
| ![Hash Tool](demo/hash.png) | ![Encoder Tool](demo/encoder-decoder.png) |

| Operation Logs | Settings |
|:---:|:---:|
| ![Log Panel](demo/log-panel.png) | ![Settings](demo/settings.png) |

> Note: QR / Caesar screenshots will be added to the demo gallery later.

## 🚀 Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Framework**: [HeroUI](https://www.heroui.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State & Logic**: [Framer Motion](https://www.framer.com/motion/), [i18next](https://www.i18next.com/), [crypto-js](https://cryptojs.gitbook.io/)
- **QR Rendering**: [qr-code-styling](https://www.npmjs.com/package/qr-code-styling)
- **XML Processing**: [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Rust (stable)
- Tauri v2 system dependencies (vary by OS; see Tauri docs if your first build fails)

### Install

```bash
git clone <repo-url>
cd trovekit
pnpm install
```

### Development

```bash
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

## 🔒 Privacy

- TroveKit is designed as a **pure offline toolbox**: all utilities work offline.
- Inputs are processed locally; no data is sent to external servers.

## 📂 Project Structure

```
TroveKit/
├── src-tauri/       # Rust backend and Tauri configuration
├── src/             # React frontend source code
│   ├── components/  # UI Components (Sidebar, LogPanel, Toast, etc.)
│   ├── contexts/    # Context Providers (LogContext, ToastContext)
│   ├── tools/       # Tool Views (Hash, Encoder, Formatter, Converter, QR, Classical, Settings)
│   │   ├── converter/  # JSON/XML converter
│   │   └── ...     # Other tool directories
│   ├── locales/     # i18n JSON files
│   ├── lib/         # Utilities (Base32, etc.)
│   └── styles/      # Global CSS
└── public/          # Static assets
```

## 🤝 Contributing

Issues and PRs are welcome:

- New utility ideas (more formatters/generators/converters)
- Bug fixes and UI/UX improvements
- Copy & translation improvements (`src/locales/`)

## 📄 License

[MIT](LICENSE)
