import { useState, useMemo } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { useAuth } from '../hooks/useAuth';
import type { UrlInfo } from '../types';
import {
  Star,
  AlertCircle,
  Plus,
  ExternalLink,
  FileText,
  ChevronRight,
  Settings,
  LogOut,
  Search,
  Briefcase,
  Home,
  X,
  Filter,
  ChevronDown,
  Pin,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { notes, categories, tags, openModal, isLoading } = useNotesStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);

  // 共通カテゴリのIDを取得
  const commonCategory = useMemo(
    () => categories.find((c) => c.name === '共通' && c.type === 'main'),
    [categories]
  );

  // 共通カテゴリとそのサブカテゴリのIDリスト
  const commonCategoryIds = useMemo(() => {
    if (!commonCategory) return [];
    const subCategoryIds = categories
      .filter((c) => c.type === 'sub' && c.parentId === commonCategory.id)
      .map((c) => c.id);
    return [commonCategory.id, ...subCategoryIds];
  }, [commonCategory, categories]);

  // 共通カテゴリのメモのみフィルタ
  const commonNotes = useMemo(
    () => notes.filter((n) => commonCategoryIds.includes(n.categoryId)),
    [notes, commonCategoryIds]
  );

  // フィルタがアクティブかどうか
  const hasActiveFilters = selectedTags.length > 0 || selectedPriority !== null;

  // 検索結果（全カテゴリ対象）
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && !hasActiveFilters) return [];
    
    let filtered = [...notes];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((note) => 
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        (note.urls && note.urls.some(u => 
          u.url.toLowerCase().includes(query) || 
          u.title.toLowerCase().includes(query)
        ))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((note) =>
        selectedTags.some((tagId) => note.tags.includes(tagId))
      );
    }

    if (selectedPriority !== null) {
      filtered = filtered.filter((note) => note.priority === selectedPriority);
    }

    return filtered.slice(0, 20);
  }, [notes, searchQuery, selectedTags, selectedPriority, hasActiveFilters]);

  // 共通カテゴリのお気に入り（全件、order順）
  const favoriteNotes = useMemo(
    () => commonNotes.filter((n) => n.isFavorite).sort((a, b) => a.order - b.order),
    [commonNotes]
  );

  // 全カテゴリの高重要度（全件、order順）
  const highPriorityNotes = useMemo(
    () => notes.filter((n) => n.priority === 1).sort((a, b) => a.order - b.order),
    [notes]
  );

  // 重要セクションの開閉状態
  const [isHighPriorityOpen, setIsHighPriorityOpen] = useState(false);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return '';
    
    if (category.type === 'sub' && category.parentId) {
      const parent = categories.find((c) => c.id === category.parentId);
      return `${parent?.name || ''} > ${category.name}`;
    }
    return category.name;
  };

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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-600';
      case 2:
        return 'bg-yellow-100 text-yellow-600';
      case 3:
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedPriority(null);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-semibold text-xl text-gray-900">
                MemoHub
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openModal('create')}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新規追加</span>
              </button>

              <Link
                to="/settings"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                title="設定"
              >
                <Settings className="w-5 h-5" />
              </Link>

              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user?.displayName?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </button>
                
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings className="w-4 h-4" />
                    設定
                  </Link>
                  <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                    <LogOut className="w-4 h-4" />
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー */}
        <div className="mb-8">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="メモを検索... (タイトル、内容、URL)"
                className="w-full pl-12 pr-24 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {(searchQuery || hasActiveFilters) && (
                  <button onClick={clearFilters} className="p-2 text-gray-400 hover:text-gray-600" title="クリア">
                    <X className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors relative ${
                    showFilters || hasActiveFilters
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="フィルタ"
                >
                  <Filter className="w-5 h-5" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                      {selectedTags.length + (selectedPriority !== null ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* フィルタパネル */}
            {showFilters && (
              <div className="mt-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">重要度</label>
                    <div className="flex gap-2">
                      {[
                        { value: 1, label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
                        { value: 2, label: '中', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                        { value: 3, label: '低', className: 'bg-blue-100 text-blue-700 border-blue-200' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedPriority(selectedPriority === option.value ? null : option.value)}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            selectedPriority === option.value
                              ? option.className + ' border-2'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">タグ</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.length === 0 ? (
                        <span className="text-sm text-gray-400">タグがありません</span>
                      ) : (
                        tags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              selectedTags.includes(tag.id)
                                ? 'ring-2 ring-offset-1 ring-gray-400'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* アクティブフィルタ表示 */}
            {hasActiveFilters && !showFilters && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">フィルタ:</span>
                {selectedPriority !== null && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedPriority === 1 ? 'bg-red-100 text-red-700' :
                    selectedPriority === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    重要度: {selectedPriority === 1 ? '高' : selectedPriority === 2 ? '中' : '低'}
                    <button onClick={() => setSelectedPriority(null)} className="ml-1 hover:opacity-70">×</button>
                  </span>
                )}
                {selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span key={tagId} className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                      {tag.name}
                      <button onClick={() => toggleTag(tagId)} className="ml-1 hover:opacity-70">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 検索結果 */}
          {(searchQuery || hasActiveFilters) && (
            <div className="max-w-3xl mx-auto mt-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm text-gray-600">{searchResults.length}件の結果</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">条件に一致するメモが見つかりません</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {searchResults.map((note) => (
                      <NoteListItem
                        key={note.id}
                        note={note}
                        categoryName={getCategoryName(note.categoryId)}
                        priorityColor={getPriorityColor(note.priority)}
                        tags={tags}
                        onClick={() => navigate(`/notes/${note.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        {!searchQuery && !hasActiveFilters && (
          <>
            {/* カテゴリボタン */}
            <div className="flex items-center gap-2 mb-8">
              <Link to="/notes?category=common" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                <Pin className="w-4 h-4" />
                共通
              </Link>
              <Link to="/notes?category=work" className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                <Briefcase className="w-4 h-4" />
                仕事
              </Link>
              <Link to="/notes?category=private" className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors">
                <Home className="w-4 h-4" />
                プライベート
              </Link>
              <Link to="/notes" className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ml-auto">
                すべてのメモ
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 高重要度セクション（アコーディオン） */}
            <section className="mb-10">
              <button
                onClick={() => setIsHighPriorityOpen(!isHighPriorityOpen)}
                className="w-full card px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-medium text-gray-900">重要</h3>
                  <span className="text-sm text-gray-500">({highPriorityNotes.length}件)</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isHighPriorityOpen ? 'rotate-180' : ''}`} />
              </button>

              {isHighPriorityOpen && (
                <div className="mt-2">
                  {highPriorityNotes.length === 0 ? (
                    <div className="card p-8 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">高重要度のメモはありません</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {highPriorityNotes.map((note) => (
                        <NoteRow
                          key={note.id}
                          note={note}
                          categoryName={getCategoryName(note.categoryId)}
                          onClick={() => navigate(`/notes/${note.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* お気に入りセクション（共通カテゴリのみ全件） */}
            <section className="mb-10">
              {favoriteNotes.length === 0 ? (
                <div className="card p-8 text-center">
                  <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">共通カテゴリのお気に入りメモはありません</p>
                  <button
                    onClick={() => openModal('create')}
                    className="mt-4 btn btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    最初のメモを作成
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {favoriteNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      categoryName={getCategoryName(note.categoryId)}
                      categoryType={getCategoryType(note.categoryId)}
                      onClick={() => navigate(`/notes/${note.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

// 検索結果のリストアイテム
const NoteListItem = ({
  note,
  categoryName,
  priorityColor,
  tags,
  onClick,
}: {
  note: any;
  categoryName: string;
  priorityColor: string;
  tags: any[];
  onClick: () => void;
}) => {
  const [showUrls, setShowUrls] = useState(false);
  const noteTags = note.tags.map((id: string) => tags.find((t) => t.id === id)).filter(Boolean);
  const hasUrls = note.urls && note.urls.length > 0;

  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${priorityColor}`}>
        {hasUrls ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
          {note.isFavorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
        </div>
        <p className="text-sm text-gray-500 truncate">{categoryName}</p>
        {noteTags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {noteTags.map((tag: any) => (
              <span key={tag.id} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* URLジャンプボタン */}
      {hasUrls && (
        <div className="relative flex-shrink-0">
          {note.urls.length === 1 ? (
            <a
              href={note.urls[0].url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={note.urls[0].title || note.urls[0].url}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUrls(!showUrls);
                }}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs">{note.urls.length}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showUrls && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUrls(false)} />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    {note.urls.map((urlInfo: UrlInfo, idx: number) => (
                      <a
                        key={idx}
                        href={urlInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{urlInfo.title || urlInfo.url}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// お気に入りカードコンポーネント
const NoteCard = ({
  note,
  categoryName,
  categoryType,
  onClick,
}: {
  note: any;
  categoryName: string;
  categoryType: 'work' | 'private' | 'common' | null;
  onClick: () => void;
}) => {
  const hasUrl = note.urls && note.urls.length > 0;

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-600';
      case 2: return 'bg-yellow-100 text-yellow-600';
      case 3: return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getBorderColor = () => {
    switch (categoryType) {
      case 'work': return 'hover:border-blue-200';
      case 'private': return 'hover:border-pink-200';
      case 'common': return 'hover:border-green-200';
      default: return 'hover:border-gray-200';
    }
  };

  return (
    <div className={`card p-4 text-left hover:shadow-md transition-all ${getBorderColor()}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityColor(note.priority)}`}>
          {hasUrl ? <ExternalLink className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <h3 className="font-medium text-gray-900 truncate mb-1">{note.title}</h3>
          <p className="text-sm text-gray-500 truncate">{categoryName}</p>
        </div>
      </div>
      {hasUrl && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {note.urls.slice(0, 2).map((urlInfo: UrlInfo, idx: number) => (
            <a
              key={idx}
              href={urlInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1 truncate"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{urlInfo.title || urlInfo.url}</span>
            </a>
          ))}
          {note.urls.length > 2 && (
            <span className="text-xs text-gray-400">+{note.urls.length - 2}件</span>
          )}
        </div>
      )}
    </div>
  );
};

// メモ行コンポーネント
const NoteRow = ({
  note,
  categoryName,
  onClick,
}: {
  note: any;
  categoryName: string;
  onClick: () => void;
}) => {
  const hasUrl = note.urls && note.urls.length > 0;

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-600';
      case 2: return 'bg-yellow-100 text-yellow-600';
      case 3: return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="card w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityColor(note.priority)}`}>
        {hasUrl ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
        <p className="text-sm text-gray-500 truncate">{categoryName}</p>
      </div>

      {note.isFavorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}

      {/* 複数URLアイコン表示 */}
      {hasUrl && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {note.urls.slice(0, 5).map((urlInfo: UrlInfo, idx: number) => (
            <a
              key={idx}
              href={urlInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={urlInfo.title || urlInfo.url}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
