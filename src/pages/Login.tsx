import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { X } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      setLoading(true);
      setError('');
      try {
        // Simple demo logic: if email is 'student', 'tutor', or 'admin', use loginAsDemo
        if (['student', 'tutor', 'admin'].includes(email.toLowerCase())) {
          await useAppStore.getState().loginAsDemo(email.toLowerCase() as any);
        } else {
          await login(email, password);
        }
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Invalid email or password');
      } finally {
        setLoading(false);
      }
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
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

        <form onSubmit={handleSubmit} className="space-y-5">
           {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
           <div>
             <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2">Email Address</label>
             <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@provider.com"
                className="w-full px-4 py-3.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#0B132B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent transition-all"
             />
           </div>
           <div>
             <label className="block text-[10px] font-black font-heading uppercase text-[#9CA3AF] tracking-wider mb-2">Password</label>
             <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#0B132B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent transition-all"
             />
           </div>

             <button
               type="submit"
               disabled={loading}
               className="w-full py-4 mt-4 bg-[#0D5BFF] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-700 active:scale-[0.98] transition-all shadow-[0_8px_16px_rgba(13,91,255,0.2)] disabled:opacity-50"
             >
             {loading ? 'Authenticating...' : 'Enter Dashboard'}
           </button>

           <div className="mt-8 pt-8 border-t border-slate-100">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 text-center">Quick Access for Testing</p>
             <div className="grid grid-cols-3 gap-2">
               <button 
                 type="button"
                 onClick={async () => {
                    await useAppStore.getState().loginAsDemo('student');
                    navigate('/dashboard');
                  }}
                 className="px-2 py-2.5 bg-slate-50 hover:bg-blue-50 text-[#0B132B] text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-100"
               >
                 Guardian
               </button>
               <button 
                 type="button"
                 onClick={async () => {
                    await useAppStore.getState().loginAsDemo('tutor');
                    navigate('/dashboard');
                  }}
                 className="px-2 py-2.5 bg-slate-50 hover:bg-blue-50 text-[#0B132B] text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-100"
               >
                 Teacher
               </button>
               <button 
                 type="button"
                 onClick={async () => {
                    await useAppStore.getState().loginAsDemo('admin');
                    navigate('/dashboard');
                  }}
                 className="px-2 py-2.5 bg-slate-50 hover:bg-slate-800 hover:text-white text-[#0B132B] text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-100"
               >
                 Admin
               </button>
             </div>
           </div>
        </form>
      </div>
    </div>
  );
}
