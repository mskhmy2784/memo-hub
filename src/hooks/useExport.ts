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
  // Markdown画像記法: ![alt](url)
  return content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '<<画像>>');
};

// テキスト形式に変換
const toPlainText = (
  note: Note,
  options: ExportOptions,
  context: ExportContext
): string => {
  const lines: string[] = [];

  // タイトル
  lines.push(note.title);
  lines.push('='.repeat(note.title.length * 2));
  lines.push('');

  // メタ情報
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

  // 本文（画像をダミーに置換）
  const contentWithPlaceholder = replaceImagesWithPlaceholder(note.content);
  lines.push(contentWithPlaceholder);

  // URL
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

  // タイトル
  lines.push(`# ${note.title}`);
  lines.push('');

  // メタ情報
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

  // 本文（画像をダミーに置換）
  const contentWithPlaceholder = replaceImagesWithPlaceholder(note.content);
  lines.push(contentWithPlaceholder);

  // URL
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

// PDF生成用のHTML作成
const createPdfHtml = (
  note: Note,
  options: ExportOptions,
  context: ExportContext
): string => {
  const styles = `
    <style>
      body {
        font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
        font-size: 12pt;
        line-height: 1.8;
        color: #333;
        max-width: 100%;
        padding: 20px;
      }
      h1 {
        font-size: 24pt;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .meta {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 10pt;
      }
      .meta p {
        margin: 5px 0;
      }
      .meta strong {
        color: #555;
      }
      .content {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .content h1, .content h2, .content h3, .content h4 {
        margin-top: 20px;
        margin-bottom: 10px;
      }
      .content h2 { font-size: 18pt; }
      .content h3 { font-size: 14pt; }
      .content h4 { font-size: 12pt; }
      .content ul, .content ol {
        margin-left: 20px;
        padding-left: 20px;
      }
      .content li {
        margin: 5px 0;
      }
      .content blockquote {
        border-left: 4px solid #ddd;
        padding-left: 15px;
        margin-left: 0;
        color: #666;
      }
      .content code {
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: "Courier New", monospace;
        font-size: 10pt;
      }
      .content pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        overflow-x: auto;
      }
      .content pre code {
        background: none;
        padding: 0;
      }
      .content img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 10px 0;
      }
      .urls {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
      }
      .urls h2 {
        font-size: 14pt;
        margin-bottom: 10px;
      }
      .urls ul {
        list-style: none;
        padding: 0;
      }
      .urls li {
        margin: 8px 0;
      }
      .urls a {
        color: #0066cc;
        text-decoration: none;
      }
    </style>
  `;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>`;

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

  // 本文（Markdownをシンプルに変換）
  html += `<div class="content">${markdownToHtml(note.content)}</div>`;

  // URL
  if (options.includeUrls && note.urls && note.urls.length > 0) {
    html += '<div class="urls"><h2>関連URL</h2><ul>';
    note.urls.forEach((urlInfo) => {
      const title = urlInfo.title || urlInfo.url;
      html += `<li><a href="${escapeHtml(urlInfo.url)}">${escapeHtml(title)}</a></li>`;
    });
    html += '</ul></div>';
  }

  html += '</body></html>';

  return html;
};

// HTMLエスケープ
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// 簡易Markdown→HTML変換
const markdownToHtml = (markdown: string): string => {
  let html = escapeHtml(markdown);

  // 見出し
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 太字・斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // インラインコード
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // リンク
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 画像（PDFには埋め込み）
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // リスト
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>');

  // 番号付きリスト
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // 改行
  html = html.replace(/\n/g, '<br>');

  return html;
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
          // 動的インポート（jspdfとhtml2canvas）
          const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
            import('jspdf'),
            import('html2canvas'),
          ]);

          // 一時的なHTMLコンテナを作成
          const container = document.createElement('div');
          container.innerHTML = createPdfHtml(note, options, context);
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.width = '210mm'; // A4幅
          container.style.backgroundColor = 'white';
          document.body.appendChild(container);

          try {
            // HTML→Canvas→PDF
            const canvas = await html2canvas(container, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // 最初のページ
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // 複数ページ対応
            while (heightLeft > 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;
            }

            pdf.save(`${fileName}.pdf`);
          } finally {
            document.body.removeChild(container);
          }
          break;
        }
      }
    },
    []
  );

  // プレビュー用のテキスト生成
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
