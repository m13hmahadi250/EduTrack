import React, { memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, MessageSquare, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store';
import { Logo } from './Logo';
import { motion } from 'motion/react';

const Navbar = memo(() => {
  const { currentUser, logout, theme, toggleTheme } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isHome = location.pathname === '/';
  const currentHash = location.hash;
  const isActive = (hash: string) => {
    if (!isHome) return false;
    if (hash === '#find-tutors') {
      return currentHash === '#find-tutors' || currentHash === '';
    }
    return currentHash === hash;
  };

  return (
    <nav className="z-50 bg-transparent py-4 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Logo className="w-10 h-10" />
              <span 
                className="text-2xl font-black font-heading text-[#0B132B] dark:text-white tracking-tight transition-colors flex cursor-default select-none"
              >
                {"EduTrack".split("").map((char, index) => (
                  <span
                    key={index}
                    className="inline-block origin-bottom animate-logo-letter"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            {!currentUser && (
               <div className="hidden md:flex space-x-8 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                 <Link 
                   to="/#find-tutors" 
                   className={`${isActive('#find-tutors') ? 'text-[#0D5BFF] border-b-2 border-[#0D5BFF]' : 'hover:text-[#0B132B] dark:hover:text-white hover:border-b-2 hover:border-[#0D5BFF]/35'} pb-1 transition-all`}
                 >
                   Find Tutors
                 </Link>
                 <Link 
                   to="/#how-it-works" 
                   className={`${isActive('#how-it-works') ? 'text-[#0D5BFF] border-b-2 border-[#0D5BFF]' : 'hover:text-[#0B132B] dark:hover:text-white hover:border-b-2 hover:border-[#0D5BFF]/35'} pb-1 transition-all`}
                 >
                   How it works
                 </Link>
                 <Link 
                   to="/#safety" 
                   className={`${isActive('#safety') ? 'text-[#0D5BFF] border-b-2 border-[#0D5BFF]' : 'hover:text-[#0B132B] dark:hover:text-white hover:border-b-2 hover:border-[#0D5BFF]/35'} pb-1 transition-all`}
                 >
                   Safety
                 </Link>
               </div>
            )}
            
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="p-2 mr-1 rounded-full bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-300"
                  aria-label="Toggle Theme"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-indigo-600" />
                  )}
                </button>
                <Link to="/messages" className="text-slate-500 hover:text-[#0D5BFF] transition-colors">
                  <MessageSquare className="h-5 w-5" />
                </Link>
                <Link to="/dashboard" className="text-[#0B132B] dark:text-white hover:text-[#0D5BFF] font-bold text-sm transition-colors uppercase">Dashboard</Link>
                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-4 ml-2">
                  <div className="p-0.5 rounded-full border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {currentUser.profileImage ? (
                      <img src={currentUser.profileImage} alt={currentUser.name} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-[#0B132B] dark:text-white hidden sm:block">{currentUser.name}</span>
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
                <button
                  onClick={toggleTheme}
                  className="p-2 mr-1 rounded-full bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-300"
                  aria-label="Toggle Theme"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-indigo-600" />
                  )}
                </button>
                <Link
                  id="sign-in-button"
                  to="/login"
                  className="bg-[#0B132B] dark:bg-[#0D5BFF] text-white dark:text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-blue-600 transition-colors shadow-md"
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
});

export default Navbar;
