import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, MessageSquare, Send } from 'lucide-react';
import { useAppStore } from '../store';

interface RatingModalProps {
  sessionId: string;
  tutorName: string;
  onClose: () => void;
}

export default function RatingModal({ sessionId, tutorName, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rateSession = useAppStore(state => state.rateSession);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await rateSession(sessionId, rating, feedback);
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B132B]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-black text-[#0B132B] italic uppercase leading-tight">Rate Your Session</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">How was your session with <span className="text-[#0D5BFF] font-bold">{tutorName}</span>?</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
              >
                <Star 
                  className={`w-10 h-10 transition-colors ${
                    star <= (hover || rating) 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-slate-200'
                  }`} 
                />
              </motion.button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">Share your feedback</label>
              <div className="relative">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you like about the session? (Optional)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#0D5BFF]/10 focus:border-[#0D5BFF] outline-none transition-all resize-none min-h-[120px]"
                />
                <MessageSquare className="absolute bottom-4 right-4 w-5 h-5 text-slate-300 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                rating === 0 || isSubmitting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#0D5BFF] text-white shadow-[0_8px_16px_rgba(13,91,255,0.2)] hover:bg-blue-700'
              }`}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>

        <div className="bg-emerald-50 px-8 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <Star className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-bold text-emerald-800 leading-tight">
            Your rating helps us maintain the highest quality standards on Education.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
