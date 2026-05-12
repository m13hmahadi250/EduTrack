import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { 
  BarChart3, 
  Calendar, 
  CreditCard, 
  Map, 
  User, 
  Shield, 
  LogOut,
  LayoutDashboard,
  Search,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const isTutor = currentUser.role === 'tutor';
  const isStudent = currentUser.role === 'student';
  const isAdmin = currentUser.role === 'admin';

  const navItems = [
    ...(isTutor ? [
      { label: 'Session', icon: Calendar, path: '/dashboard' },
      { label: 'Profile', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isStudent ? [
      { label: 'Find', icon: Search, path: '/dashboard/search' },
      { label: 'Profile', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isAdmin ? [
      { label: 'Shield', icon: Shield, path: '/dashboard' },
      { label: 'Payout', icon: Wallet, path: '/dashboard/withdrawals' },
    ] : []),
    { label: 'Chat', icon: MessageSquare, path: '/messages' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-100 p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#0D5BFF] rounded-lg flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200 text-sm">
             E
          </div>
          <span className="text-lg font-black font-heading text-[#0B132B]">EduTrack</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white p-6" onClick={e => e.stopPropagation()}>
             <Sidebar />
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-y-auto pb-24 lg:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-3 px-6 z-50 flex justify-between items-center shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              navigate(item.path);
              setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive(item.path) ? 'text-[#0D5BFF]' : 'text-slate-400'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="hidden lg:block">
        <NotificationCenter />
      </div>
    </div>
  );
}

const Wallet = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
);
