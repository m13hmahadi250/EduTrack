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
      el.style.setProperty('--ambient-mlx', '0px');
      el.style.setProperty('--ambient-mly', '0px');
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
      const scrollTop = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        doc.scrollTop || 0,
        document.body?.scrollTop || 0
      );
      const docHeight = Math.max(
        doc.scrollHeight || 0,
        document.body?.scrollHeight || 0
      );
      const scrollable = Math.max(1, docHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollTop / scrollable));

      const scrollKey = `${scrollTop.toFixed(1)}:${scrollable}`;
      if (scrollKey === lastScrollKey) return;
      lastScrollKey = scrollKey;

      // Smooth multi-turn orbital drift across full page scroll (idle = static)
      const angle = progress * Math.PI * 2.5;
      const lx = Math.sin(angle) * 68;
      const ly = (1 - Math.cos(angle)) * 84;

      const mlx = Math.cos(angle * 0.85 + 0.9) * 56;
      const mly = Math.sin(angle * 0.85 + 0.9) * 72;

      const rx = -Math.sin(angle + 0.7) * 72;
      const ry = (1 - Math.cos(angle + 0.7)) * 88;

      const mx = Math.cos(angle * 0.9 + 1.3) * 62;
      const my = Math.sin(angle * 0.9 + 1.3) * 76;

      const by = -progress * 44;

      el.style.setProperty('--ambient-p', progress.toFixed(4));
      el.style.setProperty('--ambient-lx', `${lx.toFixed(2)}px`);
      el.style.setProperty('--ambient-ly', `${ly.toFixed(2)}px`);
      el.style.setProperty('--ambient-mlx', `${mlx.toFixed(2)}px`);
      el.style.setProperty('--ambient-mly', `${mly.toFixed(2)}px`);
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
      <div className="ambient-glow-left absolute -left-[18vw] sm:-left-[10vw] -top-[6vh] w-[88vw] sm:w-[64vw] max-w-[960px] h-[64vh] sm:h-[82vh] max-h-[880px]" />

      {/* Mid-left layered depth: subtle secondary blue + navy orbital wash */}
      <div className="ambient-glow-mid-left absolute -left-[16vw] sm:-left-[9vw] top-[36vh] w-[80vw] sm:w-[56vw] max-w-[840px] h-[58vh] sm:h-[74vh] max-h-[800px]" />

      {/* Right / upper-right edge: deep navy (#142B60) diffused atmospheric shading */}
      <div className="ambient-glow-right absolute -right-[16vw] sm:-right-[8vw] -top-[8vh] w-[90vw] sm:w-[66vw] max-w-[1000px] h-[66vh] sm:h-[84vh] max-h-[900px]" />

      {/* Mid-right / lower-right edge: secondary diffused deep navy radial layer */}
      <div className="ambient-glow-mid-right absolute -right-[14vw] sm:-right-[6vw] top-[34vh] w-[84vw] sm:w-[60vw] max-w-[900px] h-[62vh] sm:h-[76vh] max-h-[820px]" />

      {/* Lower canvas: gentle blue-navy to white scroll transition */}
      <div className="ambient-glow-lower absolute inset-x-0 -bottom-[12vh] h-[64vh] max-h-[680px]" />
    </div>
  );
});

export default AmbientBackground;
