import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, X, Check, Info, Share, PlusSquare, ArrowUp, Laptop, AppWindow } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();
    setInIframe(window.self !== window.top);

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);
    setIsIOS(ios);
    setIsAndroid(android);

    // If already standalone (installed), do not show any prompt
    if (standalone) {
      return;
    }

    // Check if we captured the prompt already
    if (window.deferredPrompt) {
      setIsInstallable(true);
      const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    // Event listeners for custom PWA events from main.tsx
    const handlePromptAvailable = () => {
      setIsInstallable(true);
      const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    const handleInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    // Also fallback: on devices without beforeinstallprompt (like inside frames, iOS, or some browsers),
    // we still suggest manually installing if they haven't dismissed it yet
    const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    if (!dismissed) {
      // Show PWA suggestion for users after 4 seconds
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = window.deferredPrompt;
    if (promptEvent) {
      // Show the install prompt
      promptEvent.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await promptEvent.userChoice;
      console.log(`PWA install prompt user outcome: ${outcome}`);
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
        setIsInstallable(false);
        setShowBanner(false);
      }
    } else {
      // No automated install prompt, show manual instructions (e.g. for iOS Safari or other browsers)
      setShowInstructions(true);
    }
  };

  const dismissPrompt = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowBanner(false);
  };

  if (isStandalone) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-[#0B132B] text-white p-5 rounded-[2rem] border border-slate-800 shadow-2xl shadow-blue-500/10"
          >
            <div className="flex gap-4">
              <div className="bg-[#0D5BFF]/10 text-[#0D5BFF] p-3.5 rounded-2xl shrink-0 self-start border border-[#0D5BFF]/20">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Install Mobile App</h4>
                  <button 
                    onClick={dismissPrompt} 
                    className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 rounded-full hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-sm font-black tracking-tight leading-tight uppercase">EduTrack - On Your Home Screen</h3>
                <p className="text-[10px] text-slate-400 leading-normal font-medium uppercase tracking-wider">
                  Access live tutor search, GPS trackers, and offline support with zero latency.
                </p>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-[#0D5BFF] hover:bg-blue-600 active:scale-95 text-white py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {window.deferredPrompt ? 'INSTALL APP NOW' : 'HOW TO INSTALL'}
                  </button>
                  <button
                    onClick={dismissPrompt}
                    className="px-3.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-800 transition-colors cursor-pointer"
                  >
                    LATER
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Installation Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 bg-[#0B132B]/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#0F172A] w-full max-w-md p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-[#0D5BFF]">
                    <AppWindow className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-[#0B132B] dark:text-white uppercase tracking-tight">Manual App Installation</h3>
                </div>
                <button
                  onClick={() => setShowInstructions(false)}
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
                onClick={() => setShowInstructions(false)}
                className="w-full py-3 bg-[#0D5BFF] hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                GOT IT, CLOSING
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
