import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Award } from 'lucide-react';
import { BADGE_DEFINITIONS, BadgeDefinition } from '../utils/badges';

interface BadgeDisplayProps {
  badgeIds?: string[];
  role?: 'student' | 'tutor';
  interactive?: boolean;
}

export default function BadgeDisplay({ badgeIds = [], role, interactive = true }: BadgeDisplayProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null);

  // If no badges earned yet, show an elegant gamification checklist to inspire them!
  const hasBadges = badgeIds.length > 0;

  // Filter definitions relevant to this user's role to show as "upcoming" or possible to earn
  const potentialBadges = Object.values(BADGE_DEFINITIONS).filter(
    b => (b.role === 'all' || b.role === role) && !badgeIds.includes(b.id)
  );

  return (
    <div className="w-full">
      {hasBadges ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {badgeIds.map((badgeId) => {
              const badge = BADGE_DEFINITIONS[badgeId];
              if (!badge) return null;
              const Icon = badge.icon;
              
              return (
                <div key={badgeId} className="relative">
                  {/* Badge Interactive Pill */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setHoveredBadgeId(badgeId)}
                    onMouseLeave={() => setHoveredBadgeId(null)}
                    onClick={() => setSelectedBadge(selectedBadge?.id === badgeId ? null : badge)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold tracking-tight shadow-sm cursor-pointer transition-all ${badge.bgLightClass} ${badge.borderColorClass} ${badge.iconColorClass}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{badge.title}</span>
                  </motion.button>

                  {/* Desktop Hover Tooltip */}
                  <AnimatePresence>
                    {hoveredBadgeId === badgeId && !selectedBadge && interactive && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 bg-slate-950 text-white p-3 rounded-2xl shadow-xl border border-white/10"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-xl ${badge.colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                              {badge.title}
                            </h4>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                              {badge.description}
                            </p>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-slate-950" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Interactive Info Modal/Banner upon selection */}
          <AnimatePresence>
            {selectedBadge && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-4 rounded-3xl border mt-3 transition-all flex items-start gap-4 ${selectedBadge.bgLightClass} ${selectedBadge.borderColorClass}`}>
                  <div className={`p-3 rounded-2xl shrink-0 shadow-md ${selectedBadge.colorClass}`}>
                    {React.createElement(selectedBadge.icon, { className: "w-6 h-6" })}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {selectedBadge.title} Achievement
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setSelectedBadge(null)}
                        className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {selectedBadge.description}
                    </p>
                    <div className="pt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      <span>🎉 Active Digital Credential</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty Badge State: Gamification Board encouraging user to unlock them! */
        <div className="bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/30">
            <Award className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-xs font-black text-[#0B132B] dark:text-white uppercase tracking-wider">
              Unlock Your First Badge
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Complete tutoring sessions, earn 5-star ratings, or share referrals to unlock premium verified badges that display proudly on your profile!
            </p>
          </div>

          {role && potentialBadges.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-900">
              <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Upcoming Milestone Goals
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {potentialBadges.slice(0, 4).map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.id} className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                          {b.title}
                        </h5>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium truncate">
                          {b.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
