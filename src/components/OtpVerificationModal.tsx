import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Lock, MessageSquare, RefreshCw, AlertCircle, ShieldCheck, Sparkles, Orbit, Grid } from 'lucide-react';

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
  onResend,
}: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerified, setIsVerified] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'orbit'>('grid');
  const [localError, setLocalError] = useState('');
  const [fillClicked, setFillClicked] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Synchronize dev OTP prefill if available
  useEffect(() => {
    if (devOtpCode && (ipNoticeMsg || !digits.some(d => d))) {
      const codeStr = String(devOtpCode).padStart(6, '0');
      setDigits(codeStr.split('').slice(0, 6));
    }
  }, [devOtpCode, ipNoticeMsg]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen && !isVerified) {
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 200);
    }
  }, [isOpen, isVerified]);

  const handleDigitChange = (index: number, val: string) => {
    setLocalError('');
    // Handle full pasted code
    if (val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      cleanDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(cleanDigits.length, 5);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
      }
      if (cleanDigits.length === 6) {
        triggerVerification(newDigits.join(''));
      }
      return;
    }

    const clean = val.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
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
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const triggerVerification = async (codeStr: string) => {
    if (codeStr.length !== 6) {
      setLocalError('Please enter all 6 digits of the verification code.');
      return;
    }
    try {
      setLocalError('');
      await onVerify(codeStr);
      setIsVerified(true);
    } catch (err: any) {
      setLocalError(err.message || 'Verification failed. Please check the code.');
    }
  };

  const handleQuickFill = () => {
    if (!devOtpCode) return;
    const codeStr = String(devOtpCode).padStart(6, '0').slice(0, 6);
    const chars = codeStr.split('');
    
    // Animate fill digit by digit for visual polish
    setFillClicked(true);
    chars.forEach((char, idx) => {
      setTimeout(() => {
        setDigits(prev => {
          const next = [...prev];
          next[idx] = char;
          return next;
        });
        if (idx === 5) {
          triggerVerification(codeStr);
        }
      }, idx * 60);
    });
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

  // Orbit radius & trigonometric angles for 6-digit radial layout
  const orbitRadius = 88; // radius in px

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#0e1017] dark:bg-[#0c0e14] border border-slate-800 rounded-[28px] shadow-2xl shadow-emerald-950/20 text-white overflow-hidden my-auto"
        >
          {/* Top subtle bar / handle */}
          <div className="pt-3 pb-1 text-center">
            <div className="w-10 h-1 bg-slate-700/60 rounded-full mx-auto" />
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="px-6 pt-2 pb-4 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>ZERO DEPENDENCIES • OTP v3</span>
            </div>

            {!isVerified ? (
              <>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Verify your email
                </h2>
                <p className="mt-1.5 text-xs text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                  Enter the 6-digit code we sent to{' '}
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                    {maskEmail(email)}
                  </span>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-emerald-400 tracking-tight">
                  Verified successfully
                </h2>
                <p className="mt-1.5 text-xs text-slate-400 font-medium">
                  Your email has been verified and secured.
                </p>
              </>
            )}
          </div>

          {/* Main Content Body */}
          <div className="px-6 pb-6 space-y-5">
            
            {/* View Mode Switcher (Grid vs Orbit) */}
            {!isVerified && (
              <div className="flex justify-center items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                      : 'bg-slate-800/40 text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>Boxes View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('orbit')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'orbit'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                      : 'bg-slate-800/40 text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  <Orbit className="w-3 h-3" />
                  <span>Radial Orbit</span>
                </button>
              </div>
            )}

            {/* IP Notice or Error Banners */}
            {ipNoticeMsg && !isVerified && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{ipNoticeMsg}</span>
              </div>
            )}

            {(errorMsg || localError) && !isVerified && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-300 flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{errorMsg || localError}</span>
              </div>
            )}

            {/* STATE 1 & 2: CODE INPUT AREA */}
            {!isVerified ? (
              <div className="py-2">
                {viewMode === 'grid' ? (
                  /* LINEAR BOXES VIEW */
                  <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                    {digits.map((digit, idx) => {
                      const isFilled = digit !== '';
                      return (
                        <motion.input
                          key={idx}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          whileFocus={{ scale: 1.05 }}
                          className={`w-full h-12 sm:h-14 text-center font-mono font-black text-xl sm:text-2xl rounded-2xl border-2 transition-all duration-200 outline-none ${
                            isFilled
                              ? 'bg-[#121620] border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              : 'bg-[#141722] border-slate-800 text-white hover:border-slate-700 focus:border-emerald-500 focus:bg-[#121620] focus:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          }`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* RADIAL ORBIT VIEW (Image 2 representation) */
                  <div className="relative w-full h-64 flex items-center justify-center my-2">
                    {/* Central pulsating core dot */}
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] z-10 flex items-center justify-center"
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </motion.div>

                    {/* Concentric orbit ring */}
                    <div className="absolute w-[180px] h-[180px] rounded-full border border-emerald-500/20 border-dashed pointer-events-none" />

                    {/* Orbiting Radial Digit Nodes */}
                    {digits.map((digit, idx) => {
                      // Distribute 6 digits evenly around 360 degrees starting from -90 deg (top)
                      const angle = (idx * (360 / 6) - 90) * (Math.PI / 180);
                      const x = Math.round(Math.cos(angle) * orbitRadius);
                      const y = Math.round(Math.sin(angle) * orbitRadius);

                      const isFilled = digit !== '';

                      return (
                        <motion.div
                          key={idx}
                          initial={{ x: 0, y: 0, opacity: 0 }}
                          animate={{ x, y, opacity: 1 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 200, delay: idx * 0.05 }}
                          className="absolute z-20"
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            className={`w-12 h-12 text-center font-mono font-black text-xl rounded-2xl border-2 transition-all duration-200 outline-none cursor-pointer ${
                              isFilled
                                ? 'bg-[#0f141f] border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                : 'bg-[#141722] border-slate-700 text-slate-400 hover:border-emerald-500/60 focus:border-emerald-500 focus:text-emerald-400'
                            }`}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Resend Timer & Link */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={onResend}
                      disabled={resendTimer > 0 || loading}
                      className={`font-mono font-bold transition-colors ${
                        resendTimer > 0 || loading
                          ? 'text-slate-500 cursor-not-allowed'
                          : 'text-emerald-400 hover:text-emerald-300 underline cursor-pointer'
                      }`}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </p>
                </div>

                {/* In-App Simulated SMS/OTP Notification Pill (Bottom Fill Widget) */}
                {devOtpCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 p-3 rounded-2xl bg-[#141722] border border-slate-800/80 flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                          MESSAGE • OTP
                        </p>
                        <p className="text-xs font-mono font-bold text-white truncate">
                          <span className="text-emerald-400">{devOtpCode}</span> is your verification code.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuickFill}
                      disabled={fillClicked || loading}
                      className="px-3.5 py-1.5 bg-slate-200 hover:bg-white text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {fillClicked ? 'Filled!' : 'Fill'}
                    </button>
                  </motion.div>
                )}

                {/* Verification Trigger Button */}
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => triggerVerification(digits.join(''))}
                    disabled={loading || digits.join('').length !== 6}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Verify & Continue
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* STATE 3: SUCCESS STATE (Right Image representation) */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                className="py-6 text-center space-y-6"
              >
                {/* Central Emerald Glowing Node */}
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative w-16 h-16 rounded-2xl bg-[#0f1622] border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                </div>

                {/* Verified Badge */}
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/50">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verified and secure</span>
                </div>

                {/* Continue Action */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-[0.99] cursor-pointer"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {/* Bottom footnote */}
            <p className="text-[11px] font-mono text-slate-500 text-center leading-normal">
              Type it, paste it, or let the message fill it — secure one-time code.
            </p>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
