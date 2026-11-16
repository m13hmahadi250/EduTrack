/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';
import { useAppStore, consumePostLoginDestination } from './store';
import { auth } from './lib/firebase';
import { reportProductionError, isChunkOrModuleLoadError } from './lib/errorMonitoring';
import { lazyWithRetry, clearChunkReloadState, performBoundedChunkRecovery } from './utils/lazyWithRetry';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { prefetchPage, prefetchMultiple } from './utils/prefetch';
import { getCurrentAccuratePosition, watchAccuratePosition } from './utils/geocoding';
import Navbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import PromotionalBanner from './components/PromotionalBanner';
import DeadlineNotifier from './components/DeadlineNotifier';
import MessageToastCenter from './components/MessageToastCenter';
import GuidedTour from './components/GuidedTour';
import OfflineIndicator from './components/OfflineIndicator';

import BeautifulSkeleton from './components/BeautifulSkeleton';

// Lazy load route-level components with automatic transient retry & post-deploy chunk recovery
const Home = lazyWithRetry(() => import('./pages/Home'), 'Home');
const Login = lazyWithRetry(() => import('./pages/Login'), 'Login');
const Signup = lazyWithRetry(() => import('./pages/Signup'), 'Signup');
const DashboardRouter = lazyWithRetry(() => import('./pages/DashboardRouter'), 'DashboardRouter');
const Messages = lazyWithRetry(() => import('./pages/Messages'), 'Messages');
const TeacherProfile = lazyWithRetry(() => import('./pages/TeacherProfile'), 'TeacherProfile');
const TuitionDetail = lazyWithRetry(() => import('./pages/TuitionDetail'), 'TuitionDetail');
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'), 'ResetPassword');

