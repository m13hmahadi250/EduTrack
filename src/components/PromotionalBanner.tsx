import React from 'react';
import { Sparkles, Zap, Gift } from 'lucide-react';

export default function PromotionalBanner() {
  const adText = "SPECIAL OFFER: JOIN AS A TUTOR TODAY AND GET 0% COMMISSION FOR THE FIRST 3 MONTHS! • VERIFIED TUTORS GET EXCLUSIVE BADGES • REAL-TIME TRACKING NOW LIVE IN ALL CITIES • ";

  return (
    <div className="bg-[#0B132B] text-white py-3 overflow-hidden whitespace-nowrap border-b border-white/10 relative z-[60] group cursor-default">
      <div className="flex items-center">
        <div className="flex items-center space-x-12 px-12 animate-marquee group-hover:[animation-play-state:paused]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center space-x-8 flex-shrink-0">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {adText}
                <Zap className="w-4 h-4 text-[#0D5BFF]" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Gift className="w-4 h-4 text-rose-500" />
                LIMITED TIME: FIRST SESSION FREE FOR STUDENTS!
                <Shield className="w-4 h-4 text-[#0D5BFF]" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
