import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any legacy service worker script caches that could hold outdated Vite dependency chunks
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      if (key === 'edutrack-app-v3' || key === 'edutrack-dynamic-v1' || key.startsWith('workbox-')) {
        caches.delete(key).catch(() => {});
      }
    });
  }).catch(() => {});
}

// Register Service Worker for mobile and desktop notification support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.warn('Service Worker registration warning:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
