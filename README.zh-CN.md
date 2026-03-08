<div align="center">
<img src="app-icon.svg" width="48" height="48">
<h1>TroveKit</h1>

一个开源、轻量、完全离线、跨平台的工具箱。

[English](README.md) | 简体中文 | [繁體中文（香港）](README.zh-HK.md) | [繁體中文（台灣）](README.zh-TW.md) | [日本語](README.ja.md)
</div>

<div align="center">
<a href="https://github.com/1595901624/trovekit/releases"><img src="https://img.shields.io/badge/version-v0.2.4-blue" alt="Version"></a>
<a href="https://github.com/1595901624/trovekit/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
<img src="https://img.shields.io/badge/Windows-Supported-blue" alt="Windows">
<img src="https://img.shields.io/badge/macOS-Supported-blue" alt="macOS">
<img src="https://img.shields.io/badge/Linux-Supported-blue" alt="Linux">
</div>

![Home Dashboard](demo/home.png)

## 为什么是 TroveKit

你可能经常需要这些"小工具"：哈希、加解密、编码、JSON 格式化、二维码、简单古典密码……
TroveKit 把它们集中到一个桌面应用里，尽量做到：

- **纯离线**：所有数据处理都在本地
- **操作快**：输入即见结果（支持实时更新）
- **可追溯**：带操作日志与一键复制
- **跨平台**：Windows 10/11（32 位和 64 位）、macOS 10.13+（Intel 与 Apple Silicon）、Linux 桌面（推荐 Ubuntu 24.04 x64/arm，需 WebKit2GTK ≥4.1）。

