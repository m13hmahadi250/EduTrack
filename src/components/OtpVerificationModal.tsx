import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, AlertCircle, ShieldCheck, Check, ArrowRight, Loader2, Clock, RotateCcw } from 'lucide-react';
import { useBackHandler, scrollFieldIntoView } from '../utils/mobileWebView';
import { formatUserFriendlyError } from '../lib/errorMonitoring';

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  otpLength?: number;
  initialExpirySeconds?: number;
  expiresAtMs?: number;
  serverOffsetMs?: number;
  challengeId?: string;
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

const DEFAULT_OTP_LENGTH = 6;

export default function OtpVerificationModal({
  isOpen,
  email,
  otpLength = DEFAULT_OTP_LENGTH,
  initialExpirySeconds = 300,
  expiresAtMs,
  serverOffsetMs = 0,
  challengeId,
  ipNoticeMsg,
  errorMsg,
  successMsg,
  loading = false,
  resendTimer = 55,
  onClose,
  onVerify,
  onComplete,
  onResend,
}: OtpVerificationModalProps) {
  const createEmptyDigits = () => Array(otpLength).fill('');
  const [digits, setDigits] = useState<string[]>(createEmptyDigits);
  const [isVerified, setIsVerified] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const fallbackDeadlineRef = useRef<number>(Date.now() + initialExpirySeconds * 1000);
  const inFlightRef = useRef<boolean>(false);

  const computeRemainingSeconds = React.useCallback(() => {
    if (typeof expiresAtMs === 'number' && Number.isFinite(expiresAtMs) && expiresAtMs > 0) {
      const serverNow = Date.now() + (Number.isFinite(serverOffsetMs) ? serverOffsetMs : 0);
      return Math.max(0, Math.ceil((expiresAtMs - serverNow) / 1000));
    }
    return Math.max(0, Math.ceil((fallbackDeadlineRef.current - Date.now()) / 1000));
  }, [expiresAtMs, serverOffsetMs]);

  // 5-Minute OTP Expiry Countdown synced with server-issued deadline
  const [expirySeconds, setExpirySeconds] = useState<number>(() =>
    typeof expiresAtMs === 'number' && expiresAtMs > 0
      ? Math.max(0, Math.ceil((expiresAtMs - (Date.now() + (serverOffsetMs || 0))) / 1000))
      : initialExpirySeconds
  );

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  useBackHandler(isOpen, onClose, 'otp-verification-modal');

  // Focus first input and sync server-issued deadline on modal open or new challenge
  useEffect(() => {
    if (isOpen && !isVerified) {
      if (!expiresAtMs) {
        fallbackDeadlineRef.current = Date.now() + initialExpirySeconds * 1000;
      }
      setDigits(Array(otpLength).fill(''));
      setLocalError('');
      setIsSubmitting(false);
      inFlightRef.current = false;
      setIsShaking(false);
      setExpirySeconds(computeRemainingSeconds());
      const timer = setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
          digitInputRefs.current[0].select();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVerified, otpLength, challengeId, expiresAtMs, initialExpirySeconds, computeRemainingSeconds]);

  // Live Countdown interval + mobile WebView / browser visibility & focus resync
  useEffect(() => {
    if (!isOpen || isVerified) return;

    const syncTimer = () => {
      const remaining = computeRemainingSeconds();
      setExpirySeconds(remaining);
      if (remaining <= 0) {
        setLocalError(
          `Verification code has expired (5-minute limit). Please click "Resend code" for a new ${otpLength}-digit OTP.`
        );
        setDigits(Array(otpLength).fill(''));
      }
    };

    syncTimer();
    const interval = setInterval(syncTimer, 500);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', syncTimer);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', syncTimer);
    };
  }, [isOpen, isVerified, otpLength, computeRemainingSeconds]);

  // If external error arrives, trigger shake, display error, and refocus slot 0
  useEffect(() => {
    if (errorMsg) {
      setLocalError(formatUserFriendlyError(errorMsg, 'otp'));
      setDigits(Array(otpLength).fill(''));
      setIsShaking(true);
      const shakeTimer = setTimeout(() => setIsShaking(false), 600);
      const focusTimer = setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
          digitInputRefs.current[0].select();
        }
      }, 120);
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(focusTimer);
      };
    }
  }, [errorMsg, otpLength]);

  // Auto-proceed to dashboard 2.5s after showing approved animation if user doesn't click
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVerified) {
      timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          onClose();
        }
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [isVerified, onComplete, onClose]);

  // Clipboard Paste Handler - supports desktop Ctrl+V and mobile Long-Press Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const cleanDigits = pasted.replace(/\D/g, '').slice(0, otpLength).split('');
    if (cleanDigits.length > 0) {
      setLocalError('');
      const newDigits = Array(otpLength).fill('');
      cleanDigits.forEach((d, i) => {
        if (i < otpLength) newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(cleanDigits.length - 1, otpLength - 1);
      if (digitInputRefs.current[nextIndex]) {
        digitInputRefs.current[nextIndex]?.focus();
      }
      if (cleanDigits.length === otpLength) {
        triggerVerification(newDigits.join(''));
      }
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    setLocalError('');
    const clean = val.replace(/\D/g, '');

    // Handle multi-character paste or browser autofill in onChange
    if (clean.length > 1) {
      const cleanDigits = clean.slice(0, otpLength).split('');
      const newDigits = [...digits];
      cleanDigits.forEach((d, i) => {
        if (index + i < otpLength) {
          newDigits[index + i] = d;
        }
      });
      setDigits(newDigits);
      const nextIdx = Math.min(index + cleanDigits.length - 1, otpLength - 1);
      digitInputRefs.current[nextIdx]?.focus();
      if (newDigits.every((d) => d !== '')) {
        triggerVerification(newDigits.join(''));
      }
      return;
    }

    const singleDigit = clean.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    // Auto-focus next input field
    if (singleDigit && index < otpLength - 1) {
      digitInputRefs.current[index + 1]?.focus();
      digitInputRefs.current[index + 1]?.select();
    }

    // Auto-trigger verification when all 6 digits are completed
    if (newDigits.every((d) => d !== '')) {
      triggerVerification(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      setLocalError('');
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        digitInputRefs.current[index - 1]?.focus();
        digitInputRefs.current[index - 1]?.select();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitInputRefs.current[index - 1]?.focus();
      digitInputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < otpLength - 1) {
      e.preventDefault();
      digitInputRefs.current[index + 1]?.focus();
      digitInputRefs.current[index + 1]?.select();
    }
  };

  const triggerVerification = async (codeStr: string) => {
    if (codeStr.length !== otpLength) {
      setLocalError(`Please enter all ${otpLength} digits of the verification code.`);
      return;
    }
    if (computeRemainingSeconds() <= 0) {
      setExpirySeconds(0);
      setLocalError('Verification code has expired (5-minute limit). Please click "Resend code" for a fresh 6-digit OTP.');
      setDigits(Array(otpLength).fill(''));
      return;
    }
    if (inFlightRef.current || isSubmitting) return;

    try {
      inFlightRef.current = true;
      setIsSubmitting(true);
      setLocalError('');

      await onVerify(codeStr);
      setIsVerified(true);
    } catch (err: any) {
      const errorMessage = formatUserFriendlyError(
        err?.message || 'The verification code you entered is incorrect. Please check and try again.',
        'otp'
      );
      setLocalError(errorMessage);
      setDigits(Array(otpLength).fill(''));
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
          digitInputRefs.current[0].select();
        }
      }, 100);
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleInternalResend = async () => {
    setLocalError('');
    setDigits(Array(otpLength).fill(''));
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

  const activeError = errorMsg || localError;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-slate-900 dark:text-slate-100 my-auto"
        >
          {/* Top Accent Line */}
          <div className="h-1 w-full bg-[#0D5BFF]" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
            aria-label="Close verification dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="px-6 pt-6 pb-2 text-center relative z-10">
            {!isVerified ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 text-[#0D5BFF] dark:text-blue-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0D5BFF] dark:text-blue-400" />
                  <span>Email Security Verification</span>
                </div>

                <h2 id="otp-modal-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Enter {otpLength}-Digit Verification Code
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  We sent a one-time security code to your email address:
                  <span className="font-mono text-[#0D5BFF] dark:text-blue-400 font-semibold block mt-1 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800 w-fit mx-auto text-xs sm:text-sm">
                    {maskEmail(email)}
                  </span>
                </p>

                {/* 5-Minute Live Expiry Badge */}
                <div className="mt-3 flex items-center justify-center">
                  {expirySeconds > 0 ? (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors tabular-nums ${
                        expirySeconds <= 60
                          ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                          : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Expires in {formatExpiryTime(expirySeconds)}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-mono font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Code expired</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Identity Verified</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Email Confirmed
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Your account has been verified. Redirecting to your workspace...
                </p>
              </>
            )}
          </div>

          {/* Main Body */}
          <div className="px-6 pb-7 space-y-4">
            {/* Error Alert Banner */}
            {activeError && !isVerified && (
              <div
                role="alert"
                className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-rose-800 dark:text-rose-200">
                    Verification Error
                  </div>
                  <div className="mt-0.5 leading-relaxed">{activeError}</div>
                </div>
              </div>
            )}

            {/* Success / Resend Notice */}
            {successMsg && !activeError && !isVerified && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* IP Notice if any */}
            {ipNoticeMsg && !isVerified && (
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{ipNoticeMsg}</span>
              </div>
            )}

            {!isVerified ? (
              <div className="py-2 flex flex-col items-center justify-center">
                {/* 6 DIGIT SLOTS */}
                <div
                  className={`grid grid-cols-6 gap-1.5 sm:gap-2.5 w-full max-w-[340px] my-3 ${
                    isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''
                  }`}
                >
                  {digits.map((digit, idx) => {
                    const isFilled = digit !== '';
                    const hasError = Boolean(activeError);

                    return (
                      <div
                        key={idx}
                        className={`relative h-12 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-150 cursor-text select-none ${
                          hasError
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-600 dark:text-rose-200'
                            : isFilled
                            ? 'bg-blue-50/80 dark:bg-blue-950/60 border-2 border-[#0D5BFF] text-[#0D5BFF] dark:text-blue-400'
                            : 'bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-within:border-[#0D5BFF] focus-within:ring-2 focus-within:ring-[#0D5BFF]/20'
                        }`}
                        onClick={() => {
                          digitInputRefs.current[idx]?.focus();
                          digitInputRefs.current[idx]?.select();
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                          ref={(el) => {
                            digitInputRefs.current[idx] = el;
                          }}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onPaste={handlePaste}
                          onFocus={(e) => {
                            setLocalError('');
                            e.target.select();
                            scrollFieldIntoView(e.currentTarget);
                          }}
                          disabled={isSubmitting || expirySeconds === 0}
                          placeholder={expirySeconds === 0 ? '—' : '•'}
                          className="w-full h-full text-center font-mono font-bold text-lg sm:text-2xl bg-transparent outline-none cursor-text placeholder:text-slate-300 dark:placeholder:text-slate-600 select-text tabular-nums"
                          aria-label={`Verification code digit ${idx + 1} of ${otpLength}`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Primary Action Button */}
                <div className="w-full mt-3">
                  <button
                    type="button"
                    onClick={() => triggerVerification(digits.join(''))}
                    disabled={digits.some(d => !d) || isSubmitting || loading || expirySeconds === 0}
                    className="w-full min-h-[46px] py-3 px-5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting || loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : expirySeconds === 0 ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Code Expired — Please Resend</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Complete Registration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* VERIFICATION APPROVED STATE */
              <div className="py-4 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="w-8 h-8 stroke-[2.5]" />
                </div>

                <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verified & Encrypted Session</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onComplete) {
                      onComplete();
                    } else {
                      onClose();
                    }
                  }}
                  className="w-full min-h-[46px] py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Resend Link */}
            {!isVerified && (
              <div className="text-center pt-1">
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleInternalResend}
                    disabled={resendTimer > 0 || loading || isSubmitting}
                    className={`font-mono font-semibold transition-colors inline-flex items-center gap-1 tabular-nums ${
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

            {!isVerified && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-normal pt-1">
                Never share your verification code with anyone. EduTrack staff will never ask for this code.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
