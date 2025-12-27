import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import type { Note, SortField } from '../types';
import {
  Search,
  Plus,
  SortAsc,
  SortDesc,
  Star,
  ExternalLink,
  FileText,
  Trash2,
  Edit,
  Download,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Briefcase,
  Home as HomeIcon,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const NotesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  useAuth();
  const {
    notes,
    categories,
    tags,
    filter,
    sort,
    selectedNoteIds,
    setFilter,
    setSort,
    openModal,
    toggleSelectNote,
    selectAllNotes,
    clearSelection,
    isLoading,
  } = useNotesStore();
  const { deleteNotes, updateNote } = useFirestore();

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // URLパラメータからフィルタを設定
  useEffect(() => {
    const category = searchParams.get('category');
    const favorites = searchParams.get('favorites');
    const priority = searchParams.get('priority');

    if (category === 'work') {
      const workCategory = categories.find((c) => c.name === '仕事' && c.type === 'main');
      if (workCategory) setFilter({ categoryId: workCategory.id });
    } else if (category === 'private') {
      const privateCategory = categories.find((c) => c.name === 'プライベート' && c.type === 'main');
      if (privateCategory) setFilter({ categoryId: privateCategory.id });
    }

    if (favorites === 'true') {
      setFilter({ showFavoritesOnly: true });
    }

    if (priority) {
      setFilter({ priority: parseInt(priority) });
    }
  }, [searchParams, categories, setFilter]);

  // メインカテゴリを取得
  const mainCategories = useMemo(
    () => categories.filter((c) => c.type === 'main'),
    [categories]
  );

  // サブカテゴリを取得
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => c.type === 'sub' && c.parentId === parentId);

  // フィルタリング & ソート
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // 検索
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.content.toLowerCase().includes(searchLower) ||
          n.url?.toLowerCase().includes(searchLower)
      );
    }

    // カテゴリフィルタ
    if (filter.categoryId) {
      const category = categories.find((c) => c.id === filter.categoryId);
      if (category?.type === 'main') {
        // メインカテゴリの場合、サブカテゴリも含める
        const subCategoryIds = getSubCategories(category.id).map((c) => c.id);
        result = result.filter(
          (n) => n.categoryId === filter.categoryId || subCategoryIds.includes(n.categoryId)
        );
      } else {
        result = result.filter((n) => n.categoryId === filter.categoryId);
      }
    }

    // タグフィルタ
    if (filter.tagIds.length > 0) {
      result = result.filter((n) =>
        filter.tagIds.some((tagId) => n.tags.includes(tagId))
      );
    }

    // 重要度フィルタ
    if (filter.priority !== null) {
      result = result.filter((n) => n.priority === filter.priority);
    }

    // お気に入りフィルタ
    if (filter.showFavoritesOnly) {
      result = result.filter((n) => n.isFavorite);
    }

    // ソート
    result.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'title':
          comparison = a.title.localeCompare(b.title, 'ja');
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
        default:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
      }
      return sort.order === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [notes, filter, sort, categories]);

  // カテゴリ名を取得
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || '';
  };

  // カテゴリタイプを取得
  const getCategoryType = (categoryId: string): 'work' | 'private' | null => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;

    if (category.type === 'main') {
      return category.name === '仕事' ? 'work' : 'private';
    }

    if (category.parentId) {
      const parent = categories.find((c) => c.id === category.parentId);
      return parent?.name === '仕事' ? 'work' : 'private';
    }

    return null;
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    if (!confirm(`${selectedNoteIds.length}件のメモを削除しますか？`)) return;

    await deleteNotes(selectedNoteIds);
    clearSelection();
  };

  // エクスポート
  const handleExport = () => {
    const notesToExport = selectedNoteIds.length > 0
      ? notes.filter((n) => selectedNoteIds.includes(n.id))
      : filteredNotes;

    const exportData = notesToExport.map((n) => ({
      title: n.title,
      content: n.content,
      url: n.url,
      category: getCategoryName(n.categoryId),
      tags: n.tags.map((tagId) => tags.find((t) => t.id === tagId)?.name || ''),
      priority: n.priority,
      isFavorite: n.isFavorite,
      createdAt: format(n.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(n.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memo-export-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // お気に入り切り替え
  const handleToggleFavorite = async (note: Note) => {
    await updateNote(note.id, { isFavorite: !note.isFavorite });
  };

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'updatedAt', label: '更新日' },
    { field: 'createdAt', label: '作成日' },
    { field: 'title', label: 'タイトル' },
    { field: 'priority', label: '重要度' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            ダッシュボード
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {/* すべて */}
          <button
            onClick={() => {
              setFilter({ categoryId: null });
              setSearchParams({});
            }}
            className={`sidebar-item w-full ${!filter.categoryId ? 'active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            すべてのメモ
            <span className="ml-auto text-xs text-gray-400">{notes.length}</span>
          </button>

          {/* お気に入り */}
          <button
            onClick={() => setFilter({ showFavoritesOnly: !filter.showFavoritesOnly })}
            className={`sidebar-item w-full ${filter.showFavoritesOnly ? 'active' : ''}`}
          >
            <Star className={`w-4 h-4 ${filter.showFavoritesOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
            お気に入り
            <span className="ml-auto text-xs text-gray-400">
              {notes.filter((n) => n.isFavorite).length}
            </span>
          </button>

          <div className="pt-4 pb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              カテゴリ
            </span>
          </div>

          {/* カテゴリツリー */}
          {mainCategories.map((mainCat) => {
            const subCategories = getSubCategories(mainCat.id);
            const isExpanded = expandedCategories.includes(mainCat.id);
            const isWork = mainCat.name === '仕事';
            const count = notes.filter((n) => {
              if (n.categoryId === mainCat.id) return true;
              return subCategories.some((sub) => sub.id === n.categoryId);
            }).length;

            return (
              <div key={mainCat.id}>
                <button
                  onClick={() => {
                    setFilter({ categoryId: mainCat.id });
                    if (subCategories.length > 0) {
                      setExpandedCategories((prev) =>
                        isExpanded
                          ? prev.filter((id) => id !== mainCat.id)
                          : [...prev, mainCat.id]
                      );
                    }
                  }}
                  className={`sidebar-item w-full ${
                    filter.categoryId === mainCat.id ? 'active' : ''
                  }`}
                >
                  {subCategories.length > 0 ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )
                  ) : isWork ? (
                    <Briefcase className="w-4 h-4" />
                  ) : (
                    <HomeIcon className="w-4 h-4" />
                  )}
                  {mainCat.name}
                  <span className="ml-auto text-xs text-gray-400">{count}</span>
                </button>

                {isExpanded && subCategories.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {subCategories.map((subCat) => {
                      const subCount = notes.filter((n) => n.categoryId === subCat.id).length;
                      return (
                        <button
                          key={subCat.id}
                          onClick={() => setFilter({ categoryId: subCat.id })}
                          className={`sidebar-item w-full text-sm ${
                            filter.categoryId === subCat.id ? 'active' : ''
                          }`}
                        >
                          <span className="w-4" />
                          {subCat.name}
                          <span className="ml-auto text-xs text-gray-400">{subCount}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-4 pb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              タグ
            </span>
          </div>

          {/* タグリスト */}
          <div className="space-y-1">
            {tags.map((tag) => {
              const isActive = filter.tagIds.includes(tag.id);
              const count = notes.filter((n) => n.tags.includes(tag.id)).length;
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    setFilter({
                      tagIds: isActive
                        ? filter.tagIds.filter((id) => id !== tag.id)
                        : [...filter.tagIds, tag.id],
                    });
                  }}
                  className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <span className="ml-auto text-xs text-gray-400">{count}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* 設定リンク */}
        <div className="p-4 border-t border-gray-100">
          <Link to="/settings" className="sidebar-item w-full">
            設定
          </Link>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              {/* 検索 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="タイトル、メモ、URLで検索..."
                  value={filter.search}
                  onChange={(e) => setFilter({ search: e.target.value })}
                  className="input pl-10"
                />
              </div>

              {/* ソート */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="btn btn-secondary"
                >
                  {sort.order === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {sortOptions.find((o) => o.field === sort.field)?.label}
                  </span>
                </button>

                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      {sortOptions.map((option) => (
                        <button
                          key={option.field}
                          onClick={() => {
                            if (sort.field === option.field) {
                              setSort({ order: sort.order === 'asc' ? 'desc' : 'asc' });
                            } else {
                              setSort({ field: option.field, order: 'desc' });
                            }
                            setShowSortMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          {option.label}
                          {sort.field === option.field && (
                            <span className="text-primary-600">
                              {sort.order === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 新規追加 */}
              <button onClick={() => openModal('create')} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">追加</span>
              </button>
            </div>

            {/* 選択時のアクションバー */}
            {selectedNoteIds.length > 0 && (
              <div className="flex items-center gap-4 mt-4 p-3 bg-primary-50 rounded-lg">
                <span className="text-sm text-primary-700">
                  {selectedNoteIds.length}件選択中
                </span>
                <div className="flex-1" />
                <button
                  onClick={handleExport}
                  className="btn btn-secondary text-sm py-1.5"
                >
                  <Download className="w-4 h-4" />
                  エクスポート
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-danger text-sm py-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  削除
                </button>
                <button
                  onClick={clearSelection}
                  className="btn btn-ghost text-sm py-1.5"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </header>

        {/* メモ一覧 */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">メモが見つかりません</p>
              <button onClick={() => openModal('create')} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                新規メモを作成
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 全選択 */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    if (selectedNoteIds.length === filteredNotes.length) {
                      clearSelection();
                    } else {
                      selectAllNotes(filteredNotes.map((n) => n.id));
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {selectedNoteIds.length === filteredNotes.length
                    ? 'すべて解除'
                    : 'すべて選択'}
                </button>
                <span className="text-sm text-gray-400">
                  ({filteredNotes.length}件)
                </span>
              </div>

              {filteredNotes.map((note) => {
                const isSelected = selectedNoteIds.includes(note.id);
                const categoryType = getCategoryType(note.categoryId);

                return (
                  <div
                    key={note.id}
                    className={`card p-4 flex items-center gap-4 group ${
                      isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                    }`}
                  >
                    {/* チェックボックス */}
                    <button
                      onClick={() => toggleSelectNote(note.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>

                    {/* アイコン */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        note.priority === 1
                          ? 'bg-red-100 text-red-600'
                          : categoryType === 'work'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-pink-100 text-pink-600'
                      }`}
                    >
                      {note.url ? (
                        <ExternalLink className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>

                    {/* コンテンツ */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/notes/${note.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {note.title}
                        </h3>
                        {note.priority === 1 && (
                          <span className="badge priority-high">高</span>
                        )}
                        {note.priority === 2 && (
                          <span className="badge priority-medium">中</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`badge ${
                            categoryType === 'work' ? 'badge-work' : 'badge-private'
                          }`}
                        >
                          {getCategoryName(note.categoryId)}
                        </span>
                        {note.tags.slice(0, 2).map((tagId) => {
                          const tag = tags.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tagId}
                              className="badge"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          );
                        })}
                        {note.tags.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 日時 */}
                    <div className="hidden sm:block text-sm text-gray-400 flex-shrink-0">
                      {formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: ja })}
                    </div>

                    {/* お気に入りボタン */}
                    <button
                      onClick={() => handleToggleFavorite(note)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          note.isFavorite
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>

                    {/* アクション */}
                    <button
                      onClick={() => openModal('edit', note.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
