import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, Session, Withdrawal } from '../../store';
import { 
  Bell, 
  MapPin, 
  TrendingUp, 
  Clock, 
  Star, 
  Users, 
  Calendar,
  Zap,
  ShieldCheck,
  CreditCard,
  User as UserIcon,
  CheckCircle,
  Play,
  Square,
  ChevronRight,
  Settings,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MapTracker from '../../components/MapTracker';
import ImageUpload from '../../components/ImageUpload';
import { AVAILABLE_SUBJECTS, AVAILABLE_CLASSES } from '../../constants';
import { MetricCard, DashboardInput } from '../../components/DashboardComponents';

const dummyData = [
  { name: 'Mon', earnings: 1200 },
  { name: 'Tue', earnings: 1800 },
  { name: 'Wed', earnings: 1600 },
  { name: 'Thu', earnings: 2200 },
  { name: 'Fri', earnings: 2800 },
  { name: 'Sat', earnings: 2400 },
  { name: 'Sun', earnings: 3200 },
];

export default function TutorDashboard() {
  const { 
    currentUser, 
    toggleTracking, 
    updateLocation, 
    sessions, 
    withdrawals, 
    startSession, 
    endSession, 
    cancelSession,
    requestWithdrawal,
    updateUser,
    users
  } = useAppStore();

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my_session' | 'balance' | 'transit_mode' | 'pro_profile'>('my_session');

  const refreshLocationManual = () => {
    if ('geolocation' in navigator) {
      setIsRefreshingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation(currentUser!.id, pos.coords.latitude, pos.coords.longitude);
          setIsRefreshingLocation(false);
        },
        (err) => {
          console.error(err);
          setIsRefreshingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/balance')) setActiveTab('balance');
    else if (path.endsWith('/transit')) setActiveTab('transit_mode');
    else if (path.endsWith('/profile')) setActiveTab('pro_profile');
    else setActiveTab('my_session');
  }, [location.pathname]);

  const handleTabChange = (tab: 'my_session' | 'balance' | 'transit_mode' | 'pro_profile') => {
    const pathMap = {
      my_session: '/dashboard',
      balance: '/dashboard/balance',
      transit_mode: '/dashboard/transit',
      pro_profile: '/dashboard/profile'
    };
    navigate(pathMap[tab]);
  };
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: currentUser?.bio || '',
    hourlyRate: currentUser?.hourlyRate || 0,
    availability: currentUser?.availability || '',
    experience: currentUser?.experience || '',
    subjects: currentUser?.subjects || [],
    classes: currentUser?.classes || [],
    availabilitySlots: currentUser?.availabilitySlots || {}
  });

  // Sync profile form when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingProfile && currentUser) {
      setProfileForm({
        bio: currentUser.bio || '',
        hourlyRate: currentUser.hourlyRate || 0,
        availability: currentUser.availability || '',
        experience: currentUser.experience || '',
        subjects: currentUser.subjects || [],
        classes: currentUser.classes || [],
        availabilitySlots: currentUser.availabilitySlots || {}
      });
    }
  }, [currentUser, isEditingProfile]);

  const toggleSubject = (subject: string) => {
    setProfileForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const toggleClass = (cls: string) => {
    setProfileForm(prev => ({
      ...prev,
      classes: prev.classes.includes(cls)
        ? prev.classes.filter(c => c !== cls)
        : [...prev.classes, cls]
    }));
  };

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  // Geolocation tracking logic
  useEffect(() => {
    let currentWatchId: number | null = null;

    if (currentUser?.isTrackingOn) {
      if ('geolocation' in navigator) {
        currentWatchId = navigator.geolocation.watchPosition(
          (position) => {
            updateLocation(currentUser.id, position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error("Error watching position", error);
            // Fallback to single update if watch fails
            navigator.geolocation.getCurrentPosition(
              (pos) => updateLocation(currentUser.id, pos.coords.latitude, pos.coords.longitude),
              (err) => console.error("Current position failed", err)
            );
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }

    return () => {
      if (currentWatchId !== null) {
        navigator.geolocation.clearWatch(currentWatchId);
      }
    };
  }, [currentUser?.isTrackingOn, currentUser?.id, updateLocation]);

  if (!currentUser) return null;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdating(true);
    await updateUser(currentUser.id, {
      ...profileForm,
      hourlyRate: Number(profileForm.hourlyRate)
    });
    setIsEditingProfile(false);
    setIsUpdating(false);
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(withdrawAmount) > (currentUser.balance || 0)) return;
    await requestWithdrawal({
      tutorId: currentUser.id,
      amount: Number(withdrawAmount),
      bKashNumber: bkashNumber
    });
    setWithdrawalSuccess(true);
    setTimeout(() => {
       setWithdrawalSuccess(false);
       setWithdrawAmount('');
    }, 3000);
  };

  const activeSessions = sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled');

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4">
            Tutor Panel
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            System Status for {currentUser.name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
           {currentUser.isVerified ? (
             <div className="px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center space-x-3">
               <ShieldCheck className="w-5 h-5" />
               <span className="text-[10px] font-black uppercase tracking-widest text-[#0B132B]">Verified Status</span>
             </div>
           ) : (
             <div className="px-6 py-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-full flex items-center space-x-3">
               <Zap className="w-5 h-5" />
               <span className="text-[10px] font-black uppercase tracking-widest text-[#0B132B]">Review Pending</span>
             </div>
           )}
           <button 
             onClick={() => handleTabChange('pro_profile')}
             className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#0B132B] hover:shadow-lg transition-all"
           >
              <Settings className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-slate-100 pb-px">
        {[
          { id: 'my_session', label: 'My Session' },
          { id: 'balance', label: 'Balance' },
          { id: 'transit_mode', label: 'Transit Mode' },
          { id: 'pro_profile', label: 'Pro Profile' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`text-xs font-black uppercase tracking-[0.2em] italic pb-4 transition-all relative ${
              activeTab === tab.id ? 'text-[#0D5BFF]' : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D5BFF]" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'my_session' && (
          <motion.div 
            key="my_session"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <MetricCard label="Active Students" value={Array.from(new Set(sessions.filter(s => s.status === 'scheduled' || s.status === 'active').map(s => s.studentId))).length.toString()} />
                <MetricCard label="Completed" value={sessions.filter(s => s.status === 'completed').length.toString()} />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-[#0B132B] uppercase italic">Live Schedule</h3>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{activeSessions.length} Pending Actions</span>
                </div>

                <div className="space-y-4">
                  {activeSessions.map(sess => {
                    const student = users.find(u => u.id === sess.studentId);
                    return (
                      <div key={sess.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all group">
                        <div className="flex items-center space-x-6">
                          <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-2xl font-black italic text-slate-300 border border-slate-50 group-hover:bg-[#0D5BFF] group-hover:text-white transition-colors">
                            {student?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-[#0B132B] uppercase italic">{student?.name || 'Academic Student'}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                               <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest">{sess.subject}</p>
                               <span className="text-slate-200">•</span>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(sess.scheduledTime).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                           {sess.status === 'scheduled' ? (
                             <button 
                               onClick={() => startSession(sess.id)}
                               className="px-6 py-4 bg-[#0B132B] text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 hover:bg-[#0D5BFF] transition-all"
                             >
                               <Play className="w-4 h-4 fill-current" /> Start Lesson
                             </button>
                           ) : (
                             <button 
                               onClick={() => endSession(sess.id)}
                               className="px-6 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-all animate-pulse"
                             >
                               <Square className="w-4 h-4 fill-current" /> Finish Session
                             </button>
                           )}
                           <button 
                             onClick={() => cancelSession(sess.id)}
                             className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-rose-500 transition-colors"
                           >
                             <ChevronRight className="w-6 h-6" />
                           </button>
                        </div>
                      </div>
                    );
                  })}
                  {activeSessions.length === 0 && (
                    <div className="bg-white rounded-[3rem] p-16 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                      <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <Calendar className="w-10 h-10 text-slate-200" />
                      </div>
                      <h4 className="text-xl font-black text-[#0B132B] uppercase italic mb-2">No sessions scheduled yet</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait for booking requests from parents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <ReputationTracker />
              <WeeklyGrowthChart />
            </div>
          </motion.div>
        )}

        {activeTab === 'balance' && (
          <motion.div 
            key="balance"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid lg:grid-cols-2 gap-12"
          >
            <div className="space-y-8">
               <div className="bg-[#0B132B] rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#0D5BFF]/10 blur-[100px]"></div>
                 <div className="flex items-center space-x-4 mb-12 relative z-10">
                   <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                     <CreditCard className="w-7 h-7 text-[#0D5BFF]" />
                   </div>
                   <div>
                     <h2 className="text-xl font-black uppercase italic">Wallet Records</h2>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Liquidity Status</p>
                   </div>
                 </div>
                 
                 <div className="relative z-10 mb-12">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Floating Balance</p>
                   <h3 className="text-7xl font-black italic tracking-tighter">৳{currentUser.balance?.toLocaleString()}</h3>
                 </div>

                 <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Yield</p>
                      <p className="text-xl font-black italic">৳{sessions.filter(s => s.status === 'completed').length * (currentUser.hourlyRate || 1000)}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Withdrawn</p>
                      <p className="text-xl font-black italic">৳{withdrawals.filter(w => w.status === 'approved').reduce((acc, w) => acc + w.amount, 0)}</p>
                    </div>
                 </div>
               </div>

               <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm">
                 <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8 flex items-center gap-3">
                   <Zap className="w-5 h-5 text-amber-500" /> Fund Escape
                 </h3>
                 
                 {withdrawalSuccess ? (
                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-12 bg-emerald-50 rounded-[2rem] text-center">
                     <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                     <h4 className="text-lg font-black text-emerald-900 uppercase italic">Payout Locked</h4>
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Verification stream initiated</p>
                   </motion.div>
                 ) : (
                   <form onSubmit={handleWithdrawRequest} className="space-y-6">
                      <DashboardInput label="Withdrawal Volume (৳)" value={withdrawAmount} onChange={setWithdrawAmount} placeholder="500" type="number" />
                      <DashboardInput label="bKash Recipient" value={bkashNumber} onChange={setBkashNumber} placeholder="017..." />
                      <button 
                        disabled={!withdrawAmount || !bkashNumber || Number(withdrawAmount) > (currentUser.balance || 0)}
                        className="w-full bg-[#0D5BFF] text-white py-6 rounded-[2rem] font-black uppercase italic tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                      >
                        Authorize Withdrawal
                      </button>
                   </form>
                 )}
               </div>
            </div>

            <section className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
               <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Financial History</h3>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                  <div className="space-y-4">
                    {withdrawals.map(w => (
                      <div key={w.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(w.timestamp).toLocaleDateString()}</p>
                          <h4 className="text-sm font-black text-[#0B132B] uppercase italic">To: {w.bKashNumber}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#0B132B] italic">৳{w.amount}</p>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${
                            w.status === 'approved' ? 'text-emerald-500' : w.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'transit_mode' && (
          <motion.div 
            key="transit"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid lg:grid-cols-2 gap-12"
          >
             <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 ${currentUser.isTrackingOn ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${currentUser.isTrackingOn ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                         <MapPin className={`w-7 h-7 ${currentUser.isTrackingOn ? 'text-emerald-500' : 'text-slate-300'}`} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Transit Protocol</h3>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Geographical Visibility</p>
                      </div>
                   </div>
                   <button 
                     onClick={refreshLocationManual}
                     disabled={isRefreshingLocation}
                     className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-[#0D5BFF] transition-all disabled:opacity-50"
                     title="Refresh My Location"
                   >
                      <Zap className={`w-4 h-4 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
                   </button>
                </div>

                <div className="space-y-8 flex-1">
                   <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                         <h4 className={`text-xl font-black uppercase italic ${currentUser.isTrackingOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {currentUser.isTrackingOn ? 'LIVE BROADCASTING' : 'OFFLINE MODE'}
                         </h4>
                      </div>
                      <button 
                        onClick={() => toggleTracking(currentUser.id, !currentUser.isTrackingOn)}
                        className={`w-20 h-10 rounded-full p-1 transition-all flex items-center ${currentUser.isTrackingOn ? 'bg-emerald-500 pr-1' : 'bg-slate-200 pl-1'}`}
                      >
                         <div className={`w-8 h-8 bg-white rounded-full shadow-lg transform transition-transform ${currentUser.isTrackingOn ? 'translate-x-10' : ''}`}></div>
                      </button>
                   </div>

                   <div className="bg-slate-900 rounded-[3rem] h-[500px] overflow-hidden border-8 border-white shadow-2xl relative">
                      {currentUser.isTrackingOn ? (
                        <MapTracker 
                          tutorLocation={currentUser.location ? [currentUser.location.lat, currentUser.location.lng] : undefined}
                          tutorName="Me (Tutor)"
                          // Show the first active student's location if available
                          studentLocation={(() => {
                            const activeSess = sessions.find(s => s.status === 'active' || s.status === 'scheduled');
                            const student = users.find(u => u.id === activeSess?.studentId);
                            return student?.location ? [student.location.lat, student.location.lng] : undefined;
                          })()}
                          studentName={(() => {
                            const activeSess = sessions.find(s => s.status === 'active' || s.status === 'scheduled');
                            const student = users.find(u => u.id === activeSess?.studentId);
                            return student?.name;
                          })()}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-center p-12">
                           <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                              <MapPin className="w-10 h-10 text-slate-700" />
                           </div>
                           <h4 className="text-white text-xl font-black uppercase italic mb-4">Signal Blocked</h4>
                           <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest leading-loose">Enable tracking to visualize proximity intel and student distance</p>
                        </div>
                      )}
                   </div>

                   {currentUser.location && (
                     <div className="p-8 bg-[#0B132B] rounded-[2.5rem] text-white">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Active Coordinates</p>
                        <div className="flex gap-8">
                           <div>
                              <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Latitude</span>
                              <span className="text-lg font-black italic">{currentUser.location.lat.toFixed(6)}</span>
                           </div>
                           <div>
                              <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Longitude</span>
                              <span className="text-lg font-black italic">{currentUser.location.lng.toFixed(6)}</span>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             </div>

             <div className="flex flex-col gap-12">
                <div className="bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-20 text-center flex-1">
                   <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-xl">
                      <Zap className={`w-10 h-10 ${currentUser.isTrackingOn ? 'text-amber-500 animate-pulse' : 'text-slate-200'}`} />
                   </div>
                   <h4 className="text-2xl font-black text-[#0B132B] uppercase italic mb-4">Signal Integrity</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xs leading-loose">
                      Your signal is encrypted and only visible to students with active, approved bookings within a 2-hour window.
                   </p>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                   <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-6">Nearby Active Students</h3>
                   <div className="space-y-4">
                      {sessions.filter(s => s.status === 'scheduled' || s.status === 'active').map(sess => {
                        const student = users.find(u => u.id === sess.studentId);
                        return (
                          <div key={sess.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-black italic text-[#0D5BFF]">
                                   {student?.name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-[#0B132B] uppercase italic">{student?.name}</p>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{sess.subject}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                {student?.location && currentUser.location ? (
                                  <p className="text-[10px] font-black text-[#0D5BFF]">LIVE</p>
                                ) : (
                                  <p className="text-[10px] font-black text-slate-300">STATIC</p>
                                )}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'pro_profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid lg:grid-cols-3 gap-12"
          >
            <div className="lg:col-span-1 space-y-8">
                     <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm flex flex-col items-center">
                        <div className="mb-8">
                           <ImageUpload 
                             userId={currentUser.id} 
                             currentImageUrl={currentUser.profileImage} 
                             onUpload={(url) => updateUser(currentUser.id, { profileImage: url })}
                           />
                        </div>
                        <h2 className="text-3xl font-black text-[#0B132B] uppercase italic mb-2 text-center">{currentUser.name}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">{currentUser.university || 'Expert Educator'}</p>
                        
                        {/* Verification Status Progress */}
                        <div className="w-full space-y-4 mb-10">
                           <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-3">
                               <ShieldCheck className={`w-4 h-4 ${currentUser.nidStatus === 'approved' ? 'text-emerald-500' : 'text-slate-300'}`} />
                               <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]">NID Identity</span>
                             </div>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${
                               currentUser.nidStatus === 'approved' ? 'text-emerald-500' : currentUser.nidStatus === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                             }`}>
                               {currentUser.nidStatus || 'Pending'}
                             </span>
                           </div>
                           <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-3">
                               <GraduationCap className={`w-4 h-4 ${currentUser.academicStatus === 'approved' ? 'text-emerald-500' : 'text-slate-300'}`} />
                               <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]">Academic Certs</span>
                             </div>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${
                               currentUser.academicStatus === 'approved' ? 'text-emerald-500' : currentUser.academicStatus === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                             }`}>
                               {currentUser.academicStatus || 'Pending'}
                             </span>
                           </div>
                        </div>

                        <button 
                         onClick={() => setIsEditingProfile(!isEditingProfile)}
                         className="w-full py-5 bg-[#0D5BFF] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all"
                        >
                          {isEditingProfile ? 'Lock Progress' : 'Modify Credentials'}
                        </button>
                     </div>
            </div>

            <div className="lg:col-span-2">
               {isEditingProfile ? (
                 <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm">
                    <h3 className="text-2xl font-black text-[#0B132B] uppercase italic mb-12">Update Academic Data</h3>
                    <form onSubmit={handleProfileUpdate} className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <ProfileField label="Hourly Rate (৳)" value={profileForm.hourlyRate} onChange={(v) => setProfileForm({...profileForm, hourlyRate: Number(v)})} type="number" />
                         <ProfileField label="Availability Window" value={profileForm.availability} onChange={(v) => setProfileForm({...profileForm, availability: v})} placeholder="Mon-Fri, 4-8 PM" />
                       </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Authorized Subjects</label>
                          <div className="flex flex-wrap gap-2">
                             {AVAILABLE_SUBJECTS.map(sub => (
                               <button
                                 key={sub}
                                 type="button"
                                 onClick={() => toggleSubject(sub)}
                                 className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                                   profileForm.subjects.includes(sub)
                                   ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-lg shadow-blue-100'
                                   : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                                 }`}
                               >
                                 {sub}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Classes</label>
                          <div className="flex flex-wrap gap-2">
                             {AVAILABLE_CLASSES.map(cls => (
                               <button
                                 key={cls}
                                 type="button"
                                 onClick={() => toggleClass(cls)}
                                 className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                                   profileForm.classes.includes(cls)
                                   ? 'bg-[#0B132B] text-white border-[#0B132B] shadow-lg shadow-slate-100'
                                   : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                                 }`}
                               >
                                 {cls}
                               </button>
                             ))}
                          </div>
                        </div>
                       <ProfileField label="Professional Experience" value={profileForm.experience} onChange={(v) => setProfileForm({...profileForm, experience: v})} placeholder="3+ Years in Academic Coaching" />
                       <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mission Statement / Bio</label>
                         <textarea 
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-xs font-black uppercase italic leading-relaxed text-[#0B132B] h-40 focus:outline-none focus:border-[#0D5BFF]"
                          placeholder="Your teaching philosophy..."
                         />
                       </div>

                       <div className="space-y-6 pt-8 border-t border-slate-100">
                          <div className="flex items-center gap-4">
                             <Calendar className="w-5 h-5 text-[#0D5BFF]" />
                             <h3 className="text-xl font-black text-[#0B132B] uppercase italic">Visual Availability Matrix</h3>
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose">Select your active session windows. These slots will be visible to parents for instant booking.</p>
                          
                          <AvailabilityCalendar 
                            slots={profileForm.availabilitySlots} 
                            onChange={(slots) => setProfileForm({...profileForm, availabilitySlots: slots})} 
                          />
                       </div>

                       <button 
                         disabled={isUpdating}
                         className="w-full py-6 bg-[#0B132B] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl hover:bg-[#0D5BFF] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                       >
                          {isUpdating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Synchronizing...
                            </>
                          ) : 'Lock Changes in System'}
                       </button>
                    </form>
                 </div>
               ) : (
                 <div className="space-y-8">
                    <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm">
                       <div className="flex items-center gap-4 mb-8">
                          <Briefcase className="w-6 h-6 text-[#0D5BFF]" />
                          <h3 className="text-xl font-black text-[#0B132B] uppercase italic">Academic Bio</h3>
                       </div>
                       <p className="text-sm font-black uppercase italic text-slate-500 leading-loose tracking-tight border-l-4 border-slate-50 pl-8">
                          {currentUser.bio || 'Profile bio pending system update. Set your professional philosophy to attract premium bookings.'}
                       </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-4 mb-6">
                            <GraduationCap className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-sm font-black text-[#0B132B] uppercase italic">Expertise</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {(currentUser.subjects || ['Pending']).map(s => (
                               <span key={s} className="px-5 py-2 bg-slate-50 border border-slate-100 text-[9px] font-black uppercase italic text-slate-400 rounded-full">{s}</span>
                             ))}
                          </div>
                       </div>
                       <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-4 mb-6">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-black text-[#0B132B] uppercase italic">Availability</h3>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                            {currentUser.availability || 'System Default (Flexible)'}
                          </p>
                       </div>
                    </div>

                    <div className="bg-white rounded-[4rem] p-12 lg:p-16 border border-slate-100 shadow-sm">
                       <div className="flex items-center gap-4 mb-10">
                          <Calendar className="w-6 h-6 text-[#0D5BFF]" />
                          <h3 className="text-xl font-black text-[#0B132B] uppercase italic">Visual Schedule</h3>
                       </div>
                       
                       <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-4 custom-scrollbar">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                            const dayName = day === 'Sun' ? 'Sunday' : 
                                          day === 'Mon' ? 'Monday' : 
                                          day === 'Tue' ? 'Tuesday' :
                                          day === 'Wed' ? 'Wednesday' :
                                          day === 'Thu' ? 'Thursday' :
                                          day === 'Fri' ? 'Friday' : 'Saturday';
                            const daySlots = currentUser.availabilitySlots?.[dayName] || [];
                            
                            return (
                              <div key={day} className="min-w-[100px] space-y-3">
                                 <div className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-[#0B132B] italic">{day}</span>
                                 </div>
                                 <div className="space-y-1.5 px-1">
                                    {daySlots.map(slot => (
                                      <div key={slot} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                        <span className="text-[8px] font-black text-[#0D5BFF]">{slot}</span>
                                      </div>
                                    ))}
                                    {daySlots.length === 0 && (
                                      <div className="px-3 py-4 border border-dashed border-slate-100 rounded-xl text-center">
                                        <span className="text-[7px] font-black text-slate-200">REST</span>
                                      </div>
                                    )}
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string | number, onChange: (v: string) => void, placeholder?: string, type?: string }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-100 rounded-full py-5 px-10 text-xs font-black uppercase italic text-[#0B132B] focus:outline-none focus:border-[#0D5BFF]"
      />
    </div>
  );
}

function ReputationTracker() {
  return (
    <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -z-0"></div>
      
      <div className="flex items-center space-x-3 mb-10 relative z-10">
         <TrendingUp className="w-6 h-6 text-[#0D5BFF]" />
         <h3 className="text-xl font-black uppercase italic">Reputation Tracker</h3>
      </div>

      <div className="space-y-8 relative z-10">
        <TrackerBar label="Tutor Rank" percentage={98} color="bg-emerald-500" />
        <TrackerBar label="Punctuality" percentage={94} color="bg-[#0D5BFF]" />
        <TrackerBar label="Completion" percentage={100} color="bg-purple-500" />
      </div>

      <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 relative z-10">
        <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
          Insights based on your last 10 sessions. High punctuality improves your visibility to parents.
        </p>
      </div>
    </div>
  );
}

function WeeklyGrowthChart() {
  return (
    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[300px]">
      <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Weekly Growth</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dummyData}>
            <Line 
              type="monotone" 
              dataKey="earnings" 
              stroke="#0D5BFF" 
              strokeWidth={4} 
              dot={{ fill: '#0D5BFF', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 8 }}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} 
              dy={10}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '1rem', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase'
              }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrackerBar({ label, percentage, color }: { label: string, percentage: number, color: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-400">{label}</span>
        <span className="text-[#0D5BFF] italic">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

function AvailabilityCalendar({ slots, onChange }: { slots: { [key: string]: string[] }, onChange: (slots: { [key: string]: string[] }) => void }) {
  const toggleSlot = (day: string, hour: string) => {
    const daySlots = slots[day] || [];
    const newDaySlots = daySlots.includes(hour)
      ? daySlots.filter(h => h !== hour)
      : [...daySlots, hour].sort();
    
    onChange({
      ...slots,
      [day]: newDaySlots
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100/50">
      <div className="overflow-x-auto custom-scrollbar">
        <div className="flex min-w-[800px]">
          {/* Hour Labels */}
          <div className="w-20 pt-16 flex flex-col border-r border-slate-50 bg-slate-50/50">
            {HOURS.map(hour => (
              <div key={hour} className="h-14 flex items-center justify-center border-b border-white">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{hour}</span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          {DAYS.map(day => (
            <div key={day} className="flex-1 min-w-[100px] border-r border-slate-50 last:border-r-0">
              <div className="h-16 flex items-center justify-center bg-[#0B132B] text-white border-b border-slate-800">
                <span className="text-[9px] font-black uppercase italic tracking-widest">{day.slice(0, 3)}</span>
              </div>
              <div className="flex flex-col">
                {HOURS.map(hour => {
                  const isActive = slots[day]?.includes(hour);
                  return (
                    <button
                      key={`${day}-${hour}`}
                      type="button"
                      onClick={() => toggleSlot(day, hour)}
                      className={`h-14 border-b border-slate-50 transition-all flex items-center justify-center group relative overflow-hidden ${
                        isActive ? 'bg-[#0D5BFF]' : 'hover:bg-slate-50'
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle className="w-5 h-5 text-white/50" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-100 group-hover:scale-150 transition-transform"></div>
                      )}
                      
                      <div className={`absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 bg-[#0B132B] border-t border-slate-800 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#0D5BFF]" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Active Slot</span>
         </div>
         <p className="text-[8px] font-black text-[#0D5BFF] uppercase italic">Click to toggle availability</p>
      </div>
    </div>
  );
}
