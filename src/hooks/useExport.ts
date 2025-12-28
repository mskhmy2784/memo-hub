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

// Markdownからプレーンテキストに変換（PDF用）
const markdownToPlainText = (markdown: string): string => {
  let text = markdown;

  // 見出し記号を除去
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 太字・斜体を除去
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // インラインコードを除去
  text = text.replace(/`([^`]+)`/g, '$1');

  // リンクをテキストに変換
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // 画像をプレースホルダに
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '<<画像>>');

  // リスト記号を整理
  text = text.replace(/^[-*]\s+/gm, '• ');
  text = text.replace(/^\d+\.\s+/gm, (match) => match);

  // 引用記号を整理
  text = text.replace(/^>\s+/gm, '｜ ');

  // コードブロックを整理
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').trim();
  });

  return text;
};

// PDF生成（テキスト選択可能）
const generatePdf = async (
  note: Note,
  options: ExportOptions,
  context: ExportContext,
  fileName: string
): Promise<void> => {
  // jsPDFを動的インポート
  const { default: jsPDF } = await import('jspdf');

  // Google Fonts から Noto Sans JP を読み込む
  const fontUrl = 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFJEk757Y0rw_qMHVdbR2L8Y9QTJ1LwkRmR5GprQAe-T3Ow.ttf';
  
  // フォントをフェッチしてBase64に変換
  const fontResponse = await fetch(fontUrl);
  const fontArrayBuffer = await fontResponse.arrayBuffer();
  const fontBase64 = btoa(
    new Uint8Array(fontArrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );

  // PDF作成
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // フォントを追加
  pdf.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
  pdf.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
  pdf.setFont('NotoSansJP');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // テキストを追加するヘルパー関数
  const addText = (
    text: string,
    fontSize: number,
    textOptions?: { bold?: boolean; color?: string; maxWidth?: number }
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

    const maxWidth = textOptions?.maxWidth || contentWidth;
    const lines = pdf.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.5;

    for (const line of lines) {
      // ページを超える場合は改ページ
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
  };

  // 空行を追加
  const addSpace = (height: number) => {
    y += height;
    if (y > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // 区切り線を追加
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

  // PDFを保存
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
          await generatePdf(note, options, context, fileName);
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
