import { useAppStore } from '../store';
import AdminDashboard from './dashboard/AdminDashboard';
import TutorDashboard from './dashboard/TutorDashboard';
import StudentDashboard from './dashboard/StudentDashboard';

export default function DashboardRouter() {
  const currentUser = useAppStore(state => state.currentUser);

  if (!currentUser) return null;

  switch (currentUser.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'tutor':
      return <TutorDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <div className="p-8">Role not recognized</div>;
  }
}
