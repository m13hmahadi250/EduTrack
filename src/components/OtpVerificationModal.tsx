import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, AlertCircle, ShieldCheck, Check } from 'lucide-react';

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  ipNoticeMsg?: string;
  errorMsg?: string;
  successMsg?: string;
  loading?: boolean;
  resendTimer?: number;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}

export default function OtpVerificationModal({
  isOpen,
  email,
  ipNoticeMsg,
  errorMsg,
  successMsg,
  loading = false,
  resendTimer = 60,
  onClose,
  onVerify,
  onResend,
}: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isVerified, setIsVerified] = useState(false);
  const [localError, setLocalError] = useState('');

  // Motion Choreography Phases: 'idle' | 'curl' | 'spin' | 'screw' | 'completed'
  const [motionPhase, setMotionPhase] = useState<'idle' | 'curl' | 'spin' | 'screw' | 'completed'>('idle');
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hubRef = useRef<HTMLDivElement | null>(null);

  // Focus first input on modal open
  useEffect(() => {
    if (isOpen && !isVerified) {
      setDigits(['', '', '', '']);
      setLocalError('');
      setMotionPhase('idle');
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      }, 200);
    }
  }, [isOpen, isVerified]);

  const handleDigitChange = (index: number, val: string) => {
    setLocalError('');
    // Handle pasted full code
    if (val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '').slice(0, 4).split('');
      const newDigits = [...digits];
      cleanDigits.forEach((d, i) => {
        if (i < 4) newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(cleanDigits.length, 3);
      if (digitInputRefs.current[nextIndex]) {
        digitInputRefs.current[nextIndex]?.focus();
      }
      if (cleanDigits.length === 4) {
        triggerVerification(newDigits.join(''));
      }
      return;
    }

    const clean = val.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 3) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every(d => d !== '')) {
      triggerVerification(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        digitInputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  // THREE-BEAT ANIMATION EXECUTION
  const runThreeBeatAnimation = async () => {
    return new Promise<void>((resolve) => {
      setMotionPhase('curl');

      // Beat 1: The Curl (350ms)
      setTimeout(() => {
        setMotionPhase('spin');

        // Beat 2: The Spin (800ms)
        setTimeout(() => {
          setMotionPhase('screw');

          // Beat 3: The Screw Down (500ms)
          setTimeout(() => {
            setMotionPhase('completed');
            resolve();
          }, 500);
        }, 850);
      }, 400);
    });
  };

  const triggerVerification = async (codeStr: string) => {
    if (codeStr.length !== 4) {
      setLocalError('Please enter all 4 digits of the verification code.');
      return;
    }
    try {
      setLocalError('');
      // Run the cinematic 3-beat motion sequence
      await runThreeBeatAnimation();
      await onVerify(codeStr);
      setIsVerified(true);
    } catch (err: any) {
      setMotionPhase('idle');
      setLocalError(err.message || 'Invalid verification code. Please check your email.');
    }
  };

  const maskEmail = (str: string) => {
    if (!str) return '••••••@gmail.com';
    const parts = str.split('@');
    if (parts.length < 2) return str;
    const name = parts[0];
    const maskedName = name.length > 2 
      ? name.slice(0, 2) + '•'.repeat(Math.min(4, name.length - 2)) 
      : name;
    return `${maskedName}@${parts[1]}`;
  };

  if (!isOpen) return null;

  const orbitRadius = 68;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-sm bg-[#0B1120] border-2 border-slate-800 rounded-[32px] shadow-2xl shadow-blue-500/10 text-slate-100 overflow-hidden my-auto"
        >
          {/* Top subtle bar handle */}
          <div className="pt-3.5 pb-1 text-center">
            <div className="w-12 h-1 bg-slate-700/60 rounded-full mx-auto" />
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="px-6 pt-2 pb-2 text-center relative z-10">
            {!isVerified ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
                  <ShieldCheck className="w-3 h-3 text-[#0D5BFF]" />
                  <span>EduTrack BD • OTP</span>
                </div>

                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Verify Your Email
                </h2>
                <p className="mt-2 text-xs text-slate-400 font-medium leading-relaxed">
                  Enter the 4-digit security code sent to{' '}
                  <span className="font-mono text-blue-400 font-bold block mt-1 bg-blue-950/40 px-2.5 py-0.5 rounded-md border border-blue-800/40 w-fit mx-auto">
                    {maskEmail(email)}
                  </span>
                </p>
              </>
            ) : (
              /* VERIFIED APPROVED HEADINGS (Matches screenshot) */
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="pt-2 pb-1"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                  Verified successfully
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium">
                  Your email address has been verified.
                </p>
              </motion.div>
            )}
          </div>

          {/* Main Body */}
          <div className="px-6 pb-6 space-y-5">

            {/* Error Banner: RED REFUSAL VERDICT ONLY */}
            {(errorMsg || localError) && !isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2.5 shadow-md"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold leading-tight">{errorMsg || localError}</span>
              </motion.div>
            )}

            {/* IP Notice if any */}
            {ipNoticeMsg && !isVerified && (
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{ipNoticeMsg}</span>
              </div>
            )}

            {/* STAGE: THREE-BEAT MOTION CANVAS OR APPROVED STATE */}
            {!isVerified ? (
              <div className="py-2 relative min-h-[180px] flex items-center justify-center">

                {/* Central Hub Ref Point for Spin & Screw Down */}
                <div
                  ref={hubRef}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500/30 pointer-events-none z-10"
                />

                {/* 4 DIGIT SLOTS WITH EDUTRACK BRAND BLUE LIGHT */}
                <div className="relative w-full max-w-[280px] h-40 flex items-center justify-center">
                  {digits.map((digit, idx) => {
                    const isFilled = digit !== '';
                    const hasError = Boolean(errorMsg || localError);

                    // Target polar position on the 4-point circle (Beat 1: The Curl)
                    const angles = [270, 0, 90, 180];
                    const targetAngleRad = (angles[idx] * Math.PI) / 180;
                    const polarX = Math.round(Math.cos(targetAngleRad) * orbitRadius);
                    const polarY = Math.round(Math.sin(targetAngleRad) * orbitRadius);

                    // Linear X offset for standard row layout
                    const linearX = (idx - 1.5) * 62;

                    let currentX = linearX;
                    let currentY = 0;
                    let rotationDeg = 0;
                    let digitUnwindDeg = 0;
                    let scaleVal = 1;
                    let opacityVal = 1;

                    if (motionPhase === 'curl') {
                      currentX = polarX;
                      currentY = polarY;
                    } else if (motionPhase === 'spin') {
                      currentX = polarX;
                      currentY = polarY;
                      rotationDeg = 450;
                      digitUnwindDeg = -90;
                    } else if (motionPhase === 'screw') {
                      currentX = 0;
                      currentY = 0;
                      rotationDeg = 720;
                      scaleVal = 0.3;
                      opacityVal = 0;
                    }

                    return (
                      <motion.div
                        key={idx}
                        ref={(el) => { slotRefs.current[idx] = el; }}
                        animate={{
                          x: currentX,
                          y: currentY,
                          rotate: rotationDeg,
                          scale: scaleVal,
                          opacity: opacityVal,
                        }}
                        transition={{
                          duration: motionPhase === 'curl' ? 0.38 : motionPhase === 'spin' ? 0.8 : 0.5,
                          ease: [0.62, 0, 0.38, 1],
                        }}
                        style={{
                          transformOrigin: motionPhase === 'spin' || motionPhase === 'screw' ? '0px 0px' : 'center',
                        }}
                        className={`absolute z-20 w-13 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                          hasError
                            ? 'bg-rose-950/40 border-2 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-shake'
                            : isFilled
                            ? 'bg-[#152238] border-2 border-[#0D5BFF] text-white shadow-[0_0_16px_rgba(13,91,255,0.4)]'
                            : 'bg-[#0F172A] border-2 border-slate-700 text-slate-200 hover:border-slate-500 focus-within:border-[#0D5BFF] focus-within:bg-[#152238] focus-within:shadow-[0_0_18px_rgba(13,91,255,0.35)]'
                        }`}
                      >
                        <motion.input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          ref={(el) => { digitInputRefs.current[idx] = el; }}
                          value={digit}
                          animate={{ rotate: digitUnwindDeg }}
                          transition={{ duration: 0.8, ease: [0.62, 0, 0.38, 1] }}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          disabled={motionPhase !== 'idle'}
                          className="w-full h-full text-center font-mono font-black text-2xl bg-transparent outline-none cursor-pointer"
                        />
                      </motion.div>
                    );
                  })}
                </div>

              </div>
            ) : (
              /* STAGE: VERIFICATION APPROVED ANIMATION (Matches screenshot layout) */
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="py-6 text-center space-y-8"
              >
                {/* Central Emerald Squircle Node with Pulsing Glow & Check Drawing */}
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  {/* Pulsing Backlight Halo */}
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-500/30 rounded-3xl blur-xl"
                  />

                  {/* Main Glowing Squircle Icon Container */}
                  <motion.div
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="relative w-20 h-20 rounded-[22px] bg-[#0A1D16] border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.45)]"
                  >
                    <svg
                      className="w-10 h-10 stroke-emerald-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <motion.path
                        d="M20 6L9 17l-5-5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Lock Badge: Verified and secure */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Verified and secure</span>
                </motion.div>

                {/* Continue Action Pill Button */}
                <motion.button
                  type="button"
                  onClick={onClose}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full py-3.5 px-6 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95"
                >
                  Continue
                </motion.button>
              </motion.div>
            )}

            {/* Resend Link */}
            {!isVerified && (
              <div className="text-center pt-1">
                <p className="text-xs text-slate-400 font-medium">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={resendTimer > 0 || loading}
                    className={`font-mono font-bold transition-colors ${
                      resendTimer > 0 || loading
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-blue-400 hover:text-blue-300 underline cursor-pointer'
                    }`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </button>
                </p>
              </div>
            )}

            {/* Subtitle Footnote */}
            {!isVerified && (
              <p className="text-[11px] font-mono text-slate-500 text-center leading-normal pt-1">
                Please check your email inbox or spam folder for the 4-digit code.
              </p>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
