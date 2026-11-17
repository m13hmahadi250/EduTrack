import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, AlertCircle, ShieldCheck, Check, ArrowRight, Loader2, Clock, RotateCcw, ClipboardPaste } from 'lucide-react';
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
  const [otpCode, setOtpCode] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [clipboardHint, setClipboardHint] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const fallbackDeadlineRef = useRef<number>(Date.now() + initialExpirySeconds * 1000);
  const inFlightRef = useRef<boolean>(false);
  const otpInputRef = useRef<HTMLInputElement | null>(null);

  const digits = Array.from({ length: otpLength }, (_, i) => otpCode[i] || '');

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

  useBackHandler(isOpen, onClose, 'otp-verification-modal');

  const focusUnifiedInput = React.useCallback(() => {
    const input = otpInputRef.current;
    if (!input) return;
    input.focus();
    const len = input.value.length;
    try {
      input.setSelectionRange(len, len);
    } catch {
      // Ignore selection range errors on unsupported inputs
    }
  }, []);

  // Focus unified input and sync server-issued deadline on modal open or new challenge
  useEffect(() => {
    if (isOpen && !isVerified) {
      if (!expiresAtMs) {
        fallbackDeadlineRef.current = Date.now() + initialExpirySeconds * 1000;
      }
      setOtpCode('');
      setLocalError('');
      setClipboardHint('');
      setIsSubmitting(false);
      inFlightRef.current = false;
      setIsShaking(false);
      setExpirySeconds(computeRemainingSeconds());
      const timer = setTimeout(() => {
        focusUnifiedInput();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVerified, otpLength, challengeId, expiresAtMs, initialExpirySeconds, computeRemainingSeconds, focusUnifiedInput]);

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
        setOtpCode('');
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

  // If external error arrives, trigger shake, display error, and refocus unified input
  useEffect(() => {
    if (errorMsg) {
      setLocalError(formatUserFriendlyError(errorMsg, 'otp'));
      setOtpCode('');
      setIsShaking(true);
      const shakeTimer = setTimeout(() => setIsShaking(false), 600);
      const focusTimer = setTimeout(() => {
        focusUnifiedInput();
      }, 120);
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(focusTimer);
      };
    }
  }, [errorMsg, otpLength, focusUnifiedInput]);

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

  const triggerVerification = async (codeStr: string) => {
    const cleanCode = codeStr.replace(/\D/g, '').slice(0, otpLength);
    if (cleanCode.length !== otpLength) {
      setLocalError(`Please enter all ${otpLength} digits of the verification code.`);
      return;
    }
    if (computeRemainingSeconds() <= 0) {
      setExpirySeconds(0);
      setLocalError(`Verification code has expired (5-minute limit). Please click "Resend code" for a fresh ${otpLength}-digit OTP.`);
      setOtpCode('');
      return;
    }
    if (inFlightRef.current || isSubmitting) return;

    try {
      inFlightRef.current = true;
      setIsSubmitting(true);
      setLocalError('');
      setClipboardHint('');

      await onVerify(cleanCode);
      setIsVerified(true);
    } catch (err: any) {
      const errorMessage = formatUserFriendlyError(
        err || 'The verification code you entered is incorrect. Please check and try again.',
        'otp'
      );
      setLocalError(errorMessage);
      setOtpCode('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setTimeout(() => {
        focusUnifiedInput();
      }, 100);
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const applySanitizedOtp = (rawText: string) => {
    const sanitized = rawText.replace(/\D/g, '').slice(0, otpLength);
    setLocalError('');
    setClipboardHint('');
    setOtpCode(sanitized);
    if (sanitized.length === otpLength) {
      triggerVerification(sanitized);
    }
    return sanitized;
  };

  // Supports OS SMS/Email one-tap autofill, mobile keyboard suggestions, and typing
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applySanitizedOtp(e.target.value);
  };

  // Clipboard Paste Handler - supports desktop Ctrl+V and mobile Long-Press Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const clean = pasted.replace(/\D/g, '').slice(0, otpLength);
    if (clean.length > 0) {
      applySanitizedOtp(clean);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && otpCode.length === otpLength) {
      e.preventDefault();
      triggerVerification(otpCode);
    } else if (e.key === 'Backspace') {
      setLocalError('');
      setClipboardHint('');
    }
  };

  // One-tap Paste Code fallback when OS/WebView blocks auto-read or user copied from Gmail
  const handlePasteCodeClick = async () => {
    if (isSubmitting || loading || expirySeconds === 0) return;
    setLocalError('');
    setClipboardHint('');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        const extracted = text.replace(/\D/g, '').slice(0, otpLength);
        if (extracted.length > 0) {
          applySanitizedOtp(extracted);
          focusUnifiedInput();
          return;
        }
        setClipboardHint('No verification digits found in clipboard. Copy the 6-digit code from your email first.');
        focusUnifiedInput();
        return;
      }
      setClipboardHint('Tap the code box above and choose Paste from your keyboard.');
      focusUnifiedInput();
    } catch {
      setClipboardHint('Tap inside the code box above and select Paste from your keyboard menu.');
      focusUnifiedInput();
    }
  };

  const handleInternalResend = async () => {
    setLocalError('');
    setClipboardHint('');
    setOtpCode('');
    await onResend();
    setTimeout(() => {
      focusUnifiedInput();
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
  const activeSlotIndex = Math.min(otpCode.length, otpLength - 1);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-slate-900 dark:text-slate-100 my-auto"
        >
          {/* Top Accent Line */}
          <div className="h-1 w-full bg-[#0D5BFF] shrink-0" />

          {/* Close Button (44px touch target) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
            aria-label="Close verification dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto">
            {/* Header Section */}
            <div className="px-4 sm:px-6 pt-6 pb-2 text-center relative z-10">
              {!isVerified ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 text-[#0D5BFF] dark:text-blue-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-3">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0D5BFF] dark:text-blue-400" />
                    <span>Email Security Verification</span>
                  </div>

                  <h2 id="otp-modal-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight pr-6 pl-6 sm:px-0">
                    Enter {otpLength}-Digit Verification Code
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    We sent a one-time security code to your email address:
                    <span className="font-mono text-[#0D5BFF] dark:text-blue-400 font-semibold block mt-1 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800 w-fit max-w-full break-all mx-auto text-xs sm:text-sm">
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
            <div className="px-4 sm:px-6 pb-4 space-y-4">
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
                <div className="py-1 flex flex-col items-center justify-center">
                  {/* Single Real Accessible OTP Input Overlaid Transparently Over 6 Visual Digit Cells */}
                  <div
                    className={`relative w-full max-w-[340px] my-2 ${
                      isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className="grid grid-cols-6 gap-1.5 sm:gap-2.5 w-full pointer-events-none select-none"
                    >
                      {digits.map((digit, idx) => {
                        const isFilled = digit !== '';
                        const hasError = Boolean(activeError);
                        const isActiveCell = isInputFocused && !isSubmitting && expirySeconds > 0 && idx === activeSlotIndex;

                        return (
                          <div
                            key={idx}
                            className={`h-12 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-150 font-mono font-bold text-lg sm:text-2xl tabular-nums ${
                              hasError
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-600 dark:text-rose-200'
                                : isActiveCell
                                ? 'bg-blue-50/90 dark:bg-blue-950/70 border-2 border-[#0D5BFF] ring-2 ring-[#0D5BFF]/20 text-[#0D5BFF] dark:text-blue-400'
                                : isFilled
                                ? 'bg-blue-50/80 dark:bg-blue-950/60 border-2 border-[#0D5BFF] text-[#0D5BFF] dark:text-blue-400'
                                : 'bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {isFilled ? (
                              <span>{digit}</span>
                            ) : isActiveCell ? (
                              <span className="w-0.5 h-5 sm:h-6 bg-[#0D5BFF] dark:bg-blue-400 animate-pulse rounded-full" />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                {expirySeconds === 0 ? '—' : '•'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <input
                      ref={otpInputRef}
                      id="unified-otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={otpLength}
                      value={otpCode}
                      onChange={handleOtpChange}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                      onFocus={(e) => {
                        setIsInputFocused(true);
                        setLocalError('');
                        scrollFieldIntoView(e.currentTarget);
                      }}
                      onBlur={() => setIsInputFocused(false)}
                      disabled={isSubmitting || expirySeconds === 0}
                      className="otp-unified-input absolute inset-0 z-10 w-full h-full cursor-text rounded-xl select-none"
                      aria-label={`Enter ${otpLength}-digit verification code`}
                    />
                  </div>

                  {/* Paste Code Button & Smart AutoFill Hint */}
                  <div className="flex flex-col items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={handlePasteCodeClick}
                      disabled={isSubmitting || loading || expirySeconds === 0}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-[#0D5BFF] dark:text-blue-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste Code</span>
                    </button>
                    {clipboardHint && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 text-center max-w-xs leading-snug">
                        {clipboardHint}
                      </p>
                    )}
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
            </div>
          </div>

          {/* Sticky Bottom Action Footer — Remains Accessible When Mobile Keyboard Opens */}
          {!isVerified && (
            <div className="shrink-0 px-4 sm:px-6 pt-3 pb-4 sm:pb-5 bg-white dark:bg-[#0B132B] border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <button
                type="button"
                onClick={() => triggerVerification(otpCode)}
                disabled={otpCode.length !== otpLength || isSubmitting || loading || expirySeconds === 0}
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

              <div className="text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleInternalResend}
                    disabled={resendTimer > 0 || loading || isSubmitting}
                    className={`min-h-[36px] px-1.5 font-mono font-semibold transition-colors inline-flex items-center gap-1 tabular-nums ${
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

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-normal">
                Never share your verification code with anyone. EduTrack staff will never ask for this code.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
