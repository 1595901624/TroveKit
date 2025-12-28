<div align="center">
<img src="app-icon.svg" width="48" height="48">
<h1>TroveKit</h1>

一个轻量、离线优先的跨平台开发者工具箱。

[English](README.md) | 简体中文
</div>

<div align="center">
<img src="https://img.shields.io/badge/version-v0.1.5-blue" alt="Version">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
<img src="https://img.shields.io/badge/Windows-Supported-blue" alt="Windows">
<img src="https://img.shields.io/badge/macOS-Supported-blue" alt="macOS">
<img src="https://img.shields.io/badge/Linux-Supported-blue" alt="Linux">
</div>

![Home Dashboard](demo/home.png)

## 为什么是 TroveKit

你可能经常需要这些“小工具”：哈希、加解密、编码、JSON 格式化、二维码、简单古典密码……
TroveKit 把它们集中到一个桌面应用里，尽量做到：

- **离线优先**：能本地算的就本地算
- **操作快**：输入即见结果（支持实时更新）
- **可追溯**：带操作日志与一键复制
- **跨平台**：Windows / macOS / Linux

TroveKit 基于 [Tauri v2](https://v2.tauri.app/) + [React](https://react.dev/) 构建，主打本地优先与高效体验。

## ✨ 主要功能

- 多工具集合：Hash / AES / 编码解码 / JSON / 二维码 / 凯撒密码
- 现代 UI：深浅色主题、响应式布局、顺滑动画
- 国际化：English / 简体中文 / 繁體中文（HK/TW）/ 日本語
- 日志与提示：操作记录、错误提示、复制按钮

## 🧰 内置工具

### 📷 QR Code Generator（二维码生成）

- 支持 **文本 / URL** 二维码
- 支持 **Wi‑Fi 二维码**（SSID / 密码 / 加密方式 / 是否隐藏）
- 可调样式：颜色、纠错等级、可选 Logo
- 导出 **PNG**（支持中文等 Unicode 内容）

### 🔐 Classical Ciphers（古典密码）

- **Caesar Cipher（凯撒密码）**：支持编码 / 解码、可设置位移
- 非字母字符处理：保留 / 忽略 / 按 ASCII 位移（适合做实验，但可能产生不可见字符）

### 🔒 Hash & Cryptography（哈希与加解密）

- **MD5**：16 位 / 32 位，大小写可选
- **SHA 家族**：SHA1 / SHA224 / SHA256 / SHA384 / SHA512 / SHA3
- **AES**：CBC / ECB / OFB / CFB / CTR

### 🔢 Encoders & Decoders（编码与解码）

- URL / Base64 实时编码解码
- Base32 / Hex(Base16) / Base58 / Base62 / Base91 / 自定义字母表

### 📝 Formatters（格式化）

- **JSON**：格式化 / 压缩 / 校验，并支持树形查看

### 🧾 Logs & Toasts（操作日志与提示）

- 侧边栏记录历史操作
- 方法、输入、输出结构化展示
- 错误/成功提示 + 一键复制

## 🗺️ Roadmap

- Formatters：XML / SQL / YAML
- Generators：UUID / Lorem Ipsum / 随机密码等

## 📸 Screenshots

| Hash Tool | Encoder Tool |
|:---:|:---:|
| ![Hash Tool](demo/hash.png) | ![Encoder Tool](demo/encoder-decoder.png) |

| Operation Logs | Settings |
|:---:|:---:|
| ![Log Panel](demo/log-panel.png) | ![Settings](demo/settings.png) |

> 提示：QR / Caesar 的截图会在后续补充到 demo 图库中。

## 🚀 Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Framework**: [HeroUI](https://www.heroui.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State & Logic**: [Framer Motion](https://www.framer.com/motion/), [i18next](https://www.i18next.com/), [crypto-js](https://cryptojs.gitbook.io/)
- **QR Rendering**: [qr-code-styling](https://www.npmjs.com/package/qr-code-styling)

## 🛠️ 快速开始（开发/运行）

### 依赖环境

- Node.js 18+
- pnpm
- Rust（stable）
- Tauri v2 依赖（不同系统要求略有差异；若首次构建失败，请按 Tauri 官方文档安装系统依赖）

### 安装

1. Clone

   - 如果你是从 GitHub 克隆：把下面的地址替换为你自己的仓库地址即可。

   ```bash
   git clone <repo-url>
   cd trovekit
   ```

2. 安装依赖

   ```bash
   pnpm install
   ```

### 本地开发运行

```bash
pnpm tauri dev
```

### 打包构建

```bash
pnpm tauri build
```

## 🔒 隐私说明（Privacy）

- TroveKit 的定位是 **本地工具箱**：绝大多数功能可离线使用。
- 输入内容主要在本地处理；若未来新增需要联网的能力，建议在 README/界面中明确提示。

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

欢迎提交 Issue / PR：

- 新工具建议（例如更多格式化器/生成器）
- Bug 修复、UI/UX 改进
- 文案与翻译优化（`src/locales/`）

## 📄 License

[MIT](LICENSE)
