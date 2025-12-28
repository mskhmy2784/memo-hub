import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Link,
  ImagePlus,
  Code,
  Quote,
  Minus,
} from 'lucide-react';

interface ToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onImageClick: () => void;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  action: 'wrap' | 'prefix' | 'insert' | 'custom';
  before?: string;
  after?: string;
  prefix?: string;
  insert?: string;
  customAction?: () => void;
}

export const RichTextToolbar = ({
  textareaRef,
  value,
  onChange,
  onImageClick,
}: ToolbarProps) => {
  // 選択範囲を取得
  const getSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { start: 0, end: 0, text: '' };

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value.substring(start, end);

    return { start, end, text };
  };

  // テキストを囲む（太字、斜体、コードなど）
  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start, end, text } = getSelection();
    const newText = text || '選択テキスト';
    const newValue =
      value.substring(0, start) +
      before +
      newText +
      after +
      value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      if (text) {
        textarea.setSelectionRange(
          start + before.length,
          end + before.length
        );
      } else {
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + newText.length
        );
      }
    }, 0);
  };

  // カーソル位置に挿入
  const insertAtCursor = (insert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start, end } = getSelection();
    const newValue =
      value.substring(0, start) + insert + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + insert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // 行頭にプレフィックスを追加
  const addPrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start } = getSelection();

    let lineStart = start;
    while (lineStart > 0 && value[lineStart - 1] !== '\n') {
      lineStart--;
    }

    let lineEnd = start;
    while (lineEnd < value.length && value[lineEnd] !== '\n') {
      lineEnd++;
    }

    const actualLineEnd = lineEnd < value.length ? lineEnd : value.length;
    const currentLine = value.substring(lineStart, actualLineEnd);

    if (currentLine.startsWith(prefix)) {
      const newValue =
        value.substring(0, lineStart) +
        currentLine.substring(prefix.length) +
        value.substring(actualLineEnd);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - prefix.length, start - prefix.length);
      }, 0);
    } else {
      const prefixes = ['# ', '## ', '### ', '- ', '1. ', '- [ ] ', '> '];
      let cleanLine = currentLine;
      for (const p of prefixes) {
        if (cleanLine.startsWith(p)) {
          cleanLine = cleanLine.substring(p.length);
          break;
        }
      }

      const newValue =
        value.substring(0, lineStart) +
        prefix +
        cleanLine +
        value.substring(actualLineEnd);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newPos = lineStart + prefix.length + (start - lineStart);
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  // リンク挿入
  const insertLink = () => {
    const { text } = getSelection();
    if (text) {
      wrapSelection('[', '](https://)');
    } else {
      insertAtCursor('[リンクテキスト](https://)');
    }
  };

  const buttons: (ToolbarButton | 'divider')[] = [
    {
      icon: <Bold className="w-4 h-4" />,
      label: '太字',
      action: 'wrap',
      before: '**',
      after: '**',
    },
    {
      icon: <Italic className="w-4 h-4" />,
      label: '斜体',
      action: 'wrap',
      before: '*',
      after: '*',
    },
    'divider',
    {
      icon: <Heading1 className="w-4 h-4" />,
      label: '見出し1',
      action: 'prefix',
      prefix: '# ',
    },
    {
      icon: <Heading2 className="w-4 h-4" />,
      label: '見出し2',
      action: 'prefix',
      prefix: '## ',
    },
    {
      icon: <Heading3 className="w-4 h-4" />,
      label: '見出し3',
      action: 'prefix',
      prefix: '### ',
    },
    'divider',
    {
      icon: <List className="w-4 h-4" />,
      label: '箇条書き',
      action: 'prefix',
      prefix: '- ',
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      label: '番号リスト',
      action: 'prefix',
      prefix: '1. ',
    },
    {
      icon: <CheckSquare className="w-4 h-4" />,
      label: 'チェックリスト',
      action: 'prefix',
      prefix: '- [ ] ',
    },
    'divider',
    {
      icon: <Link className="w-4 h-4" />,
      label: 'リンク',
      action: 'custom',
      customAction: insertLink,
    },
    {
      icon: <ImagePlus className="w-4 h-4" />,
      label: '画像',
      action: 'custom',
      customAction: onImageClick,
    },
    'divider',
    {
      icon: <Code className="w-4 h-4" />,
      label: 'コード',
      action: 'wrap',
      before: '`',
      after: '`',
    },
    {
      icon: <Quote className="w-4 h-4" />,
      label: '引用',
      action: 'prefix',
      prefix: '> ',
    },
    {
      icon: <Minus className="w-4 h-4" />,
      label: '区切り線',
      action: 'insert',
      insert: '\n---\n',
    },
  ];

  const handleClick = (button: ToolbarButton) => {
    switch (button.action) {
      case 'wrap':
        wrapSelection(button.before || '', button.after || '');
        break;
      case 'prefix':
        addPrefix(button.prefix || '');
        break;
      case 'insert':
        insertAtCursor(button.insert || '');
        break;
      case 'custom':
        button.customAction?.();
        break;
    }
  };

  return (
    <div className="flex items-center gap-0.5 p-1.5 bg-gray-50 border border-gray-200 rounded-lg mb-2 flex-wrap">
      {buttons.map((button, index) =>
        button === 'divider' ? (
          <div
            key={`divider-${index}`}
            className="w-px h-5 bg-gray-300 mx-1"
          />
        ) : (
          <button
            key={button.label}
            type="button"
            onClick={() => handleClick(button)}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
            title={button.label}
          >
            {button.icon}
          </button>
        )
      )}
    </div>
  );
};
