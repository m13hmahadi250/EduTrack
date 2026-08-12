import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Lock, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

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
  // Beat 1: Polar Curl -> Beat 2: Native Hub Spin (450 deg) -> Beat 3: Screw Down Spiral
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

  const orbitRadius = 68; // exact radius in px for radial ring

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-sm bg-[#0a0c10] border border-slate-800/80 rounded-[32px] shadow-2xl text-slate-100 overflow-hidden my-auto"
        >
          {/* Top subtle bar handle */}
          <div className="pt-3.5 pb-1 text-center">
            <div className="w-9 h-1 bg-slate-800/80 rounded-full mx-auto" />
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="px-6 pt-2 pb-3 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-slate-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>EMAIL VERIFICATION</span>
            </div>

            {!isVerified ? (
              <>
                <h2 className="text-2xl font-extrabold text-slate-50 tracking-tight">
                  Enter Verification Code
                </h2>
                <p className="mt-2 text-xs text-slate-400 font-medium">
                  We sent a 4-digit security code to{' '}
                  <span className="font-mono text-slate-200 font-semibold">
                    {maskEmail(email)}
                  </span>
                </p>
              </>
            ) : (
              <>
                {/* MINT VERDICT HEADING */}
                <h2 className="text-2xl font-black text-emerald-400 tracking-tight">
                  Verified Successfully
                </h2>
                <p className="mt-1.5 text-xs text-slate-400 font-medium">
                  Your email address has been verified.
                </p>
              </>
            )}
          </div>

          {/* Main Body */}
          <div className="px-6 pb-6 space-y-4">

            {/* Error Banner: RED REFUSAL VERDICT ONLY */}
            {(errorMsg || localError) && !isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2.5 shadow-md"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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

            {/* STAGE: THREE-BEAT MOTION CANVAS */}
            {!isVerified ? (
              <div className="py-4 relative min-h-[200px] flex items-center justify-center">

                {/* Central Hub Ref Point for Spin & Screw Down */}
                <div
                  ref={hubRef}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400/40 pointer-events-none z-10"
                />

                {/* 4 DIGIT SLOTS WITH COLD BLUE-WHITE LIGHT ATTENTION */}
                <div className="relative w-full max-w-[280px] h-44 flex items-center justify-center">
                  {digits.map((digit, idx) => {
                    const isFilled = digit !== '';
                    const hasError = Boolean(errorMsg || localError);

                    // Calculate target polar position on the 4-point circle (Beat 1: The Curl)
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
                        className={`absolute z-20 w-13 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
                          hasError
                            ? 'bg-red-950/40 border-2 border-red-500 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-shake'
                            : isFilled
                            ? 'bg-[#121824] border-2 border-sky-200 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.35)]'
                            : 'bg-[#121620] border-2 border-slate-800 text-slate-300 hover:border-slate-700 focus-within:border-sky-300 focus-within:bg-[#151c2a] focus-within:shadow-[0_0_16px_rgba(56,189,248,0.3)]'
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
              /* STAGE: VERIFIED OUTCOME (MINT VERDICT ONLY) */
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="py-8 text-center space-y-6"
              >
                {/* Central Mint Node */}
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 bg-emerald-500/25 rounded-2xl blur-lg animate-pulse" />
                  <div className="relative w-14 h-14 rounded-2xl bg-[#0d1814] border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.45)]">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                </div>

                {/* Verified badge */}
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-3.5 py-1 rounded-full border border-emerald-800/60">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified and secure</span>
                </div>

                {/* Mint Continue Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer active:scale-95"
                >
                  Continue
                </button>
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
                        : 'text-slate-200 hover:text-white underline cursor-pointer'
                    }`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </button>
                </p>
              </div>
            )}

            {/* Subtitle Footnote */}
            <p className="text-[11px] font-mono text-slate-500 text-center leading-normal pt-1">
              Please check your email inbox or spam folder for the 4-digit code.
            </p>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
