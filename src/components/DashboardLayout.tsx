import React, { useState, useMemo, memo } from 'react';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { Logo } from './Logo';
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
  X,
  Users,
  Sun,
  Moon,
  Wallet
} from 'lucide-react';
import { useBackHandler, useVirtualKeyboardOpen } from '../utils/mobileWebView';

const DashboardLayout = memo(function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, theme, toggleTheme, messages } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isKeyboardOpen = useVirtualKeyboardOpen();
  useBackHandler(isMobileMenuOpen, () => setIsMobileMenuOpen(false), 'dashboard-drawer');

  const isTutor = currentUser?.role === 'tutor';
  const isStudent = currentUser?.role === 'student';
  const isAdmin = currentUser?.role === 'admin';
  const currentUserId = currentUser?.id || '';

  const totalUnreadMessages = useMemo(
    () =>
      currentUserId && Array.isArray(messages)
        ? messages.filter((m) => m && m.receiverId === currentUserId && !m.isRead).length
        : 0,
    [messages, currentUserId]
  );

  const navItems = useMemo(() => [
    ...(isTutor ? [
      { label: 'Session', icon: Calendar, path: '/dashboard' },
      { label: 'Students', icon: Users, path: '/dashboard/find-students' },
      { label: 'Chat', icon: MessageSquare, path: '/messages', badge: totalUnreadMessages },
      { label: 'Profile', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isStudent ? [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Tutors', icon: Search, path: '/dashboard/search' },
      { label: 'Chat', icon: MessageSquare, path: '/messages', badge: totalUnreadMessages },
      { label: 'Profile', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isAdmin ? [
      { label: 'Shield', icon: Shield, path: '/dashboard' },
      { label: 'Payouts', icon: Wallet, path: '/dashboard/withdrawals' },
      { label: 'Chat', icon: MessageSquare, path: '/messages', badge: totalUnreadMessages },
      { label: 'Revenue', icon: CreditCard, path: '/dashboard/payments' },
    ] : []),
  ], [isTutor, isStudent, isAdmin, totalUnreadMessages]);

  if (!currentUser) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] dark:bg-[#0B132B] flex-col lg:flex-row transition-colors duration-300 select-none sm:select-auto">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Native Mobile App Header Bar */}
      <div className="lg:hidden bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-4 py-2.5 sticky top-0 z-40 flex items-center justify-between shadow-xs transition-colors pt-safe">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2.5 cursor-pointer group active:scale-95 transition-transform duration-150"
        >
          <Logo className="w-8 h-8 shadow-sm shadow-blue-500/15 dark:shadow-none" />
          <div className="flex flex-col">
            <span className="text-base font-black font-heading text-[#0B132B] dark:text-white leading-tight">
              EduTrack
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider -mt-0.5">
              {currentUser.role} App
            </span>
          </div>
        </div>

        {/* Right Header Mobile Quick Controls */}
        <div className="flex items-center space-x-1">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Toggle Theme"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>

          {/* Quick Chat Shortcut with Badge */}
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="relative min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Messages"
          >
            <MessageSquare className="w-5 h-5" />
            {totalUnreadMessages > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E51275] rounded-full border-2 border-white dark:border-[#111A2E]" />
            )}
          </button>

          {/* Mobile Menu Drawer Toggle Button */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="min-w-[44px] min-h-[44px] p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl active:scale-95 transition-transform duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Open App Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sheet / Drawer */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 flex flex-col justify-end" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-full max-h-[85dvh] pb-safe bg-white dark:bg-[#111A2E] rounded-t-3xl shadow-2xl transition-transform duration-200 overflow-hidden flex flex-col border-t border-slate-100 dark:border-slate-800" 
            onClick={e => e.stopPropagation()}
          >
             {/* Mobile Sheet Drag Handle */}
             <div className="pt-3 pb-1 flex justify-center items-center">
               <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
             </div>

             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                   {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                 </div>
                 <div>
                   <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{currentUser.name}</h4>
                   <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{currentUser.email}</p>
                 </div>
               </div>
               <button 
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto no-scrollbar p-4">
               <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
             </div>
          </div>
        </div>
      )}

      {/* Main App Content View Container */}
      <main className={`flex-grow p-3.5 sm:p-5 lg:p-7 overflow-x-clip ${isKeyboardOpen ? 'pb-4' : 'pb-24'} lg:pb-8 max-w-[1400px] mx-auto w-full min-w-0`}>
        {children}
      </main>

      {/* Native Mobile App Bottom Dock Tab Bar (hidden while typing to avoid covering forms) */}
      {!isKeyboardOpen && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/80 p-1.5 pb-safe pt-2 px-3 z-40 flex justify-around items-center shadow-[0_-8px_24px_rgba(0,0,0,0.08)] transition-colors duration-200">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className="flex-1 max-w-[85px] relative py-1 flex flex-col items-center justify-center gap-1 cursor-pointer bg-transparent border-none outline-none active:scale-95 transition-transform duration-150"
            >
              <div 
                className={`relative px-4 py-1.5 rounded-full flex items-center justify-center transition-colors transition-transform duration-150 ${
                  active 
                    ? 'bg-[#0D5BFF] text-white shadow-sm shadow-blue-500/25' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                
                {/* Notification Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E51275] text-white text-[10px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111A2E] shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span 
                className={`text-[9px] font-black uppercase tracking-wider text-center transition-colors duration-200 ${
                  active 
                    ? 'text-[#0D5BFF] dark:text-blue-400 font-black' 
                    : 'text-slate-600 dark:text-slate-400 font-bold'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      )}

      <div className="hidden lg:block">
        <NotificationCenter />
      </div>
    </div>
  );
})

export default DashboardLayout;
