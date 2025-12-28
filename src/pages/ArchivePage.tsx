import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import {
  Search,
  Archive,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const ArchivePage = () => {
  const navigate = useNavigate();
  useAuth();
  
  const { notes, categories, tags, isLoading } = useNotesStore();
  const { restoreNote, restoreNotes, permanentDeleteNote, permanentDeleteNotes } = useFirestore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // アーカイブされたメモのみ取得
  const archivedNotes = useMemo(() => {
    let result = notes.filter((n) => n.isArchived);
    
    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          (n.urls && n.urls.some((u) =>
            u.url.toLowerCase().includes(query) ||
            u.title.toLowerCase().includes(query)
          ))
      );
    }
    
    // アーカイブ日時でソート（新しい順）
    result.sort((a, b) => {
      const aTime = a.archivedAt?.getTime() || 0;
      const bTime = b.archivedAt?.getTime() || 0;
      return bTime - aTime;
    });
    
    return result;
  }, [notes, searchQuery]);

  // カテゴリ名を取得
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || '';
  };

  // カテゴリタイプを取得
  const getCategoryType = (categoryId: string): 'work' | 'private' | 'common' | null => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;

    if (category.type === 'main') {
      if (category.name === '仕事') return 'work';
      if (category.name === 'プライベート') return 'private';
      if (category.name === '共通') return 'common';
    }

    if (category.parentId) {
      const parent = categories.find((c) => c.id === category.parentId);
      if (parent?.name === '仕事') return 'work';
      if (parent?.name === 'プライベート') return 'private';
      if (parent?.name === '共通') return 'common';
    }

    return null;
  };

  // 選択トグル
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // 復元
  const handleRestore = async (id: string) => {
    await restoreNote(id);
  };

  // 一括復元
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    await restoreNotes(selectedIds);
    setSelectedIds([]);
  };

  // 完全削除
  const handlePermanentDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を完全に削除しますか？\nこの操作は取り消せません。`)) return;
    await permanentDeleteNote(id);
  };

  // 一括完全削除
  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}件のメモを完全に削除しますか？\nこの操作は取り消せません。`)) return;
    await permanentDeleteNotes(selectedIds);
    setSelectedIds([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/notes"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-bold text-gray-900">アーカイブ</h1>
          </div>
          <span className="text-sm text-gray-500">
            {archivedNotes.length}件
          </span>
        </div>

        {/* 検索バー */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="アーカイブ内を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* 選択中のアクション */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-amber-50 rounded-lg">
            <span className="text-sm font-medium text-amber-700">
              {selectedIds.length}件選択中
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              選択解除
            </button>
            <button
              onClick={handleBulkRestore}
              className="btn btn-secondary text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              復元
            </button>
            <button
              onClick={handleBulkPermanentDelete}
              className="btn bg-red-500 hover:bg-red-600 text-white text-sm"
            >
              <Trash2 className="w-4 h-4" />
              完全削除
            </button>
          </div>
        )}

        {/* メモリスト */}
        {archivedNotes.length === 0 ? (
          <div className="card p-12 text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery
                ? '条件に一致するメモがありません'
                : 'アーカイブされたメモはありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {archivedNotes.map((note) => {
              const categoryType = getCategoryType(note.categoryId);
              const isSelected = selectedIds.includes(note.id);

              return (
                <div
                  key={note.id}
                  className={`card hover:shadow-md transition-all ${
                    isSelected ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* チェックボックス */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(note.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />

                    {/* カテゴリインジケーター */}
                    <div
                      className={`w-1 self-stretch rounded-full ${
                        categoryType === 'work'
                          ? 'bg-blue-500'
                          : categoryType === 'common'
                          ? 'bg-green-500'
                          : categoryType === 'private'
                          ? 'bg-pink-500'
                          : 'bg-gray-300'
                      }`}
                    />

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {note.isFavorite && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        )}
                        <h3 className="font-medium text-gray-900 truncate">
                          {note.title}
                        </h3>
                      </div>

                      {note.content && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                          {note.content}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{getCategoryName(note.categoryId)}</span>
                        <span>
                          アーカイブ: {note.archivedAt
                            ? format(note.archivedAt, 'yyyy/MM/dd', { locale: ja })
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* アクション */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestore(note.id)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="復元"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(note.id, note.title)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="完全削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
