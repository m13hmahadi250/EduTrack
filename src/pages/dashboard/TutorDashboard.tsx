import React, { useState, useEffect, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, Session, Withdrawal } from '../../store';
import { useShallow } from 'zustand/react/shallow';
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
  GraduationCap,
  Plus,
  Trash2,
  Check,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MapTracker from '../../components/MapTracker';
import ImageUpload from '../../components/ImageUpload';
import { AVAILABLE_SUBJECTS, AVAILABLE_CLASSES } from '../../constants';
import { MetricCard, DashboardInput } from '../../components/DashboardComponents';

import RatingModal from '../../components/RatingModal';
import ChatWindow from '../../components/ChatWindow';

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
    updateAvailabilitySlots,
    users,
    messages,
    payments
  } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    toggleTracking: state.toggleTracking,
    updateLocation: state.updateLocation,
    sessions: state.sessions,
    withdrawals: state.withdrawals,
    startSession: state.startSession,
    endSession: state.endSession,
    cancelSession: state.cancelSession,
    requestWithdrawal: state.requestWithdrawal,
    updateUser: state.updateUser,
    updateAvailabilitySlots: state.updateAvailabilitySlots,
    users: state.users,
    messages: state.messages,
    payments: state.payments
  })));

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my_session' | 'balance' | 'transit_mode' | 'pro_profile' | 'availability' | 'messages'>('my_session');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showProfileNotice, setShowProfileNotice] = useState(true);

  const isProfileIncomplete = (!currentUser?.bio || !currentUser?.hourlyRate || !currentUser?.nidNumber || !currentUser?.nidImage || !currentUser?.academicCertificates?.length) && !currentUser?.hasDismissedProfileNotice;

  const missingFields = [
    !currentUser?.bio && 'Bio',
    !currentUser?.hourlyRate && 'Hourly Rate',
    (!currentUser?.nidNumber || !currentUser?.nidImage) && 'NID Credentials',
    (!currentUser?.academicCertificates || currentUser?.academicCertificates.length === 0) && 'Academic Certificates'
  ].filter(Boolean) as string[];

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
    else if (path.endsWith('/availability')) setActiveTab('availability');
    else if (path.endsWith('/messages')) setActiveTab('messages');
    else setActiveTab('my_session');
  }, [location.pathname]);

  const handleTabChange = (tab: 'my_session' | 'balance' | 'transit_mode' | 'pro_profile' | 'availability' | 'messages') => {
    const pathMap = {
      my_session: '/dashboard',
      balance: '/dashboard/balance',
      transit_mode: '/dashboard/transit',
      pro_profile: '/dashboard/profile',
      availability: '/dashboard/availability',
      messages: '/dashboard/messages'
    };
    navigate(pathMap[tab]);
  };
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: currentUser?.bio || '',
    hourlyRate: currentUser?.hourlyRate || 0,
    experience: currentUser?.experience || '',
    subjects: currentUser?.subjects || [],
    classes: currentUser?.classes || [],
    availabilitySlots: currentUser?.availabilitySlots || {},
    district: currentUser?.district || '',
    area: currentUser?.area || '',
    thana: currentUser?.thana || '',
    teachingAreas: currentUser?.teachingAreas || [],
    nidNumber: currentUser?.nidNumber || '',
    birthDate: currentUser?.birthDate || ''
  });

  // Sync profile form when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingProfile && currentUser) {
      setProfileForm({
        bio: currentUser.bio || '',
        hourlyRate: currentUser.hourlyRate || 0,
        experience: currentUser.experience || '',
        subjects: currentUser.subjects || [],
        classes: currentUser.classes || [],
        availabilitySlots: currentUser.availabilitySlots || {},
        district: currentUser.district || '',
        area: currentUser.area || '',
        thana: currentUser.thana || '',
        teachingAreas: currentUser.teachingAreas || [],
        nidNumber: currentUser.nidNumber || '',
        birthDate: currentUser.birthDate || ''
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

  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      await updateUser(currentUser.id, {
        ...profileForm,
        hourlyRate: Number(profileForm.hourlyRate)
      });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsUpdating(false);
    }
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

  const activeSessions = useMemo(() => sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled'), [sessions]);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4">
            Tutor Panel
          </h1>
          <p className="text-xs font-bold text-[#0B132B] uppercase tracking-[0.2em]">
            System Status for <span className="font-black text-[#0D5BFF] italic">{currentUser.name}</span>
          </p>
          <div className="mt-4 flex">
            {currentUser.isVerified ? (
              <div className="px-5 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center space-x-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Verified Expert</span>
              </div>
            ) : (
              <div className="px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl flex items-center space-x-3">
                <Zap className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Verification Pending</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
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
          { id: 'messages', label: 'Messages' },
          { id: 'pro_profile', label: 'Pro Profile' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`text-xs font-black font-heading uppercase tracking-[0.2em] italic pb-4 transition-all relative ${
              activeTab === tab.id ? 'text-[#0B132B]' : 'text-[#0B132B]/30 hover:text-[#0B132B]'
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
        {isProfileIncomplete && showProfileNotice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-[#0D5BFF] rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-24 -mb-24 blur-2xl" />
              
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Bell className="w-4 h-4 text-white animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Optimization Required</span>
                  </div>
                  <h3 className="text-2xl font-black uppercase italic leading-tight">Complete your profile to unlock full system capabilities</h3>
                  <div className="flex flex-wrap gap-2 my-3">
                    {missingFields.map(field => (
                      <span key={field} className="px-3 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/10">
                        Missing: {field}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] font-medium text-blue-100 uppercase tracking-widest max-w-xl">Our optimized matching algorithm prioritizes experts with 100% complete profiles. Providing all credentials ensures faster verification and higher ranking in student search results.</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      handleTabChange('pro_profile');
                      setIsEditingProfile(true);
                    }}
                    className="px-8 py-4 bg-white text-[#0D5BFF] border-2 border-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-blue-50 transition-all shadow-2xl shadow-blue-900/40 flex items-center gap-2 group/btn"
                  >
                    <span>Update My Experts Profile</span>
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => {
                      setShowProfileNotice(false);
                      updateUser(currentUser.id, { hasDismissedProfileNotice: true });
                    }}
                    className="p-4 bg-white/10 text-white rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-white/5"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <MetricCard label="Tutor Rating" value={currentUser?.rating?.toFixed(1) || '0.0'} />
              </div>

              {sessions.find(s => s.status === 'active') && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0D5BFF] rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200 group"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                        <Play className="w-8 h-8 text-white fill-white animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">Live Session Active</span>
                          <div className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </div>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic leading-tight">
                          Teaching {users.find(u => u.id === sessions.find(s => s.status === 'active')?.studentId)?.name || 'Student'}
                        </h3>
                        <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-2">
                          Subject: {sessions.find(s => s.status === 'active')?.subject} • Started at {new Date(sessions.find(s => s.status === 'active')?.startTime || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const activeSess = sessions.find(s => s.status === 'active');
                          if (activeSess) endSession(activeSess.id);
                        }}
                        className="px-8 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2 group/btn"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        <span>Complete Session</span>
                      </button>
                      <button 
                        onClick={() => handleTabChange('transit_mode')}
                        className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                        title="Transit Mode"
                      >
                        <MapPin className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

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
                             onClick={() => {
                               setSelectedRecipientId(sess.studentId);
                               handleTabChange('messages');
                             }}
                             className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-[#0D5BFF] transition-colors"
                             title="Message Student"
                           >
                             <Send className="w-5 h-5" />
                           </button>
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
              <ReputationTracker rating={currentUser?.rating || 0} totalReviews={currentUser?.totalRatings || 0} />
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

        {activeTab === 'messages' && (
          <motion.div 
            key="messages"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid lg:grid-cols-3 gap-8 h-[700px]"
          >
            <div className="lg:col-span-1 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
               <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8 px-2">Students</h3>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar hide-scrollbar">
                  {(() => {
                    // Logic: Students I have a session record with OR message history
                    const myStudentIdsFromSessions = sessions.map(s => s.studentId);
                    const myStudentIdsFromMessages = messages.map(m => m.senderId === currentUser.id ? m.receiverId : m.senderId);
                    const allContactIds = Array.from(new Set([...myStudentIdsFromSessions, ...myStudentIdsFromMessages]));
                    const contacts = users.filter(u => allContactIds.includes(u.id));

                    if (contacts.length === 0) {
                      return (
                        <div className="py-20 text-center opacity-20">
                          <Users className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No active secure links established.</p>
                        </div>
                      );
                    }

                    return contacts.map(contact => {
                      const unreadCount = messages.filter(m => m.senderId === contact.id && m.receiverId === currentUser.id && !m.isRead).length;
                      
                      return (
                        <button
                          key={contact.id}
                          onClick={() => setSelectedRecipientId(contact.id)}
                          className={`w-full p-5 rounded-[2rem] border transition-all flex items-center gap-4 text-left group relative ${
                            selectedRecipientId === contact.id 
                            ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-xl shadow-blue-100' 
                            : 'bg-white border-slate-100 text-[#0B132B] hover:border-slate-200'
                          }`}
                        >
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic border ${
                             selectedRecipientId === contact.id ? 'bg-white/20 border-white/10' : 'bg-slate-50 border-slate-100'
                           }`}>
                             {contact.name.charAt(0)}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black italic truncate">{contact.name}</h4>
                              <p className={`text-[8px] font-black uppercase tracking-widest truncate ${
                                selectedRecipientId === contact.id ? 'opacity-60' : 'text-slate-400'
                              }`}>
                                {contact.university || contact.email}
                              </p>
                           </div>
                           {unreadCount > 0 && selectedRecipientId !== contact.id && (
                             <div className="bg-[#E51275] text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-rose-100 animate-bounce">
                               {unreadCount}
                             </div>
                           )}
                        </button>
                      );
                    });
                  })()}
               </div>
            </div>
            <div className="lg:col-span-2">
               {selectedRecipientId ? (
                 <ChatWindow recipientId={selectedRecipientId} />
               ) : (
                 <div className="h-full border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 opacity-30">
                    <Send className="w-12 h-12 mb-6" />
                    <h3 className="text-xl font-black uppercase italic">Initialize Comms</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-2">Select a certified contact from the uplink</p>
                 </div>
               )}
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-center">{currentUser.university || 'Expert Educator'}</p>
                        
                        <div className="w-full space-y-3 mb-8">
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NID</span>
                              <span className="text-[10px] font-black text-[#0B132B]">{currentUser.nidNumber || 'Pending Submission'}</span>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DOB</span>
                              <span className="text-[10px] font-black text-[#0B132B]">{currentUser.birthDate || 'Pending Submission'}</span>
                           </div>
                        </div>

                        {(currentUser.district || currentUser.area) && (
                          <div className="flex items-center gap-2 mb-8 bg-blue-50/50 px-4 py-2 rounded-full border border-blue-50">
                            <MapPin className="w-3 h-3 text-[#0D5BFF]" />
                            <span className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest">
                              {currentUser.district}{currentUser.thana ? `, ${currentUser.thana}` : ''}{currentUser.area ? ` (${currentUser.area})` : ''}
                            </span>
                          </div>
                        )}
                        
                         {/* Verification Status Progress */}
                         <div className="w-full space-y-4 mb-10">
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                <ShieldCheck className={`w-4 h-4 ${currentUser.nidStatus === 'approved' ? 'text-emerald-500' : currentUser.nidStatus === 'rejected' ? 'text-rose-500' : 'text-slate-300'}`} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]">NID Identity</span>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                                currentUser.nidStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                currentUser.nidStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  currentUser.nidStatus === 'approved' ? 'bg-emerald-500' : 
                                  currentUser.nidStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                                }`} />
                                {currentUser.nidStatus || 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                <GraduationCap className={`w-4 h-4 ${currentUser.academicStatus === 'approved' ? 'text-emerald-500' : currentUser.academicStatus === 'rejected' ? 'text-rose-500' : 'text-slate-300'}`} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]">Academic Certs</span>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                                currentUser.academicStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                currentUser.academicStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  currentUser.academicStatus === 'approved' ? 'bg-emerald-500' : 
                                  currentUser.academicStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                                }`} />
                                {currentUser.academicStatus || 'Pending'}
                              </span>
                            </div>
                         </div>

                        <button 
                         onClick={() => {
                           if (isEditingProfile) {
                             handleProfileUpdate({ preventDefault: () => {} } as React.FormEvent);
                           } else {
                             setIsEditingProfile(true);
                           }
                         }}
                         className="w-full py-5 bg-[#0D5BFF] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all"
                        >
                          {isEditingProfile ? 'Lock Changes in System' : 'Modify Credentials'}
                        </button>
                     </div>
            </div>

            <div className="lg:col-span-2">
               {isEditingProfile ? (
                 <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm">
                    <h3 className="text-2xl font-black text-[#0B132B] uppercase italic mb-12">Update Academic Data</h3>

                    {updateSuccess && (
                      <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                          <Check className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-600 uppercase italic">System Synchronized</p>
                          <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Your teaching profile is now globally updated.</p>
                        </div>
                      </div>
                    )}





                    <form onSubmit={handleProfileUpdate} className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <ProfileField label="National ID (NID)" value={profileForm.nidNumber} onChange={(v) => setProfileForm({...profileForm, nidNumber: v})} placeholder="Enter 10 or 17 digit NID" />
                         <ProfileField label="Date of Birth" value={profileForm.birthDate} onChange={(v) => setProfileForm({...profileForm, birthDate: v})} type="date" />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <ProfileField label="District" value={profileForm.district} onChange={(v) => setProfileForm({...profileForm, district: v})} placeholder="e.g. Dhaka" />
                         <ProfileField label="Thana" value={profileForm.thana} onChange={(v) => setProfileForm({...profileForm, thana: v})} placeholder="e.g. Mirpur" />
                         <ProfileField label="Area" value={profileForm.area} onChange={(v) => setProfileForm({...profileForm, area: v})} placeholder="e.g. Mirpur 1" />
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Teaching Areas (Searchable by students)</label>
                          <div className="flex gap-2">
                            <input 
                              id="teachingAreaInput"
                              placeholder="Add an area..."
                              className="flex-1 bg-slate-50 border border-slate-100 rounded-full py-4 px-8 text-xs font-black uppercase italic text-[#0B132B] focus:outline-none focus:border-[#0D5BFF]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.currentTarget.value.trim();
                                  if (val && !profileForm.teachingAreas.includes(val)) {
                                    setProfileForm({...profileForm, teachingAreas: [...profileForm.teachingAreas, val]});
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('teachingAreaInput') as HTMLInputElement;
                                const val = input.value.trim();
                                if (val && !profileForm.teachingAreas.includes(val)) {
                                  setProfileForm({...profileForm, teachingAreas: [...profileForm.teachingAreas, val]});
                                  input.value = '';
                                }
                              }}
                              className="w-14 h-14 bg-[#0B132B] text-white rounded-2xl flex items-center justify-center"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {profileForm.teachingAreas.map(area => (
                              <span key={area} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0D5BFF] border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-widest">
                                {area}
                                <button type="button" onClick={() => setProfileForm({...profileForm, teachingAreas: profileForm.teachingAreas.filter(a => a !== area)})}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                       </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <ProfileField label="Hourly Rate (৳)" value={profileForm.hourlyRate} onChange={(v) => setProfileForm({...profileForm, hourlyRate: Number(v)})} type="number" />
                          <ProfileField label="Professional Experience" value={profileForm.experience} onChange={(v) => setProfileForm({...profileForm, experience: v})} placeholder="3+ Years in Academic Coaching" />
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
                            {Object.keys(currentUser.availabilitySlots || {}).length > 0 ? 'Slots Configured' : 'System Default (Flexible)'}
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

        {activeTab === 'availability' && (
          <motion.div
            key="availability"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl">
                  <Calendar className="w-10 h-10 text-[#0D5BFF]" />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-[#0B132B] uppercase italic leading-none">Schedule Manager</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Optimize your academic performance windows</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <AvailabilityCalendar 
                  slots={currentUser.availabilitySlots || {}} 
                  onChange={(slots) => updateAvailabilitySlots(slots)} 
                />
              </div>
              <div className="space-y-8">
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <Zap className="w-6 h-6 text-amber-500" />
                    <h3 className="text-xl font-black text-[#0B132B] uppercase italic">Efficiency Tips</h3>
                  </div>
                  <div className="space-y-6">
                    <p className="text-[11px] font-black uppercase italic text-slate-400 leading-loose">
                      • Evening slots (6 PM - 10 PM) typically receive 3x more search visibility.<br/>
                      • Keep at least 4 slots per day to maintain a "Flexible" tag.<br/>
                      • Consistent weekly patterns help students book in advance.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm mb-12">
                   <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Earning & Payment History</h3>
                   <div className="grid grid-cols-1 gap-4">
                     {payments.map(p => (
                       <div key={p.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                         <div>
                           <div className="flex items-center gap-3 mb-1">
                             <span className="text-[10px] font-black text-[#0B132B] uppercase italic">TRX: {p.transactionId}</span>
                             <span className={`px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm ${
                               p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : p.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                             }`}>
                               {p.status}
                             </span>
                           </div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                             {new Date(p.date).toLocaleString()} • From {users.find(u => u.id === p.studentId)?.name || 'Student'}
                           </p>
                         </div>
                         <div className="text-2xl font-black text-emerald-600 italic">+৳{p.amount}</div>
                       </div>
                     ))}
                     {payments.length === 0 && (
                       <div className="p-12 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No earning records synchronized</p>
                       </div>
                     )}
                   </div>
                </div>

                <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white shadow-2xl">
                   <div className="flex items-center gap-4 mb-6">
                      <Clock className="w-5 h-5 text-[#0D5BFF]" />
                      <h3 className="text-sm font-black uppercase italic">Slot Pulse</h3>
                   </div>
                   <div className="flex items-end justify-between">
                      <span className="text-5xl font-black italic">{Object.values(currentUser.availabilitySlots || {}).flat().length}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest pb-2">Active Windows</span>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ProfileField = memo(({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string | number, onChange: (v: string) => void, placeholder?: string, type?: string }) => {
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
});

const ReputationTracker = memo(({ rating, totalReviews }: { rating: number, totalReviews: number }) => {
  return (
    <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
      <AnimatePresence>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -z-0"></div>
      </AnimatePresence>
      
      <div className="flex items-center space-x-3 mb-10 relative z-10">
         <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
         <h3 className="text-xl font-black uppercase italic">Student Feedback</h3>
      </div>

      <div className="relative z-10 mb-8">
         <div className="flex items-end gap-3">
            <span className="text-6xl font-black italic text-[#0D5BFF]">{rating.toFixed(1)}</span>
            <div className="pb-2">
               <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'fill-amber-500 text-amber-500' : 'text-slate-700'}`} />
                  ))}
               </div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{totalReviews} Reviews Received</p>
            </div>
         </div>
      </div>

      <div className="space-y-8 relative z-10">
        <TrackerBar label="Tutor Rank" percentage={Math.min(100, Math.round((rating / 5) * 100))} color="bg-emerald-500" />
        <TrackerBar label="Punctuality" percentage={94} color="bg-[#0D5BFF]" />
        <TrackerBar label="Safety Rating" percentage={100} color="bg-purple-500" />
      </div>

      <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 relative z-10">
        <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
          Your reputation score is calculated based on direct student feedback and session punctuality.
        </p>
      </div>
    </div>
  );
});

const WeeklyGrowthChart = memo(() => {
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
});

const TrackerBar = memo(({ label, percentage, color }: { label: string, percentage: number, color: string }) => {
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
});

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

const AvailabilityCalendar = memo(({ slots, onChange }: { slots: { [key: string]: string[] }, onChange: (slots: { [key: string]: string[] }) => void }) => {
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
});
