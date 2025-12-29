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
  GripVertical,
  Pin,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    clearSelection,
    isLoading,
  } = useNotesStore();
  const { deleteNotes, updateNote, reorderNotes } = useFirestore();

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // URLパラメータからフィルタを設定
  useEffect(() => {
    const category = searchParams.get('category');
    const favorites = searchParams.get('favorite');
    const priority = searchParams.get('priority');

    if (category === 'work') {
      const workCategory = categories.find((c) => c.name === '仕事' && c.type === 'main');
      if (workCategory) setFilter({ categoryId: workCategory.id });
    } else if (category === 'private') {
      const privateCategory = categories.find((c) => c.name === 'プライベート' && c.type === 'main');
      if (privateCategory) setFilter({ categoryId: privateCategory.id });
    } else if (category === 'common') {
      const commonCategory = categories.find((c) => c.name === '共通' && c.type === 'main');
      if (commonCategory) setFilter({ categoryId: commonCategory.id });
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

  // フィルタリングされたメモ
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // 検索フィルタ
    if (filter.search) {
      const query = filter.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          (n.urls && n.urls.some(u =>
            u.url.toLowerCase().includes(query) ||
            u.title.toLowerCase().includes(query)
          ))
      );
    }

    // カテゴリフィルタ
    if (filter.categoryId) {
      const selectedCategory = categories.find((c) => c.id === filter.categoryId);
      if (selectedCategory?.type === 'main') {
        // メインカテゴリの場合、サブカテゴリも含める
        const subCategoryIds = categories
          .filter((c) => c.parentId === filter.categoryId)
          .map((c) => c.id);
        result = result.filter(
          (n) =>
            n.categoryId === filter.categoryId ||
            subCategoryIds.includes(n.categoryId)
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
    if (filter.priority) {
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
        case 'order':
          comparison = a.order - b.order;
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

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    if (!confirm(`${selectedNoteIds.length}件のメモを削除しますか？`)) return;

    await deleteNotes(selectedNoteIds);
    clearSelection();
  };

  // エクスポート
  const handleExport = () => {
    const notesToExport = filteredNotes.filter((n) =>
      selectedNoteIds.length > 0 ? selectedNoteIds.includes(n.id) : true
    );

    const data = notesToExport.map((n) => ({
      title: n.title,
      content: n.content,
      urls: n.urls,
      category: getCategoryName(n.categoryId),
      tags: n.tags.map((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag?.name || '';
      }),
      priority: n.priority,
      isFavorite: n.isFavorite,
      createdAt: format(n.createdAt, 'yyyy-MM-dd HH:mm'),
      updatedAt: format(n.updatedAt, 'yyyy-MM-dd HH:mm'),
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
  };

  // お気に入り切り替え
  const handleToggleFavorite = async (note: Note) => {
    await updateNote(note.id, { isFavorite: !note.isFavorite });
  };

  // ソートオプション
  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'order', label: 'カスタム順' },
    { field: 'updatedAt', label: '更新日' },
    { field: 'createdAt', label: '作成日' },
    { field: 'title', label: 'タイトル' },
    { field: 'priority', label: '重要度' },
  ];

  // ドラッグ＆ドロップセンサー
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredNotes.findIndex((n) => n.id === active.id);
      const newIndex = filteredNotes.findIndex((n) => n.id === over.id);

      const newOrder = arrayMove(filteredNotes, oldIndex, newIndex);
      const noteIds = newOrder.map((n) => n.id);

      await reorderNotes(noteIds);
    }
  };

  // カスタム順かどうか
  const isCustomOrder = sort.field === 'order';

  // 新規メモ作成時のハンドラー（現在のフィルタカテゴリをデフォルト値として渡す）
  const handleCreateNote = () => {
    openModal('create', undefined, filter.categoryId || undefined);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">ダッシュボード</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-semibold text-gray-900">すべてのメモ</h1>
            </div>

            {/* 改修: 新規追加ボタンでhandleCreateNoteを使用 */}
            <button
              onClick={handleCreateNote}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新規追加</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* サイドバー */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card p-4 sticky top-24">
              <h2 className="font-medium text-gray-900 mb-4">カテゴリ</h2>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setFilter({ categoryId: null });
                    setSearchParams({});
                  }}
                  className={`w-full sidebar-item ${
                    !filter.categoryId ? 'active' : ''
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  すべて
                  <span className="ml-auto text-sm text-gray-400">
                    {notes.length}
                  </span>
                </button>

                {mainCategories.map((category) => {
                  const subCategories = getSubCategories(category.id);
                  const isExpanded = expandedCategories.includes(category.id);
                  const count = notes.filter(
                    (n) =>
                      n.categoryId === category.id ||
                      subCategories.some((sc) => sc.id === n.categoryId)
                  ).length;

                  const getCategoryIcon = () => {
                    switch (category.name) {
                      case '仕事':
                        return <Briefcase className="w-4 h-4 text-blue-500" />;
                      case 'プライベート':
                        return <HomeIcon className="w-4 h-4 text-pink-500" />;
                      case '共通':
                        return <Pin className="w-4 h-4 text-green-500" />;
                      default:
                        return <span>{category.icon}</span>;
                    }
                  };

                  return (
                    <div key={category.id}>
                      <div className="flex items-center">
                        {subCategories.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedCategories((prev) =>
                                isExpanded
                                  ? prev.filter((id) => id !== category.id)
                                  : [...prev, category.id]
                              )
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setFilter({ categoryId: category.id })}
                          className={`flex-1 sidebar-item ${
                            filter.categoryId === category.id ? 'active' : ''
                          }`}
                        >
                          {getCategoryIcon()}
                          {category.name}
                          <span className="ml-auto text-sm text-gray-400">
                            {count}
                          </span>
                        </button>
                      </div>
                      {isExpanded &&
                        subCategories.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => setFilter({ categoryId: sub.id })}
                            className={`w-full sidebar-item pl-10 ${
                              filter.categoryId === sub.id ? 'active' : ''
                            }`}
                          >
                            {sub.name}
                            <span className="ml-auto text-sm text-gray-400">
                              {notes.filter((n) => n.categoryId === sub.id).length}
                            </span>
                          </button>
                        ))}
                    </div>
                  );
                })}
              </nav>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <button
                  onClick={() => setFilter({ showFavoritesOnly: !filter.showFavoritesOnly })}
                  className={`w-full sidebar-item ${
                    filter.showFavoritesOnly ? 'active' : ''
                  }`}
                >
                  <Star className="w-4 h-4 text-amber-500" />
                  お気に入り
                </button>
              </div>

              {/* タグフィルタ */}
              {tags.length > 0 && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">タグ</h3>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => {
                      const isSelected = filter.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            const newTagIds = isSelected
                              ? filter.tagIds.filter((id) => id !== tag.id)
                              : [...filter.tagIds, tag.id];
                            setFilter({ tagIds: newTagIds });
                          }}
                          className={`px-2 py-1 rounded-full text-xs transition-colors ${
                            isSelected
                              ? 'ring-2 ring-offset-1'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            ...(isSelected && {
                              boxShadow: `0 0 0 2px white, 0 0 0 4px ${tag.color}`,
                            }),
                          }}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1">
            {/* ツールバー */}
            <div className="card p-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* 検索 */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filter.search}
                    onChange={(e) => setFilter({ search: e.target.value })}
                    placeholder="検索..."
                    className="input pl-10"
                  />
                  {filter.search && (
                    <button
                      onClick={() => setFilter({ search: '' })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                    {sortOptions.find((o) => o.field === sort.field)?.label}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showSortMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSortMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
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
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                              sort.field === option.field ? 'text-primary-600' : ''
                            }`}
                          >
                            {option.label}
                            {sort.field === option.field && (
                              <span className="text-xs">
                                {sort.order === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* 一括操作 */}
                {selectedNoteIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {selectedNoteIds.length}件選択
                    </span>
                    <button
                      onClick={handleExport}
                      className="btn btn-secondary"
                      title="エクスポート"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="btn btn-secondary text-red-600 hover:bg-red-50"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearSelection}
                      className="btn btn-secondary"
                    >
                      <X className="w-4 h-4" />
                      選択解除
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* メモ一覧 */}
            {filteredNotes.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {filter.search || filter.categoryId || filter.tagIds.length > 0
                    ? '条件に一致するメモがありません'
                    : 'メモがありません'}
                </p>
                {/* 改修: handleCreateNoteを使用 */}
                <button
                  onClick={handleCreateNote}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  最初のメモを作成
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredNotes.map((n) => n.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={!isCustomOrder}
                >
                  <div className="space-y-1">
                    {filteredNotes.map((note) => {
                      const categoryType = getCategoryType(note.categoryId);
                      const isSelected = selectedNoteIds.includes(note.id);

                      return (
                        <SortableNoteItem
                          key={note.id}
                          note={note}
                          categoryType={categoryType}
                          isSelected={isSelected}
                          isCustomOrder={isCustomOrder}
                          getCategoryName={getCategoryName}
                          tags={tags}
                          navigate={navigate}
                          toggleSelectNote={toggleSelectNote}
                          handleToggleFavorite={handleToggleFavorite}
                          openModal={openModal}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* 件数表示 */}
            {filteredNotes.length > 0 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                {filteredNotes.length}件のメモ
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// ソート可能なメモアイテムコンポーネント
const SortableNoteItem = ({
  note,
  categoryType,
  isSelected,
  isCustomOrder,
  getCategoryName,
  tags,
  navigate,
  toggleSelectNote,
  handleToggleFavorite,
  openModal,
}: {
  note: Note;
  categoryType: 'work' | 'private' | 'common' | null;
  isSelected: boolean;
  isCustomOrder: boolean;
  getCategoryName: (id: string) => string;
  tags: any[];
  navigate: (path: string) => void;
  toggleSelectNote: (id: string) => void;
  handleToggleFavorite: (note: Note) => void;
  openModal: (mode: 'create' | 'edit', noteId?: string, defaultCategoryId?: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: !isCustomOrder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const noteTags = note.tags
    .map((tagId) => tags.find((t: any) => t.id === tagId))
    .filter(Boolean);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card px-3 h-12 flex items-center gap-2 hover:shadow-md transition-all ${
        isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* ドラッグハンドル */}
      {isCustomOrder && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* 選択チェックボックス */}
      <button
        onClick={() => toggleSelectNote(note.id)}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
          isSelected
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {isSelected && <Check className="w-2.5 h-2.5" />}
      </button>

      {/* アイコン */}
      <div
        className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
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
          <ExternalLink className="w-3.5 h-3.5" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
      </div>

      {/* コンテンツ */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/notes/${note.id}`)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate text-sm">
            {note.title}
          </h3>
          {note.priority === 1 && (
            <span className="badge priority-high text-xs">高</span>
          )}
          {note.priority === 2 && (
            <span className="badge priority-medium text-xs">中</span>
          )}
          {note.priority === 3 && (
            <span className="badge priority-low text-xs">低</span>
          )}
          <span
            className={`text-xs ${
              categoryType === 'work' ? 'text-blue-600' :
              categoryType === 'common' ? 'text-green-600' : 'text-pink-600'
            }`}
          >
            {getCategoryName(note.categoryId)}
          </span>
        </div>
      </div>

      {/* タグ */}
      <div className="hidden sm:flex items-center gap-1">
        {noteTags.slice(0, 2).map((tag: any) => (
          <span
            key={tag.id}
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            {tag.name}
          </span>
        ))}
        {noteTags.length > 2 && (
          <span className="text-xs text-gray-400">+{noteTags.length - 2}</span>
        )}
      </div>

      {/* 更新日時 */}
      <span className="hidden md:block text-xs text-gray-400 whitespace-nowrap">
        {formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: ja })}
      </span>

      {/* アクション */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleToggleFavorite(note)}
          className={`p-1.5 rounded transition-colors ${
            note.isFavorite
              ? 'text-amber-500 hover:bg-amber-50'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-amber-500' : ''}`} />
        </button>
        <button
          onClick={() => openModal('edit', note.id)}
          className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
