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
  Users
} from 'lucide-react';

const DashboardLayout = memo(function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, theme, messages } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const isTutor = currentUser.role === 'tutor';
  const isStudent = currentUser.role === 'student';
  const isAdmin = currentUser.role === 'admin';

  const totalUnreadMessages = useMemo(() => 
    messages.filter(m => m.receiverId === currentUser.id && !m.isRead).length,
    [messages, currentUser.id]
  );

  const navItems = useMemo(() => [
    ...(isTutor ? [
      { label: 'Session', icon: Calendar, path: '/dashboard' },
      { label: 'Find Students', icon: Users, path: '/dashboard/find-students' },
      { label: 'Chat', icon: MessageSquare, path: '/messages', badge: totalUnreadMessages },
      { label: 'Profile', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isStudent ? [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Find Tutor', icon: Search, path: '/dashboard/search' },
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] dark:bg-[#0B132B] flex-col lg:flex-row transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-[#111A2E] border-b border-slate-100 dark:border-slate-800/60 p-4 sticky top-0 z-50 flex items-center justify-between transition-colors">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Logo className="w-8 h-8 shadow-lg shadow-blue-200 dark:shadow-none" />
          <span 
            className="text-lg font-black font-heading text-[#0B132B] dark:text-white flex select-none"
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
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500 dark:text-slate-400">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="w-80 max-w-[85vw] h-full bg-white dark:bg-[#111A2E] shadow-2xl transition-transform duration-300 transform translate-x-0 relative flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
             <div className="absolute top-4 right-4 z-50">
               <button 
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="p-2 text-[#0B132B] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="flex-1 overflow-y-auto pt-8">
               <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
             </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-y-auto pb-24 lg:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800/80 p-2 pb-5 pt-3 px-4 z-50 flex justify-around items-center shadow-[0_-12px_40px_-15px_rgba(0,0,0,0.12)] transition-colors duration-300">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className="flex-1 max-w-[80px] relative py-2 flex flex-col items-center justify-center gap-1 cursor-pointer bg-transparent border-none outline-none"
            >
              <div 
                className={`relative p-2 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  active 
                    ? 'bg-[#0B132B]/5 dark:bg-white/10 text-[#0D5BFF] dark:text-[#0D5BFF] scale-110' 
                    : 'text-slate-400 dark:text-slate-500 hover:text-[#0B132B] dark:hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                
                {/* Notification Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E51275] text-white text-[8px] font-black h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111A2E] shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span 
                className={`text-[8.5px] font-black uppercase tracking-widest text-center transition-colors duration-300 ${
                  active 
                    ? 'text-[#0B132B] dark:text-white' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.label.split(' ')[0]}
              </span>
              
              {/* Active Dot indicator */}
              {active && (
                <div 
                  className="absolute bottom-0 w-1 h-1 rounded-full bg-[#0D5BFF]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden lg:block">
        <NotificationCenter />
      </div>
    </div>
  );
})

export default DashboardLayout;

const Wallet = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
);
