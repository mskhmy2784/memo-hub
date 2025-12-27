import { useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';
import { useNotesStore } from '../stores/notesStore';
import type { Note, Category, Tag, FirestoreNote, FirestoreCategory, FirestoreTag } from '../types';

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
  const workCategoryRef = doc(categoriesRef);
  const privateCategoryRef = doc(categoriesRef);

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
        const data = doc.data() as FirestoreNote;
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
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
        setCategories(categories);
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
      
      const docRef = await addDoc(notesRef, {
        ...noteData,
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

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    },
    [userId]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!userId) return;

      const noteRef = doc(db, `users/${userId}/notes/${id}`);
      await deleteDoc(noteRef);
    },
    [userId]
  );

  const deleteNotes = useCallback(
    async (ids: string[]) => {
      if (!userId) return;

      const batch = writeBatch(db);
      ids.forEach((id) => {
        const noteRef = doc(db, `users/${userId}/notes/${id}`);
        batch.delete(noteRef);
      });
      await batch.commit();
    },
    [userId]
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

  return {
    // Notes
    addNote,
    updateNote,
    deleteNote,
    deleteNotes,
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
