# TroveKit

TroveKit is a modern, cross-platform developer toolbox built with [Tauri v2](https://v2.tauri.app/) and [React](https://react.dev/). It provides a suite of essential utilities wrapped in a beautiful, responsive user interface designed for efficiency.

## ✨ Features

- **🛠️ Essential Tools**
  - **Hash Generator**: Support for MD5 (16/32-bit), SHA1, SHA256, and SHA512 with toggleable case sensitivity.
  - **Encoders / Decoders**: Real-time URL and Base64 encoding/decoding utilities.
- **📝 Operation Logs**
  - Integrated logging panel to track your recent actions.
  - Structured data view with distinct styling for Methods, Inputs, and Outputs.
  - One-click copy functionality for quick access to results.
- **🎨 Modern UI/UX**
  - Clean, accessible interface built with **HeroUI** and **TailwindCSS**.
  - Smooth transitions and animations powered by **Framer Motion**.
  - **Dark/Light Mode** support with persistent settings.
- **🌍 Internationalization**
  - Multi-language support including English, Simplified Chinese (Zh-CN), Traditional Chinese (Zh-HK/TW), and Japanese.

## 🚀 Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [HeroUI](https://www.heroui.com/)
- **Utilities**: [crypto-js](https://cryptojs.gitbook.io/), [i18next](https://www.i18next.com/), [Lucide React](https://lucide.dev/)

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [pnpm](https://pnpm.io/) (recommended package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/trovekit.git
   cd trovekit
   ```

2. Install frontend dependencies:
   ```bash
   pnpm install
   ```

### Development

Start the application in development mode with hot-reloading:

```bash
pnpm tauri dev
```

This will start the Vite server and launch the Tauri window.

### Build

To build the application for production (creates an installer/executable):

```bash
pnpm tauri build
```

 The output will be located in `src-tauri/target/release/bundle`.

## 📂 Project Structure

```
TroveKit/
├── src-tauri/       # Rust backend and Tauri configuration
├── src/             # React frontend source code
│   ├── components/  # Reusable UI Components (Layout, Sidebar, LogPanel, etc.)
│   ├── contexts/    # React Context providers (LogContext)
│   ├── tools/       # Main utility views (HashTool, EncoderTool, Settings)
│   ├── locales/     # i18n JSON translation files
│   ├── lib/         # Shared utility functions and configurations
│   └── styles/      # Global CSS and Tailwind directives
└── public/          # Static assets (Icons, Logos)
```

## 📄 License

[MIT](LICENSE)