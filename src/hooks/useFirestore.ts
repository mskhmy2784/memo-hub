import { useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';
import { useNotesStore } from '../stores/notesStore';
import type { Note, Category, Tag, FirestoreCategory, FirestoreTag } from '../types';

// FirestoreタイムスタンプをDateに変換
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date();
};

// 初期データをセットアップ
const setupInitialData = async (userId: string) => {
  const batch = writeBatch(db);

  // 初期カテゴリ
  const categoriesRef = collection(db, `users/${userId}/categories`);
  const commonCategoryRef = doc(categoriesRef);
  const workCategoryRef = doc(categoriesRef);
  const privateCategoryRef = doc(categoriesRef);

  batch.set(commonCategoryRef, {
    name: '共通',
    type: 'main',
    parentId: null,
    order: 0,
    icon: '📌',
    createdAt: Timestamp.now(),
  });

  batch.set(workCategoryRef, {
    name: '仕事',
    type: 'main',
    parentId: null,
    order: 1,
    icon: '💼',
    createdAt: Timestamp.now(),
  });

  batch.set(privateCategoryRef, {
    name: 'プライベート',
    type: 'main',
    parentId: null,
    order: 2,
    icon: '🏠',
    createdAt: Timestamp.now(),
  });

  // 初期タグ
  const tagsRef = collection(db, `users/${userId}/tags`);
  const defaultTags = [
    { name: 'ダミー1', color: '#3b82f6' },
    { name: 'ダミー2', color: '#10b981' },
  ];

  defaultTags.forEach((tag) => {
    const tagRef = doc(tagsRef);
    batch.set(tagRef, {
      ...tag,
      createdAt: Timestamp.now(),
    });
  });

  // 初期化フラグを設定
  const userRef = doc(db, `users/${userId}/profile/settings`);
  batch.set(userRef, {
    initialized: true,
    createdAt: Timestamp.now(),
  });

  await batch.commit();
};

