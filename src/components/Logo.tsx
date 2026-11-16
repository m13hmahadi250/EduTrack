import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} edutrack-logo-mark edutrack-logo-enter rounded-xl bg-gradient-to-tr from-[#0D5BFF] to-[#1EA5FC] dark:from-[#111A2E] dark:to-[#0D5BFF] p-1.5 transition-shadow duration-200 shadow-sm shadow-blue-500/15 dark:shadow-[#0D5BFF]/10 border border-blue-400/20 dark:border-blue-500/30`}
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Graduation Cap — lifts subtly on parent hover */}
      <g className="edutrack-logo-cap">
        {/* Mortar board (diamond) */}
        <polygon points="50,15 88,30 50,45 12,30" fill="none" />

        {/* Underside cap skull */}
        <path d="M30,37 v7 c0,6 40,6 40,0 v-7" fill="none" />

        {/* Tassel */}
        <g className="edutrack-logo-tassel">
          <path d="M76,33.5 v14" strokeWidth="5" />
          <polygon points="73,47.5 79,47.5 76,57" fill="white" stroke="none" />
        </g>
      </g>

      {/* Books Stack */}
      {/* Book 1 (Top) */}
      <path d="M 28,62 h 44 M 28,68 h 44" strokeWidth="5" />
      <path d="M 28,62 c -5,0 -5,6 0,6" strokeWidth="5" />
      <path d="M 72,62 v 6" strokeWidth="5" />
      <line x1="38" y1="65" x2="66" y2="65" strokeWidth="4" />

      {/* Book 2 (Bottom) */}
      <path d="M 28,74 h 44 M 28,80 h 44" strokeWidth="5" />
      <path d="M 28,74 c -5,0 -5,6 0,6" strokeWidth="5" />
      <path d="M 72,74 v 6" strokeWidth="5" />
      <line x1="38" y1="77" x2="66" y2="77" strokeWidth="4" />
    </svg>
  );
};

export default Logo;
