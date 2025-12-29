// ユーザー情報
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
}

// カテゴリ
export interface Category {
  id: string;
  name: string;
  type: 'main' | 'sub';
  parentId: string | null;
  order: number;
  icon?: string;
  createdAt: Date;
}

// タグ
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

// URL情報
export interface UrlInfo {
  title: string;
  url: string;
}

// メモ/URL統合型
export interface Note {
  id: string;
  title: string;
  content: string;
  urls: UrlInfo[]; // 最大5件
  categoryId: string;
  tags: string[];
  isFavorite: boolean;
  priority: 1 | 2 | 3; // 1:高 2:中 3:低
  order: number; // 表示順序
  isArchived?: boolean; // アーカイブ済みフラグ
  archivedAt?: Date; // アーカイブ日時
  createdAt: Date;
  updatedAt: Date;
}

// フィルタオプション
export interface FilterOptions {
  search: string;
  categoryId: string | null;
  tagIds: string[];
  priority: number | null;
  showFavoritesOnly: boolean;
}

// ソートオプション
export type SortField = 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'order';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

// モーダル状態
export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  noteId?: string;
  defaultCategoryId?: string; // 新規追加：新規作成時のデフォルトカテゴリ
}

// 削除ダイアログ状態
export interface DeleteDialogState {
  isOpen: boolean;
  noteIds: string[];
  mode: 'single' | 'bulk';
}

// Firestore用のタイムスタンプ変換
export interface FirestoreNote extends Omit<Note, 'createdAt' | 'updatedAt' | 'archivedAt'> {
  createdAt: any;
  updatedAt: any;
  archivedAt?: any;
}

export interface FirestoreCategory extends Omit<Category, 'createdAt'> {
  createdAt: any;
}

export interface FirestoreTag extends Omit<Tag, 'createdAt'> {
  createdAt: any;
}
