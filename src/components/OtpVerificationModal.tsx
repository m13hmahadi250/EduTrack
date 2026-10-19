import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, AlertCircle, ShieldCheck, Check, ArrowRight, Loader2, Clock, AlertTriangle, RotateCcw } from 'lucide-react';

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  devOtpCode?: string | number;
  ipNoticeMsg?: string;
  errorMsg?: string;
  successMsg?: string;
  loading?: boolean;
  resendTimer?: number;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  onComplete?: () => void;
  onResend: () => Promise<void>;
}

export default function OtpVerificationModal({
  isOpen,
  email,
  devOtpCode,
  ipNoticeMsg,
  errorMsg,
  successMsg,
  loading = false,
  resendTimer = 60,
  onClose,
  onVerify,
  onComplete,
  onResend,
}: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isVerified, setIsVerified] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // 5-Minute OTP Expiry Countdown (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(300);

  // Motion Choreography Phases: 'idle' | 'curl' | 'spin' | 'screw' | 'completed'
  const [motionPhase, setMotionPhase] = useState<'idle' | 'curl' | 'spin' | 'screw' | 'completed'>('idle');
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hubRef = useRef<HTMLDivElement | null>(null);

  // Focus first input and reset 5-minute countdown on modal open
  useEffect(() => {
    if (isOpen && !isVerified) {
      setDigits(['', '', '', '']);
      setLocalError('');
      setMotionPhase('idle');
      setIsSubmitting(false);
      setIsShaking(false);
      setExpirySeconds(300); // Strictly 5 minutes (300s)
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      }, 200);
    }
  }, [isOpen, isVerified]);

  // 5-minute Countdown interval
  useEffect(() => {
    if (!isOpen || isVerified) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLocalError('Verification code has expired (5-minute limit). Please click "Resend code" for a new OTP.');
          setDigits(['', '', '', '']);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isVerified]);

  // If external error arrives, blank the boxes and focus box 0
  useEffect(() => {
    if (errorMsg) {
      setLocalError(errorMsg);
      setDigits(['', '', '', '']);
      setMotionPhase('idle');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [errorMsg]);

  // Auto-proceed to dashboard 3.5s after showing approved animation if user doesn't click
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVerified) {
      timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          onClose();
        }
      }, 3500);
    }
    return () => clearTimeout(timer);
  }, [isVerified, onComplete, onClose]);

  const handleDigitChange = (index: number, val: string) => {
    setLocalError('');
    // Handle pasted full code
    if (val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '').slice(0, 4).split('');
      const newDigits = ['', '', '', ''];
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

      // Beat 1: The Curl (380ms)
      setTimeout(() => {
        setMotionPhase('spin');

        // Beat 2: The Cosmic Spin (850ms)
        setTimeout(() => {
          setMotionPhase('screw');

          // Beat 3: The Screw Down (500ms)
          setTimeout(() => {
            setMotionPhase('completed');
            resolve();
          }, 500);
        }, 850);
      }, 380);
    });
  };

  const triggerVerification = async (codeStr: string) => {
    if (codeStr.length !== 4) {
      setLocalError('Please enter all 4 digits of the verification code.');
      return;
    }
    if (expirySeconds === 0) {
      setLocalError('Verification code has expired (5-minute limit). Please click "Resend code" for a fresh OTP.');
      setDigits(['', '', '', '']);
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setLocalError('');
      // Run cinematic 3-beat motion sequence
      await runThreeBeatAnimation();
      // Verify OTP with backend & complete signup
      await onVerify(codeStr);
      // Show Approved Verdict Animation!
      setIsVerified(true);
    } catch (err: any) {
      setMotionPhase('idle');
      const errorMessage = err.message || 'Incorrect verification code. Please check your inbox and try again.';
      setLocalError(errorMessage);
      
      // Blank the input boxes again upon wrong OTP
      setDigits(['', '', '', '']);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      
      // Automatically refocus back to slot 0
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      }, 80);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInternalResend = async () => {
    setLocalError('');
    setDigits(['', '', '', '']);
    setExpirySeconds(300); // Reset to full 5 minutes
    await onResend();
    setTimeout(() => {
      if (digitInputRefs.current[0]) {
        digitInputRefs.current[0].focus();
      }
    }, 100);
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

  const formatExpiryTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const orbitRadius = 68;

  // Particle positions for celebration confetti
  const particles = [
    { id: 1, x: -60, delay: 0 },
    { id: 2, x: 50, delay: 0.1 },
    { id: 3, x: -30, delay: 0.2 },
    { id: 4, x: 70, delay: 0.15 },
    { id: 5, x: -80, delay: 0.25 },
    { id: 6, x: 20, delay: 0.05 },
    { id: 7, x: -45, delay: 0.3 },
    { id: 8, x: 85, delay: 0.2 },
  ];

  const activeError = errorMsg || localError;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-blue-500/10 text-slate-900 dark:text-slate-100 overflow-hidden my-auto"
        >
          {/* EduTrack Primary Brand Gradient Accent Line */}
          <div className="h-1.5 w-full bg-linear-to-r from-[#0D5BFF] via-blue-500 to-indigo-600" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="px-6 pt-6 pb-2 text-center relative z-10">
            {!isVerified ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 text-[#0D5BFF] dark:text-blue-400 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0D5BFF] dark:text-blue-400" />
                  <span>EDUTRACK BD • 4-DIGIT VERIFICATION</span>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Verify Your Email
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Enter the 4-digit security code sent to{' '}
                  <span className="font-mono text-[#0D5BFF] dark:text-blue-400 font-bold block mt-1 bg-blue-50/80 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800/50 w-fit mx-auto text-xs sm:text-sm">
                    {maskEmail(email)}
                  </span>
                </p>

                {/* 5-Minute Live Expiry Badge */}
                <div className="mt-3 flex items-center justify-center">
                  {expirySeconds > 0 ? (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                        expirySeconds <= 60
                          ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                          : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Code expires in {formatExpiryTime(expirySeconds)} (5 min limit)</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Expired (5 min limit) • Click Resend below</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* VERIFIED APPROVED HEADINGS */
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="pt-2 pb-1"
              >
                <h2 className="text-2xl sm:text-3xl font-extrabold bg-linear-to-r from-emerald-500 via-teal-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                  Verified successfully
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Your email address has been verified.
                </p>
              </motion.div>
            )}
          </div>

          {/* Main Body */}
          <div className="px-6 pb-7 space-y-5">

            {/* Error / Warning Alert Banner */}
            {activeError && !isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 shadow-md"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-rose-800 dark:text-rose-200">
                    Verification Warning
                  </div>
                  <div className="font-semibold leading-relaxed mt-0.5">{activeError}</div>
                  <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1 font-mono">
                    Inputs have been blanked. Please re-enter the code.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success / Resend Notice */}
            {successMsg && !activeError && !isVerified && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </motion.div>
            )}

            {/* IP Notice if any */}
            {ipNoticeMsg && !isVerified && (
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl text-[11px] text-sky-800 dark:text-sky-300 flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{ipNoticeMsg}</span>
              </div>
            )}

            {/* Verification Code Quick Banner for instant entry */}
            {devOtpCode && !isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-extrabold tracking-wide">
                    Verification Code: <span className="font-mono text-sm bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md text-amber-950 dark:text-amber-100">{String(devOtpCode)}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const codeArr = String(devOtpCode).padStart(4, '0').slice(0, 4).split('');
                    setDigits(codeArr);
                    triggerVerification(codeArr.join(''));
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 uppercase tracking-wider"
                >
                  Auto-fill & Verify
                </button>
              </motion.div>
            )}

            {/* STAGE: THREE-BEAT MOTION CANVAS OR APPROVED STATE */}
            {!isVerified ? (
              <div className="py-2 relative min-h-[190px] flex flex-col items-center justify-center">

                {/* Central Hub Energy Point for Orbit & Spin */}
                <div
                  ref={hubRef}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0D5BFF] dark:bg-blue-400 animate-ping" />
                </div>

                {/* Orbit Trail Rings */}
                {motionPhase === 'spin' && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0.6 }}
                    className="absolute w-36 h-36 rounded-full border-2 border-dashed border-[#0D5BFF]/40 pointer-events-none animate-spin"
                    style={{ animationDuration: '3s' }}
                  />
                )}

                {/* Screw Down Energy Burst Flash */}
                {motionPhase === 'screw' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute w-24 h-24 rounded-full bg-linear-to-r from-[#0D5BFF] to-emerald-400 blur-md pointer-events-none z-30"
                  />
                )}

                {/* 4 DIGIT SLOTS MATCHING SITE BRAND COLORS */}
                <div className={`relative w-full max-w-[290px] h-32 flex items-center justify-center ${isShaking ? 'animate-bounce' : ''}`}>
                  {digits.map((digit, idx) => {
                    const isFilled = digit !== '';
                    const hasError = Boolean(activeError);

                    // Target polar positions on orbit ring
                    const angles = [270, 0, 90, 180];
                    const targetAngleRad = (angles[idx] * Math.PI) / 180;
                    const polarX = Math.round(Math.cos(targetAngleRad) * orbitRadius);
                    const polarY = Math.round(Math.sin(targetAngleRad) * orbitRadius);

                    // Linear X offset for standard row layout
                    const linearX = (idx - 1.5) * 64;

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
                      scaleVal = 0.2;
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
                          duration: motionPhase === 'curl' ? 0.38 : motionPhase === 'spin' ? 0.85 : 0.5,
                          ease: [0.62, 0, 0.38, 1],
                        }}
                        style={{
                          transformOrigin: motionPhase === 'spin' || motionPhase === 'screw' ? '0px 0px' : 'center',
                        }}
                        className={`absolute z-20 w-13 sm:w-14 h-15 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                          hasError
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-600 dark:text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                            : isFilled
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-[#0D5BFF] text-[#0D5BFF] dark:text-blue-400 shadow-[0_0_20px_rgba(13,91,255,0.3)]'
                            : 'bg-slate-50 dark:bg-[#152238] border-2 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-[#0D5BFF] focus-within:bg-blue-50/50 dark:focus-within:bg-blue-950/40 focus-within:shadow-[0_0_20px_rgba(13,91,255,0.25)]'
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
                          transition={{ duration: 0.85, ease: [0.62, 0, 0.38, 1] }}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          disabled={motionPhase !== 'idle' || isSubmitting || expirySeconds === 0}
                          placeholder={expirySeconds === 0 ? "—" : "•"}
                          className="w-full h-full text-center font-mono font-extrabold text-2xl bg-transparent outline-none cursor-pointer placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Primary Action Button using EduTrack primary color palette */}
                <div className="w-full mt-4">
                  <button
                    type="button"
                    onClick={() => triggerVerification(digits.join(''))}
                    disabled={digits.some(d => !d) || isSubmitting || motionPhase !== 'idle' || expirySeconds === 0}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#0D5BFF] hover:bg-[#0047E1] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting || loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : expirySeconds === 0 ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Code Expired — Please Resend</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              /* STAGE: VERIFICATION APPROVED CELEBRATION ANIMATION */
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="py-4 text-center space-y-7 relative"
              >
                {/* Floating Confetti Sparks */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {particles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ y: 20, opacity: 1, x: 0, scale: 0.8 }}
                      animate={{ y: -90, opacity: 0, x: p.x, scale: 1.2 }}
                      transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
                      className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                    />
                  ))}
                </div>

                {/* Central Emerald Squircle Node with Pulsing Glow & Check Drawing */}
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center pt-2">
                  {/* Pulsing Backlight Halo Rings */}
                  <div className="absolute inset-0 bg-emerald-500/25 dark:bg-emerald-500/35 rounded-3xl blur-2xl animate-pulse" />
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-3xl animate-ping" style={{ animationDuration: '3s' }} />

                  {/* Main Glowing Squircle Icon Container */}
                  <motion.div
                    initial={{ scale: 0.4, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                    className="relative w-22 h-22 rounded-[24px] bg-slate-900 dark:bg-[#0A1D16] border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                  >
                    <svg
                      className="w-11 h-11 stroke-emerald-400"
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
                        transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Lock Badge: Verified and secure */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Verified and secure</span>
                </motion.div>

                {/* Continue Action Pill Button */}
                <motion.button
                  type="button"
                  onClick={() => {
                    if (onComplete) {
                      onComplete();
                    } else {
                      onClose();
                    }
                  }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base tracking-wide transition-all shadow-[0_0_30px_rgba(16,185,129,0.45)] cursor-pointer active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            )}

            {/* Resend Link */}
            {!isVerified && (
              <div className="text-center pt-1">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center justify-center gap-2">
                  <span>Didn't receive the code or expired?</span>
                  <button
                    type="button"
                    onClick={handleInternalResend}
                    disabled={resendTimer > 0 || loading || isSubmitting}
                    className={`font-mono font-bold transition-colors inline-flex items-center gap-1 ${
                      resendTimer > 0 || loading || isSubmitting
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'text-[#0D5BFF] dark:text-blue-400 hover:underline cursor-pointer'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}</span>
                  </button>
                </p>
              </div>
            )}

            {/* Subtitle Footnote */}
            {!isVerified && (
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 text-center leading-normal pt-1">
                Please check your email inbox or spam folder for the 4-digit code (valid for 5 minutes).
              </p>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


