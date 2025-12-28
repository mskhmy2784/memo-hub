import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  Calendar,
  Clock,
  Tag as TagIcon,
  Folder,
  AlertCircle,
  MoreVertical,
  FileText,
  FileCode,
  FileDown,
} from 'lucide-react';
import { ExportModal } from '../components/ExportModal';

export const NoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notes, categories, tags, openModal } = useNotesStore();
  const { deleteNote, updateNote } = useFirestore();

  // メニュー表示状態
  const [showMenu, setShowMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const note = notes.find((n) => n.id === id);

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">メモが見つかりません</p>
          <Link to="/notes" className="btn btn-primary">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  // カテゴリ情報
  const category = categories.find((c) => c.id === note.categoryId);
  const parentCategory = category?.parentId
    ? categories.find((c) => c.id === category.parentId)
    : null;
  const categoryPath = parentCategory
    ? `${parentCategory.name} > ${category?.name}`
    : category?.name || '';

  const categoryType: 'work' | 'private' | 'common' =
    (category?.name === '仕事' || parentCategory?.name === '仕事')
      ? 'work'
      : (category?.name === '共通' || parentCategory?.name === '共通')
      ? 'common'
      : 'private';

  // タグ情報
  const noteTags = note.tags
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter(Boolean);
  
  // タグ名の配列
  const tagNames = noteTags.map((t) => t?.name || '').filter(Boolean);

  // 削除
  const handleDelete = async () => {
    if (!confirm('このメモを削除しますか？')) return;

    await deleteNote(note.id);
    navigate('/notes');
  };

  // お気に入り切り替え
  const handleToggleFavorite = async () => {
    await updateNote(note.id, { isFavorite: !note.isFavorite });
  };

  const priorityLabels = {
    1: { label: '高', className: 'priority-high' },
    2: { label: '中', className: 'priority-medium' },
    3: { label: '低', className: 'priority-low' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              戻る
            </button>

            <div className="flex items-center gap-2">
              {/* お気に入りボタン */}
              <button
                onClick={handleToggleFavorite}
                className={`p-2 rounded-lg transition-colors ${
                  note.isFavorite
                    ? 'bg-amber-100 text-amber-600'
                    : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                <Star
                  className={`w-5 h-5 ${
                    note.isFavorite ? 'fill-amber-500' : ''
                  }`}
                />
              </button>

              {/* 編集ボタン */}
              <button
                onClick={() => openModal('edit', note.id)}
                className="btn btn-secondary"
              >
                <Edit className="w-4 h-4" />
                編集
              </button>

              {/* メニューボタン */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>

                {/* ドロップダウンメニュー */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-30">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">
                      エクスポート
                    </div>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowExportModal(true);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      テキスト (.txt)
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowExportModal(true);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileCode className="w-4 h-4 text-gray-400" />
                      Markdown (.md)
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowExportModal(true);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileDown className="w-4 h-4 text-gray-400" />
                      PDF (.pdf)
                    </button>

                    <div className="border-t border-gray-100 my-2" />

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      削除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <article className="card p-8">
          {/* タイトル */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                note.priority === 1
                  ? 'bg-red-100'
                  : note.priority === 2
                  ? 'bg-amber-100'
                  : 'bg-blue-100'
              }`}
            >
              <span className="text-2xl">
                {categoryType === 'work' ? '💼' : categoryType === 'common' ? '📌' : '🏠'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {note.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {/* カテゴリ */}
                <span
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                    categoryType === 'work'
                      ? 'bg-blue-50 text-blue-700'
                      : categoryType === 'common'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  {categoryPath}
                </span>

                {/* 重要度 */}
                <span
                  className={`badge ${priorityLabels[note.priority].className}`}
                >
                  重要度: {priorityLabels[note.priority].label}
                </span>
              </div>
            </div>
          </div>

          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              作成: {format(note.createdAt, 'yyyy/MM/dd HH:mm', { locale: ja })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              更新: {format(note.updatedAt, 'yyyy/MM/dd HH:mm', { locale: ja })}
            </span>
          </div>

          {/* タグ */}
          {noteTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {noteTags.map((tag) =>
                tag ? (
                  <span
                    key={tag.id}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag.name}
                  </span>
                ) : null
              )}
            </div>
          )}

          {/* 本文 */}
          <div className="prose prose-gray max-w-none mb-8 markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {note.content}
            </ReactMarkdown>
          </div>

          {/* URL */}
          {note.urls && note.urls.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                関連URL ({note.urls.length}件)
              </h3>
              <div className="space-y-2">
                {note.urls.map((urlInfo, index) => (
                  <a
                    key={index}
                    href={urlInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {urlInfo.title && (
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {urlInfo.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {urlInfo.url}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      {/* エクスポートモーダル */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        note={note}
        categoryPath={categoryPath}
        tagNames={tagNames}
      />
    </div>
  );
};
