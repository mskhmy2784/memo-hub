import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker, initPWAInstallPrompt } from './lib/pwa'

// Service Worker登録（本番環境のみ）
if (import.meta.env.PROD) {
  registerServiceWorker();
}

// PWAインストールプロンプト初期化（iOS/Android両方）
initPWAInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
