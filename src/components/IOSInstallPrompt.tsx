import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { isIOS, isStandalone } from '../lib/pwa';

export const IOSInstallPrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // すでにスタンドアロンモードなら表示しない
    if (isStandalone()) return;

    // iOS以外なら表示しない
    if (!isIOS()) return;

    // 前回非表示にしてから7日以内なら表示しない
    const lastDismissed = localStorage.getItem('ios-install-dismissed');
    if (lastDismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // ページロード後少し待ってから表示
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  if (!show) return null;

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
              <p className="text-xs text-white/80">ホーム画面に追加してアプリのように使えます</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 手順 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-semibold text-sm">1</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>下部の</span>
              <Share className="w-5 h-5 text-primary-500" />
              <span className="font-medium">共有ボタン</span>
              <span>をタップ</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-semibold text-sm">2</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <PlusSquare className="w-5 h-5 text-primary-500" />
              <span className="font-medium">「ホーム画面に追加」</span>
              <span>を選択</span>
            </div>
          </div>
        </div>

        {/* 閉じるボタン */}
        <div className="px-4 pb-4">
          <button
            onClick={handleDismiss}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium"
          >
            後で
          </button>
        </div>
      </div>
    </div>
  );
};
