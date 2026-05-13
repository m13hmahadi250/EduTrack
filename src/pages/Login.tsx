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
                   setError(err.message || 'Google Auth failed');
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
