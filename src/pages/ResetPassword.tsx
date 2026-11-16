import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, GraduationCap, Check, X, ArrowRight, Clock } from 'lucide-react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import SEOHead from '../components/SEOHead';
import { formatUserFriendlyError } from '../lib/errorMonitoring';
import { scrollFieldIntoView } from '../utils/mobileWebView';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';
  const customToken = searchParams.get('token') || '';
  const token = oobCode || customToken;
  const emailParam = searchParams.get('email') || '';

  const navigate = useNavigate();

  // Component states
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState(emailParam);

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Auto-redirect countdown timer when password reset is successful
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetSuccess && redirectCountdown !== null && redirectCountdown > 0) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (resetSuccess && redirectCountdown === 0) {
      navigate('/login', {
        state: { successMessage: 'Your password has been updated successfully. Please sign in with your new password.' },
      });
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resetSuccess, redirectCountdown, navigate]);

  // Verify token / oobCode on component mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifying(false);
        setTokenValid(false);
        setTokenError('Invalid or missing password reset link. Please request a new link from the Sign In page.');
        return;
      }

      // If this is a Firebase Auth action code (oobCode)
      if (oobCode) {
        try {
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setTokenValid(true);
          setVerifiedEmail(userEmail || emailParam || 'your account');
        } catch (fbErr: any) {
          console.error('[Firebase Reset Code Verification Error]:', fbErr);
          const errCode = fbErr?.code || '';
          if (errCode === 'auth/invalid-action-code' || errCode === 'auth/expired-action-code') {
            setTokenValid(false);
            setTokenError('This password reset link is invalid, expired, or has already been used. Please request a new link.');
          } else {
            // Allow token to be tried on submit
            setTokenValid(true);
            setVerifiedEmail(emailParam || 'your account');
          }
        } finally {
          setVerifying(false);
        }
        return;
      }

      // Otherwise verify custom token with backend API
      try {
        const queryParams = new URLSearchParams({ token });
        if (emailParam) queryParams.set('email', emailParam);

        const response = await fetch(`/api/auth/verify-reset-token?${queryParams.toString()}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
          setVerifiedEmail(data.email || emailParam || 'your account');
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        console.error('[Verify Token Error]:', err);
        // Fall back to assuming valid token so user isn't locked out due to network glitch
        setTokenValid(true);
        setVerifiedEmail(emailParam || 'your account');
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, oobCode, emailParam]);

  // Real-time password criteria evaluation
  const checkPasswordCriteria = (pass: string) => {
    return {
      minLength: pass.length >= 8,
      upperAndLower: /[A-Z]/.test(pass) && /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[^A-Za-z0-9]/.test(pass),
    };
  };

  const criteria = checkPasswordCriteria(newPassword);
  
  const calculateStrengthScore = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // 0 to 5
  };

  const strengthScore = calculateStrengthScore(newPassword);

  const getStrengthMeta = (score: number) => {
    if (!newPassword) return { label: 'Enter Password', percentage: 0, color: 'bg-slate-200 dark:bg-slate-700', textColor: 'text-slate-400' };
    if (score <= 1) return { label: 'Very Weak', percentage: 20, color: 'bg-rose-500', textColor: 'text-rose-500' };
    if (score === 2) return { label: 'Weak', percentage: 40, color: 'bg-orange-500', textColor: 'text-orange-500' };
    if (score === 3) return { label: 'Fair', percentage: 60, color: 'bg-amber-500', textColor: 'text-amber-500' };
    if (score === 4) return { label: 'Good', percentage: 80, color: 'bg-blue-500', textColor: 'text-blue-500' };
    return { label: 'Strong & Secure', percentage: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500' };
  };

  const strengthMeta = getStrengthMeta(strengthScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Preserve exact password characters (never .trim() passwords)
    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Firebase hosted oobCode path: confirmPasswordReset directly updates & consumes the oobCode
      if (oobCode) {
        try {
          await confirmPasswordReset(auth, oobCode, newPassword);
        } catch (fbResetErr: any) {
          console.error('[Password Reset Confirmation Error]:', fbResetErr);
          const fbCode = fbResetErr?.code || '';
          if (fbCode === 'auth/expired-action-code') {
            throw new Error('This password reset link has expired. Please request a new link.');
          } else if (fbCode === 'auth/invalid-action-code') {
            throw new Error('This password reset link is invalid or has already been used.');
          } else if (fbCode === 'auth/weak-password') {
            throw new Error('Password is too weak. Please use at least 8 characters with numbers and letters.');
          } else if (fbCode === 'auth/user-disabled') {
            throw new Error('This account has been deactivated. Please contact support for assistance.');
          } else {
            throw new Error(formatUserFriendlyError(fbResetErr, 'reset'));
          }
        }

        setResetSuccess(true);
        setRedirectCountdown(3);
        return;
      }

      // 2. Server-issued reset token path: backend updates Firebase Auth password AND consumes token
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: customToken,
          email: verifiedEmail,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success === true) {
        setResetSuccess(true);
        setRedirectCountdown(3);
      } else {
        setFormError(formatUserFriendlyError(data.error || data, 'reset'));
      }
    } catch (err: any) {
      console.error('[Reset Password Error]:', err);
      setFormError(formatUserFriendlyError(err, 'reset'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/40 dark:bg-slate-950/20 relative">
      <SEOHead
        title="Reset Account Password | EduTrack Bangladesh"
        description="Securely reset and update your EduTrack Bangladesh account password. Enter your new password to regain access to your tutor or student profile."
        keywords="reset password edutrack, recover password, tutor account recovery, student account recovery"
        canonicalUrl="https://edutrackbd.vercel.app/reset-password"
      />
      {/* Toast Notification Banner for Successful Password Reset */}
      <AnimatePresence>
        {resetSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            id="password-reset-success-toast"
            className="fixed top-4 sm:top-6 left-3 right-3 sm:left-auto sm:right-6 z-[9999] w-auto sm:w-full sm:max-w-md bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md border-2 border-emerald-500/80 dark:border-emerald-500/60 rounded-2xl shadow-[0_12px_40px_-8px_rgba(16,185,129,0.3)] p-4 sm:p-5 overflow-hidden"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Password Reset Successful
                  </h4>
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-300/50 dark:border-emerald-800/50 shrink-0">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{redirectCountdown ?? 3}s</span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Your password for <strong className="text-slate-900 dark:text-white">{verifiedEmail}</strong> has been updated. Redirecting to sign in...
                </p>

                <div className="mt-3.5 flex items-center gap-3">
                  <button
                    type="button"
                    id="toast-sign-in-now-btn"
                    onClick={() =>
                      navigate('/login', {
                        state: { successMessage: 'Your password has been updated successfully. Please sign in with your new password.' },
                      })
                    }
                    className="px-4 py-2 bg-[#0D5BFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Depleting progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="h-full bg-emerald-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white dark:bg-[#111A2E] rounded-3xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800/85 p-5 sm:p-8 relative overflow-hidden"
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between mb-6 pb-4 sm:mb-8 sm:pb-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center border border-[#0D5BFF]/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black uppercase tracking-wider text-[#0B132B] dark:text-white">EduTrack</span>
                <span className="bg-[#0D5BFF] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider">BD</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Security Operations Center
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Sign In
          </Link>
        </div>

        {/* 1. Verifying State */}
        {verifying ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="absolute w-16 h-16 rounded-full border-4 border-t-[#0D5BFF] border-r-transparent border-b-transparent border-l-transparent"
                />
                <Key className="w-6 h-6 text-[#0D5BFF] animate-pulse" />
              </div>
            </div>
            <h3 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Verifying Reset Token
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">
              Authenticating one-time link...
            </p>
          </div>
        ) : !tokenValid ? (
          /* 2. Invalid Token State */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-200 dark:border-rose-900/30">
              <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-900 dark:text-white mb-2">
              Invalid or Expired Link
            </h2>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
              {tokenError || 'This password reset link is invalid or has already been used.'}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Request New Password Link
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : resetSuccess ? (
          /* 3. Password Reset Success State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-900/30 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wide text-slate-900 dark:text-white mb-2">
              Password Updated!
            </h2>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Your password for <strong className="text-slate-900 dark:text-slate-100">{verifiedEmail}</strong> has been successfully updated.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-6">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Redirecting to Login in {redirectCountdown ?? 3}s...</span>
            </div>

            <button
              type="button"
              id="card-sign-in-now-btn"
              onClick={() =>
                navigate('/login', {
                  state: { successMessage: 'Your password has been updated successfully. Please sign in with your new password.' },
                })
              }
              className="w-full py-4 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign In Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          /* 4. Active Reset Form */
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#0B132B] dark:text-white">
                Set New Password
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider mt-1">
                Account: <span className="text-[#0D5BFF]">{verifiedEmail}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <AnimatePresence mode="wait">
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
                    <span>{formError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* New Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  New Password <span className="text-[#0D5BFF]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFormError('');
                    }}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    placeholder="Enter new password (min. 8 chars)"
                    className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 focus:border-[#0D5BFF] dark:focus:border-[#0D5BFF] rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time Password Strength Meter & Visual Criteria Feedback */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Password Security Level
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${strengthMeta.textColor}`}>
                      {strengthMeta.label}
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-800 flex gap-1">
                    {[20, 40, 60, 80, 100].map((levelThreshold) => (
                      <div
                        key={levelThreshold}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strengthMeta.percentage >= levelThreshold
                            ? strengthMeta.color
                            : 'bg-slate-200/70 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Real-time Criteria Checklist */}
                  <div className="pt-2 grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      criteria.minLength
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {criteria.minLength ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                      <span>8+ characters</span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      criteria.upperAndLower
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {criteria.upperAndLower ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                      <span>Upper & Lower</span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      criteria.hasNumber
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {criteria.hasNumber ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                      <span>At least 1 number</span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      criteria.hasSpecial
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {criteria.hasSpecial ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                      <span>Special symbol (!@#$)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    Confirm New Password <span className="text-[#0D5BFF]">*</span>
                  </label>
                  {confirmPassword && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      newPassword === confirmPassword ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {newPassword === confirmPassword ? (
                        <>
                          <Check className="w-3 h-3" /> Passwords match
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Passwords do not match
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFormError('');
                    }}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    placeholder="Re-enter new password"
                    className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 focus:border-[#0D5BFF] dark:focus:border-[#0D5BFF] rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] py-4 mt-6 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating Password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
