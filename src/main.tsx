import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capture beforeinstallprompt event globally before React mounts
let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Dispatch a custom event so active React components can listen
  window.dispatchEvent(new CustomEvent('pwa-installable', { detail: e }));
});

(window as any).getDeferredPrompt = () => deferredPrompt;
(window as any).clearDeferredPrompt = () => { deferredPrompt = null; };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for Progressive Web App (PWA) installation
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('ServiceWorker registered successfully with scope: ', reg.scope);
      })
      .catch(err => {
        console.error('ServiceWorker registration failed: ', err);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}


