# MemoHub PWA対応セットアップガイド

このガイドでは、MemoHubをPWA（Progressive Web App）としてiPhoneのホーム画面に追加できるようにする手順を説明します。

## 📁 ファイル一覧

```
pwa-files/
├── public/
│   ├── manifest.json      # PWAマニフェスト
│   └── sw.js              # Service Worker
├── src/
│   ├── lib/
│   │   └── pwa.ts         # PWAユーティリティ
│   ├── components/
│   │   └── IOSInstallPrompt.tsx  # iOSインストール案内
│   └── main.tsx           # 更新版エントリーポイント
├── scripts/
│   └── generate-icons.js  # アイコン生成スクリプト
├── index.html             # 更新版HTML
└── PWA_SETUP.md          # このファイル
```

## 🚀 セットアップ手順

### 1. ファイルをコピー

以下のファイルをプロジェクトにコピーしてください：

```bash
# manifest.jsonとsw.jsをpublicフォルダへ
cp pwa-files/public/manifest.json memo-hub/public/
cp pwa-files/public/sw.js memo-hub/public/

# pwa.tsをsrc/libフォルダへ
cp pwa-files/src/lib/pwa.ts memo-hub/src/lib/

# IOSInstallPromptをsrc/componentsフォルダへ
cp pwa-files/src/components/IOSInstallPrompt.tsx memo-hub/src/components/

# index.htmlを置き換え
cp pwa-files/index.html memo-hub/
```

### 2. main.tsxを更新

`src/main.tsx` を以下のように更新：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker, initPWAInstallPrompt } from './lib/pwa'

// Service Worker登録（本番環境のみ）
if (import.meta.env.PROD) {
  registerServiceWorker();
}

// PWAインストールプロンプト初期化
initPWAInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 3. App.tsxにiOSインストールプロンプトを追加

`src/App.tsx` に `IOSInstallPrompt` コンポーネントを追加：

```tsx
import { IOSInstallPrompt } from './components/IOSInstallPrompt';

function App() {
  return (
    <>
      {/* 既存のコンテンツ */}
      <IOSInstallPrompt />
    </>
  );
}
```

### 4. アイコン画像を生成

#### 方法A: スクリプトで生成（Node.js + canvas）

```bash
cd memo-hub
npm install canvas
node scripts/generate-icons.js
```

#### 方法B: オンラインツールで生成（推奨）

1. [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator) にアクセス
2. ベースとなる画像（512x512px以上）をアップロード
3. 生成されたアイコンをダウンロード
4. `public/icons/` フォルダに配置

#### 方法C: 手動で作成

以下のサイズのPNG画像を作成して `public/icons/` に配置：
- icon-16.png, icon-32.png
- icon-72.png, icon-96.png, icon-128.png
- icon-144.png, icon-152.png, icon-180.png
- icon-192.png, icon-384.png, icon-512.png

### 5. ビルド＆デプロイ

```bash
npm run build
firebase deploy
```

## 📱 iPhoneでの使い方

1. Safariで MemoHub を開く
2. 下部の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

これでホーム画面にMemoHubアイコンが追加され、アプリのように起動できます！

## ✨ PWAの機能

| 機能 | 対応状況 |
|------|----------|
| ホーム画面追加 | ✅ |
| フルスクリーン表示 | ✅ |
| オフラインキャッシュ | ✅（基本的なアセット） |
| スプラッシュスクリーン | ✅ |
| プッシュ通知 | ⚠️ iOS 16.4以降で一部対応 |

## 🔧 トラブルシューティング

### Service Workerが登録されない

- 開発環境（localhost）では自動的に無効化されています
- 本番環境にデプロイして確認してください

### アイコンが表示されない

- `public/icons/` フォルダにアイコンが正しく配置されているか確認
- `manifest.json` のパスが正しいか確認
- ブラウザのキャッシュをクリアして再読み込み

### ホーム画面に追加できない

- HTTPS環境でアクセスしているか確認（Firebase Hostingなら自動でHTTPS）
- Safariでアクセスしているか確認（ChromeやLINE内ブラウザでは制限あり）

## 🔜 今後の拡張

Capacitorを使えばApp Storeに公開可能なネイティブアプリ化もできます：

```bash
npm install @capacitor/core @capacitor/cli
npx cap init MemoHub com.example.memohub
npx cap add ios
npx cap open ios
```

詳細は [Capacitor公式ドキュメント](https://capacitorjs.com/docs) を参照してください。
