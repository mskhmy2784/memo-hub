# NoteDetailPage Word出力機能追加

## 概要
NoteDetailPage（メモ詳細ページ）にエクスポート機能を追加しました。
既存のテキスト/Markdown/PDF形式に加え、Word (.docx) 形式でのエクスポートに対応しています。

## 変更ファイル

### 1. src/pages/NoteDetailPage.tsx
**新規追加された機能：**
- 3点メニュー（MoreVertical）からアクセスできるエクスポートメニュー
- サブメニュー形式で以下の形式に対応：
  - テキスト (.txt)
  - Markdown (.md)
  - PDF (.pdf) - ブラウザ印刷機能を使用
  - Word (.docx) - docxライブラリを使用

**インポート追加：**
```typescript
import { MoreVertical, Download, FileText, FileCode, FileType, ChevronRight } from 'lucide-react';
import { exportSingleNoteToWord } from '../utils/exportToWord';
```

**状態追加：**
```typescript
const [showMenu, setShowMenu] = useState(false);
const [showExportMenu, setShowExportMenu] = useState(false);
```

**エクスポート関数：**
- `handleExportText()` - テキスト形式でダウンロード
- `handleExportMarkdown()` - Markdown形式でダウンロード
- `handleExportPDF()` - 新しいウィンドウで印刷ダイアログを表示
- `handleExportWord()` - Word形式でダウンロード

### 2. src/utils/exportToWord.ts
**新規追加された関数：**
```typescript
export const exportSingleNoteToWord = async (note: {...}): Promise<void>
```
- NoteDetailPage用の単一メモWord出力関数
- 既存の`exportToWord`関数を内部で使用
- タイトル、カテゴリパス、タグ、重要度、お気に入り、日時、URL、本文を含む

## UI仕様
1. ヘッダー右側に3点メニューボタン（MoreVertical）を配置
2. クリックでドロップダウンメニューを表示
3. 「エクスポート」をホバー/クリックでサブメニュー展開
4. 各エクスポート形式をクリックでダウンロード開始

## インストール

Word出力機能を使用するために、docxパッケージをインストールしてください：

```bash
npm install docx file-saver
npm install -D @types/file-saver
```

## 適用手順

1. `src/pages/NoteDetailPage.tsx` を上書きコピー
2. `src/utils/exportToWord.ts` を上書きコピー
3. 依存パッケージをインストール（まだの場合）
4. ビルド確認: `npm run build`
5. デプロイ: `firebase deploy --only hosting`

## テスト方法

1. アプリを起動
2. 任意のメモの詳細ページを開く
3. 右上の3点メニュー（⋮）をクリック
4. 「エクスポート」にカーソルを合わせる
5. 各形式（テキスト/Markdown/PDF/Word）をクリック
6. ファイルがダウンロードされることを確認
