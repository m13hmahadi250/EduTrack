import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore, consumePostLoginDestination } from '../store';
import {
  X,
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  MapPin,
  ChevronDown,
  Award,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Check,
  Phone,
  MessageCircle,
  ShieldCheck,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_THANAS,
  BANGLADESH_DIV_TO_DIST,
  BANGLADESH_DIVISIONS
} from '../data/bangladeshData';
import OtpVerificationModal from '../components/OtpVerificationModal';
import SEOHead from '../components/SEOHead';

/**
 * Normalizes Bangladeshi mobile numbers:
 * e.g. "+880 1712-345678" -> "01712345678"
 */
export function normalizeBdPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+880')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('880') && digits.length === 13) {
    digits = '0' + digits.slice(3);
  }
  return digits.replace(/\D/g, '');
}

export function isValidBdPhone(raw: string): boolean {
  const normalized = normalizeBdPhone(raw);
  return /^01[3-9]\d{8}$/.test(normalized);
}

export function inferDivisionFromDistrict(district: string): string {
  if (!district) return '';
  for (const [div, districts] of Object.entries(BANGLADESH_DIV_TO_DIST)) {
    if (districts.includes(district)) {
      return div;
    }
  }
  return 'Dhaka';
}

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'tutor' ? 'tutor' : 'student';
  const [role, setRole] = useState<'student' | 'tutor'>(initialRole);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sameAsMobile, setSameAsMobile] = useState<boolean>(true);
  const [formData, setFormData] = useState<any>({
    division: 'Dhaka',
  });
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [referralCodeInput, setReferralCodeInput] = useState(searchParams.get('ref') || '');

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole === 'tutor' || paramRole === 'student') {
      setRole(paramRole);
    }
  }, [searchParams]);

  // Keep whatsappNumber synced with phone when sameAsMobile is checked
  useEffect(() => {
    if (sameAsMobile) {
      const normalized = normalizeBdPhone(formData.phone || '');
      setFormData((prev: any) => {
        if (prev.whatsappNumber === normalized) return prev;
        return { ...prev, whatsappNumber: normalized };
      });
      setErrors((prev) => ({ ...prev, whatsappNumber: '' }));
    }
  }, [sameAsMobile, formData.phone]);

  // OTP Verification Flow State
  const [showOtpModal, setShowOtpModal] = useState(false);
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

  const signup = useAppStore((state) => state.signup);
  const currentUser = useAppStore((state) => state.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      const dest = consumePostLoginDestination('/dashboard');
      navigate(dest, { replace: true });
    }
  }, [currentUser, navigate]);

  const validateStep = (targetStep: 1 | 2 | 3): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (targetStep === 1) {
      if (!formData.name || !formData.name.trim()) {
        errs.name = 'Full name is required';
      }
      if (!formData.email || !formData.email.trim()) {
        errs.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
      if (!formData.phone || !formData.phone.trim()) {
        errs.phone = 'Mobile number is required';
      } else if (!isValidBdPhone(formData.phone)) {
        errs.phone = 'Enter a valid 11-digit BD mobile number (01XXXXXXXXX)';
      }

      if (!sameAsMobile && formData.whatsappNumber && formData.whatsappNumber.trim()) {
        if (!isValidBdPhone(formData.whatsappNumber)) {
          errs.whatsappNumber = 'Enter a valid 11-digit WhatsApp number (01XXXXXXXXX)';
        }
      }

      if (!formData.gender || !formData.gender.trim()) {
        errs.gender = 'Please select your gender';
      }
      if (!formData.password) {
        errs.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errs.password = 'Password must be at least 8 characters';
      }
    }

    if (targetStep === 2) {
      if (!formData.district || !formData.district.trim()) {
        errs.district = 'Please select your district';
      }
      if (!formData.thana || !formData.thana.trim()) {
        errs.thana = 'Please select your thana / upazila';
      }
      if (!formData.area || !formData.area.trim()) {
        errs.area = 'Please enter your area or neighborhood';
      }
    }

    if (targetStep === 3) {
      if (role === 'student') {
        if (!formData.studentClass || !formData.studentClass.trim()) {
          errs.studentClass = 'Class / grade is required';
        }
        if (!formData.group || !formData.group.trim()) {
          errs.group = 'Curriculum or group is required';
        }
        if (!formData.subject || !formData.subject.trim()) {
          errs.subject = 'Subjects needed are required';
        }
      } else {
        if (!formData.university || !formData.university.trim()) {
          errs.university = 'University or college name is required';
        }
        if (!formData.course || !formData.course.trim()) {
          errs.course = 'Department / degree is required';
        }
        if (!formData.year || !formData.year.trim()) {
          errs.year = 'Current academic year is required';
        }
      }
    }

    return errs;
  };

  const validateAll = () => {
    return {
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    };
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
        const inferredDiv = inferDivisionFromDistrict(value);
        if (inferredDiv) {
          next.division = inferredDiv;
        }
      }
      if (name === 'phone' && sameAsMobile) {
        next.whatsappNumber = normalizeBdPhone(value);
      }
      return next;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) {
      setError('');
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    let errorMsg = '';
    if (name === 'phone' && value) {
      const normalized = normalizeBdPhone(value);
      if (isValidBdPhone(normalized)) {
        setFormData((prev: any) => ({
          ...prev,
          phone: normalized,
          ...(sameAsMobile ? { whatsappNumber: normalized } : {}),
        }));
      } else {
        errorMsg = 'Enter a valid 11-digit mobile number (01XXXXXXXXX)';
      }
    } else if (name === 'whatsappNumber' && !sameAsMobile && value) {
      const normalized = normalizeBdPhone(value);
      if (isValidBdPhone(normalized)) {
        setFormData((prev: any) => ({ ...prev, whatsappNumber: normalized }));
      } else {
        errorMsg = 'Enter a valid 11-digit WhatsApp number (01XXXXXXXXX)';
      }
    } else if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      errorMsg = 'Please enter a valid email address';
    } else if (name === 'password' && value && value.length < 8) {
      errorMsg = 'Password must be at least 8 characters';
    }

    if (errorMsg) {
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleNextStep = () => {
    setError('');
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      const stepTouched: Record<string, boolean> = { ...touched };
      Object.keys(stepErrors).forEach((k) => {
        stepTouched[k] = true;
      });
      setTouched(stepTouched);
      setError('Please complete the highlighted fields before continuing.');
      return;
    }
    setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError('');
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIpNoticeMsg('');

    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const allTouched: Record<string, boolean> = {};
      Object.keys(validationErrors).forEach((f) => {
        allTouched[f] = true;
      });
      setTouched((prev) => ({ ...prev, ...allTouched }));
      setError('Please complete all required fields before submitting.');

      // Jump to earliest step with an error
      if (Object.keys(validateStep(1)).length > 0) setStep(1);
      else if (Object.keys(validateStep(2)).length > 0) setStep(2);
      else setStep(3);

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP verification code to your email.');
      }

      setIpNoticeMsg('');
      setOtpError('');
      setResendSuccessMsg(
        `Verification code dispatched to ${formData.email.trim()}. Please check your inbox or spam folder.`
      );
      setResendTimer(60);
      setShowOtpModal(true);
      setLoading(false);
    } catch (err: any) {
      console.error('OTP trigger error:', err);
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
          email: formData.email.trim(),
          name: formData.name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      setIpNoticeMsg('');
      setResendSuccessMsg(
        `A new 4-digit verification code has been sent to ${formData.email.trim()}. Please check your inbox or spam folder.`
      );
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
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: code,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Invalid or expired OTP code.');
      }

      const normalizedPhone = normalizeBdPhone(formData.phone);
      const finalWhatsapp =
        sameAsMobile || !formData.whatsappNumber?.trim()
          ? normalizedPhone
          : normalizeBdPhone(formData.whatsappNumber);
      const inferredDivision =
        formData.division || inferDivisionFromDistrict(formData.district) || 'Dhaka';
      const fallbackAddress =
        formData.address?.trim() ||
        [formData.area, formData.thana, formData.district].filter(Boolean).join(', ');

      const password = formData.password;
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: normalizedPhone,
        whatsappNumber: finalWhatsapp,
        division: inferredDivision,
        address: fallbackAddress,
        school: formData.school?.trim() || 'Not Specified',
        semester: formData.semester?.trim() || formData.year || 'Current Session',
        role,
      };
      delete payload.password;

      await signup(payload, password, referralCodeInput);
      setSignupSuccess(true);
    } catch (err: any) {
      console.error('OTP verification / Firebase signup error:', err);
      let msg = err.message || 'Verification or signup failed. Please try again.';

      const errStr = String(err);
      if (
        msg.includes('auth/email-already-in-use') ||
        errStr.includes('auth/email-already-in-use')
      ) {
        msg = 'This email is already registered in Firebase. Please sign in instead.';
      } else if (
        msg.includes('auth/weak-password') ||
        errStr.includes('auth/weak-password')
      ) {
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

  const accentColor = role === 'student' ? '#0D5BFF' : '#D97706';

  const stepLabels = [
    { num: 1, title: 'Account & Contact', subtitle: 'Basic details & WhatsApp' },
    { num: 2, title: 'Location', subtitle: 'District, Thana & Area' },
    {
      num: 3,
      title: role === 'student' ? 'Tuition Preferences' : 'Academic Profile',
      subtitle: role === 'student' ? 'Class & subjects' : 'University & degree',
    },
  ];

  // Districts list: if division is selected, prioritize division districts or show all grouped
  const availableDistricts =
    formData.division && BANGLADESH_DIV_TO_DIST[formData.division]
      ? BANGLADESH_DIV_TO_DIST[formData.division]
      : BANGLADESH_DISTRICTS;

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#0B132B]">
      <SEOHead
        title="Register as a Student or Tutor | EduTrack Bangladesh"
        description="Join EduTrack Bangladesh today. Create an account to hire verified home tutors from BUET, DU, Medical, or apply to become a certified tutor with verified NID credentials."
        keywords="tutor registration bangladesh, find tutor signup, join edutrack, tuition media registration bd, private tutor register"
        canonicalUrl="https://edutrackbd.vercel.app/signup"
      />
      <div className="w-full max-w-2xl bg-white dark:bg-[#111A2E] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-10 relative overflow-hidden">
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
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className="absolute w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
                    style={{ borderColor: `${accentColor} transparent transparent transparent` }}
                  />
                  <GraduationCap className="w-6 h-6 text-slate-500 dark:text-slate-400 animate-pulse" />
                </div>
              </div>
            )}

            <h3 className="text-lg font-black font-heading text-slate-900 dark:text-white uppercase tracking-wide">
              {signupSuccess ? 'Account Provisioned!' : 'Sending Verification Code'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold tracking-wider mt-1">
              {signupSuccess ? 'Setting up your dashboard workspace...' : 'Please wait a moment...'}
            </p>
          </motion.div>
        ) : (
          <>
            <button
              className="absolute top-6 right-6 sm:top-8 sm:right-8 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              onClick={() => navigate('/')}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-[#0D5BFF] dark:text-blue-400 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>EduTrack Bangladesh • Verified Community</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F172A] dark:text-white tracking-tight">
                Create Your Account
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                Choose your role below and complete 3 quick steps to get started.
              </p>
            </div>

            {/* Clear Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7" role="radiogroup" aria-label="Select account role">
              <button
                type="button"
                onClick={() => {
                  setRole('student');
                  setError('');
                }}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  role === 'student'
                    ? 'border-[#0D5BFF] bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    role === 'student'
                      ? 'bg-[#0D5BFF] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      I am a Student / Guardian
                    </span>
                    {role === 'student' && (
                      <span className="w-5 h-5 rounded-full bg-[#0D5BFF] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    Find verified tutors, post tuition jobs & track sessions
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('tutor');
                  setError('');
                }}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  role === 'tutor'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    role === 'tutor'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      I am a Tutor / Teacher
                    </span>
                    {role === 'tutor' && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    Apply to verified tuitions, build your profile & earn
                  </p>
                </div>
              </button>
            </div>

            {/* Progressive 3-Step Indicator */}
            <div className="mb-7">
              <div className="grid grid-cols-3 gap-2">
                {stepLabels.map((s) => {
                  const isCurrent = step === s.num;
                  const isCompleted = step > s.num;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => {
                        if (s.num < step) {
                          setStep(s.num as 1 | 2 | 3);
                          setError('');
                        } else if (s.num === step + 1) {
                          handleNextStep();
                        }
                      }}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? role === 'student'
                            ? 'border-[#0D5BFF] bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                          : isCompleted
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? role === 'student'
                                ? 'bg-[#0D5BFF] text-white'
                                : 'bg-amber-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                        </span>
                        <span
                          className={`text-xs font-bold truncate ${
                            isCurrent
                              ? 'text-slate-900 dark:text-white'
                              : isCompleted
                              ? 'text-emerald-800 dark:text-emerald-300'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate pl-8 hidden sm:block">
                        {s.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSignup} noValidate>
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* STEP 1: Account & Smart Contact Details */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="border border-slate-200 dark:border-slate-700/90 bg-slate-50/70 dark:bg-slate-900/50 p-5 sm:p-6 rounded-2xl space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-[#0D5BFF]" />
                      <span>Step 1 of 3: Essential Account Details</span>
                    </h2>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      * Required fields
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input
                        label={role === 'student' ? 'Student or Guardian Full Name' : 'Tutor Full Name'}
                        name="name"
                        required
                        autoComplete="name"
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.name ? errors.name : undefined}
                        value={formData.name || ''}
                        accentColor={accentColor}
                        placeholder={role === 'student' ? 'e.g. Tariqul Islam' : 'e.g. Arif Hossain'}
                      />
                    </div>

                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={touched.email ? errors.email : undefined}
                      helperText="We'll send a 4-digit verification code here"
                      value={formData.email || ''}
                      accentColor={accentColor}
                      placeholder="e.g. name@example.com"
                    />

                    <div className="space-y-1.5 w-full">
                      <div className="flex justify-between items-center px-0.5">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          Gender <span className="text-rose-600 font-bold ml-0.5">*</span>
                        </label>
                        {touched.gender && errors.gender && (
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
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
                          className={`w-full bg-white dark:bg-slate-900 border-2 text-sm font-semibold text-slate-900 dark:text-white pl-4 pr-10 py-3 rounded-xl focus:outline-none transition-all duration-200 appearance-none cursor-pointer ${
                            touched.gender && errors.gender
                              ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600'
                              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 focus:border-[#0D5BFF]'
                          }`}
                        >
                          <option value="" disabled>
                            Select Gender
                          </option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-300">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Smart Mobile & WhatsApp Section */}
                    <div className="sm:col-span-2 bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                      <Input
                        label="Mobile Number (Bangladesh)"
                        type="tel"
                        name="phone"
                        required
                        autoComplete="tel"
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.phone ? errors.phone : undefined}
                        helperText="11-digit mobile number (e.g. 01712345678 or +8801712345678)"
                        value={formData.phone || ''}
                        accentColor={accentColor}
                        placeholder="01712345678"
                      />

                      {/* Smart Same-as-WhatsApp Checkbox */}
                      <div className="pt-1">
                        <label className="flex items-start gap-3 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={sameAsMobile}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSameAsMobile(checked);
                              if (checked) {
                                setFormData((prev: any) => ({
                                  ...prev,
                                  whatsappNumber: normalizeBdPhone(prev.phone || ''),
                                }));
                                setErrors((prev) => ({ ...prev, whatsappNumber: '' }));
                              }
                            }}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0D5BFF] focus:ring-[#0D5BFF] cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0D5BFF] dark:group-hover:text-blue-400 transition-colors">
                              My WhatsApp number is the same as my mobile number
                            </span>
                            {sameAsMobile ? (
                              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1.5">
                                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isValidBdPhone(formData.phone || '')
                                    ? `WhatsApp automatically synced to ${normalizeBdPhone(formData.phone)}`
                                    : 'Your mobile number will automatically be used for WhatsApp updates'}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Enter a different WhatsApp number below (optional if same as mobile).
                              </p>
                            )}
                          </div>
                        </label>
                      </div>

                      <AnimatePresence>
                        {!sameAsMobile && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-2"
                          >
                            <Input
                              label="Separate WhatsApp Number (Optional)"
                              type="tel"
                              name="whatsappNumber"
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={touched.whatsappNumber ? errors.whatsappNumber : undefined}
                              helperText="Used for tuition confirmation & schedule coordination"
                              value={formData.whatsappNumber || ''}
                              accentColor={accentColor}
                              placeholder="01XXXXXXXXX"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Create Password"
                        type="password"
                        name="password"
                        required
                        autoComplete="new-password"
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.password ? errors.password : undefined}
                        helperText="Minimum 8 characters. Use a mix of letters and numbers."
                        placeholder="At least 8 characters"
                        value={formData.password || ''}
                        accentColor={accentColor}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Streamlined Location Details */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="border border-slate-200 dark:border-slate-700/90 bg-slate-50/70 dark:bg-slate-900/50 p-5 sm:p-6 rounded-2xl space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0D5BFF]" />
                      <span>
                        Step 2 of 3: {role === 'student' ? 'Tuition Location' : 'Preferred Teaching Location'}
                      </span>
                    </h2>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      64 Districts Supported
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* Division Filter (Optional helper, auto-synced when District is chosen) */}
                    <div className="space-y-1.5 w-full">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Division
                      </label>
                      <div className="relative">
                        <select
                          name="division"
                          value={formData.division || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 focus:border-[#0D5BFF] text-sm font-semibold text-slate-900 dark:text-white pl-4 pr-10 py-3 rounded-xl focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="">All Divisions (Bangladesh)</option>
                          {BANGLADESH_DIVISIONS.map((div) => (
                            <option key={div} value={div}>
                              {div} Division
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-300">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* District (Always enabled so user is never blocked!) */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex justify-between items-center px-0.5">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          District <span className="text-rose-600 font-bold ml-0.5">*</span>
                        </label>
                        {touched.district && errors.district && (
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            {errors.district}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          name="district"
                          required
                          value={formData.district || ''}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full bg-white dark:bg-slate-900 border-2 text-sm font-semibold text-slate-900 dark:text-white pl-4 pr-10 py-3 rounded-xl focus:outline-none transition-all appearance-none cursor-pointer ${
                            touched.district && errors.district
                              ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 focus:border-[#0D5BFF]'
                          }`}
                        >
                          <option value="" disabled>
                            Select District
                          </option>
                          {availableDistricts.map((dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-300">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Thana / Upazila */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex justify-between items-center px-0.5">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          Thana / Upazila <span className="text-rose-600 font-bold ml-0.5">*</span>
                        </label>
                        {touched.thana && errors.thana && (
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
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
                          className={`w-full bg-white dark:bg-slate-900 border-2 text-sm font-semibold text-slate-900 dark:text-white pl-4 pr-10 py-3 rounded-xl focus:outline-none transition-all appearance-none cursor-pointer ${
                            !formData.district
                              ? 'opacity-60 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                              : ''
                          } ${
                            touched.thana && errors.thana
                              ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 focus:border-[#0D5BFF]'
                          }`}
                        >
                          <option value="" disabled>
                            {formData.district ? 'Select Thana / Upazila' : 'Select District First'}
                          </option>
                          {formData.district &&
                            BANGLADESH_THANAS[formData.district]?.map((th) => (
                              <option key={th} value={th}>
                                {th}
                              </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-300">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Area / Neighborhood */}
                    <Input
                      label="Area / Neighborhood"
                      name="area"
                      required
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={touched.area ? errors.area : undefined}
                      placeholder="e.g. Dhanmondi 15, Mirpur 10, Uttara Sector 7"
                      value={formData.area || ''}
                      accentColor={accentColor}
                    />

                    {/* Street / House Address (Optional during signup to reduce friction) */}
                    <div className="sm:col-span-2">
                      <Input
                        label="Street / House Details (Optional)"
                        name="address"
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        helperText="Shared only with confirmed matches. You can also update this later."
                        placeholder="e.g. Road 8, House 14, Block C"
                        value={formData.address || ''}
                        accentColor={accentColor}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Role-Specific Academic / Tuition Details */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="border border-slate-200 dark:border-slate-700/90 bg-slate-50/70 dark:bg-slate-900/50 p-5 sm:p-6 rounded-2xl space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {role === 'student' ? (
                          <GraduationCap className="w-4 h-4 text-[#0D5BFF]" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-amber-500" />
                        )}
                        <span>
                          Step 3 of 3:{' '}
                          {role === 'student'
                            ? 'Student Class & Subject Preferences'
                            : 'Tutor Academic Credentials'}
                        </span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {role === 'student' ? (
                        <>
                          <Input
                            label="Student Class / Grade"
                            name="studentClass"
                            required
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={touched.studentClass ? errors.studentClass : undefined}
                            placeholder="e.g. Class 9, HSC 1st Year, O Level"
                            value={formData.studentClass || ''}
                            accentColor="#0D5BFF"
                          />
                          <Input
                            label="Curriculum / Group"
                            name="group"
                            required
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={touched.group ? errors.group : undefined}
                            placeholder="e.g. Science, Bangla Medium, English Version"
                            value={formData.group || ''}
                            accentColor="#0D5BFF"
                          />
                          <div className="sm:col-span-2">
                            <Input
                              label="Subjects Needed"
                              name="subject"
                              required
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={touched.subject ? errors.subject : undefined}
                              placeholder="e.g. Physics, Chemistry, Higher Math"
                              value={formData.subject || ''}
                              accentColor="#0D5BFF"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="School / College Name (Optional)"
                              name="school"
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Viqarunnisa Noon School & College"
                              value={formData.school || ''}
                              accentColor="#0D5BFF"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="sm:col-span-2">
                            <Input
                              label="University / Medical / College"
                              name="university"
                              required
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={touched.university ? errors.university : undefined}
                              placeholder="e.g. BUET, University of Dhaka, DMC"
                              value={formData.university || ''}
                              accentColor="#D97706"
                            />
                          </div>
                          <Input
                            label="Department / Degree"
                            name="course"
                            required
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={touched.course ? errors.course : undefined}
                            placeholder="e.g. B.Sc. in CSE / MBBS"
                            value={formData.course || ''}
                            accentColor="#D97706"
                          />
                          <Input
                            label="Current Year / Batch"
                            name="year"
                            required
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={touched.year ? errors.year : undefined}
                            placeholder="e.g. 3rd Year / Graduated"
                            value={formData.year || ''}
                            accentColor="#D97706"
                          />
                          <div className="sm:col-span-2">
                            <Input
                              label="Semester / Session (Optional)"
                              name="semester"
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. 5th Semester or Session 2021-22"
                              value={formData.semester || ''}
                              accentColor="#D97706"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Referral Option */}
                  <div className="border border-slate-200 dark:border-slate-700/90 bg-slate-50/70 dark:bg-slate-900/50 p-5 rounded-2xl space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Referral Code (Optional)
                    </h3>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter referral code if invited (e.g. EDU-XXXX)"
                        value={referralCodeInput}
                        onChange={(e) => setReferralCodeInput(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                      />
                      {referralCodeInput && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                          Applied
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className={`px-7 py-3.5 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                      role === 'student'
                        ? 'bg-[#0D5BFF] hover:bg-blue-700'
                        : 'bg-amber-500 hover:bg-amber-600'
                    }`}
                  >
                    <span>Continue to Step {step + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className={`flex-1 sm:flex-initial sm:min-w-[240px] px-8 py-4 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                      role === 'student'
                        ? 'bg-[#0D5BFF] hover:bg-blue-700 shadow-[#0d5bff]/25'
                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create {role === 'tutor' ? 'Tutor' : 'Student'} Account</span>
                  </motion.button>
                )}
              </div>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs font-semibold">
                <span className="px-4 bg-white dark:bg-[#111A2E] text-slate-600 dark:text-slate-300">
                  Or continue quickly with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setError('');
                setLoading(true);
                try {
                  const data = { ...formData };
                  delete data.password;
                  await useAppStore.getState().loginWithGoogle(role, data, '/dashboard');
                  setSignupSuccess(true);
                  await new Promise((resolve) => setTimeout(resolve, 800));
                  const dest = consumePostLoginDestination('/dashboard');
                  navigate(dest);
                } catch (err: any) {
                  console.error('Google Auth error:', err);
                  let msg = err.message || 'Google Auth failed';
                  const errStr = String(err).toLowerCase();
                  const errCode = (err?.code || '').toLowerCase();
                  if (
                    errCode === 'auth/popup-closed-by-user' ||
                    errStr.includes('popup-closed-by-user') ||
                    errStr.includes('popup closed by user')
                  ) {
                    msg = 'Google sign-in popup was closed before completing.';
                  } else if (
                    errCode === 'auth/user-disabled' ||
                    errStr.includes('user-disabled') ||
                    errStr.includes('user_disabled')
                  ) {
                    msg = 'Your account is temporarily restricted. Please contact support.';
                  } else if (
                    err.code === 'auth/invalid-credential' ||
                    (typeof err === 'string' && err.includes('invalid-credential'))
                  ) {
                    msg = 'Google authentication error. Please check your connection and try again.';
                  }
                  setError(msg);
                  setSignupSuccess(false);
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <span>Continue with Google as {role === 'tutor' ? 'Tutor' : 'Student'}</span>
            </button>

            <p className="mt-6 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-bold underline text-[#0D5BFF] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer ml-1"
              >
                Sign in here
              </button>
            </p>
          </>
        )}

        {/* Email OTP Verification Modal */}
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
  type = 'text',
  name,
  required,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  helperText,
  autoComplete,
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
  autoComplete?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const currentType = isPasswordType && showPassword ? 'text' : type;

  const hasError = !!error;

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center px-0.5 gap-2">
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
          {label} {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
        </label>
        {error && (
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 text-right">
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
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-slate-900 border-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none transition-all duration-200 ${
            hasError
              ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:border-[#0D5BFF] dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15'
          } ${isPasswordType ? 'pl-4 pr-12 py-3 rounded-xl' : 'px-4 py-3 rounded-xl'}`}
        />
        {isPasswordType && (
          <button
            type="button"
            id={`toggle-${name}-visibility`}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 px-0.5 leading-normal">
          {helperText}
        </p>
      )}
    </div>
  );
}
