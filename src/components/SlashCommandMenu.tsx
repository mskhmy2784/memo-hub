import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Table,
  Link,
  FileText,
} from 'lucide-react';

interface SlashCommand {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  keywords: string[];
  insert: string;
  cursorOffset?: number; // 挿入後のカーソル位置調整
}

interface SlashCommandMenuProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

const commands: SlashCommand[] = [
  {
    id: 'h1',
    icon: <Heading1 className="w-4 h-4" />,
    label: '見出し1',
    description: '大見出しを挿入',
    keywords: ['h1', 'heading1', '見出し', 'みだし'],
    insert: '# ',
  },
  {
    id: 'h2',
    icon: <Heading2 className="w-4 h-4" />,
    label: '見出し2',
    description: '中見出しを挿入',
    keywords: ['h2', 'heading2', '見出し'],
    insert: '## ',
  },
  {
    id: 'h3',
    icon: <Heading3 className="w-4 h-4" />,
    label: '見出し3',
    description: '小見出しを挿入',
    keywords: ['h3', 'heading3', '見出し'],
    insert: '### ',
  },
  {
    id: 'list',
    icon: <List className="w-4 h-4" />,
    label: '箇条書き',
    description: '箇条書きリストを挿入',
    keywords: ['list', 'bullet', 'リスト', '箇条書き'],
    insert: '- ',
  },
  {
    id: 'number',
    icon: <ListOrdered className="w-4 h-4" />,
    label: '番号リスト',
    description: '番号付きリストを挿入',
    keywords: ['number', 'ordered', '番号', 'リスト'],
    insert: '1. ',
  },
  {
    id: 'todo',
    icon: <CheckSquare className="w-4 h-4" />,
    label: 'チェックリスト',
    description: 'TODOリストを挿入',
    keywords: ['todo', 'check', 'task', 'チェック', 'タスク'],
    insert: '- [ ] ',
  },
  {
    id: 'code',
    icon: <Code className="w-4 h-4" />,
    label: 'コードブロック',
    description: 'コードブロックを挿入',
    keywords: ['code', 'コード'],
    insert: '```\n\n```',
    cursorOffset: -4,
  },
  {
    id: 'quote',
    icon: <Quote className="w-4 h-4" />,
    label: '引用',
    description: '引用ブロックを挿入',
    keywords: ['quote', 'blockquote', '引用'],
    insert: '> ',
  },
  {
    id: 'hr',
    icon: <Minus className="w-4 h-4" />,
    label: '区切り線',
    description: '水平線を挿入',
    keywords: ['hr', 'divider', 'line', '区切り', '線'],
    insert: '\n---\n',
  },
  {
    id: 'table',
    icon: <Table className="w-4 h-4" />,
    label: 'テーブル',
    description: '表を挿入',
    keywords: ['table', 'テーブル', '表'],
    insert: '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| | | |',
    cursorOffset: -8,
  },
  {
    id: 'link',
    icon: <Link className="w-4 h-4" />,
    label: 'リンク',
    description: 'URLリンクを挿入',
    keywords: ['link', 'url', 'リンク'],
    insert: '[リンクテキスト](https://)',
    cursorOffset: -1,
  },
  {
    id: 'callout',
    icon: <FileText className="w-4 h-4" />,
    label: 'コールアウト',
    description: '注意書きを挿入',
    keywords: ['callout', 'note', 'info', '注意', 'メモ'],
    insert: '> 💡 **ポイント**: ',
  },
];

export const SlashCommandMenu = ({
  textareaRef,
  value,
  onChange,
}: SlashCommandMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashPosition, setSlashPosition] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // フィルタされたコマンド
  const filteredCommands = commands.filter((cmd) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(query) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  // カーソル位置を取得
  const getCursorCoordinates = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    // ミラー要素を作成してカーソル位置を計算
    const mirror = document.createElement('div');
    const style = getComputedStyle(textarea);

    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      width: ${textarea.clientWidth}px;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
    `;

    const textBeforeCursor = value.substring(0, textarea.selectionStart);
    mirror.textContent = textBeforeCursor;

    const span = document.createElement('span');
    span.textContent = '|';
    mirror.appendChild(span);

    document.body.appendChild(mirror);

    const textareaRect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    document.body.removeChild(mirror);

    return {
      top: textareaRect.top + (spanRect.top - mirrorRect.top) + 24,
      left: textareaRect.left + (spanRect.left - mirrorRect.left),
    };
  }, [textareaRef, value]);

  // 入力を監視してスラッシュコマンドを検出
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);

      // 最後の/の位置を探す
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

      if (lastSlashIndex !== -1) {
        // /の前が空白か行頭かチェック
        const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1];
        const isValidPosition =
          lastSlashIndex === 0 ||
          charBeforeSlash === ' ' ||
          charBeforeSlash === '\n';

        if (isValidPosition) {
          const query = textBeforeCursor.substring(lastSlashIndex + 1);

          // スペースや改行が含まれていたらキャンセル
          if (!/\s/.test(query)) {
            setIsOpen(true);
            setSearchQuery(query);
            setSlashPosition(lastSlashIndex);
            setSelectedIndex(0);

            // メニュー位置を計算
            const coords = getCursorCoordinates();
            setPosition(coords);
            return;
          }
        }
      }

      setIsOpen(false);
      setSearchQuery('');
      setSlashPosition(null);
    };

    handleInput();
  }, [value, textareaRef, getCursorCoordinates]);

  // キーボード操作
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, textareaRef]);

  // コマンドを実行
  const executeCommand = (command: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea || slashPosition === null) return;

    const cursorPos = textarea.selectionStart;

    // スラッシュコマンドを削除して、コマンドのテキストを挿入
    const newValue =
      value.substring(0, slashPosition) +
      command.insert +
      value.substring(cursorPos);

    onChange(newValue);

    // カーソル位置を設定
    setTimeout(() => {
      textarea.focus();
      const newPos =
        slashPosition + command.insert.length + (command.cursorOffset || 0);
      textarea.setSelectionRange(newPos, newPos);
    }, 0);

    setIsOpen(false);
    setSearchQuery('');
    setSlashPosition(null);
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 max-h-80 overflow-y-auto w-64"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">
        コマンド
      </div>
      {filteredCommands.map((command, index) => (
        <button
          key={command.id}
          type="button"
          onClick={() => executeCommand(command)}
          className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-primary-50 text-primary-700'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span
            className={`p-1.5 rounded-lg ${
              index === selectedIndex
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {command.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{command.label}</div>
            <div className="text-xs text-gray-400 truncate">
              {command.description}
            </div>
          </div>
          <span className="text-xs text-gray-300 font-mono">/{command.id}</span>
        </button>
      ))}
    </div>
  );
};
