import { useEffect, useRef, useCallback } from 'react';
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
  onSelect: (command: SlashCommand) => void;
  filter: string;
  position: { top: number; left: number };
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
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
  selectedIndex,
  onSelectedIndexChange,
}: SlashCommandMenuProps) => {
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
    onSelectedIndexChange(0);
  }, [filter, onSelectedIndexChange]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          onSelectedIndexChange(
            selectedIndex < filteredCommands.length - 1 ? selectedIndex + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          onSelectedIndexChange(
            selectedIndex > 0 ? selectedIndex - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, selectedIndex, filteredCommands, onSelect, onClose, onSelectedIndexChange]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 外側クリックで閉じる
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
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-64 max-h-72 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-100 mb-1">
        コマンド
      </div>
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.id}
          type="button"
          onClick={() => onSelect(cmd)}
          className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 ${
            index === selectedIndex ? 'bg-primary-50 text-primary-700' : ''
          }`}
        >
          <span className="text-gray-500">{cmd.icon}</span>
          <div>
            <div className="text-sm font-medium">{cmd.label}</div>
            <div className="text-xs text-gray-400">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export type { SlashCommand };
