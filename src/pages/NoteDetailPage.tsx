import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
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
} from 'lucide-react';

export const NoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notes, categories, tags, openModal } = useNotesStore();
  const { deleteNote, updateNote } = useFirestore();

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
              <button
                onClick={() => openModal('edit', note.id)}
                className="btn btn-secondary"
              >
                <Edit className="w-4 h-4" />
                編集
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-secondary text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
                  ? 'bg-red-100 text-red-600'
                  : categoryType === 'work'
                  ? 'bg-blue-100 text-blue-600'
                  : categoryType === 'common'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-pink-100 text-pink-600'
              }`}
            >
              {note.urls && note.urls.length > 0 ? (
                <ExternalLink className="w-6 h-6" />
              ) : (
                <Folder className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {note.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`badge ${
                    categoryType === 'work' ? 'badge-work' : 
                    categoryType === 'common' ? 'badge-common' : 'badge-private'
                  }`}
                >
                  {categoryPath}
                </span>
                <span
                  className={`badge ${priorityLabels[note.priority].className}`}
                >
                  重要度: {priorityLabels[note.priority].label}
                </span>
              </div>
            </div>
          </div>

          {/* URL */}
          {note.urls && note.urls.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-2">
                URL（{note.urls.length}件）
              </h2>
              <div className="space-y-2">
                {note.urls.map((urlInfo: any, index: number) => (
                  <a
                    key={index}
                    href={urlInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors group"
                  >
                    <ExternalLink className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {urlInfo.title && (
                        <span className="font-medium block truncate">{urlInfo.title}</span>
                      )}
                      <span className="text-sm opacity-80 truncate block">{urlInfo.url}</span>
                    </div>
                    <span className="text-xs opacity-60 group-hover:opacity-100 flex-shrink-0">
                      新しいタブで開く
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* メモ内容 */}
          {note.content && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-2">メモ</h2>
              <div className="prose prose-gray max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">
                  {note.content}
                </p>
              </div>
            </div>
          )}

          {/* タグ */}
          {noteTags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                タグ
              </h2>
              <div className="flex flex-wrap gap-2">
                {noteTags.map((tag) => (
                  <span
                    key={tag!.id}
                    className="badge px-3 py-1"
                    style={{
                      backgroundColor: `${tag!.color}20`,
                      color: tag!.color,
                    }}
                  >
                    {tag!.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 日時情報 */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                作成: {format(note.createdAt, 'yyyy年M月d日 HH:mm', { locale: ja })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                更新: {format(note.updatedAt, 'yyyy年M月d日 HH:mm', { locale: ja })}
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
};
