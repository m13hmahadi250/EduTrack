import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const signup = useAppStore(state => state.signup);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const password = formData.password;
      const data = { ...formData };
      delete data.password;
      
      await signup({ ...data, role }, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Signup error:", err);
      let msg = 'Registration failed. Please try again.';
      const errStr = String(err);
      
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'The email address is badly formatted.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-credential' || errStr.includes('invalid-credential')) {
        msg = 'Registration Error. Please check your information and try again.';
      } else if (err.message) {
        msg = err.message;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8 relative overflow-hidden">
        <button className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 z-10" onClick={() => navigate('/')}>
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold font-heading text-[#0B132B] tracking-tight mb-8">
          Register for EduTrack
        </h2>

        {/* Toggle */}
        <div className="flex bg-[#F3F4F6] rounded-2xl p-1.5 mb-8">
          <button
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${role === 'student' ? 'bg-white text-[#0B132B] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setRole('student')}
          >
            Student
          </button>
          <button
             className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${role === 'tutor' ? 'bg-white text-[#0B132B] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setRole('tutor')}
          >
            Tutor
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSignup}>
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
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Full Name / Guardian Name" name="name" required onChange={handleInputChange} />
            </div>
            <Input label="Email Address" type="email" name="email" required onChange={handleInputChange} />
            <Input label="Phone Number" type="tel" name="phone" required onChange={handleInputChange} />
            <div className="sm:col-span-2">
              <Input label="Password" type="password" name="password" required onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Address" name="address" required onChange={handleInputChange} placeholder="Full address" />
            </div>
            
            <Input label="District" name="district" required onChange={handleInputChange} placeholder="e.g. Dhaka" />
            <Input label="Thana" name="thana" required onChange={handleInputChange} placeholder="e.g. Mirpur" />
            <div className="sm:col-span-2">
              <Input label="Area" name="area" required onChange={handleInputChange} placeholder="e.g. Mirpur 1" />
            </div>

            {/* Student Specific Fields */}
            {role === 'student' && (
              <>
                <Input label="Class" name="studentClass" required onChange={handleInputChange} />
                <Input label="Group (e.g. Science)" name="group" required onChange={handleInputChange} />
                <Input label="Institution / School" name="school" required onChange={handleInputChange} />
                <Input label="Subject Requirements" name="subject" required onChange={handleInputChange} />
              </>
            )}

            {/* Tutor Specific Fields */}
            {role === 'tutor' && (
              <>
                <Input label="University/College" name="university" required onChange={handleInputChange} />
                <Input label="Course/Degree" name="course" required onChange={handleInputChange} />
                <Input label="Current Year" name="year" required onChange={handleInputChange} />
                <Input label="Semester" name="semester" required onChange={handleInputChange} />
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 bg-[#0D5BFF] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-[0_8px_16px_rgba(13,91,255,0.2)] disabled:opacity-50"
          >
            {loading ? 'Registering...' : `Create ${role === 'tutor' ? 'Tutor' : 'Student'} Account`}
          </button>
        </form>

        <div className="relative my-8">
           <div className="absolute inset-0 flex items-center">
             <div className="w-full border-t border-slate-100"></div>
           </div>
           <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest leading-none">
             <span className="px-4 bg-white text-slate-400">Or register with</span>
           </div>
         </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await useAppStore.getState().loginWithGoogle(role);
                navigate('/dashboard');
              } catch (err: any) {
                console.error("Google Auth error:", err);
                let msg = err.message || 'Google Auth failed';
                if (err.code === 'auth/invalid-credential' || (typeof err === 'string' && err.includes('invalid-credential'))) {
                  msg = 'Google Auth Error (invalid-credential). Ensure your Vercel URL is added to "Authorized Domains" in Firebase Console > Authentication > Settings.';
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
         
        <p className="mt-8 text-center text-xs text-slate-500 font-medium">
          Already registered? <button onClick={() => navigate('/login')} className="font-bold text-[#0D5BFF]">Sign in instead</button>
        </p>

      </div>
    </div>
  );
}

function Input({ label, type = "text", name, required, onChange, placeholder }: { label: string, type?: string, name: string, required?: boolean, onChange: any, placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2">{label}</label>
      <div className="mt-1">
        <input
          type={type}
          name={name}
          required={required}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#0B132B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}
