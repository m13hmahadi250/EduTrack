import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border transition-all ${
        isOffline
          ? 'bg-amber-950/95 text-amber-200 border-amber-800/80'
          : 'bg-emerald-950/95 text-emerald-200 border-emerald-800/80'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Offline Mode — Showing cached schedules & records</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Connection restored — Synced with live records</span>
        </>
      )}
    </div>
  );
}

export default OfflineIndicator;
