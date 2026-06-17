import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div id="logout-confirm-backdrop" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop screen */}
          <motion.div
            id="logout-backdrop-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-[#0B132B]/80 backdrop-blur-sm"
          />

          {/* Modal box */}
          <motion.div
            id="logout-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100/80 dark:border-slate-800/80 z-[120] relative"
          >
            {/* Close button in top-right corner */}
            <button
              id="logout-modal-close"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 text-center flex flex-col items-center">
              {/* Animated LogOut Icon Circle */}
              <div
                id="logout-icon-container"
                className="w-14 h-14 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-5 border border-rose-100/50 dark:border-rose-950/20"
              >
                <LogOut className="w-6 h-6 stroke-[2.5]" />
              </div>

              {/* Title & Description */}
              <h3
                id="logout-modal-title"
                className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-2"
              >
                Confirm Logout
              </h3>
              <p
                id="logout-modal-text"
                className="text-slate-500 dark:text-slate-400 text-sm font-semibold max-w-[240px] leading-relaxed mb-6"
              >
                Are you sure you want to log out of your session?
              </p>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  id="logout-cancel-btn"
                  onClick={onClose}
                  className="py-3.5 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  id="logout-confirm-btn"
                  onClick={onConfirm}
                  className="py-3.5 bg-rose-500 hover:bg-rose-600 text-white shadow-[0_8px_16px_rgba(244,63,94,0.2)] text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98]"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
