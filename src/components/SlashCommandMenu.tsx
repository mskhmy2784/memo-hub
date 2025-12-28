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
  cursorOffset?: number;
}

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (markdown: string) => void;
  filter: string;
  position: { top: number; left: number };
}

const commands: SlashCommand[] = [
  {
    id: 'h1',
    icon: <Heading1 className="w-4 h-4" />,
    label: '見出し1',
    description: '大きな見出し',
    keywords: ['h1', 'heading', '見出し', 'みだし'],
    insert: '# ',
  },
  {
    id: 'h2',
    icon: <Heading2 className="w-4 h-4" />,
    label: '見出し2',
    description: '中サイズの見出し',
    keywords: ['h2', 'heading', '見出し', 'みだし'],
    insert: '## ',
  },
  {
    id: 'h3',
    icon: <Heading3 className="w-4 h-4" />,
    label: '見出し3',
    description: '小さな見出し',
    keywords: ['h3', 'heading', '見出し', 'みだし'],
    insert: '### ',
  },
  {
    id: 'list',
    icon: <List className="w-4 h-4" />,
    label: '箇条書き',
    description: '箇条書きリスト',
    keywords: ['list', 'bullet', 'リスト', '箇条書き'],
    insert: '- ',
  },
  {
    id: 'number',
    icon: <ListOrdered className="w-4 h-4" />,
    label: '番号リスト',
    description: '番号付きリスト',
    keywords: ['number', 'ordered', '番号', 'ナンバー'],
    insert: '1. ',
  },
  {
    id: 'todo',
    icon: <CheckSquare className="w-4 h-4" />,
    label: 'チェックリスト',
    description: 'チェックボックス付きリスト',
    keywords: ['todo', 'check', 'task', 'チェック', 'タスク'],
    insert: '- [ ] ',
  },
  {
    id: 'code',
    icon: <Code className="w-4 h-4" />,
    label: 'コードブロック',
    description: 'コードを挿入',
    keywords: ['code', 'コード', 'プログラム'],
    insert: '```\n\n```',
    cursorOffset: -4,
  },
  {
    id: 'quote',
    icon: <Quote className="w-4 h-4" />,
    label: '引用',
    description: '引用ブロック',
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
    insert: '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| A | B | C |\n',
  },
  {
    id: 'link',
    icon: <Link className="w-4 h-4" />,
    label: 'リンク',
    description: 'URLリンクを挿入',
    keywords: ['link', 'url', 'リンク'],
    insert: '[テキスト](https://)',
    cursorOffset: -10,
  },
  {
    id: 'callout',
    icon: <FileText className="w-4 h-4" />,
    label: 'コールアウト',
    description: '強調ブロック',
    keywords: ['callout', 'note', 'info', 'コールアウト', '注意'],
    insert: '> **📌 Note**\n> ',
  },
];

export const SlashCommandMenu = ({
  isOpen,
  onClose,
  onSelect,
  filter,
  position,
}: SlashCommandMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // フィルタリング
  const filteredCommands = commands.filter((cmd) => {
    if (!filter) return true;
    const searchText = filter.toLowerCase().replace('/', '');
    return (
      cmd.id.includes(searchText) ||
      cmd.label.toLowerCase().includes(searchText) ||
      cmd.keywords.some((k) => k.includes(searchText))
    );
  });

  // 選択インデックスをリセット
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].insert);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-64 max-h-80 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-3 py-1 text-xs text-gray-500 font-medium">
        コマンド
      </div>
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.id}
          type="button"
          onClick={() => onSelect(cmd.insert)}
          className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 ${
            index === selectedIndex ? 'bg-primary-50' : ''
          }`}
        >
          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
            {cmd.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900">{cmd.label}</div>
            <div className="text-xs text-gray-500 truncate">
              {cmd.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
