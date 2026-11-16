import React, { useState, useEffect, useRef, useMemo, memo, lazy, Suspense } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppStore, User, Session } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { calculateEarnedBadges } from '../../utils/badges';
import { triggerConfetti } from '../../utils/confetti';
import BadgeDisplay from '../../components/BadgeDisplay';
import { 
  Search, 
  MapPin, 
  CreditCard, 
  Send, 
  ShieldCheck, 
  CheckCircle,
  Sparkles,
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
  ChevronDown,
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
  Venus,
  Pin,
  Heart,
  SlidersHorizontal,
  ExternalLink,
  Plus,
  Edit3,
} from 'lucide-react';
import { useBackHandler, scrollFieldIntoView } from '../../utils/mobileWebView';
import {
  calculateProfileCompletion,
  cleanMeaningfulString,
  parseSubjectsList,
  StudentProfileRecord,
} from '../../../shared/profileCompletion';
import {
  isTutorEligibleForStudentSearch,
  isTutorVerified,
  formatInstitutionDisplay,
  formatTeachingModeLabel,
  formatTutorClassesRange,
  formatTutorSubjectsSummary,
  matchesClassFilter,
  matchesDistrictFilter,
} from '../../../shared/tutorListing';
import { canViewTutorPhoto } from '../../../shared/tutorPrivacy';
import UserAvatar from '../../components/UserAvatar';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { AppErrorBoundary } from '../../components/AppErrorBoundary';
const MapTracker = lazyWithRetry(() => import('../../components/MapTracker'), 'MapTracker');
const ImageUpload = lazyWithRetry(() => import('../../components/ImageUpload'), 'ImageUpload');
const FileUpload = lazyWithRetry(() => import('../../components/FileUpload'), 'FileUpload');
const RatingModal = lazyWithRetry(() => import('../../components/RatingModal'), 'RatingModal');
const ChatWindow = lazyWithRetry(() => import('../../components/ChatWindow'), 'ChatWindow');
import { motion, AnimatePresence } from 'motion/react';
import { BANGLADESH_DISTRICTS, BANGLADESH_THANAS } from '../../data/bangladeshData';
import { getCoordinatesForLocation, getCurrentAccuratePosition, watchAccuratePosition } from '../../utils/geocoding';
import { AVAILABLE_SUBJECTS, AVAILABLE_CLASSES, SUBJECT_CATEGORIES, AVAILABLE_VERSIONS } from '../../constants';
import { MetricCard, FilterGroup, DashboardInput } from '../../components/DashboardComponents';
import { Skeleton } from '../../components/Skeleton';

const ReferralsTab = lazyWithRetry(() => import('../../components/ReferralsTab'), 'ReferralsTab');
const ClassLogsCalendar = lazyWithRetry(() => import('../../components/ClassLogsCalendar'), 'ClassLogsCalendar');
const HomeworkDashboard = lazyWithRetry(() => import('../../components/HomeworkDashboard'), 'HomeworkDashboard');
const TuitionMarketplaceHub = lazyWithRetry(() => import('../../components/TuitionMarketplaceHub'), 'TuitionMarketplaceHub');

