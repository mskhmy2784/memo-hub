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
  Link,
  Eye,
  Edit3,
  Loader2,
} from 'lucide-react';
import { RichTextToolbar } from './RichTextToolbar';
import { SlashCommandMenu, type SlashCommand } from './SlashCommandMenu';

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
  const [isMobile, setIsMobile] = useState(false);

  // スラッシュコマンド用の状態
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const [slashStartPos, setSlashStartPos] = useState(0);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      const imageMarkdown = `![](${imageUrl})`;

      if (textareaRef.current) {
        const { selectionStart, selectionEnd } = textareaRef.current;
        const newContent =
          formData.content.substring(0, selectionStart) +
          imageMarkdown +
          formData.content.substring(selectionEnd);
        setFormData({ ...formData, content: newContent });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

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

  // スラッシュコマンド処理
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    setFormData({ ...formData, content: newValue });

    // スラッシュコマンドの検出
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
      // スペースや改行がない場合のみメニューを表示
      if (!textAfterSlash.includes(' ') && !textAfterSlash.includes('\n')) {
        const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : '\n';
        // 行頭または空白の後の/のみ反応
        if (charBeforeSlash === '\n' || charBeforeSlash === ' ' || lastSlashIndex === 0) {
          setSlashStartPos(lastSlashIndex);
          setSlashFilter(textAfterSlash);

          // メニューの位置を計算
          if (textareaRef.current) {
            const textarea = textareaRef.current;
            const rect = textarea.getBoundingClientRect();
            const lineHeight = 24;
            const lines = textBeforeCursor.split('\n');
            const currentLineIndex = lines.length - 1;

            setSlashMenuPosition({
              top: Math.min(currentLineIndex * lineHeight + 30, rect.height - 100),
              left: 16,
            });
          }

          setShowSlashMenu(true);
          return;
        }
      }
    }

    setShowSlashMenu(false);
    setSlashFilter('');
  };

  // スラッシュコマンド選択
  const handleSlashCommand = (command: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const content = formData.content;

    // スラッシュとフィルターテキストを削除して、コマンドを挿入
    const beforeSlash = content.substring(0, slashStartPos);
    const afterCursor = content.substring(cursorPos);
    const newContent = beforeSlash + command.insert + afterCursor;

    setFormData({ ...formData, content: newContent });
    setShowSlashMenu(false);
    setSlashFilter('');

    // カーソル位置を調整
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = slashStartPos + command.insert.length + (command.cursorOffset || 0);
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const tagColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !formData.tags.includes(tag.id)
  );

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
    } else if (modal.mode === 'create') {
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
    setShowSlashMenu(false);
  }, [modal.isOpen, modal.mode, modal.noteId, notes]);

  const mainCategories = categories.filter((c) => c.type === 'main');
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => c.type === 'sub' && c.parentId === parentId);

  const getCategoryDisplayName = (categoryId: string) => {
    if (!categoryId) return 'カテゴリを選択';
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return 'カテゴリを選択';

    if (category.type === 'sub') {
      const parent = categories.find((c) => c.id === category.parentId);
      return parent ? `${parent.name} / ${category.name}` : category.name;
    }
    return category.name;
  };

  const addUrlField = () => {
    if (formData.urls.length < 5) {
      setFormData({ ...formData, urls: [...formData.urls, { title: '', url: '' }] });
    }
  };

  const removeUrlField = (index: number) => {
    const newUrls = formData.urls.filter((_, i) => i !== index);
    setFormData({ ...formData, urls: newUrls.length > 0 ? newUrls : [{ title: '', url: '' }] });
  };

  const updateUrl = (index: number, field: 'title' | 'url', value: string) => {
    const newUrls = [...formData.urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setFormData({ ...formData, urls: newUrls });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'カテゴリを選択してください';
    }

    const nonEmptyUrls = formData.urls.filter((u) => u.url.trim());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const validUrls = formData.urls
        .filter((u) => u.url.trim())
        .map((u) => ({ title: u.title.trim(), url: u.url.trim() }));

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

  // モバイル用スタイル
  const mobileInputStyle = isMobile ? { padding: '14px 16px', fontSize: '16px' } : {};
  const mobileTextareaStyle = isMobile
    ? { minHeight: '280px', padding: '14px 16px', fontSize: '16px' }
    : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* モーダル - PC時は lg:max-w-4xl で幅拡大 */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <form onSubmit={handleSubmit}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'edit' ? 'メモを編集' : '新規メモ'}
            </h2>
            <div className="flex items-center gap-2">
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
                style={mobileInputStyle}
                className={`input ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* メモ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">メモ</label>
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
                <div className="min-h-[200px] md:min-h-[300px] lg:min-h-[400px] p-4 border border-gray-200 rounded-lg bg-white prose prose-sm prose-gray max-w-none prose-headings:text-gray-800 prose-a:text-primary-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
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
                  {/* リッチテキストツールバー */}
                  <RichTextToolbar
                    textareaRef={textareaRef}
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    onImageClick={() => fileInputRef.current?.click()}
                  />

                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={formData.content}
                      onChange={handleContentChange}
                      onPaste={handlePaste}
                      placeholder="メモの内容...&#10;&#10;/ でコマンドメニューを表示&#10;Markdown記法: **太字** *斜体* - リスト"
                      rows={8}
                      style={mobileTextareaStyle}
                      className="input resize-none font-mono text-sm min-h-[200px] md:min-h-[300px] lg:min-h-[400px]"
                      disabled={isUploading}
                    />

                    {/* スラッシュコマンドメニュー */}
                    <SlashCommandMenu
                      isOpen={showSlashMenu}
                      onClose={() => {
                        setShowSlashMenu(false);
                        setSlashFilter('');
                      }}
                      onSelect={handleSlashCommand}
                      filter={slashFilter}
                      position={slashMenuPosition}
                      selectedIndex={slashSelectedIndex}
                      onSelectedIndexChange={setSlashSelectedIndex}
                    />

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {isUploading && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>画像をアップロード中... {uploadProgress}%</span>
                      </div>
                      <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {errors.image && <p className="mt-1 text-sm text-red-500">{errors.image}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    ヒント: / でコマンドメニュー | ツールバーで書式設定 | Ctrl+V で画像貼り付け
                  </p>
                </>
              )}
            </div>

            {/* URL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">URL（最大5件）</label>
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
                          style={mobileInputStyle}
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
                        style={mobileInputStyle}
                        className={`input pl-10 py-2 text-sm ${errors.urls ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {errors.urls && <p className="mt-1 text-sm text-red-500">{errors.urls}</p>}
            </div>

            {/* タグ */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">タグ</label>

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
                  style={mobileInputStyle}
                  className="input"
                />

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

              {tagInput && !filteredTags.find((t) => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                <p className="mt-1 text-xs text-gray-500">
                  Enterで「{tagInput}」を新規タグとして作成
                </p>
              )}

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
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

            {/* カテゴリ・重要度 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  style={mobileInputStyle}
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
                                formData.categoryId === mainCat.id
                                  ? 'bg-primary-50 text-primary-700'
                                  : ''
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
                                  formData.categoryId === subCat.id
                                    ? 'bg-primary-50 text-primary-700'
                                    : ''
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">重要度</label>
                <div className="flex gap-2">
                  {[
                    { value: 1, label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
                    {
                      value: 2,
                      label: '中',
                      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                    },
                    { value: 3, label: '低', className: 'bg-blue-100 text-blue-700 border-blue-200' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: option.value as 1 | 2 | 3 })
                      }
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

            {errors.submit && (
              <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{errors.submit}</span>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
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
