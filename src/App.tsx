import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useFirestore } from './hooks/useFirestore';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { NotesPage } from './pages/NotesPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ArchivePage } from './pages/ArchivePage';
import { NoteModal } from './components/NoteModal';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

// 認証済みルート
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// メインアプリ
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  // Firestoreデータの購読を開始
  useFirestore();

  return (
    <>
      <Routes>
        {/* ログイン */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* ダッシュボード */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* メモ一覧 */}
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          }
        />

        {/* メモ詳細 */}
        <Route
          path="/notes/:id"
          element={
            <ProtectedRoute>
              <NoteDetailPage />
            </ProtectedRoute>
          }
        />

        {/* アーカイブ */}
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <ArchivePage />
            </ProtectedRoute>
          }
        />

        {/* 設定 */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* グローバルモーダル */}
      {isAuthenticated && (
        <>
          <NoteModal />
          <DeleteConfirmDialog />
        </>
      )}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
