import confetti from 'canvas-confetti';

/**
 * Triggers a celebratory confetti animation effect across the screen.
 * Used when a student successfully books a session or a tutor saves/verifies a class log.
 */
export function triggerConfetti() {
  try {
    // Primary center burst
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0D5BFF', '#10B981', '#F59E0B', '#6366F1', '#EC4899']
    });

    // Dual side cannons after a slight delay
    setTimeout(() => {
      confetti({
        particleCount: 35,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#0D5BFF', '#10B981', '#3B82F6']
      });
      confetti({
        particleCount: 35,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#F59E0B', '#EC4899', '#8B5CF6']
      });
    }, 180);
  } catch (err) {
    console.warn('Confetti animation error:', err);
  }
}
