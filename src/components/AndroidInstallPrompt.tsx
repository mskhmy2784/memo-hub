import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { 
  isAndroid, 
  isStandalone, 
  installPWA,
  onInstallPromptChange 
} from '../lib/pwa';

export const AndroidInstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // すでにスタンドアロンモードなら表示しない
    if (isStandalone()) return;

    // Android以外なら表示しない
    if (!isAndroid()) return;

    // 前回非表示にしてから3日以内なら表示しない
    const lastDismissed = localStorage.getItem('android-install-dismissed');
    if (lastDismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // インストールプロンプトの状態を監視
    const unsubscribe = onInstallPromptChange((canInstallNow) => {
      setCanInstall(canInstallNow);
      if (canInstallNow) {
        // ページロード後少し待ってから表示
        const timer = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('android-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShow(false);
    }
  };

  if (!show || !canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up pwa-install-banner">
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden safe-area-bottom">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">MemoHubをインストール</h3>
              <p className="text-xs text-white/80">ホーム画面からすぐにアクセス</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                アプリとしてインストールすると、ホーム画面から素早くアクセスでき、
                オフラインでも使用できます。
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              後で
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              インストール
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
