import React, { useState, useEffect, useRef, useMemo, memo, lazy, Suspense } from 'react';
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
  Phone,
  Mail,
  Users,
  Calendar,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Zap,
  FileText,
  Trash2,
  BookOpen,
  Binary,
  Dna,
  Languages,
  Laptop,
  Compass,
  Atom,
  GraduationCap,
  Download,
  MapPinOff,
  AlertCircle,
  X,
  MessageSquare,
  Award,
  Shield,
  ShieldAlert,
  Check,
  DollarSign,
  Activity,
  Mars,
  Venus
} from 'lucide-react';
const MapTracker = lazy(() => import('../../components/MapTracker'));
const ImageUpload = lazy(() => import('../../components/ImageUpload'));
const FileUpload = lazy(() => import('../../components/FileUpload'));
const RatingModal = lazy(() => import('../../components/RatingModal'));
const ChatWindow = lazy(() => import('../../components/ChatWindow'));
import { motion, AnimatePresence } from 'motion/react';
import { AVAILABLE_SUBJECTS, AVAILABLE_CLASSES, SUBJECT_CATEGORIES, AVAILABLE_VERSIONS } from '../../constants';
import { MetricCard, FilterGroup, DashboardInput } from '../../components/DashboardComponents';
import { Skeleton } from '../../components/Skeleton';
import { PaymentService, PaymentProvider } from '../../services/paymentService';
import BKashGatewaySim from '../../components/BKashGatewaySim';
import { jsPDF } from 'jspdf';

const MapLoading = () => (
   <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
     <div className="w-8 h-8 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin mb-2"></div>
     <p className="text-[8px] font-black uppercase tracking-widest leading-loose">Booting Satellite Feed...</p>
   </div>
);

