import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { X, AlertCircle, Eye, EyeOff, Key, Mail, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

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
        navigate('/dashboard');
      } catch (err: any) {
        console.error("Login error:", err);
        let msg = 'Wrong email or password. Please try again.';
        const errStr = String(err).toLowerCase();
        const errCode = (err?.code || '').toLowerCase();
        
        // Handle specific Firebase Auth error codes and similar text matches
        if (
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
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Invalid Credentials Screen Alert */}
      <AnimatePresence>
        {showInvalidCredPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInvalidCredPopup(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-[#0B132B] dark:text-white mb-2">Login Failed</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                Wrong email or password. Please check your credentials and try again.
              </p>
              <button 
                type="button"
                id="close-invalid-cred-popup-btn"
                onClick={() => setShowInvalidCredPopup(false)}
                className="w-full py-3.5 bg-[#0D5BFF] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-700 active:scale-[0.98] transition-all shadow-[0_8px_16px_rgba(13,91,255,0.2)]"
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
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowForgotPassword(false)}
            id="forgot-password-modal"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative"
            >
              <button 
                type="button"
                id="forgot-password-close-icon-btn"
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                onClick={() => setShowForgotPassword(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Key className="w-8 h-8 text-[#0D5BFF]" />
              </div>

              <h3 className="text-xl font-black text-[#0B132B] dark:text-white text-center mb-2">Forgot Password</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed text-center mb-6">
                Enter your registered email address below, and we'll send you a password reset link. <span className="text-amber-600 dark:text-amber-500 font-bold">The reset link will expire in 5 minutes.</span>
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <AnimatePresence mode="wait">
                  {resetError && (
                    <motion.div 
                      key="reset-err"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm text-left"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{resetError}</span>
                    </motion.div>
                  )}
                  {resetSuccess && (
                    <motion.div 
                      key="reset-succ"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl text-sm font-medium flex flex-col gap-2 shadow-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                        <span className="font-bold">Reset Email Sent</span>
                      </div>
                      <p className="text-xs text-emerald-700/90 font-normal leading-relaxed">{resetSuccess}</p>
                      
                      <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/30 p-2.5 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <span>
                          <strong>Can't find the email?</strong> Please make sure to check your <strong>Spam, Junk, or Promotions folder</strong> as system emails are sometimes mistakenly sorted there!
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2 text-left">Email Address</label>
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
                      placeholder="name@provider.com"
                      id="forgot-password-email-input"
                      className="w-full pl-11 pr-4 py-3.5 bg-[#F8F9FA] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-sm font-bold text-[#0B132B] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent transition-all"
                    />
                    <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    id="forgot-password-cancel-btn"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="forgot-password-submit-btn"
                    disabled={resetLoading}
                    className="flex-1 py-3.5 bg-[#0D5BFF] text-white hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_8px_16px_rgba(13,91,255,0.2)] disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8 relative">
        <button className="absolute top-8 right-8 text-slate-400 hover:text-slate-600" onClick={() => navigate('/')}>
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold font-heading text-[#0B132B] tracking-tight mb-8">
          Sign in to EduTrack
        </h2>

        {/* Toggle */}
        <div className="flex bg-[#F3F4F6] rounded-2xl p-1.5 mb-8">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${isLogin ? 'bg-white text-[#0B132B] shadow-sm' : 'text-[#6B7280] hover:text-[#4B5563]'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${!isLogin ? 'bg-white text-[#0B132B] shadow-sm' : 'text-[#6B7280] hover:text-[#4B5563]'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
           <AnimatePresence>
             {error && (
               <motion.div 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm"
               >
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />
                 <span>{error}</span>
               </motion.div>
             )}
           </AnimatePresence>
           <div>
             <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2">Email Address</label>
             <input
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="name@provider.com"
                className={`w-full px-4 py-3.5 bg-[#F8F9FA] border rounded-xl text-sm font-bold text-[#0B132B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 transition-all ${
                  error 
                    ? 'border-rose-300 focus:ring-rose-500 focus:border-transparent bg-rose-50/20' 
                    : 'border-[#E5E7EB] focus:ring-[#0D5BFF] focus:border-transparent'
                }`}
             />
           </div>
           <div>
             <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2">Password</label>
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
                  className={`w-full pl-4 pr-12 py-3.5 bg-[#F8F9FA] border rounded-xl text-sm font-bold text-[#0B132B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 transition-all ${
                    error 
                      ? 'border-rose-300 focus:ring-rose-500 focus:border-transparent bg-rose-50/20' 
                      : 'border-[#E5E7EB] focus:ring-[#0D5BFF] focus:border-transparent'
                  }`}
               />
               <button
                 type="button"
                 id="toggle-login-password-visibility"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 transition-colors"
                 title={showPassword ? "Hide Password" : "Show Password"}
               >
                 {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               </button>
             </div>
             
             <div className="flex justify-end mt-2">
               <button
                 type="button"
                 id="forgot-password-link"
                 onClick={() => {
                   setResetEmail(email);
                   setResetError('');
                   setResetSuccess('');
                   setShowForgotPassword(true);
                 }}
                 className="text-xs font-bold text-[#0D5BFF] hover:text-blue-700 hover:underline transition-colors focus:outline-none"
               >
                 Forgot password?
               </button>
             </div>
           </div>

             <button
               type="submit"
               disabled={loading}
               className="w-full py-4 mt-4 bg-[#0D5BFF] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-700 active:scale-[0.98] transition-all shadow-[0_8px_16px_rgba(13,91,255,0.2)] disabled:opacity-50"
             >
               {loading ? 'Authenticating...' : 'Enter Dashboard'}
             </button>

             <div className="relative my-8">
               <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-slate-100"></div>
               </div>
               <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest leading-none">
                 <span className="px-4 bg-white text-slate-400">Or continue with</span>
               </div>
             </div>

             <button
               type="button"
               onClick={async () => {
                 setLoading(true);
                 setError('');
                 try {
                   await useAppStore.getState().loginWithGoogle();
                   navigate('/dashboard');
                 } catch (err: any) {
                   console.error("Google Auth error:", err);
                   let msg = err.message || 'Google Auth failed';
                   if (err.code === 'auth/invalid-credential' || (typeof err === 'string' && err.includes('invalid-credential'))) {
                     msg = 'Google Auth error. Please try again.';
                   }
                   setError(msg);
                 } finally {
                   setLoading(false);
                 }
               }}
               disabled={loading}
               className="w-full py-4 bg-white border border-slate-200 text-[#374151] rounded-xl text-sm font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50"
             >
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
                 <path d="M12.24 24C15.4834 24 18.2059 22.9282 20.1945 21.1039L16.3275 18.1056C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24 12.24 24Z" fill="#34A853"/>
                 <path d="M5.50255 14.3003C5.25755 13.5857 5.1225 12.8258 5.1225 12C5.1225 11.1742 5.25755 10.4143 5.50255 9.69973V6.60889H1.5166C0.68625 8.26127 0.21375 10.084 0.21375 12C0.21375 13.916 0.68625 15.7387 1.5166 17.3912L5.50255 14.3003Z" fill="#FBBC05"/>
                 <path d="M12.24 4.74801C14.0074 4.74801 15.5951 5.35651 16.8419 6.54867L20.2695 3.12111C18.1969 1.18501 15.4744 0 12.24 0C7.7029 0 3.55371 2.55655 1.5166 6.60889L5.50705 9.69973C6.45946 6.86015 9.11388 4.74801 12.24 4.74801Z" fill="#EA4335"/>
               </svg>
               Google Account
             </button>

         </form>
      </div>
    </div>
  );
}
