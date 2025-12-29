import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  Calendar,
  Clock,
  Tag as TagIcon,
  Folder,
  AlertCircle,
  MoreVertical,
  Download,
  FileText,
  FileCode,
  FileType,
  ChevronRight,
} from 'lucide-react';
import { exportSingleNoteToWord } from '../utils/exportToWord';

export const NoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notes, categories, tags, openModal } = useNotesStore();
  const { deleteNote, updateNote } = useFirestore();

  const [showMenu, setShowMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const note = notes.find((n) => n.id === id);

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">メモが見つかりません</p>
          <Link to="/notes" className="btn btn-primary">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  // カテゴリ情報
  const category = categories.find((c) => c.id === note.categoryId);
  const parentCategory = category?.parentId
    ? categories.find((c) => c.id === category.parentId)
    : null;
  const categoryPath = parentCategory
    ? `${parentCategory.name} > ${category?.name}`
    : category?.name || '';

  const categoryType: 'work' | 'private' | 'common' =
    (category?.name === '仕事' || parentCategory?.name === '仕事')
      ? 'work'
      : (category?.name === '共通' || parentCategory?.name === '共通')
      ? 'common'
      : 'private';

  // タグ情報
  const noteTags = note.tags
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter(Boolean) as { id: string; name: string; color: string }[];

  // 重要度ラベル
  const priorityLabel =
    note.priority === 1 ? '高' : note.priority === 2 ? '中' : '低';
  const priorityColor =
    note.priority === 1
      ? 'bg-red-100 text-red-700'
      : note.priority === 2
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-blue-100 text-blue-700';

  // お気に入り切り替え
  const handleToggleFavorite = async () => {
    await updateNote(note.id, { isFavorite: !note.isFavorite });
  };

  // 削除
  const handleDelete = async () => {
    if (confirm('このメモを削除しますか？')) {
      await deleteNote(note.id);
      navigate('/notes');
    }
  };

  // エクスポート: テキスト形式
  const handleExportText = () => {
    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\nカテゴリ: ${categoryPath}\n重要度: ${priorityLabel}\n${noteTags.length > 0 ? `タグ: ${noteTags.map((t) => t.name).join(', ')}\n` : ''}${note.isFavorite ? 'お気に入り: ★\n' : ''}\n作成日: ${format(note.createdAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}\n更新日: ${format(note.updatedAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}\n\n${note.urls && note.urls.length > 0 ? 'リンク:\n' + note.urls.map((u) => `- ${u.title || u.url}: ${u.url}`).join('\n') + '\n\n' : ''}${note.content ? '---\n\n' + note.content : ''}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setShowMenu(false);
  };

  // エクスポート: Markdown形式
  const handleExportMarkdown = () => {
    const content = `# ${note.title}\n\n**カテゴリ:** ${categoryPath}  \n**重要度:** ${priorityLabel}  \n${noteTags.length > 0 ? `**タグ:** ${noteTags.map((t) => t.name).join(', ')}  \n` : ''}${note.isFavorite ? '**お気に入り:** ★  \n' : ''}\n**作成日:** ${format(note.createdAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}  \n**更新日:** ${format(note.updatedAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}\n\n${note.urls && note.urls.length > 0 ? '## リンク\n\n' + note.urls.map((u) => `- [${u.title || u.url}](${u.url})`).join('\n') + '\n\n' : ''}---\n\n${note.content || ''}`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setShowMenu(false);
  };

  // エクスポート: PDF形式（ブラウザ印刷機能を使用）
  const handleExportPDF = () => {
    // 印刷用のウィンドウを開いてPDFとして保存
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${note.title}</title>
        <style>
          body { font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          .meta span { margin-right: 15px; }
          .urls { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .urls h2 { font-size: 16px; margin: 0 0 10px 0; }
          .urls a { color: #0066cc; text-decoration: none; }
          .urls a:hover { text-decoration: underline; }
          .content { margin-top: 30px; }
          .content h1, .content h2, .content h3 { margin-top: 20px; }
          .content pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
          .content code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: Consolas, monospace; }
          .content blockquote { border-left: 4px solid #ddd; margin: 10px 0; padding-left: 15px; color: #666; }
          .content ul, .content ol { padding-left: 25px; }
          .content img { max-width: 100%; height: auto; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${note.title}</h1>
        <div class="meta">
          <span>📁 ${categoryPath}</span>
          <span>⚡ 重要度: ${priorityLabel}</span>
          ${note.isFavorite ? '<span>★ お気に入り</span>' : ''}
          ${noteTags.length > 0 ? `<span>🏷 ${noteTags.map((t) => t.name).join(', ')}</span>` : ''}
        </div>
        <div class="meta">
          <span>作成: ${format(note.createdAt, 'yyyy/MM/dd HH:mm')}</span>
          <span>更新: ${format(note.updatedAt, 'yyyy/MM/dd HH:mm')}</span>
        </div>
        ${note.urls && note.urls.length > 0 ? `
          <div class="urls">
            <h2>🔗 リンク</h2>
            <ul>
              ${note.urls.map((u) => `<li><a href="${u.url}" target="_blank">${u.title || u.url}</a></li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <hr>
        <div class="content">
          ${note.content ? note.content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') : '<p style="color: #999;">内容なし</p>'}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
    setShowExportMenu(false);
    setShowMenu(false);
  };

  // エクスポート: Word形式
  const handleExportWord = async () => {
    await exportSingleNoteToWord({
      title: note.title,
      content: note.content,
      urls: note.urls,
      categoryPath,
      tags: noteTags,
      priority: note.priority,
      isFavorite: note.isFavorite,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
    setShowExportMenu(false);
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/notes"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                {note.title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* お気に入りボタン */}
              <button
                onClick={handleToggleFavorite}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Star
                  className={`w-5 h-5 ${
                    note.isFavorite
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-gray-400'
                  }`}
                />
              </button>

              {/* 編集ボタン */}
              <button
                onClick={() => openModal('edit', note.id)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-600" />
              </button>

              {/* 3点メニュー */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => {
                        setShowMenu(false);
                        setShowExportMenu(false);
                      }}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      {/* エクスポートサブメニュー */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-gray-500" />
                            エクスポート
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>

                        {showExportMenu && (
                          <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                            <button
                              onClick={handleExportText}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4 text-gray-500" />
                              テキスト (.txt)
                            </button>
                            <button
                              onClick={handleExportMarkdown}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileCode className="w-4 h-4 text-purple-500" />
                              Markdown (.md)
                            </button>
                            <button
                              onClick={handleExportPDF}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4 text-red-500" />
                              PDF (.pdf)
                            </button>
                            <button
                              onClick={handleExportWord}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileType className="w-4 h-4 text-blue-600" />
                              Word (.docx)
                            </button>
                          </div>
                        )}
                      </div>

                      <hr className="my-2 border-gray-100" />

                      {/* 削除 */}
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        削除
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="card p-6">
          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            {/* カテゴリ */}
            <div className="flex items-center gap-1 text-gray-600">
              <Folder
                className={`w-4 h-4 ${
                  categoryType === 'work'
                    ? 'text-blue-500'
                    : categoryType === 'common'
                    ? 'text-green-500'
                    : 'text-pink-500'
                }`}
              />
              <span>{categoryPath}</span>
            </div>

            {/* 重要度 */}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor}`}>
              重要度: {priorityLabel}
            </span>

            {/* タグ */}
            {noteTags.length > 0 && (
              <div className="flex items-center gap-1">
                <TagIcon className="w-4 h-4 text-gray-400" />
                <div className="flex gap-1">
                  {noteTags.map((tag) => (
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
                </div>
              </div>
            )}
          </div>

          {/* 日時情報 */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                作成: {format(note.createdAt, 'yyyy/MM/dd HH:mm', { locale: ja })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                更新: {format(note.updatedAt, 'yyyy/MM/dd HH:mm', { locale: ja })}
              </span>
            </div>
          </div>

          {/* URL */}
          {note.urls && note.urls.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-2">リンク</h2>
              <div className="space-y-2">
                {note.urls.map((urlInfo, idx) => (
                  <a
                    key={idx}
                    href={urlInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-gray-700 group-hover:text-primary-600">
                      {urlInfo.title || urlInfo.url}
                    </span>
                    <span className="text-xs opacity-60 group-hover:opacity-100 flex-shrink-0">
                      新しいタブで開く
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* メモ内容 */}
          {note.content && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-2">メモ</h2>
              <div className="prose prose-gray max-w-none prose-sm prose-headings:text-gray-800 prose-a:text-primary-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
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
                        className="max-w-full h-auto rounded-lg my-2 cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                        onClick={() => src && window.open(src, '_blank')}
                      />
                    ),
                  }}
                >
                  {note.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
