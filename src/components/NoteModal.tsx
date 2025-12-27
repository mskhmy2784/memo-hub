import { useState, useEffect } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import {
  X,
  Save,
  Star,
  ExternalLink,
  AlertCircle,
  Folder,
  ChevronDown,
} from 'lucide-react';

export const NoteModal = () => {
  const { modal, notes, categories, tags, closeModal } = useNotesStore();
  const { addNote, updateNote } = useFirestore();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    url: '',
    categoryId: '',
    tags: [] as string[],
    isFavorite: false,
    priority: 3 as 1 | 2 | 3,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // 編集時に既存データを読み込む
  useEffect(() => {
    if (modal.mode === 'edit' && modal.noteId) {
      const note = notes.find((n) => n.id === modal.noteId);
      if (note) {
        setFormData({
          title: note.title,
          content: note.content,
          url: note.url || '',
          categoryId: note.categoryId,
          tags: note.tags,
          isFavorite: note.isFavorite,
          priority: note.priority,
        });
      }
    } else {
      // 新規作成時はデフォルト値
      const defaultCategory = categories.find((c) => c.type === 'main');
      setFormData({
        title: '',
        content: '',
        url: '',
        categoryId: defaultCategory?.id || '',
        tags: [],
        isFavorite: false,
        priority: 3,
      });
    }
    setErrors({});
  }, [modal, notes, categories]);

  // メインカテゴリを取得
  const mainCategories = categories.filter((c) => c.type === 'main');

  // サブカテゴリを取得
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => c.type === 'sub' && c.parentId === parentId);

  // カテゴリ名を取得
  const getCategoryDisplayName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return 'カテゴリを選択';

    if (category.type === 'sub' && category.parentId) {
      const parent = categories.find((c) => c.id === category.parentId);
      return `${parent?.name || ''} > ${category.name}`;
    }
    return category.name;
  };

  // バリデーション
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'カテゴリを選択してください';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      newErrors.url = '有効なURLを入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // 保存
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const noteData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        url: formData.url.trim() || undefined,
        categoryId: formData.categoryId,
        tags: formData.tags,
        isFavorite: formData.isFavorite,
        priority: formData.priority,
      };

      if (modal.mode === 'edit' && modal.noteId) {
        await updateNote(modal.noteId, noteData);
      } else {
        await addNote(noteData);
      }

      closeModal();
    } catch (error) {
      console.error('Error saving note:', error);
      setErrors({ submit: '保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!modal.isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="modal-backdrop animate-fade-in"
        onClick={closeModal}
      />

      {/* モーダル */}
      <div className="modal-content w-full max-w-2xl animate-slide-up">
        <form onSubmit={handleSubmit}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'edit' ? 'メモを編集' : '新規メモ'}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 space-y-6">
            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="メモのタイトル"
                className={`input ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className={`input pl-10 ${errors.url ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                />
              </div>
              {errors.url && (
                <p className="mt-1 text-sm text-red-500">{errors.url}</p>
              )}
            </div>

            {/* メモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="メモの内容..."
                rows={4}
                className="input resize-none"
              />
            </div>

            {/* カテゴリ & タグ */}
            <div className="grid grid-cols-2 gap-4">
              {/* カテゴリ */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`input text-left flex items-center justify-between ${
                    errors.categoryId ? 'border-red-500' : ''
                  }`}
                >
                  <span className={formData.categoryId ? 'text-gray-900' : 'text-gray-400'}>
                    {getCategoryDisplayName(formData.categoryId)}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showCategoryDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCategoryDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-60 overflow-auto">
                      {mainCategories.map((mainCat) => {
                        const subCategories = getSubCategories(mainCat.id);
                        return (
                          <div key={mainCat.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, categoryId: mainCat.id });
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                formData.categoryId === mainCat.id ? 'bg-primary-50 text-primary-700' : ''
                              }`}
                            >
                              <Folder className="w-4 h-4" />
                              {mainCat.name}
                            </button>
                            {subCategories.map((subCat) => (
                              <button
                                key={subCat.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, categoryId: subCat.id });
                                  setShowCategoryDropdown(false);
                                }}
                                className={`w-full px-4 py-2 pl-10 text-left text-sm hover:bg-gray-50 ${
                                  formData.categoryId === subCat.id ? 'bg-primary-50 text-primary-700' : ''
                                }`}
                              >
                                {subCat.name}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>

              {/* 重要度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重要度
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 1, label: '高', className: 'priority-high' },
                    { value: 2, label: '中', className: 'priority-medium' },
                    { value: 3, label: '低', className: 'priority-low' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: option.value as 1 | 2 | 3 })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        formData.priority === option.value
                          ? option.className + ' border-2'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* タグ */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>
              <button
                type="button"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="input text-left flex items-center gap-2 flex-wrap min-h-[42px]"
              >
                {formData.tags.length === 0 ? (
                  <span className="text-gray-400">タグを選択...</span>
                ) : (
                  formData.tags.map((tagId) => {
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter((id) => id !== tagId),
                            });
                          }}
                          className="ml-1 hover:opacity-70"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
              </button>

              {showTagDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTagDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-48 overflow-auto">
                    {tags.map((tag) => {
                      const isSelected = formData.tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: isSelected
                                ? formData.tags.filter((id) => id !== tag.id)
                                : [...formData.tags, tag.id],
                            });
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                            isSelected ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                          {isSelected && (
                            <span className="ml-auto text-primary-600">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* お気に入り */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
                className={`p-2 rounded-lg border-2 transition-all ${
                  formData.isFavorite
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Star
                  className={`w-5 h-5 ${
                    formData.isFavorite
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-gray-400'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                お気に入りに追加
              </span>
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {modal.mode === 'edit' ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
