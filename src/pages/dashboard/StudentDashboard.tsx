import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, User, Session } from '../../store';
import { useShallow } from 'zustand/react/shallow';
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
  Zap,
  FileText,
  Trash2
} from 'lucide-react';
import MapTracker from '../../components/MapTracker';
import ImageUpload from '../../components/ImageUpload';
import FileUpload from '../../components/FileUpload';
import { motion, AnimatePresence } from 'motion/react';
import { AVAILABLE_SUBJECTS, AVAILABLE_CLASSES, SUBJECT_CATEGORIES, AVAILABLE_VERSIONS } from '../../constants';
import { MetricCard, FilterGroup, DashboardInput } from '../../components/DashboardComponents';
import { Skeleton } from '../../components/Skeleton';
import RatingModal from '../../components/RatingModal';
import ChatWindow from '../../components/ChatWindow';
import { PaymentService, PaymentProvider } from '../../services/paymentService';

export default function StudentDashboard() {
  const { 
    currentUser, 
    users, 
    submitPayment, 
    payments, 
    sessions, 
    bookSession, 
    updateLocation, 
    messages 
  } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    users: state.users,
    submitPayment: state.submitPayment,
    payments: state.payments,
    sessions: state.sessions,
    bookSession: state.bookSession,
    updateLocation: state.updateLocation,
    messages: state.messages
  })));
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [filterVersion, setFilterVersion] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'find' | 'activity' | 'account' | 'transit' | 'messages'>('overview');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showProfileNotice, setShowProfileNotice] = useState(true);

  const isProfileIncomplete = (!currentUser?.address || !currentUser?.school || !currentUser?.studentClass) && !currentUser?.hasDismissedProfileNotice;

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showFilters, setShowFilters] = useState(false);
  const dateScrollRef = useRef<HTMLDivElement>(null);

  const scrollDates = (direction: 'left' | 'right') => {
    if (dateScrollRef.current) {
      const scrollAmount = 300;
      dateScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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
    else if (path.endsWith('/messages')) setActiveTab('messages');
    else setActiveTab('overview');
  }, [location.pathname]);

  const handleTabChange = (tab: 'overview' | 'find' | 'activity' | 'account' | 'transit') => {
    const pathMap = {
      overview: '/dashboard',
      find: '/dashboard/search',
      activity: '/dashboard/activity',
      account: '/dashboard/profile',
      transit: '/dashboard/transit',
      messages: '/dashboard/messages'
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
    subjects: currentUser?.subjects || [],
    address: currentUser?.address || '',
    nidFrontImg: currentUser?.nidFrontImg || '',
    nidBackImg: currentUser?.nidBackImg || '',
    documents: currentUser?.documents || []
  });

  // Sync form state when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingAccount && currentUser) {
      setAccountForm({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        school: currentUser.university || '',
        studentClass: currentUser.studentClass || '',
        subjects: currentUser.subjects || [],
        address: currentUser.address || '',
        nidFrontImg: currentUser.nidFrontImg || '',
        nidBackImg: currentUser.nidBackImg || '',
        documents: currentUser.documents || []
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
  const filteredTutors = useMemo(() => {
    return users.filter(user => {
      if (user.role !== 'tutor' || !user.isVerified) return false;
      
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = user.name.toLowerCase().includes(searchLower) || 
                            user.university?.toLowerCase().includes(searchLower) ||
                            user.course?.toLowerCase().includes(searchLower) ||
                            user.district?.toLowerCase().includes(searchLower) ||
                            user.thana?.toLowerCase().includes(searchLower) ||
                            user.area?.toLowerCase().includes(searchLower) ||
                            user.teachingAreas?.some(a => a.toLowerCase().includes(searchLower));
      
      const matchesSubject = filterSubjects.length === 0 || 
                             filterSubjects.some(fs => user.subjects?.some(s => s.toLowerCase().includes(fs.toLowerCase())));
      
      const matchesVersion = !filterVersion || user.subjects?.some(s => {
        const categorySubjects = SUBJECT_CATEGORIES[filterVersion as keyof typeof SUBJECT_CATEGORIES] || [];
        return categorySubjects.includes(s);
      });

      const matchesClass = !filterClass || user.classes?.some(c => c.toLowerCase().includes(filterClass.toLowerCase()));
      const matchesArea = !filterArea || 
                           user.teachingAreas?.some(a => a.toLowerCase().includes(filterArea.toLowerCase())) ||
                           user.district?.toLowerCase().includes(filterArea.toLowerCase()) ||
                           user.thana?.toLowerCase().includes(filterArea.toLowerCase()) ||
                           user.area?.toLowerCase().includes(filterArea.toLowerCase());
      const matchesRating = !filterRating || (user.rating || 0) >= filterRating;

      return matchesSearch && matchesSubject && matchesVersion && matchesClass && matchesArea && matchesRating;
    });
  }, [users, debouncedSearch, filterSubjects, filterVersion, filterClass, filterArea, filterRating]);

  const [bKashNumber, setBkashNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<PaymentProvider>('bkash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Booking state
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingSubject, setBookingSubject] = useState<string[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Helper to get next 30 days
  const availableDates = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  }), []);

  const getDayName = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const myPayments = useMemo(() => payments.filter(p => p.studentId === currentUser?.id), [payments, currentUser?.id]);
  const mySessions = useMemo(() => sessions.filter(s => s.studentId === currentUser?.id), [sessions, currentUser?.id]);
  const activeSession = useMemo(() => mySessions.find(s => s.status === 'active'), [mySessions]);

  const calculateETA = () => {
    if (!currentUser?.location) return null;
    const sess = mySessions.find(s => s.status === 'active' || s.status === 'scheduled');
    const tutor = users.find(u => u.id === sess?.tutorId);
    if (!tutor?.location || !tutor.isTrackingOn) return null;

    const lat1 = currentUser.location.lat;
    const lon1 = currentUser.location.lng;
    const lat2 = tutor.location.lat;
    const lon2 = tutor.location.lng;

    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    // Assuming average speed of 15 km/h in city traffic
    const speedKmH = 15;
    const timeHours = distance / speedKmH;
    const timeMinutes = Math.round(timeHours * 60);

    return {
      distance: distance.toFixed(2),
      minutes: timeMinutes
    };
  };

  const eta = useMemo(() => calculateETA(), [currentUser?.location, mySessions, users]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isProcessingPayment || !selectedTutor || !currentUser) return;

    setIsProcessingPayment(true);
    
    try {
      // Use manual transactionId if provided, otherwise simulate
      let finalTransactionId = transactionId;
      
      if (!finalTransactionId) {
        const response = await PaymentService.initiatePayment(selectedPaymentProvider, parseFloat(amount));
        if (response.success && response.transactionId) {
          finalTransactionId = response.transactionId;
          setTransactionId(finalTransactionId);
        } else {
          alert(response.message || 'Payment failed. Please try again.');
          setIsProcessingPayment(false);
          return;
        }
      } else {
        // Just a small delay to simulate processing manual ID
        await new Promise(r => setTimeout(r, 1000));
      }

      submitPayment({
        studentId: currentUser.id,
        tutorId: selectedTutor.id,
        amount: parseFloat(amount),
        bKashNumber: bKashNumber || `${selectedPaymentProvider.toUpperCase()}-Gateway`,
        transactionId: finalTransactionId,
      });
      setPaymentSuccess(true);
      
      setTimeout(() => {
        setPaymentSuccess(false);
        setBkashNumber('');
        setAmount('');
        setTransactionId('');
      }, 5000);
    } catch (error) {
      console.error('Payment Error:', error);
      alert('A technical error occurred during the payment flow.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutor || !currentUser || !bookingDate || !bookingSlot || bookingSubject.length === 0) {
      alert("Please fill all booking requirements");
      return;
    }

    setIsBooking(true);
    try {
      const scheduledTime = `${bookingDate}T${bookingSlot}:00`;

      await bookSession({
        studentId: currentUser.id,
        tutorId: selectedTutor.id,
        subject: bookingSubject.join(', '),
        scheduledTime,
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingSlot('');
        setBookingSubject([]);
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
      subjects: accountForm.subjects,
      address: accountForm.address,
      nidFrontImg: accountForm.nidFrontImg,
      nidBackImg: accountForm.nidBackImg,
      documents: accountForm.documents
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
          <p className="text-xs font-bold text-[#0B132B] uppercase tracking-[0.2em]">
            Central Operations for <span className="font-black text-[#0D5BFF] italic">{currentUser.name}</span>
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
          { id: 'messages', label: 'Messages' },
          { id: 'account', label: 'My Account' }
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
            className="overflow-hidden mb-12"
          >
            <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full -mr-40 -mt-40 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#0D5BFF] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Bell className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0D5BFF]">System Alert</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase italic leading-tight mb-3">Optimize Your Learning Experience</h3>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest leading-relaxed">Your profile is currently missing key identification data. Please complete your address and institution details to synchronize with expert tutors in your sector.</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveTab('account')}
                    className="px-8 py-5 bg-[#0D5BFF] text-white rounded-[2rem] text-[10px] font-black uppercase italic tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-500/20"
                  >
                    Complete Profile
                  </button>
                  <button 
                    onClick={() => {
                      setShowProfileNotice(false);
                      useAppStore.getState().updateUser(currentUser.id, { hasDismissedProfileNotice: true });
                    }}
                    className="p-5 bg-white/5 text-slate-400 rounded-[2rem] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

            {activeSession && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-rose-200 group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                      <Play className="w-8 h-8 text-white fill-white animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-100">Live Operation In Progress</span>
                        <div className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black uppercase italic leading-tight">
                        Session with {users.find(u => u.id === activeSession.tutorId)?.name || 'Expert'}
                      </h3>
                      <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest mt-2">
                        Focus: {activeSession.subject} • Started at {activeSession.startTime ? new Date(activeSession.startTime).toLocaleTimeString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleTabChange('transit')}
                      className="px-8 py-4 bg-white text-rose-500 rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-900/20 flex items-center gap-2 group/btn"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Track Expert Location</span>
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    {activeSession.meetingLink && (
                      <a 
                        href={activeSession.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-8 py-4 bg-[#0B132B] text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-black transition-all shadow-xl shadow-rose-900/20"
                      >
                        Join Digital Classroom
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

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
                              <div className="flex items-center gap-3">
                                <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest">{sess.subject} • {new Date(sess.scheduledTime).toLocaleString()}</p>
                                {sess.status === 'scheduled' && (new Date(sess.scheduledTime).getTime() - new Date().getTime()) <= 24 * 60 * 60 * 1000 && (new Date(sess.scheduledTime).getTime() - new Date().getTime()) > 0 && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-md animate-pulse">Starts in &lt;24h</span>
                                )}
                              </div>
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
                     <MapTracker 
                       tutorLocation={[
                         users.find(u => u.id === activeSession.tutorId)!.location!.lat, 
                         users.find(u => u.id === activeSession.tutorId)!.location!.lng
                       ]} 
                       tutorName={users.find(u => u.id === activeSession.tutorId)?.name}
                       eta={eta}
                     />
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

                  <FilterGroup label="Curriculum Version">
                    <div className="flex flex-wrap gap-2">
                      {['', ...AVAILABLE_VERSIONS].map(v => (
                        <button
                          key={v}
                          onClick={() => setFilterVersion(v)}
                          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                            filterVersion === v 
                            ? 'bg-[#0B132B] border-[#0B132B] text-white shadow-md' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {v || 'ALL'}
                        </button>
                      ))}
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

                  <FilterGroup label="Location / Area">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="DISTRICT OR AREA..."
                        value={filterArea}
                        onChange={e => setFilterArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all"
                      />
                      <MapPin className="absolute right-3 top-3 w-4 h-4 text-slate-300" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Subject Specialization">
                    <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar hide-scrollbar py-2">
                      {Object.entries(SUBJECT_CATEGORIES).map(([category, subjects]) => (
                        <div key={category} className="space-y-2">
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <div className="w-1 h-1 bg-[#0D5BFF] rounded-full" />
                            {category}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {subjects.map(sub => {
                              const isSelected = filterSubjects.includes(sub);
                              return (
                                <button
                                  key={sub}
                                  onClick={() => {
                                    setFilterSubjects(prev => 
                                      isSelected 
                                        ? prev.filter(s => s !== sub) 
                                        : [...prev, sub]
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                                    isSelected 
                                    ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-md' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                                  }`}
                                >
                                  {sub}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
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
                      setFilterSubjects([]);
                      setFilterClass('');
                      setFilterArea('');
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
                    {debouncedSearch !== searchTerm ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-6 rounded-[2.5rem] border-2 border-slate-50 bg-white">
                          <div className="flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/3 rounded-lg" />
                              <Skeleton className="h-3 w-1/2 rounded-lg" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      filteredTutors.map(tutor => (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
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
                            <img src={tutor.profileImage} alt={tutor.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" referrerPolicy="no-referrer" loading="lazy" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-lg font-black italic text-[#0D5BFF] border border-slate-100">
                               {tutor.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-black text-[#0B132B] flex items-center uppercase italic group-hover:text-[#0D5BFF] transition-colors">
                                {tutor.name}
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 ml-2" />
                              </h3>
                              <div className="flex items-center gap-1.5">
                                {tutor.availabilitySlots && tutor.availabilitySlots[getDayName(new Date().toISOString())]?.length > 0 && (
                                   <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                      <span className="text-[7px] font-black uppercase tracking-widest">Active Today</span>
                                   </div>
                                )}
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
                      </motion.div>
                    ))
                  )}
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
                                  <img src={selectedTutor.profileImage} alt={selectedTutor.name} className="w-20 h-20 rounded-[2rem] object-cover border border-slate-100" referrerPolicy="no-referrer" loading="lazy" />
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
                                <div className="mt-2 flex items-center justify-end gap-1 text-[#0D5BFF]">
                                   <MapPin className="w-3 h-3" />
                                   <span className="text-[8px] font-black uppercase tracking-widest">{selectedTutor.district}, {selectedTutor.area}</span>
                                </div>
                             </div>
                          </div>

                          <div className="mb-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Teaching Areas Pool</p>
                             <div className="flex flex-wrap gap-2">
                                {(selectedTutor.teachingAreas || []).map(area => (
                                  <span key={area} className="px-3 py-1 bg-white border border-slate-200 text-[8px] font-black uppercase italic text-[#0D5BFF] rounded-full">{area}</span>
                                ))}
                                {(selectedTutor.teachingAreas || []).length === 0 && <span className="text-[8px] italic text-slate-400">No specific areas listed</span>}
                             </div>
                          </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 col-span-2 md:col-span-1">
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
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Experience</p>
                               <p className="text-[10px] font-black text-[#0B132B] uppercase italic">{selectedTutor.experience || 'Not Specified'}</p>
                            </div>
                            <div className="p-6 bg-[#0B132B] rounded-[2rem] border border-white/5 flex flex-col justify-center">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Availability Week</p>
                               <div className="flex gap-1.5 items-center">
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                     const hasSlots = (selectedTutor.availabilitySlots?.[day] || []).length > 0;
                                     return (
                                        <div 
                                          key={day} 
                                          className={`w-3 h-3 rounded-[4px] border ${hasSlots ? 'bg-[#0D5BFF] border-[#0D5BFF]' : 'bg-transparent border-white/10'}`}
                                          title={`${day}: ${hasSlots ? 'Available' : 'No Slots'}`}
                                        />
                                     );
                                  })}
                               </div>
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
                          <form onSubmit={handleBookingSubmit} className="space-y-8">
                            {/* Visual Date Selection */}
                             <div className="space-y-4">
                               <div className="flex items-center justify-between px-4">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1. Select Target Date</label>
                                 <div className="flex items-center gap-1.5 bg-[#0D5BFF]/5 px-2 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-pulse" />
                                    <span className="text-[8px] font-bold text-[#0D5BFF] uppercase tracking-widest">30 Day Window</span>
                                 </div>
                               </div>
                               <div className="relative group">
                                 <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     type="button"
                                     onClick={() => scrollDates('left')}
                                     className="pointer-events-auto ml-1 p-2 bg-white/90 backdrop-blur shadow-lg rounded-full text-[#0B132B] hover:bg-white transition-all transform active:scale-95"
                                   >
                                     <ChevronLeft className="w-4 h-4" />
                                   </button>
                                 </div>
                                 <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     type="button"
                                     onClick={() => scrollDates('right')}
                                     className="pointer-events-auto mr-1 p-2 bg-white/90 backdrop-blur shadow-lg rounded-full text-[#0B132B] hover:bg-white transition-all transform active:scale-95"
                                   >
                                     <ChevronRight className="w-4 h-4" />
                                   </button>
                                 </div>
                                 <div 
                                   ref={dateScrollRef}
                                   className="flex gap-3 overflow-x-auto pb-6 pt-2 hide-scrollbar snap-x cursor-grab active:cursor-grabbing px-4 scroll-smooth"
                                 >
                                   {availableDates.map((date) => {
                                     const dayName = getDayName(date);
                                     const hasSlots = (selectedTutor.availabilitySlots?.[dayName] || []).length > 0;
                                     const isSelected = bookingDate === date;
                                     const isToday = date === new Date().toISOString().split('T')[0];
                                     
                                     return (
                                       <button
                                         key={date}
                                         type="button"
                                         onClick={() => {
                                           setBookingDate(date);
                                           setBookingSlot(''); // Reset slot when date changes
                                         }}
                                         className={`flex-shrink-0 w-24 p-5 rounded-3xl border transition-all snap-start ${
                                           isSelected 
                                           ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-xl shadow-blue-200 -translate-y-1' 
                                           : hasSlots 
                                             ? 'bg-white border-slate-100 text-[#0B132B] hover:border-slate-300 hover:shadow-lg' 
                                             : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                                         }`}
                                       >
                                         <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'opacity-80' : 'opacity-40'}`}>
                                           {dayName.substring(0, 3)}
                                         </p>
                                         <p className="text-xl font-black">
                                           {new Date(date).getDate()}
                                         </p>
                                         {isToday && !isSelected && <p className="text-[7px] font-black text-[#0D5BFF] uppercase mt-1">Today</p>}
                                         {!hasSlots && <p className="text-[7px] font-black uppercase tracking-tighter mt-1">Full</p>}
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>
                             </div>

                            {/* Visual Slot Selection */}
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">2. Select Time Node</label>
                              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                {(() => {
                                  const dayName = getDayName(bookingDate);
                                  const slots = selectedTutor.availabilitySlots?.[dayName] || [];
                                  
                                  if (slots.length === 0) {
                                    return (
                                      <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                        <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                          No temporal slots available for this cycle
                                        </p>
                                      </div>
                                    );
                                  }

                                  return slots.map(slot => (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() => setBookingSlot(slot)}
                                      className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        bookingSlot === slot 
                                        ? 'bg-[#0B132B] text-white border-[#0B132B] shadow-xl' 
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-[#0D5BFF] hover:text-[#0D5BFF]'
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>

                            {/* Subject Selection & Submit */}
                            <div className="space-y-6 pt-4">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">3. Define Intel Focus</label>
                                  {bookingSubject.length > 0 && (
                                    <span className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest">{bookingSubject.length} SELECTED</span>
                                  )}
                                </div>
                                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 hide-scrollbar py-2 border-l border-slate-50 pl-4">
                                  {Object.entries(SUBJECT_CATEGORIES).map(([category, subjects]) => (
                                    <div key={category} className="space-y-3">
                                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full" />
                                        {category}
                                      </label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {subjects.map(sub => {
                                          const isSelected = bookingSubject.includes(sub);
                                          return (
                                            <button
                                              key={sub}
                                              type="button"
                                              onClick={() => {
                                                setBookingSubject(prev => 
                                                  isSelected 
                                                    ? prev.filter(s => s !== sub) 
                                                    : [...prev, sub]
                                                );
                                              }}
                                              className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                                isSelected 
                                                ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-lg shadow-blue-100' 
                                                : 'bg-slate-50 border-slate-50 text-slate-400 hover:bg-slate-100 hover:border-slate-200'
                                              }`}
                                            >
                                              {sub}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecipientId(selectedTutor.id);
                                    setActiveTab('messages');
                                  }}
                                  className="py-5 bg-white border-2 border-slate-100 text-[#0B132B] rounded-3xl text-[11px] font-black uppercase italic tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                                >
                                  <Send className="w-4 h-4" />
                                  Message Expert
                                </button>
                                <button 
                                  disabled={isBooking || !bookingDate || !bookingSlot || bookingSubject.length === 0}
                                  className="py-5 bg-[#0D5BFF] text-white rounded-3xl text-[11px] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-blue-200 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                                >
                                  {isBooking ? (
                                    <>
                                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                      Synchronizing...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-5 h-5" />
                                      Confirm Session
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </form>
                        )}
                      </div>

                      <div className={`${selectedPaymentProvider === 'bkash' ? 'bg-[#E51275]' : selectedPaymentProvider === 'nagad' ? 'bg-[#F6921E]' : 'bg-[#002B49]'} rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden transition-colors duration-500`}>
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center space-x-4">
                            <CreditCard className="w-6 h-6" />
                            <h3 className="text-xl font-black uppercase italic">Secured Checkout</h3>
                          </div>
                          <div className="flex gap-2">
                             {(['bkash', 'nagad'] as PaymentProvider[]).map(p => (
                               <button 
                                 key={p}
                                 onClick={() => setSelectedPaymentProvider(p)}
                                 className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                   selectedPaymentProvider === p 
                                   ? 'bg-white text-[#0B132B] border-white' 
                                   : 'bg-white/10 border-white/20 hover:bg-white/20'
                                 }`}
                               >
                                 {p}
                               </button>
                             ))}
                          </div>
                        </div>
                        {paymentSuccess ? (
                           <div className="p-8 bg-white/10 rounded-[2rem] text-center border border-white/20 backdrop-blur-sm">
                              <CheckCircle className="w-12 h-12 text-white mx-auto mb-4" />
                              <h4 className="text-lg font-black uppercase italic">Transaction Confirmed</h4>
                              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-2">TRX ID: {transactionId}</p>
                           </div>
                        ) : (
                          <form onSubmit={handlePaymentSubmit} className="space-y-4">
                           <div className="space-y-4">
                             <DashboardInput 
                               label={`${selectedPaymentProvider.toUpperCase()} Number`} 
                               value={bKashNumber} 
                               onChange={setBkashNumber} 
                               placeholder="017..." 
                             />
                             <div className="flex gap-4">
                                <DashboardInput 
                                  label="Amount ৳" 
                                  value={amount} 
                                  onChange={setAmount} 
                                  placeholder="1000" 
                                  type="number" 
                                />
                                <DashboardInput 
                                  label="Transaction ID" 
                                  value={transactionId} 
                                  onChange={setTransactionId} 
                                  placeholder="TRX..." 
                                />
                             </div>
                           </div>
                           
                           <button 
                             disabled={isProcessingPayment || !amount}
                             className={`w-full py-5 rounded-2xl font-black uppercase italic tracking-widest transition-all scale-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 ${
                               selectedPaymentProvider === 'bkash' ? 'bg-white text-[#E51275]' : 
                               selectedPaymentProvider === 'nagad' ? 'bg-white text-[#F6921E]' : 
                               'bg-[#00AAAD] text-white'
                             }`}
                           >
                             {isProcessingPayment ? (
                               <div className="w-5 h-5 border-3 border-current/30 border-t-current rounded-full animate-spin"></div>
                             ) : (
                               <>
                                 <Zap className="w-5 h-5" />
                                 Pay via {selectedPaymentProvider.toUpperCase()}
                               </>
                             )}
                           </button>
                           
                           <p className="text-[8px] font-medium text-white/50 text-center uppercase tracking-widest mt-4">
                             Secure simulation active. No real funds will be deducted.
                           </p>
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
                        eta={eta}
                      />
                   </div>

                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">My Status</p>
                         <p className="text-sm font-black text-[#0B132B] uppercase italic">Location Sync Active</p>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal Quality</p>
                         <p className="text-sm font-black text-emerald-500 uppercase italic">High Precision</p>
                      </div>
                      {eta && (
                        <div className="p-8 bg-[#0D5BFF] rounded-[2.5rem] border border-blue-400 shadow-xl shadow-blue-100 col-span-2 lg:col-span-1">
                           <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest mb-1">Estimated Arrival</p>
                           <div className="flex items-baseline gap-2">
                              <p className="text-2xl font-black text-white italic">{eta.minutes} MINS</p>
                              <p className="text-[9px] font-black text-blue-200 uppercase italic">({eta.distance} KM)</p>
                           </div>
                        </div>
                      )}
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

        {activeTab === 'messages' && (
          <motion.div 
            key="messages"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid lg:grid-cols-3 gap-8 h-[700px]"
          >
            <div className="lg:col-span-1 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
               <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8 px-2">Contacts</h3>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar hide-scrollbar">
                  {(() => {
                    // Logic: Tutors I have a session record with OR message history
                    const myTutorIdsFromSessions = mySessions.map(s => s.tutorId);
                    const myTutorIdsFromMessages = messages.map(m => m.senderId === currentUser.id ? m.receiverId : m.senderId);
                    const allContactIds = Array.from(new Set([...myTutorIdsFromSessions, ...myTutorIdsFromMessages]));
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
                                {contact.university}
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
                     currentImageUrl={currentUser.profileImage} 
                     onUpload={(url) => useAppStore.getState().updateUser(currentUser.id, { profileImage: url })}
                   />
                   <div>
                      <h3 className="text-3xl font-black text-[#0B132B] uppercase italic">Account Sector</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{currentUser.email}</p>
                   </div>
                </div>
                <button 
                  onClick={() => {
                    if (isEditingAccount) {
                      handleAccountUpdate({ preventDefault: () => {} } as React.FormEvent);
                    } else {
                      setIsEditingAccount(true);
                    }
                  }}
                  className="px-8 py-4 bg-[#0D5BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                   {isEditingAccount ? 'Lock Changes in System' : 'Modify ID'}
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
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Physical Address</label>
                       <input 
                         value={accountForm.address}
                         onChange={e => setAccountForm({...accountForm, address: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 text-xs font-black text-[#0B132B] uppercase italic focus:outline-none focus:border-[#0D5BFF]"
                         placeholder="Enter full residential address"
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
                    <div className="md:col-span-2 space-y-6">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Learning Interest (Multiple)</label>
                       {Object.entries(SUBJECT_CATEGORIES).map(([category, subjects]) => (
                         <div key={category} className="space-y-3 pl-4">
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full" />
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{category}</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             {subjects.map(sub => (
                               <button
                                 key={sub}
                                 type="button"
                                 onClick={() => toggleSubject(sub)}
                                 className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
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
                       ))}
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
                       ) : 'Lock Changes in System'}
                    </button>
                </form>
              ) : (
                <div className="space-y-12">
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
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Physical Address</p>
                          <p className="text-xl font-black text-[#0B132B] uppercase italic">{currentUser.address || 'NOT SET'}</p>
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

                  <div className="pt-12 border-t border-slate-100">
                    <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Payment Logic History</h3>
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
                              {new Date(p.date).toLocaleString()} • Sent via {p.bKashNumber}
                            </p>
                          </div>
                          <div className="text-2xl font-black text-[#0B132B] italic">৳{p.amount}</div>
                        </div>
                      ))}
                      {payments.length === 0 && (
                        <div className="p-12 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No transaction records found</p>
                        </div>
                      )}
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
