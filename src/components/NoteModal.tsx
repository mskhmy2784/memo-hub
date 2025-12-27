import { useState, useEffect } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import type { UrlInfo } from '../types';
import {
  X,
  Save,
  Star,
  AlertCircle,
  Folder,
  ChevronDown,
  Plus,
  Trash2,
  Link,
} from 'lucide-react';

export const NoteModal = () => {
  const { modal, notes, categories, tags, closeModal } = useNotesStore();
  const { addNote, updateNote, addTag } = useFirestore();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    urls: [{ title: '', url: '' }] as UrlInfo[],
    categoryId: '',
    tags: [] as string[],
    isFavorite: false,
    priority: 2 as 1 | 2 | 3,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // タグの色候補
  const tagColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // 入力に基づいてフィルタされたタグ候補
  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !formData.tags.includes(tag.id)
  );

  // タグを追加（既存または新規）
  const handleAddTag = async () => {
    if (!tagInput.trim()) return;

    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
    );

    if (existingTag) {
      if (!formData.tags.includes(existingTag.id)) {
        setFormData({ ...formData, tags: [...formData.tags, existingTag.id] });
      }
    } else {
      const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];
      const newTagId = await addTag({ name: tagInput.trim(), color: randomColor });
      if (newTagId) {
        setFormData({ ...formData, tags: [...formData.tags, newTagId] });
      }
    }

    setTagInput('');
    setShowTagSuggestions(false);
  };

  // 編集時に既存データを読み込む
  useEffect(() => {
    if (modal.mode === 'edit' && modal.noteId) {
      const note = notes.find((n) => n.id === modal.noteId);
      if (note) {
        setFormData({
          title: note.title,
          content: note.content,
          urls: note.urls && note.urls.length > 0 ? note.urls : [{ title: '', url: '' }],
          categoryId: note.categoryId,
          tags: note.tags,
          isFavorite: note.isFavorite,
          priority: note.priority,
        });
      }
    } else {
      setFormData({
        title: '',
        content: '',
        urls: [{ title: '', url: '' }],
        categoryId: '',
        tags: [],
        isFavorite: false,
        priority: 2,
      });
    }
    setErrors({});
    setTagInput('');
    setShowTagSuggestions(false);
  }, [modal.isOpen, modal.mode, modal.noteId, notes]);

  // メインカテゴリを取得
  const mainCategories = categories.filter((c) => c.type === 'main');
  
  // サブカテゴリを取得
  const getSubCategories = (parentId: string) => {
    return categories.filter((c) => c.type === 'sub' && c.parentId === parentId);
  };

  // カテゴリ表示名を取得
  const getCategoryDisplayName = (categoryId: string) => {
    if (!categoryId) return 'カテゴリを選択';
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return 'カテゴリを選択';
    
    if (category.type === 'sub' && category.parentId) {
      const parent = categories.find((c) => c.id === category.parentId);
      return `${parent?.name || ''} > ${category.name}`;
    }
    return category.name;
  };

  // URL追加
  const addUrlField = () => {
    if (formData.urls.length < 5) {
      setFormData({ ...formData, urls: [...formData.urls, { title: '', url: '' }] });
    }
  };

  // URL削除
  const removeUrlField = (index: number) => {
    const newUrls = formData.urls.filter((_, i) => i !== index);
    setFormData({ ...formData, urls: newUrls.length > 0 ? newUrls : [{ title: '', url: '' }] });
  };

  // URL更新
  const updateUrl = (index: number, field: 'title' | 'url', value: string) => {
    const newUrls = [...formData.urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setFormData({ ...formData, urls: newUrls });
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

    // URL検証（URLが入力されているもののみ）
    const nonEmptyUrls = formData.urls.filter(u => u.url.trim());
    for (let i = 0; i < nonEmptyUrls.length; i++) {
      if (!isValidUrl(nonEmptyUrls[i].url)) {
        newErrors.urls = '有効なURLを入力してください';
        break;
      }
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
      // 空でないURLのみフィルタ
      const validUrls = formData.urls
        .filter(u => u.url.trim())
        .map(u => ({ title: u.title.trim(), url: u.url.trim() }));

      const noteData: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        urls: validUrls,
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
      console.error('保存エラー:', error);
      setErrors({ submit: '保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!modal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* モーダル */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <form onSubmit={handleSubmit}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'edit' ? 'メモを編集' : '新規メモ'}
            </h2>
            <div className="flex items-center gap-2">
              {/* お気に入り */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
                className={`p-2 rounded-lg transition-colors ${
                  formData.isFavorite
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={formData.isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
              >
                <Star className={`w-5 h-5 ${formData.isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="p-6 space-y-5">
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

            {/* メモ（大きく表示） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="メモの内容..."
                rows={8}
                className="input resize-none"
              />
            </div>

            {/* URL（複数対応・タイトル付き） */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  URL（最大5件）
                </label>
                {formData.urls.length < 5 && (
                  <button
                    type="button"
                    onClick={addUrlField}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {formData.urls.map((urlInfo, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={urlInfo.title}
                          onChange={(e) => updateUrl(index, 'title', e.target.value)}
                          placeholder="リンクのタイトル（任意）"
                          className="input py-2 text-sm"
                        />
                      </div>
                      {formData.urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrlField(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={urlInfo.url}
                        onChange={(e) => updateUrl(index, 'url', e.target.value)}
                        placeholder="https://example.com"
                        className={`input pl-10 py-2 text-sm ${errors.urls ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {errors.urls && (
                <p className="mt-1 text-sm text-red-500">{errors.urls}</p>
              )}
            </div>

            {/* タグ */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>
              
              {/* タグ入力欄 */}
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="タグを入力（Enterで追加）"
                  className="input"
                />
                
                {/* サジェストドロップダウン */}
                {showTagSuggestions && tagInput && filteredTags.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowTagSuggestions(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-40 overflow-auto">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            if (!formData.tags.includes(tag.id)) {
                              setFormData({ ...formData, tags: [...formData.tags, tag.id] });
                            }
                            setTagInput('');
                            setShowTagSuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 新規タグ作成のヒント */}
              {tagInput && !filteredTags.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                <p className="mt-1 text-xs text-gray-500">
                  Enterで「{tagInput}」を新規タグとして作成
                </p>
              )}

              {/* 選択済みタグ */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter((id) => id !== tagId),
                            });
                          }}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* カテゴリ & 重要度 */}
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
                    { value: 1, label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
                    { value: 2, label: '中', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                    { value: 3, label: '低', className: 'bg-blue-100 text-blue-700 border-blue-200' },
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

            {/* エラーメッセージ */}
            {errors.submit && (
              <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{errors.submit}</span>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-secondary"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {modal.mode === 'edit' ? '更新' : '保存'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
