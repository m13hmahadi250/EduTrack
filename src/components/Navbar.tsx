import React, { memo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  User as UserIcon,
  MessageSquare,
  Sun,
  Moon,
  Menu,
  X,
  LayoutGrid,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '../store';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { prefetchPage } from '../utils/prefetch';
import { useBackHandler } from '../utils/mobileWebView';

const getFormattedName = (fullName: string) => {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/);
  if (words.length === 3) {
    return words[1];
  } else if (words.length === 2) {
    return words[0];
  }
  return words[0] || fullName;
};

const getUserInitials = (fullName: string) => {
  if (!fullName) return 'ET';
  const clean = fullName.trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const Navbar = memo(() => {
  const { currentUser, logout, theme, toggleTheme, messages } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useBackHandler(mobileMenuOpen, () => setMobileMenuOpen(false), 'nav-mobile-menu');
  useBackHandler(profileMenuOpen, () => setProfileMenuOpen(false), 'nav-profile-menu');

  const unreadCount = currentUser
    ? messages.filter(m => m.receiverId === currentUser.id && !m.isRead).length
    : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const isHome = location.pathname === '/';
  const currentHash = location.hash;

  const handleSectionNavigation = (e: React.MouseEvent, targetHash: string) => {
    setMobileMenuOpen(false);
    if (isHome) {
      e.preventDefault();
      if (!targetHash || targetHash === '#top') {
        window.history.replaceState(null, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const id = targetHash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        window.history.replaceState(null, '', `/${targetHash}`);
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isNavActive = (item: 'home' | 'find' | 'become' | 'how' | 'help') => {
    if (item === 'become') return location.pathname === '/signup';
    if (!isHome) return false;
    if (item === 'home') return currentHash === '' || currentHash === '#top';
    if (item === 'find') return currentHash === '#find-tutors';
    if (item === 'how') return currentHash === '#how-it-works';
    if (item === 'help') return currentHash === '#faq' || currentHash === '#safety';
    return false;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 text-[#0B132B] dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-[72px]">
          {/* Left: Original EduTrack Logo & Brand Title */}
          <div className="flex items-center shrink-0">
            <Link
              to="/"
              onClick={(e) => handleSectionNavigation(e, '#top')}
              className="flex items-center space-x-2.5 group"
            >
              <Logo className="w-9 h-9 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform duration-200 shadow-sm shadow-blue-500/15" />
              <span className="text-xl sm:text-2xl font-black font-heading text-[#0B132B] dark:text-white tracking-tight select-none">
                EduTrack
              </span>
            </Link>
          </div>

          {/* Center: Minimal, Professional Navigation Links matching Reference */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Link
              to="/"
              onClick={(e) => handleSectionNavigation(e, '#top')}
              className={`relative py-2 transition-colors duration-200 ${
                isNavActive('home')
                  ? 'text-[#0D5BFF] font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:text-[#0D5BFF] dark:hover:text-blue-400'
              }`}
            >
              Home
              {isNavActive('home') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0D5BFF] rounded-full" />
              )}
            </Link>

            <Link
              to="/#find-tutors"
              onClick={(e) => handleSectionNavigation(e, '#find-tutors')}
              className={`relative py-2 transition-colors duration-200 ${
                isNavActive('find')
                  ? 'text-[#0D5BFF] font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:text-[#0D5BFF] dark:hover:text-blue-400'
              }`}
            >
              Find a Tutor
              {isNavActive('find') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0D5BFF] rounded-full" />
              )}
            </Link>

            <Link
              to={currentUser?.role === 'tutor' ? '/dashboard' : '/signup?role=tutor'}
              onMouseEnter={() => prefetchPage('Signup')}
              className={`relative py-2 transition-colors duration-200 ${
                isNavActive('become')
                  ? 'text-[#0D5BFF] font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:text-[#0D5BFF] dark:hover:text-blue-400'
              }`}
            >
              Become a Tutor
              {isNavActive('become') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0D5BFF] rounded-full" />
              )}
            </Link>

            <Link
              to="/#how-it-works"
              onClick={(e) => handleSectionNavigation(e, '#how-it-works')}
              className={`relative py-2 transition-colors duration-200 ${
                isNavActive('how')
                  ? 'text-[#0D5BFF] font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:text-[#0D5BFF] dark:hover:text-blue-400'
              }`}
            >
              How It Works
              {isNavActive('how') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0D5BFF] rounded-full" />
              )}
            </Link>

            <Link
              to="/#faq"
              onClick={(e) => handleSectionNavigation(e, '#faq')}
              className={`relative py-2 transition-colors duration-200 ${
                isNavActive('help')
                  ? 'text-[#0D5BFF] font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:text-[#0D5BFF] dark:hover:text-blue-400'
              }`}
            >
              Help
              {isNavActive('help') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0D5BFF] rounded-full" />
              )}
            </Link>
          </div>

          {/* Right: Dashboard & User Profile Controls / Auth Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={toggleTheme}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center cursor-pointer"
              aria-label="Toggle Theme"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  to="/messages"
                  onMouseEnter={() => prefetchPage('Messages')}
                  onFocus={() => prefetchPage('Messages')}
                  className="relative p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60 hidden sm:flex items-center justify-center"
                  title="Messages"
                >
                  <MessageSquare className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E51275] text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Dashboard Button matching Reference Screenshot */}
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
                  className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-[#0B132B] dark:text-white hover:border-[#0D5BFF] hover:text-[#0D5BFF] dark:hover:border-blue-400 transition-all shadow-2xs"
                >
                  <LayoutGrid className="w-4 h-4 text-[#0B132B] dark:text-slate-200" />
                  <span>Dashboard</span>
                </Link>

                <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />

                {/* Profile Avatar + Name Dropdown matching Reference Screenshot */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2.5 py-1 px-1.5 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                  >
                    {currentUser.profileImage ? (
                      <img
                        src={currentUser.profileImage}
                        alt={currentUser.name}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0B132B] dark:text-blue-200 font-bold text-xs flex items-center justify-center border border-blue-200/70 dark:border-blue-800/60">
                        {getUserInitials(currentUser.name)}
                      </div>
                    )}
                    <span className="font-semibold text-sm text-[#0B132B] dark:text-white hidden lg:block max-w-[110px] truncate">
                      {getFormattedName(currentUser.name)}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 hidden sm:block" />
                  </button>

                  <AnimatePresence>
                    {profileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50"
                      >
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-[#0B132B] dark:text-white truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {currentUser.email}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" />
                            {currentUser.role === 'tutor' ? 'Tutor Account' : currentUser.role === 'admin' ? 'Administrator' : 'Student Account'}
                          </span>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/dashboard"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <LayoutGrid className="w-4 h-4 text-[#0D5BFF]" />
                            <span>Open Dashboard</span>
                          </Link>
                          <Link
                            to={currentUser.role === 'admin' ? '/dashboard/account' : '/dashboard/profile'}
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <UserIcon className="w-4 h-4 text-slate-500" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            to="/messages"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <span className="flex items-center gap-2.5">
                              <MessageSquare className="w-4 h-4 text-slate-500" />
                              <span>Messages</span>
                            </span>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#E51275] text-white">
                                {unreadCount}
                              </span>
                            )}
                          </Link>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center"
                  aria-label="Toggle Mobile Menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5 text-rose-500" /> : <Menu className="w-5 h-5 text-[#0D5BFF]" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  id="sign-in-button"
                  to="/login"
                  onMouseEnter={() => prefetchPage('Login')}
                  onFocus={() => prefetchPage('Login')}
                  className="bg-[#0D5BFF] hover:bg-blue-700 text-white px-4 sm:px-5 min-h-[44px] inline-flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm shadow-blue-500/20 active:scale-[0.98]"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center"
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
            className="md:hidden overflow-hidden bg-white dark:bg-[#0B132B] border-b border-slate-200 dark:border-slate-800 px-5 py-5 shadow-xl"
          >
            <div className="flex flex-col space-y-2.5 font-sans">
              <Link
                to="/"
                onClick={(e) => handleSectionNavigation(e, '#top')}
                className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
              >
                Home
              </Link>
              <Link
                to="/#find-tutors"
                onClick={(e) => handleSectionNavigation(e, '#find-tutors')}
                className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
              >
                Find a Tutor
              </Link>
              <Link
                to={currentUser?.role === 'tutor' ? '/dashboard' : '/signup?role=tutor'}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
              >
                Become a Tutor
              </Link>
              <Link
                to="/#how-it-works"
                onClick={(e) => handleSectionNavigation(e, '#how-it-works')}
                className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
              >
                How It Works
              </Link>
              <Link
                to="/#faq"
                onClick={(e) => handleSectionNavigation(e, '#faq')}
                className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
              >
                Help
              </Link>

              {!currentUser ? (
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-[#0D5BFF] text-white font-bold text-sm rounded-xl shadow-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-[#0B132B] dark:bg-white text-white dark:text-[#0B132B] font-bold text-sm rounded-xl"
                  >
                    Create Account
                  </Link>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#0D5BFF]/10 text-[#0D5BFF] font-bold text-sm border border-[#0D5BFF]/30 flex items-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Dashboard ({currentUser.role})</span>
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
                  >
                    Messages {unreadCount > 0 ? `(${unreadCount})` : ''}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-500/20"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
});

export default Navbar;
