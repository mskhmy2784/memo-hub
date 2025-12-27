import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Folder,
  Tag as TagIcon,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { categories, tags } = useNotesStore();
  const {
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    updateTag,
    deleteTag,
  } = useFirestore();

  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');

  // カテゴリ編集
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [newSubCategoryParent, setNewSubCategoryParent] = useState<string | null>(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  // タグ編集
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // メインカテゴリを取得
  const mainCategories = categories.filter((c) => c.type === 'main');

  // サブカテゴリを取得
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => c.type === 'sub' && c.parentId === parentId);

  // サブカテゴリ追加
  const handleAddSubCategory = async (parentId: string) => {
    if (!newSubCategoryName.trim()) return;

    const maxOrder = Math.max(
      ...categories.filter((c) => c.parentId === parentId).map((c) => c.order),
      0
    );

    await addCategory({
      name: newSubCategoryName.trim(),
      type: 'sub',
      parentId,
      order: maxOrder + 1,
    });

    setNewSubCategoryName('');
    setNewSubCategoryParent(null);
  };

  // カテゴリ更新
  const handleUpdateCategory = async (id: string) => {
    if (!categoryName.trim()) return;

    await updateCategory(id, { name: categoryName.trim() });
    setEditingCategoryId(null);
    setCategoryName('');
  };

  // カテゴリ削除
  const handleDeleteCategory = async (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (!category) return;

    // メインカテゴリは削除不可
    if (category.type === 'main') {
      alert('メインカテゴリは削除できません');
      return;
    }

    if (!confirm(`「${category.name}」を削除しますか？`)) return;

    await deleteCategory(id);
  };

  // タグ追加
  const handleAddTag = async () => {
    if (!tagName.trim()) return;

    await addTag({
      name: tagName.trim(),
      color: tagColor,
    });

    setTagName('');
    setTagColor('#3b82f6');
    setIsAddingTag(false);
  };

  // タグ更新
  const handleUpdateTag = async (id: string) => {
    if (!tagName.trim()) return;

    await updateTag(id, {
      name: tagName.trim(),
      color: tagColor,
    });

    setEditingTagId(null);
    setTagName('');
  };

  // タグ削除
  const handleDeleteTag = async (id: string) => {
    const tag = tags.find((t) => t.id === id);
    if (!tag) return;

    if (!confirm(`タグ「${tag.name}」を削除しますか？`)) return;

    await deleteTag(id);
  };

  const colorOptions = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#6b7280', // gray
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">設定</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* ユーザー情報 */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント</h2>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-medium text-gray-600">
                  {user?.displayName?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{user?.displayName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="ml-auto btn btn-secondary text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </section>

        {/* タブ */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Folder className="w-4 h-4 inline-block mr-2" />
            カテゴリ
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tags'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TagIcon className="w-4 h-4 inline-block mr-2" />
            タグ
          </button>
        </div>

        {/* カテゴリ管理 */}
        {activeTab === 'categories' && (
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                カテゴリ管理
              </h2>
              <p className="text-sm text-gray-500">
                サブカテゴリを追加・編集できます
              </p>
            </div>

            <div className="space-y-4">
              {mainCategories.map((mainCat) => {
                const subCategories = getSubCategories(mainCat.id);

                return (
                  <div key={mainCat.id} className="border border-gray-200 rounded-lg">
                    {/* メインカテゴリ */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-t-lg">
                      <Folder className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {mainCat.icon} {mainCat.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        メインカテゴリ（編集不可）
                      </span>
                    </div>

                    {/* サブカテゴリ一覧 */}
                    <div className="divide-y divide-gray-100">
                      {subCategories.map((subCat) => (
                        <div
                          key={subCat.id}
                          className="flex items-center gap-3 p-4 pl-12"
                        >
                          {editingCategoryId === subCat.id ? (
                            <>
                              <input
                                type="text"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="input flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateCategory(subCat.id)}
                                className="btn btn-primary py-1.5"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCategoryId(null);
                                  setCategoryName('');
                                }}
                                className="btn btn-secondary py-1.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                              <span className="flex-1 text-gray-700">{subCat.name}</span>
                              <button
                                onClick={() => {
                                  setEditingCategoryId(subCat.id);
                                  setCategoryName(subCat.name);
                                }}
                                className="p-1.5 rounded hover:bg-gray-100"
                              >
                                <Edit2 className="w-4 h-4 text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(subCat.id)}
                                className="p-1.5 rounded hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      {/* サブカテゴリ追加 */}
                      {newSubCategoryParent === mainCat.id ? (
                        <div className="flex items-center gap-3 p-4 pl-12">
                          <input
                            type="text"
                            value={newSubCategoryName}
                            onChange={(e) => setNewSubCategoryName(e.target.value)}
                            placeholder="サブカテゴリ名"
                            className="input flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddSubCategory(mainCat.id)}
                            className="btn btn-primary py-1.5"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setNewSubCategoryParent(null);
                              setNewSubCategoryName('');
                            }}
                            className="btn btn-secondary py-1.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewSubCategoryParent(mainCat.id)}
                          className="flex items-center gap-2 p-4 pl-12 text-primary-600 hover:bg-primary-50 w-full"
                        >
                          <Plus className="w-4 h-4" />
                          サブカテゴリを追加
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* タグ管理 */}
        {activeTab === 'tags' && (
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">タグ管理</h2>
              <button
                onClick={() => setIsAddingTag(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                タグを追加
              </button>
            </div>

            {/* タグ追加フォーム */}
            {isAddingTag && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="タグ名"
                  className="input flex-1"
                  autoFocus
                />
                <div className="flex gap-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setTagColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        tagColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleAddTag}
                  className="btn btn-primary py-1.5"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsAddingTag(false);
                    setTagName('');
                  }}
                  className="btn btn-secondary py-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* タグ一覧 */}
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  {editingTagId === tag.id ? (
                    <>
                      <input
                        type="text"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        className="input flex-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setTagColor(color)}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              tagColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleUpdateTag(tag.id)}
                        className="btn btn-primary py-1.5"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTagId(null);
                          setTagName('');
                        }}
                        className="btn btn-secondary py-1.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-gray-700">{tag.name}</span>
                      <button
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setTagName(tag.name);
                          setTagColor(tag.color);
                        }}
                        className="p-1.5 rounded hover:bg-gray-100"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1.5 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {tags.length === 0 && !isAddingTag && (
                <div className="text-center py-8 text-gray-500">
                  タグがありません
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
