import React, { memo } from 'react';
import { Zap, Gift } from 'lucide-react';
import { useAppStore } from '../store';

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

const PromotionalBanner = memo(function PromotionalBanner() {
  const adText = useAppStore(state => state.promotionalBannerText);

  if (!adText) return null;

  const items = [1, 2, 3, 4];

  return (
    <div
      role="region"
      aria-label="Promotional Announcements"
      className="bg-[#0B132B] text-white py-2.5 overflow-hidden whitespace-nowrap border-b border-white/10 relative z-[60] group cursor-default select-none"
    >
      <div className="flex w-max items-center animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none will-change-transform">
        {[0, 1].map((trackIdx) => (
          <div
            key={trackIdx}
            aria-hidden={trackIdx === 1 ? 'true' : undefined}
            className="flex items-center shrink-0"
          >
            {items.map((i) => (
              <div key={i} className="flex items-center space-x-8 sm:space-x-12 px-6 sm:px-8 flex-shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] sm:tracking-[0.28em] flex items-center gap-2.5 sm:gap-3">
                  <span>{adText}</span>
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D5BFF] shrink-0" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] sm:tracking-[0.28em] flex items-center gap-2.5 sm:gap-3">
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  <span>LIMITED TIME: FIRST DEMO SESSION COMPLETELY FREE FOR ALL STUDENTS!</span>
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D5BFF] shrink-0" />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export default PromotionalBanner;
