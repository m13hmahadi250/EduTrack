import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { X, AlertCircle, Eye, EyeOff, GraduationCap, BookOpen, MapPin, UserCheck, ShieldAlert, ChevronDown, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BANGLADESH_DISTRICTS, BANGLADESH_THANAS, BANGLADESH_DIV_TO_DIST, BANGLADESH_DIVISIONS } from '../data/bangladeshData';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [searchParams] = useSearchParams();
  const [referralCodeInput, setReferralCodeInput] = useState(searchParams.get('ref') || '');
  
  const signup = useAppStore(state => state.signup);
  const navigate = useNavigate();

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
      const password = formData.password;
      const data = { ...formData };
      delete data.password;
      
      await signup({ ...data, role }, password, referralCodeInput);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Signup error:", err);
      let msg = 'Registration failed. Please try again.';
      const errStr = String(err);
      
      let errMsg = err.message || errStr;
      let errCode = err.code;

      if (errMsg && errMsg.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed && parsed.error) {
            errMsg = parsed.error;
            if (parsed.error.includes('auth/weak-password')) {
              errCode = 'auth/weak-password';
            } else if (parsed.error.includes('auth/email-already-in-use')) {
              errCode = 'auth/email-already-in-use';
            } else if (parsed.error.includes('auth/invalid-email')) {
              errCode = 'auth/invalid-email';
            }
          }
        } catch (_) {}
      }

      if (errCode === 'auth/email-already-in-use' || errMsg.includes('auth/email-already-in-use')) {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (errCode === 'auth/invalid-email' || errMsg.includes('auth/invalid-email')) {
        msg = 'The email address is badly formatted.';
      } else if (errCode === 'auth/weak-password' || errMsg.includes('auth/weak-password')) {
        msg = 'Password is too short. Please use at least 8 characters.';
      } else if (errCode === 'auth/invalid-credential' || errMsg.includes('auth/invalid-credential')) {
        msg = 'Registration Error. Please check your information and try again.';
      } else {
        msg = errMsg;
      }

      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const accentColor = role === 'student' ? '#0D5BFF' : '#F59E0B';

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/40 dark:bg-slate-950/20">
      <div className="w-full max-w-2xl bg-white dark:bg-[#111A2E] rounded-3xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800/85 p-8 relative overflow-hidden">
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
            borderColor: role === 'student' ? 'rgba(13, 91, 255, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            boxShadow: role === 'student' 
              ? '0 10px 25px -5px rgba(13, 91, 255, 0.1), 0 8px 10px -6px rgba(13, 91, 255, 0.08)' 
              : '0 10px 25px -5px rgba(245, 158, 11, 0.1), 0 8px 10px -6px rgba(245, 158, 11, 0.08)',
          }}
          transition={{ duration: 0.3 }}
          className="flex bg-slate-50 dark:bg-slate-900 rounded-2xl p-1.5 mb-8 relative border-2 border-slate-200/60 dark:border-slate-800/60"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            className={`relative flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer ${role === 'student' ? 'text-[#0B132B] dark:text-white' : 'text-slate-500 hover:text-[#0B132B] dark:hover:text-white'}`}
            onClick={() => setRole('student')}
          >
            {role === 'student' && (
              <motion.div
                layoutId="active-role-bg"
                className="absolute inset-0 bg-white dark:bg-[#1A233A] rounded-xl shadow-md border border-slate-100 dark:border-slate-800/50"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{ zIndex: -1 }}
              />
            )}
            <GraduationCap className={`w-4 h-4 transition-transform duration-300 ${role === 'student' ? 'text-[#0D5BFF] scale-110' : 'text-slate-400'}`} />
            <span>Student & Guardian</span>
          </motion.button>
          <button
            type="button"
            className={`relative flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 cursor-pointer ${role === 'tutor' ? 'text-[#0B132B] dark:text-white' : 'text-slate-500 hover:text-[#0B132B] dark:hover:text-white'}`}
            onClick={() => setRole('tutor')}
          >
            {role === 'tutor' && (
              <motion.div
                layoutId="active-role-bg"
                className="absolute inset-0 bg-white dark:bg-[#1A233A] rounded-xl shadow-md border border-slate-100 dark:border-slate-800/50"
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
                className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Group 1: Account details */}
          <div className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white flex items-center gap-2 mb-2 italic">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#0B132B] dark:text-white flex items-center justify-center text-[9px] font-black not-italic">1</span>
              Account Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                helperText="Must be an 11-digit mobile number started with 01"
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
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Gender <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.gender && errors.gender && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 animate-slide-in">
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
                    className={`w-full bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 outline-none appearance-none cursor-pointer ${
                      touched.gender && errors.gender
                        ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 focus:border-transparent'
                    }`}
                    style={{
                      ['--tw-ring-color' as any]: touched.gender && errors.gender ? 'rgb(239, 68, 68)' : accentColor
                    }}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">Select Gender</option>
                    <option value="Male" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Male</option>
                    <option value="Female" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Female</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4 transition-transform duration-200 group-focus-within:rotate-180" />
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
          <div className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white flex items-center gap-2 mb-2 italic">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#0B132B] dark:text-white flex items-center justify-center text-[9px] font-black not-italic">2</span>
              Location Details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Division <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.division && errors.division && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 animate-slide-in">
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
                    className={`w-full bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 outline-none appearance-none cursor-pointer ${
                      touched.division && errors.division
                        ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 focus:border-transparent'
                    }`}
                    style={{
                      ['--tw-ring-color' as any]: touched.division && errors.division ? 'rgb(239, 68, 68)' : accentColor
                    }}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">Select Division</option>
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div} value={div} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{div}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    District <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.district && errors.district && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 animate-slide-in">
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
                    className={`w-full bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 outline-none appearance-none cursor-pointer ${
                      !formData.division ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      touched.district && errors.district
                        ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 focus:border-transparent'
                    }`}
                    style={{
                      ['--tw-ring-color' as any]: touched.district && errors.district ? 'rgb(239, 68, 68)' : accentColor
                    }}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
                      {formData.division ? 'Select District' : 'Select Division First'}
                    </option>
                    {formData.division && (BANGLADESH_DIV_TO_DIST[formData.division] || []).map((dist) => (
                      <option key={dist} value={dist} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{dist}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-center px-0.5">
                  <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Thana <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {touched.thana && errors.thana && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 animate-slide-in">
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
                    className={`w-full bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white pl-4 pr-10 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 outline-none appearance-none cursor-pointer ${
                      !formData.district ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      touched.thana && errors.thana
                        ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500' 
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 focus:border-transparent'
                    }`}
                    style={{
                      ['--tw-ring-color' as any]: touched.thana && errors.thana ? 'rgb(239, 68, 68)' : accentColor
                    }}
                  >
                    <option value="" disabled className="text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
                      {formData.district ? 'Select Thana' : 'Select District First'}
                    </option>
                    {formData.district && BANGLADESH_THANAS[formData.district]?.map((th) => (
                      <option key={th} value={th} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{th}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center justify-center">
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
          <div className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white flex items-center gap-2 mb-2 italic">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#0B132B] dark:text-white flex items-center justify-center text-[9px] font-black not-italic">3</span>
              {role === 'student' ? 'Student Profile requirements' : 'Tutor Academic History'}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white flex items-center gap-2 mb-2 italic">
              <Award className="w-4 h-4 text-emerald-500 animate-pulse" />
              Referral Code (Optional)
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Were you invited by a friend or colleague? Enter their referral code or ID to reward them with exclusive badge points or service discounts!
            </p>
            <div className="relative group">
              <input
                type="text"
                placeholder="e.g. EDU-NAME-XXXX"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                className="w-full px-5 py-3.5 bg-white dark:bg-[#1A233A] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white focus:outline-none transition-all duration-300 focus:border-emerald-500"
              />
              {referralCodeInput && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-md">
                  Applied
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-6 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
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
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-slate-800/80"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest leading-none">
            <span className="px-4 bg-white dark:bg-[#111A2E] text-slate-400 dark:text-slate-500">Or register with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            setError('');
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
              setError('Please fill out all required fields with valid information first before signing up with Google.');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }

            setLoading(true);
            try {
              const data = { ...formData };
              delete data.password;
              await useAppStore.getState().loginWithGoogle(role, data);
              navigate('/dashboard');
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
                msg = 'Google Auth Error (invalid-credential). Ensure your Vercel URL is added to "Authorized Domains" in Firebase Console > Authentication > Settings.';
              }
              setError(msg);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full py-3.5 bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 text-[#374151] dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
            <path d="M12.24 24C15.4834 24 18.2059 22.9282 20.1945 21.1039L16.3275 18.1056C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24 12.24 24Z" fill="#34A853"/>
            <path d="M5.50255 14.3003C5.25755 13.5857 5.1225 12.8258 5.1225 12C5.1225 11.1742 5.25755 10.4143 5.50255 9.69973V6.60889H1.5166C0.68625 8.26127 0.21375 10.084 0.21375 12C0.21375 13.916 0.68625 15.7387 1.5166 17.3912L5.50255 14.3003Z" fill="#FBBC05"/>
            <path d="M12.24 4.74801C14.0074 4.74801 15.5951 5.35651 16.8419 6.54867L20.2695 3.12111C18.1969 1.18501 15.4744 0 12.24 0C7.7029 0 3.55371 2.55655 1.5166 6.60889L5.50705 9.69973C6.45946 6.86015 9.11388 4.74801 12.24 4.74801Z" fill="#EA4335"/>
          </svg>
          CREATE WITH GOOGLE
        </button>
         
        <p className="mt-8 text-center text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
          Already registered? <button onClick={() => navigate('/login')} className="font-bold underline text-[#0D5BFF] hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase cursor-pointer ml-1">Sign in instead</button>
        </p>

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
        <label className="block text-[10px] font-black font-heading uppercase text-slate-400 dark:text-slate-500 tracking-wider">
          {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
        {error && (
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 animate-slide-in">
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
          className={`w-full bg-slate-50/50 dark:bg-slate-900/50 border text-xs font-bold text-[#0B132B] dark:text-white placeholder-slate-400/80 dark:placeholder-slate-500/80 focus:outline-none focus:ring-2 transition-all duration-200 outline-none ${
            hasError 
              ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500 focus:border-rose-500' 
              : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 focus:border-transparent'
          } ${isPasswordType ? 'pl-4 pr-12 py-3.5 rounded-xl' : 'px-4 py-3.5 rounded-xl'}`}
          style={{
            // CSS custom property overrides for tailwind ring color if supported, or directly managed
            ['--tw-ring-color' as any]: hasError ? 'rgb(239, 68, 68)' : accentColor
          }}
        />
        {isPasswordType && (
          <button
            type="button"
            id={`toggle-${name}-visibility`}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
            title={showPassword ? "Hide Password" : "Show Password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5 leading-normal">
          {helperText}
        </p>
      )}
    </div>
  );
}

