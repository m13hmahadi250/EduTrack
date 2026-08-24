import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore, consumePostLoginDestination } from '../store';
import { X, AlertCircle, Eye, EyeOff, GraduationCap, BookOpen, MapPin, UserCheck, ShieldAlert, ChevronDown, Award, CheckCircle2, ShieldCheck, Mail, RefreshCw, ArrowLeft, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BANGLADESH_DISTRICTS, BANGLADESH_THANAS, BANGLADESH_DIV_TO_DIST, BANGLADESH_DIVISIONS } from '../data/bangladeshData';
import OtpVerificationModal from '../components/OtpVerificationModal';
import SEOHead from '../components/SEOHead';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [searchParams] = useSearchParams();
  const [referralCodeInput, setReferralCodeInput] = useState(searchParams.get('ref') || '');
  
  // OTP Verification Flow State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | number>('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [resendSuccessMsg, setResendSuccessMsg] = useState('');
  const [ipNoticeMsg, setIpNoticeMsg] = useState('');

  useEffect(() => {
    let interval: any = null;
    if (showOtpModal && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpModal, resendTimer]);

  const signup = useAppStore(state => state.signup);
  const currentUser = useAppStore(state => state.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      const dest = consumePostLoginDestination('/dashboard');
      navigate(dest, { replace: true });
    }
  }, [currentUser, navigate]);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    // Common fields
    const commonFields = ['name', 'email', 'phone', 'password', 'address', 'division', 'district', 'thana', 'area', 'gender'];
    commonFields.forEach(field => {
      if (!formData[field] || !formData[field].trim()) {
        errs[field] = 'This field is required';
      }
    });

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (formData.password && formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (formData.phone) {
      const cleanPhone = formData.phone.trim().replace(/[\s-+]/g, '');
      if (cleanPhone.length < 11 || !/^\d+$/.test(cleanPhone)) {
        errs.phone = 'Requires a valid mobile number (e.g. 01XXXXXXXXX)';
      }
    }

    // Role-specific fields
    if (role === 'student') {
      const studentFields = ['studentClass', 'group', 'school', 'subject'];
      studentFields.forEach(field => {
        if (!formData[field] || !formData[field].trim()) {
          errs[field] = 'This field is required';
        }
      });
    } else {
      const tutorFields = ['university', 'course', 'year', 'semester', 'whatsappNumber'];
      tutorFields.forEach(field => {
        if (!formData[field] || !formData[field].trim()) {
          errs[field] = 'This field is required';
        }
      });
      if (formData.whatsappNumber) {
        const cleanWhatsapp = formData.whatsappNumber.trim().replace(/[\s-+]/g, '');
        if (cleanWhatsapp.length < 11 || !/^\d+$/.test(cleanWhatsapp)) {
          errs.whatsappNumber = 'Requires a valid mobile number (e.g. 01XXXXXXXXX)';
        }
      }
    }

    return errs;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
      const next = { ...prev, [name]: value };
      if (name === 'division') {
        next.district = '';
        next.thana = '';
      } else if (name === 'district') {
        next.thana = '';
      }
      return next;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    let errorMsg = '';
    if (!value || !value.trim()) {
      errorMsg = 'This field is required';
    } else if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errorMsg = 'Please enter a valid email address';
    } else if (name === 'password' && value.length < 8) {
      errorMsg = 'Password must be at least 8 characters';
    } else if (name === 'phone' || (name === 'whatsappNumber' && role === 'tutor')) {
      const cleanPhone = value.trim().replace(/[\s-+]/g, '');
      if (cleanPhone.length < 11 || !/^\d+$/.test(cleanPhone)) {
        errorMsg = 'Requires a valid 11-digit mobile number';
      }
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIpNoticeMsg('');
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const allTouched: Record<string, boolean> = {};
      const fieldsToCheck = [
        'name', 'email', 'phone', 'password', 'address', 'division', 'district', 'thana', 'area', 'gender',
        ...(role === 'student' ? ['studentClass', 'group', 'school', 'subject'] : ['university', 'course', 'year', 'semester', 'whatsappNumber'])
      ];
      fieldsToCheck.forEach(f => {
        allTouched[f] = true;
      });
      setTouched(allTouched);
      setError('Please properly fill out all required fields with valid information.');
      
      // Scroll to top to see error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Send 6-Digit OTP verification email before creating Firebase user account
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
        }),
      });

      const data = await res.json();

      if (!res.ok || (!data.success && !data.isIpError && !data.isNotice)) {
        throw new Error(data.error || 'Failed to send OTP verification code to your email.');
      }

      if (data.emailSent === false || data.isNotice || data.isIpError) {
        setIpNoticeMsg(data.message || 'Email delivery notice: verification code provided below.');
      } else {
        setIpNoticeMsg('');
      }

      // Step 2: Open OTP Verification Modal
      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
      } else {
        setDevOtpCode('');
      }

      setOtpError('');
      setResendSuccessMsg(data.emailSent ? `Verification code dispatched to ${formData.email}. Please check your inbox or spam folder.` : '');
      setResendTimer(60);
      setShowOtpModal(true);
      setLoading(false);

    } catch (err: any) {
      console.error("OTP trigger error:", err);
      let msg = err.message || 'Failed to send verification email. Please check your address.';
      if (msg.includes('auth/email-already-in-use')) {
        msg = 'This email is already registered. Please sign in instead.';
      }
      setError(msg);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || otpLoading) return;

    setOtpLoading(true);
    setOtpError('');
    setResendSuccessMsg('');
    setIpNoticeMsg('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
        }),
      });

      const data = await res.json();

      if (!res.ok || (!data.success && !data.isIpError && !data.isNotice)) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
      }

      if (data.emailSent === false || data.isNotice || data.isIpError) {
        setIpNoticeMsg(data.message || data.error || 'Email delivery notice: verification code provided below.');
        setResendSuccessMsg('');
      } else {
        setIpNoticeMsg('');
        setResendSuccessMsg(`A new 4-digit verification code has been sent to ${formData.email}. Please check your inbox or spam folder.`);
      }

      setResendTimer(60);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndCompleteSignup = async (code: string) => {
    if (code.length !== 4) {
      setOtpError('Please enter all 4 digits of the OTP code received in your inbox.');
      throw new Error('Please enter all 4 digits of the OTP code received in your inbox.');
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      // Step 1: Verify OTP with Express Backend
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: code,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Invalid or expired OTP code.');
      }

      // Step 2: OTP Verified! Trigger Firebase createUserWithEmailAndPassword & setDoc
      const password = formData.password;
      const data = { ...formData };
      delete data.password;

      await signup({ ...data, role }, password, referralCodeInput);
      setSignupSuccess(true);
      // Note: Navigation will happen when user completes the Approved animation screen
    } catch (err: any) {
      console.error("OTP verification / Firebase signup error:", err);
      let msg = err.message || 'Verification or signup failed. Please try again.';
      
      const errStr = String(err);
      if (msg.includes('auth/email-already-in-use') || errStr.includes('auth/email-already-in-use')) {
        msg = 'This email is already registered in Firebase. Please sign in instead.';
      } else if (msg.includes('auth/weak-password') || errStr.includes('auth/weak-password')) {
        msg = 'Password is too short. Please go back and pick at least 8 characters.';
      }

      setOtpError(msg);
      throw new Error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCompleteRedirect = () => {
    setShowOtpModal(false);
    const targetDest = consumePostLoginDestination('/dashboard');
    navigate(targetDest, { replace: true });
  };

  const accentColor = role === 'student' ? '#0D5BFF' : '#F59E0B';

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/40 dark:bg-slate-950/20">
      <SEOHead
        title="Register as a Student or Tutor | EduTrack Bangladesh"
        description="Join EduTrack Bangladesh today. Create an account to hire verified home tutors from BUET, DU, Medical, or apply to become a certified tutor with verified NID credentials."
        keywords="tutor registration bangladesh, find tutor signup, join edutrack, tuition media registration bd, private tutor register"
        canonicalUrl="https://edutrackbd.vercel.app/signup"
      />
      <div className="w-full max-w-2xl bg-white dark:bg-[#111A2E] rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700/80 p-6 sm:p-10 relative overflow-hidden">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[360px]"
          >
            {signupSuccess ? (
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
                    style={{ borderColor: `${accentColor} transparent transparent transparent` }}
                  />
                  <GraduationCap className={`w-6 h-6 text-slate-400 dark:text-slate-500 animate-pulse`} />
                </div>
              </div>
            )}

            <h3 className="text-lg font-black font-heading text-slate-800 dark:text-white uppercase tracking-wide">
              {signupSuccess ? "Account Provisioned!" : "Creating Account"}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mt-1">
              {signupSuccess ? "Setting up workspace..." : "Please wait..."}
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
                Create an Account
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                EduTrack Bangladesh • Join our secure community
              </p>
            </div>

        {/* Toggle */}
        <motion.div 
          animate={{
            borderColor: role === 'student' ? 'rgba(13, 91, 255, 0.5)' : 'rgba(245, 158, 11, 0.5)',
            boxShadow: role === 'student' 
              ? '0 10px 25px -5px rgba(13, 91, 255, 0.15)' 
              : '0 10px 25px -5px rgba(245, 158, 11, 0.15)',
          }}
          transition={{ duration: 0.3 }}
          className="flex bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-1.5 mb-8 relative border-2 border-slate-300 dark:border-slate-700 shadow-xs"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            className={`relative flex-1 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer ${role === 'student' ? 'text-[#0B132B] dark:text-white font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white'}`}
            onClick={() => setRole('student')}
          >
            {role === 'student' && (
              <motion.div
                layoutId="active-role-bg"
                className="absolute inset-0 bg-white dark:bg-[#1A233A] rounded-xl shadow-md border-2 border-blue-500/30 dark:border-blue-500/40"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{ zIndex: -1 }}
              />
            )}
            <GraduationCap className={`w-4 h-4 transition-transform duration-300 ${role === 'student' ? 'text-[#0D5BFF] scale-110' : 'text-slate-400'}`} />
            <span>Student & Guardian</span>
          </motion.button>
          <button
            type="button"
            className={`relative flex-1 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer ${role === 'tutor' ? 'text-[#0B132B] dark:text-white font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white'}`}
            onClick={() => setRole('tutor')}
          >
            {role === 'tutor' && (
              <motion.div
                layoutId="active-role-bg"
                className="absolute inset-0 bg-white dark:bg-[#1A233A] rounded-xl shadow-md border-2 border-amber-500/30 dark:border-amber-500/40"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{ zIndex: -1 }}
              />
            )}
            <BookOpen className={`w-4 h-4 transition-transform duration-300 ${role === 'tutor' ? 'text-amber-500 scale-110' : 'text-slate-400'}`} />
            <span>Tutor / Teacher</span>
          </button>
        </motion.div>

        <form className="space-y-6" onSubmit={handleSignup} noValidate>
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-xs"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Group 1: Account details */}
          <div className="border-2 border-slate-200/90 dark:border-slate-700/90 bg-slate-50/80 dark:bg-slate-900/50 p-6 rounded-2xl space-y-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-xs font-bold not-italic shadow-xs">1</span>
              Account Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input 
                  label="Full Name / Guardian Name" 
                  name="name" 
                  required 
                  onChange={handleInputChange} 
                  onBlur={handleBlur}
                  error={touched.name ? errors.name : undefined}
                  value={formData.name || ''}
                  accentColor={accentColor}
                  placeholder="e.g. Lionel Ronaldo"
                />
              </div>
              <Input 
                label="Email Address" 
                type="email" 
                name="email" 
                required 
                onChange={handleInputChange} 
                onBlur={handleBlur}
                error={touched.email ? errors.email : undefined}
                value={formData.email || ''}
                accentColor={accentColor}
                placeholder="e.g. mahadi@gmail.com"
              />
              <Input 
                label="Phone Number" 
                type="tel" 
                name="phone" 
                required 
                onChange={handleInputChange} 
                onBlur={handleBlur}
                error={touched.phone ? errors.phone : undefined}
                helperText="Must be an 11-digit mobile number starting with 01"
                value={formData.phone || ''}
                accentColor={accentColor}
                placeholder="e.g. 01712345678"
              />
              {role === 'tutor' && (
                <Input 
                  label="WhatsApp Number" 
                  type="tel" 
                  name="whatsappNumber" 
                  required 
                  onChange={handleInputChange} 
                  onBlur={handleBlur}
                  error={touched.whatsappNumber ? errors.whatsappNumber : undefined}
                  helperText="Required for students to contact you once tuition is confirmed"
                  value={formData.whatsappNumber || ''}
                  accentColor={accentColor}
                  placeholder="e.g. 01712345678"
                />
              )}
              <div className="sm:col-span-2 space-y-1.5 w-full">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wide mb-1">
                    Gender <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.gender && errors.gender && (
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500 animate-slide-in">
                      {errors.gender}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    name="gender"
                    required
                    value={formData.gender || ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white dark:bg-slate-900 border-2 text-xs font-bold text-slate-900 dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none transition-all duration-200 outline-none appearance-none cursor-pointer shadow-xs ${
                      touched.gender && errors.gender
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/20' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15'
                    }`}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">Select Gender</option>
                    <option value="Male" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Male</option>
                    <option value="Female" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Female</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Input 
                  label="Password" 
                  type="password" 
                  name="password" 
                  required 
                  onChange={handleInputChange} 
                  onBlur={handleBlur}
                  error={touched.password ? errors.password : undefined}
                  placeholder="At least 8 characters long" 
                  value={formData.password || ''}
                  accentColor={accentColor}
                />
              </div>
            </div>
          </div>

          {/* Group 2: Location credentials */}
          <div className="border-2 border-slate-200/90 dark:border-slate-700/90 bg-slate-50/80 dark:bg-slate-900/50 p-6 rounded-2xl space-y-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-xs font-bold not-italic shadow-xs">2</span>
              Location Details
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input 
                  label="Address" 
                  name="address" 
                  required 
                  onChange={handleInputChange} 
                  onBlur={handleBlur}
                  error={touched.address ? errors.address : undefined}
                  placeholder="Road No, House No, Sector/Block" 
                  value={formData.address || ''}
                  accentColor={accentColor}
                />
              </div>
              <div className="space-y-1.5 w-full sm:col-span-2">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wide mb-1">
                    Division <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.division && errors.division && (
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500 animate-slide-in">
                      {errors.division}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    name="division"
                    required
                    value={formData.division || ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white dark:bg-slate-900 border-2 text-xs font-bold text-slate-900 dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none transition-all duration-200 outline-none appearance-none cursor-pointer shadow-xs ${
                      touched.division && errors.division
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/20' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15'
                    }`}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">Select Division</option>
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div} value={div} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{div}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wide mb-1">
                    District <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.district && errors.district && (
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500 animate-slide-in">
                      {errors.district}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    name="district"
                    required
                    disabled={!formData.division}
                    value={formData.district || ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white dark:bg-slate-900 border-2 text-xs font-bold text-slate-900 dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none transition-all duration-200 outline-none appearance-none cursor-pointer shadow-xs ${
                      !formData.division ? 'opacity-50 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 cursor-not-allowed' : ''
                    } ${
                      touched.district && errors.district
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/20' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15'
                    }`}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
                      {formData.division ? 'Select District' : 'Select Division First'}
                    </option>
                    {formData.division && (BANGLADESH_DIV_TO_DIST[formData.division] || []).map((dist) => (
                      <option key={dist} value={dist} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{dist}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wide mb-1">
                    Thana <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.thana && errors.thana && (
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500 animate-slide-in">
                      {errors.thana}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    name="thana"
                    required
                    disabled={!formData.district}
                    value={formData.thana || ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white dark:bg-slate-900 border-2 text-xs font-bold text-slate-900 dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none transition-all duration-200 outline-none appearance-none cursor-pointer shadow-xs ${
                      !formData.district ? 'opacity-50 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 cursor-not-allowed' : ''
                    } ${
                      touched.thana && errors.thana
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/20' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15'
                    }`}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
                      {formData.district ? 'Select Thana' : 'Select District First'}
                    </option>
                    {formData.district && BANGLADESH_THANAS[formData.district]?.map((th) => (
                      <option key={th} value={th} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{th}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Input 
                  label="Area / Neighborhood" 
                  name="area" 
                  required 
                  onChange={handleInputChange} 
                  onBlur={handleBlur}
                  error={touched.area ? errors.area : undefined}
                  placeholder="e.g. Mirpur 1, Block C" 
                  value={formData.area || ''}
                  accentColor={accentColor}
                />
              </div>
            </div>
          </div>

          {/* Group 3: Professional / Student info */}
          <div className="border-2 border-slate-200/90 dark:border-slate-700/90 bg-slate-50/80 dark:bg-slate-900/50 p-6 rounded-2xl space-y-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-xs font-bold not-italic shadow-xs">3</span>
              {role === 'student' ? 'Student Profile Requirements' : 'Tutor Academic History'}
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {role === 'student' ? (
                <>
                  <Input 
                    label="Class" 
                    name="studentClass" 
                    required 
                    onChange={handleInputChange} 
                    onBlur={handleBlur}
                    error={touched.studentClass ? errors.studentClass : undefined}
                    placeholder="e.g. Class 10"
                    value={formData.studentClass || ''}
                    accentColor="#0D5BFF"
                  />
                  <Input 
                    label="Group (e.g. Science)" 
                    name="group" 
                    required 
                    onChange={handleInputChange} 
                    onBlur={handleBlur}
                    error={touched.group ? errors.group : undefined}
                    placeholder="e.g. Science / Business"
                    value={formData.group || ''}
                    accentColor="#0D5BFF"
                  />
                  <div className="sm:col-span-2">
                    <Input 
                      label="Institution / School Name" 
                      name="school" 
                      required 
                      onChange={handleInputChange} 
                      onBlur={handleBlur}
                      error={touched.school ? errors.school : undefined}
                      placeholder="e.g. Viqarunnisa Noon School"
                      value={formData.school || ''}
                      accentColor="#0D5BFF"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input 
                      label="Subject Requirements" 
                      name="subject" 
                      required 
                      onChange={handleInputChange} 
                      onBlur={handleBlur}
                      error={touched.subject ? errors.subject : undefined}
                      placeholder="e.g. Physics, Chemistry, Math"
                      value={formData.subject || ''}
                      accentColor="#0D5BFF"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <Input 
                      label="University / College" 
                      name="university" 
                      required 
                      onChange={handleInputChange} 
                      onBlur={handleBlur}
                      error={touched.university ? errors.university : undefined}
                      placeholder="e.g. BUET / University of Dhaka"
                      value={formData.university || ''}
                      accentColor="#F59E0B"
                    />
                  </div>
                  <Input 
                    label="Course / Degree" 
                    name="course" 
                    required 
                    onChange={handleInputChange} 
                    onBlur={handleBlur}
                    error={touched.course ? errors.course : undefined}
                    placeholder="e.g. B.Sc. in Civil Engineering"
                    value={formData.course || ''}
                    accentColor="#F59E0B"
                  />
                  <Input 
                    label="Current Academic Year" 
                    name="year" 
                    required 
                    onChange={handleInputChange} 
                    onBlur={handleBlur}
                    error={touched.year ? errors.year : undefined}
                    placeholder="e.g. 3rd Year"
                    value={formData.year || ''}
                    accentColor="#F59E0B"
                  />
                  <div className="sm:col-span-2">
                    <Input 
                      label="Semester / Session" 
                      name="semester" 
                      required 
                      onChange={handleInputChange} 
                      onBlur={handleBlur}
                      error={touched.semester ? errors.semester : undefined}
                      placeholder="e.g. 5th Semester / Session 2021-22"
                      value={formData.semester || ''}
                      accentColor="#F59E0B"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Referral Option */}
          <div className="border-2 border-slate-200/90 dark:border-slate-700/90 bg-slate-50/80 dark:bg-slate-900/50 p-6 rounded-2xl space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-emerald-500 animate-pulse" />
              Referral Code (Optional)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Were you invited by a friend or colleague? Enter their referral code or ID to reward them with exclusive badge points or service discounts!
            </p>
            <div className="relative group">
              <input
                type="text"
                placeholder="e.g. EDU-NAME-XXXX"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 shadow-xs"
              />
              {referralCodeInput && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  Applied
                </div>
              )}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.015 }}
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-6 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
              role === 'student' 
                ? 'bg-[#0D5BFF] hover:bg-blue-700 shadow-[#0d5bff]/25' 
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Create ${role === 'tutor' ? 'Tutor' : 'Student'} Account`
            )}
          </motion.button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest leading-none">
            <span className="px-4 bg-white dark:bg-[#111A2E] text-slate-500 dark:text-slate-400">Or register with</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.015 }}
          type="button"
          onClick={async () => {
            setError('');
            setLoading(true);
            try {
              const data = { ...formData };
              delete data.password;
              await useAppStore.getState().loginWithGoogle(role, data, '/dashboard');
              setSignupSuccess(true);
              await new Promise(resolve => setTimeout(resolve, 800));
              const dest = consumePostLoginDestination('/dashboard');
              navigate(dest);
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
                msg = 'Google Auth Error. Please check your connection and try again.';
              }
              setError(msg);
              setSignupSuccess(false);
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full py-3.5 bg-white dark:bg-[#111A2E] border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer mb-6 shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
            <path d="M12.24 24C15.4834 24 18.2059 22.9282 20.1945 21.1039L16.3275 18.1056C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24 12.24 24Z" fill="#34A853"/>
            <path d="M5.50255 14.3003C5.25755 13.5857 5.1225 12.8258 5.1225 12C5.1225 11.1742 5.25755 10.4143 5.50255 9.69973V6.60889H1.5166C0.68625 8.26127 0.21375 10.084 0.21375 12C0.21375 13.916 0.68625 15.7387 1.5166 17.3912L5.50255 14.3003Z" fill="#FBBC05"/>
            <path d="M12.24 4.74801C14.0074 4.74801 15.5951 5.35651 16.8419 6.54867L20.2695 3.12111C18.1969 1.18501 15.4744 0 12.24 0C7.7029 0 3.55371 2.55655 1.5166 6.60889L5.50705 9.69973C6.45946 6.86015 9.11388 4.74801 12.24 4.74801Z" fill="#EA4335"/>
          </svg>
          CREATE WITH GOOGLE
        </motion.button>
         
        <p className="mt-8 text-center text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400">
          Already registered? <button onClick={() => navigate('/login')} className="font-extrabold underline text-[#0D5BFF] hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase cursor-pointer ml-1">Sign in instead</button>
        </p>
      </>
    )}

        {/* Email OTP Verification Modal v3 */}
        <OtpVerificationModal
          isOpen={showOtpModal}
          email={formData.email || ''}
          ipNoticeMsg={ipNoticeMsg}
          errorMsg={otpError}
          successMsg={resendSuccessMsg}
          loading={otpLoading}
          resendTimer={resendTimer}
          onClose={() => setShowOtpModal(false)}
          onVerify={handleVerifyAndCompleteSignup}
          onComplete={handleCompleteRedirect}
          onResend={handleResendOtp}
        />

      </div>
    </div>
  );
}

function Input({ 
  label, 
  type = "text", 
  name, 
  required, 
  value,
  onChange, 
  onBlur,
  placeholder,
  error,
  helperText,
  accentColor = '#0D5BFF'
}: { 
  label: string; 
  type?: string; 
  name: string; 
  required?: boolean; 
  value?: string;
  onChange: any; 
  onBlur?: any;
  placeholder?: string;
  error?: string;
  helperText?: string;
  accentColor?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const currentType = isPasswordType && showPassword ? 'text' : type;

  const hasError = !!error;

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center px-0.5">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
        {error && (
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500 animate-slide-in">
            {error}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={currentType}
          name={name}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-slate-900 border-2 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 shadow-xs ${
            hasError 
              ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/20' 
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15'
          } ${isPasswordType ? 'pl-4 pr-12 py-3.5 rounded-xl' : 'px-4 py-3.5 rounded-xl'}`}
        />
        {isPasswordType && (
          <button
            type="button"
            id={`toggle-${name}-visibility`}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={showPassword ? "Hide Password" : "Show Password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-0.5 mt-1 leading-normal">
          {helperText}
        </p>
      )}
    </div>
  );
}

