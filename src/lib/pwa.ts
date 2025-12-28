// Service Worker登録ユーティリティ

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // アップデートがあるかチェック
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新しいバージョンが利用可能
            console.log('[PWA] New version available');
            // オプション：ユーザーに通知してリロードを促す
            if (window.confirm('新しいバージョンが利用可能です。更新しますか？')) {
              window.location.reload();
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
};

// PWAインストールプロンプト
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptListeners: ((canInstall: boolean) => void)[] = [];

export const initPWAInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのプロンプトを防止
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    console.log('[PWA] Install prompt ready');
    
    // リスナーに通知
    installPromptListeners.forEach(listener => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    
    // リスナーに通知
    installPromptListeners.forEach(listener => listener(false));
  });
};

// インストール可能かどうかの変更を監視
export const onInstallPromptChange = (callback: (canInstall: boolean) => void): (() => void) => {
  installPromptListeners.push(callback);
  
  // 初期状態を通知
  callback(deferredPrompt !== null);
  
  // クリーンアップ関数を返す
  return () => {
    installPromptListeners = installPromptListeners.filter(l => l !== callback);
  };
};

export const canInstallPWA = (): boolean => {
  return deferredPrompt !== null;
};

export const installPWA = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] Install prompt outcome:', outcome);
  deferredPrompt = null;
  
  // リスナーに通知
  installPromptListeners.forEach(listener => listener(false));
  
  return outcome === 'accepted';
};

// スタンドアロンモードかどうか
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

// iOS判定
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
         !(window as Window & { MSStream?: unknown }).MSStream;
};

// Android判定
export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

// Chrome判定（AndroidのChrome向け）
export const isChrome = (): boolean => {
  return /Chrome/i.test(navigator.userAgent) && !/Edge|Edg/i.test(navigator.userAgent);
};

// Samsung Internet判定
export const isSamsungBrowser = (): boolean => {
  return /SamsungBrowser/i.test(navigator.userAgent);
};

// モバイル判定
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// iOSでホーム画面に追加されていないかチェック
export const shouldShowIOSInstallPrompt = (): boolean => {
  return isIOS() && !isStandalone();
};

// Androidでインストール可能かチェック
export const shouldShowAndroidInstallPrompt = (): boolean => {
  return isAndroid() && !isStandalone() && canInstallPWA();
};

// PWAとしてインストール可能かどうか（iOS/Android両方）
export const canInstallAsPWA = (): boolean => {
  if (isStandalone()) return false;
  if (isIOS()) return true; // iOSは手動でホーム画面追加
  if (isAndroid()) return canInstallPWA();
  return canInstallPWA(); // デスクトップChromeなど
};
