import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, MessageSquare } from 'lucide-react';
import { useAppStore } from '../store';

export default function Navbar() {
  const { currentUser, logout } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="z-50 bg-transparent py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#0D5BFF] rounded-lg flex items-center justify-center -skew-x-6">
                <span className="text-white font-heading font-black text-2xl skew-x-6">E</span>
              </div>
              <span className="text-2xl font-black font-heading text-[#0B132B] tracking-tight">EduTrack</span>
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            {!currentUser && (
               <div className="hidden md:flex space-x-8 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                 <Link to="/" className="text-[#0D5BFF] border-b-2 border-[#0D5BFF] pb-1">Find Tutors</Link>
                 <Link to="/" className="hover:text-[#0B132B] transition-colors pb-1">How it works</Link>
                 <Link to="/" className="hover:text-[#0B132B] transition-colors pb-1">Safety</Link>
               </div>
            )}
            
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <Link to="/messages" className="text-slate-500 hover:text-[#0D5BFF] transition-colors">
                  <MessageSquare className="h-5 w-5" />
                </Link>
                <Link to="/dashboard" className="text-[#0B132B] hover:text-[#0D5BFF] font-bold text-sm transition-colors uppercase">Dashboard</Link>
                <div className="flex items-center space-x-2 text-sm text-slate-600 border-l border-slate-200 pl-4 ml-2">
                  <div className="bg-slate-100 p-1.5 rounded-full">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-[#0B132B] hidden sm:block">{currentUser.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="bg-[#0B132B] text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-md"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
