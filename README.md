# <img src="app-icon.svg" align="center" width="48" height="48"> TroveKit

![Version](https://img.shields.io/badge/version-v0.1.0-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![React](https://img.shields.io/badge/React-19-blue)

**TroveKit** is a modern, cross-platform developer toolbox built with [Tauri v2](https://v2.tauri.app/) and [React](https://react.dev/). It provides a suite of essential utilities wrapped in a beautiful, responsive user interface designed for efficiency, privacy, and offline use.

![Home Dashboard](demo/home.png)

## ✨ Features

### 🛠️ Current Utilities

- **🔒 Hash & Cryptography**
  - **MD5**: Support for 16-bit and 32-bit hashes with customizable case (Upper/Lower).
  - **SHA Family**: Support for SHA1, SHA224, SHA256, SHA384, SHA512, and SHA3.
  - *More algorithms coming soon!*

- **🔢 Encoders & Decoders**
  - **Common**: Real-time URL and Base64 encoding/decoding.
  - **Advanced**: Base32, Hex (Base16).
  - *Coming Soon: Base58, Base62, Base85, Base91, and custom alphabets.*

- **📝 Operation Logs**
  - Integrated side-panel to track history.
  - Structured view for methods, inputs, and outputs.
  - **Error Toast Notifications**: Immediate visual feedback for failed operations.
  - One-click copy functionality.

### 🚀 Coming Soon
- **Formatters**: Prettify and validate JSON, XML, SQL, and YAML.
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

## 🚀 Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Framework**: [HeroUI](https://www.heroui.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State & Logic**: [Framer Motion](https://www.framer.com/motion/), [i18next](https://www.i18next.com/), [crypto-js](https://cryptojs.gitbook.io/)

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
│   ├── tools/       # Tool Views (HashTool, EncoderTool, Settings)
│   ├── locales/     # i18n JSON files
│   ├── lib/         # Utilities (Base32, etc.)
│   └── styles/      # Global CSS
└── public/          # Static assets
```

## 📄 License

[MIT](LICENSE)
