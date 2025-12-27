import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';

// 画像圧縮の最大サイズ
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 1280;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// 画像を圧縮する関数
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // アスペクト比を維持してリサイズ
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.85 // 品質85%
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

// 画像URLからStorage内のパスを抽出
const extractStoragePath = (url: string): string | null => {
  try {
    // Firebase Storage URLのパターン
    // https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=xxx
    const match = url.match(/\/o\/(.+?)\?/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    return null;
  }
};

export const useImageUpload = () => {
  const { user } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 画像をアップロード
  const uploadImage = useCallback(
    async (file: File, noteId: string): Promise<string> => {
      if (!user) throw new Error('ログインが必要です');

      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルのみアップロードできます');
      }

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('ファイルサイズは2MB以下にしてください');
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // 画像を圧縮
        setUploadProgress(20);
        const compressedBlob = await compressImage(file);

        // ファイル名を生成（タイムスタンプ + ランダム文字列）
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${timestamp}_${randomStr}.jpg`;

        // Storageのパス: users/{userId}/notes/{noteId}/images/{fileName}
        const storagePath = `users/${user.uid}/notes/${noteId}/images/${fileName}`;
        const storageRef = ref(storage, storagePath);

        setUploadProgress(50);

        // アップロード
        await uploadBytes(storageRef, compressedBlob, {
          contentType: 'image/jpeg',
        });

        setUploadProgress(80);

        // ダウンロードURLを取得
        const downloadURL = await getDownloadURL(storageRef);

        setUploadProgress(100);
        return downloadURL;
      } finally {
        setIsUploading(false);
      }
    },
    [user]
  );

  // クリップボードから画像を取得
  const getImageFromClipboard = useCallback(
    async (event: ClipboardEvent): Promise<File | null> => {
      const items = event.clipboardData?.items;
      if (!items) return null;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          return file;
        }
      }
      return null;
    },
    []
  );

  // メモに関連する全ての画像を削除
  const deleteNoteImages = useCallback(
    async (noteId: string): Promise<void> => {
      if (!user) return;

      try {
        const folderPath = `users/${user.uid}/notes/${noteId}/images`;
        const folderRef = ref(storage, folderPath);
        const listResult = await listAll(folderRef);

        // 全ての画像を削除
        const deletePromises = listResult.items.map((itemRef) =>
          deleteObject(itemRef).catch((err) => {
            console.warn('Failed to delete image:', err);
          })
        );

        await Promise.all(deletePromises);
      } catch (err) {
        // フォルダが存在しない場合などはエラーを無視
        console.warn('Failed to delete note images:', err);
      }
    },
    [user]
  );

  // 特定の画像を削除（URLから）
  const deleteImage = useCallback(
    async (imageUrl: string): Promise<void> => {
      const storagePath = extractStoragePath(imageUrl);
      if (!storagePath) return;

      try {
        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
      } catch (err) {
        console.warn('Failed to delete image:', err);
      }
    },
    []
  );

  return {
    uploadImage,
    getImageFromClipboard,
    deleteNoteImages,
    deleteImage,
    isUploading,
    uploadProgress,
  };
};