const LoadingScreen = () => <BeautifulSkeleton />;

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const currentUser = useAppStore(state => state.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  
  // @ts-ignore
  if (currentUser.isBlocked) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-10 shadow-2xl uppercase">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30 animate-pulse">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black italic text-rose-500 tracking-wider mb-2">Account suspended</h2>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest leading-relaxed mb-6">
            Your login token has been frozen due to compliance or terms of service issues.
          </p>
          <div className="text-[9px] font-black text-[#0D5BFF] tracking-widest mb-6">
            Ref ID: {(currentUser.id || 'USER').substring(0, 12).toUpperCase()}
          </div>
          <button 
            type="button"
            onClick={() => useAppStore.getState().logout()}
            className="w-full px-6 py-4 bg-slate-800 hover:bg-rose-600 text-white rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all shadow-md cursor-pointer border border-transparent"
          >
            Log Out Account
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function LayoutWrapper() {
  const isInitialized = useAppStore(state => state.isInitialized);
  const theme = useAppStore(state => state.theme);
  const isLoggingOut = useAppStore(state => state.isLoggingOut);
  const currentUser = useAppStore(state => state.currentUser);
  const location = useLocation();
  const navigate = useNavigate();

  // Clear any temporary chunk-reload guard once the app has mounted and rendered cleanly
  React.useEffect(() => {
    const timer = setTimeout(() => {
      clearChunkReloadState();
    }, 3000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  React.useEffect(() => {
    if (isInitialized) {
      // Idle pre-fetching for high-traffic entry points
      if (!currentUser) {
        prefetchMultiple(['Login', 'Signup']);
      } else {
        prefetchMultiple(['DashboardRouter', 'Messages']);
        if (currentUser.role === 'admin') prefetchPage('AdminDashboard');
        if (currentUser.role === 'tutor') prefetchPage('TutorDashboard');
        if (currentUser.role === 'student') prefetchPage('StudentDashboard');
      }
    }
  }, [isInitialized, currentUser?.id, currentUser?.role]);

  React.useEffect(() => {
    if (currentUser && (location.pathname === '/login' || location.pathname === '/signup')) {
      const targetDest = consumePostLoginDestination('/dashboard');
      navigate(targetDest, { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  React.useEffect(() => {
    if (isLoggingOut) {
      // Direct routing back to home screen immediately on logout to sync backdrop
      navigate('/', { replace: true });
    }
  }, [isLoggingOut, navigate]);

  // Set up global FCM token receiver callback to bridge with Android App or other senders
  React.useEffect(() => {
    (window as any).onFcmTokenReceived = (token: string) => {
      if (!token) return;

      try {
        localStorage.setItem('fcm_token', token);
      } catch {}

      // Call server backend API route
      fetch('/api/save-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })
      .then(res => res.json())
      .catch(err => console.warn('[FCM Bridge] Server token save warning:', err));

      // Associate with current user in Firestore if authenticated
      const activeUser = useAppStore.getState().currentUser;
      if (activeUser && auth.currentUser?.uid === activeUser.id && activeUser.fcmToken !== token) {
        useAppStore.getState().updateUser(activeUser.id, { fcmToken: token }).catch(() => {});
      }
    };

    return () => {
      delete (window as any).onFcmTokenReceived;
    };
  }, []);

  // Sync token to user document only after Firebase Auth token is restored for this user
  React.useEffect(() => {
    if (currentUser?.id && auth.currentUser?.uid === currentUser.id) {
      try {
        const storedToken = localStorage.getItem('fcm_token');
        if (storedToken && currentUser.fcmToken !== storedToken) {
          useAppStore.getState().updateUser(currentUser.id, { fcmToken: storedToken }).catch(() => {});
        }
      } catch {}
    }
  }, [currentUser?.id, currentUser?.fcmToken]);

  // Active Presence Lifecycle Sync (without unconditional background GPS tracking)
  React.useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;

    // 1. Mark user online on active mount
    useAppStore.getState().setUserActiveStatus(userId, true);

    // 2. Tab visibility and browser close lifecycle handlers
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        useAppStore.getState().setUserActiveStatus(userId, false);
      } else if (document.visibilityState === 'visible') {
        useAppStore.getState().setUserActiveStatus(userId, true);
      }
    };

    const handleBeforeUnload = () => {
      useAppStore.getState().setUserActiveStatus(userId, false);
    };

    // 3. Inactivity timer (marks user inactive if idle for 8 mins)
    let idleTimer: any = null;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const currentOnline = useAppStore.getState().currentUser?.isOnline;
      if (currentOnline === false && document.visibilityState === 'visible') {
        useAppStore.getState().setUserActiveStatus(userId, true);
      }
      idleTimer = setTimeout(() => {
        useAppStore.getState().setUserActiveStatus(userId, false);
      }, 8 * 60 * 1000);
    };

    resetIdleTimer();

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    const onUserActivity = () => {
      resetIdleTimer();
    };

    activityEvents.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, onUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id]);

  // Phase 8 GPS Privacy & Safety: Only watch GPS coordinates when a Tutor has explicitly enabled live tracking (isTrackingOn === true)
  React.useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'tutor' || !currentUser.isTrackingOn) return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const userId = currentUser.id;
    let lastUpdate = 0;

    getCurrentAccuratePosition(
      (pos) => {
        lastUpdate = Date.now();
        useAppStore.getState().updateLocation(userId, pos.coords.latitude, pos.coords.longitude);
      },
      () => {}
    );

    const watchId = watchAccuratePosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdate > 30000) {
          lastUpdate = now;
          useAppStore.getState().updateLocation(userId, pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => {}
    );

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (e) {}
      }
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.isTrackingOn]);

  React.useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const targetError = event.error || event.message;
      if (isChunkOrModuleLoadError(targetError)) {
        void performBoundedChunkRecovery();
      }
      void reportProductionError(targetError, {
        section: 'window.onerror',
        userId: useAppStore.getState().currentUser?.id,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (isChunkOrModuleLoadError(reason)) {
        event.preventDefault();
        void performBoundedChunkRecovery();
      }
      void reportProductionError(reason, {
        category: isChunkOrModuleLoadError(reason) ? 'CHUNK_LOAD_ERROR' : 'UNHANDLED_REJECTION',
        section: 'window.onunhandledrejection',
        userId: useAppStore.getState().currentUser?.id,
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  const isAuthPage = location.pathname.startsWith('/dashboard') || location.pathname === '/messages';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B132B] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col font-sans relative transition-colors duration-200">
      <OfflineIndicator />
      <AppErrorBoundary level="widget" sectionName="Notifications">
        <DeadlineNotifier />
        <MessageToastCenter />
        <GuidedTour />
      </AppErrorBoundary>
      {!isAuthPage && <PromotionalBanner />}
      {!isAuthPage && <Navbar />}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-3xl"></div>
      </div>
      <main className="flex-grow">
        <AppErrorBoundary level="route" sectionName="Page Content" resetKey={location.pathname}>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/teachers/:id" element={<TeacherProfile />} />
              <Route path="/tuitions/:id" element={<TuitionDetail />} />
              <Route path="/tuitions" element={<Navigate to="/#curriculums" replace />} />
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </main>

      {/* Premium Fullscreen Logout Transition Overlay */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] bg-[#0B132B]/95 flex flex-col items-center justify-center p-6 backdrop-blur-md"
          >
            <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-[#0D5BFF]/15 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 100, damping: 15 }}
              className="max-w-md w-full bg-slate-900/80 border border-slate-800/80 rounded-[3rem] p-12 text-center shadow-3xl flex flex-col items-center justify-center relative overflow-hidden"
            >
              {/* Glowing ring animation with custom rotation */}
              <div className="relative mb-8 w-24 h-24 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-t-[#0D5BFF] border-b-emerald-500 border-x-transparent"
                />
                <div className="w-16 h-16 bg-slate-800/90 rounded-full flex items-center justify-center border border-slate-700/50 shadow-inner">
                  <LogOut className="w-6 h-6 text-emerald-400 rotate-180 animate-pulse" />
                </div>
              </div>

              <h3 className="text-xl font-black text-white uppercase italic tracking-wider mb-2">
                Session Closing
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Securing Transit Logs
              </p>

              <p className="text-xs font-bold text-slate-300 tracking-wide leading-relaxed max-w-[280px]">
                Saving session metrics and clearing secure tracking credentials. Returning you home...
              </p>

              {/* Progress dynamic dots */}
              <div className="flex items-center gap-2 mt-8">
                <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary level="app" sectionName="EduTrack Application">
      <Router>
        <LayoutWrapper />
      </Router>
    </AppErrorBoundary>
  );
}

