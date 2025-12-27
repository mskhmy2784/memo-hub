import { create } from 'zustand';
import type { Note, Category, Tag, FilterOptions, SortOptions, ModalState } from '../types';

interface NotesState {
  notes: Note[];
  categories: Category[];
  tags: Tag[];
  filter: FilterOptions;
  sort: SortOptions;
  modal: ModalState;
  selectedNoteIds: string[];
  isLoading: boolean;
  
  // Notes actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  
  // Categories actions
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Tags actions
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  
  // Filter & Sort actions
  setFilter: (filter: Partial<FilterOptions>) => void;
  resetFilter: () => void;
  setSort: (sort: Partial<SortOptions>) => void;
  
  // Modal actions
  openModal: (mode: 'create' | 'edit', noteId?: string) => void;
  closeModal: () => void;
  
  // Selection actions
  toggleSelectNote: (id: string) => void;
  selectAllNotes: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Loading
  setLoading: (loading: boolean) => void;
}

const initialFilter: FilterOptions = {
  search: '',
  categoryId: null,
  tagIds: [],
  priority: null,
  showFavoritesOnly: false,
};

const initialSort: SortOptions = {
  field: 'updatedAt',
  order: 'desc',
};

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  categories: [],
  tags: [],
  filter: initialFilter,
  sort: initialSort,
  modal: { isOpen: false, mode: 'create' },
  selectedNoteIds: [],
  isLoading: true,
  
  // Notes actions
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  })),
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
    selectedNoteIds: state.selectedNoteIds.filter((sid) => sid !== id),
  })),
  
  // Categories actions
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) => set((state) => ({
    categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id),
  })),
  
  // Tags actions
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  updateTag: (id, updates) => set((state) => ({
    tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  deleteTag: (id) => set((state) => ({
    tags: state.tags.filter((t) => t.id !== id),
  })),
  
  // Filter & Sort actions
  setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
  resetFilter: () => set({ filter: initialFilter }),
  setSort: (sort) => set((state) => ({ sort: { ...state.sort, ...sort } })),
  
  // Modal actions
  openModal: (mode, noteId) => set({ modal: { isOpen: true, mode, noteId } }),
  closeModal: () => set({ modal: { isOpen: false, mode: 'create' } }),
  
  // Selection actions
  toggleSelectNote: (id) => set((state) => ({
    selectedNoteIds: state.selectedNoteIds.includes(id)
      ? state.selectedNoteIds.filter((sid) => sid !== id)
      : [...state.selectedNoteIds, id],
  })),
  selectAllNotes: (ids) => set({ selectedNoteIds: ids }),
  clearSelection: () => set({ selectedNoteIds: [] }),
  
  // Loading
  setLoading: (isLoading) => set({ isLoading }),
}));
