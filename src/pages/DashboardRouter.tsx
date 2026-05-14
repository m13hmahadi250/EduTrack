import React, { lazy, Suspense } from 'react';
import { useAppStore } from '../store';

const AdminDashboard = lazy(() => import('./dashboard/AdminDashboard'));
const TutorDashboard = lazy(() => import('./dashboard/TutorDashboard'));
const StudentDashboard = lazy(() => import('./dashboard/StudentDashboard'));

const DashboardLoading = () => (
  <div className="p-8 flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-4 border-[#0D5BFF]/10 border-t-[#0D5BFF] rounded-full animate-spin"></div>
  </div>
);

export default function DashboardRouter() {
  const role = useAppStore(state => state.currentUser?.role);

  if (!role) return null;

  return (
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
  );
}
