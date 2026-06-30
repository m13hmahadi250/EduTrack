import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Declare global types for PWA deferred prompt
declare global {
  interface Window {
    deferredPrompt: any;
    pwaInstallSupported: boolean;
  }
}

// Capture PWA installation prompt early before React mounts
window.deferredPrompt = null;
window.pwaInstallSupported = false;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  window.deferredPrompt = e;
  window.pwaInstallSupported = true;
  // Dispatch custom event to notify React components immediately
  window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  console.log('EduTrack PWA: beforeinstallprompt captured.');
});

window.addEventListener('appinstalled', () => {
  window.deferredPrompt = null;
  window.pwaInstallSupported = false;
  window.dispatchEvent(new CustomEvent('pwa-installed'));
  console.log('EduTrack PWA: App installed successfully.');
});

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('EduTrack Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.error('EduTrack Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);



