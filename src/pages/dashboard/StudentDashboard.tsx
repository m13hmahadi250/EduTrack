import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, User, Session } from '../../store';
import { 
  Search, 
  MapPin, 
  CreditCard, 
  Send, 
  ShieldCheck, 
  CheckCircle,
  Bell,
  Clock,
  LayoutDashboard,
  Star,
  Users,
  Calendar,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Zap
} from 'lucide-react';
import MapTracker from '../../components/MapTracker';
import ImageUpload from '../../components/ImageUpload';
import { motion, AnimatePresence } from 'motion/react';
import { AVAILABLE_SUBJECTS, AVAILABLE_CLASSES } from '../../constants';
import { MetricCard, FilterGroup, DashboardInput } from '../../components/DashboardComponents';
import RatingModal from '../../components/RatingModal';

export default function StudentDashboard() {
  const { currentUser, users, submitPayment, payments, sessions, bookSession, updateLocation } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'find' | 'activity' | 'account' | 'transit'>('overview');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [pendingRatingSession, setPendingRatingSession] = useState<Session | null>(null);

  useEffect(() => {
    // Look for completed sessions that haven't been rated yet
    const completedUnrated = sessions.find(s => s.status === 'completed' && !s.rating && s.studentId === currentUser?.id);
    if (completedUnrated) {
      setPendingRatingSession(completedUnrated);
    }
  }, [sessions, currentUser?.id]);

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
    if (path.endsWith('/search')) setActiveTab('find');
    else if (path.endsWith('/activity')) setActiveTab('activity');
    else if (path.endsWith('/profile')) setActiveTab('account');
    else if (path.endsWith('/transit')) setActiveTab('transit');
    else setActiveTab('overview');
  }, [location.pathname]);

  const handleTabChange = (tab: 'overview' | 'find' | 'activity' | 'account' | 'transit') => {
    const pathMap = {
      overview: '/dashboard',
      find: '/dashboard/search',
      activity: '/dashboard/activity',
      account: '/dashboard/profile',
      transit: '/dashboard/transit'
    };
    navigate(pathMap[tab]);
  };

  // Background position tracking for student during transit
  useEffect(() => {
    let currentWatchId: number | null = null;
    
    if (activeTab === 'transit' && currentUser?.id) {
      if ('geolocation' in navigator) {
        currentWatchId = navigator.geolocation.watchPosition(
          (position) => {
            updateLocation(currentUser.id, position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error("Error watching student position", error);
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
  }, [activeTab, currentUser?.id]);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    school: currentUser?.university || '',
    studentClass: currentUser?.studentClass || '',
    subjects: currentUser?.subjects || []
  });

  // Sync form state when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingAccount && currentUser) {
      setAccountForm({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        school: currentUser.university || '',
        studentClass: currentUser.studentClass || '',
        subjects: currentUser.subjects || []
      });
    }
  }, [currentUser, isEditingAccount]);

  const toggleSubject = (subject: string) => {
    setAccountForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  // Filter only verified tutors matching search and filters
  const filteredTutors = users.filter(user => {
    if (user.role !== 'tutor' || !user.isVerified) return false;
    
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.university?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.course?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !filterSubject || user.subjects?.some(s => s.toLowerCase().includes(filterSubject.toLowerCase()));
    const matchesClass = !filterClass || user.classes?.some(c => c.toLowerCase().includes(filterClass.toLowerCase()));
    const matchesRating = !filterRating || (user.rating || 0) >= filterRating;

    return matchesSearch && matchesSubject && matchesClass && matchesRating;
  });

  const [bKashNumber, setBkashNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Booking state
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingSubject, setBookingSubject] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const myPayments = payments.filter(p => p.studentId === currentUser?.id);
  const mySessions = sessions.filter(s => s.studentId === currentUser?.id);
  const activeSession = mySessions.find(s => s.status === 'active');

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutor || !currentUser) return;

    submitPayment({
      studentId: currentUser.id,
      tutorId: selectedTutor.id,
      bKashNumber,
      amount: Number(amount),
      transactionId
    });
    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setBkashNumber('');
      setAmount('');
      setTransactionId('');
    }, 3000);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutor || !currentUser || !bookingDate || !bookingSlot || !bookingSubject) {
      alert("Please fill all booking requirements");
      return;
    }

    setIsBooking(true);
    try {
      const scheduledTime = `${bookingDate}T${bookingSlot}:00`;

      await bookSession({
        studentId: currentUser.id,
        tutorId: selectedTutor.id,
        subject: bookingSubject,
        scheduledTime,
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingSlot('');
        setBookingSubject('');
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Booking failed. Please check availability.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdating(true);
    await useAppStore.getState().updateUser(currentUser.id, {
      name: accountForm.name,
      phone: accountForm.phone,
      university: accountForm.school,
      studentClass: accountForm.studentClass,
      subjects: accountForm.subjects
    });
    setIsEditingAccount(false);
    setIsUpdating(false);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4">
            Student Panel
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Central Operations for {currentUser.name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
           {activeSession && (
             <motion.div 
               animate={{ opacity: [0.5, 1, 0.5] }} 
               transition={{ duration: 2, repeat: Infinity }}
               className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-full flex items-center space-x-3"
             >
               <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
               <span className="text-[10px] font-black uppercase tracking-widest">Live Broadcast</span>
             </motion.div>
           )}
           <button className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#0B132B] hover:shadow-lg transition-all">
              <Bell className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex space-x-8 border-b border-slate-100 pb-px overflow-x-auto custom-scrollbar-hide hide-scrollbar">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'find', label: 'Find Tutor' },
          { id: 'activity', label: 'Activity Log' },
          { id: 'transit', label: 'Transit Tracker' },
          { id: 'account', label: 'My Account' }
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
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-12"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard label="Sessions" value={mySessions.length.toString()} />
              <MetricCard label="Active Tutors" value={Array.from(new Set(mySessions.filter(s => s.status !== 'cancelled').map(s => s.tutorId))).length.toString()} />
              <MetricCard label="Total Spent" value={`৳${myPayments.filter(p => p.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0)}`} />
              <MetricCard label="Learning Hours" value={mySessions.filter(s => s.status === 'completed').length.toString()} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Upcoming Engagements</h3>
                <div className="space-y-4">
                  {mySessions.filter(s => s.status === 'scheduled' || s.status === 'active').slice(0, 3).map(sess => {
                    const tutor = users.find(u => u.id === sess.tutorId);
                    return (
                      <div key={sess.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div className="flex items-center space-x-6">
                           <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-[#0D5BFF] transition-colors border ${sess.status === 'active' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                             {sess.status === 'active' ? <Zap className="w-6 h-6 text-rose-500" /> : <Calendar className="w-6 h-6" />}
                           </div>
                           <div>
                              <h4 className="text-lg font-black text-[#0B132B] uppercase italic">{tutor?.name}</h4>
                              <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest">{sess.subject} • {new Date(sess.scheduledTime).toLocaleString()}</p>
                           </div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ${sess.status === 'active' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          {sess.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Expert Radius</h3>
                <div className="bg-slate-50 rounded-[3rem] p-4 border border-slate-100 h-64 overflow-hidden relative">
                   {activeSession && users.find(u => u.id === activeSession.tutorId)?.location ? (
                     <MapTracker tutorLocation={[
                       users.find(u => u.id === activeSession.tutorId)!.location!.lat, 
                       users.find(u => u.id === activeSession.tutorId)!.location!.lng
                     ]} />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-30 p-8">
                       <MapPin className="w-10 h-10 mb-4" />
                       <p className="text-[8px] font-black uppercase tracking-widest leading-loose">No active transmission signals detected in your sector.</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'find' && (
          <motion.div 
            key="find"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8"
          >
            {/* Filters Sidebar */}
            <div className={`lg:col-span-1 space-y-6 ${windowWidth <= 1024 && !showFilters ? 'hidden' : 'block'}`}>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative">
                {windowWidth <= 1024 && (
                   <button 
                     onClick={() => setShowFilters(false)}
                     className="absolute top-6 right-6 p-2 bg-slate-50 rounded-xl text-slate-400"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                )}
                <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">System Filtering</h3>
                
                <div className="space-y-6">
                  <FilterGroup label="Direct Query">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="NAME OR UNI..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all"
                      />
                      <Search className="absolute right-3 top-3 w-4 h-4 text-slate-300" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Inbound Logic">
                    <select 
                      value={filterClass}
                      onChange={e => setFilterClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none"
                    >
                      <option value="">ALL CLASSES</option>
                      {AVAILABLE_CLASSES.map(cls => (
                        <option key={cls} value={cls}>{cls.toUpperCase()}</option>
                      ))}
                    </select>
                  </FilterGroup>

                  <FilterGroup label="Categorization">
                    <select 
                      value={filterSubject}
                      onChange={e => setFilterSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none"
                    >
                      <option value="">ALL SUBJECTS</option>
                      {AVAILABLE_SUBJECTS.map(sub => (
                        <option key={sub} value={sub}>{sub.toUpperCase()}</option>
                      ))}
                    </select>
                  </FilterGroup>

                  <FilterGroup label="Minimum Rating">
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFilterRating(star === filterRating ? 0 : star)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${filterRating >= star ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-slate-50 text-slate-300'}`}
                          title={`${star} Stars & Up`}
                        >
                          <Star className={`w-4 h-4 ${filterRating >= star ? 'fill-amber-500' : ''}`} />
                        </button>
                      ))}
                      {filterRating > 0 && (
                        <span className="text-[10px] font-black text-amber-600 ml-2 uppercase italic">{filterRating}+</span>
                      )}
                    </div>
                  </FilterGroup>

                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterSubject('');
                      setFilterClass('');
                      setFilterRating(0);
                    }}
                    className="w-full py-4 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    Reset Parameters
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-8">
              {windowWidth <= 1024 && !showFilters && !selectedTutor && (
                 <button 
                   onClick={() => setShowFilters(true)}
                   className="w-full py-4 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm"
                 >
                   <Search className="w-4 h-4 text-[#0D5BFF]" />
                   Filter & Search Experts
                 </button>
              )}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Tutor Selection Panel */}
                {(!selectedTutor || windowWidth > 1024) && (
                  <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar lg:sticky lg:top-4">
                    <div className="lg:hidden mb-6">
                       <h2 className="text-2xl font-black text-[#0B132B] uppercase italic">Nearby Mentors</h2>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-1">Discover verified experts in your quadrant</p>
                    </div>
                    {filteredTutors.map(tutor => (
                      <div 
                        key={tutor.id} 
                        onClick={() => setSelectedTutor(tutor)}
                        className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                          selectedTutor?.id === tutor.id 
                          ? 'border-[#0D5BFF] bg-blue-50/30' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          {tutor.profileImage ? (
                            <img src={tutor.profileImage} alt={tutor.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-lg font-black italic text-[#0D5BFF] border border-slate-100">
                               {tutor.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-black text-[#0B132B] flex items-center uppercase italic group-hover:text-[#0D5BFF] transition-colors">
                                {tutor.name}
                                <ShieldCheck className="w-3.5 h-3.5 text-[#0D5BFF] ml-2" />
                              </h3>
                              <div className="flex items-center gap-1.5">
                                {tutor.rating && (
                                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                    <span className="text-[9px] font-black text-amber-700">{tutor.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                {tutor.isTrackingOn && (
                                  <span className="flex h-2.5 w-2.5 relative">
                                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                     <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                              {tutor.university} • {tutor.hourlyRate ? `৳${tutor.hourlyRate}/hr` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tutor Details & Booking */}
                {(selectedTutor || windowWidth > 1024) && (
                  <div className="space-y-8">
                    {selectedTutor ? (
                      <>
                        <button 
                          onClick={() => setSelectedTutor(null)}
                          className="lg:hidden flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-[#0B132B] shadow-sm mb-4"
                        >
                          <ChevronLeft className="w-4 h-4 text-[#0D5BFF]" />
                          Back to Mentors
                        </button>
                        <div className="bg-white rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
                             <div className="flex items-center space-x-6">
                                {selectedTutor.profileImage ? (
                                  <img src={selectedTutor.profileImage} alt={selectedTutor.name} className="w-20 h-20 rounded-[2rem] object-cover border border-slate-100" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-3xl font-black italic text-[#0D5BFF] border border-slate-100">
                                    {selectedTutor.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">{selectedTutor.name}</h3>
                                  <div className="flex items-center gap-3">
                                    <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest">{selectedTutor.university || 'Educational Expert'}</p>
                                    {selectedTutor.rating && (
                                      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                        <span className="text-[10px] font-black text-amber-700">{selectedTutor.rating.toFixed(1)}</span>
                                        <span className="text-[8px] font-bold text-amber-400 ml-1">({selectedTutor.totalRatings || 0} reviews)</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                             </div>
                             <div className="lg:text-right p-4 bg-slate-50 lg:bg-transparent rounded-2xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Rate</p>
                                <p className="text-2xl font-black text-[#0B132B] italic">৳{selectedTutor.hourlyRate || 0}<span className="text-[10px] uppercase font-bold text-slate-300 ml-1">/hr</span></p>
                             </div>
                          </div>

                         <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Trust Verification</p>
                               <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                        <ShieldCheck className={`w-3 h-3 ${selectedTutor.nidStatus === 'approved' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                        <span className="text-[8px] font-black uppercase text-[#0B132B]">NID Identity</span>
                                     </div>
                                     <span className={`text-[8px] font-black uppercase ${selectedTutor.nidStatus === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {selectedTutor.nidStatus === 'approved' ? 'Verified' : 'Pending'}
                                     </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                        <ShieldCheck className={`w-3 h-3 ${selectedTutor.academicStatus === 'approved' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                        <span className="text-[8px] font-black uppercase text-[#0B132B]">Academic Certs</span>
                                     </div>
                                     <span className={`text-[8px] font-black uppercase ${selectedTutor.academicStatus === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {selectedTutor.academicStatus === 'approved' ? 'Verified' : 'Pending'}
                                     </span>
                                  </div>
                               </div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Experience</p>
                               <p className="text-[10px] font-black text-[#0B132B] uppercase italic">{selectedTutor.experience || 'Not Specified'}</p>
                            </div>
                         </div>

                         {/* Student's Personal Rating History with this Tutor */}
                         {mySessions.filter(s => s.tutorId === selectedTutor.id && s.rating).length > 0 && (
                            <div className="mb-8 p-6 bg-[#0D5BFF]/5 rounded-[2rem] border border-[#0D5BFF]/10 flex items-center justify-between">
                               <div>
                                  <p className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest mb-1">Your Rating History</p>
                                  <p className="text-[10px] font-black text-[#0B132B] uppercase italic">
                                     You have rated this expert {mySessions.filter(s => s.tutorId === selectedTutor.id && s.rating).length} times
                                  </p>
                               </div>
                               <div className="flex gap-1">
                                  {(() => {
                                     const ratedSessions = mySessions.filter(s => s.tutorId === selectedTutor.id && s.rating);
                                     const avg = ratedSessions.reduce((acc, s) => acc + (s.rating || 0), 0) / ratedSessions.length;
                                     return [1,2,3,4,5].map(st => (
                                        <Star key={st} className={`w-3 h-3 ${st <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                     ));
                                  })()}
                               </div>
                            </div>
                         )}

                         {/* Unrated Sessions Prompt */}
                         {mySessions.find(s => s.tutorId === selectedTutor.id && s.status === 'completed' && !s.rating) && (
                            <div className="mb-8 p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center justify-between">
                               <div>
                                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Feedback Needed</p>
                                  <p className="text-[10px] font-black text-amber-900 uppercase italic">You have unrated sessions with this tutor</p>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const unrated = mySessions.find(s => s.tutorId === selectedTutor.id && s.status === 'completed' && !s.rating);
                                   if (unrated) setPendingRatingSession(unrated);
                                 }}
                                 className="px-6 py-3 bg-amber-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-100"
                               >
                                  Rate Now
                               </button>
                            </div>
                         )}

                        <div className="space-y-6 mb-10">
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Credentials & Bio</p>
                              <p className="text-[11px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-[2rem] border border-slate-50 italic">
                                "{selectedTutor.bio || 'This expert has not provided a detailed mission statement yet, but is verified for academic excellence.'}"
                              </p>
                           </div>

                           <div className="space-y-3">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Targeted Tiers (Classes)</p>
                              <div className="flex flex-wrap gap-2">
                                 {(selectedTutor.classes || []).map(cls => (
                                   <span key={cls} className="px-4 py-1.5 bg-slate-100 text-[#0B132B] text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-200">{cls}</span>
                                 ))}
                                 {(selectedTutor.classes || []).length === 0 && <span className="text-[8px] font-bold text-slate-300 ml-4">GENERAL ACADEMIC SUPPORT</span>}
                              </div>
                           </div>
                        </div>

                        <div className="h-px bg-slate-100 mb-8" />

                        {bookingSuccess ? (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-emerald-50 rounded-[2.5rem] text-center border border-emerald-100">
                            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                            <h4 className="text-lg font-black text-emerald-900 uppercase italic">Binding Success</h4>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Check your session log for arrival</p>
                          </motion.div>
                        ) : (
                          <form onSubmit={handleBookingSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Session Date</label>
                                <input 
                                  type="date" 
                                  min={new Date().toISOString().split('T')[0]}
                                  value={bookingDate}
                                  onChange={e => setBookingDate(e.target.value)}
                                  className="w-full bg-slate-100 border-none rounded-xl p-3 text-[10px] font-black uppercase text-[#0B132B]"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Available Slots</label>
                                <select 
                                  value={bookingSlot}
                                  onChange={e => setBookingSlot(e.target.value)}
                                  className="w-full bg-slate-100 border-none rounded-xl p-3 text-[10px] font-black uppercase text-[#0B132B] focus:outline-none"
                                  required
                                >
                                  <option value="">SELECT SLOT</option>
                                  {(() => {
                                    const dayName = new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long' });
                                    const slots = selectedTutor.availabilitySlots?.[dayName] || [];
                                    return slots.length > 0 
                                      ? slots.map(slot => (
                                          <option key={slot} value={slot}>{slot}</option>
                                        ))
                                      : <option disabled value="">NO SLOTS FOR {dayName.toUpperCase()}</option>;
                                  })()}
                                </select>
                                {(() => {
                                  const dayName = new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long' });
                                  const slots = selectedTutor.availabilitySlots?.[dayName] || [];
                                  return slots.length === 0 && (
                                    <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest mt-1 ml-3 px-1">
                                      Expert is not active on {dayName}. Try another date.
                                    </p>
                                  );
                                })()}
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Intel Subject</label>
                                <select 
                                  value={bookingSubject}
                                  onChange={e => setBookingSubject(e.target.value)}
                                  className="w-full bg-slate-100 border-none rounded-xl p-3 text-[10px] font-black uppercase text-[#0B132B] focus:outline-none"
                                  required
                                >
                                  <option value="">SELECT SUBJECT</option>
                                  {AVAILABLE_SUBJECTS.map(sub => (
                                    <option key={sub} value={sub}>{sub.toUpperCase()}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <button 
                              disabled={isBooking}
                              className="w-full py-4 bg-[#0D5BFF] text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                              {isBooking ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  Synchronizing...
                                </>
                              ) : 'Initiate Booking'}
                            </button>
                          </form>
                        )}
                      </div>

                      <div className="bg-[#E51275] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="flex items-center space-x-4 mb-8">
                          <CreditCard className="w-6 h-6" />
                          <h3 className="text-xl font-black uppercase italic">Secured Payout</h3>
                        </div>
                        {paymentSuccess ? (
                           <div className="p-8 bg-white/10 rounded-[2rem] text-center">
                              <h4 className="text-lg font-black uppercase italic">TRX Received</h4>
                           </div>
                        ) : (
                          <form onSubmit={handlePaymentSubmit} className="space-y-4">
                           <DashboardInput label="bKash ID" value={bKashNumber} onChange={setBkashNumber} placeholder="017..." />
                           <div className="flex gap-4">
                              <DashboardInput label="Volume ৳" value={amount} onChange={setAmount} placeholder="1000" type="number" />
                              <DashboardInput label="Trx Hash" value={transactionId} onChange={setTransactionId} placeholder="..." />
                           </div>
                           <button className="w-full bg-white text-[#E51275] py-4 rounded-xl font-black uppercase italic tracking-widest">
                             Authorize Transfer
                           </button>
                          </form>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full min-h-[400px] border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center justify-center text-center p-12">
                       <LayoutDashboard className="w-12 h-12 text-slate-200 mb-6" />
                       <h3 className="text-xl font-black text-slate-300 uppercase italic">Select Profile</h3>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
             <h3 className="text-3xl font-black text-[#0B132B] uppercase italic">Central Activity Logs</h3>
             <div className="grid lg:grid-cols-2 gap-12">
                <section className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm h-fit">
                   <h4 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Lesson History</h4>
                   <div className="space-y-4">
                      {mySessions.map(sess => (
                        <div key={sess.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                           <div>
                              <p className="text-xs font-black text-[#0B132B] uppercase italic">{sess.subject}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(sess.scheduledTime).toLocaleDateString()}</p>
                           </div>
                           <div className="flex flex-col items-end gap-2">
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                               sess.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                             }`}>
                               {sess.status}
                             </span>
                             {sess.status === 'completed' && !sess.rating && (
                               <button 
                                 onClick={() => setPendingRatingSession(sess)}
                                 className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest hover:underline flex items-center gap-1"
                               >
                                 <Star className="w-2 h-2 fill-[#0D5BFF]" />
                                 Rate Tutor
                               </button>
                             )}
                             {sess.rating && (
                               <div className="flex items-center gap-1">
                                 {[1,2,3,4,5].map(st => (
                                   <Star key={st} className={`w-2 h-2 ${st <= sess.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                 ))}
                               </div>
                             )}
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm h-fit">
                   <h4 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Financial Stream</h4>
                   <div className="space-y-4">
                      {myPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                           <div>
                              <p className="text-xs font-black text-[#0B132B] uppercase italic">Payout: ৳{p.amount}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.transactionId}</p>
                           </div>
                           <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                             p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-600'
                           }`}>
                             {p.status}
                           </span>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
          </motion.div>
        )}

        {activeTab === 'transit' && (
          <motion.div 
            key="transit"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid lg:grid-cols-2 gap-12"
          >
             <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                         <MapPin className="w-7 h-7 text-[#0D5BFF]" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Transit Intelligence</h3>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real-time Proximity Radar</p>
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
                   <div className="bg-slate-900 rounded-[3rem] h-[500px] overflow-hidden border-8 border-white shadow-2xl relative">
                      <MapTracker 
                        studentLocation={currentUser.location ? [currentUser.location.lat, currentUser.location.lng] : undefined}
                        studentName="Me (Gaurdian)"
                        tutorLocation={(() => {
                           const sess = mySessions.find(s => s.status === 'active' || s.status === 'scheduled');
                           const tutor = users.find(u => u.id === sess?.tutorId);
                           return (tutor?.isTrackingOn && tutor?.location) ? [tutor.location.lat, tutor.location.lng] : undefined;
                        })()}
                        tutorName={(() => {
                           const sess = mySessions.find(s => s.status === 'active' || s.status === 'scheduled');
                           const tutor = users.find(u => u.id === sess?.tutorId);
                           return tutor?.name;
                        })()}
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">My Status</p>
                         <p className="text-sm font-black text-[#0B132B] uppercase italic">Location Sync Active</p>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal Quality</p>
                         <p className="text-sm font-black text-emerald-500 uppercase italic">High Precision</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-12">
                <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm">
                   <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Active Session Feed</h3>
                   <div className="space-y-6">
                      {mySessions.filter(s => s.status === 'scheduled' || s.status === 'active').map(sess => {
                        const tutor = users.find(u => u.id === sess.tutorId);
                        return (
                          <div key={sess.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-lg font-black italic text-[#0D5BFF]">
                                      {tutor?.name?.charAt(0)}
                                   </div>
                                   <div>
                                      <h4 className="text-sm font-black text-[#0B132B] uppercase italic">{tutor?.name}</h4>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sess.subject}</p>
                                   </div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                  tutor?.isTrackingOn ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-200 text-slate-400'
                                }`}>
                                   {tutor?.isTrackingOn ? 'BROADCASTING' : 'OFFLINE'}
                                </div>
                             </div>
                             <p className="text-[10px] font-black text-slate-500 uppercase italic leading-loose tracking-tight px-2">
                                {tutor?.isTrackingOn 
                                  ? 'Tutor signal is live. Proximity data accessible via radar interface.' 
                                  : 'Waiting for tutor to initiate transit protocol. You will be notified when movement begins.'}
                             </p>
                          </div>
                        );
                      })}
                      {mySessions.filter(s => s.status === 'scheduled' || s.status === 'active').length === 0 && (
                        <div className="py-20 text-center">
                           <Calendar className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active sessions requiring transit oversight</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                         <ShieldCheck className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase italic">Safe Transit Mode</p>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Encrypted End-to-End</p>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'account' && (
          <motion.div 
            key="account"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm max-w-4xl"
          >
             <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-8">
                   <ImageUpload 
                     userId={currentUser.id} 
                     currentImageUrl={currentUser.profileImage} 
                     onUpload={(url) => useAppStore.getState().updateUser(currentUser.id, { profileImage: url })}
                   />
                   <div>
                      <h3 className="text-3xl font-black text-[#0B132B] uppercase italic">Account Sector</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{currentUser.email}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setIsEditingAccount(!isEditingAccount)}
                  className="px-8 py-4 bg-[#0D5BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                   {isEditingAccount ? 'Cancel Edit' : 'Modify ID'}
                </button>
             </div>

             {isEditingAccount ? (
               <form onSubmit={handleAccountUpdate} className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Gaurdian Name</label>
                     <input 
                       value={accountForm.name}
                       onChange={e => setAccountForm({...accountForm, name: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 text-xs font-black text-[#0B132B] uppercase italic focus:outline-none focus:border-[#0D5BFF]"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Contact Logic</label>
                     <input 
                       value={accountForm.phone}
                       onChange={e => setAccountForm({...accountForm, phone: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 text-xs font-black text-[#0B132B] uppercase italic focus:outline-none focus:border-[#0D5BFF]"
                     />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Student Institution</label>
                     <input 
                       value={accountForm.school}
                       onChange={e => setAccountForm({...accountForm, school: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 text-xs font-black text-[#0B132B] uppercase italic focus:outline-none focus:border-[#0D5BFF]"
                     />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Class / Level</label>
                     <select 
                       value={accountForm.studentClass}
                       onChange={e => setAccountForm({...accountForm, studentClass: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 text-xs font-black text-[#0B132B] uppercase italic focus:outline-none focus:border-[#0D5BFF]"
                     >
                       <option value="">SELECT CLASS</option>
                       {AVAILABLE_CLASSES.map(cls => (
                         <option key={cls} value={cls}>{cls.toUpperCase()}</option>
                       ))}
                     </select>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Learning Interest (Multiple)</label>
                     <div className="flex flex-wrap gap-2">
                        {AVAILABLE_SUBJECTS.map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSubject(sub)}
                            className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                              accountForm.subjects.includes(sub)
                              ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-lg shadow-blue-100'
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                     </div>
                  </div>
                  <button 
                    disabled={isUpdating}
                    className="md:col-span-2 py-6 bg-[#0B132B] text-white rounded-3xl font-black uppercase italic tracking-widest hover:bg-[#0D5BFF] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                     {isUpdating ? (
                       <>
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         Synchronizing...
                       </>
                     ) : 'Update Identity Records'}
                  </button>
               </form>
             ) : (
               <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Identity UID</p>
                        <p className="text-xl font-black text-[#0B132B] uppercase italic">{currentUser.name}</p>
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Protocol</p>
                        <p className="text-xl font-black text-[#0B132B] uppercase italic">{currentUser.phone || 'NOT SET'}</p>
                     </div>
                  </div>
                  <div className="space-y-8 border-l border-slate-50 pl-12">
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Institution</p>
                        <p className="text-xl font-black text-[#0B132B] uppercase italic">{currentUser.university || 'NOT SET'}</p>
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Class</p>
                        <p className="text-xl font-black text-[#0B132B] uppercase italic">{currentUser.studentClass || 'NOT SET'}</p>
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Learning Interest</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {(currentUser.subjects || []).map(sub => (
                             <span key={sub} className="px-3 py-1 bg-slate-50 border border-slate-100 text-[8px] font-black uppercase italic text-slate-400 rounded-full">{sub}</span>
                           ))}
                           {(currentUser.subjects || []).length === 0 && <span className="text-xs italic text-slate-300 uppercase">None selected</span>}
                        </div>
                     </div>
                     <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <p className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest mb-2">Member Since</p>
                        <p className="text-sm font-black text-[#0B132B] uppercase italic">May 2024</p>
                     </div>
                  </div>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRatingSession && (
          <RatingModal 
            sessionId={pendingRatingSession.id}
            tutorName={users.find(u => u.id === pendingRatingSession.tutorId)?.name || 'Your Tutor'}
            onClose={() => setPendingRatingSession(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
