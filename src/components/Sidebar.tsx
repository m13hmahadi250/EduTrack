import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { Logo } from './Logo';
import { motion } from 'motion/react';
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
      { id: 'balance', label: 'Balance', icon: CreditCard, path: '/dashboard/balance' },
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
        { id: 'verifications', label: 'Identity Protocol', icon: Shield, path: '/dashboard/verifications' },
        { id: 'payments', label: 'Inbound Revenue', icon: CreditCard, path: '/dashboard/payments' },
        { id: 'withdrawals', label: 'Tutor Payouts', icon: Wallet, path: '/dashboard/withdrawals' },
        { id: 'account', label: 'Admin Profile', icon: User, path: '/dashboard/account' },
    ] : []),
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/dashboard/messages', badge: totalUnreadMessages },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-full lg:w-80 h-auto min-h-full lg:h-screen bg-white dark:bg-[#111A2E] lg:border-r border-slate-100 dark:border-slate-800/80 flex flex-col p-6 lg:p-8 lg:sticky lg:top-0 transition-colors duration-300">
      {/* Logo */}
      <div 
        onClick={() => navigate('/')}
        className="hidden lg:flex items-center space-x-3 mb-12 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Logo className="w-10 h-10 shadow-lg shadow-blue-200 dark:shadow-none" />
        <span 
          className="text-2xl font-black font-heading text-[#0B132B] dark:text-white transition-colors flex select-none"
        >
          {"EduTrack".split("").map((char, index) => (
            <span
              key={index}
              className="inline-block origin-bottom animate-logo-letter"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {char}
            </span>
          ))}
        </span>
      </div>

      {/* Nav Section */}
      <div className="mb-6">
        <nav className="space-y-2">
          {navItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                onClose?.();
              }}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${
                isActive(item.path) 
                ? 'bg-[#0B132B] dark:bg-[#0D5BFF] text-white shadow-xl shadow-slate-200 dark:shadow-none font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-[#0B132B] dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#0B132B] dark:group-hover:text-white transition-colors'}`} />
              <span className="text-sm font-black uppercase italic tracking-wider flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-[#E51275] text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Theme Mode Toggle Row */}
      <div className="mb-6 p-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center border border-slate-100/60 dark:border-slate-800 transition-colors duration-300">
        <button
          onClick={() => theme === 'dark' && toggleTheme()}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-all ${
            theme === 'light'
              ? 'bg-white text-[#0B132B] shadow-sm font-black'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
          title="Light Mode"
        >
          <Sun className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wider font-heading">Light</span>
        </button>
        <button
          onClick={() => theme === 'light' && toggleTheme()}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-all ${
            theme === 'dark'
              ? 'bg-[#111A2E] text-white shadow-sm font-black'
              : 'text-slate-400 dark:text-slate-500 hover:text-[#0B132B] dark:hover:text-white font-medium'
          }`}
          title="Dark Mode"
        >
          <Moon className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wider font-heading">Dark</span>
        </button>
      </div>

      {/* Profile Status Card - Only for tutors/admins */}
      {currentUser.role !== 'student' && (
        <div className={`mb-4 p-3 rounded-xl border transition-all ${
          currentUser.isVerified 
            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/20' 
            : 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-100/60 dark:border-rose-900/20'
        }`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[8.5px] font-black uppercase tracking-widest ${
              currentUser.isVerified ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'
            }`}>Profile Status</span>
            <Shield className={`w-3.5 h-3.5 ${
              currentUser.isVerified ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400 animate-pulse'
            }`} />
          </div>
          <div className={`text-[10px] font-black uppercase italic ${
            currentUser.isVerified ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
          }`}>
            {currentUser.isVerified ? 'Verified Account' : 'Verification Required'}
          </div>
        </div>
      )}

      {/* User Info & Logout Card */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100/60 dark:border-slate-800/60 transition-colors duration-300">
        <div className="flex items-center space-x-3 truncate">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black italic overflow-hidden">
            {currentUser.profileImage ? (
              <img src={currentUser.profileImage} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-[#0B132B] dark:text-white truncate max-w-[130px] uppercase italic transition-colors leading-normal">{currentUser.name}</div>
            <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors leading-none mt-0.5">
              {currentUser.role === 'tutor' ? 'Teacher' : currentUser.role === 'admin' ? 'Admin' : 'Student'}
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
