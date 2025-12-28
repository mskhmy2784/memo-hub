import { useNotesStore } from '../stores/notesStore';
import { useFirestore } from '../hooks/useFirestore';
import { Archive, Trash2, X } from 'lucide-react';

export const DeleteConfirmDialog = () => {
  const { deleteDialog, closeDeleteDialog, clearSelection, notes } = useNotesStore();
  const { archiveNote, archiveNotes, permanentDeleteNote, permanentDeleteNotes } = useFirestore();

  if (!deleteDialog.isOpen) return null;

  const targetNotes = notes.filter((n) => deleteDialog.noteIds.includes(n.id));
  const count = targetNotes.length;
  const isSingle = count === 1;
  const title = isSingle ? targetNotes[0]?.title : `${count}件のメモ`;

  const handleArchive = async () => {
    if (isSingle) {
      await archiveNote(deleteDialog.noteIds[0]);
    } else {
      await archiveNotes(deleteDialog.noteIds);
    }
    clearSelection();
    closeDeleteDialog();
  };

  const handlePermanentDelete = async () => {
    if (!confirm(`「${title}」を完全に削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }
    
    if (isSingle) {
      await permanentDeleteNote(deleteDialog.noteIds[0]);
    } else {
      await permanentDeleteNotes(deleteDialog.noteIds);
    }
    clearSelection();
    closeDeleteDialog();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={closeDeleteDialog}
      />
      
      {/* ダイアログ */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* 閉じるボタン */}
        <button
          onClick={closeDeleteDialog}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* タイトル */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          メモの削除
        </h3>
        
        {/* 説明 */}
        <p className="text-gray-600 mb-6">
          「{title}」をどのように処理しますか？
        </p>
        
        {/* アクションボタン */}
        <div className="space-y-3">
          {/* アーカイブ */}
          <button
            onClick={handleArchive}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
          >
            <Archive className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">アーカイブに移動</div>
              <div className="text-sm text-amber-600">
                一覧から非表示になりますが、検索や復元が可能です
              </div>
            </div>
          </button>
          
          {/* 完全削除 */}
          <button
            onClick={handlePermanentDelete}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">完全に削除</div>
              <div className="text-sm text-red-600">
                メモと関連データが完全に削除されます（復元不可）
              </div>
            </div>
          </button>
        </div>
        
        {/* キャンセル */}
        <button
          onClick={closeDeleteDialog}
          className="w-full mt-4 px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};
