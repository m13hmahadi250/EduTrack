import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAppStore, consumePostLoginDestination } from '../store';
import {
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  Mail,
  CheckCircle2,
  ShieldAlert,
  GraduationCap,
  Clock,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEOHead from '../components/SEOHead';
import {
  formatUserFriendlyError,
  isNetworkConnectivityError,
  isInvalidCredentialError,
} from '../lib/errorMonitoring';
import { useBackHandler, scrollFieldIntoView } from '../utils/mobileWebView';

export default function Login() {
  const location = useLocation();
  const [pageSuccessMessage, setPageSuccessMessage] = useState<string>(
    location.state?.successMessage || ''
  );

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInvalidCredPopup, setShowInvalidCredPopup] = useState(false);

  // Forgot Password modal states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);

  useBackHandler(showInvalidCredPopup, () => setShowInvalidCredPopup(false), 'login-invalid-popup');
  useBackHandler(showForgotPassword, () => setShowForgotPassword(false), 'login-forgot-modal');

  // Auto-close forgot password popup in 3s when reset email is sent
  useEffect(() => {
    let timer: any;
    if (resetCountdown !== null && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (resetCountdown === 0) {
      setShowForgotPassword(false);
      setResetCountdown(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resetCountdown]);

  const login = useAppStore((state) => state.login);
  const currentUser = useAppStore((state) => state.currentUser);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setPageSuccessMessage(
        'Your password has been updated successfully. Please sign in with your new password.'
      );
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('reset');
      const nextSearch = nextParams.toString();
      window.history.replaceState(
        {},
        '',
        `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
      );
    }
  }, [searchParams, location.pathname]);

  useEffect(() => {
    if (currentUser) {
      const dest = consumePostLoginDestination(redirectUrl || '/dashboard');
      navigate(dest, { replace: true });
    }
  }, [currentUser, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      setPageSuccessMessage('');
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError('Email address is required.');
        return;
      }

      if (!trimmedEmail.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }

      if (!password) {
        setError('Password is required.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        await login(trimmedEmail, password);

        setLoginSuccess(true);
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        console.error('Login error:', err);
        const errStr = String(err).toLowerCase();
        const errCode = (err?.code || '').toLowerCase();

        // 1. Network connectivity errors: Never open the password reset / create account popup
        if (isNetworkConnectivityError(err)) {
          setShowInvalidCredPopup(false);
          setError('Connection problem. Please check your internet connection and try again.');
        } else if (
          errCode === 'auth/user-disabled' ||
          errStr.includes('user-disabled') ||
          errStr.includes('user_disabled')
        ) {
          setShowInvalidCredPopup(false);
          setError(
            'This account has been deactivated. Please contact support for assistance.'
          );
        } else if (errCode === 'auth/invalid-email' || errStr.includes('invalid-email')) {
          setShowInvalidCredPopup(false);
          setError('Please enter a valid email address.');
        } else if (errCode === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
          setShowInvalidCredPopup(false);
          setError(
            'Too many attempts. Please wait a few minutes before trying again.'
          );
        } else if (
          isInvalidCredentialError(err) ||
          errStr.includes('account not found') ||
          errStr.includes('unregistered') ||
          errStr.includes('create an account first')
        ) {
          setError('Unable to sign in. Please check your email and password.');
          setShowInvalidCredPopup(true);
        } else {
          setShowInvalidCredPopup(false);
          setError(formatUserFriendlyError(err, 'login'));
        }

        setPageSuccessMessage('');
        setLoginSuccess(false);
      } finally {
        setLoading(false);
      }
    } else {
      navigate('/signup');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      setResetError('Email address is required.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResetSuccess(
          data.message ||
            'If an account is registered with this email address, a one-time password reset link has been sent. Please check your inbox or spam folder.'
        );
        setResetCountdown(3);
      } else {
        setResetError(
          formatUserFriendlyError(
            data.error || 'Unable to send password reset email right now. Please try again later.',
            'reset'
          )
        );
      }
    } catch (err: any) {
      setResetError(formatUserFriendlyError(err, 'reset'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#0B132B]"
    >
      <SEOHead
        title="Sign In to EduTrack | Bangladesh's #1 Tuition & Tutor Platform"
        description="Log in to your EduTrack Bangladesh account. Access student session records, tuition schedules, GPS transit tracking, and secure bKash billing."
        keywords="login edutrack, tutor login bangladesh, student login tuition, edutrack account"
        canonicalUrl="https://edutrackbd.vercel.app/login"
      />
      {/* Invalid Credentials Screen Alert */}
      <AnimatePresence>
        {showInvalidCredPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowInvalidCredPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111A2E] rounded-3xl p-5 sm:p-8 max-w-sm w-full max-h-[90dvh] overflow-y-auto shadow-2xl text-center border border-slate-200 dark:border-slate-700"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
                Unable to Sign In
              </h3>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                {error ||
                  'Unable to sign in. Please check your email and password.'}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  id="modal-forgot-password-btn"
                  onClick={() => {
                    setShowInvalidCredPopup(false);
                    setResetEmail(email.trim());
                    setResetError('');
                    setResetSuccess('');
                    setShowForgotPassword(true);
                  }}
                  className="w-full min-h-[44px] py-3.5 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  Reset Forgotten Password
                </button>
                <button
                  type="button"
                  id="modal-create-account-btn"
                  onClick={() => {
                    setShowInvalidCredPopup(false);
                    navigate('/signup');
                  }}
                  className="w-full min-h-[44px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Create New Account
                </button>
                <button
                  type="button"
                  id="close-invalid-cred-popup-btn"
                  onClick={() => setShowInvalidCredPopup(false)}
                  className="w-full min-h-[44px] py-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowForgotPassword(false)}
            id="forgot-password-modal"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111A2E] rounded-3xl p-5 sm:p-8 max-w-sm w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700 relative"
            >
              <button
                type="button"
                id="forgot-password-close-icon-btn"
                className="absolute top-4 right-4 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white z-10 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                onClick={() => setShowForgotPassword(false)}
                aria-label="Close password reset dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto mb-5">
                <Key className="w-6 h-6 text-[#0D5BFF]" />
              </div>

              <h3 className="text-base font-black text-[#0F172A] dark:text-white text-center mb-1.5">
                Reset Your Password
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-6">
                Enter your registered email address.{' '}
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  Reset links expire in 15 minutes.
                </span>
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                <AnimatePresence mode="wait">
                  {resetError && (
                    <motion.div
                      key="reset-err"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-left"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <span>{resetError}</span>
                    </motion.div>
                  )}
                  {resetSuccess && (
                    <motion.div
                      key="reset-succ"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-semibold flex flex-col gap-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold">Reset Link Sent</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Closing in {resetCountdown ?? 3}s</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-normal">
                        {resetSuccess}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-left">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setResetError('');
                        setResetSuccess('');
                      }}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      placeholder="e.g. name@example.com"
                      id="forgot-password-email-input"
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF] transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    id="forgot-password-cancel-btn"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 min-h-[44px] py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="forgot-password-submit-btn"
                    disabled={resetLoading}
                    className="flex-1 min-h-[44px] py-3 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-md disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white dark:bg-[#111A2E] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-9 relative overflow-hidden"
      >
        {loading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[340px]"
          >
            {loginSuccess ? (
              <motion.div
                initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
            ) : (
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className="absolute w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
                    style={{ borderColor: `#0D5BFF transparent transparent transparent` }}
                  />
                  <GraduationCap className="w-6 h-6 text-slate-500 dark:text-slate-400 animate-pulse" />
                </div>
              </div>
            )}

            <h3 className="text-lg font-black font-heading text-slate-900 dark:text-white uppercase tracking-wide">
              {loginSuccess ? 'Welcome Back!' : 'Signing You In'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold tracking-wider mt-1">
              {loginSuccess ? 'Opening your dashboard workspace...' : 'Verifying credentials...'}
            </p>
          </motion.div>
        ) : (
          <>
            <button
              className="absolute top-4 right-4 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              onClick={() => navigate('/')}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-[#0D5BFF] dark:text-blue-400 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>EduTrack Bangladesh</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F172A] dark:text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                Sign in to access your Student, Tutor, or Admin dashboard.
              </p>
            </div>

            {/* Toggle / Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1.5 mb-6 border border-slate-200 dark:border-slate-700/80 relative">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`relative flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer ${
                  isLogin
                    ? 'text-[#0F172A] dark:text-white'
                    : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {isLogin && (
                  <motion.div
                    layoutId="active-auth-tab-bg"
                    className="absolute inset-0 bg-white dark:bg-[#1A243D] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="relative flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white"
              >
                <span>Create Account</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <AnimatePresence>
                {pageSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{pageSuccessMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPageSuccessMessage('')}
                      className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-300 p-1 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                  placeholder="e.g. name@example.com"
                  className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF] focus:ring-2 focus:ring-blue-500/15 transition-all duration-200 rounded-xl ${
                    error
                      ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Password <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    id="forgot-password-link"
                    onClick={() => {
                      setResetEmail(email);
                      setResetError('');
                      setResetSuccess('');
                      setShowForgotPassword(true);
                    }}
                    className="min-h-[44px] inline-flex items-center text-xs font-bold text-[#0D5BFF] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer px-1"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    placeholder="Enter your password"
                    className={`w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF] focus:ring-2 focus:ring-blue-500/15 transition-all duration-200 rounded-xl ${
                      error
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    id="toggle-login-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white focus:outline-none flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                    aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] py-3.5 mt-2 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#0d5bff]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              </motion.button>

              <button
                type="button"
                onClick={async () => {
                  setPageSuccessMessage('');
                  setLoading(true);
                  setError('');
                  try {
                    const targetDest = redirectUrl || '/dashboard';
                    await useAppStore
                      .getState()
                      .loginWithGoogle(undefined, undefined, targetDest);

                    setLoginSuccess(true);
                    await new Promise((resolve) => setTimeout(resolve, 600));

                    const finalDest = consumePostLoginDestination(targetDest);
                    navigate(finalDest);
                  } catch (err: any) {
                    console.error('Google Sign-In error:', err);
                    const errStr = String(err).toLowerCase();
                    const errCode = (err?.code || '').toLowerCase();
                    if (isNetworkConnectivityError(err)) {
                      setShowInvalidCredPopup(false);
                      setError('Connection problem. Please check your internet connection and try again.');
                    } else if (
                      errCode === 'auth/popup-closed-by-user' ||
                      errStr.includes('popup-closed-by-user') ||
                      errStr.includes('popup closed by user')
                    ) {
                      setShowInvalidCredPopup(false);
                      setError('Sign-in window was closed before completing. Please try again.');
                    } else if (
                      errCode === 'auth/user-disabled' ||
                      errStr.includes('user-disabled') ||
                      errStr.includes('user_disabled')
                    ) {
                      setShowInvalidCredPopup(false);
                      setError('This account has been deactivated. Please contact support for assistance.');
                    } else if (
                      errStr.includes('no registered account') ||
                      errStr.includes('account not found') ||
                      errStr.includes('unregistered') ||
                      errStr.includes('create an account first')
                    ) {
                      setError(
                        'No registered account found for this email. Please create an account first.'
                      );
                      setShowInvalidCredPopup(true);
                    } else if (isInvalidCredentialError(err)) {
                      setError('Unable to sign in. Please check your email and password.');
                      setShowInvalidCredPopup(true);
                    } else {
                      setShowInvalidCredPopup(false);
                      setError(formatUserFriendlyError(err, 'login'));
                    }
                    setPageSuccessMessage('');
                    setLoginSuccess(false);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full min-h-[48px] py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12.24 24C15.4834 24 18.2059 22.9282 20.1945 21.1039L16.3275 18.1056C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24 12.24 24Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.50255 14.3003C5.25755 13.5857 5.1225 12.8258 5.1225 12C5.1225 11.1742 5.25755 10.4143 5.50255 9.69973V6.60889H1.5166C0.68625 8.26127 0.21375 10.084 0.21375 12C0.21375 13.916 0.68625 15.7387 1.5166 17.3912L5.50255 14.3003Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.24 4.74801C14.0074 4.74801 15.5951 5.35651 16.8419 6.54867L20.2695 3.12111C18.1969 1.18501 15.4744 0 12.24 0C7.7029 0 3.55371 2.55655 1.5166 6.60889L5.50705 9.69973C6.45946 6.86015 9.11388 4.74801 12.24 4.74801Z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign In with Google</span>
              </button>
            </form>

            {/* Quick Role-Based Registration Shortcuts */}
            <div className="mt-7 pt-5 border-t border-slate-200 dark:border-slate-800">
              <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                New to EduTrack Bangladesh? Create your account:
              </p>
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/signup?role=student')}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0D5BFF] dark:hover:border-blue-400 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[#0D5BFF]" />
                  <span>Join as Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup?role=tutor')}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Join as Tutor</span>
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
