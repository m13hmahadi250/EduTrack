/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';
import { useAppStore, consumePostLoginDestination } from './store';
import { prefetchPage, prefetchMultiple } from './utils/prefetch';
import Navbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import PromotionalBanner from './components/PromotionalBanner';
import DeadlineNotifier from './components/DeadlineNotifier';
import MessageToastCenter from './components/MessageToastCenter';
import GuidedTour from './components/GuidedTour';

import BeautifulSkeleton from './components/BeautifulSkeleton';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

// Lazy load route-level components for optimal bundle splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const DashboardRouter = lazy(() => import('./pages/DashboardRouter'));
const Messages = lazy(() => import('./pages/Messages'));
const TeacherProfile = lazy(() => import('./pages/TeacherProfile'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const LoadingScreen = () => <BeautifulSkeleton />;

/**
 * Global utility to write error tracking records into a secure Firebase collection
 */
async function logErrorToFirebase(error: any, context?: string) {
  try {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const errorDocRef = doc(collection(db, 'error_logs'), errorId);
    
    let message = 'Unknown runtime error';
    let stack = 'No stack trace available';
    
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || stack;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = error.message || JSON.stringify(error);
      stack = error.stack || stack;
    }

    const payload = {
      id: errorId,
      message: `${context ? `[${context}] ` : ''}${message}`.substring(0, 4000),
      stack: stack.substring(0, 12000),
      url: window.location.href.substring(0, 2000),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 1000),
      userId: useAppStore.getState().currentUser?.id || 'anonymous'
    };

    await setDoc(errorDocRef, payload);
    console.log('[Error Tracker] Error logged to secure Firebase:', errorId);
  } catch (err) {
    console.error('[Error Tracker] Failed to log error to Firebase:', err);
  }
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught runtime component error:', error, errorInfo);
    logErrorToFirebase(error, `ComponentBoundary: ${errorInfo.componentStack?.substring(0, 500)}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 animate-pulse">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              An unexpected application error occurred. The incident has been logged and our development team has been notified.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#0D5BFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
            Ref ID: {currentUser.id.substring(0, 12).toUpperCase()}
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
  }, [isInitialized, currentUser]);

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
      console.log('[FCM Bridge] Received token from device:', token);
      if (!token) return;

      localStorage.setItem('fcm_token', token);

      // Call server backend API route
      fetch('/api/save-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })
      .then(res => res.json())
      .then(data => console.log('[FCM Bridge] Server token save response:', data))
      .catch(err => console.warn('[FCM Bridge] Server token save warning:', err));

      // Associate with current user in Firestore if logged in
      const activeUser = useAppStore.getState().currentUser;
      if (activeUser && activeUser.fcmToken !== token) {
        useAppStore.getState().updateUser(activeUser.id, { fcmToken: token });
      }
    };

    return () => {
      delete (window as any).onFcmTokenReceived;
    };
  }, []);

  // Sync token to user document whenever currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      const storedToken = localStorage.getItem('fcm_token');
      if (storedToken && currentUser.fcmToken !== storedToken) {
        useAppStore.getState().updateUser(currentUser.id, { fcmToken: storedToken });
      }
    }
  }, [currentUser]);

  React.useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Avoid infinite loop if Firebase SDK itself fails or is offline
      if (event.message?.includes('Firestore') || event.message?.includes('Firebase')) {
        console.warn('[Error Tracker] Ignored Firebase/Firestore error to prevent recursion:', event.message);
        return;
      }
      logErrorToFirebase(event.error || event.message, 'GlobalError');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && (String(reason).includes('Firestore') || String(reason).includes('Firebase') || (reason.message && (reason.message.includes('Firestore') || reason.message.includes('Firebase'))))) {
        console.warn('[Error Tracker] Ignored Firebase/Firestore unhandled rejection to prevent recursion:', reason);
        return;
      }
      logErrorToFirebase(reason, 'UnhandledPromiseRejection');
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
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B132B] text-[#0B132B] dark:text-[#F8F9FA] flex flex-col font-sans relative transition-colors duration-300">
      <DeadlineNotifier />
      <MessageToastCenter />
      <GuidedTour />
      {!isAuthPage && <PromotionalBanner />}
      {!isAuthPage && <Navbar />}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-3xl"></div>
      </div>
      <main className="flex-grow">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/teachers/:id" element={<TeacherProfile />} />
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
          </Routes>
        </Suspense>
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
    <ErrorBoundary>
      <Router>
        <LayoutWrapper />
      </Router>
    </ErrorBoundary>
  );
}
