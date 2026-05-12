/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardRouter from './pages/DashboardRouter';
import Messages from './pages/Messages';
import DashboardLayout from './components/DashboardLayout';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const currentUser = useAppStore(state => state.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function LayoutWrapper() {
  const { isLoading, currentUser } = useAppStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-[6px] border-[#0D5BFF]/10 border-t-[#0D5BFF] rounded-full animate-spin mb-4"></div>
          <p className="text-[#0B132B] font-black uppercase tracking-widest text-[10px]">Loading EduTrack</p>
        </div>
      </div>
    );
  }

  const isAuthPage = location.pathname.startsWith('/dashboard') || location.pathname === '/messages';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0B132B] flex flex-col font-sans relative">
      {!isAuthPage && <Navbar />}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-3xl"></div>
      </div>
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
