# MemoHub - メモ管理Webツール

URLとメモを一元管理できるWebアプリケーションです。

## 機能

- 🔐 **Google認証**: 安全なログイン
- 📁 **カテゴリ管理**: 仕事/プライベートのメインカテゴリ + サブカテゴリ
- 🏷️ **タグ付け**: 自由なタグで分類
- ⭐ **お気に入り**: よく使うメモに即アクセス
- 🔍 **検索・フィルタ**: タイトル、メモ、URLで検索
- 📤 **エクスポート**: JSON形式でダウンロード
- 📱 **レスポンシブ**: PC/タブレット/スマホ対応

## セットアップ

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力して作成

### 2. Firebase Authenticationの設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで「Google」を有効化
4. プロジェクトのサポートメールを設定して保存

### 3. Cloud Firestoreの設定

1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. 「本番モード」を選択（後でルールを設定）
4. リージョンを選択（asia-northeast1 推奨）

### 4. Firestoreセキュリティルールの設定

Firestoreの「ルール」タブで以下を設定:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Webアプリの登録

1. プロジェクト設定（⚙️アイコン）を開く
2. 「全般」タブの「マイアプリ」セクションで「</>」をクリック
3. アプリのニックネームを入力して登録
4. 表示されるFirebase設定をコピー

### 6. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルにFirebaseの設定値を入力:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 7. 開発サーバーの起動

```bash
npm install
npm run dev
```

## デプロイ (Firebase Hosting)

### 1. Firebase CLIのインストール

```bash
npm install -g firebase-tools
firebase login
```

### 2. Firebase初期化

```bash
firebase init hosting
```

- 「Use an existing project」を選択
- public directory: `dist`
- Single-page app: `Yes`
- GitHub deploys: お好みで

### 3. ビルド & デプロイ

```bash
npm run build
firebase deploy --only hosting
```

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **バックエンド**: Firebase (Auth + Firestore)
- **ホスティング**: Firebase Hosting

## ディレクトリ構成

```
src/
├── components/     # UIコンポーネント
├── hooks/          # カスタムフック
├── lib/            # ライブラリ設定
├── pages/          # ページコンポーネント
├── stores/         # Zustand ストア
├── types/          # TypeScript 型定義
├── App.tsx
├── main.tsx
└── index.css
```

## ライセンス

MIT
