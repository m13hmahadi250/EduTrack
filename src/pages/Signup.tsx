import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { X } from 'lucide-react';

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
      setError(err.message || 'Registration failed');
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
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
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
              <Input label="Address" name="address" required onChange={handleInputChange} />
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
        
        <p className="mt-8 text-center text-xs text-slate-500 font-medium">
          Already registered? <button onClick={() => navigate('/login')} className="font-bold text-[#0D5BFF]">Sign in instead</button>
        </p>

      </div>
    </div>
  );
}

function Input({ label, type = "text", name, required, onChange }: { label: string, type?: string, name: string, required?: boolean, onChange: any }) {
  return (
    <div>
      <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2">{label}</label>
      <div className="mt-1">
        <input
          type={type}
          name={name}
          required={required}
          onChange={onChange}
          className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#0B132B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}
