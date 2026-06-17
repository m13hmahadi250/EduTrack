import React, { useEffect, useState, useRef } from 'react';
import { useAppStore, Message } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, WifiOff, Wifi, ArrowRight, BellRing, Settings } from 'lucide-react';

interface ActiveToast {
  id: string;
  type: 'message' | 'online' | 'offline';
  title?: string;
  content: string;
  senderName: string;
  senderAvatar?: string;
}

export default function MessageToastCenter() {
  const { messages, currentUser, users } = useAppStore();
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
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Check notification permissions and prompt nicely on load
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
      
      if (Notification.permission === 'default') {
        // Delay permission prompt slightly for dynamic visual comfort
        const timer = setTimeout(() => {
          setShowPermissionPrompt(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  // Handle explicit permission grant
  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        setShowPermissionPrompt(false);
        
        // Spawn a pilot transmission notification to confirm connectivity
        if (permission === 'granted') {
          new window.Notification('System Alert', {
            body: 'Desktop notifications successfully linked to your device.',
            icon: '/favicon.ico',
            tag: 'edutrack-confirm'
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
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
      
      // Automatically dismiss network toast
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
          title: 'System Disconnected',
          content: 'Offline mode active. Message queue synchronizations queued.',
          senderName: ''
        }
      ]);
      
      // Automatically dismiss network toast
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 5000);
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
      notifiedIdsRef.current.clear();
      return;
    }

    // On initial mount or auth transition, register existing unread messages to seen list
    if (!initializedRef.current) {
      messages.forEach(m => {
        if (m.receiverId === currentUser.id && !m.isRead) {
          notifiedIdsRef.current.add(m.id);
        }
      });
      initializedRef.current = true;
      return;
    }

    messages.forEach(m => {
      // Condition check for qualifying messages:
      // - Aimed at our logged-in user
      // - Unread
      // - Not previously processed by the toast controller
      if (m.receiverId === currentUser.id && !m.isRead && !notifiedIdsRef.current.has(m.id)) {
        notifiedIdsRef.current.add(m.id);

        const isTabHidden = document.hidden;
        const isNotOnMessagesPath = location.pathname !== '/messages';

        // Trigger notifications if away from the relevant interface or active tab
        if (isTabHidden || isNotOnMessagesPath) {
          const sender = users.find(u => u.id === m.senderId);
          const senderName = sender ? sender.name : 'Unknown User';
          const senderAvatar = sender?.profileImage;

          // 1. Trigger in-app toast component
          setToasts(prev => [
            ...prev,
            {
              id: m.id,
              type: 'message',
              content: m.content,
              senderName,
              senderAvatar
            }
          ]);

          // 2. Trigger native OS / desktop notification system
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const nativeNotif = new window.Notification(`New Message from ${senderName}`, {
                body: m.content,
                icon: senderAvatar || '/favicon.ico',
                tag: 'edutrack-msg-' + m.senderId,
                silent: false,
                requireInteraction: false
              });

              nativeNotif.onclick = () => {
                window.focus();
                navigate('/messages');
                nativeNotif.close();
              };
            } catch (err) {
              console.warn('Failed to dispatch native desktop notification:', err);
            }
          }

          // Automatically clear this message toast after 6 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== m.id));
          }, 6000);
        }
      }
    });
  }, [messages, currentUser, users, location.pathname, navigate]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (toast: ActiveToast) => {
    if (toast.type === 'message') {
      navigate('/messages');
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
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-105_40">ALERTS CONFIGURATION</h4>
                  <p className="text-xs font-black uppercase italic mt-1">Enable Desktop Alerts</p>
                  <p className="text-[10px] text-blue-50/90 leading-relaxed mt-1">
                    Receive active transmission logs instantly, even when offline or minimized in the hull.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
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
                Grant Permission
              </button>
              <span className="text-[8px] font-black uppercase tracking-widest text-white/50 italic mr-2">SECURE ENDPOINT API</span>
            </div>
          </motion.div>
        )}

        {toasts.map(toast => {
          const isMsg = toast.type === 'message';
          const isOnlineToast = toast.type === 'online';
          const isOfflineToast = toast.type === 'offline';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={() => handleToastClick(toast)}
              className={`pointer-events-auto w-full border text-[#0B132B] dark:text-white p-5 rounded-[2rem] shadow-2xl relative overflow-hidden group transition-all duration-300 ${
                isMsg ? 'cursor-pointer hover:translate-x-[-4px] hover:shadow-[#0D5BFF]/10' : ''
              } ${
                isOnlineToast 
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-500/20 shadow-emerald-500/5' 
                  : isOfflineToast 
                  ? 'bg-amber-50/90 dark:bg-amber-950/90 border-amber-500/20 shadow-amber-500/5' 
                  : 'bg-white/95 dark:bg-[#0B132B]/95 border-slate-100 dark:border-slate-800/80'
              }`}
            >
              {/* Highlight background elements for visuals */}
              {isMsg && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#0D5BFF]/5 rounded-full blur-2xl group-hover:bg-[#0D5BFF]/10 transition-all duration-500"></div>
              )}

              <div className="flex justify-between items-start gap-4 relative z-10">
                <div className="flex items-start gap-4">
                  {/* Status Indicator Icon / Avatar */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                    isOnlineToast 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                      : isOfflineToast 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/10'
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
              {isMsg && (
                <div className="mt-4 pt-3 border-t border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-[#0D5BFF] relative z-10 group-hover:translate-x-1 transition-transform">
                  <span className="flex items-center gap-1.5 font-bold">
                    View transmission in hull <ArrowRight className="w-3" />
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
