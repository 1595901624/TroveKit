<div align="center">
<img src="app-icon.svg" width="48" height="48">
<h1>TroveKit</h1>

A lightweight, offline-first, cross-platform developer toolbox.

English | [简体中文](README.zh-CN.md)
</div>

![Version](https://img.shields.io/badge/version-v0.1.5-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![Windows](https://img.shields.io/badge/Windows-Supported-blue) ![macOS](https://img.shields.io/badge/macOS-Supported-blue) ![Linux](https://img.shields.io/badge/Linux-Supported-blue)

![Home Dashboard](demo/home.png)

## Why TroveKit

You probably use these “small utilities” all the time—hashing, encryption/decryption, encoding/decoding, JSON formatting, QR codes, and simple classical ciphers.
TroveKit bundles them into a fast desktop app, aiming for:

- **Offline-first**: process data locally whenever possible
- **Fast workflow**: instant results (real-time updates supported)
- **Traceable**: operation logs + one-click copy
- **Cross-platform**: Windows / macOS / Linux

Built with [Tauri v2](https://v2.tauri.app/) + [React](https://react.dev/), TroveKit focuses on a local-first workflow.

## ✨ Highlights

- All-in-one utilities: Hash / AES / Encoders-Decoders / JSON / QR / Caesar cipher
- Modern UI: light/dark theme, responsive layout, smooth animations
- i18n: English / 简体中文 / 繁體中文（HK/TW）/ 日本語
- Logs & toasts: history, error feedback, copy buttons

## 🧰 Utilities

### 📷 QR Code Generator

- Generate QR codes from **Text / URL**
- Generate **Wi‑Fi QR codes** (SSID / password / encryption / hidden)
- Customize style: colors, error correction level, optional logo
- Export **PNG** (Unicode supported)

### 🔐 Classical Ciphers

- **Caesar Cipher**: encode/decode with configurable shift
- Non-letter handling: keep / ignore / shift ASCII (experimental; may produce non-printable characters)

### 🔒 Hash & Cryptography

- **MD5**: 16 / 32 chars, upper/lower case
- **SHA family**: SHA1 / SHA224 / SHA256 / SHA384 / SHA512 / SHA3
- **AES**: CBC / ECB / OFB / CFB / CTR

### 🔢 Encoders & Decoders

- Real-time URL / Base64 encode & decode
- Base32 / Hex(Base16) / Base58 / Base62 / Base91 / custom alphabets

### 📝 Formatters

- **JSON**: format, minify, validate, and tree view

### 🧾 Logs & Toasts

- Side panel for operation history
- Structured method/input/output view
- Error/success toasts + one-click copy

## 🗺️ Roadmap

- Formatters: XML / SQL / YAML
- Generators: UUID / Lorem Ipsum / random passwords, etc.

## 🎨 UI / UX

- **Theme**: Dark/Light mode with system sync
- **Visuals**: built with **HeroUI** and **TailwindCSS**
- **Animations**: powered by **Framer Motion**

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

- TroveKit is designed as a **local toolbox**: most utilities work offline.
- Inputs are primarily processed locally; if network features are added in the future, they should be clearly disclosed in the UI/README.

## 📂 Project Structure

```
TroveKit/
├── src-tauri/       # Rust backend and Tauri configuration
├── src/             # React frontend source code
│   ├── components/  # UI Components (Sidebar, LogPanel, Toast, etc.)
│   ├── contexts/    # Context Providers (LogContext, ToastContext)
│   ├── tools/       # Tool Views (Hash, Encoder, Formatter, QR, Classical, Settings)
│   ├── locales/     # i18n JSON files
│   ├── lib/         # Utilities (Base32, etc.)
│   └── styles/      # Global CSS
└── public/          # Static assets
```

## 🤝 Contributing

Issues and PRs are welcome:

- New utility ideas (more formatters/generators)
- Bug fixes and UI/UX improvements
- Copy & translation improvements (`src/locales/`)

## 📄 License

[MIT](LICENSE)
