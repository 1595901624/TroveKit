<div align="center">
<img src="app-icon.svg" width="48" height="48">
<h1>TroveKit</h1>
</div>

![Version](https://img.shields.io/badge/version-v0.1.5-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![Windows](https://img.shields.io/badge/Windows-Supported-blue) ![macOS](https://img.shields.io/badge/macOS-Supported-blue) ![Linux](https://img.shields.io/badge/Linux-Supported-blue)


**TroveKit** 是一个现代、跨平台的开发者工具箱（离线优先），基于 [Tauri v2](https://v2.tauri.app/) + [React](https://react.dev/) 构建。
它把常用的小工具集中到一个轻量桌面应用里：**界面清爽、响应迅速、数据尽量只在本地处理**。

**TroveKit** is a modern, cross-platform, offline-first developer toolbox built with [Tauri v2](https://v2.tauri.app/) and [React](https://react.dev/).
It bundles everyday utilities into one fast desktop app with a clean UI and local-first workflows.

![Home Dashboard](demo/home.png)

## ✨ Features

### 🧰 Current Utilities

- **📷 QR Code Generator**
  - Generate QR codes from **Text / URL**.
  - Generate **Wi‑Fi QR codes** (SSID / password / encryption / hidden).
  - Customize **colors**, **error correction level**, and add an optional **logo**.
  - Export as **PNG** (supports Unicode such as Chinese via UTF‑8 encoding).

- **🔐 Classical Ciphers**
  - **Caesar Cipher** encode/decode with configurable shift.
  - Flexible handling for non-letter characters (keep / ignore / shift ASCII).

- **🔒 Hash & Cryptography**
  - **MD5**: Support for 16-bit and 32-bit hashes with customizable case (Upper/Lower).
  - **SHA Family**: Support for SHA1, SHA224, SHA256, SHA384, SHA512, and SHA3.
  - **AES**: Support for CBC, ECB, OFB, CFB, and CTR modes.
  - *More algorithms coming soon!*

- **🔢 Encoders & Decoders**
  - **Common**: Real-time URL and Base64 encoding/decoding.
  - **Advanced**: Base32, Hex (Base16), Base58, Base62, Base91, and custom alphabets.

- **📝 Formatters**
  - **JSON**: Format, compress, validate, and visualize JSON in tree structure.

- **🧾 Operation Logs & Toasts**
  - Built-in side panel to track operation history.
  - Structured view for methods, inputs, and outputs.
  - Toast notifications for errors/success, plus one-click copy.

### 🚀 Coming Soon
- **Formatters**: Prettify and validate XML, SQL, and YAML.
- **Generators**: UUIDs, Lorem Ipsum text, Random Passwords, and more.

### 🎨 Modern UI/UX
- **Theme**: Dark/Light mode support with system sync.
- **Visuals**: Clean interface built with **HeroUI** and **TailwindCSS**.
- **Animations**: Smooth transitions powered by **Framer Motion**.

### 🌍 Internationalization
- **Languages**: English, Simplified Chinese (简体中文), Traditional Chinese (繁體中文 - HK/TW), and Japanese (日本語).

## 📸 Screenshots

| Hash Tool | Encoder Tool |
|:---:|:---:|
| ![Hash Tool](demo/hash.png) | ![Encoder Tool](demo/encoder-decoder.png) |

| Operation Logs | Settings |
|:---:|:---:|
| ![Log Panel](demo/log-panel.png) | ![Settings](demo/settings.png) |

> Note: QR / Caesar screenshots will be added as the demo gallery expands.

## 🚀 Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Framework**: [HeroUI](https://www.heroui.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State & Logic**: [Framer Motion](https://www.framer.com/motion/), [i18next](https://www.i18next.com/), [crypto-js](https://cryptojs.gitbook.io/)
- **QR Rendering**: [qr-code-styling](https://www.npmjs.com/package/qr-code-styling)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (Latest Stable)
- [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/trovekit.git
   cd trovekit
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run in development mode**
   ```bash
   pnpm tauri dev
   ```

4. **Build for production**
   ```bash
   pnpm tauri build
   ```

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

## 📄 License

[MIT](LICENSE)
