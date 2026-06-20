/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store';
import Navbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import PromotionalBanner from './components/PromotionalBanner';
import DeadlineNotifier from './components/DeadlineNotifier';
import MessageToastCenter from './components/MessageToastCenter';
import GuidedTour from './components/GuidedTour';

import BeautifulSkeleton from './components/BeautifulSkeleton';

// Lazy load pages for better initial bundle size
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const DashboardRouter = lazy(() => import('./pages/DashboardRouter'));
const Messages = lazy(() => import('./pages/Messages'));
const TeacherProfile = lazy(() => import('./pages/TeacherProfile'));

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
  const location = useLocation();

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <LayoutWrapper />
    </Router>
  );
}
