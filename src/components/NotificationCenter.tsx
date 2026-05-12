import React, { useEffect, useState } from 'react';
import { useAppStore, Notification } from '../store';
import { Bell, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationCenter() {
  const { notifications, markAsRead } = useAppStore();
  const [showLatest, setShowLatest] = useState<Notification | null>(null);

  // Show latest unread notification as a toast
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (unread.length > 0) {
      setShowLatest(unread[0]);
      const timer = setTimeout(() => {
        markAsRead(unread[0].id);
        setShowLatest(null);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowLatest(null);
    }
  }, [notifications, markAsRead]);

  return (
    <div className="fixed bottom-10 right-10 z-[100] pointer-events-none w-full max-w-md">
      <AnimatePresence>
        {showLatest && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            className="pointer-events-auto bg-[#0B132B] text-white p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0D5BFF]/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-500"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-start space-x-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  showLatest.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                  showLatest.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                  showLatest.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  <NotificationIcon type={showLatest.type} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0D5BFF] mb-2">{showLatest.title}</h4>
                  <p className="text-sm font-black uppercase italic leading-tight tracking-tight">{showLatest.message}</p>
                </div>
              </div>
              <button 
                onClick={() => markAsRead(showLatest.id)}
                className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors text-white/30 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-6 flex justify-between items-center relative z-10">
               <span className="text-[8px] font-black uppercase tracking-widest text-white/20">System Update Locked</span>
               <div className="w-12 h-1 bg-white/10 rounded-full relative overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className="absolute inset-0 bg-[#0D5BFF]"
                  />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'success': return <CheckCircle className="w-6 h-6" />;
    case 'error': return <AlertCircle className="w-6 h-6" />;
    case 'warning': return <AlertTriangle className="w-6 h-6" />;
    default: return <Info className="w-6 h-6" />;
  }
}
