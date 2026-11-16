import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { Logo } from './Logo';
import { motion } from 'motion/react';
import { prefetchPage } from '../utils/prefetch';
import UserAvatar from './UserAvatar';
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
  Wallet,
  Sun,
  Moon,
  Users,
  Clock,
  MapPin,
  Award,
  Activity
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = memo(({ onClose }: SidebarProps) => {
  const { currentUser, messages, logout, theme, toggleTheme } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

  const totalUnreadMessages = messages.filter(m => m.receiverId === currentUser.id && !m.isRead).length;

  const isAdmin = currentUser.role === 'admin';
  const isTutor = currentUser.role === 'tutor';
  const isStudent = currentUser.role === 'student';

  const navItems = [
    ...(isTutor ? [
      { id: 'my_session', label: 'My Session', icon: Clock, path: '/dashboard' },
      { id: 'find_students', label: 'Find Students', icon: Search, path: '/dashboard/find-students' },
      { id: 'balance', label: 'Pay', icon: CreditCard, path: '/dashboard/balance' },
      { id: 'transit_mode', label: 'Location Track', icon: MapPin, path: '/dashboard/transit' },
      { id: 'pro_profile', label: 'Pro Profile', icon: Award, path: '/dashboard/profile' },
    ] : []),
    ...(isStudent ? [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'find', label: 'Find Tutor', icon: Search, path: '/dashboard/search' },
        { id: 'activity', label: 'Activity Log', icon: Activity, path: '/dashboard/activity' },
        { id: 'account', label: 'My Account', icon: Award, path: '/dashboard/profile' },
    ] : []),
    ...(isAdmin ? [
        { id: 'users', label: 'User Directory', icon: Users, path: '/dashboard' },
        { id: 'map', label: 'Geo Map Tracker', icon: MapPin, path: '/dashboard/map' },
        { id: 'verifications', label: 'Identity Protocol', icon: Shield, path: '/dashboard/verifications' },
        { id: 'payments', label: 'Inbound Revenue', icon: CreditCard, path: '/dashboard/payments' },
        { id: 'withdrawals', label: 'Tutor Payouts', icon: Wallet, path: '/dashboard/withdrawals' },
        { id: 'account', label: 'Admin Profile', icon: User, path: '/dashboard/account' },
    ] : []),
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages', badge: totalUnreadMessages },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-full lg:w-72 h-auto min-h-full lg:h-screen bg-white dark:bg-[#111A2E] lg:border-r border-slate-100 dark:border-slate-800/80 flex flex-col p-4 lg:p-5 lg:sticky lg:top-0 transition-colors duration-200">
      {/* Logo */}
      <div 
        onClick={() => navigate('/')}
        className="hidden lg:flex items-center space-x-2.5 mb-6 cursor-pointer group w-fit"
      >
        <Logo className="w-9 h-9 shadow-sm shadow-blue-500/15 dark:shadow-none group-hover:shadow-md group-hover:shadow-blue-500/20" />
        <span className="text-xl font-black font-heading text-[#0B132B] dark:text-white tracking-tight select-none transition-colors duration-200 group-hover:text-[#0D5BFF] dark:group-hover:text-blue-400">
          EduTrack
        </span>
      </div>

      {/* Nav Section */}
      <div className="mb-5">
        <nav className="space-y-1.5">
          {navItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                onClose?.();
              }}
              onMouseEnter={() => {
                if (item.path === '/messages') {
                  prefetchPage('Messages');
                } else if (item.path.startsWith('/dashboard')) {
                  prefetchPage('DashboardRouter');
                  if (currentUser?.role === 'admin') prefetchPage('AdminDashboard');
                  else if (currentUser?.role === 'tutor') prefetchPage('TutorDashboard');
                  else if (currentUser?.role === 'student') prefetchPage('StudentDashboard');
                }
              }}
              onFocus={() => {
                if (item.path === '/messages') {
                  prefetchPage('Messages');
                } else if (item.path.startsWith('/dashboard')) {
                  prefetchPage('DashboardRouter');
                  if (currentUser?.role === 'admin') prefetchPage('AdminDashboard');
                  else if (currentUser?.role === 'tutor') prefetchPage('TutorDashboard');
                  else if (currentUser?.role === 'student') prefetchPage('StudentDashboard');
                }
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors transition-transform duration-150 active:scale-[0.98] group relative cursor-pointer ${
                isActive(item.path) 
                ? 'bg-[#0B132B] dark:bg-[#0D5BFF] text-white shadow-md shadow-slate-200/80 dark:shadow-none font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-[#0B132B] dark:hover:text-white font-semibold'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.path) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#0B132B] dark:group-hover:text-white transition-colors duration-150'}`} />
              <span className="text-[13px] font-extrabold uppercase tracking-wider flex-1 text-left truncate">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-[#E51275] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Theme Mode Toggle Row */}
      <div className="mb-4 p-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center border border-slate-100/80 dark:border-slate-800 transition-colors duration-200">
        <button
          onClick={() => theme === 'dark' && toggleTheme()}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-colors duration-150 cursor-pointer ${
            theme === 'light'
              ? 'bg-white text-[#0B132B] shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 font-semibold'
          }`}
          title="Light Mode"
        >
          <Sun className="w-3.5 h-3.5" />
          <span className="text-[11px] uppercase tracking-wider font-heading">Light</span>
        </button>
        <button
          onClick={() => theme === 'light' && toggleTheme()}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-colors duration-150 cursor-pointer ${
            theme === 'dark'
              ? 'bg-[#111A2E] text-white shadow-xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white font-semibold'
          }`}
          title="Dark Mode"
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="text-[11px] uppercase tracking-wider font-heading">Dark</span>
        </button>
      </div>

      {/* Profile Status Card - Only for tutors/admins */}
      {currentUser.role !== 'student' && (
        <div className={`mb-4 p-3 rounded-xl border transition-colors duration-200 ${
          currentUser.isVerified 
            ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-100/80 dark:border-emerald-900/30' 
            : 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-100/80 dark:border-rose-900/30'
        }`}>
          <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              currentUser.isVerified ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}>Profile Status</span>
            <Shield className={`w-3.5 h-3.5 ${
              currentUser.isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`} />
          </div>
          <div className={`text-xs font-extrabold ${
            currentUser.isVerified ? 'text-emerald-950 dark:text-emerald-200' : 'text-rose-950 dark:text-rose-200'
          }`}>
            {currentUser.isVerified ? 'Verified Account' : 'Verification Required'}
          </div>
        </div>
      )}

      {/* User Info & Logout Card */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100/60 dark:border-slate-800/60 transition-colors duration-300">
        <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
          <UserAvatar
            src={currentUser.profileImage}
            name={currentUser.name}
            className="w-10 h-10 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40"
            fallbackClassName="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
            textClassName="text-sm font-black"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#0B132B] dark:text-white break-words leading-snug transition-colors">{currentUser.name}</div>
            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-colors leading-none mt-1">
              {currentUser.role === 'tutor'
                ? 'Teacher'
                : currentUser.role === 'admin'
                ? 'Admin'
                : currentUser.accountType === 'guardian'
                ? 'Guardian'
                : 'Student'}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 transition-all duration-300 group flex-shrink-0"
          title="Logout"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
});

export default Sidebar;
