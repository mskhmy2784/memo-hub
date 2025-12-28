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

// Markdownからプレーンテキストに変換（PDF用）
const markdownToPlainText = (markdown: string): string => {
  let text = markdown;

  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '<<画像>>');
  text = text.replace(/^[-*]\s+/gm, '• ');
  text = text.replace(/^>\s+/gm, '｜ ');
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').trim();
  });

  return text;
};

// ArrayBufferをBase64に変換（大きなファイル対応）
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// PDF生成（ブラウザ印刷機能を使用）
const generatePdfViaPrint = (
  note: Note,
  options: ExportOptions,
  context: ExportContext,
  _fileName: string
): void => {
  // 印刷用のHTMLを生成
  const printContent = generatePrintHtml(note, options, context);
  
  // 新しいウィンドウを開いて印刷
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    throw new Error('ポップアップがブロックされました。ポップアップを許可してください。');
  }
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // 印刷ダイアログを表示
  printWindow.onload = () => {
    printWindow.print();
  };
};

// 印刷用HTML生成
const generatePrintHtml = (
  note: Note,
  options: ExportOptions,
  context: ExportContext
): string => {
  const styles = `
    <style>
      @media print {
        body { margin: 0; padding: 20mm; }
        @page { margin: 15mm; }
      }
      body {
        font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
        font-size: 12pt;
        line-height: 1.8;
        color: #333;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px;
        background: white;
      }
      h1 {
        font-size: 20pt;
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
      .meta p { margin: 5px 0; }
      .meta strong { color: #555; }
      .content {
        white-space: pre-wrap;
        word-wrap: break-word;
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
      .urls ul { list-style: none; padding: 0; }
      .urls li { margin: 8px 0; }
      .urls a { color: #0066cc; text-decoration: none; }
      .print-instructions {
        background: #e3f2fd;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 10pt;
      }
      @media print {
        .print-instructions { display: none; }
      }
    </style>
  `;

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title>${styles}</head><body>`;

  // 印刷手順（画面表示時のみ）
  html += `<div class="print-instructions">
    <strong>PDFとして保存する方法:</strong><br>
    1. 印刷ダイアログで「送信先」を「PDFに保存」に変更<br>
    2. 「保存」をクリック<br>
    3. ファイル名を「${escapeHtml(note.title)}.pdf」として保存
  </div>`;

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

  // 本文
  const plainContent = markdownToPlainText(note.content);
  html += `<div class="content">${escapeHtml(plainContent).replace(/\n/g, '<br>')}</div>`;

  // URL
  if (options.includeUrls && note.urls && note.urls.length > 0) {
    html += '<div class="urls"><h2>関連URL</h2><ul>';
    note.urls.forEach((urlInfo) => {
      const title = urlInfo.title || urlInfo.url;
      html += `<li><a href="${escapeHtml(urlInfo.url)}" target="_blank">${escapeHtml(title)}</a></li>`;
    });
    html += '</ul></div>';
  }

  html += '</body></html>';
  return html;
};

// PDF生成（jsPDF使用）- フォント読み込み改善版
const generatePdfWithJsPdf = async (
  note: Note,
  options: ExportOptions,
  context: ExportContext,
  fileName: string
): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');

  // Noto Sans JP フォントを読み込む
  const fontUrl = 'https://cdn.jsdelivr.net/npm/@aspect-build/aspect-font-noto-sans-jp@0.0.1/fonts/NotoSansJP-Regular.ttf';
  
  let fontBase64: string | null = null;
  
  try {
    const response = await fetch(fontUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Font fetch failed');
    const arrayBuffer = await response.arrayBuffer();
    fontBase64 = arrayBufferToBase64(arrayBuffer);
  } catch (e) {
    console.warn('フォント読み込み失敗、代替フォントを試行:', e);
    
    // 代替フォントURL
    const altFontUrl = 'https://raw.githubusercontent.com/nicovank/NotoSansJP/main/NotoSansJP-Regular.otf';
    try {
      const response = await fetch(altFontUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Alt font fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      fontBase64 = arrayBufferToBase64(arrayBuffer);
    } catch (e2) {
      console.warn('代替フォントも読み込み失敗:', e2);
    }
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // フォント設定
  if (fontBase64) {
    try {
      pdf.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
      pdf.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
      pdf.setFont('NotoSansJP');
    } catch (e) {
      console.warn('フォント追加失敗、デフォルトフォント使用:', e);
    }
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addText = (
    text: string,
    fontSize: number,
    textOptions?: { color?: string }
  ) => {
    pdf.setFontSize(fontSize);
    if (textOptions?.color) {
      const hex = textOptions.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      pdf.setTextColor(r, g, b);
    } else {
      pdf.setTextColor(0, 0, 0);
    }

    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.5;

    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
  };

  const addSpace = (height: number) => {
    y += height;
    if (y > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const addLine = () => {
    if (y + 5 > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // タイトル
  addText(note.title, 18);
  addSpace(5);

  // メタ情報
  const metaItems: string[] = [];
  if (options.includeCategory && context.categoryPath) {
    metaItems.push(`カテゴリ: ${context.categoryPath}`);
  }
  if (options.includeTags && context.tagNames.length > 0) {
    metaItems.push(`タグ: ${context.tagNames.map(t => `#${t}`).join(' ')}`);
  }
  if (options.includeCreatedAt) {
    metaItems.push(`作成日: ${format(note.createdAt, 'yyyy-MM-dd HH:mm')}`);
  }
  if (options.includeUpdatedAt) {
    metaItems.push(`更新日: ${format(note.updatedAt, 'yyyy-MM-dd HH:mm')}`);
  }

  if (metaItems.length > 0) {
    pdf.setFillColor(245, 245, 245);
    const metaHeight = metaItems.length * 6 + 8;
    
    if (y + metaHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    
    pdf.roundedRect(margin, y - 2, contentWidth, metaHeight, 3, 3, 'F');
    y += 4;
    
    for (const item of metaItems) {
      addText(item, 9, { color: '#666666' });
    }
    addSpace(5);
  }

  addLine();
  addSpace(3);

  // 本文
  const plainContent = markdownToPlainText(note.content);
  const paragraphs = plainContent.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      addSpace(3);
    } else {
      addText(paragraph, 11);
    }
  }

  // URL
  if (options.includeUrls && note.urls && note.urls.length > 0) {
    addSpace(5);
    addLine();
    addSpace(3);
    
    addText('関連URL', 12);
    addSpace(3);

    for (const urlInfo of note.urls) {
      const title = urlInfo.title || urlInfo.url;
      addText(`• ${title}`, 10);
      if (urlInfo.title) {
        addText(`  ${urlInfo.url}`, 9, { color: '#0066cc' });
      }
      addSpace(2);
    }
  }

  pdf.save(`${fileName}.pdf`);
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
          try {
            // まずjsPDFを試行
            await generatePdfWithJsPdf(note, options, context, fileName);
          } catch (error) {
            console.warn('jsPDF失敗、印刷機能にフォールバック:', error);
            // 失敗した場合はブラウザの印刷機能を使用
            generatePdfViaPrint(note, options, context, fileName);
          }
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
