import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  ExternalHyperlink,
  BorderStyle,
} from 'docx';
import { format } from 'date-fns';
import type { UrlInfo } from '../types';

// エクスポート用のメモデータ型
interface ExportNote {
  title: string;
  content: string;
  urls?: UrlInfo[];
  category: string;
  tags: string[];
  priority: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// 重要度のラベル
const getPriorityLabel = (priority: number): string => {
  switch (priority) {
    case 1:
      return '高';
    case 2:
      return '中';
    case 3:
      return '低';
    default:
      return '-';
  }
};

// Blobをダウンロード（file-saverの代替）
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Markdownをパースしてdocxの段落に変換
const parseMarkdownToParagraphs = (content: string): Paragraph[] => {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: 'bullet' | 'number' | 'task' = 'bullet';

  const flushList = () => {
    if (listItems.length > 0) {
      listItems.forEach((item, index) => {
        const isChecked = item.startsWith('[x] ') || item.startsWith('[X] ');
        const isUnchecked = item.startsWith('[ ] ');
        let text = item;

        if (isChecked || isUnchecked) {
          text = item.substring(4);
          const checkbox = isChecked ? '☑ ' : '☐ ';
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: checkbox }),
                ...parseInlineFormatting(text),
              ],
              indent: { left: 360 },
              spacing: { after: 60 },
            })
          );
        } else if (listType === 'number') {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. ` }),
                ...parseInlineFormatting(text),
              ],
              indent: { left: 360 },
              spacing: { after: 60 },
            })
          );
        } else {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: '• ' }),
                ...parseInlineFormatting(text),
              ],
              indent: { left: 360 },
              spacing: { after: 60 },
            })
          );
        }
      });
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // コードブロック開始/終了
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // コードブロック終了
        paragraphs.push(
          new Paragraph({
            children: codeBlockContent.map(
              (codeLine, idx) =>
                new TextRun({
                  text: codeLine + (idx < codeBlockContent.length - 1 ? '\n' : ''),
                  font: 'Consolas',
                  size: 20,
                })
            ),
            shading: { fill: 'F5F5F5' },
            border: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            spacing: { before: 120, after: 120 },
          })
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // 見出し
    if (line.startsWith('# ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line.substring(2)),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line.substring(3)),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line.substring(4)),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    if (line.startsWith('#### ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line.substring(5)),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 120, after: 60 },
        })
      );
      continue;
    }

    // 引用
    if (line.startsWith('> ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line.substring(2)),
          indent: { left: 720 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: '999999' },
          },
          spacing: { before: 60, after: 60 },
        })
      );
      continue;
    }

    // チェックリスト
    if (line.match(/^[-*]\s+\[([ xX])\]\s+/)) {
      if (!inList || listType !== 'task') {
        flushList();
        inList = true;
        listType = 'task';
      }
      const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (match) {
        const checked = match[1].toLowerCase() === 'x';
        listItems.push((checked ? '[x] ' : '[ ] ') + match[2]);
      }
      continue;
    }

    // 番号付きリスト
    if (line.match(/^\d+\.\s+/)) {
      if (!inList || listType !== 'number') {
        flushList();
        inList = true;
        listType = 'number';
      }
      listItems.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // 箇条書きリスト
    if (line.match(/^[-*+]\s+/) && !line.match(/^[-*]\s+\[/)) {
      if (!inList || listType !== 'bullet') {
        flushList();
        inList = true;
        listType = 'bullet';
      }
      listItems.push(line.replace(/^[-*+]\s+/, ''));
      continue;
    }

    // 水平線
    if (line.match(/^[-*_]{3,}$/)) {
      flushList();
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
          },
          spacing: { before: 120, after: 120 },
        })
      );
      continue;
    }

    // 空行
    if (line.trim() === '') {
      flushList();
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // 通常のテキスト
    flushList();
    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { after: 120 },
      })
    );
  }

  flushList();
  return paragraphs;
};

// インラインフォーマットをパース（太字、斜体、コード、リンク）
const parseInlineFormatting = (text: string): (TextRun | ExternalHyperlink)[] => {
  const runs: (TextRun | ExternalHyperlink)[] = [];

  // リンクのパターン [text](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  // 太字のパターン **text** or __text__
  const boldPattern = /\*\*([^*]+)\*\*|__([^_]+)__/g;
  // 斜体のパターン *text* or _text_ (太字でないもの)
  const italicPattern = /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g;
  // インラインコードのパターン `code`
  const codePattern = /`([^`]+)`/g;

  let lastIndex = 0;
  const allMatches: { index: number; length: number; type: string; content: string; url?: string }[] = [];

  // リンクをマッチ
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    allMatches.push({
      index: match.index,
      length: match[0].length,
      type: 'link',
      content: match[1],
      url: match[2],
    });
  }

  // 太字をマッチ
  while ((match = boldPattern.exec(text)) !== null) {
    allMatches.push({
      index: match.index,
      length: match[0].length,
      type: 'bold',
      content: match[1] || match[2],
    });
  }

  // 斜体をマッチ
  while ((match = italicPattern.exec(text)) !== null) {
    allMatches.push({
      index: match.index,
      length: match[0].length,
      type: 'italic',
      content: match[1] || match[2],
    });
  }

  // インラインコードをマッチ
  while ((match = codePattern.exec(text)) !== null) {
    allMatches.push({
      index: match.index,
      length: match[0].length,
      type: 'code',
      content: match[1],
    });
  }

  // インデックス順にソート
  allMatches.sort((a, b) => a.index - b.index);

  // 重複を除去（リンクが他のパターンと重複する場合はリンクを優先）
  const filteredMatches: typeof allMatches = [];
  for (const m of allMatches) {
    const overlaps = filteredMatches.some(
      (existing) =>
        (m.index >= existing.index && m.index < existing.index + existing.length) ||
        (existing.index >= m.index && existing.index < m.index + m.length)
    );
    if (!overlaps) {
      filteredMatches.push(m);
    }
  }

  // テキストを構築
  for (const m of filteredMatches) {
    if (m.index > lastIndex) {
      runs.push(new TextRun({ text: text.substring(lastIndex, m.index) }));
    }

    switch (m.type) {
      case 'link':
        runs.push(
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: m.content,
                color: '0563C1',
                underline: {},
              }),
            ],
            link: m.url || '',
          })
        );
        break;
      case 'bold':
        runs.push(new TextRun({ text: m.content, bold: true }));
        break;
      case 'italic':
        runs.push(new TextRun({ text: m.content, italics: true }));
        break;
      case 'code':
        runs.push(
          new TextRun({
            text: m.content,
            font: 'Consolas',
            shading: { fill: 'F5F5F5' },
          })
        );
        break;
    }

    lastIndex = m.index + m.length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.substring(lastIndex) }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
};

