import React, { Suspense, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { ShieldAlert, LogOut } from 'lucide-react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

const AdminDashboard = lazyWithRetry(() => import('./dashboard/AdminDashboard'), 'AdminDashboard');
const TutorDashboard = lazyWithRetry(() => import('./dashboard/TutorDashboard'), 'TutorDashboard');
const StudentDashboard = lazyWithRetry(() => import('./dashboard/StudentDashboard'), 'StudentDashboard');

const DashboardLoading = () => (
  <div className="p-8 flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-4 border-[#0D5BFF]/10 border-t-[#0D5BFF] rounded-full animate-spin"></div>
  </div>
);

const BlockedScreen = () => {
  const logout = useAppStore(state => state.logout);
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 text-center" id="blocked-screen-container">
      <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-3xl flex items-center justify-center mb-6 animate-bounce border border-rose-100 dark:border-rose-900/30">
        <ShieldAlert className="w-10 h-10" />
      </div>
      
      <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider italic mb-3">
        Account Suspension Notice
      </h2>
      
      <p className="max-w-md text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase tracking-wide">
        Your account on <span className="font-bold text-blue-600 dark:text-blue-400">EduTrack Bangladesh</span> has been suspended by an administrator due to security directives or policy violations.
      </p>

      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl max-w-sm mb-8 font-mono text-[10px] text-slate-400 flex flex-col gap-1.5 uppercase">
        <span className="font-bold text-slate-500 dark:text-slate-300">Support Inquiry Channels:</span>
        <span>Email: edutrackbangladesh@gmail.com</span>
      </div>

      <button
        onClick={() => logout()}
        className="px-6 py-3 bg-[#0B132B] hover:bg-[#1C2541] dark:bg-blue-600 dark:hover:bg-blue-500 text-white hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl"
      >
        <LogOut className="w-4 h-4" />
        Sign out of Account
      </button>
    </div>
  );
};

const DashboardRouter = memo(function DashboardRouter() {
  const currentUser = useAppStore(state => state.currentUser);
  const location = useLocation();
  const role = currentUser?.role;

  if (!role) return null;

  if (currentUser?.isBlocked) {
    return <BlockedScreen />;
  }

  return (
    <AppErrorBoundary level="dashboard" sectionName={`${role} Dashboard`} resetKey={location.pathname}>
      <Suspense fallback={<DashboardLoading />}>
        {(() => {
          switch (role) {
            case 'admin':
              return <AdminDashboard />;
            case 'tutor':
              return <TutorDashboard />;
            case 'student':
              return <StudentDashboard />;
            default:
              return <div className="p-8">Role not recognized</div>;
          }
        })()}
      </Suspense>
    </AppErrorBoundary>
  );
})

export default DashboardRouter;

