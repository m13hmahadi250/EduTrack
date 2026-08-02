import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore, consumePostLoginDestination } from '../store';
import { X, AlertCircle, Eye, EyeOff, Key, Mail, CheckCircle2, ShieldAlert, GraduationCap, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function Login() {
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

  const login = useAppStore(state => state.login);
  const currentUser = useAppStore(state => state.currentUser);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    if (currentUser) {
      const dest = consumePostLoginDestination(redirectUrl || '/dashboard');
      navigate(dest, { replace: true });
    }
  }, [currentUser, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError('Email address is required.');
        return;
      }

      const isDemo = ['student', 'tutor', 'admin'].includes(trimmedEmail.toLowerCase());
      if (!isDemo && !trimmedEmail.includes('@')) {
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
        // Simple demo logic: if email is 'student', 'tutor', or 'admin', use loginAsDemo
        if (isDemo) {
          await useAppStore.getState().loginAsDemo(trimmedEmail.toLowerCase() as any);
        } else {
          await login(trimmedEmail, password);
        }

        setLoginSuccess(true);
        await new Promise(resolve => setTimeout(resolve, 600));

        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        console.error("Login error:", err);
        let msg = 'Wrong email or password. Please try again.';
        const errStr = String(err).toLowerCase();
        const errCode = (err?.code || '').toLowerCase();
        
        // Handle specific Firebase Auth error codes and similar text matches
        if (
          errCode === 'auth/user-disabled' ||
          errStr.includes('user-disabled') ||
          errStr.includes('user_disabled')
        ) {
          msg = 'YOUR ACCOUNT IS TEMPORARILY RESTRICTED DUE TO SOME REASON';
        } else if (
          errCode === 'auth/wrong-password' || 
          errStr.includes('wrong-password') || 
          errStr.includes('incorrect-password') ||
          errCode === 'auth/user-not-found' || 
          errStr.includes('user-not-found') ||
          errCode === 'auth/invalid-credential' || 
          errStr.includes('invalid-credential') || 
          errStr.includes('invalid_credential')
        ) {
          msg = 'Wrong email or password. Please check your credentials and try again.';
          setShowInvalidCredPopup(true);
        } else if (errCode === 'auth/invalid-email' || errStr.includes('invalid-email')) {
          msg = 'The email address is badly formatted.';
        } else if (errCode === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
          msg = 'Too many failed login attempts. Please try again later.';
        } else if (err.message) {
          msg = err.message;
        }

        setError(msg);
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

    const isDemo = ['student', 'tutor', 'admin'].includes(trimmedEmail.toLowerCase());
    if (!isDemo && !trimmedEmail.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      if (isDemo) {
        // Simulated flow for demo users
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResetSuccess(`Password reset instructions simulated for the demo user "${trimmedEmail}". Since this is a demo account, no email was sent, but the flow succeeded! You can log in directly using your standard credentials.`);
      } else {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setResetSuccess('Password reset link has been successfully sent to your email. Please check your inbox for instructions. Note that this link will expire in 5 minutes.');
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      let msg = 'Failed to send password reset email. Please try again later.';
      const errCode = (err?.code || '').toLowerCase();
      const errStr = String(err).toLowerCase();

      if (errCode === 'auth/user-not-found' || errStr.includes('user-not-found')) {
        msg = 'No account found with this email address.';
      } else if (errCode === 'auth/invalid-email' || errStr.includes('invalid-email')) {
        msg = 'The email address is badly formatted.';
      } else if (err.message) {
        msg = err.message;
      }
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/40 dark:bg-slate-950/20"
    >
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
              className="bg-white dark:bg-[#111A2E] rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800/80"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white italic mb-2 flex items-center justify-center gap-1.5">
                Authentication Failed
              </h3>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide mb-6">
                Wrong email or password. Please check your credentials and try again.
              </p>
              <button 
                type="button"
                id="close-invalid-cred-popup-btn"
                onClick={() => setShowInvalidCredPopup(false)}
                className="w-full py-3.5 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg active:scale-[0.99] cursor-pointer"
              >
                Okay, Try Again
              </button>
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
              className="bg-white dark:bg-[#111A2E] rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800/80 relative"
            >
              <button 
                type="button"
                id="forgot-password-close-icon-btn"
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10 p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                onClick={() => setShowForgotPassword(false)}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Key className="w-6 h-6 text-[#0D5BFF]" />
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-[#0B132B] dark:text-white text-center mb-2 italic">
                Forgot Password
              </h3>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center leading-relaxed mb-6">
                Enter your email. <span className="text-amber-500">Links expire in 5 min.</span>
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                <AnimatePresence mode="wait">
                  {resetError && (
                    <motion.div 
                      key="reset-err"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-3 shadow-sm text-left"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
                      <span>{resetError}</span>
                    </motion.div>
                  )}
                  {resetSuccess && (
                    <motion.div 
                      key="reset-succ"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col gap-2 shadow-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                        <span className="font-extrabold text-emerald-800 dark:text-emerald-200">Reset Email Sent</span>
                      </div>
                      <p className="text-[10px] font-bold text-emerald-700/90 dark:text-emerald-400 leading-normal lowercase tracking-normal">{resetSuccess}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 text-left">Email Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={resetEmail}
                      onChange={e => {
                        setResetEmail(e.target.value);
                        setResetError('');
                        setResetSuccess('');
                      }}
                      placeholder="e.g. mahadi@gmail.com"
                      id="forgot-password-email-input"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs font-bold text-[#0B132B] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all outline-none"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    id="forgot-password-cancel-btn"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="forgot-password-submit-btn"
                    disabled={resetLoading}
                    className="flex-1 py-3.5 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors shadow-lg disabled:opacity-50"
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
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[440px] bg-white dark:bg-[#111A2E] rounded-3xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800/85 p-8 relative overflow-hidden"
      >
        {loading ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[360px]"
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
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    className="absolute w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
                    style={{ borderColor: `#0D5BFF transparent transparent transparent` }}
                  />
                  <GraduationCap className={`w-6 h-6 text-slate-400 dark:text-slate-500 animate-pulse`} />
                </div>
              </div>
            )}

            <h3 className="text-lg font-black font-heading text-slate-800 dark:text-white uppercase tracking-wide">
              {loginSuccess ? "Welcome Back!" : "Securing Session"}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mt-1">
              {loginSuccess ? "Entering dashboard workspace" : "Please hold on..."}
            </p>
          </motion.div>
        ) : (
          <>
            <button 
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer" 
              onClick={() => navigate('/')}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <h2 className="text-2xl font-black font-heading text-[#0B132B] dark:text-white tracking-tight uppercase">
                Sign In
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                EduTrack Bangladesh • Enter your credentials
              </p>
            </div>

            {/* Toggle / Tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-900 rounded-2xl p-1.5 mb-8 border-2 border-slate-200/60 dark:border-slate-800/60 relative">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`relative flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer ${isLogin ? 'text-[#0B132B] dark:text-white' : 'text-slate-500 hover:text-[#0B132B] dark:hover:text-white'}`}
              >
                {isLogin && (
                  <motion.div
                    layoutId="active-auth-tab-bg"
                    className="absolute inset-0 bg-white dark:bg-[#1A233A] rounded-xl shadow-md border border-slate-100 dark:border-slate-800/50"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="relative flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer text-slate-500 hover:text-[#0B132B] dark:hover:text-white"
              >
                <span>Register</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Email Address <span className="text-[#0D5BFF]">*</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. mahadi@gmail.com"
                    className={`w-full px-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all duration-200 outline-none rounded-xl ${
                      error 
                        ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Password <span className="text-[#0D5BFF]">*</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-4 pr-12 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all duration-200 outline-none rounded-xl ${
                      error 
                        ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80'
                    }`}
                  />
                  <button
                    type="button"
                    id="toggle-login-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    id="forgot-password-link"
                    onClick={() => {
                      setResetEmail(email);
                      setResetError('');
                      setResetSuccess('');
                      setShowForgotPassword(true);
                    }}
                    className="text-[10px] font-black uppercase text-[#0D5BFF] hover:text-blue-700 tracking-wider cursor-pointer"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-6 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-[#0d5bff]/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  'Enter Dashboard'
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    const targetDest = redirectUrl || '/dashboard';
                    await useAppStore.getState().loginWithGoogle(undefined, undefined, targetDest);
                    
                    setLoginSuccess(true);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    
                    const finalDest = consumePostLoginDestination(targetDest);
                    navigate(finalDest);
                  } catch (err: any) {
                    console.error("Google Auth error:", err);
                    let msg = err.message || 'Google Auth failed';
                    const errStr = String(err).toLowerCase();
                    const errCode = (err?.code || '').toLowerCase();
                    if (
                      errCode === 'auth/popup-closed-by-user' ||
                      errStr.includes('popup-closed-by-user') ||
                      errStr.includes('popup closed by user')
                    ) {
                      msg = 'GOOGLE DIRECT LOGIN CLOSED BY USER';
                    } else if (
                      errCode === 'auth/user-disabled' ||
                      errStr.includes('user-disabled') ||
                      errStr.includes('user_disabled')
                    ) {
                      msg = 'YOUR ACCOUNT IS TEMPORARILY RESTRICTED DUE TO SOME REASON';
                    } else if (err.code === 'auth/invalid-credential' || (typeof err === 'string' && err.includes('invalid-credential'))) {
                      msg = 'Google Auth error. Please try again.';
                    }
                    setError(msg);
                    setLoginSuccess(false);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full mt-4 py-3.5 bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-100/10 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
                  <path d="M12.24 24C15.4834 24 18.2059 22.9282 20.1945 21.1039L16.3275 18.1056C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24 12.24 24Z" fill="#34A853"/>
                  <path d="M5.50255 14.3003C5.25755 13.5857 5.1225 12.8258 5.1225 12C5.1225 11.1742 5.25755 10.4143 5.50255 9.69973V6.60889H1.5166C0.68625 8.26127 0.21375 10.084 0.21375 12C0.21375 13.916 0.68625 15.7387 1.5166 17.3912L5.50255 14.3003Z" fill="#FBBC05"/>
                  <path d="M12.24 4.74801C14.0074 4.74801 15.5951 5.35651 16.8419 6.54867L20.2695 3.12111C18.1969 1.18501 15.4744 0 12.24 0C7.7029 0 3.55371 2.55655 1.5166 6.60889L5.50705 9.69973C6.45946 6.86015 9.11388 4.74801 12.24 4.74801Z" fill="#EA4335"/>
                </svg>
                LOGIN WITH GOOGLE
              </button>
            </form>

            <p className="mt-8 text-center text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
              New to EduTrack? <button onClick={() => navigate('/signup')} className="font-bold underline text-[#0D5BFF] hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase cursor-pointer ml-1">Create an account</button>
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
