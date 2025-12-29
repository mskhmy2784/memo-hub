import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import type { Note, SortField, UrlInfo } from '../types';
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
  FileJson,
  FileType,
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
import { exportToWord } from '../utils/exportToWord';

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
  const [showExportMenu, setShowExportMenu] = useState(false);

  // URLパラメータからフィルタを設定
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      if (category === 'work' || category === 'private' || category === 'common') {
        const mainCategory = categories.find(
          (c) =>
            c.type === 'main' &&
            ((category === 'work' && c.name === '仕事') ||
              (category === 'private' && c.name === 'プライベート') ||
              (category === 'common' && c.name === '共通'))
        );
        if (mainCategory) {
          setFilter({ categoryId: mainCategory.id });
        }
      } else {
        setFilter({ categoryId: category });
      }
    }
  }, [searchParams, categories, setFilter]);

  // フィルタ適用済みメモ
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // 検索フィルタ
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.content.toLowerCase().includes(searchLower) ||
          (n.urls &&
            n.urls.some(
              (u) =>
                u.url.toLowerCase().includes(searchLower) ||
                u.title.toLowerCase().includes(searchLower)
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
          // カスタム順は常に昇順（ダッシュボードと一致）
          comparison = a.order - b.order;
          return comparison; // sort.orderを無視して常に昇順
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

  // 共通のエクスポートデータ生成
  const getExportData = () => {
    const notesToExport = filteredNotes.filter((n) =>
      selectedNoteIds.length > 0 ? selectedNoteIds.includes(n.id) : true
    );

    return notesToExport.map((n) => ({
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
  };

  // JSONエクスポート
  const handleExportJSON = () => {
    const data = getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Wordエクスポート
  const handleExportWord = async () => {
    const data = getExportData();
    await exportToWord(data);
    setShowExportMenu(false);
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

  // メインカテゴリ
  const mainCategories = categories.filter((c) => c.type === 'main');

  // サブカテゴリを取得
  const getSubCategories = (parentId: string) => {
    return categories.filter((c) => c.type === 'sub' && c.parentId === parentId);
  };

  // カテゴリ展開トグル
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // 現在のカテゴリ情報
  const currentCategory = filter.categoryId
    ? categories.find((c) => c.id === filter.categoryId)
    : null;
  const currentCategoryType = currentCategory
    ? getCategoryType(currentCategory.id)
    : null;

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
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentCategory ? (
                    <span className="flex items-center gap-2">
                      {currentCategoryType === 'work' && (
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      )}
                      {currentCategoryType === 'private' && (
                        <HomeIcon className="w-5 h-5 text-pink-600" />
                      )}
                      {currentCategoryType === 'common' && (
                        <Pin className="w-5 h-5 text-green-600" />
                      )}
                      {currentCategory.name}
                    </span>
                  ) : (
                    'すべてのメモ'
                  )}
                </h1>
              </div>
            </div>

            <button
              onClick={() => openModal('create')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新規メモ</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* サイドバー（カテゴリ） */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setFilter({ categoryId: null });
                  setSearchParams({});
                }}
                className={`sidebar-item w-full ${
                  !filter.categoryId ? 'active' : ''
                }`}
              >
                <FileText className="w-5 h-5" />
                すべてのメモ
              </button>

              {mainCategories.map((mainCat) => {
                const subCategories = getSubCategories(mainCat.id);
                const isExpanded = expandedCategories.includes(mainCat.id);
                const isSelected = filter.categoryId === mainCat.id;
                const Icon =
                  mainCat.name === '仕事'
                    ? Briefcase
                    : mainCat.name === '共通'
                    ? Pin
                    : HomeIcon;
                const iconColor =
                  mainCat.name === '仕事'
                    ? 'text-blue-600'
                    : mainCat.name === '共通'
                    ? 'text-green-600'
                    : 'text-pink-600';

                return (
                  <div key={mainCat.id}>
                    <div className="flex items-center">
                      {subCategories.length > 0 && (
                        <button
                          onClick={() => toggleCategory(mainCat.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setFilter({ categoryId: mainCat.id });
                          setSearchParams({ category: mainCat.id });
                        }}
                        className={`sidebar-item flex-1 ${
                          isSelected ? 'active' : ''
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                        {mainCat.name}
                      </button>
                    </div>

                    {isExpanded && subCategories.length > 0 && (
                      <div className="ml-6 space-y-1 mt-1">
                        {subCategories.map((subCat) => (
                          <button
                            key={subCat.id}
                            onClick={() => {
                              setFilter({ categoryId: subCat.id });
                              setSearchParams({ category: subCat.id });
                            }}
                            className={`sidebar-item w-full text-sm ${
                              filter.categoryId === subCat.id ? 'active' : ''
                            }`}
                          >
                            {subCat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1 min-w-0">
            {/* 検索・フィルタ */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* 検索 */}
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="メモを検索..."
                    value={filter.search}
                    onChange={(e) => setFilter({ search: e.target.value })}
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

                {/* ソートメニュー */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    {sort.order === 'asc' ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {sortOptions.find((o) => o.field === sort.field)?.label}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showSortMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSortMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        {sortOptions.map((option) => (
                          <button
                            key={option.field}
                            onClick={() => {
                              if (sort.field === option.field) {
                                // カスタム順以外の場合のみ昇順/降順切り替え
                                if (option.field !== 'order') {
                                  setSort({
                                    order: sort.order === 'asc' ? 'desc' : 'asc',
                                  });
                                }
                              } else {
                                // カスタム順の場合は常に昇順（ダッシュボードと一致）
                                setSort({
                                  field: option.field,
                                  order: option.field === 'order' ? 'asc' : 'desc',
                                });
                              }
                              setShowSortMenu(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                              sort.field === option.field
                                ? 'text-primary-600 bg-primary-50'
                                : 'text-gray-700'
                            }`}
                          >
                            {option.label}
                            {sort.field === option.field && option.field !== 'order' && (
                              <span>{sort.order === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 選択中のアクション */}
              {selectedNoteIds.length > 0 && (
                <div className="flex items-center gap-4 mt-4 p-3 bg-primary-50 rounded-lg">
                  <span className="text-sm font-medium text-primary-700">
                    {selectedNoteIds.length}件選択中
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    選択解除
                  </button>

                  {/* エクスポートドロップダウン */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="btn btn-secondary text-sm"
                    >
                      <Download className="w-4 h-4" />
                      エクスポート
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showExportMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowExportMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                          <button
                            onClick={handleExportJSON}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FileJson className="w-4 h-4 text-amber-500" />
                            JSON形式
                          </button>
                          <button
                            onClick={handleExportWord}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FileType className="w-4 h-4 text-blue-600" />
                            Word形式 (.docx)
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleBulkDelete}
                    className="btn bg-red-500 hover:bg-red-600 text-white text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    削除
                  </button>
                </div>
              )}
            </div>

            {/* カスタム順の説明 */}
            {isCustomOrder && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                ドラッグ＆ドロップでメモの順序を変更できます
              </div>
            )}

            {/* メモリスト */}
            {filteredNotes.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {filter.search || filter.categoryId || filter.tagIds.length > 0
                    ? '条件に一致するメモがありません'
                    : 'メモがありません'}
                </p>
                <button
                  onClick={() => openModal('create')}
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
  openModal: (mode: 'create' | 'edit', id?: string) => void;
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
              categoryType === 'work'
                ? 'text-blue-600'
                : categoryType === 'common'
                ? 'text-green-600'
                : 'text-pink-600'
            }`}
          >
            {getCategoryName(note.categoryId)}
          </span>
        </div>
      </div>

      {/* タグ（PCのみ） */}
      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
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

      {/* URLボタン */}
      {note.urls && note.urls.length > 0 && (
        <div className="flex-shrink-0">
          {note.urls.length === 1 ? (
            <a
              href={(note.urls[0] as UrlInfo).url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={
                (note.urls[0] as UrlInfo).title || (note.urls[0] as UrlInfo).url
              }
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <div className="relative group/url">
              <button className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-0.5">
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs">{note.urls.length}</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 opacity-0 invisible group-hover/url:opacity-100 group-hover/url:visible transition-all">
                {note.urls.map((urlInfo: UrlInfo, idx: number) => (
                  <a
                    key={idx}
                    href={urlInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{urlInfo.title || urlInfo.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日時 */}
      <div className="hidden sm:block text-xs text-gray-400 flex-shrink-0">
        {formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: ja })}
      </div>

      {/* お気に入りボタン */}
      <button
        onClick={() => handleToggleFavorite(note)}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <Star
          className={`w-4 h-4 ${
            note.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-gray-400'
          }`}
        />
      </button>

      {/* 編集ボタン */}
      <button
        onClick={() => openModal('edit', note.id)}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <Edit className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
};
