import { useCallback } from 'react';
import { format } from 'date-fns';
import type { Note } from '../types';

export interface ExportOptions {
  format: 'txt' | 'md' | 'pdf';
  includeCategory: boolean;
  includeTags: boolean;
  includeCreatedAt: boolean;
  includeUpdatedAt: boolean;
  includeUrls: boolean;
  fileName: string;
}

export interface ExportContext {
  categoryPath: string;
  tagNames: string[];
}

// 画像URLをダミーテキストに置換
const replaceImagesWithPlaceholder = (content: string): string => {
  return content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '<<画像>>');
};

// テキスト形式に変換
const toPlainText = (
  note: Note,
  options: ExportOptions,
  context: ExportContext
): string => {
  const lines: string[] = [];

  lines.push(note.title);
  lines.push('='.repeat(note.title.length * 2));
  lines.push('');

  const metaLines: string[] = [];
  if (options.includeCategory && context.categoryPath) {
    metaLines.push(`カテゴリ: ${context.categoryPath}`);
  }
  if (options.includeTags && context.tagNames.length > 0) {
    metaLines.push(`タグ: ${context.tagNames.map(t => `#${t}`).join(' ')}`);
  }
  if (options.includeCreatedAt) {
    metaLines.push(`作成日: ${format(note.createdAt, 'yyyy-MM-dd HH:mm')}`);
  }
  if (options.includeUpdatedAt) {
    metaLines.push(`更新日: ${format(note.updatedAt, 'yyyy-MM-dd HH:mm')}`);
  }

  if (metaLines.length > 0) {
    lines.push(...metaLines);
    lines.push('');
    lines.push('-'.repeat(40));
    lines.push('');
  }

  const contentWithPlaceholder = replaceImagesWithPlaceholder(note.content);
  lines.push(contentWithPlaceholder);

  if (options.includeUrls && note.urls && note.urls.length > 0) {
    lines.push('');
    lines.push('-'.repeat(40));
    lines.push('');
    lines.push('関連URL:');
    note.urls.forEach((urlInfo, index) => {
      const title = urlInfo.title || urlInfo.url;
      lines.push(`${index + 1}. ${title}`);
      if (urlInfo.title) {
        lines.push(`   ${urlInfo.url}`);
      }
    });
  }

  return lines.join('\n');
};

// Markdown形式に変換
const toMarkdown = (
  note: Note,
  options: ExportOptions,
  context: ExportContext
): string => {
  const lines: string[] = [];

  lines.push(`# ${note.title}`);
  lines.push('');

  const metaLines: string[] = [];
  if (options.includeCategory && context.categoryPath) {
    metaLines.push(`**カテゴリ**: ${context.categoryPath}`);
  }
  if (options.includeTags && context.tagNames.length > 0) {
    metaLines.push(`**タグ**: ${context.tagNames.map(t => `\`#${t}\``).join(' ')}`);
  }
  if (options.includeCreatedAt) {
    metaLines.push(`**作成日**: ${format(note.createdAt, 'yyyy-MM-dd HH:mm')}`);
  }
  if (options.includeUpdatedAt) {
    metaLines.push(`**更新日**: ${format(note.updatedAt, 'yyyy-MM-dd HH:mm')}`);
  }

  if (metaLines.length > 0) {
    lines.push(...metaLines);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const contentWithPlaceholder = replaceImagesWithPlaceholder(note.content);
  lines.push(contentWithPlaceholder);

  if (options.includeUrls && note.urls && note.urls.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 関連URL');
    lines.push('');
    note.urls.forEach((urlInfo) => {
      const title = urlInfo.title || urlInfo.url;
      lines.push(`- [${title}](${urlInfo.url})`);
    });
  }

  return lines.join('\n');
};

// ファイルをダウンロード
const downloadFile = (content: string | Blob, fileName: string, mimeType: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// MarkdownをHTMLに変換（PDF用 - 画像を含む）
const markdownToHtml = (markdown: string): string => {
  let html = markdown;

  // コードブロック（先に処理）
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;font-size:9pt;"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // 見出し
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:11pt;font-weight:bold;margin:16px 0 8px;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:12pt;font-weight:bold;margin:16px 0 8px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:13pt;font-weight:bold;margin:16px 0 8px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:14pt;font-weight:bold;margin:16px 0 8px;">$1</h1>');

  // 画像（PDFでは実際に表示）
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:12px 0;border-radius:6px;">');

  // リンク
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0066cc;">$1</a>');

  // 太字・斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // インラインコード
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:9pt;">$1</code>');

  // リスト
  html = html.replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin:8px 0;padding-left:24px;">$&</ul>');

  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #ddd;padding-left:12px;margin:8px 0;color:#666;">$1</blockquote>');

  // 改行
  html = html.replace(/\n/g, '<br>');

  // 連続した<br>を段落として整理
  html = html.replace(/(<br>){3,}/g, '<br><br>');

  return html;
};

// HTMLエスケープ
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// PDF生成（ブラウザ印刷機能を使用）
const generatePdfViaPrint = (
  note: Note,
  options: ExportOptions,
  context: ExportContext,
  fileName: string
): void => {
  const styles = `
    <style>
      @media print {
        body { margin: 0; padding: 15mm; }
        @page { margin: 10mm; size: A4; }
        .no-print { display: none !important; }
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
        font-size: 11pt;
        line-height: 1.8;
        color: #333;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px;
        background: white;
      }
      h1 {
        font-size: 18pt;
        font-weight: bold;
        border-bottom: 2px solid #333;
        padding-bottom: 8px;
        margin: 0 0 16px 0;
      }
      .meta {
        background: #f5f5f5;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 9pt;
      }
      .meta p { 
        margin: 4px 0; 
      }
      .meta strong { 
        color: #555;
        display: inline-block;
        min-width: 70px;
      }
      .divider {
        border: none;
        border-top: 1px solid #ddd;
        margin: 16px 0;
      }
      .content {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 11pt;
        line-height: 1.8;
      }
      .urls {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #ddd;
      }
      .urls h2 {
        font-size: 12pt;
        font-weight: bold;
        margin: 0 0 12px 0;
      }
      .urls ul { 
        list-style: none; 
        padding: 0; 
        margin: 0;
      }
      .urls li { 
        margin: 6px 0;
        font-size: 10pt;
      }
      .urls a { 
        color: #0066cc; 
        text-decoration: none; 
      }
      .instructions {
        background: #e8f4fd;
        border: 1px solid #b3d9f7;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 10pt;
      }
      .instructions h3 {
        margin: 0 0 8px 0;
        font-size: 11pt;
        color: #1565c0;
      }
      .instructions ol {
        margin: 0;
        padding-left: 20px;
      }
      .instructions li {
        margin: 4px 0;
      }
      .instructions .filename {
        background: #fff;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 9pt;
      }
    </style>
  `;

  let html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title>${styles}</head><body>`;

  // 印刷手順（印刷時は非表示）
  html += `
    <div class="instructions no-print">
      <h3>📄 PDFとして保存する手順</h3>
      <ol>
        <li>印刷ダイアログの「送信先」または「プリンター」を <strong>「PDFに保存」</strong> に変更</li>
        <li>「保存」または「印刷」をクリック</li>
        <li>ファイル名: <span class="filename">${escapeHtml(fileName)}.pdf</span></li>
      </ol>
    </div>
  `;

  // タイトル
  html += `<h1>${escapeHtml(note.title)}</h1>`;

  // メタ情報
  const metaItems: string[] = [];
  if (options.includeCategory && context.categoryPath) {
    metaItems.push(`<p><strong>カテゴリ:</strong> ${escapeHtml(context.categoryPath)}</p>`);
  }
  if (options.includeTags && context.tagNames.length > 0) {
    metaItems.push(`<p><strong>タグ:</strong> ${context.tagNames.map(t => `#${escapeHtml(t)}`).join(' ')}</p>`);
  }
  if (options.includeCreatedAt) {
    metaItems.push(`<p><strong>作成日:</strong> ${format(note.createdAt, 'yyyy-MM-dd HH:mm')}</p>`);
  }
  if (options.includeUpdatedAt) {
    metaItems.push(`<p><strong>更新日:</strong> ${format(note.updatedAt, 'yyyy-MM-dd HH:mm')}</p>`);
  }

  if (metaItems.length > 0) {
    html += `<div class="meta">${metaItems.join('')}</div>`;
  }

  // 区切り線
  html += '<hr class="divider">';

  // 本文（画像を含むHTMLに変換）
  const contentHtml = markdownToHtml(note.content);
  html += `<div class="content">${contentHtml}</div>`;

  // URL
  if (options.includeUrls && note.urls && note.urls.length > 0) {
    html += '<div class="urls"><h2>関連URL</h2><ul>';
    note.urls.forEach((urlInfo) => {
      const title = urlInfo.title || urlInfo.url;
      html += `<li>• <a href="${escapeHtml(urlInfo.url)}" target="_blank">${escapeHtml(title)}</a></li>`;
    });
    html += '</ul></div>';
  }

  html += '</body></html>';

  // 新しいウィンドウを開いて印刷
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('ポップアップがブロックされました。\nブラウザの設定でポップアップを許可してください。');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // ページ読み込み完了後に印刷ダイアログを表示
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

export const useExport = () => {
  const exportNote = useCallback(
    async (
      note: Note,
      options: ExportOptions,
      context: ExportContext
    ): Promise<void> => {
      const { format: exportFormat, fileName } = options;

      switch (exportFormat) {
        case 'txt': {
          const content = toPlainText(note, options, context);
          downloadFile(content, `${fileName}.txt`, 'text/plain;charset=utf-8');
          break;
        }

        case 'md': {
          const content = toMarkdown(note, options, context);
          downloadFile(content, `${fileName}.md`, 'text/markdown;charset=utf-8');
          break;
        }

        case 'pdf': {
          generatePdfViaPrint(note, options, context, fileName);
          break;
        }
      }
    },
    []
  );

  const generatePreview = useCallback(
    (
      note: Note,
      options: ExportOptions,
      context: ExportContext
    ): string => {
      if (options.format === 'txt') {
        return toPlainText(note, options, context);
      }
      return toMarkdown(note, options, context);
    },
    []
  );

  return {
    exportNote,
    generatePreview,
  };
};