// 複数メモをWord形式でエクスポート
export const exportToWord = async (notes: ExportNote[]): Promise<void> => {
  const sections = notes.map((note, index) => {
    const children: Paragraph[] = [];

    // タイトル
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: note.title,
            bold: true,
            size: 32,
            font: 'Yu Gothic',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    // メタ情報
    const metaInfo: string[] = [];
    metaInfo.push(`カテゴリ: ${note.category}`);
    metaInfo.push(`重要度: ${getPriorityLabel(note.priority)}`);
    if (note.isFavorite) metaInfo.push('★ お気に入り');
    if (note.tags.length > 0) metaInfo.push(`タグ: ${note.tags.join(', ')}`);

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metaInfo.join(' | '),
            size: 20,
            color: '666666',
            font: 'Yu Gothic',
          }),
        ],
        spacing: { after: 100 },
      })
    );

    // 日時
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `作成: ${note.createdAt} | 更新: ${note.updatedAt}`,
            size: 18,
            color: '888888',
            font: 'Yu Gothic',
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // URL
    if (note.urls && note.urls.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'リンク:',
              bold: true,
              size: 22,
              font: 'Yu Gothic',
            }),
          ],
          spacing: { before: 100, after: 60 },
        })
      );

      note.urls.forEach((urlInfo) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '• ' }),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: urlInfo.title || urlInfo.url,
                    color: '0563C1',
                    underline: {},
                    font: 'Yu Gothic',
                  }),
                ],
                link: urlInfo.url,
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 60 },
          })
        );
      });
    }

    // 区切り線
    children.push(
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
        },
        spacing: { before: 100, after: 200 },
      })
    );

    // 本文
    if (note.content) {
      const contentParagraphs = parseMarkdownToParagraphs(note.content);
      children.push(...contentParagraphs);
    }

    // メモ間の区切り（最後以外）
    if (index < notes.length - 1) {
      children.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        })
      );
    }

    return children;
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Yu Gothic',
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'MemoHub Export',
                    size: 18,
                    color: '888888',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 18,
                    color: '888888',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '888888',
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 18,
                    color: '888888',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '888888',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: sections.flat(),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = notes.length === 1
    ? `${notes[0].title.replace(/[\\/:*?"<>|]/g, '_')}.docx`
    : `notes-${format(new Date(), 'yyyyMMdd')}.docx`;
  downloadBlob(blob, filename);
};

// 単一メモをWord形式でエクスポート（NoteDetailPage用）
export const exportSingleNoteToWord = async (
  note: {
    title: string;
    content: string;
    urls?: UrlInfo[];
    categoryPath: string;
    tags: { id: string; name: string; color: string }[];
    priority: number;
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
): Promise<void> => {
  const exportNote: ExportNote = {
    title: note.title,
    content: note.content,
    urls: note.urls,
    category: note.categoryPath,
    tags: note.tags.map((t) => t.name),
    priority: note.priority,
    isFavorite: note.isFavorite,
    createdAt: format(note.createdAt, 'yyyy-MM-dd HH:mm'),
    updatedAt: format(note.updatedAt, 'yyyy-MM-dd HH:mm'),
  };

  await exportToWord([exportNote]);
};
