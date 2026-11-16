import React, { memo, useEffect, useRef } from 'react';

interface AmbientBackgroundProps {
  variant?: 'default' | 'dashboard';
}

/**
 * Lightweight, scroll-reactive orbital atmospheric canvas for Homepage, Dashboard, and TeacherProfile.
 * Updates CSS custom properties directly inside requestAnimationFrame on passive scroll events
 * (zero React rerenders, zero idle animation, automatically static under prefers-reduced-motion).
 */
const AmbientBackground = memo(function AmbientBackground({
  variant = 'default',
}: AmbientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const resetStaticVars = () => {
      el.style.setProperty('--ambient-p', '0');
      el.style.setProperty('--ambient-lx', '0px');
      el.style.setProperty('--ambient-ly', '0px');
      el.style.setProperty('--ambient-rx', '0px');
      el.style.setProperty('--ambient-ry', '0px');
      el.style.setProperty('--ambient-mx', '0px');
      el.style.setProperty('--ambient-my', '0px');
      el.style.setProperty('--ambient-by', '0px');
    };

    if (motionQuery?.matches) {
      resetStaticVars();
      return;
    }

    let rafId: number | null = null;
    let lastScrollKey = '';

    const updateAmbientOrbit = () => {
      rafId = null;
      const doc = document.documentElement;
      const scrollTop =
        window.scrollY ||
        window.pageYOffset ||
        doc.scrollTop ||
        document.body.scrollTop ||
        0;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollTop / scrollable));

      const scrollKey = `${scrollTop.toFixed(1)}:${scrollable}`;
      if (scrollKey === lastScrollKey) return;
      lastScrollKey = scrollKey;

      // Smooth multi-turn orbital angle across full page scroll (idle = static)
      const angle = progress * Math.PI * 2.4;
      const lx = Math.sin(angle) * 44;
      const ly = (1 - Math.cos(angle)) * 48;

      const rx = -Math.sin(angle + 0.65) * 46;
      const ry = (1 - Math.cos(angle + 0.65)) * 52;

      const mx = Math.cos(angle * 0.9 + 1.3) * 40;
      const my = Math.sin(angle * 0.9 + 1.3) * 48;

      const by = -progress * 32;

      el.style.setProperty('--ambient-p', progress.toFixed(4));
      el.style.setProperty('--ambient-lx', `${lx.toFixed(2)}px`);
      el.style.setProperty('--ambient-ly', `${ly.toFixed(2)}px`);
      el.style.setProperty('--ambient-rx', `${rx.toFixed(2)}px`);
      el.style.setProperty('--ambient-ry', `${ry.toFixed(2)}px`);
      el.style.setProperty('--ambient-mx', `${mx.toFixed(2)}px`);
      el.style.setProperty('--ambient-my', `${my.toFixed(2)}px`);
      el.style.setProperty('--ambient-by', `${by.toFixed(2)}px`);
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateAmbientOrbit);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        resetStaticVars();
      } else {
        lastScrollKey = '';
        scheduleUpdate();
      }
    };

    updateAmbientOrbit();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    document.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    motionQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      document.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      motionQuery?.removeEventListener?.('change', handleMotionChange);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-ambient-variant={variant}
      className="edutrack-ambient-bg fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      {/* Left edge: soft EduTrack blue (#155DFC) diffused atmospheric shading */}
      <div className="ambient-glow-left absolute -left-[12vw] -top-[8vh] w-[62vw] max-w-[920px] h-[78vh] max-h-[840px]" />

      {/* Right / upper-right edge: deep navy (#142B60) diffused atmospheric shading */}
      <div className="ambient-glow-right absolute -right-[8vw] -top-[10vh] w-[64vw] max-w-[960px] h-[82vh] max-h-[880px]" />

      {/* Mid-right / lower-right edge: secondary diffused deep navy radial layer */}
      <div className="ambient-glow-mid-right absolute -right-[6vw] top-[34vh] w-[58vw] max-w-[880px] h-[74vh] max-h-[800px]" />

      {/* Lower canvas: gentle blue-gray to white scroll transition */}
      <div className="ambient-glow-lower absolute inset-x-0 -bottom-[14vh] h-[66vh] max-h-[680px]" />
    </div>
  );
});

export default AmbientBackground;