TroveKit 基于 [Tauri v2](https://v2.tauri.app/) + [React](https://react.dev/) 构建，主打纯离线与高效体验。

## ✨ 主要功能

- 多工具集合：Hash / AES / DES / RC4 / 编码解码 / JSON / XML / YAML / **转换器** / 二维码 / 凯撒密码 / **日志管理**
- 现代 UI：深浅色主题、响应式布局、顺滑动画
- **全局功能搜索**：快速查找并导航到应用中的各种工具和功能。
- **可收起侧边栏**：支持侧边栏折叠以最大化工作空间，并自动记忆状态。
- **增强国际化**：English / 简体中文 / 繁體中文（HK/TW）/ 日本語，优化文字大小与翻译质量
- 日志与提示：操作记录、错误提示、复制按钮，支持**备注功能**
- **状态持久化**：自动保存工具配置与内容（防止误触丢失）
- **正则工具**：新增实时正则测试，支持语法高亮、匹配组显示与标志（flags）设置（已在 v0.2.4 中加入）。

## 🧰 内置工具

### 📷 QR Code Generator（二维码生成）

- 支持 **文本 / URL** 二维码
- 支持 **Wi‑Fi 二维码**（SSID / 密码 / 加密方式 / 是否隐藏）
- 可调样式：颜色、纠错等级、可选 Logo
- 导出 **PNG**（支持中文等 Unicode 内容）

### 🔐 Classical Ciphers（古典密码）

- **Bacon Cipher（培根密码）**：支持标准（26字母）或传统（24字母）字母表，支持多种符号模式（A/B, 0/1等）
- **Caesar Cipher（凯撒密码）**：支持编码 / 解码、可设置位移
- **Morse Code（摩斯密码）**：自定义配置（分隔符/长短码）
- 非字母字符处理：保留 / 忽略 / 按 ASCII 位移（适合做实验，但可能产生不可见字符）

### 🔒 Hash & Cryptography（哈希与加解密）

- **MD5 / MD4 / MD2**：16 位 / 32 位，大小写可选
- **HMAC-MD5**：基于 HMAC 的 MD5 哈希算法支持
- **SHA 家族**：SHA1 / SHA224 / SHA256 / SHA384 / SHA512 / SHA3
- **AES / DES / RC4**：支持多种模式与填充（Hex/Base64 格式）

### 🔢 Encoders & Decoders（编码与解码）

- URL / Base64 实时编码解码
- **Hex**：支持编码/解码，可配置换行模式（LF/CRLF）
- Base32 / Hex(Base16) / Base58 / Base62 / Base91 / 自定义字母表

### 📝 Formatters（格式化）

- **JSON**：格式化 / 压缩 / 树形查看
- **XML**：格式化 / 压缩
- **CSS**：格式化 / 压缩
- **SQL**：格式化 / 压缩，支持多种 SQL 方言（MySQL、PostgreSQL、SQLite、T-SQL 等）

### 🔄 Converters（转换器）

- **时间戳转换**：支持日期与时间戳（秒/毫秒/微秒/纳秒）双向转换，提供实时高精度系统时钟。
- **网段计算**：支持 IPv4 CIDR 与子网掩码转换，计算网络地址、广播地址、主机范围和主机数。
- **JSON ↔ XML**：双向转换，实时处理
- **JSON ↔ YAML**：双向转换，实时处理
- 多种格式语法高亮
- 示例数据支持，快速测试
- 错误验证与友好提示

### 🧾 Logs & Toasts（操作日志与提示）

- 侧边栏记录历史操作，并支持 **Session 级持久化（实验性）**
- **实时自动保存**：所有操作记录自动保存为本地 **SQLite 数据库**
- 支持 **手动开启新日志记录**（New Log）
- **备注功能**：可为日志条目添加注释/备注，便于更好地记录上下文和文档
- **会话备注编辑**：可为日志会话添加和编辑备注
- **增强日志交互**：尾随空白字符使用视觉标记（`·`, `→`, `↵`）高亮显示，并提供描述性提示
- **重构日志管理工具**：全新的 **Master-Detail 布局** 界面，用于查看、搜索和管理所有已保存的日志。支持 **删除单个条目和整个会话**
- **UUID 生成优化日志**：显示生成的 UUID 及其配置格式（String/Hex/Base64/Binary）、大小写、短横线设置。日志中显示数量和格式详情，最多显示 10 个 UUID，超出时有明确提示
- 方法、输入、输出结构化展示
- 错误/成功提示 + 一键复制

## 🗺️ Roadmap

- Formatters：YAML
- Generators：Lorem Ipsum / 随机密码等

- 文本对比：并排与内联文本差异比较，支持忽略空白与按词差异。
- 常用工具：文本常用工具（大小写转换、换行符规范化、空白清理等）。

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
- **XML Processing**: [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)

## 🎨 UI / UX

- **Theme**：深浅色主题，支持系统同步
- **Visuals**：基于 **HeroUI** 与 **TailwindCSS** 构建
- **Animations**：由 **Framer Motion** 驱动
- **优化文字大小**：提升所有工具与语言下的可读性

## 🛠️ 快速开始（开发/运行）

### 依赖环境

- Node.js 18+
- pnpm
- Rust（stable）
- Tauri v2 依赖（不同系统要求略有差异；若首次构建失败，请按 Tauri 官方文档安装系统依赖）。Linux 需要安装 WebKit2GTK 4.1 或更高版本（Ubuntu 24.04 自带）。

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

- TroveKit 的定位是 **纯离线工具箱**：所有功能均可离线使用。
- 输入内容在本地处理；不会向外部服务器发送任何数据。

## 📂 Project Structure

```
TroveKit/
├── src-tauri/       # Rust backend and Tauri configuration
├── src/             # React frontend source code
│   ├── components/  # UI Components (Sidebar, LogPanel, Toast, etc.)
│   ├── contexts/    # Context Providers (LogContext)
│   ├── tools/       # Tool Views (Hash, Encoder, Formatter, Converter, QR, Classical, Settings)
│   │   ├── converter/  # JSON/XML converter
│   │   └── ...     # Other tool directories
│   ├── locales/     # i18n JSON files
│   ├── lib/         # Utilities (Base32, etc.)
│   └── styles/      # Global CSS
└── public/          # Static assets
```

## 🤝 Contributing

欢迎提交 Issue / PR：

- 新工具建议（例如更多格式化器/生成器/转换器）
- Bug 修复、UI/UX 改进
- 文案与翻译优化（`src/locales/`）

## 📄 License

[MIT](LICENSE)