export const useFirestore = () => {
  const { user } = useAuthStore();
  const {
    setNotes,
    setCategories,
    setTags,
    setLoading,
  } = useNotesStore();

  const userId = user?.uid;

  // データの購読
  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setCategories([]);
      setTags([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Notes購読
    const notesRef = collection(db, `users/${userId}/notes`);
    const notesQuery = query(notesRef, orderBy('updatedAt', 'desc'));
    const unsubNotes = onSnapshot(notesQuery, (snapshot) => {
      const notes: Note[] = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        
        // 後方互換性: 古い形式を新しい形式(UrlInfo[])に変換
        let urls: { title: string; url: string }[] = [];
        if (data.urls && Array.isArray(data.urls)) {
          urls = data.urls.map((item: any) => {
            if (typeof item === 'string') {
              // 古い形式: string[]
              return { title: '', url: item };
            } else if (item && typeof item === 'object' && item.url) {
              // 新しい形式: UrlInfo[]
              return { title: item.title || '', url: item.url };
            }
            return { title: '', url: '' };
          }).filter((u: any) => u.url);
        } else if (data.url && typeof data.url === 'string') {
          // 最古の形式: 単一url
          urls = [{ title: '', url: data.url }];
        }
        
        // orderがない場合はcreatedAtのタイムスタンプを使用
        const createdAt = convertTimestamp(data.createdAt);
        const order = data.order ?? createdAt.getTime();
        
        return {
          ...data,
          id: doc.id,
          urls,
          order,
          createdAt,
          updatedAt: convertTimestamp(data.updatedAt),
          // アーカイブ関連（後方互換性）
          isArchived: data.isArchived ?? false,
          archivedAt: data.archivedAt ? convertTimestamp(data.archivedAt) : undefined,
        };
      });
      setNotes(notes);
    });

    // Categories購読
    const categoriesRef = collection(db, `users/${userId}/categories`);
    const categoriesQuery = query(categoriesRef, orderBy('order', 'asc'));
    const unsubCategories = onSnapshot(categoriesQuery, async (snapshot) => {
      const categories: Category[] = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreCategory;
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt),
        };
      });
      
      // 初期データがない場合はセットアップ
      if (categories.length === 0) {
        await setupInitialData(userId);
      } else {
        // 既存ユーザー向け: 共通カテゴリがなければ追加
        const hasCommonCategory = categories.some(c => c.name === '共通' && c.type === 'main');
        if (!hasCommonCategory) {
          const commonCategoryRef = doc(categoriesRef);
          await setDoc(commonCategoryRef, {
            name: '共通',
            type: 'main',
            parentId: null,
            order: 0,
            icon: '📌',
            createdAt: Timestamp.now(),
          });
        } else {
          setCategories(categories);
        }
      }
    });

    // Tags購読
    const tagsRef = collection(db, `users/${userId}/tags`);
    const tagsQuery = query(tagsRef, orderBy('createdAt', 'asc'));
    const unsubTags = onSnapshot(tagsQuery, (snapshot) => {
      const tags: Tag[] = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreTag;
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt),
        };
      });
      setTags(tags);
      setLoading(false);
    });

    return () => {
      unsubNotes();
      unsubCategories();
      unsubTags();
    };
  }, [userId, setNotes, setCategories, setTags, setLoading]);

  // Note CRUD
  const addNote = useCallback(
    async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!userId) return;

      const notesRef = collection(db, `users/${userId}/notes`);
      const now = Timestamp.now();
      
      // undefinedのフィールドを除去
      const cleanedData = Object.fromEntries(
        Object.entries(noteData).filter(([, value]) => value !== undefined)
      );
      
      const docRef = await addDoc(notesRef, {
        ...cleanedData,
        isArchived: false, // 新規作成時はアーカイブされていない
        createdAt: now,
        updatedAt: now,
      });

      return docRef.id;
    },
    [userId]
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      if (!userId) return;

      // undefinedのフィールドを除去
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await updateDoc(noteRef, {
        ...cleanedUpdates,
        updatedAt: Timestamp.now(),
      });
    },
    [userId]
  );

  // メモに関連する画像を削除するヘルパー関数
  const deleteNoteImages = useCallback(
    async (noteId: string) => {
      if (!userId) return;

      try {
        const folderPath = `users/${userId}/notes/${noteId}/images`;
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
    [userId]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!userId) return;

      // 関連する画像を削除
      await deleteNoteImages(id);

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await deleteDoc(noteRef);
    },
    [userId, deleteNoteImages]
  );

  const deleteNotes = useCallback(
    async (ids: string[]) => {
      if (!userId) return;

      // 各メモの画像を削除
      await Promise.all(ids.map((id) => deleteNoteImages(id)));

      const batch = writeBatch(db);
      ids.forEach((id) => {
        const noteRef = doc(db, `users/${userId}/notes/${id}`);
        batch.delete(noteRef);
      });
      await batch.commit();
    },
    [userId, deleteNoteImages]
  );

  // メモをアーカイブ
  const archiveNote = useCallback(
    async (id: string) => {
      if (!userId) return;

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await updateDoc(noteRef, {
        isArchived: true,
        archivedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    },
    [userId]
  );

  // 複数メモをアーカイブ
  const archiveNotes = useCallback(
    async (ids: string[]) => {
      if (!userId) return;

      const batch = writeBatch(db);
      const now = Timestamp.now();
      
      ids.forEach((id) => {
        const noteRef = doc(db, `users/${userId}/notes/${id}`);
        batch.update(noteRef, {
          isArchived: true,
          archivedAt: now,
          updatedAt: now,
        });
      });
      
      await batch.commit();
    },
    [userId]
  );

  // アーカイブからメモを復元
  const restoreNote = useCallback(
    async (id: string) => {
      if (!userId) return;

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await updateDoc(noteRef, {
        isArchived: false,
        archivedAt: null,
        updatedAt: Timestamp.now(),
      });
    },
    [userId]
  );

  // 複数メモを復元
  const restoreNotes = useCallback(
    async (ids: string[]) => {
      if (!userId) return;

      const batch = writeBatch(db);
      const now = Timestamp.now();
      
      ids.forEach((id) => {
        const noteRef = doc(db, `users/${userId}/notes/${id}`);
        batch.update(noteRef, {
          isArchived: false,
          archivedAt: null,
          updatedAt: now,
        });
      });
      
      await batch.commit();
    },
    [userId]
  );

  // メモを完全削除
  const permanentDeleteNote = useCallback(
    async (id: string) => {
      if (!userId) return;

      // 関連する画像を削除
      await deleteNoteImages(id);

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await deleteDoc(noteRef);
    },
    [userId, deleteNoteImages]
  );

  // 複数メモを完全削除
  const permanentDeleteNotes = useCallback(
    async (ids: string[]) => {
      if (!userId) return;

      // 各メモの画像を削除
      await Promise.all(ids.map((id) => deleteNoteImages(id)));

      const batch = writeBatch(db);
      ids.forEach((id) => {
        const noteRef = doc(db, `users/${userId}/notes/${id}`);
        batch.delete(noteRef);
      });
      await batch.commit();
    },
    [userId, deleteNoteImages]
  );

  // Category CRUD
  const addCategory = useCallback(
    async (categoryData: Omit<Category, 'id' | 'createdAt'>) => {
      if (!userId) return;

      const categoriesRef = collection(db, `users/${userId}/categories`);
      const docRef = await addDoc(categoriesRef, {
        ...categoryData,
        createdAt: Timestamp.now(),
      });

      return docRef.id;
    },
    [userId]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      if (!userId) return;

      const categoryRef = doc(db, `users/${userId}/categories/${id}`);
      await updateDoc(categoryRef, updates);
    },
    [userId]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!userId) return;

      const categoryRef = doc(db, `users/${userId}/categories/${id}`);
      await deleteDoc(categoryRef);
    },
    [userId]
  );

  // Tag CRUD
  const addTag = useCallback(
    async (tagData: Omit<Tag, 'id' | 'createdAt'>) => {
      if (!userId) return;

      const tagsRef = collection(db, `users/${userId}/tags`);
      const docRef = await addDoc(tagsRef, {
        ...tagData,
        createdAt: Timestamp.now(),
      });

      return docRef.id;
    },
    [userId]
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Tag>) => {
      if (!userId) return;

      const tagRef = doc(db, `users/${userId}/tags/${id}`);
      await updateDoc(tagRef, updates);
    },
    [userId]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      if (!userId) return;

      const tagRef = doc(db, `users/${userId}/tags/${id}`);
      await deleteDoc(tagRef);
    },
    [userId]
  );

  // メモの並び替え
  const reorderNotes = useCallback(
    async (noteIds: string[]) => {
      if (!userId) return;

      const batch = writeBatch(db);
      
      noteIds.forEach((noteId, index) => {
        const noteRef = doc(db, `users/${userId}/notes/${noteId}`);
        batch.update(noteRef, { order: index });
      });

      await batch.commit();
    },
    [userId]
  );

  return {
    // Notes
    addNote,
    updateNote,
    deleteNote,
    deleteNotes,
    reorderNotes,
    // Archive
    archiveNote,
    archiveNotes,
    restoreNote,
    restoreNotes,
    permanentDeleteNote,
    permanentDeleteNotes,
    // Categories
    addCategory,
    updateCategory,
    deleteCategory,
    // Tags
    addTag,
    updateTag,
    deleteTag,
  };
};
