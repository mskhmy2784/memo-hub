import { useMemo } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { useAuth } from '../hooks/useAuth';
import {
  Star,
  AlertCircle,
  Clock,
  Plus,
  ExternalLink,
  FileText,
  ChevronRight,
  Settings,
  LogOut,
  Search,
  Briefcase,
  Home,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { notes, categories, openModal, isLoading } = useNotesStore();
  const navigate = useNavigate();

  // お気に入りのメモ
  const favoriteNotes = useMemo(
    () => notes.filter((n) => n.isFavorite).slice(0, 8),
    [notes]
  );

  // 高重要度のメモ
  const highPriorityNotes = useMemo(
    () => notes.filter((n) => n.priority === 1).slice(0, 5),
    [notes]
  );

  // 最近追加されたメモ
  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
    [notes]
  );

  // カテゴリ名を取得
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return '';
    
    if (category.type === 'sub' && category.parentId) {
      const parent = categories.find((c) => c.id === category.parentId);
      return `${parent?.name || ''} > ${category.name}`;
    }
    return category.name;
  };

  // カテゴリのメインタイプを判定
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
            {/* ロゴ */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-semibold text-xl text-gray-900">
                MemoHub
              </span>
            </div>

            {/* 検索 & アクション */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/notes')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors w-64"
              >
                <Search className="w-4 h-4" />
                <span className="text-sm">検索...</span>
                <kbd className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  ⌘K
                </kbd>
              </button>

              <button
                onClick={() => openModal('create')}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新規追加</span>
              </button>

              {/* ユーザーメニュー */}
              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user?.displayName?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </button>
                
                {/* ドロップダウン */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    設定
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* カテゴリ切り替え */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            to="/notes?category=work"
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            仕事
          </Link>
          <Link
            to="/notes?category=private"
            className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            プライベート
          </Link>
          <Link
            to="/notes"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            すべて表示
          </Link>
        </div>

        {/* お気に入りセクション */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">お気に入り</h2>
            </div>
            <Link
              to="/notes?favorites=true"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              もっと見る
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {favoriteNotes.length === 0 ? (
            <div className="card p-8 text-center">
              <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">お気に入りに追加されたメモはありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favoriteNotes.map((note) => (
                <FavoriteCard
                  key={note.id}
                  note={note}
                  categoryType={getCategoryType(note.categoryId)}
                  onClick={() => {
                    if (note.url) {
                      window.open(note.url, '_blank');
                    } else {
                      navigate(`/notes/${note.id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* 高重要度セクション */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">重要</h2>
            </div>
            <Link
              to="/notes?priority=1"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              もっと見る
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

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
                  categoryType={getCategoryType(note.categoryId)}
                  onClick={() => navigate(`/notes/${note.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 最近追加セクション */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">最近追加</h2>
            </div>
            <Link
              to="/notes"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              もっと見る
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentNotes.length === 0 ? (
            <div className="card p-8 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">メモがありません</p>
              <button
                onClick={() => openModal('create')}
                className="btn btn-primary mt-4"
              >
                <Plus className="w-4 h-4" />
                最初のメモを作成
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  categoryName={getCategoryName(note.categoryId)}
                  categoryType={getCategoryType(note.categoryId)}
                  showTime
                  onClick={() => navigate(`/notes/${note.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// お気に入りカードコンポーネント
const FavoriteCard = ({
  note,
  categoryType,
  onClick,
}: {
  note: any;
  categoryType: 'work' | 'private' | null;
  onClick: () => void;
}) => {
  const hasUrl = !!note.url;

  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-transform group"
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            categoryType === 'work'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-pink-100 text-pink-600'
          }`}
        >
          {hasUrl ? (
            <ExternalLink className="w-5 h-5" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
        </div>
        {note.priority === 1 && (
          <span className="w-2 h-2 bg-red-500 rounded-full" />
        )}
      </div>
      <h3 className="font-medium text-gray-900 truncate text-sm">
        {note.title}
      </h3>
      {note.content && (
        <p className="text-xs text-gray-500 truncate mt-1">
          {note.content}
        </p>
      )}
    </button>
  );
};

// メモ行コンポーネント
const NoteRow = ({
  note,
  categoryName,
  categoryType,
  showTime,
  onClick,
}: {
  note: any;
  categoryName: string;
  categoryType: 'work' | 'private' | null;
  showTime?: boolean;
  onClick: () => void;
}) => {
  const hasUrl = !!note.url;

  return (
    <button
      onClick={onClick}
      className="card w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          note.priority === 1
            ? 'bg-red-100 text-red-600'
            : categoryType === 'work'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-pink-100 text-pink-600'
        }`}
      >
        {hasUrl ? (
          <ExternalLink className="w-4 h-4" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">
          {note.title}
        </h3>
        <p className="text-sm text-gray-500 truncate">
          {categoryName}
        </p>
      </div>

      {showTime && (
        <span className="text-sm text-gray-400 flex-shrink-0">
          {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: ja })}
        </span>
      )}

      {note.isFavorite && (
        <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
      )}
    </button>
  );
};
