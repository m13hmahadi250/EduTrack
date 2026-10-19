import React, { memo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, MessageSquare, Sun, Moon, Menu, X } from 'lucide-react';
import { useAppStore } from '../store';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { prefetchPage } from '../utils/prefetch';

const getFormattedName = (fullName: string) => {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/);
  if (words.length === 3) {
    return words[1];
  } else if (words.length === 2) {
    return words[0];
  }
  return fullName;
};

const Navbar = memo(() => {
  const { currentUser, logout, theme, toggleTheme } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
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
    <nav className="sticky top-0 z-50 bg-white/70 dark:bg-[#0B132B]/80 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-800/40 py-2.5 text-slate-800 dark:text-slate-100 transition-all duration-300 shadow-sm shadow-slate-100/5 dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              onClick={(e) => {
                if (isHome) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center space-x-1.5 group"
            >
              <Logo className="w-8 h-8 sm:w-10 sm:h-10 group-hover:rotate-6 transition-transform duration-300" />
              <span 
                className="text-base sm:text-2xl font-black font-heading text-[#0B132B] dark:text-white tracking-tight transition-colors flex cursor-default select-none"
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
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {!currentUser && (
               <div className="hidden md:flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                 <Link 
                   to="/#find-tutors" 
                   className={`${isActive('#find-tutors') ? 'text-[#0D5BFF] bg-blue-50/70 dark:bg-blue-950/20' : 'hover:text-[#0B132B] dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/30'} px-4 py-2 rounded-xl transition-all duration-200`}
                 >
                   Find Tutors
                 </Link>
                 <Link 
                   to="/#how-it-works" 
                   className={`${isActive('#how-it-works') ? 'text-[#0D5BFF] bg-blue-50/70 dark:bg-blue-950/20' : 'hover:text-[#0B132B] dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/30'} px-4 py-2 rounded-xl transition-all duration-200`}
                 >
                   How it works
                 </Link>
                 <Link 
                   to="/#safety" 
                   className={`${isActive('#safety') ? 'text-[#0D5BFF] bg-blue-50/70 dark:bg-blue-950/20' : 'hover:text-[#0B132B] dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/30'} px-4 py-2 rounded-xl transition-all duration-200`}
                 >
                   Safety
                 </Link>
               </div>
            )}
            
            {currentUser ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2.5">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 sm:p-2 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-200/30 dark:border-slate-700/30 flex items-center justify-center cursor-pointer"
                  aria-label="Toggle Theme"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-3.5 w-3.5 text-amber-500 animate-spin-slow" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-[#0D5BFF]" />
                  )}
                </button>
                 <Link 
                  to="/messages" 
                  onMouseEnter={() => prefetchPage('Messages')}
                  onFocus={() => prefetchPage('Messages')}
                  className="p-1.5 sm:p-2 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-200/30 dark:border-slate-700/30 flex items-center justify-center cursor-pointer"
                  title="Messages"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Link>
                <Link 
                  to="/dashboard" 
                  onMouseEnter={() => {
                    prefetchPage('DashboardRouter');
                    if (currentUser?.role === 'admin') prefetchPage('AdminDashboard');
                    if (currentUser?.role === 'tutor') prefetchPage('TutorDashboard');
                    if (currentUser?.role === 'student') prefetchPage('StudentDashboard');
                  }}
                  onFocus={() => {
                    prefetchPage('DashboardRouter');
                    if (currentUser?.role === 'admin') prefetchPage('AdminDashboard');
                    if (currentUser?.role === 'tutor') prefetchPage('TutorDashboard');
                    if (currentUser?.role === 'student') prefetchPage('StudentDashboard');
                  }}
                  className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-[#0B132B] dark:text-white hover:text-white dark:hover:text-white hover:bg-[#0D5BFF] dark:hover:bg-[#0D5BFF] bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200 inline-block"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/dashboard"
                  onMouseEnter={() => {
                    prefetchPage('DashboardRouter');
                    if (currentUser?.role === 'admin') prefetchPage('AdminDashboard');
                    if (currentUser?.role === 'tutor') prefetchPage('TutorDashboard');
                    if (currentUser?.role === 'student') prefetchPage('StudentDashboard');
                  }}
                  onFocus={() => {
                    prefetchPage('DashboardRouter');
                    if (currentUser?.role === 'admin') prefetchPage('AdminDashboard');
                    if (currentUser?.role === 'tutor') prefetchPage('TutorDashboard');
                    if (currentUser?.role === 'student') prefetchPage('StudentDashboard');
                  }}
                  className="flex items-center space-x-1 sm:space-x-2 text-xs text-slate-600 dark:text-slate-400 border-l border-slate-200/85 dark:border-slate-800 pl-2 sm:pl-3.5 ml-0.5 shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#0D5BFF] to-blue-400 overflow-hidden shadow-sm flex-shrink-0">
                    {currentUser.profileImage ? (
                      <img src={currentUser.profileImage} alt={currentUser.name} className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover border border-white dark:border-[#111A2E]" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full text-slate-600 dark:text-slate-300">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-[#0B132B] dark:text-white hidden lg:block max-w-[100px] truncate hover:text-[#0D5BFF] transition-colors">{getFormattedName(currentUser.name)}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 rounded-full transition-all active:scale-95 duration-200 cursor-pointer shrink-0 hidden sm:flex"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 sm:p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200/30 dark:border-slate-700/30 ml-1"
                  aria-label="Toggle Mobile Menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4 text-rose-500" /> : <Menu className="w-4 h-4 text-[#0D5BFF]" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-200/30 dark:border-slate-700/30 flex items-center justify-center cursor-pointer"
                  aria-label="Toggle Theme"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500 animate-spin-slow" />
                  ) : (
                    <Moon className="h-4 w-4 text-[#0D5BFF]" />
                  )}
                </button>
                <Link
                  id="sign-in-button"
                  to="/login"
                  onMouseEnter={() => prefetchPage('Login')}
                  onFocus={() => prefetchPage('Login')}
                  className="bg-[#0B132B] dark:bg-[#0D5BFF] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-600 transition-all duration-250 shadow-md shadow-blue-500/10 active:scale-[0.98]"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
                  aria-label="Toggle Mobile Menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5 text-rose-500" /> : <Menu className="w-5 h-5 text-[#0D5BFF]" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-6 shadow-2xl"
          >
            <div className="flex flex-col space-y-3 font-sans">
              {!currentUser ? (
                <>
                  <Link
                    to="/#find-tutors"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 hover:border-[#0D5BFF]"
                  >
                    Find Tutors
                  </Link>
                  <Link
                    to="/#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 hover:border-[#0D5BFF]"
                  >
                    How it works
                  </Link>
                  <Link
                    to="/#safety"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 hover:border-[#0D5BFF]"
                  >
                    Safety
                  </Link>
                  <div className="pt-2 flex flex-col gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-3 bg-[#0D5BFF] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md shadow-blue-500/20"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl"
                    >
                      Create Account
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-[#0D5BFF]/10 text-[#0D5BFF] font-black text-xs uppercase tracking-wider border border-[#0D5BFF]/30"
                  >
                    Go to Dashboard ({currentUser.role})
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
                  >
                    Messages
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider border border-rose-500/20"
                  >
                    Sign Out Account
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
});

export default Navbar;
