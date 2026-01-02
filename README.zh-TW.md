<div align="center">
<img src="app-icon.svg" width="48" height="48">
<h1>TroveKit</h1>

一個輕量、純離線的跨平台開發者工具箱。

[English](README.md) | [簡體中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | 繁體中文（台灣） | [日本語](README.ja.md)
</div>

<div align="center">
<img src="https://img.shields.io/badge/version-v0.1.6-blue" alt="Version">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
<img src="https://img.shields.io/badge/Windows-Supported-blue" alt="Windows">
<img src="https://img.shields.io/badge/macOS-Supported-blue" alt="macOS">
<img src="https://img.shields.io/badge/Linux-Supported-blue" alt="Linux">
</div>

![Home Dashboard](demo/home.png)

## 為什麼是 TroveKit

你可能經常需要這些「小工具」：雜湊、加解密、編碼、JSON 格式化、二維碼、簡單古典密碼……
TroveKit 把它們集中到一個桌面應用裡，盡量做到：

- **純離線**：所有資料處理都在本地
- **操作快**：輸入即見結果（支援即時更新）
- **可追溯**：帶操作日誌與一鍵複製
- **跨平台**：Windows / macOS / Linux

TroveKit 基於 [Tauri v2](https://v2.tauri.app/) + [React](https://react.dev/) 建構，主打純離線與高效體驗。

## ✨ 主要功能

- 多工具集合：Hash / AES / DES / RC4 / 編碼解碼 / JSON / 二維碼 / 凱撒密碼
- 現代 UI：深淺色主題、響應式佈局、順滑動畫
- 國際化：English / 簡體中文 / 繁體中文（HK/TW）/ 日本語
- 日誌與提示：操作記錄、錯誤提示、複製按鈕
- **狀態持久化**：自動保存工具狀態（防止誤觸丟失）

## 🧰 內建工具

### 📷 QR Code Generator（二維碼產生）

- 支援 **文字 / URL** 二維碼
- 支援 **Wi‑Fi 二維碼**（SSID / 密碼 / 加密方式 / 是否隱藏）
- 可調樣式：顏色、糾錯等級、可選 Logo
- 匯出 **PNG**（支援中文等 Unicode 內容）

### 🔐 Classical Ciphers（古典密碼）

- **Caesar Cipher（凱撒密碼）**：支援編碼 / 解碼、可設定位移
- **Morse Code（摩斯密碼）**：自訂配置（分隔符/長短碼）
- 非字母字元處理：保留 / 忽略 / 按 ASCII 位移（適合做實驗，但可能產生不可見字元）

### 🔒 Hash & Cryptography（雜湊與加解密）

- **MD5 / MD4 / MD2**：16 位元 / 32 位元，大小寫可選
- **SHA 家族**：SHA1 / SHA224 / SHA256 / SHA384 / SHA512 / SHA3
- **AES / DES / RC4**：支持多種模式與填充（支援 Hex/Base64 格式）

### 🔢 Encoders & Decoders（編碼與解碼）

- URL / Base64 即時編碼解碼
- Base32 / Hex(Base16) / Base58 / Base62 / Base91 / 自訂字母表

### 📝 Formatters（格式化）

- **JSON**：格式化 / 壓縮 / 驗證，並支援樹狀檢視

### 🧾 Logs & Toasts（操作日誌與提示）

- 側邊欄顯示操作歷史記錄，具有**基於會話的持久化（實驗性）**
- **即時自動儲存**：所有操作自動儲存到本地的 `.jsonl` 檔案中
- 支援**手動建立日誌會話**（新建日誌）
- 結構化的方法/輸入/輸出檢視
- 錯誤/成功提示 + 一鍵複製

## 🗺️ Roadmap

- Formatters：XML / SQL / YAML
- Generators：UUID / Lorem Ipsum / 隨機密碼等

## 📸 Screenshots

| Hash Tool | Encoder Tool |
|:---:|:---:|
| ![Hash Tool](demo/hash.png) | ![Encoder Tool](demo/encoder-decoder.png) |

| Operation Logs | Settings |
|:---:|:---:|
| ![Log Panel](demo/log-panel.png) | ![Settings](demo/settings.png) |

> 提示：QR / Caesar 的截圖會在後續補充到 demo 圖庫中。

## 🚀 Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Framework**: [HeroUI](https://www.heroui.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State & Logic**: [Framer Motion](https://www.framer.com/motion/), [i18next](https://www.i18next.com/), [crypto-js](https://cryptojs.gitbook.io/)
- **QR Rendering**: [qr-code-styling](https://www.npmjs.com/package/qr-code-styling)

## 🛠️ 快速開始（開發/運行）

### 依賴環境

- Node.js 18+
- pnpm
- Rust（stable）
- Tauri v2 依賴（不同系統要求略有差異；若首次建構失敗，請按 Tauri 官方文件安裝系統依賴）

### 安裝

1. Clone

   - 如果你是从 GitHub 克隆：把下面的地址替换为你自己的仓库地址即可。

   ```bash
   git clone <repo-url>
   cd trovekit
   ```

2. 安裝依賴

   ```bash
   pnpm install
   ```

### 本地開發運行

```bash
pnpm tauri dev
```

### 打包建構

```bash
pnpm tauri build
```

## 🔒 隱私說明（Privacy）

- TroveKit 的定位是 **純離線工具箱**：所有功能均可離線使用。
- 輸入內容在本地處理；不會向外部伺服器發送任何資料。

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

歡迎提交 Issue / PR：

- 新工具建議（例如更多格式化器/產生器）
- Bug 修復、UI/UX 改進
- 文案與翻譯優化（`src/locales/`）

## 📄 License

[MIT](LICENSE)