const getTutorLocation = (tutorId: string, tutorLocation?: { lat: number; lng: number }, studentLoc?: [number, number]): [number, number] | null => {
  if (tutorLocation?.lat && tutorLocation?.lng) {
    return [tutorLocation.lat, tutorLocation.lng];
  }
  if (studentLoc) {
    const charSum = tutorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((charSum % 70) - 35) / 1000;
    const lngOffset = (((charSum * 13) % 70) - 35) / 1000;
    return [studentLoc[0] + latOffset, studentLoc[1] + lngOffset];
  }
  return null;
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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
  const [filterGender, setFilterGender] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [showLocationDeniedModal, setShowLocationDeniedModal] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'find' | 'activity' | 'account' | 'transit' | 'messages'>('overview');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showProfileNotice, setShowProfileNotice] = useState(true);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  const [viewingProfileSession, setViewingProfileSession] = useState<Session | null>(null);

  const getMaskedPhone = (phone?: string) => {
    if (!phone) return 'Hidden for Privacy';
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return 'Hidden for Privacy';
    return `${trimmed.slice(0, 4)}••••${trimmed.slice(-3)}`;
  };

  const getMaskedEmail = (email?: string) => {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2) return 'Hidden for Privacy';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 
      ? `${name.slice(0, 2)}••••`
      : '••••';
    return `${maskedName}@${domain}`;
  };
  const [nearbyRadius, setNearbyRadius] = useState<number>(5); // Default 5 km
  const [transitMode, setTransitMode] = useState<'tracking' | 'radar'>('radar'); // Default to radar so they see nearby instantly!
  const [mapSubjectQuery, setMapSubjectQuery] = useState('');
  const [mapMinRating, setMapMinRating] = useState<number>(0);

  const handleDownloadPDF = () => {
    if (!currentUser || myPayments.length === 0) return;

    const doc = new jsPDF();
    
    // Header Colors
    const primaryColor = [11, 19, 43]; // #0B132B
    const accentColor = [13, 91, 255]; // #0D5BFF
    const darkGray = [55, 65, 81]; // #374151
    const lightGray = [156, 163, 175]; // #9CA3AF
    
    // Draw Top Accent Ribbon
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 6, 'F');

    // Title / Brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('EduTrack Bangladesh', 14, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('The Secure Home Tutoring & Financial Tracking Platform', 14, 27);

    // Invoice/Report Title (Right aligned)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('PAYMENT STATEMENT REPORT', 196, 22, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 196, 27, { align: 'right' });

    // Divider Line
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 34, 196, 34);

    // Student & Summary Info Blocks
    // Student Box (left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('STUDENT INFORMATION', 14, 43);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Name: ${currentUser.name}`, 14, 49);
    doc.text(`Email: ${currentUser.email}`, 14, 54);
    doc.text(`Status: Verified Account`, 14, 59);

    // Summary Box (right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('ACCOUNT TRANSACTION SUMMARY', 115, 43);

    const approvedPayments = myPayments.filter(p => p.status === 'approved');
    const pendingPayments = myPayments.filter(p => p.status === 'pending');
    const totalSpent = approvedPayments.reduce((acc, curr) => acc + curr.amount, 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Total Approved Spend: BDT ${totalSpent} ৳`, 115, 49);
    doc.text(`Pending Transactions: ${pendingPayments.length}`, 115, 54);
    doc.text(`Total Transaction Records: ${myPayments.length}`, 115, 59);

    // Decorative line under info
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 66, 196, 66);

    // Table Headers
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, 72, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('SL', 18, 77.5);
    doc.text('Date / Time', 28, 77.5);
    doc.text('Transaction ID', 58, 77.5);
    doc.text('Tutor Specialist', 98, 77.5);
    doc.text('Channel Num / Method', 133, 77.5);
    doc.text('Amount', 178, 77.5, { align: 'right' });
    doc.text('Status', 194, 77.5, { align: 'right' });

    let y = 80;
    
    myPayments.forEach((p, index) => {
      // Manage overflow
      if (y > 270) {
        doc.addPage();
        // Top Ribbon
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 0, 210, 6, 'F');
        
        // Re-header for page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('EduTrack Bangladesh - Continuation Report', 14, 15);
        doc.setDrawColor(229, 231, 235);
        doc.line(14, 18, 196, 18);
        y = 25;
      }

      const tutorName = users.find(u => u.id === p.tutorId)?.name || 'EduTrack Tutor';
      const orderDate = p.date ? new Date(p.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A';

      // Background row striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, y, 182, 8, 'F');
      }
      
      // Bottom border line for each row
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(14, y + 8, 196, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      
      doc.text(String(index + 1), 18, y + 5);
      doc.text(orderDate, 28, y + 5);
      doc.text(p.transactionId, 58, y + 5);
      
      // Handle potential long tutor name truncation
      const truncatedTutorName = tutorName.length > 20 ? tutorName.substring(0, 18) + '..' : tutorName;
      doc.text(truncatedTutorName, 98, y + 5);
      
      doc.text(p.bKashNumber || 'Bkash Gateway', 133, y + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.amount} BDT`, 178, y + 5, { align: 'right' });

      // Status text style
      if (p.status === 'approved') {
        doc.setTextColor(16, 185, 129); // emerald-500
      } else if (p.status === 'pending') {
        doc.setTextColor(245, 158, 11); // amber-500
      } else {
        doc.setTextColor(239, 68, 68); // red-500
      }
      doc.text(p.status.toUpperCase(), 194, y + 5, { align: 'right' });

      y += 8;
    });

    // Check bottom space for signature footer
    if (y > 250) {
      doc.addPage();
      y = 30;
    }

    // Official Stamp / Signature Space
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('This document is electronically generated from EduTrack Bangladesh.', 14, y + 15);
    doc.text('All transaction values are verified against bkash / nagad gateway integrations securely.', 14, y + 19);

    // Right-side Authorized Signature placeholder
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.line(145, y + 25, 195, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('System Verified Audit Office', 170, y + 30, { align: 'center' });

    doc.save(`EduTrack_Payment_Report_${currentUser.name.replace(/\\s+/g, '_')}.pdf`);
  };

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

  const refreshLocationManual = async () => {
    if (!('geolocation' in navigator)) {
      setLocationErrorMessage("Geolocation services are not supported by this browser. Please use a modern browser like Chrome, Edge, or Firefox to track your transit.");
      setShowLocationDeniedModal(true);
      return;
    }

    // Try to check user permission state beforehand to provide immediate descriptive state
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setLocationErrorMessage("Browser geolocation permission has been blocked or denied. To enable real-time transit tracking, please open your browser's site settings (click the lock icon in the address bar next to the URL) and allow location permissions for this application.");
          setShowLocationDeniedModal(true);
          return;
        }
      } catch (e) {
        console.warn("Permissions query lookup bypassed:", e);
      }
    }

    setIsRefreshingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(currentUser!.id, pos.coords.latitude, pos.coords.longitude);
        setIsRefreshingLocation(false);
        useAppStore.getState().sendNotification(
          currentUser!.id,
          "Location Synchronized",
          "Your current transit position has been successfully synchronized on the tracking radar.",
          "success"
        );
      },
      (err) => {
        console.error("Geolocation tracking error:", err);
        setIsRefreshingLocation(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationErrorMessage("Browser geolocation permission has been denied. To enable real-time tracking, please click the lock/settings icon in the browser address bar and switch the 'Location' permission to 'Allow'.");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationErrorMessage("Your device was unable to retrieve a pinpointed physical location coordinate. Please verify that your cellular network, WiFi, or device GPS services are enabled.");
            break;
          case err.TIMEOUT:
            setLocationErrorMessage("The request to retrieve device geolocation timed out. Please try sending the synchronization signal again.");
            break;
          default:
            setLocationErrorMessage(err.message || "An unexpected error occurred during physical geolocation retrieval.");
            break;
        }
        setShowLocationDeniedModal(true);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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
    documents: currentUser?.documents || [],
    gender: currentUser?.gender || ''
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
        documents: currentUser.documents || [],
        gender: currentUser.gender || ''
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
    const unique = new Map();
    users.filter(user => {
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
      const matchesGender = !filterGender || (user.gender && user.gender.toLowerCase() === filterGender.toLowerCase());

      return matchesSearch && matchesSubject && matchesVersion && matchesClass && matchesArea && matchesRating && matchesGender;
    }).forEach(u => unique.set(u.id, u));
    return Array.from(unique.values()) as User[];
  }, [users, debouncedSearch, filterSubjects, filterVersion, filterClass, filterArea, filterRating, filterGender]);

  const [bKashNumber, setBkashNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<PaymentProvider>('bkash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isBKashModalOpen, setIsBKashModalOpen] = useState(false);
  
  // Booking state
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingSubject, setBookingSubject] = useState<string[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Custom interactive subject system states
  const [activeSubjectTab, setActiveSubjectTab] = useState<'Bangla Version' | 'English Version' | 'Madrasha'>('Bangla Version');
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');

  // Helper mapping keywords to elegant visual icons representing academic areas
  const getSubjectIcon = (subName: string) => {
    const name = subName.toLowerCase();
    if (name.includes('math')) return Binary;
    if (name.includes('physic') || name.includes('chem') || name.includes('science')) return Atom;
    if (name.includes('biol') || name.includes('dna')) return Dna;
    if (name.includes('bangla') || name.includes('english') || name.includes('arabic')) return Languages;
    if (name.includes('ict') || name.includes('computer')) return Laptop;
    if (name.includes('quran') || name.includes('hadith') || name.includes('fiqh') || name.includes('stud') || name.includes('aqaid')) return BookOpen;
    if (name.includes('account') || name.includes('financ') || name.includes('business') || name.includes('manage')) return GraduationCap;
    if (name.includes('econom') || name.includes('history') || name.includes('geograph') || name.includes('social')) return Compass;
    return BookOpen;
  };

  // Helper to get next 30 days
  const availableDates = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  }), []);

  const getDayName = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const myPayments = useMemo(() => {
    const paymentMap = new Map();
    payments.filter(p => p.studentId === currentUser?.id).forEach(p => {
      if (!paymentMap.has(p.id)) {
        paymentMap.set(p.id, p);
      }
    });
    return Array.from(paymentMap.values());
  }, [payments, currentUser?.id]);

  const mySessions = useMemo(() => {
    const sessionMap = new Map();
    sessions.filter(s => s.studentId === currentUser?.id).forEach(s => {
      if (!sessionMap.has(s.id)) {
        sessionMap.set(s.id, s);
      }
    });
    return Array.from(sessionMap.values());
  }, [sessions, currentUser?.id]);
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
        const response = await PaymentService.initiatePayment(selectedPaymentProvider, parseFloat(String(amount).replace(/,/g, '')));
        if (response.success && response.transactionId) {
          finalTransactionId = response.transactionId;
          setTransactionId(finalTransactionId);
        } else {
          useAppStore.getState().sendNotification(
            currentUser.id,
            'Payment Option Failed',
            response.message || 'Payment processing failed. Please try again.',
            'error'
          );
          setIsProcessingPayment(false);
          return;
        }
      } else {
        // Just a small delay to simulate processing manual ID
        await new Promise(r => setTimeout(r, 100));
      }

      submitPayment({
        studentId: currentUser.id,
        tutorId: selectedTutor.id,
        amount: parseFloat(String(amount).replace(/,/g, '')),
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
      useAppStore.getState().sendNotification(
        currentUser.id,
        'Payment Technical Error',
        'A technical connection error occurred during checkout payment processing.',
        'error'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBKashSuccess = async (trxId: string, wallet: string) => {
    if (!amount || !selectedTutor || !currentUser) return;
    setIsProcessingPayment(true);
    try {
      setBkashNumber(wallet);
      setTransactionId(trxId);
      setIsBKashModalOpen(false);

      await submitPayment({
        studentId: currentUser.id,
        tutorId: selectedTutor.id,
        amount: parseFloat(String(amount).replace(/,/g, '')),
        bKashNumber: wallet,
        transactionId: trxId,
      });

      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setBkashNumber('');
        setAmount('');
        setTransactionId('');
      }, 5000);
    } catch (error) {
      console.error('Payment Error from BKash Modal:', error);
      useAppStore.getState().sendNotification(
        currentUser.id,
        'Checkout Pipeline Error',
        'A technical error occurred while appending transaction details.',
        'error'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutor || !currentUser || !bookingDate || !bookingSlot || bookingSubject.length === 0) {
      useAppStore.getState().sendNotification(
        currentUser.id,
        'Incomplete Session Criteria',
        'Please define all required properties (date, slot, and subjects) first.',
        'warning'
      );
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
        status: 'requested_by_student'
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingSlot('');
        setBookingSubject([]);
      }, 3000);
    } catch (error) {
      console.error(error);
      useAppStore.getState().sendNotification(
        currentUser.id,
        'Booking System Error',
        'Your request failed to synchronize. Please check specified slot availability.',
        'error'
      );
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
      documents: accountForm.documents,
      gender: accountForm.gender
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
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4">
            Student Panel
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-[#0B132B] uppercase tracking-[0.2em]">
            Welcome, <span className="font-black text-[#0D5BFF] italic">{currentUser.name}</span>
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
        {isProfileIncomplete && showProfileNotice && (() => {
          const completedCount = [!!currentUser?.studentClass, !!currentUser?.school, !!currentUser?.address].filter(Boolean).length;
          const progressPercent = Math.round((completedCount / 3) * 100);
          return (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="bg-gradient-to-br from-[#0B132B] via-[#111C3A] to-[#1C2C5E] rounded-[3rem] p-8 lg:p-10 text-white relative overflow-hidden group border border-blue-500/20 shadow-2xl shadow-blue-950/20">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-tr from-[#0D5BFF]/30 to-purple-600/20 rounded-full -mr-40 -mt-40 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-2xl" />
                
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-8 md:gap-10">
                  <div className="max-w-3xl space-y-6">
                    {/* Category Header */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-ping"></span>
                        <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full absolute"></span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] pl-2">Onboarding Roadmap</span>
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-3 py-1 rounded-full">
                        Step {completedCount} of 3 Complete
                      </div>
                    </div>

                    {/* Heading & description */}
                    <div>
                      <h3 className="text-3xl sm:text-4xl font-black uppercase italic leading-[1.1] mb-3 tracking-tight">
                        Setup Your Profile <br className="hidden sm:inline" />
                        & Find Elite Instructors
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xl">
                        Complete your academic portfolio to unlock smart geolocation routing, expert auto-matching, and instant classroom validation.
                      </p>
                    </div>

                    {/* Checklists */}
                    <div className="grid sm:grid-cols-3 gap-4 pt-2">
                      {[
                        { label: 'Academic Class', checked: !!currentUser?.studentClass, value: currentUser?.studentClass || 'Not Specified' },
                        { label: 'School / College', checked: !!currentUser?.school, value: currentUser?.school || 'Not Specified' },
                        { label: 'Delivery Address', checked: !!currentUser?.address, value: currentUser?.address || 'Not Specified' },
                      ].map((step, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-2xl border transition-all duration-300 ${
                            step.checked 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-950/20' 
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{step.label}</span>
                            <span className={`w-2 h-2 rounded-full ${step.checked ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-rose-500'}`} />
                          </div>
                          <p className={`text-xs font-black truncate ${step.checked ? 'text-emerald-200' : 'text-slate-300 font-medium'}`}>
                            {step.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Controls & Progress */}
                  <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-6 xl:w-72 justify-between flex-shrink-0 self-stretch xl:self-auto bg-white/[0.02] border border-white/5 p-6 rounded-3xl backdrop-blur-md">
                    <div className="w-full text-center sm:text-left xl:text-center space-y-2">
                      <div className="flex items-center justify-between xl:justify-center xl:space-x-4 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0D5BFF]">Portfolio Progress</span>
                        <span className="text-sm font-black font-mono text-[#0D5BFF]">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-[2px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-[#0D5BFF] to-blue-400 rounded-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full">
                      <button 
                        onClick={() => setActiveTab('account')}
                        className="flex-1 py-4 px-6 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-blue-500/20 text-center"
                      >
                        Complete Now
                      </button>
                      <button 
                        onClick={() => {
                          setShowProfileNotice(false);
                          useAppStore.getState().updateUser(currentUser.id, { hasDismissedProfileNotice: true });
                        }}
                        className="p-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 flex items-center justify-center"
                        title="Skip onboarding"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard label="Sessions" value={mySessions.length.toString()} />
              <MetricCard label="Active Tutors" value={Array.from(new Set(mySessions.filter(s => s.status !== 'cancelled').map(s => s.tutorId))).length.toString()} />
              <MetricCard label="Total Spent" value={`৳${myPayments.filter(p => p.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0)}`} />
              <MetricCard label="Learning Hours" value={mySessions.filter(s => s.status === 'completed').length.toString()} />
            </div>

            {activeSession && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-rose-200 group"
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

            {/* Tuition Pipeline Section */}
            {mySessions.some(s => s.status === 'proposed_by_tutor' || s.status === 'requested_by_student') && (
              <div id="student-tuition-pipeline" className="bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-[2.5rem] p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-3xl" />
                
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0D5BFF] animate-ping" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF]">Tuition Pipeline</span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic">Pending Offers & Requests</h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
                    {mySessions.filter(s => s.status === 'proposed_by_tutor' || s.status === 'requested_by_student').length} Pending
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {mySessions.filter(s => s.status === 'proposed_by_tutor' || s.status === 'requested_by_student').map(sess => {
                    const isProposal = sess.status === 'proposed_by_tutor';
                    const party = users.find(u => u.id === sess.tutorId);
                    
                    return (
                      <div 
                        key={sess.id} 
                        className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-colors"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded ${
                              isProposal ? 'bg-indigo-600/80 text-white border border-indigo-500/35' : 'bg-slate-700/80 text-slate-300'
                            }`}>
                              {isProposal ? 'Offer Received' : 'Request Pending'}
                            </span>
                            <span className="text-[9px] font-black text-slate-400">
                              {new Date(sess.scheduledTime).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-black italic text-lg text-blue-400">
                              {party?.name?.charAt(0) || 'T'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-black italic uppercase text-white truncate">{party?.name}</h4>
                              <p className="text-[10px] text-slate-400 truncate">{party?.university || 'Expert Tutor'}</p>
                            </div>
                          </div>

                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject / Focus</div>
                            <div className="text-xs font-black italic text-[#0D5BFF]">{sess.subject}</div>
                            <div className="text-[10px] text-slate-350 font-medium mt-1.5 leading-relaxed">
                              Time Slot: <span className="font-extrabold text-white">{new Date(sess.scheduledTime).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <button
                            id={`view-proposed-tutor-btn-${sess.id}`}
                            onClick={() => {
                              setViewingProfileUser(party || null);
                              setViewingProfileSession(sess);
                            }}
                            className="w-full py-3 bg-white/10 hover:bg-[#0D5BFF] text-white border border-white/10 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all cursor-pointer"
                          >
                            View Credentials & Profile
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                           <div className="relative">
                             {tutor?.profileImage ? (
                               <img 
                                 src={tutor.profileImage} 
                                 alt={tutor.name} 
                                 className="w-14 h-14 rounded-[1.2rem] object-cover border border-slate-100"
                                 referrerPolicy="no-referrer"
                               />
                             ) : (
                               <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-[#0D5BFF] transition-colors border ${sess.status === 'active' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                 {sess.status === 'active' ? <Zap className="w-6 h-6 text-rose-500" /> : <Calendar className="w-6 h-6" />}
                               </div>
                             )}
                             {sess.status === 'active' && (
                               <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
                             )}
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-black text-[#0B132B] uppercase italic">{tutor?.name}</h4>
                                {tutor?.rating && (
                                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                    <span className="text-[9px] font-black text-amber-700">{tutor.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
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
                           <div className="space-y-6">
                <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Expert Radius</h3>
                 <div className="bg-slate-50 rounded-[3rem] p-4 border border-slate-100 h-64 overflow-hidden relative">
                    {currentUser?.location ? (
                      <Suspense fallback={<MapLoading />}>
                        <MapTracker 
                          studentLocation={[currentUser.location.lat, currentUser.location.lng]}
                          studentName="Me"
                          tutors={(() => {
                            const uniqueTutors = new Map();
                            mySessions
                              .filter(s => s.status === 'active' || s.status === 'scheduled')
                              .forEach(s => {
                                const tutor = users.find(u => u.id === s.tutorId);
                                if (tutor) {
                                  const coords = getTutorLocation(tutor.id, tutor.location, [currentUser.location!.lat, currentUser.location!.lng]);
                                  if (coords && !uniqueTutors.has(tutor.id)) {
                                    uniqueTutors.set(tutor.id, {
                                      id: tutor.id,
                                      location: coords,
                                      name: tutor.name,
                                      image: tutor.profileImage,
                                      isOnline: tutor.isTrackingOn
                                    });
                                  }
                                }
                              });
                            users
                              .filter(u => u.role === 'tutor' && u.isVerified)
                              .forEach(tutor => {
                                const coords = getTutorLocation(tutor.id, tutor.location, [currentUser.location!.lat, currentUser.location!.lng]);
                                if (coords && !uniqueTutors.has(tutor.id) && uniqueTutors.size < 6) {
                                  uniqueTutors.set(tutor.id, {
                                    id: tutor.id,
                                    location: coords,
                                    name: tutor.name,
                                    image: tutor.profileImage,
                                    isOnline: tutor.isTrackingOn
                                  });
                                }
                              });
                            return Array.from(uniqueTutors.values());
                          })()}
                          eta={eta}
                        />
                      </Suspense>
                    ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-[2.5rem] text-white">
                       <MapPin className="w-8 h-8 mb-3 text-[#0D5BFF] animate-pulse" />
                       <h4 className="text-xs font-black uppercase tracking-widest leading-none">Active Radar Offline</h4>
                       <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-1 px-4 leading-normal">
                         Activate physical coordinates to map verified mentors in your viewport.
                       </p>
                       <button 
                         onClick={refreshLocationManual}
                         disabled={isRefreshingLocation}
                         className="mt-4 px-4 py-2.5 bg-[#0D5BFF] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 leading-none shrink-0"
                       >
                         {isRefreshingLocation ? 'Scanning Sector...' : 'Enable Real-time Radar'}
                       </button>
                     </div>
                    )}
                </div>
              </div>  </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'find' && (
          <motion.div 
            key="find"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="flex flex-col gap-8"
          >
            {/* Map Preview of All Tutors */}
            <div className="bg-white rounded-[3.5rem] p-4 border border-slate-100 shadow-sm overflow-hidden h-72 relative">
               <div className="absolute top-8 left-8 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase italic text-[#0B132B] shadow-sm border border-slate-100">
                 Global Tutor Radius: {filteredTutors.length} Experts Found
               </div>
               <Suspense fallback={<MapLoading />}>
                 <MapTracker 
                   studentLocation={currentUser.location ? [currentUser.location.lat, currentUser.location.lng] : undefined}
                   studentName="Me"
                   tutors={filteredTutors
                     .filter(t => t.location)
                     .map(t => ({
                       id: t.id,
                       location: [t.location!.lat, t.location!.lng] as [number, number],
                       name: t.name,
                       image: t.profileImage,
                       isOnline: t.isTrackingOn
                     }))}
                 />
               </Suspense>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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

                  <FilterGroup label="Tutor Gender">
                    <div className="flex flex-wrap gap-2">
                      {['', 'Male', 'Female'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setFilterGender(g)}
                          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                            filterGender === g
                              ? 'bg-[#0B132B] border-[#0B132B] text-white shadow-md'
                              : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {g || 'ANY GENDER'}
                        </button>
                      ))}
                    </div>
                  </FilterGroup>

                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterSubjects([]);
                      setFilterClass('');
                      setFilterArea('');
                      setFilterRating(0);
                      setFilterGender('');
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
                      filteredTutors.map((tutor, index) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: 0.35,
                            ease: [0.16, 1, 0.3, 1],
                            delay: Math.min(index * 0.04, 0.24)
                          }}
                          key={tutor.id} 
                          id={`tutor-card-${tutor.id}`}
                          onClick={() => setSelectedTutor(tutor)}
                          className={`tutor-card p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 relative group overflow-hidden ${
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
                              <h3 className="text-sm font-black text-[#0B132B] flex items-center gap-1.5 uppercase italic group-hover:text-[#0D5BFF] transition-colors">
                                <span className="truncate">{tutor.name}</span>
                                {tutor.gender === 'Male' && <Mars className="w-3.5 h-3.5 text-sky-500 font-bold shrink-0" title="Male" />}
                                {tutor.gender === 'Female' && <Venus className="w-3.5 h-3.5 text-rose-500 font-bold shrink-0" title="Female" />}
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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
                              {tutor.university} • {tutor.hourlyRate ? `৳${tutor.hourlyRate}/month` : 'N/A'} • {tutor.daysPerWeek || 3} Days/Wk
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
                             <div className="flex items-start space-x-6">
                                {selectedTutor.profileImage ? (
                                  <img src={selectedTutor.profileImage} alt={selectedTutor.name} className="w-20 h-20 rounded-[2rem] object-cover border border-slate-100" referrerPolicy="no-referrer" loading="lazy" />
                                ) : (
                                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-3xl font-black italic text-[#0D5BFF] border border-slate-100">
                                    {selectedTutor.name.charAt(0)}
                                  </div>
                                )}
                                <div className="space-y-3">
                                  <div>
                                    <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">{selectedTutor.name}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
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

                                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-100/80">
                                    <div>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tutor Fee</p>
                                      <p className="text-xl font-black text-[#0B132B] italic">৳{selectedTutor.hourlyRate || 0}<span className="text-[10px] uppercase font-bold text-slate-300 ml-1">/month</span></p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Teaching Schedule</p>
                                      <p className="text-xl font-black text-[#0D5BFF] italic">{selectedTutor.daysPerWeek || 3}<span className="text-[10px] uppercase font-bold text-slate-300 ml-1"> Days/Week</span></p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#0D5BFF] bg-blue-50/50 px-3.5 py-1.5 rounded-xl border border-blue-100/50">
                                       <MapPin className="w-3.5 h-3.5" />
                                       <span className="text-[9px] font-black uppercase tracking-widest">{selectedTutor.district}, {selectedTutor.area}</span>
                                    </div>
                                  </div>
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

                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Academic Background</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-6 rounded-[2rem] border border-slate-50/80 font-sans">
                                 <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 animate-fade-in">
                                       <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">University</span>
                                       <p className="text-xs font-black text-[#0B132B] mt-1">{selectedTutor.university || 'Educational Expert'}</p>
                                    </div>
                                 </div>

                                 <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                                       <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Course / Department</span>
                                       <p className="text-xs font-black text-[#0B132B] mt-1">{selectedTutor.course || 'Advising Specialist'}</p>
                                    </div>
                                 </div>

                                 <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-[#0D5BFF] rounded-xl flex items-center justify-center shrink-0">
                                       <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Academic Term</span>
                                       <p className="text-xs font-black text-[#0B132B] mt-1">
                                          {selectedTutor.semester || selectedTutor.year 
                                             ? [selectedTutor.year ? `${selectedTutor.year} Year` : null, selectedTutor.semester ? `${selectedTutor.semester} Semester` : null].filter(Boolean).join(', ')
                                             : 'Full Program Completed'}
                                       </p>
                                    </div>
                                 </div>

                                 <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                       <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Academic Integrity</span>
                                       <p className="text-xs font-black text-[#0B132B] mt-1 flex items-center gap-1">
                                          <span className={`w-1.5 h-1.5 rounded-full ${selectedTutor.academicStatus === 'approved' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                          {selectedTutor.academicStatus === 'approved' ? 'Officially Verified Portal' : 'Verification Under Audit'}
                                       </p>
                                    </div>
                                 </div>
                              </div>
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

                           {/* Masked Contact Details for Security */}
                           <div className="space-y-3">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Contact Channels</p>
                             <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                               <div className="grid sm:grid-cols-2 gap-4">
                                 <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-blue-50 text-[#0D5BFF] rounded-xl flex items-center justify-center">
                                     <Phone className="w-4 h-4" />
                                   </div>
                                   <div>
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Phone Contact</span>
                                     <p className="text-xs font-black text-[#0B132B] mt-0.5">{getMaskedPhone(selectedTutor.phone)}</p>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                                     <Mail className="w-4 h-4" />
                                   </div>
                                   <div>
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Primary Email</span>
                                     <p className="text-xs font-bold text-[#0B132B] mt-0.5 truncate max-w-[170px]">{getMaskedEmail(selectedTutor.email)}</p>
                                   </div>
                                 </div>
                               </div>

                               <div className="pt-3 border-t border-slate-200/50 flex items-start gap-2.5">
                                 <span className="text-xs text-amber-500 shrink-0 mt-0.5">🔐</span>
                                 <p className="text-[10px] text-slate-500 leading-normal">
                                   <strong>Privacy Encrypted:</strong> Direct channels are masked to protect student and tutor security. Please use the built-in <strong>Inbox Message</strong>, <strong>Chat Panel</strong>, or official tuition booking pipeline to coordinate schedules.
                                 </p>
                                </div>
                              </div>
                           </div>
                        </div>

                        <div className="h-px bg-slate-100 mb-8" />

                        {bookingSuccess ? (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-emerald-50 rounded-[2.5rem] text-left md:text-center border border-emerald-100">
                            <CheckCircle className="w-10 h-10 text-emerald-500 ml-0 mr-auto md:mx-auto mb-4" />
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
                                   className="flex flex-col sm:flex-row gap-3 overflow-y-auto sm:overflow-x-auto max-h-[300px] sm:max-h-none pb-4 sm:pb-6 pt-2 hide-scrollbar snap-y sm:snap-x cursor-grab active:cursor-grabbing px-4 scroll-smooth"
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
                                         className={`flex-shrink-0 w-full sm:w-24 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all snap-start flex sm:flex-col items-center sm:justify-center justify-between text-left sm:text-center ${
                                           isSelected 
                                           ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-xl shadow-blue-200 -translate-y-1' 
                                           : hasSlots 
                                             ? 'bg-white border-slate-100 text-[#0B132B] hover:border-slate-300 hover:shadow-lg' 
                                             : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                                         }`}
                                       >
                                         <div className="flex sm:flex-col items-baseline sm:items-center gap-2 sm:gap-0 leading-none">
                                           <p className={`text-[8px] font-black uppercase tracking-widest sm:mb-1 ${isSelected ? 'opacity-80' : 'opacity-40'}`}>
                                             {dayName.substring(0, 3)}
                                           </p>
                                           <p className="text-sm sm:text-xl font-black leading-none animate-fade-in">
                                             {new Date(date).getDate()}
                                           </p>
                                         </div>
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
                              <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-2 uppercase">2. Select Time Node</label>
                              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
                                {(() => {
                                  const dayName = getDayName(bookingDate);
                                  const slots = selectedTutor.availabilitySlots?.[dayName] || [];
                                  
                                  if (slots.length === 0) {
                                    return (
                                      <div className="col-span-full py-8 text-left px-6 md:text-center md:px-0 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 w-full animate-fade-in">
                                        <Clock className="w-8 h-8 text-slate-200 ml-0 mr-auto md:mx-auto mb-2" />
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
                                      className={`py-3.5 px-4 sm:py-1.5 sm:px-3 rounded-2xl sm:rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border text-center w-full sm:w-auto ${
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
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">3. Curriculum Selection {selectedTutor ? "— Tutor's Subjects Only" : ""}</label>
                                  {bookingSubject.length > 0 && (
                                    <span className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest">{bookingSubject.length} Focus Selected</span>
                                  )}
                                </div>

                                {/* Curricular Version Tabs Selection */}
                                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                  {(['Bangla Version', 'English Version', 'Madrasha'] as const).map(tab => {
                                    const isActive = activeSubjectTab === tab;
                                    return (
                                      <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveSubjectTab(tab)}
                                        className={`w-full sm:flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                                          isActive 
                                            ? 'bg-[#0D5BFF] text-white shadow-md shadow-blue-500/10' 
                                            : 'text-slate-400 dark:text-slate-500 hover:text-[#0B132B] dark:hover:text-white'
                                        }`}
                                      >
                                        {tab.replace(' Version', '')}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Dynamic Intelligence Subject Filter and Quick Focus Toggles */}
                                <div className="space-y-3 pt-1">
                                  <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <input
                                      type="text"
                                      placeholder="Search subjects dynamically..."
                                      value={subjectSearchTerm}
                                      onChange={e => setSubjectSearchTerm(e.target.value)}
                                      className="un-focused w-full bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl pl-12 pr-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF]"
                                    />
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const stemSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Higher Math', 'General Science', 'Mathematics (EV)', 'Physics (EV)', 'Chemistry (EV)', 'Biology (EV)', 'Higher Math (EV)', 'General Science (EV)', 'Mathematics (Madrasha)'].filter(s => 
                                          selectedTutor?.subjects ? selectedTutor.subjects.includes(s) : true
                                        );
                                        const hasStem = stemSubjects.length > 0 && stemSubjects.some(s => bookingSubject.includes(s));
                                        if (hasStem) {
                                          setBookingSubject(prev => prev.filter(s => !stemSubjects.includes(s)));
                                        } else if (stemSubjects.length > 0) {
                                          setBookingSubject(prev => Array.from(new Set([...prev, ...stemSubjects])));
                                        }
                                      }}
                                      className={`px-3 py-3 sm:py-2 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider border transition-all text-center w-full sm:w-auto ${
                                        bookingSubject.some(s => ['Physics', 'Chemistry', 'Mathematics', 'Biology'].some(stem => s.includes(stem)))
                                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-500'
                                      }`}
                                    >
                                      🧬 SCIENCE
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const commerceSubjects = ['Accounting', 'Finance', 'Economics', 'Business Studies', 'Management', 'Accounting (EV)', 'Finance (EV)', 'Economics (EV)', 'Business Studies (EV)', 'Management (EV)'].filter(s => 
                                          selectedTutor?.subjects ? selectedTutor.subjects.includes(s) : true
                                        );
                                        const hasCommerce = commerceSubjects.length > 0 && commerceSubjects.some(s => bookingSubject.includes(s));
                                        if (hasCommerce) {
                                          setBookingSubject(prev => prev.filter(s => !commerceSubjects.includes(s)));
                                        } else if (commerceSubjects.length > 0) {
                                          setBookingSubject(prev => Array.from(new Set([...prev, ...commerceSubjects])));
                                        }
                                      }}
                                      className={`px-3 py-3 sm:py-2 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider border transition-all text-center w-full sm:w-auto ${
                                        bookingSubject.some(s => ['Accounting', 'Finance', 'Business'].some(comm => s.includes(comm)))
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-emerald-500'
                                      }`}
                                    >
                                      💼 BUSINESS STUDIES
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const humSubjects = ['Bangla', 'English', 'History', 'Geography', 'Social Science', 'Bangla (EV)', 'English (EV)', 'Social Science (Madrasha)', 'English (Madrasha)'].filter(s => 
                                          selectedTutor?.subjects ? selectedTutor.subjects.includes(s) : true
                                        );
                                        const hasHum = humSubjects.length > 0 && humSubjects.some(s => bookingSubject.includes(s));
                                        if (hasHum) {
                                          setBookingSubject(prev => prev.filter(s => !humSubjects.includes(s)));
                                        } else if (humSubjects.length > 0) {
                                          setBookingSubject(prev => Array.from(new Set([...prev, ...humSubjects])));
                                        }
                                      }}
                                      className={`px-3 py-3 sm:py-2 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider border transition-all text-center w-full sm:w-auto ${
                                        bookingSubject.some(s => ['Bangla', 'English', 'History', 'Geography'].some(hum => s.includes(hum)))
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500'
                                      }`}
                                    >
                                      📚 Humanities
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBookingSubject([])}
                                      className="w-full sm:w-auto sm:ml-auto py-3 sm:py-2 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-mono text-center"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>

                                {/* Subjects Interactive Dynamic Grid */}
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar py-2 border-l border-slate-100/50 dark:border-slate-800/50 pl-4">
                                  {(() => {
                                    const availableSubjects = (SUBJECT_CATEGORIES[activeSubjectTab] || []).filter(sub => 
                                      selectedTutor?.subjects ? selectedTutor.subjects.includes(sub) : true
                                    );
                                    const filteredList = availableSubjects.filter(sub => 
                                      sub.toLowerCase().includes(subjectSearchTerm.toLowerCase())
                                    );

                                    if (filteredList.length === 0) {
                                      return (
                                        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-150 dark:border-slate-800 text-slate-400 dark:text-slate-500 w-full">
                                          <p className="text-[9px] font-black uppercase tracking-widest leading-loose">
                                            {selectedTutor ? "No matched tutor-expert subjects" : "No matched curricular Focus"}
                                          </p>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {filteredList.map(sub => {
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
                                              className={`flex items-center justify-between p-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border text-left cursor-pointer group ${
                                                isSelected 
                                                ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-lg shadow-blue-500/10' 
                                                : 'bg-white dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                              }`}
                                            >
                                              <span className="truncate pr-2">{sub.replace(' (EV)', '').replace(' (Madrasha)', '')}</span>
                                              {isSelected ? (
                                                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[#0D5BFF] text-[8px] font-black shrink-0">
                                                  ✓
                                                </div>
                                              ) : (
                                                <div className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700 shrink-0 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
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
                           <div className="p-8 bg-white/10 rounded-[2rem] text-left md:text-center border border-white/20 backdrop-blur-sm">
                              <CheckCircle className="w-12 h-12 text-white ml-0 mr-auto md:mx-auto mb-4" />
                              <h4 className="text-lg font-black uppercase italic">Transaction Confirmed</h4>
                              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-2 flex justify-start md:justify-center">TRX ID: {transactionId}</p>
                           </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedPaymentProvider === 'bkash' && (
                              <div className="p-6 bg-white/10 rounded-3xl border border-white/20 flex flex-col items-start md:items-center gap-3 text-left md:text-center mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-[#FFF]">bKash Sandbox API Active</span>
                                </div>
                                <p className="text-[10px] text-white/90 font-medium uppercase tracking-widest leading-relaxed">
                                  Select an amount, then click below to launch the secure bKash merchant simulator to test OTP & secure PIN callbacks automatically.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    let activeAmt = amount;
                                    // Auto-populate with selected tutor's hourly rate if empty
                                    if (!activeAmt && selectedTutor?.hourlyRate) {
                                      activeAmt = selectedTutor.hourlyRate.toLocaleString('en-US');
                                      setAmount(activeAmt);
                                    }
                                    
                                    if (!activeAmt || parseFloat(String(activeAmt).replace(/,/g, '')) <= 0) {
                                      useAppStore.getState().sendNotification(
                                        currentUser.id,
                                        "Validation Required",
                                        "Please enter a valid payment Amount (৳) first before launching the portal.",
                                        "warning"
                                      );
                                      return;
                                    }
                                    setIsBKashModalOpen(true);
                                  }}
                                  className="w-full bg-white text-[#E51275] py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-start md:justify-center px-4 gap-2 group-hover:scale-[1.02] shadow-xl shadow-[#E51275]/10 animate-pulse font-sans"
                                >
                                  <Zap className="w-4 h-4 fill-current text-[#E51275]" />
                                  LAUNCH SECURE BKASH PORTAL
                                </button>
                                <div className="w-full border-t border-white/10 my-1"></div>
                                <span className="text-[8px] text-white/50 font-medium uppercase tracking-widest">
                                  Or use manual logging channel instead
                                </span>
                              </div>
                            )}

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
                                  onChange={(v) => {
                                     const clean = v.replace(/[^0-9]/g, "");
                                     const formatted = clean ? Number(clean).toLocaleString('en-US') : "";
                                     setAmount(formatted);
                                   }} 
                                  placeholder="e.g. 10,000 or 5,000" 
                                  type="text" 
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
                           
                           <p className="text-[8px] font-medium text-white/50 text-left md:text-center uppercase tracking-widest mt-4">
                             Secure simulation active. No real funds will be deducted.
                           </p>
                          </form>
                        </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full min-h-[400px] border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-start md:items-center justify-center text-left md:text-center p-12">
                       <LayoutDashboard className="w-12 h-12 text-slate-200 mb-6 ml-0 mr-auto md:mx-auto" />
                       <h3 className="text-xl font-black text-slate-300 uppercase italic">Select Profile</h3>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="space-y-8"
          >
             <h3 className="text-xl sm:text-3xl font-black text-[#0B132B] uppercase italic">Central Activity Logs</h3>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                <section className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 border border-slate-100 shadow-sm h-fit">
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

                <section className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 border border-slate-100 shadow-sm h-fit">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                       <h4 className="text-xl font-black text-[#0B132B] uppercase italic">Financial Stream</h4>
                       {myPayments.length > 0 && (
                         <button
                           onClick={handleDownloadPDF}
                           className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#0D5BFF] hover:text-white bg-blue-50 hover:bg-[#0D5BFF] dark:bg-blue-950/20 dark:hover:bg-[#0D5BFF] border border-blue-100 dark:border-blue-900/50 rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer leading-tight h-10 shrink-0"
                           title="Export Transaction Records as PDF Report"
                         >
                           <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                           Download PDF
                         </button>
                       )}
                    </div>
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
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="grid lg:grid-cols-2 gap-12"
          >
             <div className="bg-white rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
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
                     className="inline-flex items-center gap-2 px-5 py-3.5 bg-[#0D5BFF] hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 leading-none shrink-0"
                     title="Request browser permission and refresh real-time coordinates"
                   >
                      <MapPin className={`w-3.5 h-3.5 ${isRefreshingLocation ? 'animate-bounce' : ''}`} />
                       Get Real-time Location
                   </button>
                </div>

                <div className="space-y-8 flex-1">
                   <div className="flex items-start gap-4 p-5 bg-blue-50/45 dark:bg-blue-950/10 rounded-3xl border border-blue-100/40 dark:border-blue-900/10 transition-all">
                     <div className="w-8 h-8 rounded-xl bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center shrink-0">
                       <Compass className="w-4 h-4 text-[#0D5BFF]" />
                     </div>
                     <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF]">Navigation Hint</p>
                       <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-normal">
                         By clicking must-see marker icons of tutors or students, you can view them on Google Maps via their popups.
                       </p>
                     </div>
                   </div>
                    {currentUser?.location && (
                      <div className="space-y-3 p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all animate-fade-in mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-1.5">
                            <span className="animate-pulse">🛰️</span> Active Map Query filters
                          </span>
                          {(() => {
                            let totalDetected = 0;
                            users
                              .filter(u => u.role === 'tutor' && u.isVerified)
                              .forEach(t => {
                                const coords = getTutorLocation(t.id, t.location, [currentUser.location!.lat, currentUser.location!.lng]);
                                if (coords) {
                                  const dist = getDistance(currentUser.location!.lat, currentUser.location!.lng, coords[0], coords[1]);
                                  if (dist <= nearbyRadius) {
                                    totalDetected++;
                                  }
                                }
                              });

                            const totalMatched = users
                              .filter(u => u.role === 'tutor' && u.isVerified)
                              .filter(u => {
                                if (mapSubjectQuery) {
                                  const uSub = u.subjects || [];
                                  if (!uSub.some(sub => sub.toLowerCase().includes(mapSubjectQuery.toLowerCase()))) {
                                    return false;
                                  }
                                }
                                if (mapMinRating > 0 && (u.rating || 0) < mapMinRating) {
                                  return false;
                                }
                                return true;
                              })
                              .map(t => {
                                const coords = getTutorLocation(t.id, t.location, [currentUser.location!.lat, currentUser.location!.lng]);
                                if (!coords) return null;
                                const dist = getDistance(currentUser.location!.lat, currentUser.location!.lng, coords[0], coords[1]);
                                if (dist > nearbyRadius) return null;
                                return t;
                              })
                              .filter(t => t !== null).length;

                            return (
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Matching: <span className="text-[#0D5BFF] italic font-bold">{totalMatched}</span> / {totalDetected} Sector Tutors
                              </span>
                            );
                          })()}
                        </div>

                        <div className="grid sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-7 relative">
                            <Compass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Search subjects (e.g. Physics, Chemistry, Math)..."
                              value={mapSubjectQuery}
                              onChange={(e) => setMapSubjectQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#111A2E] text-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0D5BFF]"
                            />
                          </div>

                          <div className="sm:col-span-5 flex gap-2">
                            <select
                              value={mapMinRating || ''}
                              onChange={(e) => setMapMinRating(Number(e.target.value) || 0)}
                              className="flex-1 px-3 py-2.5 bg-white dark:bg-[#111A2E] text-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0D5BFF] cursor-pointer"
                            >
                              <option value={0}>All Ratings</option>
                              <option value={4.0}>⭐ 4.0+ Stars</option>
                              <option value={4.5}>⭐ 4.5+ Stars</option>
                              <option value={4.8}>⭐ 4.8+ Stars</option>
                              <option value={5.0}>⭐ 5.0 Stars</option>
                            </select>

                            {(mapSubjectQuery || mapMinRating > 0) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMapSubjectQuery('');
                                  setMapMinRating(0);
                                }}
                                className="px-3.5 py-2.5 text-[9px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 leading-none shrink-0"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {!currentUser?.location ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-[2.5rem] text-white">
                        <MapPin className="w-12 h-12 mb-4 text-[#0D5BFF] animate-bounce" />
                        <h4 className="text-lg font-black uppercase tracking-widest">Active Radar Offline</h4>
                        <p className="text-xs text-slate-300 uppercase tracking-wider mt-2 px-6 leading-relaxed bg-white/5 py-3 rounded-2xl border border-white/5">
                          EduTrack requires your coordinates to scan your sector for nearby academic mentors.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full max-w-xs justify-center mx-auto">
                          <button 
                            onClick={refreshLocationManual}
                            disabled={isRefreshingLocation}
                            className="w-full py-4 bg-[#0D5BFF] hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Compass className={`w-4 h-4 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
                            GPS Scan
                          </button>
                          <button 
                            onClick={async () => {
                              await updateLocation(currentUser!.id, 23.7508, 90.3935);
                              useAppStore.getState().sendNotification(
                                currentUser!.id,
                                "Dhaka Center Simulated",
                                "Simulated location near student's Dhaka portal.",
                                "success"
                              );
                            }}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 text-center"
                          >
                            Demo Sandbox Scan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] h-[350px] sm:h-[500px] overflow-hidden border-4 sm:border-8 border-white shadow-2xl relative animate-fade-in">
                        <Suspense fallback={<MapLoading />}>
                          <MapTracker 
                            studentLocation={[currentUser.location.lat, currentUser.location.lng]}
                            studentName="Me"
                            studentImage={currentUser.profileImage}
                            tutors={(() => {
                              if (transitMode === 'tracking') {
                                const uniqueTutors = new Map();
                                mySessions
                                  .filter(s => s.status === 'active' || s.status === 'scheduled')
                                  .forEach(s => {
                                    const tutor = users.find(u => u.id === s.tutorId);
                                    if (tutor) {
                                      // Apply search filters
                                      if (mapSubjectQuery) {
                                        const tSub = tutor.subjects || [];
                                        if (!tSub.some(sub => sub.toLowerCase().includes(mapSubjectQuery.toLowerCase()))) {
                                          return;
                                        }
                                      }
                                      if (mapMinRating > 0 && (tutor.rating || 0) < mapMinRating) {
                                        return;
                                      }

                                      const coords = getTutorLocation(tutor.id, tutor.location, [currentUser.location!.lat, currentUser.location!.lng]);
                                      if (coords && !uniqueTutors.has(tutor.id)) {
                                        uniqueTutors.set(tutor.id, {
                                          id: tutor.id,
                                          location: coords,
                                          name: tutor.name,
                                          image: tutor.profileImage,
                                          isOnline: tutor.isTrackingOn,
                                          subjects: tutor.subjects,
                                          rating: tutor.rating
                                        });
                                      }
                                    }
                                  });
                                return Array.from(uniqueTutors.values());
                              } else {
                                return users
                                  .filter(u => u.role === 'tutor' && u.isVerified)
                                  .filter(u => {
                                    if (mapSubjectQuery) {
                                      const uSub = u.subjects || [];
                                      if (!uSub.some(sub => sub.toLowerCase().includes(mapSubjectQuery.toLowerCase()))) {
                                        return false;
                                      }
                                    }
                                    if (mapMinRating > 0 && (u.rating || 0) < mapMinRating) {
                                      return false;
                                    }
                                    return true;
                                  })
                                  .map(t => {
                                    const coords = getTutorLocation(t.id, t.location, [currentUser.location!.lat, currentUser.location!.lng]);
                                    if (!coords) return null;
                                    const dist = getDistance(currentUser.location!.lat, currentUser.location!.lng, coords[0], coords[1]);
                                    if (dist > nearbyRadius) return null;
                                    return {
                                      id: t.id,
                                      location: coords,
                                      name: t.name,
                                      image: t.profileImage,
                                      isOnline: t.isTrackingOn,
                                      subjects: t.subjects,
                                      rating: t.rating
                                    };
                                  })
                                  .filter((t): t is NonNullable<typeof t> => t !== null);
                              }
                            })()}
                            eta={transitMode === 'tracking' ? eta : undefined}
                          />
                        </Suspense>
                      </div>
                    )}

                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="p-6 sm:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">My Status</p>
                         <p className="text-sm font-black text-[#0B132B] uppercase italic">Location Sync Active</p>
                      </div>
                      <div className="p-6 sm:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal Quality</p>
                         <p className="text-sm font-black text-emerald-500 uppercase italic">High Precision</p>
                      </div>
                      {eta && (
                        <div className="p-6 sm:p-8 bg-[#0D5BFF] rounded-[2.5rem] border border-blue-400 shadow-xl shadow-blue-100 sm:col-span-2 lg:col-span-1">
                           <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest mb-1">Estimated Arrival</p>
                           <div className="flex items-baseline gap-2">
                              <p className="text-lg sm:text-2xl font-black text-white italic">{eta.minutes} MINS</p>
                              <p className="text-[9px] font-black text-blue-200 uppercase italic">({eta.distance} KM)</p>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-12">
                <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-4 sm:p-12 border border-slate-100 shadow-sm">
                   <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">Active Session Feed</h3>
                   <div className="space-y-6">
                      {mySessions.filter(s => s.status === 'scheduled' || s.status === 'active').map(sess => {
                        const tutor = users.find(u => u.id === sess.tutorId);
                        return (
                          <div key={sess.id} className="p-4 sm:p-8 bg-slate-50 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100">
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
                        <div className="py-20 text-left md:text-center">
                           <Calendar className="w-12 h-12 text-slate-100 ml-0 mr-auto md:mx-auto mb-4" />
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
                         <p className="text-[10px] font-black uppercase italic">Safe Location Track</p>
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="grid lg:grid-cols-3 gap-8 h-auto lg:h-[700px]"
          >
            <div className={`lg:col-span-1 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col ${selectedRecipientId ? 'hidden lg:flex' : 'flex'}`}>
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
                        <div className="py-20 text-left md:text-center opacity-20">
                          <Users className="w-12 h-12 ml-0 mr-auto md:mx-auto mb-4" />
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
                           <div className="relative shrink-0">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic border ${
                               selectedRecipientId === contact.id ? 'bg-white/20 border-white/10' : 'bg-slate-50 border-slate-100'
                             }`}>
                               {contact.name.charAt(0)}
                             </div>
                             {unreadCount > 0 && (
                               <span className="absolute -top-1.5 -right-1.5 bg-[#E51275] text-white text-[8px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-bounce shadow-md">
                                 {unreadCount}
                               </span>
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black italic truncate">{contact.name}</h4>
                              <p className={`text-[8px] font-black uppercase tracking-widest truncate ${
                                selectedRecipientId === contact.id ? 'opacity-60' : 'text-slate-400'
                              }`}>
                                {contact.university}
                              </p>
                           </div>
                        </button>
                      );
                    });
                  })()}
               </div>
            </div>
            <div className={`lg:col-span-2 ${selectedRecipientId ? 'block' : 'hidden lg:block'}`}>
               {selectedRecipientId ? (
                 <Suspense fallback={<div className="h-20 bg-slate-50 animate-pulse rounded-2xl" />}>
                   <ChatWindow recipientId={selectedRecipientId} onBack={() => setSelectedRecipientId(null)} />
                 </Suspense>
               ) : (
                 <div className="h-full border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-start md:items-center justify-center text-left md:text-center p-12 opacity-30">
                    <Send className="w-12 h-12 mb-6 ml-0 mr-auto md:mx-auto" />
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="bg-white rounded-[2rem] sm:rounded-[4rem] p-4 sm:p-10 md:p-16 border border-slate-100 shadow-sm max-w-4xl"
          >
             <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-6 mb-16">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left">
                   <ImageUpload 
                     currentImageUrl={currentUser.profileImage} 
                     onUpload={(url) => useAppStore.getState().updateUser(currentUser.id, { profileImage: url })}
                     onDelete={() => useAppStore.getState().updateUser(currentUser.id, { profileImage: "" })}
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
                   {isEditingAccount ? 'Confirm Changes' : 'Update Profile'}
                </button>
             </div>

              {isEditingAccount ? (
                <form onSubmit={handleAccountUpdate} className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Guardian Name</label>
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
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Gender Selection</label>
                       <select 
                         value={accountForm.gender}
                         onChange={e => setAccountForm({...accountForm, gender: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 text-xs font-black text-[#0B132B] uppercase italic focus:outline-none focus:border-[#0D5BFF]"
                       >
                         <option value="">SELECT GENDER</option>
                         <option value="Male">MALE</option>
                         <option value="Female">FEMALE</option>
                         <option value="Other">OTHER</option>
                       </select>
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
                       ) : 'Confirm Changes'}
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
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                          <p className="text-xl font-black text-[#0D5BFF] uppercase italic">{currentUser.gender || 'NOT SET'}</p>
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
                        <div className="p-12 text-left md:text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
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
          <Suspense fallback={null}>
            <RatingModal 
              sessionId={pendingRatingSession.id}
              tutorName={users.find(u => u.id === pendingRatingSession.tutorId)?.name || 'Your Tutor'}
              onClose={() => setPendingRatingSession(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBKashModalOpen && (
          <BKashGatewaySim
            isOpen={isBKashModalOpen}
            onClose={() => setIsBKashModalOpen(false)}
            amount={parseFloat(String(amount).replace(/,/g, '')) || 0}
            tutorName={selectedTutor?.name || 'Expert Tutor'}
            onPaymentSuccess={handleBKashSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLocationDeniedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30 text-rose-500">
                  <MapPinOff className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-[#0B132B] dark:text-white uppercase italic animate-bounce">Location Sync Warning</h4>
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">Permission required for transit</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed uppercase tracking-wide">
                  {locationErrorMessage}
                </p>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-900/50 flex gap-3 text-slate-500">
                  <AlertCircle className="w-5 h-5 shrink-0 text-[#0D5BFF]" />
                  <p className="text-[9px] font-black uppercase tracking-widest leading-loose">
                     EduTrack transit tracking requires occasional physical location updates to calculate precise tutor routes for safety.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowLocationDeniedModal(false)}
                    className="w-full sm:flex-1 py-4 bg-[#0B132B] hover:bg-slate-800 text-white dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowLocationDeniedModal(false);
                      await updateLocation(currentUser!.id, 23.7508, 90.3935);
                      useAppStore.getState().sendNotification(
                        currentUser!.id,
                        "Dhaka Center Simulated",
                        "Location simulated successfully inside the sandbox environment.",
                        "success"
                      );
                    }}
                    className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer text-center"
                  >
                    Simulate Demo Loc
                  </button>
                  <button
                    onClick={() => {
                      setShowLocationDeniedModal(false);
                      refreshLocationManual();
                    }}
                    className="w-full sm:w-auto py-4 px-6 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer italic text-center"
                  >
                    Retry GPS
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProfileUser && viewingProfileSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B132B]/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-3xl text-left border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-8 sm:p-10 text-white relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <button
                  onClick={() => {
                    setViewingProfileUser(null);
                    setViewingProfileSession(null);
                  }}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 transition-all rounded-full flex items-center justify-center text-white border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  Tutor Profile & Credentials
                </span>
                <div className="mt-6 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] border border-white/10 flex items-center justify-center text-3xl font-black italic text-indigo-200">
                    {viewingProfileUser.name?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase italic leading-none">{viewingProfileUser.name}</h3>
                    <p className="text-xs text-slate-300 font-medium mt-2">{viewingProfileUser.university || 'Verified Academic Institution'}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 space-y-6 max-h-[450px] overflow-y-auto custom-scrollbar">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className={`w-6 h-6 ${viewingProfileUser.nidStatus === 'approved' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NID Status</div>
                        <div className="text-xs font-black uppercase text-[#0B132B] dark:text-white mt-0.5">
                          {viewingProfileUser.nidStatus === 'approved' ? 'Verified Citizen' : 'Pending Verification'}
                        </div>
                      </div>
                    </div>
                    {viewingProfileUser.nidStatus === 'approved' && <Check className="w-5 h-5 text-emerald-500 bg-emerald-50 rounded-full p-1" />}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Award className={`w-6 h-6 ${viewingProfileUser.academicStatus === 'approved' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Academic Status</div>
                        <div className="text-xs font-black uppercase text-[#0B132B] dark:text-white mt-0.5">
                          {viewingProfileUser.academicStatus === 'approved' ? 'Verified Credentials' : 'Documents Pending'}
                        </div>
                      </div>
                    </div>
                    {viewingProfileUser.academicStatus === 'approved' && <Check className="w-5 h-5 text-emerald-500 bg-emerald-50 rounded-full p-1" />}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Experience Range</span>
                    <p className="text-xs font-bold text-[#0B132B] dark:text-white">{viewingProfileUser.experience || 'Experienced Professional Educator'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hourly Value</span>
                    <p className="text-xs font-black text-[#0D5BFF]">৳{viewingProfileUser.hourlyRate || 'Consult'}/hour</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professional Bio</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-medium font-sans">
                    {viewingProfileUser.bio || "Academic expert dedicated to elevating student capabilities and instilling key study discipline."}
                  </p>
                </div>

                <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10 space-y-3">
                  <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.1em] block font-sans">Proposed Tuition Details</span>
                  <div className="grid sm:grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Core Subject</span>
                      <span className="text-slate-800 dark:text-slate-200 mt-1 block">{viewingProfileSession.subject}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Proposed Schedule Slot</span>
                      <span className="text-slate-800 dark:text-slate-200 mt-1 block">{new Date(viewingProfileSession.scheduledTime).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-950">
                {viewingProfileSession.status === 'proposed_by_tutor' ? (
                  <>
                    <button
                      onClick={async () => {
                        await useAppStore.getState().acceptSession(viewingProfileSession.id);
                        setViewingProfileUser(null);
                        setViewingProfileSession(null);
                      }}
                      className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer"
                    >
                      Accept Tuition Proposal
                    </button>
                    <button
                      onClick={async () => {
                        await useAppStore.getState().rejectSession(viewingProfileSession.id);
                        setViewingProfileUser(null);
                        setViewingProfileSession(null);
                      }}
                      className="w-full sm:w-auto px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      Decline Offer
                    </button>
                  </>
                ) : (
                  <div className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
                    Awaiting response from {viewingProfileUser.name}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setSelectedRecipientId(viewingProfileUser.id);
                    setActiveTab('messages');
                    setViewingProfileUser(null);
                    setViewingProfileSession(null);
                  }}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-200 hover:bg-slate-350 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