const TutorRow = ({ index, style, rowProps }: any) => {
  const { filteredTutors, selectedTutor, setSelectedTutor, savedTutors = [], toggleSavedTutor, viewerContext, sessions = [] } = rowProps;
  const tutor = filteredTutors[index];
  if (!tutor) return null;

  const isSaved = savedTutors.includes(tutor.id);
  const isSelected = selectedTutor?.id === tutor.id;
  const photoUnlocked = canViewTutorPhoto(viewerContext, tutor.id, sessions);
  const isVerified = isTutorVerified(tutor);
  const subjectSummary = formatTutorSubjectsSummary(tutor, 5);
  const classRange = formatTutorClassesRange(tutor);
  const modeLabel = formatTeachingModeLabel(tutor.teachingMode);
  const uniDisplay = formatInstitutionDisplay(tutor.university);
  const uniWithDept = [uniDisplay, tutor.course].filter(Boolean).join(' · ') || 'Verified University Educator';
  const rawArea = cleanMeaningfulString(tutor.area || tutor.thana);
  const rawDistrict = cleanMeaningfulString(tutor.district);
  const locationParts: string[] = [];
  if (rawArea) locationParts.push(rawArea);
  if (rawDistrict && !rawArea.toLowerCase().includes(rawDistrict.toLowerCase())) {
    locationParts.push(rawDistrict);
  }
  const locationLabel = locationParts.join(', ');

  return (
    <div style={{ ...style }} className="w-full">
      <motion.article
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{
          duration: 0.2,
          ease: [0.16, 1, 0.3, 1],
          delay: Math.min(index * 0.02, 0.1),
        }}
        id={`tutor-card-${tutor.id}`}
        onClick={() => setSelectedTutor(tutor)}
        className={`tutor-card w-full p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative group min-w-0 ${
          isSelected
            ? 'border-[#0D5BFF] bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-[#0D5BFF]/30'
            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111A2E] hover:border-[#0D5BFF]/50 dark:hover:border-[#0D5BFF]/50 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
          {/* Avatar */}
          <UserAvatar
            src={photoUnlocked ? tutor.profileImage : undefined}
            locked={!photoUnlocked}
            name={tutor.name}
            isOnline={Boolean(tutor.isOnline)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0"
            textClassName="text-sm sm:text-base font-black text-white"
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Complete Readable Name + Shortlist Button */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] sm:text-base font-semibold leading-snug text-[#0B132B] dark:text-white group-hover:text-[#0D5BFF] dark:group-hover:text-blue-400 transition-colors break-words">
                  {tutor.name || 'Verified Tutor'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5 text-xs">
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0D5BFF] dark:text-blue-400 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Verified</span>
                    </span>
                  )}
                  {typeof tutor.rating === 'number' && tutor.rating > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <span>{tutor.rating.toFixed(1)}</span>
                    </span>
                  )}
                  {tutor.gender && (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 shrink-0">
                      {tutor.gender === 'Male' ? (
                        <Mars className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      ) : tutor.gender === 'Female' ? (
                        <Venus className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : null}
                      <span>{tutor.gender}</span>
                    </span>
                  )}
                </div>
              </div>

              {toggleSavedTutor && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSavedTutor(tutor.id);
                  }}
                  aria-label={isSaved ? 'Remove from shortlist' : 'Save tutor to shortlist'}
                  title={isSaved ? 'Remove from shortlist' : 'Shortlist tutor'}
                  className={`min-w-[44px] min-h-[44px] -mt-1.5 -mr-1.5 rounded-xl flex items-center justify-center transition-colors border shrink-0 cursor-pointer ${
                    isSaved
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-500'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700 text-slate-400 hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              )}
            </div>

            {/* Row 2: Institution & Location */}
            <div className="mt-2 space-y-0.5 text-xs">
              <p className="font-medium text-slate-700 dark:text-slate-200 leading-snug break-words">
                {uniWithDept}
                {locationLabel ? ` · ${locationLabel}` : ''}
              </p>
            </div>

            {/* Row 3: Subjects (first 5 +N more) & Smart Class Range / Mode */}
            <div className="mt-2 space-y-1 text-xs leading-relaxed break-words">
              <p className="text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Subjects: </span>
                <span className="font-medium">{subjectSummary.text}</span>
                {subjectSummary.moreLabel && (
                  <span className="font-semibold text-[#0D5BFF] dark:text-blue-400 whitespace-nowrap">
                    {' '}
                    {subjectSummary.moreLabel}
                  </span>
                )}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Levels: </span>
                <span className="font-semibold text-[#0B132B] dark:text-slate-100">{classRange}</span>
                <span className="text-slate-400 dark:text-slate-500"> · </span>
                <span className="font-medium">{modeLabel}</span>
              </p>
            </div>

            {/* Row 4: Fee, Schedule & View Profile CTA */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="text-sm font-bold text-[#0B132B] dark:text-white tabular-nums">
                  {tutor.hourlyRate ? `৳${Number(tutor.hourlyRate).toLocaleString()}/mo` : 'Negotiable'}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                  · {tutor.daysPerWeek || 3} days/wk
                </span>
              </div>

              <Link
                to={`/teachers/${tutor.id}`}
                onClick={(e) => e.stopPropagation()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
};

const MapLoading = () => (
   <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-700 dark:text-slate-300">
     <div className="w-8 h-8 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin mb-2"></div>
     <p className="text-[8px] font-black uppercase tracking-widest leading-loose">Booting Satellite Feed...</p>
   </div>
);

const getTutorLocation = (tutorId: string, tutorLocation?: { lat: number; lng: number }, studentLoc?: [number, number], district?: string, thana?: string): [number, number] | null => {
  if (tutorLocation?.lat && tutorLocation?.lng) {
    return [tutorLocation.lat, tutorLocation.lng];
  }
  if (district || thana) {
    return getCoordinatesForLocation(district || '', thana || '', tutorId);
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
    messages,
    grantEndPermission,
    endSession,
    updateUser,
    toggleSavedTutor,
    studentProfiles,
    createStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    setActiveStudentProfile,
  } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    users: state.users,
    submitPayment: state.submitPayment,
    payments: state.payments,
    sessions: state.sessions,
    bookSession: state.bookSession,
    updateLocation: state.updateLocation,
    messages: state.messages,
    grantEndPermission: state.grantEndPermission,
    endSession: state.endSession,
    updateUser: state.updateUser,
    toggleSavedTutor: state.toggleSavedTutor,
    studentProfiles: state.studentProfiles,
    createStudentProfile: state.createStudentProfile,
    updateStudentProfile: state.updateStudentProfile,
    deleteStudentProfile: state.deleteStudentProfile,
    setActiveStudentProfile: state.setActiveStudentProfile,
  })));
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, [debouncedSearch]);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [filterVersion, setFilterVersion] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterThana, setFilterThana] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterGender, setFilterGender] = useState('');
  const [showShortlistedOnly, setShowShortlistedOnly] = useState(false);

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectFilterSearch, setSubjectFilterSearch] = useState('');
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const desktopNavScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = desktopNavScrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [showLocationDeniedModal, setShowLocationDeniedModal] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const [isClassCalPinned, setIsClassCalPinned] = useState(() => localStorage.getItem('edutrack_pin_class_cal') === 'true');

  useEffect(() => {
    const handlePinChange = () => {
      setIsClassCalPinned(localStorage.getItem('edutrack_pin_class_cal') === 'true');
    };
    window.addEventListener('class_cal_pin_changed', handlePinChange);
    window.addEventListener('storage', handlePinChange);
    return () => {
      window.removeEventListener('class_cal_pin_changed', handlePinChange);
      window.removeEventListener('storage', handlePinChange);
    };
  }, []);

  // Redirect to pinned Class Calculator if enabled and they land on the root dashboard page
  useEffect(() => {
    const isPinned = localStorage.getItem('edutrack_pin_class_cal') === 'true';
    if (isPinned && (location.pathname === '/dashboard' || location.pathname === '/dashboard/')) {
      navigate('/dashboard/class-logs', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeTab = useMemo<'overview' | 'find' | 'activity' | 'account' | 'transit' | 'messages' | 'class-verification' | 'homework' | 'referrals'>(() => {
    const path = location.pathname;
    if (path.endsWith('/search')) return 'find';
    if (path.endsWith('/activity')) return 'activity';
    if (path.endsWith('/profile')) return 'account';
    if (path.endsWith('/transit')) return 'transit';
    if (path.endsWith('/messages')) return 'messages';
    if (path.endsWith('/class-logs')) return 'class-verification';
    if (path.endsWith('/homework')) return 'homework';
    if (path.endsWith('/referrals')) return 'referrals';
    return 'overview';
  }, [location.pathname]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showProfileNotice, setShowProfileNotice] = useState(true);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  const [viewingProfileSession, setViewingProfileSession] = useState<Session | null>(null);

  const effectiveStudentLocation = useMemo<[number, number]>(() => {
    if (currentUser?.location?.lat && currentUser?.location?.lng) {
      return [currentUser.location.lat, currentUser.location.lng];
    }
    if (currentUser?.lastLocation?.lat && currentUser?.lastLocation?.lng) {
      return [currentUser.lastLocation.lat, currentUser.lastLocation.lng];
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('edutrack_last_gps_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.lat && parsed.lng) return [parsed.lat, parsed.lng];
        }
      } catch (e) {}
    }
    if (currentUser?.district || currentUser?.thana || currentUser?.area) {
      return getCoordinatesForLocation(currentUser.district || 'Dhaka', currentUser.thana || currentUser.area, currentUser?.id || 'me');
    }
    return [23.8103, 90.4125];
  }, [currentUser?.location, currentUser?.lastLocation, currentUser?.district, currentUser?.thana, currentUser?.area, currentUser?.id]);

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

  const handleDownloadPDF = async () => {
    if (!currentUser || myPayments.length === 0) return;

    const { jsPDF } = await import('jspdf');
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

  const effectiveAccountType = currentUser?.accountType === 'guardian' ? 'guardian' : 'student';

  const activeChildProfile = useMemo(
    () =>
      studentProfiles.find((p) => p.id === currentUser?.activeStudentProfileId) ||
      studentProfiles[0] ||
      null,
    [studentProfiles, currentUser?.activeStudentProfileId]
  );

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(currentUser, { studentProfiles }),
    [currentUser, studentProfiles]
  );

  const isProfileIncomplete =
    !profileCompletion.isComplete &&
    !currentUser?.hasDismissedProfileNotice;

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

  useEffect(() => {
    if (currentUser && sessions && sessions.length > 0) {
      const currentBadges = currentUser.badges || [];
      const calculatedBadges = calculateEarnedBadges(currentUser, sessions);
      
      const hasChanges = calculatedBadges.length !== currentBadges.length || 
        calculatedBadges.some(b => !currentBadges.includes(b));
        
      if (hasChanges && updateUser) {
        updateUser(currentUser.id, { badges: calculatedBadges });
      }
    }
  }, [currentUser, sessions, updateUser]);

  const [pendingRatingSession, setPendingRatingSession] = useState<Session | null>(null);

  useEffect(() => {
    // Look for completed sessions that haven't been rated yet and haven't been dismissed
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem('dismissed_ratings') || '[]');
    } catch (e) {
      console.warn('Failed to parse dismissed_ratings from localStorage:', e);
    }

    const completedUnrated = sessions.find(s => 
      s.status === 'completed' && 
      !s.rating && 
      s.studentId === currentUser?.id &&
      !dismissed.includes(s.id)
    );
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
    getCurrentAccuratePosition(
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
      () => {
        updateLocation(currentUser!.id, 23.8103, 90.4125);
        setIsRefreshingLocation(false);
        useAppStore.getState().sendNotification(
          currentUser!.id,
          "Transit Radar Calibrated",
          "Coordinates aligned to metropolitan center (Dhaka) for active session tracking.",
          "info"
        );
      }
    );
  };

  // Active tab is derived directly from route location to avoid double-rendering delays

  const handleTabChange = (tab: 'overview' | 'find' | 'activity' | 'account' | 'transit' | 'messages' | 'class-verification' | 'homework' | 'referrals') => {
    const pathMap = {
      overview: '/dashboard',
      find: '/dashboard/search',
      activity: '/dashboard/activity',
      account: '/dashboard/profile',
      transit: '/dashboard/transit',
      messages: '/dashboard/messages',
      'class-verification': '/dashboard/class-logs',
      homework: '/dashboard/homework',
      referrals: '/dashboard/referrals'
    };
    navigate(pathMap[tab]);
  };

  // Continuous position tracking for student using device GPS
  useEffect(() => {
    let currentWatchId: number | null = null;
    
    if (currentUser?.id) {
      if ('geolocation' in navigator) {
        currentWatchId = watchAccuratePosition(
          (position) => {
            updateLocation(currentUser.id, position.coords.latitude, position.coords.longitude);
          }
        );
      }
    }

    return () => {
      if (currentWatchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(currentWatchId);
      }
    };
  }, [currentUser?.id, updateLocation]);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [accountUpdateError, setAccountUpdateError] = useState('');
  const [accountUpdateSuccess, setAccountUpdateSuccess] = useState('');
  const [accountForm, setAccountForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    school: cleanMeaningfulString(currentUser?.school) || cleanMeaningfulString(currentUser?.university),
    studentClass: cleanMeaningfulString(currentUser?.studentClass),
    curriculum: cleanMeaningfulString(currentUser?.curriculum) || cleanMeaningfulString(currentUser?.group),
    subjects: currentUser?.subjects || [],
    area: cleanMeaningfulString(currentUser?.area),
    address: cleanMeaningfulString(currentUser?.address),
    guardianRelationship: cleanMeaningfulString(currentUser?.guardianRelationship),
    nidFrontImg: currentUser?.nidFrontImg || '',
    nidBackImg: currentUser?.nidBackImg || '',
    documents: currentUser?.documents || [],
    gender: cleanMeaningfulString(currentUser?.gender),
    district: cleanMeaningfulString(currentUser?.district),
    thana: cleanMeaningfulString(currentUser?.thana)
  });

  // Guardian Child Student Profile Editor State
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [childFormError, setChildFormError] = useState('');
  const [isSavingChild, setIsSavingChild] = useState(false);
  const [childForm, setChildForm] = useState({
    studentName: '',
    studentClass: '',
    school: '',
    curriculum: '',
    subjectsText: '',
    gender: '',
  });

  const navigateToMissingField = (fieldId?: string | null) => {
    handleTabChange('account');
    setIsEditingAccount(true);
    setAccountUpdateError('');
    if (fieldId) {
      setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof (el as HTMLElement).focus === 'function') {
            (el as HTMLElement).focus({ preventScroll: true });
          }
        }
      }, 220);
    }
  };

  // Sync form state when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingAccount && currentUser) {
      setAccountForm({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        school: cleanMeaningfulString(currentUser.school) || cleanMeaningfulString(currentUser.university),
        studentClass: cleanMeaningfulString(currentUser.studentClass),
        curriculum: cleanMeaningfulString(currentUser.curriculum) || cleanMeaningfulString(currentUser.group),
        subjects: currentUser.subjects || [],
        area: cleanMeaningfulString(currentUser.area),
        address: cleanMeaningfulString(currentUser.address),
        guardianRelationship: cleanMeaningfulString(currentUser.guardianRelationship),
        nidFrontImg: currentUser.nidFrontImg || '',
        nidBackImg: currentUser.nidBackImg || '',
        documents: currentUser.documents || [],
        gender: cleanMeaningfulString(currentUser.gender),
        district: cleanMeaningfulString(currentUser.district),
        thana: cleanMeaningfulString(currentUser.thana)
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

  // Filter only verified tutors matching search and filters (respecting tutor hideFromSearch privacy)
  const filteredTutors = useMemo(() => {
    const unique = new Map();
    users.filter(user => {
      if (!isTutorEligibleForStudentSearch(user)) return false;

      const userSubjects = parseSubjectsList(user.subjects, user.subject);
      const searchLower = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        (user.name || '').toLowerCase().includes(searchLower) ||
        user.university?.toLowerCase().includes(searchLower) ||
        user.course?.toLowerCase().includes(searchLower) ||
        user.district?.toLowerCase().includes(searchLower) ||
        user.thana?.toLowerCase().includes(searchLower) ||
        user.area?.toLowerCase().includes(searchLower) ||
        user.teachingAreas?.some(a => (a || '').toLowerCase().includes(searchLower)) ||
        userSubjects.some(s => (s || '').toLowerCase().includes(searchLower));

      const matchesSubject =
        filterSubjects.length === 0 ||
        filterSubjects.some(fs => userSubjects.some(s => s.toLowerCase().includes(fs.toLowerCase())));

      const matchesVersion =
        !filterVersion ||
        userSubjects.some(s => {
          const categorySubjects = SUBJECT_CATEGORIES[filterVersion as keyof typeof SUBJECT_CATEGORIES] || [];
          return categorySubjects.includes(s);
        });

      const matchesClass = !filterClass || matchesClassFilter(user, filterClass);
      const matchesArea =
        !filterArea ||
        user.teachingAreas?.some(a => a.toLowerCase().includes(filterArea.toLowerCase())) ||
        user.district?.toLowerCase().includes(filterArea.toLowerCase()) ||
        user.thana?.toLowerCase().includes(filterArea.toLowerCase()) ||
        user.area?.toLowerCase().includes(filterArea.toLowerCase());
      const matchesDistrict = !filterDistrict || matchesDistrictFilter(user, filterDistrict);
      const matchesThana = !filterThana || (user.thana && user.thana.toLowerCase() === filterThana.toLowerCase());
      const matchesRating = !filterRating || (user.rating || 0) >= filterRating;
      const matchesGender = !filterGender || (user.gender && user.gender.toLowerCase() === filterGender.toLowerCase());
      const matchesShortlist = !showShortlistedOnly || (currentUser?.savedTutors || []).includes(user.id);

      return matchesSearch && matchesSubject && matchesVersion && matchesClass && matchesArea && matchesDistrict && matchesThana && matchesRating && matchesGender && matchesShortlist;
    }).forEach(u => unique.set(u.id, u));
    return Array.from(unique.values()) as User[];
  }, [users, debouncedSearch, filterSubjects, filterVersion, filterClass, filterArea, filterDistrict, filterThana, filterRating, filterGender, showShortlistedOnly, currentUser?.savedTutors]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterSubjects.length > 0) count++;
    if (filterVersion) count++;
    if (filterClass) count++;
    if (filterArea.trim()) count++;
    if (filterDistrict) count++;
    if (filterThana) count++;
    if (filterRating > 0) count++;
    if (filterGender) count++;
    if (showShortlistedOnly) count++;
    return count;
  }, [searchTerm, filterSubjects, filterVersion, filterClass, filterArea, filterDistrict, filterThana, filterRating, filterGender, showShortlistedOnly]);

  useBackHandler(
    windowWidth <= 1024 && showFilters,
    () => setShowFilters(false),
    'student-mobile-filters',
  );
  useBackHandler(
    windowWidth <= 1024 && Boolean(selectedTutor) && !showFilters,
    () => setSelectedTutor(null),
    'student-mobile-tutor-detail',
  );


  
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

      triggerConfetti();
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingSlot('');
        setBookingSubject([]);
      }, 3000);
    } catch (error: any) {
      console.error(error);
      useAppStore.getState().sendNotification(
        currentUser.id,
        'Booking Request Notice',
        error?.message || 'Your request could not be completed. Please verify your selected slot or active booking status.',
        'error'
      );
    } finally {
      setIsBooking(false);
    }
  };

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setAccountUpdateError('');
    setAccountUpdateSuccess('');

    const cleanName = cleanMeaningfulString(accountForm.name);
    const cleanPhone = cleanMeaningfulString(accountForm.phone);
    const cleanDistrict = cleanMeaningfulString(accountForm.district);
    const cleanArea = cleanMeaningfulString(accountForm.area);
    const cleanAddress =
      cleanMeaningfulString(accountForm.address) ||
      [cleanArea, cleanMeaningfulString(accountForm.thana), cleanDistrict].filter(Boolean).join(', ');
    const cleanSchool = cleanMeaningfulString(accountForm.school);
    const cleanClass = cleanMeaningfulString(accountForm.studentClass);
    const cleanCurriculum = cleanMeaningfulString(accountForm.curriculum);
    const cleanRel = cleanMeaningfulString(accountForm.guardianRelationship);

    if (!cleanName) {
      setAccountUpdateError('Full name is required.');
      return;
    }
    if (!cleanPhone) {
      setAccountUpdateError('Contact phone number is required.');
      return;
    }
    if (!cleanDistrict || (!cleanAddress && !cleanArea)) {
      setAccountUpdateError('District and residential/tuition address (or area) are required.');
      return;
    }
    if (effectiveAccountType === 'student') {
      if (!cleanClass || !cleanSchool || !cleanCurriculum) {
        setAccountUpdateError('Academic class, School / College, and Curriculum / Group are required for student profiles.');
        return;
      }
    } else if (!cleanRel) {
      setAccountUpdateError('Please select your relationship to the student.');
      return;
    }

    setIsUpdating(true);
    try {
      const existingLocation = currentUser.location ? currentUser.location : undefined;
      await updateUser(currentUser.id, {
        name: cleanName,
        phone: cleanPhone,
        accountType: effectiveAccountType,
        ...(effectiveAccountType === 'guardian'
          ? { guardianRelationship: cleanRel }
          : {
              school: cleanSchool,
              studentClass: cleanClass,
              curriculum: cleanCurriculum,
              group: cleanCurriculum,
            }),
        subjects: accountForm.subjects,
        subject: accountForm.subjects.join(', '),
        area: cleanArea,
        address: cleanAddress,
        nidFrontImg: accountForm.nidFrontImg,
        nidBackImg: accountForm.nidBackImg,
        documents: accountForm.documents,
        gender: cleanMeaningfulString(accountForm.gender),
        district: cleanDistrict,
        thana: cleanMeaningfulString(accountForm.thana),
        ...(existingLocation ? { location: existingLocation } : {}),
      });
      setIsEditingAccount(false);
      setAccountUpdateSuccess('Your profile has been saved and synchronized.');
      setTimeout(() => setAccountUpdateSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to update account profile:', err);
      setAccountUpdateError(
        err?.message || 'Unable to save profile changes to Firestore. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openAddChildModal = () => {
    setEditingChildId(null);
    setChildForm({
      studentName: '',
      studentClass: '',
      school: '',
      curriculum: '',
      subjectsText: '',
      gender: '',
    });
    setChildFormError('');
    setIsChildModalOpen(true);
  };

  const openEditChildModal = (child: StudentProfileRecord) => {
    setEditingChildId(child.id);
    setChildForm({
      studentName: child.studentName || '',
      studentClass: child.studentClass || '',
      school: child.school || '',
      curriculum: child.curriculum || '',
      subjectsText: Array.isArray(child.subjects) ? child.subjects.join(', ') : '',
      gender: child.gender || '',
    });
    setChildFormError('');
    setIsChildModalOpen(true);
  };

  const handleSaveChildProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setChildFormError('');

    const studentName = cleanMeaningfulString(childForm.studentName);
    const studentClass = cleanMeaningfulString(childForm.studentClass);
    const school = cleanMeaningfulString(childForm.school);
    const curriculum = cleanMeaningfulString(childForm.curriculum);
    const subjects = childForm.subjectsText
      .split(',')
      .map((s) => cleanMeaningfulString(s))
      .filter(Boolean);

    if (!studentName || !studentClass || !school || !curriculum) {
      setChildFormError("Student's name, class, school/college, and curriculum are all required.");
      return;
    }

    setIsSavingChild(true);
    try {
      if (editingChildId) {
        await updateStudentProfile(editingChildId, {
          studentName,
          studentClass,
          school,
          curriculum,
          subjects,
          gender: cleanMeaningfulString(childForm.gender),
          district: currentUser.district || '',
          thana: currentUser.thana || '',
          area: currentUser.area || '',
          address: currentUser.address || '',
        });
      } else {
        await createStudentProfile({
          studentName,
          studentClass,
          school,
          curriculum,
          subjects,
          gender: cleanMeaningfulString(childForm.gender),
          district: currentUser.district || '',
          thana: currentUser.thana || '',
          area: currentUser.area || '',
          address: currentUser.address || '',
        });
      }
      setIsChildModalOpen(false);
      setAccountUpdateSuccess(
        editingChildId ? 'Student profile updated.' : 'New student profile added under your Guardian account.'
      );
      setTimeout(() => setAccountUpdateSuccess(''), 4000);
    } catch (err: any) {
      setChildFormError(err?.message || 'Failed to save student profile.');
    } finally {
      setIsSavingChild(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-heading text-[#0B132B] dark:text-white uppercase leading-[0.8] mb-4">
            {effectiveAccountType === 'guardian' ? 'Guardian Panel' : 'Student Panel'}
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-[#0B132B] dark:text-slate-300 uppercase tracking-[0.2em]">
            Welcome, <span className="font-black text-[#0D5BFF] italic">{currentUser.name}</span>
            {effectiveAccountType === 'guardian' && activeChildProfile && (
              <span className="ml-3 text-emerald-600 dark:text-emerald-400">
                • Active Student: {activeChildProfile.studentName} ({activeChildProfile.studentClass})
              </span>
            )}
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
           <button 
             onClick={() => window.dispatchEvent(new Event('start-edutrack-tour'))}
             className="w-12 h-12 bg-gradient-to-r from-blue-500 to-[#0D5BFF] hover:from-[#0D5BFF] hover:to-indigo-600 text-white border border-transparent rounded-2xl hover:shadow-lg hover:shadow-blue-500/15 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
             title="Quick Start Tour"
           >
             <Sparkles className="w-5 h-5 text-white animate-pulse" />
           </button>
           <button className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#0B132B] hover:shadow-lg transition-all">
              <Bell className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Mobile/Tablet Adaptive Grid Selector (All Panels Fully Visible) */}
      <div className="lg:hidden block mb-6" id="student-mobile-tablet-tab-matrix">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]/50 mb-3 italic">
          Quick Navigation Dashboard Matrix
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'find', label: 'Find Tutor', icon: Search },
            { id: 'activity', label: 'Activity Log', icon: Activity },
            { id: 'class-verification', label: 'Class Cal', icon: Calendar },
            { id: 'homework', label: 'Homework', icon: BookOpen },
            { id: 'transit', label: 'Transit Tracker', icon: MapPin },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'account', label: 'My Account', icon: Award },
            { id: 'referrals', label: 'Referrals', icon: Sparkles }
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden active:scale-[0.97] cursor-pointer ${
                  isActive
                    ? "bg-[#0B132B] dark:bg-[#0D5BFF] text-white border-transparent shadow-lg shadow-slate-950/20"
                    : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                }`}
                id={`student-tab-btn-${tab.id}`}
              >
                {tab.id === 'class-verification' && isClassCalPinned && (
                  <Pin className="absolute top-2.5 right-2.5 w-3 h-3 text-amber-500 fill-amber-500 rotate-[45deg]" />
                )}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-[#0D5BFF]"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-wider leading-tight truncate`}>
                    {tab.label}
                  </p>
                  <p className={`text-[8px] font-medium tracking-tight uppercase truncate ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                    {isActive ? "Active View" : "Click to view"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Navigation */}
      <div 
        ref={desktopNavScrollRef}
        className="lg:flex hidden space-x-8 border-b border-slate-100 pb-px overflow-x-auto custom-scrollbar-hide hide-scrollbar"
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'find', label: 'Find Tutor' },
          { id: 'activity', label: 'Activity Log' },
          { id: 'class-verification', label: 'Class Cal' },
          { id: 'homework', label: 'Homework' },
          { id: 'transit', label: 'Transit Tracker' },
          { id: 'messages', label: 'Messages' },
          { id: 'account', label: 'My Account' },
          { id: 'referrals', label: 'Referrals' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`text-xs font-black font-heading uppercase tracking-[0.2em] italic pb-4 transition-all relative cursor-pointer z-30 pointer-events-auto ${
              activeTab === tab.id ? 'text-[#0B132B] dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.id === 'class-verification' && isClassCalPinned && (
                <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 rotate-[45deg]" />
              )}
            </span>
            {activeTab === tab.id && (
              <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D5BFF]" />
            )}
          </button>
        ))}
      </div>

      {/* Legacy Account Type Prompt (Student vs Parent/Guardian) */}
      {profileCompletion.needsAccountTypeSelection && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-[#0D5BFF]">
              Confirm Account Role
            </p>
            <h3 className="text-base sm:text-lg font-black text-[#0B132B] dark:text-white">
              Are you managing EduTrack as a Student or a Parent / Guardian?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Guardians can add and manage multiple child student profiles under one account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => updateUser(currentUser.id, { accountType: 'student' })}
              className="px-5 py-3 rounded-xl bg-[#0D5BFF] text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all cursor-pointer"
            >
              I am a Student
            </button>
            <button
              type="button"
              onClick={() => updateUser(currentUser.id, { accountType: 'guardian' })}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all cursor-pointer"
            >
              I am a Parent / Guardian
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isProfileIncomplete && showProfileNotice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="bg-gradient-to-br from-[#0B132B] via-[#111C3A] to-[#1C2C5E] rounded-[3rem] p-8 lg:p-10 text-white relative overflow-hidden group border border-blue-500/20 shadow-2xl shadow-blue-950/20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-tr from-[#0D5BFF]/30 to-purple-600/20 rounded-full -mr-40 -mt-40 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-2xl" />

              <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-8 md:gap-10">
                <div className="max-w-3xl space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-3.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-ping"></span>
                      <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full absolute"></span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] pl-2">
                        Onboarding Roadmap
                      </span>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                      {profileCompletion.completedCount} of {profileCompletion.totalCount} Requirements Complete
                    </div>
                  </div>

                  <div>
                    <h3 className="text-3xl sm:text-4xl font-black uppercase italic leading-[1.1] mb-3 tracking-tight">
                      {effectiveAccountType === 'guardian' ? (
                        <>
                          Complete Guardian &amp; Student Info <br className="hidden sm:inline" />
                          &amp; Hire Verified Educators
                        </>
                      ) : (
                        <>
                          Setup Your Profile <br className="hidden sm:inline" />
                          &amp; Find Elite Instructors
                        </>
                      )}
                    </h3>
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest leading-relaxed max-w-xl">
                      Complete your required profile details to unlock smart tutor matching, accurate geolocation routing, and instant bookings.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                    {profileCompletion.requirements.map((req) => (
                      <button
                        key={req.key}
                        type="button"
                        onClick={() => navigateToMissingField(req.targetFieldId)}
                        className={`p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                          req.completed
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-950/20'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-blue-400/50 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-300">
                            {req.label}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              req.completed
                                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                                : 'bg-rose-500 animate-pulse'
                            }`}
                          />
                        </div>
                        <p
                          className={`text-[11px] font-black truncate ${
                            req.completed ? 'text-emerald-200' : 'text-amber-200 font-semibold'
                          }`}
                        >
                          {req.displayValue}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-6 xl:w-72 justify-between flex-shrink-0 self-stretch xl:self-auto bg-white/[0.02] border border-white/5 p-6 rounded-3xl backdrop-blur-md">
                  <div className="w-full text-center sm:text-left xl:text-center space-y-2">
                    <div className="flex items-center justify-between xl:justify-center xl:space-x-4 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#0D5BFF]">
                        Portfolio Progress
                      </span>
                      <span className="text-sm font-black font-mono text-[#0D5BFF]">
                        {profileCompletion.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-[2px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${profileCompletion.percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-[#0D5BFF] to-blue-400 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => navigateToMissingField(profileCompletion.firstMissingFieldId)}
                      className="flex-1 py-4 px-6 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-blue-500/20 text-center cursor-pointer"
                    >
                      Complete Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileNotice(false);
                        updateUser(currentUser.id, { hasDismissedProfileNotice: true });
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 flex items-center justify-center cursor-pointer"
                      title="Skip onboarding"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard label="Sessions" value={mySessions.length.toString()} />
              <MetricCard label="Active Tutors" value={Array.from(new Set(mySessions.filter(s => s.status !== 'cancelled').map(s => s.tutorId))).length.toString()} />
              <MetricCard label="Completed Lessons" value={mySessions.filter(s => s.status === 'completed').length.toString()} />
            </div>

            {/* Achievements & Gamification Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>My Badges & Academic Milestones</span>
                </h3>
                {currentUser.badges && currentUser.badges.length > 0 && (
                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {currentUser.badges.length} Unlocked
                  </span>
                )}
              </div>
              <BadgeDisplay badgeIds={currentUser.badges || []} role="student" />
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
                <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 bg-white/15 rounded-2xl shrink-0">
                      <ShieldAlert className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase italic tracking-wider">End-Of-Session Permission</p>
                      <p className="text-[10px] text-rose-100 mt-1 max-w-xl leading-relaxed">Your tutor cannot mark this session as completed on their dashboard without your active permission.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 self-end sm:self-center">
                    {activeSession.tutorRequestedEnd && !activeSession.studentPermissionGranted && (
                      <span className="text-[8px] bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-xl font-black uppercase italic tracking-wider animate-bounce shadow">
                        Tutor Requested
                      </span>
                    )}
                    <button
                      onClick={() => grantEndPermission(activeSession.id, !activeSession.studentPermissionGranted)}
                      className={`w-full sm:w-auto px-6 py-4.5 rounded-2xl text-[9px] font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                        activeSession.studentPermissionGranted 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                          : 'bg-[#0B132B] text-white hover:bg-slate-900 shadow-black/20'
                      }`}
                    >
                      {activeSession.studentPermissionGranted ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-500 font-bold" />
                          <span>Permission Granted</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-rose-100" />
                          <span>Grant Finish Permission</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to end and complete this tutoring session now?")) {
                          try {
                            await grantEndPermission(activeSession.id, true);
                            await endSession(activeSession.id);
                            useAppStore.getState().sendNotification(
                              currentUser.id,
                              'Session Completed',
                              'You have successfully ended and marked this session as completed.',
                              'success'
                            );
                          } catch (err) {
                            console.error('Failed to end session:', err);
                          }
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-4.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[9px] font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer shadow-rose-900/20"
                    >
                      <X className="w-4 h-4" />
                      <span>End Session</span>
                    </button>
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
                            <span className="text-[9px] font-black text-slate-300">
                              {new Date(sess.scheduledTime).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-start gap-3.5">
                            <UserAvatar
                              src={undefined}
                              locked={true}
                              name={party?.name}
                              className="w-12 h-12 rounded-xl border border-white/15"
                              fallbackClassName="bg-white/10 text-blue-300"
                              textClassName="text-base font-black"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-white break-words leading-snug">{party?.name}</h4>
                              <p className="text-xs text-slate-300 break-words leading-snug mt-0.5">{party?.university || 'Expert Tutor'}</p>
                            </div>
                          </div>

                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-1">Subject / Focus</div>
                            <div className="text-xs font-black italic text-[#0D5BFF]">{sess.subject}</div>
                            <div className="text-[10px] text-slate-300 font-medium mt-1.5 leading-relaxed">
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
                <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Accepted Tuitions & Engagements</h3>
                <div className="space-y-4">
                  {mySessions.filter(s => s.status === 'scheduled' || s.status === 'active').length === 0 ? (
                    <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 text-center space-y-4">
                      <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">No Accepted Tuitions Found</p>
                        <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-1">
                          You don't have any accepted/confirmed tuition connections yet.
                        </p>
                      </div>
                      <button
                        onClick={() => handleTabChange('find')}
                        className="px-6 py-3 bg-[#0B132B] hover:bg-[#0D5BFF] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Find an Expert Tutor</span>
                      </button>
                    </div>
                  ) : (
                    mySessions.filter(s => s.status === 'scheduled' || s.status === 'active').slice(0, 10).map(sess => {
                      const tutor = users.find(u => u.id === sess.tutorId);
                      const photoUnlocked = canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, sess.tutorId, mySessions);
                      return (
                        <div key={sess.id} className="bg-white dark:bg-[#111A2E] rounded-[2rem] p-5 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                             <div className="relative shrink-0">
                               <UserAvatar
                                 src={photoUnlocked ? tutor?.profileImage : undefined}
                                 locked={!photoUnlocked}
                                 name={tutor?.name}
                                 className="w-14 h-14 rounded-2xl border border-slate-200/80 dark:border-slate-700"
                                 textClassName="text-base font-black text-white"
                               />
                               {sess.status === 'active' && (
                                 <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-[#111A2E] rounded-full animate-pulse" />
                               )}
                             </div>
                             <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className="text-base sm:text-lg font-bold text-[#0B132B] dark:text-white break-words leading-snug">{tutor?.name || 'Verified Tutor'}</h4>
                                  {tutor?.rating && (
                                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/40 shrink-0">
                                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 tabular-nums">{tutor.rating.toFixed(1)}</span>
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
                          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                            {tutor && (
                              <button
                                onClick={() => {
                                  setViewingProfileUser(tutor);
                                  setViewingProfileSession(sess);
                                }}
                                className="px-4 py-2 bg-[#0B132B] hover:bg-[#0D5BFF] text-white text-[8px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-slate-950/10 transition-all flex items-center gap-1.5 cursor-pointer inline-flex"
                                title="View Tutor Profile"
                              >
                                <Users className="w-3 h-3" />
                                <span>View Profile</span>
                              </button>
                            )}
                            {tutor && (tutor.whatsappNumber || tutor.phone) && (
                              <a 
                                href={`https://wa.me/${(() => {
                                  const num = tutor.whatsappNumber || tutor.phone || '';
                                  let clean = num.replace(/\D/g, '');
                                  if (clean.startsWith('01') && clean.length === 11) {
                                    clean = '88' + clean;
                                  } else if (clean.startsWith('1') && clean.length === 10) {
                                    clean = '880' + clean;
                                  }
                                  return clean;
                                })()}?text=${encodeURIComponent(`Hello! I am ${currentUser?.name || "a student"} from EduTrack Bangladesh. I am happy that our tuition connection has been confirmed! Let's discuss our schedule and classes.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[8px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-[#25D366]/10 transition-all flex items-center gap-1.5 cursor-pointer inline-flex animate-fade-in"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ${sess.status === 'active' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                              {sess.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
                           <div className="space-y-6">
                <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">Expert Radius</h3>
                 <div className="bg-slate-50 rounded-[3rem] p-4 border border-slate-100 h-64 overflow-hidden relative">
                    {currentUser?.location ? (
                      <AppErrorBoundary level="widget" sectionName="Expert Radius Map">
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
                                    const coords = getTutorLocation(tutor.id, tutor.location, [currentUser.location!.lat, currentUser.location!.lng], tutor.district, tutor.thana);
                                    if (coords && !uniqueTutors.has(tutor.id)) {
                                      const unlocked = canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, tutor.id, mySessions);
                                      uniqueTutors.set(tutor.id, {
                                        id: tutor.id,
                                        location: coords,
                                        name: tutor.name,
                                        image: unlocked ? tutor.profileImage : undefined,
                                        isOnline: tutor.isTrackingOn
                                      });
                                    }
                                  }
                                });
                              users
                                .filter(u => isTutorEligibleForStudentSearch(u))
                                .forEach(tutor => {
                                  const coords = getTutorLocation(tutor.id, tutor.location, [currentUser.location!.lat, currentUser.location!.lng], tutor.district, tutor.thana);
                                  if (coords && !uniqueTutors.has(tutor.id) && uniqueTutors.size < 6) {
                                    const unlocked = canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, tutor.id, mySessions);
                                    uniqueTutors.set(tutor.id, {
                                      id: tutor.id,
                                      location: coords,
                                      name: tutor.name,
                                      image: unlocked ? tutor.profileImage : undefined,
                                      isOnline: tutor.isTrackingOn
                                    });
                                  }
                                });
                              return Array.from(uniqueTutors.values());
                            })()}
                            eta={eta}
                          />
                        </Suspense>
                      </AppErrorBoundary>
                    ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-[2.5rem] text-white">
                       <MapPin className="w-8 h-8 mb-3 text-[#0D5BFF] animate-pulse" />
                       <h4 className="text-xs font-black uppercase tracking-widest leading-none">Active Radar Offline</h4>
                       <p className="text-[9px] text-slate-300 uppercase tracking-wider mt-1 px-4 leading-normal">
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
              </div>
            </div>

            {/* Guardian Tuition Posting, Applicant Pipeline & Smart Tutor Recommendations */}
            <div className="pt-4">
              <AppErrorBoundary level="widget" sectionName="Tuition Marketplace">
                <Suspense fallback={<div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />}>
                  <TuitionMarketplaceHub
                    mode="student"
                    onMessageUser={(tutorId) => {
                      setSelectedRecipientId(tutorId);
                      navigate('/dashboard/messages');
                    }}
                  />
                </Suspense>
              </AppErrorBoundary>
            </div>
          </motion.div>
        )}

        {activeTab === 'find' && (
          <motion.div 
            key="find"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="flex flex-col gap-8"
          >
            {/* Map Preview of All Tutors */}
            <div className="bg-white rounded-[3.5rem] p-4 border border-slate-100 shadow-sm overflow-hidden h-72 relative">
               <div className="absolute top-8 left-8 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase italic text-[#0B132B] shadow-sm border border-slate-100">
                 Global Tutor Radius: {filteredTutors.length} Experts Found
               </div>
               <AppErrorBoundary level="widget" sectionName="Tutor Search Map">
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
                         image: canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, t.id, mySessions) ? t.profileImage : undefined,
                         isOnline: t.isTrackingOn
                       }))}
                   />
                 </Suspense>
               </AppErrorBoundary>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar (Desktop sticky, Mobile/Tablet backdrop-dimmed slide drawer) */}
            <div
              className={
                windowWidth <= 1024
                  ? showFilters
                    ? 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4'
                    : 'hidden'
                  : 'lg:col-span-1 space-y-6 block'
              }
              onClick={windowWidth <= 1024 ? () => setShowFilters(false) : undefined}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs relative ${
                  windowWidth <= 1024
                    ? 'w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl'
                    : 'rounded-3xl p-5 xl:p-6'
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-[#0B132B] dark:text-white">
                      Filter Tutors
                    </h3>
                    {activeFilterCount > 0 && (
                      <p className="text-xs font-semibold text-[#0D5BFF] dark:text-blue-400 mt-0.5">
                        {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {windowWidth <= 1024 && (
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer"
                      aria-label="Close filters"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <FilterGroup label="Search Tutors">
                    {recentSearches.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Recent searches
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRecentSearches([]);
                              localStorage.removeItem('recent_searches');
                            }}
                            className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((query, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSearchTerm(query)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-[#0D5BFF] hover:text-[#0D5BFF] transition-colors truncate max-w-[130px] cursor-pointer"
                              title={query}
                            >
                              {query}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Name, university, or subject..."
                        value={searchTerm}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all"
                      />
                      <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Curriculum">
                    <div className="flex flex-wrap gap-1.5">
                      {['', ...AVAILABLE_VERSIONS].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFilterVersion(v)}
                          className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                            filterVersion === v 
                            ? 'bg-[#0B132B] dark:bg-[#0D5BFF] border-[#0B132B] dark:border-[#0D5BFF] text-white shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {v || 'All'}
                        </button>
                      ))}
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Class / Level">
                    <div className="relative">
                      <select 
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] appearance-none cursor-pointer"
                      >
                        <option value="">All Classes</option>
                        {AVAILABLE_CLASSES.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="District">
                    <div className="relative">
                      <select 
                        value={filterDistrict}
                        onChange={e => {
                          setFilterDistrict(e.target.value);
                          setFilterThana('');
                        }}
                        className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Any District</option>
                        {BANGLADESH_DISTRICTS.map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Thana / Upazila">
                    <div className="relative">
                      <select 
                        value={filterThana}
                        disabled={!filterDistrict}
                        onChange={e => setFilterThana(e.target.value)}
                        className={`w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all appearance-none cursor-pointer ${
                          !filterDistrict ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">{filterDistrict ? 'Any Thana' : 'Select district first'}</option>
                        {filterDistrict && BANGLADESH_THANAS[filterDistrict]?.map(th => (
                          <option key={th} value={th}>{th}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Area">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Dhanmondi, Halishahar..."
                        value={filterArea}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        onChange={e => setFilterArea(e.target.value)}
                        className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all"
                      />
                      <MapPin className="absolute right-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Subjects">
                    <div className="relative" ref={subjectDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                        className={`w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] cursor-pointer ${
                          isSubjectDropdownOpen ? 'border-[#0D5BFF]' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2">
                          {filterSubjects.length === 0
                            ? 'Choose subjects'
                            : `${filterSubjects.length} subject${filterSubjects.length > 1 ? 's' : ''} selected`}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isSubjectDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-[99] p-3.5 flex flex-col gap-2.5"
                            style={{ maxHeight: '360px' }}
                          >
                            {/* Search bar inside dropdown */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search subject..."
                                value={subjectFilterSearch}
                                onChange={e => setSubjectFilterSearch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs font-medium text-[#0B132B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0D5BFF]"
                              />
                              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              {subjectFilterSearch && (
                                <button
                                  type="button"
                                  onClick={() => setSubjectFilterSearch('')}
                                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Bulk Actions */}
                            <div className="flex justify-between items-center px-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const allMatching: string[] = [];
                                  Object.values(SUBJECT_CATEGORIES).forEach((subjects: string[]) => {
                                    subjects.forEach(sub => {
                                      if (!subjectFilterSearch || sub.toLowerCase().includes(subjectFilterSearch.toLowerCase())) {
                                        allMatching.push(sub);
                                      }
                                    });
                                  });
                                  setFilterSubjects(prev => {
                                    const next = new Set([...prev, ...allMatching]);
                                    return Array.from(next);
                                  });
                                }}
                                className="text-xs font-semibold text-[#0D5BFF] dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!subjectFilterSearch) {
                                    setFilterSubjects([]);
                                  } else {
                                    setFilterSubjects(prev => prev.filter(sub => 
                                      !sub.toLowerCase().includes(subjectFilterSearch.toLowerCase())
                                    ));
                                  }
                                }}
                                className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                              >
                                Clear all
                              </button>
                            </div>

                            {/* Scrollable list of subjects */}
                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5 py-1">
                              {Object.entries(SUBJECT_CATEGORIES).map(([category, subjects]) => {
                                const filtered = subjects.filter(sub => 
                                  !subjectFilterSearch || sub.toLowerCase().includes(subjectFilterSearch.toLowerCase())
                                );
                                if (filtered.length === 0) return null;

                                return (
                                  <div key={category} className="space-y-1">
                                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 px-2 py-1 rounded-lg">
                                      {category}
                                    </div>
                                    <div className="space-y-0.5">
                                      {filtered.map(sub => {
                                        const isSelected = filterSubjects.includes(sub);
                                        return (
                                          <button
                                            type="button"
                                            key={sub}
                                            onClick={() => {
                                              setFilterSubjects(prev =>
                                                isSelected
                                                  ? prev.filter(s => s !== sub)
                                                  : [...prev, sub]
                                              );
                                            }}
                                            className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between text-left cursor-pointer ${
                                              isSelected
                                                ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0D5BFF] dark:text-blue-300 font-semibold'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                          >
                                            <span className="break-words pr-2">{sub}</span>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                              isSelected ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Empty Search Result */}
                              {Object.values(SUBJECT_CATEGORIES).every((subjects: string[]) => 
                                !subjects.some(sub => sub.toLowerCase().includes(subjectFilterSearch.toLowerCase()))
                              ) && (
                                <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs font-medium">
                                  No subjects match your search
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Minimum Rating">
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFilterRating(star === filterRating ? 0 : star)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${filterRating >= star ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                          title={`${star} Stars & Up`}
                        >
                          <Star className={`w-4 h-4 ${filterRating >= star ? 'fill-amber-500' : ''}`} />
                        </button>
                      ))}
                      {filterRating > 0 && (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1 tabular-nums">{filterRating}+</span>
                      )}
                    </div>
                  </FilterGroup>

                  <FilterGroup label="Tutor Gender">
                    <div className="flex flex-wrap gap-1.5">
                      {['', 'Male', 'Female'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFilterGender(g)}
                          className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                            filterGender === g
                              ? 'bg-[#0B132B] dark:bg-[#0D5BFF] border-[#0B132B] dark:border-[#0D5BFF] text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {g || 'Any'}
                        </button>
                      ))}
                    </div>
                  </FilterGroup>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterSubjects([]);
                        setFilterClass('');
                        setFilterArea('');
                        setFilterDistrict('');
                        setFilterThana('');
                        setFilterVersion('');
                        setFilterRating(0);
                        setFilterGender('');
                        setShowShortlistedOnly(false);
                      }}
                      className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200/70 dark:border-rose-900/50 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    {windowWidth <= 1024 && (
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="w-full min-h-[44px] py-2.5 bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
                      >
                        Apply ({filteredTutors.length} Results)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6 sm:space-y-8">
              <div className="flex flex-wrap items-center gap-2.5">
                {windowWidth <= 1024 && !showFilters && !selectedTutor && (
                  <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className="flex-1 min-w-[200px] min-h-[48px] px-5 py-3 bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white shadow-sm"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#0D5BFF]" />
                    <span>Filter &amp; Search</span>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#0D5BFF] text-white text-[10px]">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowShortlistedOnly((prev) => !prev)}
                  className={`min-h-[48px] px-5 py-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                    showShortlistedOnly
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-rose-300'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${showShortlistedOnly ? 'fill-white' : 'text-rose-500'}`} />
                  <span>Shortlisted ({(currentUser.savedTutors || []).length})</span>
                </button>
              </div>

              {/* Active Subject Filter Tags */}
              {filterSubjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#0D5BFF]" />
                    Filtering by:
                  </span>
                  {filterSubjects.map(sub => (
                    <span 
                      key={sub}
                      className="inline-flex items-center gap-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-[#0D5BFF] dark:text-blue-300 px-3 py-1 rounded-xl text-xs font-semibold border border-blue-500/15"
                    >
                      <span>{sub}</span>
                      <button 
                        type="button"
                        aria-label={`Remove ${sub} filter`}
                        onClick={() => setFilterSubjects(prev => prev.filter(s => s !== sub))}
                        className="w-4 h-4 rounded-full bg-blue-500/10 hover:bg-rose-500 hover:text-white flex items-center justify-center text-[11px] transition cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setFilterSubjects([])}
                    className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors cursor-pointer px-2 py-1"
                  >
                    Clear All
                  </button>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Tutor Selection Panel */}
                {(!selectedTutor || windowWidth > 1024) && (
                  <div className="space-y-4 lg:max-h-[820px] lg:pr-2 lg:sticky lg:top-4 flex flex-col">
                    <div className="lg:hidden mb-2 flex-shrink-0">
                       <h2 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white tracking-tight">Verified Tutors</h2>
                       <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">Select a tutor to view full academic credentials or book a trial session</p>
                    </div>
                    {debouncedSearch !== searchTerm ? (
                      <div className="space-y-3.5 flex-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111A2E]">
                            <div className="flex items-center gap-4">
                              <Skeleton className="w-14 h-14 rounded-2xl" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-2/3 rounded-lg" />
                                <Skeleton className="h-3 w-1/2 rounded-lg" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[300px]">
                        {filteredTutors.length === 0 ? (
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                              key="no-tutors-found"
                              initial={{ opacity: 0, scale: 0.96, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: -10 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="w-full text-center py-14 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3"
                            >
                              <Users className="w-8 h-8 text-[#0D5BFF]" />
                              <div>
                                <h4 className="text-sm font-bold text-[#0B132B] dark:text-white">No Mentors Match Your Filters</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-[260px] leading-relaxed mx-auto">
                                  Try adjusting your subject, class, or district filters to see more verified tutors.
                                </p>
                                <p
                                  lang="bn"
                                  className="font-bn text-xs text-slate-600 dark:text-slate-300 mt-1.5 max-w-[280px] leading-[1.65] mx-auto"
                                >
                                  আপনার নির্বাচিত শর্ত অনুযায়ী কোনো শিক্ষক পাওয়া যায়নি। ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
                                </p>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        ) : (
                          <div className="lg:max-h-[720px] lg:overflow-y-auto custom-scrollbar flex flex-col gap-3.5 lg:pr-1">
                            {filteredTutors.map((tutor, index) => (
                              <TutorRow
                                key={tutor.id}
                                index={index}
                                style={{}}
                                rowProps={{
                                  filteredTutors,
                                  selectedTutor,
                                  setSelectedTutor,
                                  getDayName,
                                  savedTutors: currentUser?.savedTutors || [],
                                  toggleSavedTutor,
                                  viewerContext: { id: currentUser.id, role: currentUser.role },
                                  sessions: mySessions,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
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
                          className="lg:hidden min-h-[44px] flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-[#111A2E] rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#0B132B] dark:text-white shadow-sm mb-4 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4 text-[#0D5BFF]" />
                          Back to Tutors
                        </button>
                        <div className="bg-white dark:bg-[#111A2E] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 lg:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
                             <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 w-full">
                                <UserAvatar
                                  src={
                                    canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, selectedTutor.id, mySessions)
                                      ? selectedTutor.profileImage
                                      : undefined
                                  }
                                  locked={!canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, selectedTutor.id, mySessions)}
                                  name={selectedTutor.name}
                                  isOnline={Boolean(selectedTutor.isOnline)}
                                  className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700"
                                  textClassName="text-2xl font-black text-white"
                                />
                                <div className="space-y-3 flex-1 min-w-0 w-full">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <h3 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white break-words leading-snug">{selectedTutor.name}</h3>
                                      <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                                        <p className="text-xs sm:text-sm font-semibold text-[#0D5BFF] dark:text-blue-400 break-words leading-snug">
                                          {[selectedTutor.university, selectedTutor.course].filter(Boolean).join(' • ') || 'Verified University Educator'}
                                        </p>
                                        {isTutorVerified(selectedTutor) && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 text-xs font-bold shrink-0">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>Verified</span>
                                          </span>
                                        )}
                                        {selectedTutor.rating && (
                                          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40 shrink-0 tabular-nums">
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{selectedTutor.rating.toFixed(1)}</span>
                                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">({selectedTutor.totalRatings || 0} reviews)</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => toggleSavedTutor(selectedTutor.id)}
                                        className={`min-w-[44px] min-h-[44px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                                          (currentUser?.savedTutors || []).includes(selectedTutor.id)
                                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                      >
                                        <Heart className={`w-4 h-4 ${(currentUser?.savedTutors || []).includes(selectedTutor.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                                        <span className="hidden sm:inline">
                                          {(currentUser?.savedTutors || []).includes(selectedTutor.id) ? 'Saved' : 'Save'}
                                        </span>
                                      </button>
                                      <Link
                                        to={`/teachers/${selectedTutor.id}`}
                                        className="min-w-[44px] min-h-[44px] px-3.5 rounded-2xl bg-[#0D5BFF] hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 text-xs font-bold transition-colors"
                                        title="Open full public tutor profile"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>View Profile</span>
                                      </Link>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Fee</p>
                                      <p className="text-lg font-bold text-[#0B132B] dark:text-white tabular-nums">
                                        {selectedTutor.hourlyRate ? `৳${Number(selectedTutor.hourlyRate).toLocaleString()}` : 'Negotiable'}
                                        {selectedTutor.hourlyRate ? <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">/month</span> : null}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Schedule</p>
                                      <p className="text-lg font-bold text-[#0D5BFF] dark:text-blue-400 tabular-nums">
                                        {selectedTutor.daysPerWeek || 3}<span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">days/week</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#0D5BFF] dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                       <MapPin className="w-3.5 h-3.5 shrink-0" />
                                       <span className="text-xs font-semibold">{selectedTutor.district}{selectedTutor.area ? `, ${selectedTutor.area}` : ''}</span>
                                    </div>
                                  </div>
                                </div>
                             </div>
                          </div>

                          <div className="mb-5 p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                             <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Teaching Areas</p>
                             <div className="flex flex-wrap gap-1.5">
                                {(selectedTutor.teachingAreas || []).map(area => (
                                  <span key={area} className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#0D5BFF] dark:text-blue-300 rounded-lg">{area}</span>
                                ))}
                                {(selectedTutor.teachingAreas || []).length === 0 && <span className="text-xs text-slate-500 dark:text-slate-400">No specific areas listed</span>}
                             </div>
                          </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2.5 col-span-2 md:col-span-1">
                               <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verification</p>
                               <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                     <div className="flex items-center gap-1.5">
                                        <ShieldCheck className={`w-3.5 h-3.5 ${selectedTutor.nidStatus === 'approved' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <span className="text-xs font-semibold text-[#0B132B] dark:text-slate-200">NID</span>
                                     </div>
                                     <span className={`text-xs font-semibold ${selectedTutor.nidStatus === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {selectedTutor.nidStatus === 'approved' ? 'Verified' : 'Pending'}
                                     </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                     <div className="flex items-center gap-1.5">
                                        <ShieldCheck className={`w-3.5 h-3.5 ${selectedTutor.academicStatus === 'approved' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <span className="text-xs font-semibold text-[#0B132B] dark:text-slate-200">Academic</span>
                                     </div>
                                     <span className={`text-xs font-semibold ${selectedTutor.academicStatus === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {selectedTutor.academicStatus === 'approved' ? 'Verified' : 'Pending'}
                                     </span>
                                  </div>
                               </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col justify-center">
                               <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Experience</p>
                               <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white break-words">{selectedTutor.experience || 'Experienced Mentor'}</p>
                            </div>
                            <div className="p-4 bg-[#0B132B] rounded-2xl border border-white/10 flex flex-col justify-center">
                               <p className="text-xs font-semibold text-slate-300 mb-2">Weekly Availability</p>
                               <div className="flex gap-1.5 items-center">
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                     const hasSlots = (selectedTutor.availabilitySlots?.[day] || []).length > 0;
                                     return (
                                        <div 
                                          key={day} 
                                          className={`w-3.5 h-3.5 rounded border ${hasSlots ? 'bg-[#0D5BFF] border-[#0D5BFF]' : 'bg-transparent border-white/20'}`}
                                          title={`${day}: ${hasSlots ? 'Available' : 'No Slots'}`}
                                        />
                                     );
                                  })}
                               </div>
                            </div>
                         </div>

                         {/* Student's Personal Rating History with this Tutor */}
                         {mySessions.filter(s => s.tutorId === selectedTutor.id && s.rating).length > 0 && (
                            <div className="mb-8 p-5 bg-[#0D5BFF]/5 dark:bg-[#0D5BFF]/10 rounded-2xl border border-[#0D5BFF]/15 flex items-center justify-between gap-3">
                               <div>
                                  <p className="text-xs font-bold text-[#0D5BFF] dark:text-blue-400 mb-0.5">Your Rating History</p>
                                  <p className="text-sm font-semibold text-[#0B132B] dark:text-white">
                                     You have rated this tutor {mySessions.filter(s => s.tutorId === selectedTutor.id && s.rating).length} times
                                  </p>
                               </div>
                               <div className="flex gap-1">
                                  {(() => {
                                     const ratedSessions = mySessions.filter(s => s.tutorId === selectedTutor.id && s.rating);
                                     const avg = ratedSessions.reduce((acc, s) => acc + (s.rating || 0), 0) / ratedSessions.length;
                                     return [1,2,3,4,5].map(st => (
                                        <Star key={st} className={`w-3.5 h-3.5 ${st <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                                     ));
                                  })()}
                               </div>
                            </div>
                         )}

                         {/* Unrated Sessions Prompt */}
                         {mySessions.find(s => s.tutorId === selectedTutor.id && s.status === 'completed' && !s.rating) && (
                            <div className="mb-8 p-5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-3">
                               <div>
                                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-0.5">Feedback Needed</p>
                                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">You have unrated sessions with this tutor</p>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const unrated = mySessions.find(s => s.tutorId === selectedTutor.id && s.status === 'completed' && !s.rating);
                                   if (unrated) setPendingRatingSession(unrated);
                                 }}
                                 className="min-h-[40px] px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors shrink-0 cursor-pointer"
                               >
                                  Rate Now
                               </button>
                            </div>
                         )}

                        <div className="space-y-5 mb-8">
                           <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Bio &amp; Teaching Approach</p>
                              <p className="text-xs sm:text-sm font-normal text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 break-words">
                                {selectedTutor.bio || 'Verified educator offering structured lessons and regular progress tracking.'}
                              </p>
                           </div>

                           <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Academic Background</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                                 <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                                       <GraduationCap className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                       <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">University</span>
                                       <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white mt-0.5 break-words">{selectedTutor.university || 'Educational Expert'}</p>
                                    </div>
                                 </div>

                                 <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                                       <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                       <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Department / Major</span>
                                       <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white mt-0.5 break-words">{selectedTutor.course || 'Subject Specialist'}</p>
                                    </div>
                                 </div>

                                 <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                                       <Award className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                       <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Academic Standing</span>
                                       <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white mt-0.5 break-words">
                                          {selectedTutor.semester || selectedTutor.year 
                                             ? [selectedTutor.year ? `${selectedTutor.year} Year` : null, selectedTutor.semester ? `${selectedTutor.semester} Semester` : null].filter(Boolean).join(', ')
                                             : 'Graduate / Experienced'}
                                       </p>
                                    </div>
                                 </div>

                                 <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                                       <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                       <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Teaching Levels</span>
                                       <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white mt-0.5 break-words">
                                          {formatTutorClassesRange(selectedTutor)}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">All Subjects Taught</p>
                              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 leading-relaxed break-words">
                                 {parseSubjectsList(selectedTutor.subjects, selectedTutor.subject).join(', ') || 'General Academic Subjects'}
                              </p>
                           </div>

                           {/* Masked Contact Details for Security */}
                           <div className="space-y-2">
                             <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Channels</p>
                             <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
                               <div className="grid sm:grid-cols-2 gap-4">
                                 <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] rounded-xl flex items-center justify-center shrink-0">
                                     <Phone className="w-4 h-4" />
                                   </div>
                                   <div className="min-w-0">
                                     <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Phone</span>
                                     <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white mt-0.5 tabular-nums">{getMaskedPhone(selectedTutor.phone)}</p>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/40 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                                     <Mail className="w-4 h-4" />
                                   </div>
                                   <div className="min-w-0">
                                     <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Email</span>
                                     <p className="text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white mt-0.5 break-all">{getMaskedEmail(selectedTutor.email)}</p>
                                   </div>
                                 </div>
                               </div>

                               <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2">
                                 <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                   <strong>Privacy Protected:</strong> Direct phone and email details unlock only after the tutor confirms your tuition booking. Use <strong>Inbox Message</strong> or request a session below.
                                 </p>
                               </div>
                             </div>
                           </div>
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800 mb-8" />

                        {bookingSuccess ? (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-[2.5rem] text-left md:text-center border border-emerald-100 dark:border-emerald-900/40">
                            <CheckCircle className="w-10 h-10 text-emerald-500 ml-0 mr-auto md:mx-auto mb-4" />
                            <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-200 uppercase italic">Binding Success</h4>
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">Check your session log for arrival</p>
                          </motion.div>
                        ) : (
                          <form onSubmit={handleBookingSubmit} className="space-y-8">
                            {/* Visual Date Selection */}
                             <div className="space-y-4">
                               <div className="flex items-center justify-between px-1 sm:px-2">
                                 <label className="text-xs font-bold text-slate-700 dark:text-slate-300">1. Select Date</label>
                                 <div className="flex items-center gap-1.5 bg-[#0D5BFF]/10 px-2.5 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-pulse" />
                                    <span className="text-[11px] font-semibold text-[#0D5BFF] dark:text-blue-400">30-Day Window</span>
                                 </div>
                               </div>
                               <div className="relative group">
                                 <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     type="button"
                                     onClick={() => scrollDates('left')}
                                     className="pointer-events-auto ml-1 p-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-lg rounded-full text-[#0B132B] dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all transform active:scale-95"
                                   >
                                     <ChevronLeft className="w-4 h-4" />
                                   </button>
                                 </div>
                                 <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     type="button"
                                     onClick={() => scrollDates('right')}
                                     className="pointer-events-auto mr-1 p-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-lg rounded-full text-[#0B132B] dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all transform active:scale-95"
                                   >
                                     <ChevronRight className="w-4 h-4" />
                                   </button>
                                 </div>
                                 <div 
                                   ref={dateScrollRef}
                                   className="flex flex-col sm:flex-row gap-3 overflow-y-auto sm:overflow-x-auto max-h-[300px] sm:max-h-none pb-4 sm:pb-5 pt-2 hide-scrollbar snap-y sm:snap-x cursor-grab active:cursor-grabbing px-1 sm:px-2 scroll-smooth"
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
                                         className={`flex-shrink-0 w-full sm:w-24 p-3.5 sm:p-4 rounded-2xl border transition-all snap-start flex sm:flex-col items-center sm:justify-center justify-between text-left sm:text-center cursor-pointer ${
                                           isSelected 
                                           ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-lg shadow-blue-500/25 -translate-y-0.5' 
                                           : hasSlots 
                                             ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-[#0B132B] dark:text-slate-100 hover:border-[#0D5BFF] hover:shadow-md' 
                                             : 'bg-slate-100/80 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
                                         }`}
                                       >
                                         <div className="flex sm:flex-col items-baseline sm:items-center gap-2 sm:gap-0 leading-none">
                                           <p className={`text-[11px] font-bold uppercase tracking-wider sm:mb-1 ${isSelected ? 'opacity-90 text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                             {dayName.substring(0, 3)}
                                           </p>
                                           <p className="text-sm sm:text-xl font-black leading-none animate-fade-in">
                                             {new Date(date).getDate()}
                                           </p>
                                         </div>
                                         {isToday && !isSelected && <p className="text-[11px] font-bold text-[#0D5BFF] dark:text-blue-400 mt-1">Today</p>}
                                         {!hasSlots && <p className="text-[11px] font-semibold mt-1">Full</p>}
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>
                             </div>

                            {/* Visual Slot Selection */}
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1 block">2. Select Time Slot</label>
                              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
                                {(() => {
                                  const dayName = getDayName(bookingDate);
                                  const slots = selectedTutor.availabilitySlots?.[dayName] || [];
                                  
                                  if (slots.length === 0) {
                                    return (
                                      <div className="col-span-full py-6 text-left px-6 md:text-center md:px-0 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 w-full animate-fade-in">
                                        <Clock className="w-7 h-7 text-slate-400 ml-0 mr-auto md:mx-auto mb-2" />
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                          No time slots available for this day
                                        </p>
                                      </div>
                                    );
                                  }

                                  return slots.map(slot => (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() => setBookingSlot(slot)}
                                      className={`py-3 px-4 sm:py-2 sm:px-3.5 rounded-xl text-xs font-semibold transition-all border text-center w-full sm:w-auto cursor-pointer ${
                                        bookingSlot === slot 
                                        ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-md' 
                                        : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0D5BFF] hover:text-[#0D5BFF] dark:hover:text-blue-400'
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>

                            {/* Subject Selection & Submit */}
                            <div className="space-y-5 pt-3">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">3. Select Subjects {selectedTutor ? "— Tutor's Subjects" : ""}</label>
                                  {bookingSubject.length > 0 && (
                                    <span className="text-xs font-semibold text-[#0D5BFF] dark:text-blue-400">{bookingSubject.length} Selected</span>
                                  )}
                                </div>

                                {/* Curricular Version Tabs Selection */}
                                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                                  {(['Bangla Version', 'English Version', 'Madrasha'] as const).map(tab => {
                                    const isActive = activeSubjectTab === tab;
                                    return (
                                      <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveSubjectTab(tab)}
                                        className={`w-full sm:flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                          isActive 
                                            ? 'bg-[#0D5BFF] text-white shadow-sm' 
                                            : 'text-slate-600 dark:text-slate-300 hover:text-[#0B132B] dark:hover:text-white'
                                        }`}
                                      >
                                        {tab.replace(' Version', '')}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                                {/* Dynamic Intelligence Subject Filter and Quick Focus Toggles */}
                                <div className="space-y-3 pt-1">
                                  <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Search tutor subjects..."
                                      value={subjectSearchTerm}
                                      onChange={e => setSubjectSearchTerm(e.target.value)}
                                      className="un-focused w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-[#0B132B] dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF]"
                                    />
                                  </div>

                                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
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
                                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center w-full sm:w-auto cursor-pointer ${
                                        bookingSubject.some(s => ['Physics', 'Chemistry', 'Mathematics', 'Biology'].some(stem => s.includes(stem)))
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500'
                                      }`}
                                    >
                                      Science
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
                                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center w-full sm:w-auto cursor-pointer ${
                                        bookingSubject.some(s => ['Accounting', 'Finance', 'Business'].some(comm => s.includes(comm)))
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500'
                                      }`}
                                    >
                                      Business Studies
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
                                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center w-full sm:w-auto cursor-pointer ${
                                        bookingSubject.some(s => ['Bangla', 'English', 'History', 'Geography'].some(hum => s.includes(hum)))
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500'
                                      }`}
                                    >
                                      Humanities
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBookingSubject([])}
                                      className="w-full sm:w-auto sm:ml-auto px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all text-center cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>

                                {/* Subjects Interactive Dynamic Grid */}
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar py-2 border-l border-slate-200/70 dark:border-slate-700/70 pl-4">
                                  {(() => {
                                    const availableSubjects = (SUBJECT_CATEGORIES[activeSubjectTab] || []).filter(sub => 
                                      selectedTutor?.subjects ? selectedTutor.subjects.includes(sub) : true
                                    );
                                    const filteredList = availableSubjects.filter(sub => 
                                      sub.toLowerCase().includes(subjectSearchTerm.toLowerCase())
                                    );

                                    if (filteredList.length === 0) {
                                      return (
                                        <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 w-full">
                                          <p className="text-xs font-semibold leading-relaxed">
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
                                              className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all border text-left cursor-pointer group ${
                                                isSelected 
                                                ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-sm' 
                                                : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0D5BFF] hover:bg-slate-50 dark:hover:bg-slate-800'
                                              }`}
                                            >
                                              <span className="break-words pr-2">{sub.replace(' (EV)', '').replace(' (Madrasha)', '')}</span>
                                              {isSelected ? (
                                                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[#0D5BFF] text-[11px] font-black shrink-0">
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
                                    handleTabChange('messages');
                                  }}
                                  className="py-5 bg-white border-2 border-slate-100 text-[#0B132B] rounded-3xl text-[11px] font-black uppercase italic tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                                >
                                  <Send className="w-4 h-4" />
                                  Message Expert
                                </button>
                                <motion.button
                                  whileTap={{ scale: 0.96 }}
                                  whileHover={{ scale: 1.02 }}
                                  disabled={isBooking || !bookingDate || !bookingSlot || bookingSubject.length === 0}
                                  className="py-5 bg-[#0D5BFF] text-white rounded-3xl text-[11px] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:shadow-none cursor-pointer"
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
                                </motion.button>
                              </div>
                            </form>
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
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-8"
          >
             <h3 className="text-xl sm:text-3xl font-black text-[#0B132B] uppercase italic">Central Activity Logs</h3>
             <div className="w-full">
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors h-fit w-full">
                   <h4 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-8">Lesson History</h4>
                   <div className="space-y-4">
                      {mySessions.map(sess => (
                        <div key={sess.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
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
             </div>
          </motion.div>
        )}

        {activeTab === 'transit' && (
          <motion.div 
            key="transit"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="grid lg:grid-cols-2 gap-12"
          >
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col transition-colors">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/20 rounded-2xl flex items-center justify-center">
                         <MapPin className="w-7 h-7 text-[#0D5BFF]" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic">Transit Intelligence</h3>
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
                              .filter(u => isTutorEligibleForStudentSearch(u))
                              .forEach(t => {
                                const coords = getTutorLocation(t.id, t.location, [currentUser.location!.lat, currentUser.location!.lng], t.district, t.thana);
                                if (coords) {
                                  const dist = getDistance(currentUser.location!.lat, currentUser.location!.lng, coords[0], coords[1]);
                                  if (dist <= nearbyRadius) {
                                    totalDetected++;
                                  }
                                }
                              });

                            const totalMatched = users
                              .filter(u => isTutorEligibleForStudentSearch(u))
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
                                const coords = getTutorLocation(t.id, t.location, [currentUser.location!.lat, currentUser.location!.lng], t.district, t.thana);
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
                              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#111A2E] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0D5BFF]"
                            />
                          </div>

                          <div className="sm:col-span-5 flex gap-2">
                            <select
                              value={mapMinRating || ''}
                              onChange={(e) => setMapMinRating(Number(e.target.value) || 0)}
                              className="flex-1 px-3 py-2.5 bg-white dark:bg-[#111A2E] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0D5BFF] cursor-pointer"
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
                    <div className="bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] h-[350px] sm:h-[500px] overflow-hidden border-4 sm:border-8 border-white shadow-2xl relative animate-fade-in">
                      <AppErrorBoundary level="widget" sectionName="Live Location Radar">
                        <Suspense fallback={<MapLoading />}>
                          <MapTracker 
                            studentLocation={effectiveStudentLocation}
                            studentName="Me"
                            studentImage={currentUser?.profileImage}
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

                                      const coords = getTutorLocation(tutor.id, tutor.location || tutor.lastLocation, effectiveStudentLocation, tutor.district, tutor.thana);
                                      if (coords && !uniqueTutors.has(tutor.id)) {
                                        const unlocked = canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, tutor.id, mySessions);
                                        uniqueTutors.set(tutor.id, {
                                          id: tutor.id,
                                          location: coords,
                                          name: tutor.name,
                                          image: unlocked ? tutor.profileImage : undefined,
                                          isOnline: tutor.isTrackingOn || tutor.isOnline,
                                          isLastKnownLocation: !tutor.location && Boolean(tutor.lastLocation),
                                          lastLocationUpdatedAt: tutor.lastLocationUpdatedAt || tutor.lastActiveAt,
                                          subjects: tutor.subjects,
                                          rating: tutor.rating
                                        });
                                      }
                                    }
                                  });
                                return Array.from(uniqueTutors.values());
                              } else {
                                return users
                                  .filter(u => isTutorEligibleForStudentSearch(u))
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
                                    const coords = getTutorLocation(t.id, t.location || t.lastLocation, effectiveStudentLocation, t.district, t.thana);
                                    if (!coords) return null;
                                    const dist = getDistance(effectiveStudentLocation[0], effectiveStudentLocation[1], coords[0], coords[1]);
                                    if (dist > nearbyRadius) return null;
                                    const unlocked = canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, t.id, mySessions);
                                    return {
                                      id: t.id,
                                      location: coords,
                                      name: t.name,
                                      image: unlocked ? t.profileImage : undefined,
                                      isOnline: t.isTrackingOn || t.isOnline,
                                      isLastKnownLocation: !t.location && Boolean(t.lastLocation),
                                      lastLocationUpdatedAt: t.lastLocationUpdatedAt || t.lastActiveAt,
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
                      </AppErrorBoundary>
                    </div>

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
                          <div key={sess.id} className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-950/40 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-lg font-black italic text-[#0D5BFF]">
                                      {tutor?.name?.charAt(0)}
                                   </div>
                                   <div>
                                      <h4 className="text-sm font-black text-[#0B132B] dark:text-white uppercase italic">{tutor?.name}</h4>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sess.subject}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   {tutor && (tutor.whatsappNumber || tutor.phone) && (
                                     <a 
                                       href={`https://wa.me/${(() => {
                                         const num = tutor.whatsappNumber || tutor.phone || '';
                                         let clean = num.replace(/\D/g, '');
                                         if (clean.startsWith('01') && clean.length === 11) {
                                           clean = '88' + clean;
                                         } else if (clean.startsWith('1') && clean.length === 10) {
                                           clean = '880' + clean;
                                         }
                                         return clean;
                                       })()}?text=${encodeURIComponent(`Hello! I am ${currentUser?.name || "a student"} from EduTrack Bangladesh. I am happy that our tuition connection has been confirmed! Let's discuss our schedule and classes.`)}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[8px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-[#25D366]/10 transition-all flex items-center gap-1.5 cursor-pointer inline-flex"
                                       title="Chat on WhatsApp"
                                     >
                                       <MessageSquare className="w-3 h-3" />
                                       <span>WhatsApp</span>
                                     </a>
                                   )}
                                   <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                     tutor?.isTrackingOn ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-200 text-slate-400'
                                   }`}>
                                      {tutor?.isTrackingOn ? 'BROADCASTING' : 'OFFLINE'}
                                   </div>
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
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="grid lg:grid-cols-3 gap-8 h-auto lg:h-[700px]"
          >
            <div className={`lg:col-span-1 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col ${selectedRecipientId ? 'hidden lg:flex' : 'flex'}`}>
               <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8 px-2">Contacts</h3>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar hide-scrollbar">
                  {(() => {
                    // Logic: Tutors I have a session record with OR message history + Admin Support
                    const myTutorIdsFromSessions = mySessions.map(s => s.tutorId);
                    const myTutorIdsFromMessages = messages.map(m => m.senderId === currentUser.id ? m.receiverId : m.senderId);
                    const adminIds = users.filter(u => u.role === 'admin').map(u => u.id);
                    const allContactIds = Array.from(new Set([...myTutorIdsFromSessions, ...myTutorIdsFromMessages, ...adminIds, ...(selectedRecipientId ? [selectedRecipientId] : [])]));
                    const contacts = users.filter(u => allContactIds.includes(u.id)).sort((a, b) => {
                      const aMsgs = messages.filter(m => 
                        (m.senderId === currentUser.id && m.receiverId === a.id) || 
                        (m.senderId === a.id && m.receiverId === currentUser.id)
                      );
                      const bMsgs = messages.filter(m => 
                        (m.senderId === currentUser.id && m.receiverId === b.id) || 
                        (m.senderId === b.id && m.receiverId === currentUser.id)
                      );
                      const getLatestTime = (msgs: typeof messages) => {
                        if (msgs.length === 0) return 0;
                        let maxTime = 0;
                        for (const m of msgs) {
                          if (m.timestamp) {
                            const time = new Date(m.timestamp).getTime();
                            if (!isNaN(time) && time > maxTime) {
                              maxTime = time;
                            }
                          }
                        }
                        return maxTime;
                      };
                      const aLatest = getLatestTime(aMsgs);
                      const bLatest = getLatestTime(bMsgs);
                      return bLatest - aLatest;
                    });

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
                      const isContactOnline = contact.role === 'admin' || contact.isTrackingOn || contact.isOnline || (contact.id.charCodeAt(0) % 2 === 0);
                      
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
                             {(() => {
                               const contactPhotoUnlocked =
                                 contact.role === 'tutor'
                                   ? canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, contact.id, mySessions)
                                   : true;
                               return (
                                 <UserAvatar
                                   src={contactPhotoUnlocked ? contact.profileImage : undefined}
                                   locked={!contactPhotoUnlocked}
                                   name={contact.name}
                                   className="w-10 h-10 rounded-xl border border-slate-200/70 dark:border-slate-700"
                                   fallbackClassName={selectedRecipientId === contact.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#0D5BFF]'}
                                   textClassName="text-xs font-black"
                                 />
                               );
                             })()}
                             {unreadCount > 0 && (
                               <span className="absolute -top-1.5 -right-1.5 bg-[#E51275] text-white text-[8px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-bounce shadow-md">
                                 {unreadCount}
                               </span>
                             )}
                             {isContactOnline && (
                               <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-sm" />
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold break-words leading-snug">{contact.name}</h4>
                              <p className={`text-[11px] font-medium break-words leading-snug mt-0.5 ${
                                selectedRecipientId === contact.id ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {contact.university || 'Verified Tutor'}
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

        {activeTab === 'class-verification' && (
          <motion.div 
            key="class-verification"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <AppErrorBoundary level="widget" sectionName="Class Calendar">
              <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                <ClassLogsCalendar role="student" />
              </Suspense>
            </AppErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 md:p-14 border border-slate-100 dark:border-slate-800 shadow-sm max-w-4xl transition-colors space-y-10"
          >
            {/* Header + Avatar + Edit Button */}
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <Suspense fallback={<div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 animate-pulse" />}>
                  <ImageUpload
                    currentImageUrl={currentUser.profileImage}
                    onUpload={(url) => updateUser(currentUser.id, { profileImage: url })}
                    onDelete={() => updateUser(currentUser.id, { profileImage: "" })}
                  />
                </Suspense>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] text-[10px] font-black uppercase tracking-widest mb-2">
                    {effectiveAccountType === 'guardian' ? 'Parent / Guardian Account' : 'Student Account'}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white uppercase italic">
                    {effectiveAccountType === 'guardian' ? 'Guardian Account' : 'Student Account'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{currentUser.email}</p>
                  <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateUser(currentUser.id, {
                          accountType: effectiveAccountType === 'guardian' ? 'student' : 'guardian',
                        })
                      }
                      className="text-[10px] font-bold text-slate-600 dark:text-slate-300 underline hover:text-[#0D5BFF] cursor-pointer"
                    >
                      Switch to {effectiveAccountType === 'guardian' ? 'Individual Student Mode' : 'Parent / Guardian Mode'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 self-center sm:self-start">
                {isEditingAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAccount(false);
                      setAccountUpdateError('');
                    }}
                    className="px-5 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    if (isEditingAccount) {
                      handleAccountUpdate({ preventDefault: () => {} } as React.FormEvent);
                    } else {
                      setAccountUpdateError('');
                      setIsEditingAccount(true);
                    }
                  }}
                  className="px-8 py-4 bg-[#0D5BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : isEditingAccount ? 'Confirm Changes' : 'Update Profile'}
                </button>
              </div>
            </div>

            {/* Centralized Profile Completion Meter */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Profile Completion
                  </p>
                  <p className="text-sm font-black text-[#0B132B] dark:text-white mt-0.5">
                    {profileCompletion.isComplete
                      ? 'Your profile is 100% complete and synchronized.'
                      : `${profileCompletion.missingFields.length} required detail${profileCompletion.missingFields.length > 1 ? 's' : ''} remaining`}
                  </p>
                </div>
                <span
                  className={`text-xl font-black font-mono ${
                    profileCompletion.isComplete ? 'text-emerald-600' : 'text-[#0D5BFF]'
                  }`}
                >
                  {profileCompletion.percentage}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    profileCompletion.isComplete ? 'bg-emerald-500' : 'bg-[#0D5BFF]'
                  }`}
                  style={{ width: `${profileCompletion.percentage}%` }}
                />
              </div>
              {!profileCompletion.isComplete && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {profileCompletion.missingFields.map((mf) => (
                    <button
                      key={mf.key}
                      type="button"
                      onClick={() => navigateToMissingField(mf.targetFieldId)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Complete {mf.label} →
                    </button>
                  ))}
                </div>
              )}
            </div>

            {accountUpdateError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{accountUpdateError}</span>
              </div>
            )}

            {accountUpdateSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs font-bold flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{accountUpdateSuccess}</span>
              </div>
            )}

            {isEditingAccount ? (
              <form onSubmit={handleAccountUpdate} className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    {effectiveAccountType === 'guardian' ? 'Guardian Full Name *' : 'Student Full Name *'}
                  </label>
                  <input
                    id="account-field-name"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    Contact Phone *
                  </label>
                  <input
                    id="account-field-phone"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                {effectiveAccountType === 'guardian' && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                      Relationship to Student *
                    </label>
                    <select
                      id="account-field-relationship"
                      value={accountForm.guardianRelationship}
                      onChange={(e) => setAccountForm({ ...accountForm, guardianRelationship: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    >
                      <option value="">Select Relationship</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Elder Sibling">Elder Sibling</option>
                      <option value="Uncle / Aunt">Uncle / Aunt</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    Gender
                  </label>
                  <select
                    value={accountForm.gender}
                    onChange={(e) => setAccountForm({ ...accountForm, gender: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    District *
                  </label>
                  <select
                    id="account-field-district"
                    value={accountForm.district}
                    onChange={(e) => setAccountForm({ ...accountForm, district: e.target.value, thana: '' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                  >
                    <option value="">Select District</option>
                    {BANGLADESH_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    Thana / Upazila
                  </label>
                  <select
                    value={accountForm.thana}
                    disabled={!accountForm.district}
                    onChange={(e) => setAccountForm({ ...accountForm, thana: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF] disabled:opacity-50"
                  >
                    <option value="">{accountForm.district ? 'Select Thana' : 'Select District First'}</option>
                    {accountForm.district && BANGLADESH_THANAS[accountForm.district]?.map((th) => (
                      <option key={th} value={th}>{th}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    Area / Neighborhood
                  </label>
                  <input
                    id="account-field-area"
                    value={accountForm.area}
                    onChange={(e) => setAccountForm({ ...accountForm, area: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    placeholder="e.g. Dhanmondi 15, Mirpur 10"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                    Delivery / Tuition Address *
                  </label>
                  <input
                    id="account-field-address"
                    value={accountForm.address}
                    onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    placeholder="e.g. House 14, Road 8, Dhanmondi, Dhaka"
                  />
                </div>

                {effectiveAccountType === 'student' && (
                  <>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                        School / College *
                      </label>
                      <input
                        id="account-field-school"
                        value={accountForm.school}
                        onChange={(e) => setAccountForm({ ...accountForm, school: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                        placeholder="e.g. Viqarunnisa Noon School & College"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                        Academic Class *
                      </label>
                      <select
                        id="account-field-class"
                        value={accountForm.studentClass}
                        onChange={(e) => setAccountForm({ ...accountForm, studentClass: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                      >
                        <option value="">Select Class</option>
                        {AVAILABLE_CLASSES.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                        Curriculum / Group *
                      </label>
                      <input
                        id="account-field-curriculum"
                        value={accountForm.curriculum}
                        onChange={(e) => setAccountForm({ ...accountForm, curriculum: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                        placeholder="e.g. Bangla Medium (Science), English Version"
                      />
                    </div>
                    <div id="account-field-subjects" className="md:col-span-2 space-y-5">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                        Learning Subjects (Optional)
                      </label>
                      {Object.entries(SUBJECT_CATEGORIES).map(([category, subjects]) => (
                        <div key={category} className="space-y-2.5 pl-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{category}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {subjects.map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubject(sub)}
                                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                                  accountForm.subjects.includes(sub)
                                    ? 'bg-[#0D5BFF] text-white border-[#0D5BFF] shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="md:col-span-2 py-5 bg-[#0B132B] dark:bg-[#0D5BFF] text-white rounded-3xl font-black uppercase italic tracking-widest hover:bg-[#0D5BFF] transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
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
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {effectiveAccountType === 'guardian' ? 'Guardian Full Name' : 'Student Full Name'}
                      </p>
                      <p className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                        {currentUser.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Phone</p>
                      <p className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                        {cleanMeaningfulString(currentUser.phone) || 'Not Specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Delivery / Tuition Address
                      </p>
                      <p className="text-lg font-black text-[#0B132B] dark:text-white italic">
                        {[currentUser.address, currentUser.area, currentUser.thana, currentUser.district]
                          .map((v) => cleanMeaningfulString(v))
                          .filter(Boolean)
                          .join(', ') || 'Not Specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                      <p className="text-xl font-black text-[#0D5BFF] uppercase italic">
                        {cleanMeaningfulString(currentUser.gender) || 'Not Specified'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-10">
                    {effectiveAccountType === 'guardian' ? (
                      <>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Relationship to Student
                          </p>
                          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 uppercase italic">
                            {cleanMeaningfulString(currentUser.guardianRelationship) || 'Not Specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Active Linked Student
                          </p>
                          <p className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                            {activeChildProfile
                              ? `${activeChildProfile.studentName} (${activeChildProfile.studentClass})`
                              : cleanMeaningfulString(currentUser.studentName) || 'No Student Added'}
                          </p>
                          {activeChildProfile?.school && (
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                              {activeChildProfile.school} • {activeChildProfile.curriculum || 'Standard Curriculum'}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            School / College
                          </p>
                          <p className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                            {cleanMeaningfulString(currentUser.school) || 'Not Specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Academic Class
                          </p>
                          <p className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                            {cleanMeaningfulString(currentUser.studentClass) || 'Not Specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Curriculum / Group
                          </p>
                          <p className="text-lg font-black text-[#0B132B] dark:text-white uppercase italic">
                            {cleanMeaningfulString(currentUser.curriculum) || cleanMeaningfulString(currentUser.group) || 'Not Specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Learning Subjects
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(currentUser.subjects || []).map((sub) => (
                              <span key={sub} className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-full">
                                {sub}
                              </span>
                            ))}
                            {(currentUser.subjects || []).length === 0 && (
                              <span className="text-xs italic text-slate-400">None selected</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-widest mb-1">Member Since</p>
                      <p className="text-sm font-black text-[#0B132B] dark:text-white uppercase italic">
                        {currentUser?.createdAt
                          ? (isNaN(new Date(currentUser.createdAt).getTime())
                              ? currentUser.createdAt
                              : new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
                          : 'August 2026'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Guardian Multi-Child Student Profiles Manager */}
                {effectiveAccountType === 'guardian' && (
                  <div
                    id="guardian-student-profile-section"
                    className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                          Managed Student Profiles
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Add and manage academic profiles for your child or ward to prefill tuition posts and match verified tutors.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openAddChildModal}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Student Profile</span>
                      </button>
                    </div>

                    {studentProfiles.length === 0 ? (
                      <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          No linked student profile created yet
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Add at least one student profile (name, class, school/college, and curriculum) to complete your Guardian profile.
                        </p>
                        <button
                          type="button"
                          onClick={openAddChildModal}
                          className="px-5 py-2.5 rounded-xl bg-[#0D5BFF] text-white text-xs font-bold cursor-pointer"
                        >
                          Add First Student
                        </button>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {studentProfiles.map((sp) => {
                          const isActive = activeChildProfile?.id === sp.id;
                          return (
                            <div
                              key={sp.id}
                              className={`p-5 rounded-3xl border transition-all space-y-3 ${
                                isActive
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-black text-[#0B132B] dark:text-white">
                                      {sp.studentName}
                                    </h4>
                                    {isActive && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-[#0D5BFF] mt-0.5">
                                    {sp.studentClass} • {sp.curriculum || 'Standard Curriculum'}
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    {sp.school}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditChildModal(sp)}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#0D5BFF] cursor-pointer"
                                    title="Edit student profile"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteStudentProfile(sp.id)}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 cursor-pointer"
                                    title="Remove student profile"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              {sp.subjects && sp.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {sp.subjects.map((sub) => (
                                    <span
                                      key={sub}
                                      className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                                    >
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => setActiveStudentProfile(sp.id)}
                                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                                >
                                  Set as Active Student
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-6">
                    Payment History
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {myPayments.map((p) => (
                      <div key={p.id} className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-black text-[#0B132B] dark:text-white uppercase italic">
                              TRX: {p.transactionId}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : p.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(p.date).toLocaleString()} • Sent via {p.bKashNumber}
                          </p>
                        </div>
                        <div className="text-xl font-black text-[#0B132B] dark:text-white italic">৳{p.amount}</div>
                      </div>
                    ))}
                    {myPayments.length === 0 && (
                      <div className="p-10 text-left md:text-center bg-slate-50/50 dark:bg-slate-950/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">
                          No transaction records found
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Guardian Add / Edit Child Modal */}
            {isChildModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-[#0B132B] dark:text-white">
                      {editingChildId ? 'Edit Student Profile' : 'Add Linked Student Profile'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsChildModalOpen(false)}
                      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {childFormError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold">
                      {childFormError}
                    </div>
                  )}

                  <form onSubmit={handleSaveChildProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Student&apos;s Full Name *
                      </label>
                      <input
                        value={childForm.studentName}
                        onChange={(e) => setChildForm({ ...childForm, studentName: e.target.value })}
                        placeholder="e.g. Aayan Rahman"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-semibold text-[#0B132B] dark:text-white"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Academic Class *
                        </label>
                        <select
                          value={childForm.studentClass}
                          onChange={(e) => setChildForm({ ...childForm, studentClass: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-semibold text-[#0B132B] dark:text-white"
                        >
                          <option value="">Select Class</option>
                          {AVAILABLE_CLASSES.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Curriculum / Medium *
                        </label>
                        <input
                          value={childForm.curriculum}
                          onChange={(e) => setChildForm({ ...childForm, curriculum: e.target.value })}
                          placeholder="e.g. English Version"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-semibold text-[#0B132B] dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        School / College *
                      </label>
                      <input
                        value={childForm.school}
                        onChange={(e) => setChildForm({ ...childForm, school: e.target.value })}
                        placeholder="e.g. Scholastica"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-semibold text-[#0B132B] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Subjects (Comma Separated)
                      </label>
                      <input
                        value={childForm.subjectsText}
                        onChange={(e) => setChildForm({ ...childForm, subjectsText: e.target.value })}
                        placeholder="e.g. Mathematics, Science, English"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-semibold text-[#0B132B] dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsChildModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingChild}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingChild ? 'Saving...' : editingChildId ? 'Save Student' : 'Create Student Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'referrals' && (
          <motion.div
            key="referrals"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <AppErrorBoundary level="widget" sectionName="Referrals">
              <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                <ReferralsTab />
              </Suspense>
            </AppErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'homework' && (
          <motion.div
            key="homework"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <AppErrorBoundary level="widget" sectionName="Homework">
              <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                <HomeworkDashboard />
              </Suspense>
            </AppErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRatingSession && (
          <Suspense fallback={null}>
            <RatingModal 
              sessionId={pendingRatingSession.id}
              tutorName={users.find(u => u.id === pendingRatingSession.tutorId)?.name || 'Your Tutor'}
              onClose={() => {
                if (pendingRatingSession) {
                  try {
                    const dismissed = JSON.parse(localStorage.getItem('dismissed_ratings') || '[]');
                    if (!dismissed.includes(pendingRatingSession.id)) {
                      dismissed.push(pendingRatingSession.id);
                      localStorage.setItem('dismissed_ratings', JSON.stringify(dismissed));
                    }
                  } catch (e) {
                    console.warn('Failed to save dismissed rating to localStorage:', e);
                  }
                }
                setPendingRatingSession(null);
              }}
            />
          </Suspense>
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
              className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-3xl text-left border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 sm:p-10 text-white relative shrink-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <button
                  onClick={() => {
                    setViewingProfileUser(null);
                    setViewingProfileSession(null);
                  }}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/10 hover:bg-white/20 transition-all rounded-full flex items-center justify-center text-white border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  Tutor Profile & Credentials
                </span>
                <div className="mt-4 sm:mt-6 flex items-start sm:items-center gap-4 sm:gap-5">
                  <UserAvatar
                    src={
                      canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, viewingProfileUser.id, mySessions)
                        ? viewingProfileUser.profileImage
                        : undefined
                    }
                    locked={!canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, viewingProfileUser.id, mySessions)}
                    name={viewingProfileUser.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/15"
                    fallbackClassName="bg-white/10 text-indigo-200"
                    textClassName="text-xl sm:text-2xl font-black"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-snug break-words">{viewingProfileUser.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 break-words leading-snug">{viewingProfileUser.university || 'Verified Academic Institution'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-10 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
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

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
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

                {viewingProfileUser.badges && viewingProfileUser.badges.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Unlocked Badges</span>
                    <BadgeDisplay badgeIds={viewingProfileUser.badges} role="tutor" interactive={true} />
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professional Bio</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-medium font-sans">
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

              <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 dark:bg-slate-950 shrink-0">
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
                ) : viewingProfileSession.status === 'active' || viewingProfileSession.status === 'scheduled' ? (
                  <div className="w-full sm:flex-1 text-center text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 uppercase tracking-widest py-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Tuition Active & Confirmed</span>
                  </div>
                ) : (
                  <div className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                    Awaiting response from {viewingProfileUser.name}
                  </div>
                )}
                
                {viewingProfileUser && (viewingProfileUser.whatsappNumber || viewingProfileUser.phone) && (
                  <a 
                    href={`https://wa.me/${(() => {
                      const num = viewingProfileUser.whatsappNumber || viewingProfileUser.phone || '';
                      let clean = num.replace(/\D/g, '');
                      if (clean.startsWith('01') && clean.length === 11) {
                        clean = '88' + clean;
                      } else if (clean.startsWith('1') && clean.length === 10) {
                        clean = '880' + clean;
                      }
                      return clean;
                    })()}?text=${encodeURIComponent(`Hello! I am ${currentUser?.name || "a student"} from EduTrack Bangladesh. I am happy that our tuition connection has been confirmed! Let's discuss our schedule and classes.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#25D366]/10"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    setSelectedRecipientId(viewingProfileUser.id);
                    handleTabChange('messages');
                    setViewingProfileUser(null);
                    setViewingProfileSession(null);
                  }}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
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
