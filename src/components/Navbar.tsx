import React, { memo, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, MessageSquare, Sun, Moon, Download, Smartphone, X, Share, PlusSquare, AppWindow, Info } from 'lucide-react';
import { useAppStore } from '../store';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';

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

  const [showInstallBtn, setShowInstallBtn] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    setInIframe(window.self !== window.top);

    if (isStandalone) {
      setShowInstallBtn(false);
    } else {
      setShowInstallBtn(true);
    }

    const handlePromptAvailable = () => {
      setShowInstallBtn(true);
    };

    const handleInstalled = () => {
      setShowInstallBtn(false);
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = window.deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
        setShowInstallBtn(false);
      }
    } else {
      setShowManualModal(true);
    }
  };

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
               <div className="hidden md:flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
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
                {showInstallBtn && (
                  <button
                    onClick={handleInstallClick}
                    className="p-1.5 sm:p-2 sm:px-3 sm:rounded-xl rounded-full bg-[#0D5BFF]/10 hover:bg-[#0D5BFF]/20 text-[#0D5BFF] hover:text-[#0D5BFF]/95 transition-all duration-300 hover:scale-105 active:scale-95 border border-[#0D5BFF]/20 flex items-center justify-center gap-1.5 cursor-pointer font-black text-[9px] sm:text-[10px] uppercase tracking-wider shrink-0"
                    title="Install EduTrack App"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">INSTALL APP</span>
                  </button>
                )}
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
                  className="p-1.5 sm:p-2 rounded-full bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-200/30 dark:border-slate-700/30 flex items-center justify-center cursor-pointer"
                  title="Messages"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-[#0B132B] dark:text-white hover:text-white dark:hover:text-white hover:bg-[#0D5BFF] dark:hover:bg-[#0D5BFF] bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200 inline-block"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/dashboard"
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
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 rounded-full transition-all active:scale-95 duration-200 cursor-pointer shrink-0"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3.5">
                {showInstallBtn && (
                  <button
                    onClick={handleInstallClick}
                    className="p-1.5 sm:p-2 sm:px-3 sm:rounded-xl rounded-full bg-[#0D5BFF]/10 hover:bg-[#0D5BFF]/20 text-[#0D5BFF] hover:text-[#0D5BFF]/95 transition-all duration-300 hover:scale-105 active:scale-95 border border-[#0D5BFF]/20 flex items-center justify-center gap-1.5 cursor-pointer font-black text-[9px] sm:text-[10px] uppercase tracking-wider shrink-0"
                    title="Install EduTrack App"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">INSTALL APP</span>
                  </button>
                )}
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
                  className="bg-[#0B132B] dark:bg-[#0D5BFF] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-600 transition-all duration-250 shadow-md shadow-blue-500/10 active:scale-[0.98]"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Installation Instructions Modal inside Navbar */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 bg-[#0B132B]/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#0F172A] w-full max-w-md p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5 text-left"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-[#0D5BFF]">
                    <AppWindow className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-[#0B132B] dark:text-white uppercase tracking-tight">Manual App Installation</h3>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full bg-slate-50 dark:bg-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-slate-600 dark:text-slate-300">
                {inIframe && (
                  <div className="space-y-2 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/40">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Viewing in a Preview Frame
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400/80 leading-normal">
                      PWA installation is restricted inside preview iframes. Please open the app in a new tab first, then click "INSTALL APP"!
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <AppWindow className="w-3.5 h-3.5" />
                      OPEN IN NEW TAB TO DOWNLOAD
                    </a>
                  </div>
                )}

                <p className="text-[10px] font-black uppercase tracking-wider text-[#0D5BFF]">
                  Select the guide for your device type:
                </p>

                {isIOS ? (
                  // iOS Guide
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Apple iOS Safari instructions:</p>
                    <ol className="space-y-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">1</span>
                        <span className="flex items-center gap-1.5">
                          Tap the <span className="bg-white dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800 flex inline-flex items-center"><Share className="w-3.5 h-3.5 text-[#0D5BFF]" /> share button</span> in the Safari browser.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">2</span>
                        <span>Scroll down the share menu list.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">3</span>
                        <span className="flex items-center gap-1.5">
                          Tap <span className="font-bold text-[#0B132B] dark:text-white bg-slate-100 dark:bg-slate-900 p-1 px-1.5 rounded-md flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-[#0D5BFF]" /> "Add to Home Screen"</span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">4</span>
                        <span>Confirm by tapping "Add" in the top-right corner.</span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  // Android / Desktop Guide
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Android / Desktop Instructions:</p>
                    <ol className="space-y-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">1</span>
                        <span>Tap the <b>three dots menu (⋮)</b> in the top right of your browser.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">2</span>
                        <span className="flex items-center gap-1">
                          Select <span className="font-bold text-[#0B132B] dark:text-white bg-slate-100 dark:bg-slate-900 p-1 px-1.5 rounded-md">"Install App"</span> or <span className="font-bold text-[#0B132B] dark:text-white bg-slate-100 dark:bg-slate-900 p-1 px-1.5 rounded-md">"Add to Home screen"</span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">3</span>
                        <span>Accept the system prompt to install EduTrack on your device!</span>
                      </li>
                    </ol>
                  </div>
                )}

                <div className="flex gap-2.5 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100/30 dark:border-blue-900/30">
                  <Info className="w-4 h-4 text-[#0D5BFF] shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#0D5BFF] leading-snug">
                    Installing the application takes under 50KB of storage and lets you open EduTrack instantly from your home screen or dock without typing the URL.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowManualModal(false)}
                className="w-full py-3 bg-[#0D5BFF] hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                GOT IT, CLOSING
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
});

export default Navbar;
