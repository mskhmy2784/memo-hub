import { useState, useEffect, useMemo } from 'react';
import { X, FileText, FileCode, FileDown, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Note } from '../types';
import { useExport, type ExportOptions, type ExportContext } from '../hooks/useExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  categoryPath: string;
  tagNames: string[];
}

export const ExportModal = ({
  isOpen,
  onClose,
  note,
  categoryPath,
  tagNames,
}: ExportModalProps) => {
  const { exportNote, generatePreview } = useExport();

  // 初期ファイル名を生成
  const defaultFileName = useMemo(() => {
    const dateStr = format(new Date(), 'yyyyMMdd');
    // ファイル名に使用できない文字を除去
    const safeTitle = note.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
    return `${safeTitle}-${dateStr}`;
  }, [note.title]);

  // エクスポートオプション
  const [options, setOptions] = useState<ExportOptions>({
    format: 'txt',
    includeCategory: true,
    includeTags: true,
    includeCreatedAt: false,
    includeUpdatedAt: false,
    includeUrls: true,
    fileName: defaultFileName,
  });

  // プレビュー表示
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ファイル名を初期化
  useEffect(() => {
    if (isOpen) {
      setOptions((prev) => ({
        ...prev,
        fileName: defaultFileName,
      }));
    }
  }, [isOpen, defaultFileName]);

  // コンテキスト
  const context: ExportContext = useMemo(
    () => ({
      categoryPath,
      tagNames,
    }),
    [categoryPath, tagNames]
  );

  // プレビュー内容
  const previewContent = useMemo(() => {
    if (!showPreview || options.format === 'pdf') return '';
    return generatePreview(note, options, context);
  }, [showPreview, options, note, context, generatePreview]);

  // エクスポート実行
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportNote(note, options, context);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  // オプション更新ヘルパー
  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            メモをエクスポート
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 形式選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              形式
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => updateOption('format', 'txt')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  options.format === 'txt'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className={`w-6 h-6 ${options.format === 'txt' ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${options.format === 'txt' ? 'text-primary-700' : 'text-gray-600'}`}>
                  テキスト
                </span>
                <span className="text-xs text-gray-400">.txt</span>
              </button>

              <button
                onClick={() => updateOption('format', 'md')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  options.format === 'md'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileCode className={`w-6 h-6 ${options.format === 'md' ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${options.format === 'md' ? 'text-primary-700' : 'text-gray-600'}`}>
                  Markdown
                </span>
                <span className="text-xs text-gray-400">.md</span>
              </button>

              <button
                onClick={() => updateOption('format', 'pdf')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  options.format === 'pdf'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileDown className={`w-6 h-6 ${options.format === 'pdf' ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${options.format === 'pdf' ? 'text-primary-700' : 'text-gray-600'}`}>
                  PDF
                </span>
                <span className="text-xs text-gray-400">.pdf</span>
              </button>
            </div>
          </div>

          {/* メタ情報選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              メタ情報
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeCategory}
                  onChange={(e) => updateOption('includeCategory', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">カテゴリ</span>
                {categoryPath && (
                  <span className="text-xs text-gray-400 ml-auto">{categoryPath}</span>
                )}
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTags}
                  onChange={(e) => updateOption('includeTags', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">タグ</span>
                {tagNames.length > 0 && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {tagNames.slice(0, 3).map(t => `#${t}`).join(' ')}
                    {tagNames.length > 3 && ` +${tagNames.length - 3}`}
                  </span>
                )}
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeCreatedAt}
                  onChange={(e) => updateOption('includeCreatedAt', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">作成日</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {format(note.createdAt, 'yyyy-MM-dd HH:mm')}
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeUpdatedAt}
                  onChange={(e) => updateOption('includeUpdatedAt', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">更新日</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {format(note.updatedAt, 'yyyy-MM-dd HH:mm')}
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeUrls}
                  onChange={(e) => updateOption('includeUrls', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">関連URL</span>
                {note.urls && note.urls.length > 0 && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {note.urls.length}件
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* ファイル名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル名
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={options.fileName}
                onChange={(e) => updateOption('fileName', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="ファイル名を入力"
              />
              <span className="text-sm text-gray-500">
                .{options.format}
              </span>
            </div>
          </div>

          {/* プレビュー（PDF以外） */}
          {options.format !== 'pdf' && (
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'プレビューを閉じる' : 'プレビューを表示'}
              </button>

              {showPreview && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {previewContent}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* PDFの注意書き */}
          {options.format === 'pdf' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                PDF形式では、メモ内の画像も埋め込まれます。
                生成に数秒かかる場合があります。
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !options.fileName.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                エクスポート中...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                エクスポート
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
