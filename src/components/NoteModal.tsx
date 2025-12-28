import { useState, useEffect, useRef } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { useImageUpload } from '../hooks/useImageUpload';
import type { UrlInfo } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Save,
  Star,
  AlertCircle,
  Folder,
  ChevronDown,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Loader2,
} from 'lucide-react';
import { RichTextToolbar } from './RichTextToolbar';
import { SlashCommandMenu } from './SlashCommandMenu';

export const NoteModal = () => {
  const { modal, notes, categories, tags, closeModal } = useNotesStore();
  const { addNote, updateNote, addTag } = useFirestore();
  const { uploadImage, isUploading, uploadProgress } = useImageUpload();

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
  const [showPreview, setShowPreview] = useState(false);
  const [tempNoteId, setTempNoteId] = useState<string>('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 新規作成時の一時ID生成
  useEffect(() => {
    if (modal.isOpen && modal.mode === 'create') {
      setTempNoteId(`temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    } else if (modal.isOpen && modal.mode === 'edit' && modal.noteId) {
      setTempNoteId(modal.noteId);
    }
  }, [modal.isOpen, modal.mode, modal.noteId]);

  // 画像アップロード処理
  const handleImageUpload = async (file: File) => {
    if (!tempNoteId) return;

    try {
      const imageUrl = await uploadImage(file, tempNoteId);
      // Markdown形式で画像を挿入
      const imageMarkdown = `![](${imageUrl})`;
      
      // カーソル位置に挿入
      if (textareaRef.current) {
        const { selectionStart, selectionEnd } = textareaRef.current;
        const newContent = 
          formData.content.substring(0, selectionStart) + 
          imageMarkdown + 
          formData.content.substring(selectionEnd);
        setFormData({ ...formData, content: newContent });
        
        // カーソル位置を更新
        setTimeout(() => {
          if (textareaRef.current) {
            const newPosition = selectionStart + imageMarkdown.length;
            textareaRef.current.selectionStart = newPosition;
            textareaRef.current.selectionEnd = newPosition;
            textareaRef.current.focus();
          }
        }, 0);
      } else {
        setFormData({ ...formData, content: formData.content + '\n' + imageMarkdown });
      }
    } catch (err: any) {
      setErrors({ ...errors, image: err.message });
    }
  };

  // ファイル選択ハンドラ
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // inputをリセット（同じファイルを再選択可能に）
    e.target.value = '';
  };

  // ペーストハンドラ（クリップボードから画像）
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        return;
      }
    }
  };

  // 画像ボタンクリック
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

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
      // 新規作成時はリセット
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
    setShowPreview(false);
  }, [modal.isOpen, modal.mode, modal.noteId, notes]);

  // カテゴリを階層構造で取得
  const mainCategories = categories.filter((c) => c.type === 'main');
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  // 現在選択中のカテゴリ名
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const parentCategory = selectedCategory?.parentId
    ? categories.find((c) => c.id === selectedCategory.parentId)
    : null;
  const categoryDisplayName = parentCategory
    ? `${parentCategory.name} > ${selectedCategory?.name}`
    : selectedCategory?.name || 'カテゴリを選択';

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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up mx-4">
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

            {/* メモ（ツールバー + プレビュー付き） */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  メモ
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`px-3 py-1 text-xs flex items-center gap-1 ${
                      !showPreview
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className={`px-3 py-1 text-xs flex items-center gap-1 ${
                      showPreview
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    プレビュー
                  </button>
                </div>
              </div>
              {showPreview ? (
                <div className="min-h-[200px] p-4 border border-gray-200 rounded-lg bg-white prose prose-sm prose-gray max-w-none prose-headings:text-gray-800 prose-a:text-primary-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
                  {formData.content ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        img: ({ src, alt }) => (
                          <img 
                            src={src} 
                            alt={alt || ''} 
                            className="max-w-full h-auto rounded-lg my-2"
                            loading="lazy"
                          />
                        ),
                      }}
                    >
                      {formData.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400">プレビューする内容がありません</p>
                  )}
                </div>
              ) : (
                <>
                  {/* ツールバー */}
                  <RichTextToolbar
                    textareaRef={textareaRef}
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    onImageClick={handleImageClick}
                  />
                  
                  {/* テキストエリア */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      onPaste={handlePaste}
                      placeholder="メモの内容...&#10;&#10;/ を入力するとコマンドメニューが表示されます&#10;&#10;Markdown記法が使えます:&#10;**太字** / *斜体*&#10;- リスト&#10;1. 番号リスト"
                      className="input min-h-[200px] resize-y font-mono text-sm"
                    />
                    
                    {/* スラッシュコマンドメニュー */}
                    <SlashCommandMenu
                      textareaRef={textareaRef}
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                    />
                    
                    {/* アップロード中表示 */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                          <span className="text-sm text-gray-600">
                            アップロード中... {Math.round(uploadProgress)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* ヒント */}
                  <p className="mt-1 text-xs text-gray-400">
                    画像は貼り付け（Ctrl+V）またはドラッグ&ドロップでも追加できます
                  </p>
                </>
              )}
              {errors.image && (
                <p className="mt-1 text-sm text-red-500">{errors.image}</p>
              )}
              
              {/* 隠し画像入力 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* カテゴリ */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className={`input flex items-center justify-between ${
                  errors.categoryId ? 'border-red-500' : ''
                }`}
              >
                <span className={selectedCategory ? 'text-gray-900' : 'text-gray-400'}>
                  {categoryDisplayName}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showCategoryDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCategoryDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-60 overflow-y-auto">
                    {mainCategories.map((main) => (
                      <div key={main.id}>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                          {main.name}
                        </div>
                        {getSubCategories(main.id).map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, categoryId: sub.id });
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                              formData.categoryId === sub.id
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700'
                            }`}
                          >
                            <Folder className="w-4 h-4" />
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    ))}
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
              <div className="flex gap-3">
                {[
                  { value: 1, label: '高', className: 'border-red-300 bg-red-50 text-red-700' },
                  { value: 2, label: '中', className: 'border-amber-300 bg-amber-50 text-amber-700' },
                  { value: 3, label: '低', className: 'border-blue-300 bg-blue-50 text-blue-700' },
                ].map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        priority: priority.value as 1 | 2 | 3,
                      })
                    }
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      formData.priority === priority.value
                        ? priority.className
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* URL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  関連URL（最大5件）
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
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={urlInfo.title}
                        onChange={(e) => updateUrl(index, 'title', e.target.value)}
                        placeholder="タイトル（任意）"
                        className="input flex-[2]"
                      />
                      <input
                        type="url"
                        value={urlInfo.url}
                        onChange={(e) => updateUrl(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className={`input flex-[3] ${errors.urls && urlInfo.url && !isValidUrl(urlInfo.url) ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUrlField(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-40 overflow-y-auto">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, tags: [...formData.tags, tag.id] });
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

              {/* 選択されたタグ */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter((id) => id !== tagId),
                            })
                          }
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

            {/* エラー */}
            {errors.submit && (
              <div className="p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
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
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
