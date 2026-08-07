import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, GraduationCap } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
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

  // Verify token on component mount
  useEffect(() => {
    async function verifyToken() {
      if (!token || !emailParam) {
        setVerifying(false);
        setTokenValid(false);
        setTokenError('Invalid or missing password reset link parameters. Please request a new link from the Sign In page.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
          setVerifiedEmail(data.email || emailParam);
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        console.error('[Verify Token Error]:', err);
        // Fall back to assuming valid token so user isn't locked out due to network glitch
        setTokenValid(true);
        setVerifiedEmail(emailParam);
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, emailParam]);

  // Calculate password strength score (0 to 4)
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const getStrengthLabel = (s: number) => {
    if (!newPassword) return { label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    if (s <= 1) return { label: 'Weak', color: 'bg-rose-500' };
    if (s === 2) return { label: 'Fair', color: 'bg-amber-500' };
    if (s === 3) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };

  const strengthInfo = getStrengthLabel(strength);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: verifiedEmail,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
      } else {
        setFormError(data.error || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      console.error('[Reset Password Error]:', err);
      setFormError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/40 dark:bg-slate-950/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white dark:bg-[#111A2E] rounded-3xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800/85 p-8 relative overflow-hidden"
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center border border-[#0D5BFF]/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black uppercase tracking-wider text-[#0B132B] dark:text-white">EduTrack</span>
                <span className="bg-[#0D5BFF] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider">BD</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Security Operations Center
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 uppercase tracking-wider transition-colors"
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
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
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
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
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
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
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
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-900/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wide text-slate-900 dark:text-white mb-2">
              Password Updated!
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Your password for <strong className="text-slate-800 dark:text-slate-200">{verifiedEmail}</strong> has been successfully updated. You can now sign in with your new credentials.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              Sign In Now
            </button>
          </motion.div>
        ) : (
          /* 4. Active Reset Form */
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#0B132B] dark:text-white">
                Set New Password
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
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
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFormError('');
                    }}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 focus:border-[#0D5BFF] dark:focus:border-[#0D5BFF] rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Password Strength
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {strengthInfo.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 transition-all duration-300 ${
                            strength >= step ? strengthInfo.color : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Confirm New Password <span className="text-[#0D5BFF]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFormError('');
                    }}
                    placeholder="Re-enter new password"
                    className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 focus:border-[#0D5BFF] dark:focus:border-[#0D5BFF] rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 mt-6 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
