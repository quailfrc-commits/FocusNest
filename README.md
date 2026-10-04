# 專注小窩 FocusNest

FocusNest 是一套跨裝置專注與任務管理工具。使用者可以用 Gemini 將大任務拆成可執行的子任務，透過四象限與時間軸安排工作；手機橫放後開始專注，拿起時顯示提醒，網頁與 Windows 版會同步專注狀態。完成後可上傳成果照，並在每日回顧月曆中查看紀錄。

## 核心功能

- Gemini 任務拆解：產生子任務、完成條件與預估時間
- 四象限與甘特時間軸：支援拖曳分類與水平捲動
- 手機感測專注：橫放開始、拿起提醒、放回後繼續
- 跨裝置同步：Android、Web 與 Windows 共用帳號和專注狀態
- 成果照片與每日回顧：依日期保存打卡紀錄
- 寵物日記：由 Gemini 根據當日成果產生日記
- 遊戲化成長：等級、代幣、外觀與鳥窩

## 技術架構

| 層級 | 技術 | 用途 |
|---|---|---|
| 前端 | React、Vite | Web 共用介面與互動邏輯 |
| Android | Capacitor | 包裝 Web 前端並取得裝置方向資訊 |
| Windows | Electron | 桌面應用程式 |
| 後端 | Node.js、Express | 登入、同步、即時專注狀態與 Gemini 呼叫 |
| 資料庫 | PostgreSQL | 帳號、任務與成果紀錄 |
| 生成式 AI | Google Gemini API | 任務拆解與寵物日記 |

## 專案結構

```text
FocusNest/
├─ client/   React、Vite、Capacitor Android
├─ server/   Node.js、Express、PostgreSQL、Gemini
└─ desktop/  Electron Windows 外殼
```

## 環境需求

- Node.js 22
- PostgreSQL 17
- Android 建置：JDK 21 與 Android SDK

## 下載安裝包

已清理敏感設定的 Android APK、Windows x64 壓縮包與 SHA-256 校驗值，請至 [v0.7-public Release](https://github.com/quailfrc-commits/FocusNest/releases/tag/v0.7-public) 下載。

Release 內的 APK 與 Windows 壓縮包是前端用戶端。跨裝置同步、帳號資料與 Gemini 功能仍需另外啟動本儲存庫的 Node.js 後端、PostgreSQL，並自行設定 Gemini API Key；只下載用戶端不會自動取得雲端同步或 AI 功能。

## 安裝

```bash
cd server
npm install

cd ../client
npm install

cd ../desktop
npm install
```

建立 PostgreSQL 資料庫後，將 `server/.env.example` 複製為 `server/.env`，再填入自己的資料庫連線與 Gemini API Key。

```env
PORT=3000
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/focusnest
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-flash-latest
GEMINI_BACKUP_MODELS=gemini-flash-lite-latest
ALLOW_DEMO=1
```

`.env`、API Key、密碼、登入憑證、個人資料與真實成果照片都不應提交到版本控制。

## 啟動 Web 與後端

```bash
cd client
npm run build

cd ../server
npm start
```

電腦可透過 `http://localhost:3000` 使用。手機需與後端位於同一網路，並在 App 登入頁輸入後端位址；此儲存庫不包含任何開發者的真實區網 IP。

## 開發模式

```bash
cd client
npm run dev
```

## 建置 Android

```bash
cd client
npm run build:android

cd android
./gradlew.bat assembleDebug
```

輸出位置：`client/android/app/build/outputs/apk/debug/app-debug.apk`

## 建置 Windows

```bash
cd client
npm run build:desktop

cd ../desktop
npm run pack
```

輸出位置：`desktop/release/FocusNest-win32-x64/`

## 隱私與展示資料

公開版本不包含：

- Gemini API Key 與資料庫密碼
- 開發環境的區網 IP
- 展示帳號的資料庫備份、登入 Token 與密碼雜湊
- 使用者成果照片與問卷原始資料
- 儲存庫歷史中的 APK、Windows 執行檔、`node_modules` 或其他建置產物；公開安裝包僅透過 GitHub Releases 提供

程式內的展示帳號與範例任務只供功能示範，不代表真實使用者資料。

## 技術驗證

為避免把使用者感受與系統穩定性混在一起，GitHub 提供 [`docs/technical-test-evidence.md`](docs/technical-test-evidence.md) 空白測試範本。範本中的「待測／待填」不是已完成的測試結果，只有實際執行後才能填入數字。

## 公開資料說明

- [`docs/references.md`](docs/references.md)：競品比較與理論文獻來源
- [`docs/versioning.md`](docs/versioning.md)：公開發行標籤、Android 原生版號與安裝包關係
- [`docs/asset-notices.md`](docs/asset-notices.md)：美術素材來源與第三方授權範圍

## 競賽說明

本專案為 2026 大專校院資訊應用服務創新競賽參賽作品。儲存庫公開核心實作與可重現的建置流程，供評審檢視技術架構與功能完整性。

