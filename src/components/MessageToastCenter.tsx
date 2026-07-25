import React, { useEffect, useState, useRef } from 'react';
import { useAppStore, Message, Notification as AppNotification } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, WifiOff, Wifi, ArrowRight, BellRing, Settings } from 'lucide-react';

interface ActiveToast {
  id: string;
  type: 'message' | 'online' | 'offline' | 'notification';
  title?: string;
  content: string;
  senderName: string;
  senderAvatar?: string;
  notifType?: 'info' | 'success' | 'warning' | 'error';
}

// Helper to read/write persistent notified IDs so reloading or re-entering the site never repeats toasts
const getStoredNotifiedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('edutrack_notified_toast_ids');
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch (e) {}
  return new Set();
};

const storeNotifiedId = (id: string) => {
  try {
    const ids = getStoredNotifiedIds();
    ids.add(id);
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem('edutrack_notified_toast_ids', JSON.stringify(arr));
  } catch (e) {}
};

export default function MessageToastCenter() {
  const { messages, currentUser, users, notifications } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Track browser Notification API permission status
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  
  const initializedRef = useRef(false);
  const notifiedIdsRef = useRef<Set<string>>(getStoredNotifiedIds());
  const notifiedNotifIdsRef = useRef<Set<string>>(getStoredNotifiedIds());
  const initialNotifsRegisteredRef = useRef(false);
  const recentNotifKeysRef = useRef<Map<string, number>>(new Map());

  // Helper to check and record recent notification keys to strictly prevent double/duplicate notifications
  const isDuplicateNotificationKey = (key: string): boolean => {
    const now = Date.now();
    recentNotifKeysRef.current.forEach((timestamp, k) => {
      if (now - timestamp > 30000) {
        recentNotifKeysRef.current.delete(k);
      }
    });

    const lastSeen = recentNotifKeysRef.current.get(key);
    if (lastSeen && now - lastSeen < 15000) {
      return true; // Duplicate detected within 15 seconds window
    }
    recentNotifKeysRef.current.set(key, now);
    return false;
  };

  // Helper to dispatch standard or Service Worker-driven native notifications (works on Android mobile status bar and PC)
  const triggerNativeNotification = async (
    title: string,
    body: string,
    options: {
      icon?: string;
      tag?: string;
      onClickUrl?: string;
      onClickAction?: () => void;
    } = {}
  ) => {
    // 1. Android Native WebView Interface (calls window.AndroidInterface.showNotification)
    if (window.AndroidInterface && typeof window.AndroidInterface.showNotification === 'function') {
      try {
        window.AndroidInterface.showNotification(title, body);
        return;
      } catch (err) {
        console.warn('AndroidInterface.showNotification error:', err);
      }
    }

    // 2. Browser / PWA Notifications (requires permission check)
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const destinationUrl = options.onClickUrl 
      ? new URL(options.onClickUrl, window.location.origin).href 
      : window.location.origin + '/';

    const notifTag = options.tag || 'edutrack-mobile-' + Date.now();

    // Try service worker registration first (highest compatibility for Android mobile notification bar and PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, {
            body,
            icon: options.icon || '/logo.svg',
            badge: '/favicon.svg',
            tag: notifTag,
            renotify: true,
            vibrate: [200, 100, 200, 100, 200],
            requireInteraction: false,
            data: destinationUrl,
            actions: [
              { action: 'open', title: 'Open App' },
              { action: 'close', title: 'Dismiss' }
            ]
          } as any);
          return;
        }
      } catch (swErr) {
        console.warn('Failed to dispatch notification via Service Worker, falling back to legacy constructor:', swErr);
      }
    }

    // Fallback to legacy window.Notification constructor
    try {
      const legacyNotif = new window.Notification(title, {
        body,
        icon: options.icon || '/logo.svg',
        badge: '/favicon.svg',
        tag: notifTag,
        silent: false,
        requireInteraction: false
      });

      legacyNotif.onclick = () => {
        window.focus();
        if (options.onClickAction) {
          options.onClickAction();
        } else if (options.onClickUrl) {
          navigate(options.onClickUrl);
        }
        legacyNotif.close();
      };
    } catch (err) {
      console.warn('Failed to dispatch legacy desktop notification:', err);
    }
  };

  // Check notification permissions and prompt nicely on load
  useEffect(() => {
    if (localStorage.getItem('edutrack_notif_prompt_dismissed') === 'true') {
      return;
    }

    if (window.AndroidInterface && typeof window.AndroidInterface.showNotification === 'function') {
      setPermissionStatus('granted');
      return;
    }

    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
      
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
          if (localStorage.getItem('edutrack_notif_prompt_dismissed') !== 'true') {
            setShowPermissionPrompt(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  // Handle explicit permission grant
  const handleRequestPermission = async () => {
    localStorage.setItem('edutrack_notif_prompt_dismissed', 'true');
    setShowPermissionPrompt(false);

    if (window.AndroidInterface && typeof window.AndroidInterface.showNotification === 'function') {
      try {
        window.AndroidInterface.showNotification('📱 Android System Bar Linked!', 'EduTrack alerts will now appear directly in your mobile notification bar.');
        setPermissionStatus('granted');
        return;
      } catch (err) {
        console.error('Error invoking AndroidInterface.showNotification:', err);
      }
    }

    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        
        if (permission === 'granted') {
          triggerNativeNotification('📱 Android System Bar Linked!', 'EduTrack alerts will now appear directly in your mobile notification bar.', {
            icon: '/logo.svg',
            tag: 'edutrack-confirm',
            onClickUrl: '/'
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const handleDismissPrompt = () => {
    setShowPermissionPrompt(false);
    localStorage.setItem('edutrack_notif_prompt_dismissed', 'true');
  };

  // Track network connectivity status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const toastId = 'connect-' + Date.now();
      setToasts(prev => [
        ...prev,
        {
          id: toastId,
          type: 'online',
          title: 'Connection Restored',
          content: 'You are back online. Aligning transmissions seamlessly.',
          senderName: ''
        }
      ]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      const toastId = 'disconnect-' + Date.now();
      setToasts(prev => [
        ...prev,
        {
          id: toastId,
          type: 'offline',
          title: 'Offline Mode Active',
          content: 'You are offline. Viewing your cached lesson schedules and messages.',
          senderName: ''
        }
      ]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 6000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor incoming messages for Toast triggering
  useEffect(() => {
    if (!currentUser) {
      initializedRef.current = false;
      return;
    }

    // On initial mount or auth transition, register ALL existing messages to seen list so old ones never trigger toasts
    if (!initializedRef.current) {
      messages.forEach(m => {
        notifiedIdsRef.current.add(m.id);
        storeNotifiedId(m.id);
      });
      if (messages.length > 0 || useAppStore.getState().isInitialized) {
        initializedRef.current = true;
      }
      return;
    }

    messages.forEach(m => {
      if (m.receiverId === currentUser.id && !m.isRead && !notifiedIdsRef.current.has(m.id)) {
        notifiedIdsRef.current.add(m.id);
        storeNotifiedId(m.id);

        const isTabHidden = document.hidden;
        const isNotOnMessagesPath = location.pathname !== '/messages';

        if (isTabHidden || isNotOnMessagesPath) {
          const sender = users.find(u => u.id === m.senderId);
          const senderName = sender ? sender.name : 'Unknown User';
          const senderAvatar = sender?.profileImage;

          const msgKey = `msg_${m.id}_${m.content}`;
          if (isDuplicateNotificationKey(msgKey)) return;

          setToasts(prev => {
            if (prev.some(t => t.id === m.id || (t.type === 'message' && t.content === m.content && t.senderName === senderName))) {
              return prev;
            }
            return [
              ...prev,
              {
                id: m.id,
                type: 'message',
                content: m.content,
                senderName,
                senderAvatar
              }
            ];
          });

          triggerNativeNotification(`New Message from ${senderName}`, m.content, {
            icon: senderAvatar || '/logo.svg',
            tag: 'edutrack-msg-' + m.senderId,
            onClickUrl: '/messages'
          });

          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== m.id));
          }, 6000);
        }
      }
    });
  }, [messages, currentUser, users, location.pathname, navigate]);

  // Monitor incoming general notifications for Toast & Native trigger
  useEffect(() => {
    if (!currentUser) {
      initialNotifsRegisteredRef.current = false;
      return;
    }

    // On initial mount or auth transition, register ALL existing notifications to seen list so old ones never trigger toasts
    if (!initialNotifsRegisteredRef.current) {
      notifications.forEach(n => {
        notifiedNotifIdsRef.current.add(n.id);
        storeNotifiedId(n.id);
      });
      if (notifications.length > 0 || useAppStore.getState().isInitialized) {
        initialNotifsRegisteredRef.current = true;
      }
      return;
    }

    notifications.forEach(n => {
      if (n.userId === currentUser.id && !n.isRead && !notifiedNotifIdsRef.current.has(n.id)) {
        notifiedNotifIdsRef.current.add(n.id);
        storeNotifiedId(n.id);

        const notifTitle = n.title || 'System Notification';
        const notifKey = `notif_${n.id}_${notifTitle}_${n.message}`;
        if (isDuplicateNotificationKey(notifKey)) return;

        setToasts(prev => {
          if (prev.some(t => t.id === n.id || (t.type === 'notification' && t.title === notifTitle && t.content === n.message))) {
            return prev;
          }
          return [
            ...prev,
            {
              id: n.id,
              type: 'notification',
              title: notifTitle,
              content: n.message,
              senderName: 'EduTrack Alert',
              notifType: n.type
            }
          ];
        });

        triggerNativeNotification(notifTitle, n.message, {
          icon: '/logo.svg',
          tag: 'edutrack-notif-' + n.id,
          onClickUrl: '/'
        });

        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== n.id));
        }, 6000);
      }
    });
  }, [notifications, currentUser]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (toast: ActiveToast) => {
    if (toast.type === 'message') {
      navigate('/messages');
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    } else if (toast.type === 'notification') {
      useAppStore.getState().markAsRead(toast.id);
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }
  };

  return (
    <div id="toast-notification-hub" className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-4 w-full max-w-sm sm:max-w-md">
      <AnimatePresence>
        {/* Render persistent permission prompt ribbon if it is default */}
        {showPermissionPrompt && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto w-full bg-gradient-to-r from-[#0D5BFF] to-[#1EA5FC] text-white p-5 rounded-[2rem] shadow-2xl relative overflow-hidden border border-blue-400/20"
          >
            {/* Background design accents */}
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-start gap-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <BellRing className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-200">ANDROID & MOBILE ALERTS</h4>
                  <p className="text-xs font-black uppercase italic mt-1">Enable Mobile Status Bar Alerts</p>
                  <p className="text-[10px] text-blue-50/90 leading-relaxed mt-1">
                    Receive instant alerts in your Android mobile notification bar when new messages, class logs, or payment updates arrive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissPrompt}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all text-white/80 hover:text-white flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleRequestPermission}
                className="px-5 py-2.5 bg-white text-[#0D5BFF] text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-50 hover:shadow-lg transition-all"
              >
                Enable Notifications
              </button>
              <span className="text-[8px] font-black uppercase tracking-widest text-white/70 italic mr-2">ANDROID STATUS BAR PWA</span>
            </div>
          </motion.div>
        )}

        {toasts.map(toast => {
          const isMsg = toast.type === 'message';
          const isOnlineToast = toast.type === 'online';
          const isOfflineToast = toast.type === 'offline';
          const isNotif = toast.type === 'notification';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={() => handleToastClick(toast)}
              className={`pointer-events-auto w-full border text-[#0B132B] dark:text-white p-5 rounded-[2rem] shadow-2xl relative overflow-hidden group transition-all duration-300 ${
                isMsg || isNotif ? 'cursor-pointer hover:translate-x-[-4px]' : ''
              } ${
                isOnlineToast 
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-500/20 shadow-emerald-500/5' 
                  : isOfflineToast 
                  ? 'bg-amber-50/90 dark:bg-amber-950/90 border-amber-500/20 shadow-amber-500/5' 
                  : isNotif
                  ? toast.notifType === 'success'
                    ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-500/20 hover:shadow-emerald-500/10'
                    : toast.notifType === 'error'
                    ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-500/20 hover:shadow-rose-500/10'
                    : toast.notifType === 'warning'
                    ? 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-500/20 hover:shadow-amber-500/10'
                    : 'bg-indigo-50/95 dark:bg-indigo-950/95 border-indigo-500/20 hover:shadow-indigo-500/10'
                  : 'bg-white/95 dark:bg-[#0B132B]/95 border-slate-100 dark:border-slate-800/80'
              }`}
            >
              {/* Highlight background elements for visuals */}
              {isMsg && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#0D5BFF]/5 rounded-full blur-2xl group-hover:bg-[#0D5BFF]/10 transition-all duration-500"></div>
              )}
              {isNotif && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-current/5 rounded-full blur-2xl group-hover:bg-current/10 transition-all duration-500"></div>
              )}

              <div className="flex justify-between items-start gap-4 relative z-10">
                <div className="flex items-start gap-4">
                  {/* Status Indicator Icon / Avatar */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                    isOnlineToast 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                      : isOfflineToast 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/10'
                      : isNotif
                      ? toast.notifType === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : toast.notifType === 'error'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : toast.notifType === 'warning'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      : 'bg-[#0D5BFF]/10 text-[#0D5BFF] dark:bg-[#0D5BFF]/20 border-transparent overflow-hidden'
                  }`}>
                    {isMsg ? (
                      toast.senderAvatar ? (
                        <img 
                          src={toast.senderAvatar} 
                          alt={toast.senderName} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="font-sans font-black italic text-sm">{toast.senderName.charAt(0).toUpperCase()}</span>
                      )
                    ) : isNotif ? (
                      toast.notifType === 'success' ? (
                        <span className="text-emerald-500 font-bold text-lg">✓</span>
                      ) : toast.notifType === 'error' ? (
                        <span className="text-rose-500 font-bold text-lg">✕</span>
                      ) : toast.notifType === 'warning' ? (
                        <span className="text-amber-500 font-bold text-lg">⚠️</span>
                      ) : (
                        <span className="text-indigo-500 font-bold text-lg">ℹ</span>
                      )
                    ) : isOnlineToast ? (
                      <Wifi className="w-5 h-5 animate-pulse" />
                    ) : (
                      <WifiOff className="w-5 h-5" />
                    )}
                  </div>

                  {/* Context Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${
                      isOnlineToast 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : isOfflineToast 
                        ? 'text-amber-600 dark:text-amber-500' 
                        : isNotif
                        ? toast.notifType === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400 font-black'
                          : toast.notifType === 'error'
                          ? 'text-rose-600 dark:text-rose-400 font-black'
                          : toast.notifType === 'warning'
                          ? 'text-amber-600 dark:text-amber-400 font-black'
                          : 'text-indigo-600 dark:text-indigo-400 font-black'
                        : 'text-[#0D5BFF]'
                    }`}>
                      {isMsg ? 'DECONSTRUCTING TRANSMISSION' : toast.title}
                    </h4>
                    
                    {isMsg ? (
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          FROM: <span className="text-[#0B132B] dark:text-white font-black italic">{toast.senderName}</span>
                        </p>
                        <p className="text-xs font-semibold leading-relaxed line-clamp-2 pr-4 break-words text-[#0B132B] dark:text-slate-200">
                          "{toast.content}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        {toast.content}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => handleDismiss(toast.id, e)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-all text-slate-400 hover:text-slate-700 dark:hover:text-white flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation CTA footer for actual messages */}
              {(isMsg || isNotif) && (
                <div className="mt-4 pt-3 border-t border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-[#0D5BFF] relative z-10 group-hover:translate-x-1 transition-transform">
                  <span className="flex items-center gap-1.5 font-bold">
                    {isMsg ? 'View transmission in hull' : 'Mark as read'} <ArrowRight className="w-3" />
                  </span>
                  
                  {/* Subtle timer visual bar */}
                  <div className="w-10 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 6, ease: 'linear' }}
                      className="absolute inset-y-0 right-0 bg-[#0D5BFF] h-1"
                      style={{ width: '100%', position: 'absolute', bottom: 0, left: 0 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
