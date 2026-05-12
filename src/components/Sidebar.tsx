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
  Wallet
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isTutor = currentUser.role === 'tutor';
  const isStudent = currentUser.role === 'student';

  const navItems = [
    ...(isTutor ? [
      { id: 'my_session', label: 'My Session', icon: Calendar, path: '/dashboard' },
      { id: 'balance', label: 'Balance', icon: CreditCard, path: '/dashboard/balance' },
      { id: 'transit_mode', label: 'Transit Mode', icon: Map, path: '/dashboard/transit' },
      { id: 'pro_profile', label: 'Pro Profile', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isStudent ? [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'find', label: 'Find Tutor', icon: Search, path: '/dashboard/search' },
        { id: 'activity', label: 'Activity Log', icon: BarChart3, path: '/dashboard/activity' },
        { id: 'account', label: 'My Account', icon: User, path: '/dashboard/profile' },
    ] : []),
    ...(isAdmin ? [
        { id: 'verifications', label: 'Identity Protocol', icon: Shield, path: '/dashboard' },
        { id: 'payments', label: 'Inbound Revenue', icon: CreditCard, path: '/dashboard/payments' },
        { id: 'withdrawals', label: 'Tutor Payouts', icon: Wallet, path: '/dashboard/withdrawals' },
    ] : []),
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-80 h-screen bg-white border-r border-slate-100 flex flex-col p-8 sticky top-0">
      {/* Logo */}
      <div className="flex items-center space-x-3 mb-16">
        <div className="w-10 h-10 bg-[#0D5BFF] rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200">
           E
        </div>
        <span className="text-2xl font-black font-heading text-[#0B132B]">EduTrack</span>
      </div>

      {/* Nav Section */}
      <div className="flex-grow">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 pl-4">
          Professional
        </p>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                isActive(item.path) 
                ? 'bg-[#0B132B] text-white shadow-xl shadow-slate-200' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#0B132B]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-[#0B132B]'}`} />
              <span className="text-sm font-black uppercase italic tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Status Card */}
      <div className="mb-6 p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Profile Status</span>
          <Shield className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-sm font-black text-amber-900 uppercase italic">
          {currentUser.isVerified ? 'Verified Account' : 'Pending Verification'}
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center space-x-4 mb-4 p-4 bg-slate-50 rounded-3xl">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-black italic">
          {currentUser.name.charAt(0)}
        </div>
        <div>
          <div className="text-xs font-black text-[#0B132B] truncate max-w-[140px] uppercase italic">{currentUser.name}</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentUser.role === 'tutor' ? 'Teacher Account' : 'Student Account'}</div>
        </div>
      </div>

      <button 
        onClick={logout}
        className="flex items-center space-x-3 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:text-rose-600 pl-4 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );
}
