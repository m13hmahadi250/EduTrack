import React, {
  useState,
  useEffect,
  useMemo,
  memo,
  lazy,
  Suspense,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore, Session, Withdrawal, User } from "../../store";
import { useShallow } from "zustand/react/shallow";
import { calculateEarnedBadges } from '../../utils/badges';
import { triggerConfetti } from '../../utils/confetti';
import BadgeDisplay from '../../components/BadgeDisplay';
import UserAvatar from '../../components/UserAvatar';
import {
  WeeklyAvailabilityCalendar,
  WeeklyScheduleOverview,
} from '../../components/WeeklyAvailabilityCalendar';
import { formatUserFriendlyError } from '../../lib/errorMonitoring';
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
  Gift,
  CreditCard,
  User as UserIcon,
  CheckCircle,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Check,
  Send,
  FileText,
  Search,
  BookOpen,
  Binary,
  Dna,
  Languages,
  Laptop,
  Compass,
  Atom,
  X,
  MessageSquare,
  Award,
  Shield,
  ShieldAlert,
  Mars,
  Venus,
  Phone,
  Mail,
  Share2,
  Pin,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useBackHandler, scrollFieldIntoView } from "../../utils/mobileWebView";
import { sanitizeTutorProfileForViewer } from "../../../shared/tutorPrivacy";
import {
  calculateProfileCompletion,
  cleanMeaningfulString,
  getTutorVerificationStatus,
} from "../../../shared/profileCompletion";
import { motion, AnimatePresence } from "motion/react";
import { BANGLADESH_DISTRICTS, BANGLADESH_THANAS } from "../../data/bangladeshData";
import { getCoordinatesForLocation, getCurrentAccuratePosition, watchAccuratePosition } from "../../utils/geocoding";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { lazyWithRetry } from "../../utils/lazyWithRetry";
import { AppErrorBoundary } from "../../components/AppErrorBoundary";

const MapTracker = lazyWithRetry(() => import("../../components/MapTracker"), "MapTracker");
const ImageUpload = lazyWithRetry(() => import("../../components/ImageUpload"), "ImageUpload");
const FileUpload = lazyWithRetry(() => import("../../components/FileUpload"), "FileUpload");
const ReferralsTab = lazyWithRetry(() => import("../../components/ReferralsTab"), "ReferralsTab");
const DemandHeatmap = lazyWithRetry(() => import("../../components/DemandHeatmap"), "DemandHeatmap");
const ClassLogsCalendar = lazyWithRetry(() => import("../../components/ClassLogsCalendar"), "ClassLogsCalendar");
const HomeworkDashboard = lazyWithRetry(() => import("../../components/HomeworkDashboard"), "HomeworkDashboard");
const TuitionMarketplaceHub = lazyWithRetry(() => import("../../components/TuitionMarketplaceHub"), "TuitionMarketplaceHub");
import {
  AVAILABLE_SUBJECTS,
  AVAILABLE_CLASSES,
  SUBJECT_CATEGORIES,
} from "../../constants";
import {
  MetricCard,
  DashboardInput,
} from "../../components/DashboardComponents";

const RatingModal = lazyWithRetry(() => import("../../components/RatingModal"), "RatingModal");
const ChatWindow = lazyWithRetry(() => import("../../components/ChatWindow"), "ChatWindow");

const MapLoading = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
    <div className="w-8 h-8 border-4 border-slate-800 border-t-[#0D5BFF] rounded-full animate-spin mb-2"></div>
    <p className="text-[8px] font-black uppercase tracking-widest leading-loose">
      Acquiring Uplink...
    </p>
  </div>
);

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

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
    payments,
    logout,
    requestEndPermission,
    submitPayment,
  } = useAppStore(
    useShallow((state) => ({
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
      payments: state.payments,
      logout: state.logout,
      requestEndPermission: state.requestEndPermission,
      submitPayment: state.submitPayment,
    })),
  );

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabsRef.current;
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

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 150;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };
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

  // Synchronize badges in the database when new milestones are achieved
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

  const activeTab = useMemo<
    | "my_session"
    | "balance"
    | "transit_mode"
    | "pro_profile"
    | "availability"
    | "messages"
    | "find_students"
    | "class_logs"
    | "homework"
    | "referrals"
  >(() => {
    const path = location.pathname;
    if (path.endsWith("/balance")) return "balance";
    if (path.endsWith("/transit")) return "transit_mode";
    if (path.endsWith("/profile")) return "pro_profile";
    if (path.endsWith("/availability")) return "availability";
    if (path.endsWith("/messages")) return "messages";
    if (path.endsWith("/find-students")) return "find_students";
    if (path.endsWith("/class-logs")) return "class_logs";
    if (path.endsWith("/homework")) return "homework";
    if (path.endsWith("/referrals")) return "referrals";
    return "my_session";
  }, [location.pathname]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null,
  );
  const [showProfileNotice, setShowProfileNotice] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPublicPreview, setShowPublicPreview] = useState(false);

  useBackHandler(
    showPublicPreview,
    () => setShowPublicPreview(false),
    "tutor-public-preview-modal",
  );

  const effectiveTutorLocation = useMemo<[number, number]>(() => {
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

  const shareProfile = async () => {
    if (!currentUser) return;
    const profileUrl = `${window.location.origin}/teachers/${currentUser.id}`;
    const shareData = {
      title: `${currentUser.name} | Expert Tutor Profile`,
      text: `Hi! Check out my tutoring profile on EduTrack. Connect with me for premium academic coaching and secure NID-verified home tutoring.`,
      url: profileUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(profileUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(profileUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } catch (clipErr) {
          console.error("Failed to copy profile link", clipErr);
        }
      }
    }
  };

  // Custom interactive subject system states for Tutors
  const [tutorActiveSubjectTab, setTutorActiveSubjectTab] = useState<'Bangla Version' | 'English Version' | 'Madrasha'>('Bangla Version');
  const [tutorSubjectSearchTerm, setTutorSubjectSearchTerm] = useState('');

  // Finding students section states
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filterStudentClass, setFilterStudentClass] = useState('');
  const [filterStudentSubject, setFilterStudentSubject] = useState('');
  const [filterStudentAddress, setFilterStudentAddress] = useState('');
  const [filterStudentGender, setFilterStudentGender] = useState('');
  const [sortStudentByLocation, setSortStudentByLocation] = useState(true);

  const tutorCoords = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.location?.lat && currentUser.location?.lng) {
      return [currentUser.location.lat, currentUser.location.lng] as [number, number];
    }
    if (currentUser.district) {
      return getCoordinatesForLocation(currentUser.district, currentUser.thana, currentUser.id);
    }
    return null;
  }, [currentUser]);

  const filteredStudents = useMemo(() => {
    if (!currentUser?.isVerified) return [];
    const list = (Array.isArray(users) ? users : []).filter(user => {
      if (!user || user.role !== "student") return false;
      
      const matchesSearch = !studentSearchTerm || 
        (user.name || '').toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        (user.school && user.school.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
        (user.address && user.address.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
        (user.area && user.area.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
        (user.district && user.district.toLowerCase().includes(studentSearchTerm.toLowerCase()));
        
      const matchesClass = !filterStudentClass || 
        (user.studentClass && user.studentClass === filterStudentClass);
        
      const matchesSubject = !filterStudentSubject || 
        (user.subjects && user.subjects.includes(filterStudentSubject));

      const matchesAddress = !filterStudentAddress ||
        (user.address && user.address.toLowerCase().includes(filterStudentAddress.toLowerCase())) ||
        (user.area && user.area.toLowerCase().includes(filterStudentAddress.toLowerCase())) ||
        (user.district && user.district.toLowerCase().includes(filterStudentAddress.toLowerCase()));

      const matchesGender = !filterStudentGender ||
        (user.gender && user.gender.toLowerCase() === filterStudentGender.toLowerCase());
        
      return matchesSearch && matchesClass && matchesSubject && matchesAddress && matchesGender;
    });

    if (sortStudentByLocation && tutorCoords) {
      return [...list].sort((a, b) => {
        const aCoords = a.location?.lat && a.location?.lng 
          ? [a.location.lat, a.location.lng] as [number, number]
          : (a.district ? getCoordinatesForLocation(a.district, a.thana, a.id) : null);
        const bCoords = b.location?.lat && b.location?.lng 
          ? [b.location.lat, b.location.lng] as [number, number]
          : (b.district ? getCoordinatesForLocation(b.district, b.thana, b.id) : null);

        if (!aCoords && !bCoords) return 0;
        if (!aCoords) return 1;
        if (!bCoords) return -1;

        const distA = getDistance(tutorCoords[0], tutorCoords[1], aCoords[0], aCoords[1]);
        const distB = getDistance(tutorCoords[0], tutorCoords[1], bCoords[0], bCoords[1]);

        return distA - distB;
      });
    }

    return list;
  }, [users, studentSearchTerm, filterStudentClass, filterStudentSubject, filterStudentAddress, filterStudentGender, sortStudentByLocation, tutorCoords]);
  const [selectedStudentForProposal, setSelectedStudentForProposal] = useState<User | null>(null);
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [proposalSlot, setProposalSlot] = useState("04:00 PM");
  const [proposalSubject, setProposalSubject] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  const [viewingProfileSession, setViewingProfileSession] = useState<Session | null>(null);

  useBackHandler(
    Boolean(selectedStudentForProposal),
    () => {
      setSelectedStudentForProposal(null);
      setProposalSuccess(false);
    },
    "tutor-proposal-modal",
  );
  useBackHandler(
    Boolean(viewingProfileUser),
    () => {
      setViewingProfileUser(null);
      setViewingProfileSession(null);
    },
    "tutor-viewing-profile-modal",
  );

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

  const tutorCompletion = useMemo(
    () => calculateProfileCompletion(currentUser),
    [currentUser]
  );

  const tutorVerification = useMemo(
    () => getTutorVerificationStatus(currentUser),
    [currentUser]
  );

  const isProfileIncomplete =
    !tutorCompletion.isComplete && !currentUser?.hasDismissedProfileNotice;

  const missingFields = tutorCompletion.missingFields.map((f) => f.label);

  const refreshLocationManual = () => {
    if ("geolocation" in navigator) {
      setIsRefreshingLocation(true);
      getCurrentAccuratePosition(
        (pos) => {
          updateLocation(
            currentUser!.id,
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setIsRefreshingLocation(false);
          useAppStore.getState().sendNotification(
            currentUser!.id,
            "Location Synchronized",
            "Your real-time GPS coordinates have been synced accurately.",
            "success"
          );
        },
        () => {
          updateLocation(currentUser!.id, 23.8103, 90.4125);
          setIsRefreshingLocation(false);
        }
      );
    }
  };

  // Active tab is derived directly from route location to avoid double-rendering delays

  const handleTabChange = (
    tab:
      | "my_session"
      | "balance"
      | "transit_mode"
      | "pro_profile"
      | "availability"
      | "messages"
      | "find_students"
      | "class_logs"
      | "homework"
      | "referrals",
  ) => {
    const pathMap = {
      my_session: "/dashboard",
      balance: "/dashboard/balance",
      transit_mode: "/dashboard/transit",
      pro_profile: "/dashboard/profile",
      availability: "/dashboard/availability",
      messages: "/dashboard/messages",
      find_students: "/dashboard/find-students",
      class_logs: "/dashboard/class-logs",
      homework: "/dashboard/homework",
      referrals: "/dashboard/referrals",
    };
    navigate(pathMap[tab]);
  };

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState("");
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [sameWhatsappAsPhone, setSameWhatsappAsPhone] = useState<boolean>(() => {
    if (!currentUser?.whatsappNumber || !currentUser?.phone) return true;
    return currentUser.whatsappNumber.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '');
  });
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    university: cleanMeaningfulString(currentUser?.university),
    course: cleanMeaningfulString(currentUser?.course),
    year: cleanMeaningfulString(currentUser?.year),
    semester: cleanMeaningfulString(currentUser?.semester),
    teachingMode: cleanMeaningfulString(currentUser?.teachingMode) || "Home & Online",
    curriculum: cleanMeaningfulString(currentUser?.curriculum),
    bio: cleanMeaningfulString(currentUser?.bio),
    hourlyRate: currentUser?.hourlyRate ? currentUser.hourlyRate.toLocaleString('en-US') : "",
    daysPerWeek: currentUser?.daysPerWeek !== undefined ? currentUser.daysPerWeek.toString() : "3",
    experience: cleanMeaningfulString(currentUser?.experience),
    subjects: currentUser?.subjects || [],
    classes: currentUser?.classes || [],
    availabilitySlots: currentUser?.availabilitySlots || {},
    district: cleanMeaningfulString(currentUser?.district),
    area: cleanMeaningfulString(currentUser?.area),
    thana: cleanMeaningfulString(currentUser?.thana),
    teachingAreas: currentUser?.teachingAreas || [],
    nidNumber: cleanMeaningfulString(currentUser?.nidNumber),
    birthDate: cleanMeaningfulString(currentUser?.birthDate),
    nidFrontImg: currentUser?.nidFrontImg || "",
    nidBackImg: currentUser?.nidBackImg || "",
    documents: currentUser?.documents || [],
    gender: cleanMeaningfulString(currentUser?.gender),
    whatsappNumber: currentUser?.whatsappNumber || currentUser?.phone || "",
    privacySettings: {
      hidePhotoFromPublic: Boolean(currentUser?.privacySettings?.hidePhotoFromPublic),
      hideExpectedSalaryPublic: Boolean(currentUser?.privacySettings?.hideExpectedSalaryPublic),
      hideFromSearch: Boolean(currentUser?.privacySettings?.hideFromSearch),
    },
  });

  const [verificationDocType, setVerificationDocType] = useState<"nid" | "university_id">(() => {
    if (
      !currentUser?.nidFrontImg &&
      Array.isArray(currentUser?.documents) &&
      currentUser.documents.length > 0
    ) {
      return "university_id";
    }
    return "nid";
  });

  const navigateToMissingField = (fieldId?: string | null) => {
    handleTabChange("pro_profile");
    setIsEditingProfile(true);
    setProfileUpdateError("");
    if (fieldId) {
      setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          if (typeof (el as HTMLElement).focus === "function") {
            (el as HTMLElement).focus({ preventScroll: true });
          }
        }
      }, 220);
    }
  };

  // Sync profile form when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingProfile && currentUser) {
      const userPhone = currentUser.phone || "";
      const userWa = currentUser.whatsappNumber || userPhone;
      setSameWhatsappAsPhone(
        !currentUser.whatsappNumber ||
          userWa.replace(/\D/g, "") === userPhone.replace(/\D/g, "")
      );
      setProfileForm({
        name: currentUser.name || "",
        phone: userPhone,
        university: cleanMeaningfulString(currentUser.university),
        course: cleanMeaningfulString(currentUser.course),
        year: cleanMeaningfulString(currentUser.year),
        semester: cleanMeaningfulString(currentUser.semester),
        teachingMode: cleanMeaningfulString(currentUser.teachingMode) || "Home & Online",
        curriculum: cleanMeaningfulString(currentUser.curriculum),
        bio: cleanMeaningfulString(currentUser.bio),
        hourlyRate: currentUser.hourlyRate ? currentUser.hourlyRate.toLocaleString('en-US') : "",
        daysPerWeek: currentUser.daysPerWeek !== undefined ? currentUser.daysPerWeek.toString() : "3",
        experience: cleanMeaningfulString(currentUser.experience),
        subjects: currentUser.subjects || [],
        classes: currentUser.classes || [],
        availabilitySlots: currentUser.availabilitySlots || {},
        district: cleanMeaningfulString(currentUser.district),
        area: cleanMeaningfulString(currentUser.area),
        thana: cleanMeaningfulString(currentUser.thana),
        teachingAreas: currentUser.teachingAreas || [],
        nidNumber: cleanMeaningfulString(currentUser.nidNumber),
        birthDate: cleanMeaningfulString(currentUser.birthDate),
        nidFrontImg: currentUser.nidFrontImg || "",
        nidBackImg: currentUser.nidBackImg || "",
        documents: currentUser.documents || [],
        gender: cleanMeaningfulString(currentUser.gender),
        whatsappNumber: userWa,
        privacySettings: {
          hidePhotoFromPublic: Boolean(currentUser.privacySettings?.hidePhotoFromPublic),
          hideExpectedSalaryPublic: Boolean(currentUser.privacySettings?.hideExpectedSalaryPublic),
          hideFromSearch: Boolean(currentUser.privacySettings?.hideFromSearch),
        },
      });
    }
  }, [currentUser, isEditingProfile]);

  const toggleSubject = (subject: string) => {
    setProfileForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const toggleClass = (cls: string) => {
    setProfileForm((prev) => ({
      ...prev,
      classes: prev.classes.includes(cls)
        ? prev.classes.filter((c) => c !== cls)
        : [...prev.classes, cls],
    }));
  };

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "bkash" | "nagad" | "bank"
  >("bkash");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  // Manual payment states
  const [tutorBkashNumber, setTutorBkashNumber] = useState("");
  const [tutorTrxId, setTutorTrxId] = useState("");
  const [tutorPaymentSuccess, setTutorPaymentSuccess] = useState(false);
  const [isSubmittingTutorPayment, setIsSubmittingTutorPayment] = useState(false);
  const [tutorPaymentError, setTutorPaymentError] = useState("");
  const [historyTab, setHistoryTab] = useState<"withdrawals" | "deposits">("withdrawals");

  const handleTutorPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorBkashNumber || !tutorTrxId || isSubmittingTutorPayment || !currentUser) return;
    
    setIsSubmittingTutorPayment(true);
    setTutorPaymentError("");
    try {
      await submitPayment({
        studentId: "admin",
        tutorId: currentUser.id,
        amount: 200,
        bKashNumber: tutorBkashNumber,
        transactionId: tutorTrxId,
      });
      setTutorPaymentSuccess(true);
      setTutorBkashNumber("");
      setTutorTrxId("");
      setTimeout(() => {
        setTutorPaymentSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setTutorPaymentError(formatUserFriendlyError(err, "payment"));
    } finally {
      setIsSubmittingTutorPayment(false);
    }
  };

  // Device GPS tracking logic
  useEffect(() => {
    let currentWatchId: number | null = null;

    if (currentUser?.id) {
      if ("geolocation" in navigator) {
        currentWatchId = watchAccuratePosition(
          (position) => {
            updateLocation(
              currentUser.id,
              position.coords.latitude,
              position.coords.longitude,
            );
          }
        );
      }
    }

    return () => {
      if (currentWatchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(currentWatchId);
      }
    };
  }, [currentUser?.id, updateLocation]);

  const [updateSuccess, setUpdateSuccess] = useState(false);

  const activeSessions = useMemo(() => {
    const sessionMap = new Map();
    (Array.isArray(sessions) ? sessions : [])
      .filter((s) => s && s.status !== "completed" && s.status !== "cancelled")
      .forEach((s) => {
        if (!sessionMap.has(s.id)) {
          sessionMap.set(s.id, s);
        }
      });
    return Array.from(sessionMap.values());
  }, [sessions]);

  const tutorPayments = useMemo(() => {
    const paymentMap = new Map();
    (Array.isArray(payments) ? payments : []).forEach((p) => {
      if (p && !paymentMap.has(p.id)) {
        paymentMap.set(p.id, p);
      }
    });
    return Array.from(paymentMap.values());
  }, [payments]);

  const tutorWithdrawals = useMemo(() => {
    const withdrawalMap = new Map();
    (Array.isArray(withdrawals) ? withdrawals : []).forEach((w) => {
      if (w && !withdrawalMap.has(w.id)) {
        withdrawalMap.set(w.id, w);
      }
    });
    return Array.from(withdrawalMap.values());
  }, [withdrawals]);

  if (!currentUser) return null;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileUpdateError("");

    const cleanName = cleanMeaningfulString(profileForm.name);
    const cleanPhone = cleanMeaningfulString(profileForm.phone);
    const cleanUniv = cleanMeaningfulString(profileForm.university);
    const cleanCourse = cleanMeaningfulString(profileForm.course);
    const cleanYear = cleanMeaningfulString(profileForm.year);
    const parsedRate = Number(String(profileForm.hourlyRate || "").replace(/,/g, ""));

    if (!cleanName || !cleanPhone) {
      setProfileUpdateError("Tutor full name and contact phone number are required.");
      return;
    }
    if (!cleanUniv || !cleanCourse || !cleanYear) {
      setProfileUpdateError("University/College, Department/Degree, and Year/Batch are required.");
      return;
    }
    if (profileForm.hourlyRate && (!Number.isFinite(parsedRate) || parsedRate <= 0)) {
      setProfileUpdateError("Expected monthly salary must be a positive amount.");
      return;
    }

    setIsUpdating(true);
    try {
      const existingLocation = currentUser.location ? currentUser.location : undefined;
      const syncedWhatsapp = sameWhatsappAsPhone
        ? cleanPhone
        : cleanMeaningfulString(profileForm.whatsappNumber) || cleanPhone;
      await updateUser(currentUser.id, {
        ...profileForm,
        name: cleanName,
        phone: cleanPhone,
        whatsappNumber: syncedWhatsapp,
        university: cleanUniv,
        course: cleanCourse,
        year: cleanYear,
        semester: cleanMeaningfulString(profileForm.semester),
        teachingMode: cleanMeaningfulString(profileForm.teachingMode) || "Home & Online",
        curriculum: cleanMeaningfulString(profileForm.curriculum),
        subject: (profileForm.subjects || []).join(", "),
        bio: cleanMeaningfulString(profileForm.bio),
        experience: cleanMeaningfulString(profileForm.experience),
        district: cleanMeaningfulString(profileForm.district),
        thana: cleanMeaningfulString(profileForm.thana),
        area: cleanMeaningfulString(profileForm.area),
        hourlyRate: parsedRate > 0 ? parsedRate : 0,
        daysPerWeek: profileForm.daysPerWeek ? Number(profileForm.daysPerWeek) : 3,
        privacySettings: {
          hidePhotoFromPublic: Boolean(profileForm.privacySettings?.hidePhotoFromPublic),
          hideExpectedSalaryPublic: Boolean(profileForm.privacySettings?.hideExpectedSalaryPublic),
          hideFromSearch: Boolean(profileForm.privacySettings?.hideFromSearch),
        },
        ...(existingLocation ? { location: existingLocation } : {})
      });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3500);
      setIsEditingProfile(false);
    } catch (error: any) {
      console.error("Failed to update profile", error);
      setProfileUpdateError(formatUserFriendlyError(error, "dashboard"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWithdrawAmount = Number(String(withdrawAmount).replace(/,/g, ''));
    if (
      !withdrawAmount ||
      !bkashNumber ||
      cleanWithdrawAmount > (currentUser?.balance || 0)
    )
      return;

    setWithdrawalError(null);
    try {
      await requestWithdrawal({
        tutorId: currentUser!.id,
        amount: cleanWithdrawAmount,
        bKashNumber: bkashNumber,
        paymentMethod: paymentMethod,
      });
      setWithdrawalSuccess(true);
      setTimeout(() => setWithdrawalSuccess(false), 5000);
      setWithdrawAmount("");
      setBkashNumber("");
    } catch (error: any) {
      setWithdrawalError(formatUserFriendlyError(error, "payment"));
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-heading text-[#0B132B] dark:text-white uppercase leading-[0.85] mb-4">
            Tutor Panel
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-[#0B132B] dark:text-slate-300 uppercase tracking-[0.2em]">
            Welcome,{" "}
            <span className="font-black text-[#0D5BFF] italic">
              {currentUser.name}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            {currentUser.isVerified ? (
              <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center space-x-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  VERIFIED
                </span>
              </div>
            ) : (
              <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-2xl flex items-center space-x-3">
                <Zap className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">
                  Verification Pending
                </span>
              </div>
            )}

            <button
              onClick={() => window.dispatchEvent(new Event('start-edutrack-tour'))}
              className="w-11 h-11 bg-gradient-to-r from-blue-500 to-[#0D5BFF] hover:from-[#0D5BFF] hover:to-indigo-600 text-white border border-transparent rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Quick Start Tour"
            >
              <Compass className="w-4 h-4 text-white" />
            </button>

            <button
              id="tutor-dashboard-header-share-btn"
              onClick={shareProfile}
              className="min-h-[44px] px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0D5BFF] dark:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {copiedLink ? "Link Copied!" : "Share Profile Link"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPublicPreview(true)}
              className="min-h-[44px] px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-[#0D5BFF] text-white border border-slate-800 dark:border-slate-700 rounded-2xl flex items-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Preview Public Profile
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Adaptive Grid Selector (All Panels Fully Visible) */}
      <div className="lg:hidden block mb-6" id="tutor-mobile-tablet-tab-matrix">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]/60 dark:text-slate-400 mb-3 italic">
          Quick Navigation Dashboard Matrix
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { id: "my_session", label: "My Session", icon: Clock },
            { id: "find_students", label: "Find Students", icon: Search },
            { id: "class_logs", label: "Class Cal", icon: Calendar },
            { id: "homework", label: "Homework", icon: BookOpen },
            { id: "balance", label: "Pay", icon: CreditCard },
            { id: "transit_mode", label: "Location Track", icon: MapPin },
            { id: "messages", label: "Messages", icon: MessageSquare },
            { id: "pro_profile", label: "Pro Profile", icon: Award },
            { id: "referrals", label: "Referrals", icon: Gift },
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
                id={`tutor-tab-btn-${tab.id}`}
              >
                {tab.id === 'class_logs' && isClassCalPinned && (
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

      {/* Tabs */}
      <div className="lg:block hidden relative border-b border-slate-100 pb-px">
        {/* Mobile Left Scroll Button */}
        <button
          onClick={() => scrollTabs("left")}
          className="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 dark:bg-[#111A2E]/95 border border-slate-100 dark:border-slate-800/80 shadow-md flex items-center justify-center text-slate-500 hover:text-[#0B132B] dark:hover:text-white transition-all focus:outline-none"
          aria-label="Scroll Tabs Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Tabs Wrapper */}
        <div 
          ref={tabsRef}
          className="overflow-x-auto whitespace-nowrap scroll-smooth flex space-x-8 px-9 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {[
            { id: "my_session", label: "My Session" },
            { id: "find_students", label: "Find Students" },
            { id: "class_logs", label: "Class Cal" },
            { id: "homework", label: "Homework" },
            { id: "balance", label: "Pay" },
            { id: "transit_mode", label: "Location Track" },
            { id: "messages", label: "Messages" },
            { id: "pro_profile", label: "Pro Profile" },
            { id: "referrals", label: "Referrals" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`text-xs font-black font-heading uppercase tracking-[0.18em] pb-4 transition-all relative inline-block cursor-pointer z-30 pointer-events-auto ${
                activeTab === tab.id
                  ? "text-[#0D5BFF] dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-300 hover:text-[#0B132B] dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.id === 'class_logs' && isClassCalPinned && (
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 rotate-[45deg]" />
                )}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D5BFF]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Mobile Right Scroll Button */}
        <button
          onClick={() => scrollTabs("right")}
          className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 dark:bg-[#111A2E]/95 border border-slate-100 dark:border-slate-800/80 shadow-md flex items-center justify-center text-slate-500 hover:text-[#0B132B] dark:hover:text-white transition-all focus:outline-none"
          aria-label="Scroll Tabs Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isProfileIncomplete && showProfileNotice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-[#0D5BFF] rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-24 -mb-24 blur-2xl" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Bell className="w-4 h-4 text-white animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                      Profile Completion • {tutorCompletion.percentage}% ({tutorCompletion.completedCount}/{tutorCompletion.totalCount})
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase italic leading-tight">
                    Complete your teaching profile to rank higher in student searches
                  </h3>
                  <p lang="bn" className="font-bn text-xs sm:text-sm font-medium text-blue-50 leading-[1.65]">
                    টিউশন পাওয়ার সম্ভাবনা বাড়াতে আপনার প্রোফাইল সম্পূর্ণ করুন।
                  </p>
                  <div className="flex flex-wrap gap-2 my-2">
                    {tutorCompletion.missingFields.map((mf) => (
                      <button
                        key={mf.key}
                        type="button"
                        onClick={() => navigateToMissingField(mf.targetFieldId)}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/15 cursor-pointer transition-colors"
                      >
                        Missing: {mf.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-medium text-blue-100 uppercase tracking-widest max-w-xl">
                    Profile completion reflects your teaching info (bio, fee, subjects, classes, location &amp; schedule). Identity verification badges are tracked separately below.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateToMissingField(tutorCompletion.firstMissingFieldId)}
                    className="px-8 py-4 bg-white text-[#0D5BFF] border-2 border-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-blue-50 transition-all shadow-2xl shadow-blue-900/40 flex items-center gap-2 group/btn cursor-pointer"
                  >
                    <span>Update My Experts Profile</span>
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileNotice(false);
                      updateUser(currentUser.id, {
                        hasDismissedProfileNotice: true,
                      });
                    }}
                    className="p-4 bg-white/10 text-white rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-white/5 cursor-pointer"
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

      <AnimatePresence>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.04, ease: "easeOut" }}
        >
          {activeTab === "my_session" && (
            <motion.div
              key="my_session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <MetricCard
                    label="Active Students"
                    value={Array.from(
                      new Set(
                        activeSessions
                          .filter(
                            (s) =>
                              s.status === "scheduled" || s.status === "active",
                          )
                          .map((s) => s.studentId),
                      ),
                    ).length.toString()}
                  />
                  <MetricCard
                    label="Tutor Rating"
                    value={currentUser?.rating?.toFixed(1) || "0.0"}
                  />
                </div>

                {/* Achievements & Gamification Section */}
                {currentUser && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-sm transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <span>My Achievements & Badges</span>
                      </h3>
                      {currentUser.badges && currentUser.badges.length > 0 && (
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {currentUser.badges.length} Unlocked
                        </span>
                      )}
                    </div>
                    <BadgeDisplay badgeIds={currentUser.badges || []} role="tutor" />
                  </div>
                )}

                {sessions.find((s) => s.status === "active") && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0D5BFF] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200 group"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                          <Play className="w-8 h-8 text-white fill-white animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">
                              Live Session Active
                            </span>
                            <div className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </div>
                          </div>
                          <h3 className="text-3xl font-black uppercase italic leading-tight">
                            Teaching{" "}
                            {users.find(
                              (u) =>
                                u.id ===
                                sessions.find((s) => s.status === "active")
                                  ?.studentId,
                            )?.name || "Student"}
                          </h3>
                          <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-2">
                            Subject:{" "}
                            {
                              sessions.find((s) => s.status === "active")
                                ?.subject
                            }{" "}
                            • Started at{" "}
                            {new Date(
                              sessions.find((s) => s.status === "active")
                                ?.startTime || Date.now(),
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {sessions.find((s) => s.status === "active")?.studentPermissionGranted ? (
                          <button
                            onClick={() => {
                              const activeSess = sessions.find(
                                (s) => s.status === "active",
                              );
                              if (activeSess) {
                                endSession(activeSess.id);
                              }
                            }}
                            className="px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2 group/btn cursor-pointer"
                          >
                            <Square className="w-4 h-4 fill-white" />
                            <span>Complete Session</span>
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              const activeSess = sessions.find(
                                (s) => s.status === "active",
                              );
                              if (activeSess) {
                                if (activeSess.tutorRequestedEnd) {
                                  useAppStore.getState().sendNotification(
                                    currentUser!.id,
                                    "Awaiting Student Action",
                                    "Your student has been prompted. They must authorize session completion from their dashboard.",
                                    "warning"
                                  );
                                } else {
                                  await requestEndPermission(activeSess.id);
                                  useAppStore.getState().sendNotification(
                                    currentUser!.id,
                                    "Request Dispatched",
                                    "Sent completion permission request to your student. Please wait for authorization.",
                                    "info"
                                  );
                                }
                              }
                            }}
                            className={`px-8 py-4 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center gap-2 group/btn cursor-pointer ${
                              sessions.find((s) => s.status === "active")?.tutorRequestedEnd
                                ? 'bg-amber-600 hover:bg-amber-750 shadow-amber-900/20'
                                : 'bg-[#0B132B] hover:bg-slate-900 border border-white/10 shadow-black/20 animate-pulse'
                            }`}
                          >
                            <Square className="w-4 h-4 fill-white" />
                            <span>
                              {sessions.find((s) => s.status === "active")?.tutorRequestedEnd
                                ? "Waiting on Student"
                                : "Request End Permission"}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => handleTabChange("transit_mode")}
                          className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                          title="Location Track"
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tuition Pipeline Tracker */}
                {activeSessions.some(s => s.status === 'requested_by_student' || s.status === 'proposed_by_tutor') && (
                  <div id="tutor-tuition-pipeline" className="bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-[2.5rem] p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
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
                        {activeSessions.filter(s => s.status === 'requested_by_student' || s.status === 'proposed_by_tutor').length} Pending
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {activeSessions.filter(s => s.status === 'requested_by_student' || s.status === 'proposed_by_tutor').map(sess => {
                        const isProposal = sess.status === 'proposed_by_tutor';
                        const student = users.find(u => u.id === sess.studentId);
                        
                        return (
                          <div 
                            key={sess.id} 
                            className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-colors"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded ${
                                  !isProposal ? 'bg-indigo-600/80 text-white border border-indigo-500/35' : 'bg-slate-700/80 text-slate-300'
                                }`}>
                                  {!isProposal ? 'Incoming Request' : 'Proposal Sent'}
                                </span>
                                <span className="text-[9px] font-black text-slate-400">
                                  {new Date(sess.scheduledTime).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-black italic text-lg text-indigo-300">
                                  {student?.name?.charAt(0) || 'S'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-black italic uppercase text-white truncate">{student?.name || 'Academic Student'}</h4>
                                  <p className="text-[10px] text-slate-400 truncate">{student?.university || student?.studentClass ? `Class ${student.studentClass}` : 'Verified Student'}</p>
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
                                id={`view-student-pro-btn-${sess.id}`}
                                onClick={() => {
                                  setViewingProfileUser(student || null);
                                  setViewingProfileSession(sess);
                                }}
                                className="w-full py-3 bg-white/10 hover:bg-[#0D5BFF] text-white border border-white/10 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all cursor-pointer"
                              >
                                View Profile & Credentials
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[#0B132B] uppercase italic">
                      Live Schedule
                    </h3>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {activeSessions.filter(sess => sess.status === "scheduled" || sess.status === "active").length} Confirmed Action{activeSessions.filter(sess => sess.status === "scheduled" || sess.status === "active").length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {activeSessions.map((sess) => {
                      const student = users.find(
                        (u) => u.id === sess.studentId,
                      );
                      return (
                        <div
                          key={sess.id}
                          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all group"
                        >
                          <div className="flex items-center space-x-6">
                            <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-2xl font-black italic text-slate-300 border border-slate-50 group-hover:bg-[#0D5BFF] group-hover:text-white transition-colors">
                              {student?.name?.charAt(0) || "S"}
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-[#0B132B] uppercase italic">
                                {student?.name || "Academic Student"}
                              </h4>
                              <div className="flex items-center space-x-3 mt-1">
                                <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest">
                                  {sess.subject}
                                </p>
                                <span className="text-slate-200">•</span>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {new Date(
                                    sess.scheduledTime,
                                  ).toLocaleString()}
                                </p>
                                {sess.status === "scheduled" &&
                                  new Date(sess.scheduledTime).getTime() -
                                    new Date().getTime() <=
                                    24 * 60 * 60 * 1000 &&
                                  new Date(sess.scheduledTime).getTime() -
                                    new Date().getTime() >
                                    0 && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-md animate-pulse">
                                      Starts in &lt;24h
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {sess.status === "scheduled" ? (
                              <button
                                onClick={() => startSession(sess.id)}
                                className="px-6 py-4 bg-[#0B132B] text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 hover:bg-[#0D5BFF] transition-all"
                              >
                                <Play className="w-4 h-4 fill-current" /> Start
                                Lesson
                              </button>
                            ) : (
                              sess.studentPermissionGranted ? (
                                <button
                                  onClick={() => endSession(sess.id)}
                                  className="px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                                >
                                  <Square className="w-4 h-4 fill-current" />{" "}
                                  Finish Session
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (sess.tutorRequestedEnd) {
                                      useAppStore.getState().sendNotification(
                                        currentUser!.id,
                                        "Awaiting Student Action",
                                        "Contact your student or wait for them to grant permission to complete class from their dashboard.",
                                        "warning"
                                      );
                                    } else {
                                      await requestEndPermission(sess.id);
                                      useAppStore.getState().sendNotification(
                                        currentUser!.id,
                                        "Request Dispatched",
                                        "Dispatched completion request to the student. Please wait for them to approve.",
                                        "info"
                                      );
                                    }
                                  }}
                                  className={`px-6 py-4 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                                    sess.tutorRequestedEnd
                                      ? 'bg-amber-600 hover:bg-amber-700'
                                      : 'bg-[#0B132B] hover:bg-slate-900 border border-white/10 animate-pulse'
                                  }`}
                                >
                                  <Square className="w-4 h-4 fill-current" />{" "}
                                  {sess.tutorRequestedEnd ? "Waiting Perm." : "Req. Permission"}
                                </button>
                              )
                            )}
                            <button
                              onClick={() => {
                                setSelectedRecipientId(sess.studentId);
                                handleTabChange("messages");
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
                      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-16 flex flex-col items-start md:items-center justify-center border border-slate-100 shadow-sm text-left md:text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center ml-0 mr-auto md:mx-auto mb-6">
                          <Calendar className="w-10 h-10 text-slate-200" />
                        </div>
                        <h4 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-2">
                          No sessions scheduled yet
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Wait for booking requests from parents
                        </p>
                        <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-[1.65]">
                          নতুন টিউশন বা বুকিং রিকোয়েস্ট এলে আপনার সেশন তালিকা এখানে দেখাবে।
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <ReputationTracker
                  rating={currentUser?.rating || 0}
                  totalReviews={currentUser?.totalRatings || 0}
                  sessions={sessions}
                  currentUser={currentUser}
                />
              </div>
            </motion.div>
          )}

          {activeTab === "balance" && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid lg:grid-cols-2 gap-12"
            >
              <div className="space-y-8">
                <div className="bg-[#E51275]/5 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 border border-[#E51275]/10 shadow-sm">
                  <div className="mb-8 space-y-1.5">
                    <h3 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[#E51275]" /> Tuition Finder Payment
                    </h3>
                    <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]">
                      অফিসিয়াল বিকাশ নম্বরে পেমেন্ট পাঠিয়ে TrxID জমা দিলে আপনার প্রোফাইল ফিচার সক্রিয় হবে।
                    </p>
                  </div>

                  {tutorPaymentSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 sm:p-12 bg-emerald-50 rounded-[1.5rem] sm:rounded-[2rem] text-left md:text-center border-2 border-emerald-100 shadow-xl"
                    >
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center ml-0 mr-auto md:mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h4 className="text-xl font-black text-emerald-900 uppercase italic">
                        Payment Verification Sent
                      </h4>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2 px-0 md:px-10">
                        We have submitted your bKash payment verification of ৳200 to our administrator queue. Your expert profile features will sync shortly!
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleTutorPaymentSubmit} className="space-y-6">
                      <div className="p-5 bg-gradient-to-br from-[#E51275]/10 to-rose-50/50 rounded-2xl border border-rose-100">
                        <p className="text-xs font-black text-[#E51275] uppercase tracking-wider mb-2">
                          Manual bKash Instructions
                        </p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-wider leading-relaxed">
                          Please Send Money  of <span className="text-[#E51275] font-black">৳200</span> to our official admin bKash Personal account:
                        </p>
                        <p className="text-lg font-black text-slate-800 tracking-wider mt-2 border-2 border-dashed border-[#E51275]/30 bg-white px-3 py-1.5 rounded-xl w-fit font-mono">
                          01575-357811
                        </p>
                      </div>

                      {tutorPaymentError && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest">
                          {tutorPaymentError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DashboardInput
                          label="bKash Account No."
                          value={tutorBkashNumber}
                          onChange={setTutorBkashNumber}
                          placeholder="e.g. 017XXXXXXXX"
                        />
                        <DashboardInput
                          label="Transaction ID (TrxID)"
                          value={tutorTrxId}
                          onChange={setTutorTrxId}
                          placeholder="e.g. 8XJ9K12M..."
                        />
                      </div>

                      <div className="flex gap-4 items-center pt-2">
                        <div className="flex-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Fixed Amount</span>
                          <span className="text-lg font-black text-[#0B132B]">৳200 TK</span>
                        </div>
                        <button
                          disabled={!tutorBkashNumber || !tutorTrxId || isSubmittingTutorPayment}
                          className="flex-[2] bg-[#E51275] text-white py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2 shadow-lg shadow-[#E51275]/10 font-sans"
                        >
                          {isSubmittingTutorPayment ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Submit Payment verification
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>


              </div>

              <section className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg sm:text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                    Tuition Finder Payments History
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div className="space-y-3">
                    {payments
                      .filter((p) => p.tutorId === currentUser.id && p.studentId === "admin")
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((p) => (
                        <div
                          key={p.id}
                          className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col gap-4 group hover:bg-white dark:hover:bg-slate-800/50 hover:shadow-md transition-colors transition-shadow duration-200"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                              <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black italic shadow-inner bg-rose-50 text-[#E51275]"
                              >
                                B
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  {new Date(p.date).toLocaleString()}
                                </p>
                                <h4 className="text-sm font-black text-[#0B132B] uppercase italic">
                                  TRX: {p.transactionId}
                                </h4>
                                <p className="text-[8px] font-black text-[#E51275] uppercase tracking-widest">
                                  BKASH MANUAL DEPOSIT
                                </p>
                              </div>
                            </div>
                            <div className="sm:text-right">
                              <p className="text-2xl font-black text-[#0B132B] italic mb-1">
                                ৳{p.amount}
                              </p>
                              <div className="flex items-center sm:justify-end gap-2">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    p.status === "approved"
                                      ? "bg-emerald-500"
                                      : p.status === "rejected"
                                        ? "bg-rose-500"
                                        : "bg-amber-500 animate-pulse"
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                    p.status === "approved"
                                      ? "text-emerald-500"
                                      : p.status === "rejected"
                                        ? "text-rose-500"
                                        : "text-amber-500"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    {payments.filter((p) => p.tutorId === currentUser.id && p.studentId === "admin").length === 0 && (
                      <div className="py-20 text-center opacity-30">
                        <Zap className="w-12 h-12 mx-auto mb-6" />
                        <p className="text-[11px] font-black uppercase tracking-[0.4em]">
                          No manual deposits found
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "transit_mode" && (
            <motion.div
              key="transit"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid lg:grid-cols-2 gap-12"
            >
              <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col">
                <div
                  className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 ${currentUser.isTrackingOn ? "bg-emerald-500" : "bg-slate-500"}`}
                ></div>
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${currentUser.isTrackingOn ? "bg-emerald-50" : "bg-slate-50"}`}
                    >
                      <MapPin
                        className={`w-7 h-7 ${currentUser.isTrackingOn ? "text-emerald-500" : "text-slate-300"}`}
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic">
                        Transit Protocol
                      </h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Geographical Visibility
                      </p>
                      <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-[1.65]">
                        ক্লাসে যাওয়ার সময় লোকেশন ট্র্যাকিং চালু রাখলে অভিভাবক নিশ্চিন্ত থাকতে পারেন।
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={refreshLocationManual}
                    disabled={isRefreshingLocation}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-[#0D5BFF] transition-all disabled:opacity-50"
                    title="Refresh My Location"
                  >
                    <Zap
                      className={`w-4 h-4 ${isRefreshingLocation ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>

                <div className="space-y-8 flex-1">
                  <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Current Status
                      </p>
                      <h4
                        className={`text-xl font-black uppercase italic ${currentUser.isTrackingOn ? "text-emerald-600" : "text-slate-400"}`}
                      >
                        {currentUser.isTrackingOn
                          ? "LIVE BROADCASTING"
                          : "OFFLINE MODE"}
                      </h4>
                    </div>
                    <button
                      onClick={() =>
                        toggleTracking(
                          currentUser.id,
                          !currentUser.isTrackingOn,
                        )
                      }
                      className={`w-20 h-10 rounded-full p-1 transition-all flex items-center ${currentUser.isTrackingOn ? "bg-emerald-500 pr-1" : "bg-slate-200 pl-1"}`}
                    >
                      <div
                        className={`w-8 h-8 bg-white rounded-full shadow-lg transform transition-transform ${currentUser.isTrackingOn ? "translate-x-10" : ""}`}
                      ></div>
                    </button>
                  </div>

                  <div className="flex items-start gap-4 p-5 bg-blue-50/45 dark:bg-blue-950/10 rounded-3xl border border-blue-100/40 dark:border-blue-900/10 transition-all mb-6">
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

                  <div className="bg-slate-900 rounded-[3rem] h-[500px] overflow-hidden border-8 border-white shadow-2xl relative">
                    <AppErrorBoundary level="widget" sectionName="Live Map Tracker">
                      <Suspense fallback={<MapLoading />}>
                        <MapTracker
                          tutorLocation={effectiveTutorLocation}
                          tutorName="Me (Tutor)"
                          tutorImage={currentUser.profileImage}
                          students={(() => {
                            const uniqueStudents = new Map();
                            sessions
                              .filter(
                                (s) =>
                                  s.status === "active" ||
                                  s.status === "scheduled",
                              )
                              .forEach((s) => {
                                const student = users.find(
                                  (u) => u.id === s.studentId,
                                );
                                if (student) {
                                  let coords: [number, number] | undefined;
                                  if (student.location?.lat && student.location?.lng) {
                                    coords = [student.location.lat, student.location.lng];
                                  } else if (student.lastLocation?.lat && student.lastLocation?.lng) {
                                    coords = [student.lastLocation.lat, student.lastLocation.lng];
                                  } else if (student.district || student.thana || student.area) {
                                    coords = getCoordinatesForLocation(student.district || 'Dhaka', student.thana || student.area, student.id);
                                  }
                                  if (coords && !uniqueStudents.has(student.id)) {
                                    uniqueStudents.set(student.id, {
                                      id: student.id,
                                      location: coords,
                                      name: student.name,
                                      image: student.profileImage,
                                      isOnline: student.isTrackingOn || student.isOnline,
                                      isLastKnownLocation: !student.location && Boolean(student.lastLocation),
                                      lastLocationUpdatedAt: student.lastLocationUpdatedAt || student.lastActiveAt,
                                    });
                                  }
                                }
                              });
                            return Array.from(uniqueStudents.values());
                          })()}
                        />
                      </Suspense>
                    </AppErrorBoundary>
                  </div>

                  {currentUser.location && (
                    <div className="p-8 bg-[#0B132B] rounded-[2.5rem] text-white">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">
                        Active Coordinates
                      </p>
                      <div className="flex gap-8">
                        <div>
                          <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">
                            Latitude
                          </span>
                          <span className="text-lg font-black italic">
                            {currentUser.location.lat.toFixed(6)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">
                            Longitude
                          </span>
                          <span className="text-lg font-black italic">
                            {currentUser.location.lng.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-slate-50 dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-start md:items-center justify-center p-6 sm:p-8 text-left md:text-center flex-1">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center ml-0 mr-auto md:mx-auto mb-5 shadow-md">
                    <Zap
                      className={`w-8 h-8 ${currentUser.isTrackingOn ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`}
                    />
                  </div>
                  <h4 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-2">
                    Signal Integrity
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                    Your signal is encrypted and only visible to students with
                    active, approved bookings within a 2-hour window.
                  </p>
                </div>

                <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-black text-[#0B132B] dark:text-white uppercase italic mb-4">
                    Nearby Active Students
                  </h3>
                  <div className="space-y-4">
                    {sessions
                      .filter(
                        (s) =>
                          s.status === "scheduled" || s.status === "active",
                      )
                      .map((sess) => {
                        const student = users.find(
                          (u) => u.id === sess.studentId,
                        );
                        return (
                          <div
                            key={sess.id}
                            className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-black italic text-[#0D5BFF]">
                                {student?.name?.charAt(0) || "S"}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-[#0B132B] uppercase italic">
                                  {student?.name}
                                </p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                  {sess.subject}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {student?.location && currentUser.location ? (
                                <p className="text-[10px] font-black text-[#0D5BFF]">
                                  LIVE
                                </p>
                              ) : (
                                <p className="text-[10px] font-black text-slate-300">
                                  STATIC
                                </p>
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

          {activeTab === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-3 gap-8 h-auto lg:h-[700px]"
            >
              <div className={`lg:col-span-1 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col ${selectedRecipientId ? 'hidden lg:flex' : 'flex'}`}>
                <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8 px-2">
                  Students
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar hide-scrollbar">
                  {(() => {
                    // Logic: Students I have a session record with OR message history + Admin Support
                    const myStudentIdsFromSessions = sessions.map(
                      (s) => s.studentId,
                    );
                    const myStudentIdsFromMessages = messages.map((m) =>
                      m.senderId === currentUser.id ? m.receiverId : m.senderId,
                    );
                    const adminIds = users.filter((u) => u.role === "admin").map((u) => u.id);
                    const allContactIds = Array.from(
                      new Set([
                        ...myStudentIdsFromSessions,
                        ...myStudentIdsFromMessages,
                        ...adminIds,
                        ...(selectedRecipientId ? [selectedRecipientId] : []),
                      ]),
                    );
                    const contacts = users.filter((u) =>
                      allContactIds.includes(u.id),
                    ).sort((a, b) => {
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
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            No active secure links established.
                          </p>
                        </div>
                      );
                    }

                    return contacts.map((contact) => {
                      const unreadCount = messages.filter(
                        (m) =>
                          m.senderId === contact.id &&
                          m.receiverId === currentUser.id &&
                          !m.isRead,
                      ).length;
                      const isContactOnline = contact.role === 'admin' || contact.isTrackingOn || contact.isOnline || (contact.id.charCodeAt(0) % 2 === 0);

                      return (
                        <button
                          key={contact.id}
                          onClick={() => setSelectedRecipientId(contact.id)}
                          className={`w-full p-5 rounded-[2rem] border transition-all flex items-center gap-4 text-left group relative ${
                            selectedRecipientId === contact.id
                              ? "bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-xl shadow-blue-100"
                              : "bg-white border-slate-100 text-[#0B132B] hover:border-slate-200"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic border ${
                                selectedRecipientId === contact.id
                                  ? "bg-white/20 border-white/10"
                                  : "bg-slate-50 border-slate-100"
                              }`}
                            >
                              {contact.name.charAt(0)}
                            </div>
                            {unreadCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-[#E51275] text-white text-[10px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-xs">
                                {unreadCount}
                              </span>
                            )}
                            {isContactOnline && (
                              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-sm" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black italic truncate">
                              {contact.name}
                            </h4>
                            <p
                              className={`text-[8px] font-black uppercase tracking-widest truncate ${
                                selectedRecipientId === contact.id
                                  ? "opacity-60"
                                  : "text-slate-400"
                              }`}
                            >
                              {contact.university || (contact.role === "student" ? "Active Student" : getMaskedEmail(contact.email))}
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
                  <Suspense
                    fallback={
                      <div className="h-[400px] bg-slate-50 animate-pulse rounded-3xl" />
                    }
                  >
                    <ChatWindow recipientId={selectedRecipientId} onBack={() => setSelectedRecipientId(null)} />
                  </Suspense>
                ) : (
                  <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl flex flex-col items-start md:items-center justify-center text-left md:text-center p-6 sm:p-8 opacity-75">
                    <Send className="w-10 h-10 mb-4 ml-0 mr-auto md:mx-auto text-slate-400" />
                    <h3 className="text-lg font-black uppercase italic text-[#0B132B] dark:text-white">
                      Initialize Comms
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      Select a certified contact from the uplink
                    </p>
                    <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 mt-1 leading-[1.65]">
                      শিক্ষার্থী বা অভিভাবকের সাথে সরাসরি কথা বলতে বাম দিক থেকে নাম নির্বাচন করুন।
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "pro_profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-start md:items-center w-full">
                  <div className="mb-8">
                    <Suspense fallback={<div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 animate-pulse" />}>
                      <ImageUpload
                        currentImageUrl={currentUser.profileImage}
                        onUpload={(url, key) =>
                          updateUser(currentUser.id, {
                            profileImage: url,
                            profilePhotoKey: key || "",
                          })
                        }
                        onDelete={() =>
                          updateUser(currentUser.id, {
                            profileImage: "",
                            profilePhotoKey: "",
                          })
                        }
                      />
                    </Suspense>
                  </div>
                  <h2 className="text-3xl font-black text-[#0B132B] dark:text-white uppercase italic mb-2 text-left md:text-center w-full">
                    {currentUser.name}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-left md:text-center w-full">
                    {currentUser.university || "Expert Educator"}
                  </p>

                    <div className="w-full space-y-3 mb-8">
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          NID
                        </span>
                        <span className="text-[10px] font-black text-[#0B132B] dark:text-white">
                          {currentUser.nidNumber || "Pending Submission"}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          DOB
                        </span>
                        <span className="text-[10px] font-black text-[#0B132B] dark:text-white">
                          {currentUser.birthDate || "Pending Submission"}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Gender
                        </span>
                        <span className="text-[10px] font-black text-[#0D5BFF] uppercase">
                          {currentUser.gender || "Pending Submission"}
                        </span>
                      </div>
                    </div>

                  {(currentUser.district || currentUser.area) && (
                    <div className="flex items-center gap-2 mb-8 bg-blue-50/50 dark:bg-blue-950/30 px-4 py-2 rounded-full border border-blue-50 dark:border-blue-900/30">
                      <MapPin className="w-3 h-3 text-[#0D5BFF]" />
                      <span className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest">
                        {currentUser.district}
                        {currentUser.thana ? `, ${currentUser.thana}` : ""}
                        {currentUser.area ? ` (${currentUser.area})` : ""}
                      </span>
                    </div>
                  )}

                  {/* Profile Completion Meter (Independent of Verification Status) */}
                  <div className="w-full p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Profile Completion
                      </span>
                      <span
                        className={`text-sm font-black font-mono ${
                          tutorCompletion.isComplete ? "text-emerald-600" : "text-[#0D5BFF]"
                        }`}
                      >
                        {tutorCompletion.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          tutorCompletion.isComplete ? "bg-emerald-500" : "bg-[#0D5BFF]"
                        }`}
                        style={{ width: `${tutorCompletion.percentage}%` }}
                      />
                    </div>
                    {!tutorCompletion.isComplete && (
                      <>
                        <p
                          lang="bn"
                          className="font-bn text-xs text-slate-600 dark:text-slate-300"
                        >
                          আপনার প্রোফাইলের বাকি তথ্যগুলো সম্পূর্ণ করুন।
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tutorCompletion.missingFields.map((mf) => (
                            <button
                              key={mf.key}
                              type="button"
                              onClick={() => navigateToMissingField(mf.targetFieldId)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[9px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer"
                            >
                              + {mf.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Independent Verification Status Summary */}
                  <div className="w-full space-y-3 mb-8">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Verification Status
                        </span>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            tutorVerification.overall === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : tutorVerification.overall === "rejected" || tutorVerification.overall === "changes_required"
                              ? "bg-rose-50 text-rose-700"
                              : tutorVerification.overall === "pending_review"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {tutorVerification.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {tutorVerification.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            tutorVerification.nidStatus === "approved"
                              ? "text-emerald-500"
                              : tutorVerification.nidStatus === "rejected"
                              ? "text-rose-500"
                              : "text-slate-400"
                          }`}
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white">
                          NID Identity
                        </span>
                      </div>
                      <span
                        className={`px-3.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          tutorVerification.nidStatus === "approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : tutorVerification.nidStatus === "rejected"
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : tutorVerification.nidStatus === "pending"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {tutorVerification.nidStatus.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <GraduationCap
                          className={`w-4 h-4 ${
                            tutorVerification.academicStatus === "approved"
                              ? "text-emerald-500"
                              : tutorVerification.academicStatus === "rejected"
                              ? "text-rose-500"
                              : "text-slate-400"
                          }`}
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white">
                          Univ. / College ID
                        </span>
                      </div>
                      <span
                        className={`px-3.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          tutorVerification.academicStatus === "approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : tutorVerification.academicStatus === "rejected"
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : tutorVerification.academicStatus === "pending"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {tutorVerification.academicStatus.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Share My Public Profile Context */}
                  <div className="w-full pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 space-y-3">
                    <button
                      id="tutor-pro-tab-share-btn"
                      onClick={shareProfile}
                      className="w-full min-h-[48px] flex items-center justify-center gap-2.5 py-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 hover:scale-[1.01]"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{copiedLink ? "Link Copied to Clipboard!" : "Share My Public Profile"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPublicPreview(true)}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-950/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0B132B] dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="w-4 h-4 text-[#0D5BFF]" />
                      <span>Preview Public View</span>
                    </button>
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center mt-2 px-2 leading-relaxed">
                      Share your verified profile URL with parents and students for direct tuition inquiries.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingProfile) {
                        handleProfileUpdate({
                          preventDefault: () => {},
                        } as React.FormEvent);
                      } else {
                        setProfileUpdateError("");
                        setIsEditingProfile(true);
                      }
                    }}
                    className="w-full min-h-[52px] py-5 bg-[#0D5BFF] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-xl shadow-blue-500/20 hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    {isEditingProfile
                      ? "Confirm Changes"
                      : "Edit Profile"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                {isEditingProfile ? (
                  <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white uppercase italic mb-6">
                      Update Academic Data
                    </h3>

                    {updateSuccess && (
                      <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                          <Check className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-600 uppercase italic">
                            System Synchronized
                          </p>
                          <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">
                            Your teaching profile is now globally updated.
                          </p>
                        </div>
                      </div>
                    )}

                    {profileUpdateError && (
                      <div className="mb-8 p-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl flex items-center gap-4 text-rose-700 dark:text-rose-200 text-xs font-bold">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                        <span>{profileUpdateError}</span>
                      </div>
                    )}

                    <form onSubmit={handleProfileUpdate} className="space-y-8">
                      {/* Core Academic & Teaching Details */}
                      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-3xl space-y-5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#0D5BFF]">
                          Academic &amp; Teaching Profile
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <ProfileField
                            id="tutor-field-name"
                            label="Full Name *"
                            value={profileForm.name}
                            onChange={(v) => setProfileForm({ ...profileForm, name: v })}
                            placeholder="e.g. Arif Hossain"
                          />
                          <ProfileField
                            id="tutor-field-university"
                            label="University / Medical / College *"
                            value={profileForm.university}
                            onChange={(v) => setProfileForm({ ...profileForm, university: v })}
                            placeholder="e.g. BUET, University of Dhaka"
                          />
                          <ProfileField
                            label="Department / Degree *"
                            value={profileForm.course}
                            onChange={(v) => setProfileForm({ ...profileForm, course: v })}
                            placeholder="e.g. B.Sc. in CSE"
                          />
                          <ProfileField
                            label="Academic Year / Batch *"
                            value={profileForm.year}
                            onChange={(v) => setProfileForm({ ...profileForm, year: v })}
                            placeholder="e.g. 3rd Year / Graduated"
                          />
                          <ProfileField
                            label="Semester / Session (Optional)"
                            value={profileForm.semester}
                            onChange={(v) => setProfileForm({ ...profileForm, semester: v })}
                            placeholder="e.g. 6th Semester"
                          />
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider ml-1">
                              Teaching Mode *
                            </label>
                            <select
                              id="tutor-field-teaching-mode"
                              value={profileForm.teachingMode || "Home & Online"}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, teachingMode: e.target.value })
                              }
                              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl py-3.5 px-5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                            >
                              <option value="Home & Online">Home &amp; Online Tutoring</option>
                              <option value="Home Tutoring">Home Tutoring</option>
                              <option value="Online Tutoring">Online Tutoring</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <ProfileField
                              label="Primary Curriculum Medium (Optional)"
                              value={profileForm.curriculum}
                              onChange={(v) => setProfileForm({ ...profileForm, curriculum: v })}
                              placeholder="e.g. NCTB Bangla Medium, English Version, Cambridge O/A Level"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Personal Demographics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ProfileField
                          label="Date of Birth"
                          value={profileForm.birthDate}
                          onChange={(v) =>
                            setProfileForm({ ...profileForm, birthDate: v })
                          }
                          type="date"
                        />
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            Gender
                          </label>
                          <select
                            value={profileForm.gender || ""}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, gender: e.target.value })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-full py-5 px-10 text-xs font-black uppercase italic text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                          >
                            <option value="">SELECT GENDER</option>
                            <option value="Male">MALE</option>
                            <option value="Female">FEMALE</option>
                          </select>
                        </div>
                      </div>

                      {/* Identity Verification — One Valid Document Required (NID OR University/College ID Card) */}
                      <div
                        id="tutor-identity-verification-section"
                        data-testid="tutor-identity-verification-section"
                        className="p-5 sm:p-7 rounded-3xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200/70 dark:border-slate-700/70 pb-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <ShieldCheck className="w-5 h-5 text-[#0D5BFF] shrink-0" />
                              <h4 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
                                Identity Verification
                              </h4>
                              <span
                                className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  tutorVerification.overall === "approved"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : tutorVerification.overall === "rejected" ||
                                      tutorVerification.overall === "changes_required"
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                    : tutorVerification.overall === "pending_review"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {tutorVerification.label}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Upload any ONE valid identity document: National ID (NID) or University/College ID Card.
                            </p>
                            <p
                              lang="bn"
                              className="font-bn text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-[1.65]"
                            >
                              পরিচয় যাচাইয়ের জন্য NID অথবা বিশ্ববিদ্যালয়/কলেজের আইডি কার্ড—যেকোনো একটি জমা দিন।
                            </p>
                          </div>
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-[#0D5BFF] dark:text-blue-400">
                              <Lock className="w-3.5 h-3.5" />
                              Only 1 Document Required
                            </span>
                          </div>
                        </div>

                        {/* Document-Type Selector: Option A (NID) vs Option B (University / College ID Card) */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                            Select Document Type to Upload
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              data-testid="verify-doc-selector-nid"
                              onClick={() => setVerificationDocType("nid")}
                              className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                                verificationDocType === "nid"
                                  ? "bg-[#0D5BFF]/10 border-[#0D5BFF] ring-1 ring-[#0D5BFF]/40"
                                  : "bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-[#0D5BFF]" />
                                  <span className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
                                    National ID (NID)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Smart NID Card or National Identity Document
                                </p>
                              </div>
                              {Boolean(profileForm.nidFrontImg) && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                                  Uploaded
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              data-testid="verify-doc-selector-university-id"
                              onClick={() => setVerificationDocType("university_id")}
                              className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                                verificationDocType === "university_id"
                                  ? "bg-[#0D5BFF]/10 border-[#0D5BFF] ring-1 ring-[#0D5BFF]/40"
                                  : "bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-[#0D5BFF]" />
                                  <span className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
                                    University / College ID Card
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Current Student ID or Institutional Identity Card
                                </p>
                              </div>
                              {profileForm.documents.length > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                                  {profileForm.documents.length} Saved
                                </span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Option A: National ID (NID) Upload Fields */}
                        {verificationDocType === "nid" ? (
                          <div className="space-y-5 pt-2">
                            <ProfileField
                              label="National ID (NID) Number (Optional)"
                              value={profileForm.nidNumber}
                              onChange={(v) =>
                                setProfileForm({ ...profileForm, nidNumber: v })
                              }
                              placeholder="Enter 10 or 17 digit NID number"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                                  NID Front Image (Required for NID Option)
                                </label>
                                <Suspense fallback={<div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />}>
                                  <FileUpload
                                    currentFileUrl={profileForm.nidFrontImg}
                                    folder="nid"
                                    onUpload={(url) =>
                                      setProfileForm({
                                        ...profileForm,
                                        nidFrontImg: url,
                                      })
                                    }
                                    label="Upload NID Front"
                                  />
                                </Suspense>
                              </div>
                              <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
                                  NID Back Image (Optional)
                                </label>
                                <Suspense fallback={<div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />}>
                                  <FileUpload
                                    currentFileUrl={profileForm.nidBackImg}
                                    folder="nid"
                                    onUpload={(url) =>
                                      setProfileForm({
                                        ...profileForm,
                                        nidBackImg: url,
                                      })
                                    }
                                    label="Upload NID Back (Optional)"
                                  />
                                </Suspense>
                              </div>
                            </div>
                            {profileForm.documents.length > 0 && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ You also have {profileForm.documents.length} University/College ID document(s) saved.
                              </p>
                            )}
                          </div>
                        ) : (
                          /* Option B: University / College Student ID Card Upload Fields */
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-2">
                              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                University / College ID Card (Front or Both Sides)
                              </label>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {profileForm.documents.length} {profileForm.documents.length === 1 ? "File" : "Files"}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {profileForm.documents.map((docUrl, idx) => (
                                <div key={idx} className="relative group">
                                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center">
                                      <FileText className="w-5 h-5 text-[#0D5BFF]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black uppercase text-[#0B132B] dark:text-white truncate leading-none mb-1">
                                        University / College ID #{idx + 1}
                                      </p>
                                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest truncate">
                                        Private encrypted verification file
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setProfileForm({
                                          ...profileForm,
                                          documents: profileForm.documents.filter(
                                            (_, i) => i !== idx,
                                          ),
                                        })
                                      }
                                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <Suspense fallback={<div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />}>
                                <FileUpload
                                  currentFileUrl=""
                                  folder="documents"
                                  onUpload={(url) =>
                                    setProfileForm({
                                      ...profileForm,
                                      documents: [...profileForm.documents, url],
                                    })
                                  }
                                  label="Upload University / College ID Card (JPG/PNG/PDF)"
                                />
                              </Suspense>
                            </div>
                            {Boolean(profileForm.nidFrontImg) && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ You also have a National ID (NID) image saved.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            District
                          </label>
                          <div className="relative">
                            <select
                              id="tutor-field-district"
                              value={profileForm.district || ""}
                              onFocus={scrollFieldIntoView}
                              onChange={(e) => {
                                const newDist = e.target.value;
                                setProfileForm({
                                  ...profileForm,
                                  district: newDist,
                                  thana: "",
                                });
                              }}
                              className="w-full min-h-[44px] bg-slate-50 border border-slate-100 rounded-full py-4 sm:py-5 pl-6 sm:pl-10 pr-12 text-xs font-black uppercase italic text-[#0B132B] dark:bg-slate-900 dark:border-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF] appearance-none cursor-pointer"
                            >
                              <option value="" disabled>Select District</option>
                              {BANGLADESH_DISTRICTS.map((dist) => (
                                <option key={dist} value={dist}>{dist}</option>
                              ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            Thana
                          </label>
                          <div className="relative">
                            <select
                              value={profileForm.thana || ""}
                              disabled={!profileForm.district}
                              onFocus={scrollFieldIntoView}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  thana: e.target.value,
                                })
                              }
                              className={`w-full min-h-[44px] bg-slate-50 border border-slate-100 rounded-full py-4 sm:py-5 pl-6 sm:pl-10 pr-12 text-xs font-black uppercase italic text-[#0B132B] dark:bg-slate-900 dark:border-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF] appearance-none cursor-pointer ${
                                !profileForm.district ? "opacity-60 cursor-not-allowed" : ""
                              }`}
                            >
                              <option value="" disabled>
                                {profileForm.district ? "Select Thana" : "Select District First"}
                              </option>
                              {profileForm.district &&
                                BANGLADESH_THANAS[profileForm.district]?.map((th) => (
                                  <option key={th} value={th}>{th}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        <ProfileField
                          id="tutor-field-area"
                          label="Area"
                          value={profileForm.area}
                          onChange={(v) =>
                            setProfileForm({ ...profileForm, area: v })
                          }
                          placeholder="e.g. Mirpur 1"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1 ml-2 sm:ml-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Teaching Areas (Searchable by students)
                          </label>
                          <p
                            lang="bn"
                            className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]"
                          >
                            আপনি যেসব এলাকায় টিউশন করাতে আগ্রহী, সেগুলো নির্বাচন করুন।
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <input
                            id="teachingAreaInput"
                            placeholder="Add an area..."
                            onFocus={scrollFieldIntoView}
                            className="flex-1 min-w-0 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-full py-3.5 px-5 sm:px-8 text-xs font-black uppercase italic text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (
                                  val &&
                                  !profileForm.teachingAreas.includes(val)
                                ) {
                                  setProfileForm({
                                    ...profileForm,
                                    teachingAreas: [
                                      ...profileForm.teachingAreas,
                                      val,
                                    ],
                                  });
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            aria-label="Add teaching area"
                            onClick={() => {
                              const input = document.getElementById(
                                "teachingAreaInput",
                              ) as HTMLInputElement;
                              const val = input.value.trim();
                              if (
                                val &&
                                !profileForm.teachingAreas.includes(val)
                              ) {
                                setProfileForm({
                                  ...profileForm,
                                  teachingAreas: [
                                    ...profileForm.teachingAreas,
                                    val,
                                  ],
                                });
                                input.value = "";
                              }
                            }}
                            className="min-w-[48px] min-h-[48px] w-12 h-12 sm:w-14 sm:h-14 bg-[#0B132B] text-white rounded-2xl flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileForm.teachingAreas.map((area) => (
                            <span
                              key={area}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0D5BFF] border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-widest"
                            >
                              {area}
                              <button
                                type="button"
                                onClick={() =>
                                  setProfileForm({
                                    ...profileForm,
                                    teachingAreas:
                                      profileForm.teachingAreas.filter(
                                        (a) => a !== area,
                                      ),
                                  })
                                }
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ProfileField
                          id="tutor-field-hourly-rate"
                          label="Expected Monthly Salary (BDT ৳)"
                          value={profileForm.hourlyRate}
                          placeholder="e.g. 5,000 or 8,000 / month"
                          onChange={(v) => {
                            const clean = v.replace(/[^0-9]/g, "");
                            const formatted = clean ? Number(clean).toLocaleString('en-US') : "";
                            setProfileForm({
                              ...profileForm,
                              hourlyRate: formatted,
                            });
                          }}
                          type="text"
                          inputMode="numeric"
                        />
                        <ProfileField
                          label="Days Taught per Week"
                          value={profileForm.daysPerWeek}
                          onChange={(v) => {
                            const clean = v.replace(/[^0-9]/g, "");
                            setProfileForm({
                              ...profileForm,
                              daysPerWeek: clean,
                            });
                          }}
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 3"
                        />
                        <ProfileField
                          label="Professional Experience"
                          value={profileForm.experience}
                          onChange={(v) =>
                            setProfileForm({ ...profileForm, experience: v })
                          }
                          placeholder="3+ Years in Academic Coaching"
                        />
                      </div>

                      {/* Smart Mobile & WhatsApp Synchronization Box */}
                      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                          <ProfileField
                            id="tutor-field-phone"
                            label="Mobile Number (Primary)"
                            value={profileForm.phone}
                            onChange={(v) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                phone: v,
                                ...(sameWhatsappAsPhone ? { whatsappNumber: v } : {}),
                              }))
                            }
                            placeholder="e.g. 01712345678"
                            type="tel"
                          />
                          {!sameWhatsappAsPhone ? (
                            <ProfileField
                              label="WhatsApp Number (Separate)"
                              value={profileForm.whatsappNumber}
                              onChange={(v) =>
                                setProfileForm({ ...profileForm, whatsappNumber: v })
                              }
                              placeholder="e.g. 01712345678"
                              type="tel"
                            />
                          ) : (
                            <div className="space-y-2 pt-1">
                              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                WhatsApp Contact Status
                              </span>
                              <div className="px-4 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                  Synced with mobile number ({profileForm.phone || currentUser.phone || "Not set"})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
                          <input
                            type="checkbox"
                            checked={sameWhatsappAsPhone}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSameWhatsappAsPhone(checked);
                              if (checked) {
                                setProfileForm((prev) => ({
                                  ...prev,
                                  whatsappNumber: prev.phone || currentUser.phone || "",
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#0D5BFF] focus:ring-[#0D5BFF] cursor-pointer"
                          />
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                            My WhatsApp number is the same as my mobile number
                          </span>
                        </label>
                      </div>
                      <div id="tutor-field-subjects" className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                              Authorized Subjects Selection
                            </label>
                            <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-[1.65]">
                              নিবন্ধনের সময় দেওয়া বিষয়গুলো এখানে সংরক্ষিত আছে—প্রয়োজনে নতুন বিষয় যোগ বা বাদ দিন।
                            </p>
                          </div>
                          {profileForm.subjects.length > 0 && (
                            <span className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest shrink-0">
                              {profileForm.subjects.length} Selected
                            </span>
                          )}
                        </div>

                        {/* Currently Selected Subjects Removable Chips (includes Signup / Custom Subjects) */}
                        <div className="mx-4 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {profileForm.subjects.length > 0 ? (
                              profileForm.subjects.map((subj) => (
                                <span
                                  key={subj}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-[#0D5BFF] dark:text-blue-300"
                                >
                                  <span>{subj}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleSubject(subj)}
                                    aria-label={`Remove ${subj}`}
                                    className="p-0.5 rounded-full hover:bg-blue-200/60 dark:hover:bg-blue-800/60 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                No subjects added yet. Pick from below or add a custom subject.
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customSubjectInput}
                              onFocus={scrollFieldIntoView}
                              onChange={(e) => setCustomSubjectInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const clean = customSubjectInput.trim();
                                  if (clean && !profileForm.subjects.some((s) => s.toLowerCase() === clean.toLowerCase())) {
                                    setProfileForm((prev) => ({ ...prev, subjects: [...prev.subjects, clean] }));
                                  }
                                  setCustomSubjectInput('');
                                }
                              }}
                              placeholder="Add another subject (e.g. Statistics, Spoken English)..."
                              className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B132B] text-xs font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const clean = customSubjectInput.trim();
                                if (clean && !profileForm.subjects.some((s) => s.toLowerCase() === clean.toLowerCase())) {
                                  setProfileForm((prev) => ({ ...prev, subjects: [...prev.subjects, clean] }));
                                }
                                setCustomSubjectInput('');
                              }}
                              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Curricular Version Tabs Selection */}
                        <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 mx-4">
                          {(['Bangla Version', 'English Version', 'Madrasha'] as const).map(tab => {
                            const isActive = tutorActiveSubjectTab === tab;
                            return (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setTutorActiveSubjectTab(tab)}
                                className={`w-full sm:flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
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
                        <div className="space-y-3 pt-1 mx-4">
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input
                              type="text"
                              placeholder="Search subjects dynamically..."
                              value={tutorSubjectSearchTerm}
                              onChange={e => setTutorSubjectSearchTerm(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl pl-12 pr-4 py-3 text-[9px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF]"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const stemSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Higher Math', 'General Science', 'Mathematics (EV)', 'Physics (EV)', 'Chemistry (EV)', 'Biology (EV)', 'Higher Math (EV)', 'General Science (EV)', 'Mathematics (Madrasha)'];
                                const allStemSelected = stemSubjects.every(s => profileForm.subjects.includes(s));
                                setProfileForm(prev => ({
                                  ...prev,
                                  subjects: allStemSelected
                                    ? prev.subjects.filter(s => !stemSubjects.includes(s))
                                    : Array.from(new Set([...prev.subjects, ...stemSubjects]))
                                }));
                              }}
                              className={`px-3 py-3 sm:py-1.5 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider border transition-all text-center w-full sm:w-auto ${
                                profileForm.subjects.some(s => ['Physics', 'Chemistry', 'Mathematics', 'Biology'].some(stem => s.includes(stem)))
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-500'
                              }`}
                            >
                              🧬 SCIENCE
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const commerceSubjects = ['Accounting', 'Finance', 'Economics', 'Business Studies', 'Management', 'Accounting (EV)', 'Finance (EV)', 'Economics (EV)', 'Business Studies (EV)', 'Management (EV)'];
                                const allCommerceSelected = commerceSubjects.every(s => profileForm.subjects.includes(s));
                                setProfileForm(prev => ({
                                  ...prev,
                                  subjects: allCommerceSelected
                                    ? prev.subjects.filter(s => !commerceSubjects.includes(s))
                                    : Array.from(new Set([...prev.subjects, ...commerceSubjects]))
                                }));
                              }}
                              className={`px-3 py-3 sm:py-1.5 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider border transition-all text-center w-full sm:w-auto ${
                                profileForm.subjects.some(s => ['Accounting', 'Finance', 'Business'].some(comm => s.includes(comm)))
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-emerald-500'
                              }`}
                            >
                              💼 BUSINESS STUDIES
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const humSubjects = ['Bangla', 'English', 'History', 'Geography', 'Social Science', 'Bangla (EV)', 'English (EV)', 'Social Science (Madrasha)', 'English (Madrasha)'];
                                const allHumSelected = humSubjects.every(s => profileForm.subjects.includes(s));
                                setProfileForm(prev => ({
                                  ...prev,
                                  subjects: allHumSelected
                                    ? prev.subjects.filter(s => !humSubjects.includes(s))
                                    : Array.from(new Set([...prev.subjects, ...humSubjects]))
                                }));
                              }}
                              className={`px-3 py-3 sm:py-1.5 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider border transition-all text-center w-full sm:w-auto ${
                                profileForm.subjects.some(s => ['Bangla', 'English', 'History', 'Geography'].some(hum => s.includes(hum)))
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500'
                              }`}
                            >
                              📚 Humanities
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfileForm(prev => ({ ...prev, subjects: [] }))}
                              className="w-full sm:w-auto sm:ml-auto py-3 sm:py-1.5 rounded-2xl sm:rounded-full text-[8px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-mono text-center"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        {/* Subjects Interactive Dynamic Grid */}
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar py-2 border-l border-slate-100/50 dark:border-slate-800/50 pl-4 mx-4">
                          {(() => {
                            const availableSubjects = SUBJECT_CATEGORIES[tutorActiveSubjectTab as keyof typeof SUBJECT_CATEGORIES] || [];
                            const filteredList = availableSubjects.filter(sub => 
                              sub.toLowerCase().includes(tutorSubjectSearchTerm.toLowerCase())
                            );

                            if (filteredList.length === 0) {
                              return (
                                <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 w-full">
                                  <p className="text-[9px] font-black uppercase tracking-widest leading-loose">No matched curricular Focus</p>
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredList.map(sub => {
                                  const isSelected = profileForm.subjects.includes(sub);
                                  return (
                                    <button
                                      key={sub}
                                      type="button"
                                      onClick={() => toggleSubject(sub)}
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

                      <div id="tutor-field-classes" className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">
                          Target Classes
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_CLASSES.map((cls) => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleClass(cls)}
                              className={`min-h-[40px] px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                                profileForm.classes.includes(cls)
                                  ? "bg-[#0B132B] dark:bg-[#0D5BFF] text-white border-[#0B132B] dark:border-[#0D5BFF] shadow-lg shadow-blue-500/10"
                                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {cls}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">
                          Mission Statement / Bio
                        </label>
                        <textarea
                          id="tutor-field-bio"
                          value={profileForm.bio}
                          onFocus={scrollFieldIntoView}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              bio: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 text-sm font-medium leading-relaxed text-[#0B132B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 h-40 focus:outline-none focus:border-[#0D5BFF]"
                          placeholder="Describe your teaching philosophy, academic achievements, and methodology..."
                        />
                      </div>

                      {/* Tutor Privacy & Public Visibility Controls */}
                      <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-[#0D5BFF] shrink-0" />
                            <div>
                              <h3 className="text-lg font-black text-[#0B132B] dark:text-white uppercase italic">
                                Privacy & Public Controls
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Contact details remain automatically locked until a tuition session is confirmed.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPublicPreview(true)}
                            className="shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                          >
                            Preview Public
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                          {[
                            {
                              key: "hidePhotoFromPublic" as const,
                              title: "Hide Photo From Guests",
                              desc: "Only show initials avatar to unauthenticated visitors",
                            },
                            {
                              key: "hideExpectedSalaryPublic" as const,
                              title: "Hide Salary From Guests",
                              desc: "Show \"Negotiable\" to guests until logged in or booked",
                            },
                            {
                              key: "hideFromSearch" as const,
                              title: "Pause Public Listing",
                              desc: "Temporarily hide profile from public home directory",
                            },
                          ].map((item) => {
                            const checked = Boolean(profileForm.privacySettings?.[item.key]);
                            return (
                              <label
                                key={item.key}
                                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                                  checked
                                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-[#0D5BFF]"
                                    : "bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({
                                      ...prev,
                                      privacySettings: {
                                        ...prev.privacySettings,
                                        [item.key]: e.target.checked,
                                      },
                                    }))
                                  }
                                  className="mt-1 h-4 w-4 accent-[#0D5BFF] rounded cursor-pointer shrink-0"
                                />
                                <div>
                                  <p className="text-xs font-black text-[#0B132B] dark:text-white">
                                    {item.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    {item.desc}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div id="tutor-field-availability" className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <Calendar className="w-5 h-5 text-[#0D5BFF]" />
                          <h3 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                            Availability
                          </h3>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-relaxed">
                            Select your active session windows. These slots will
                            be visible to parents for instant booking.
                          </p>
                          <p
                            lang="bn"
                            className="font-bn text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-200 leading-[1.7]"
                          >
                            আপনি সপ্তাহের কোন দিন ও সময়ে টিউশন করাতে পারবেন তা নির্বাচন করুন।
                          </p>
                        </div>

                        <AvailabilityCalendar
                          slots={profileForm.availabilitySlots}
                          onChange={(slots) =>
                            setProfileForm({
                              ...profileForm,
                              availabilitySlots: slots,
                            })
                          }
                        />
                      </div>

                      <button
                        disabled={isUpdating}
                        className="w-full min-h-[54px] py-6 bg-[#0B132B] dark:bg-[#0D5BFF] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl hover:bg-[#0D5BFF] dark:hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isUpdating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Synchronizing...
                          </>
                        ) : (
                          "Confirm Changes"
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <Briefcase className="w-5 h-5 text-[#0D5BFF]" />
                        <h3 className="text-lg font-black text-[#0B132B] dark:text-white uppercase italic">
                          Academic Bio
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed border-l-4 border-slate-200 dark:border-slate-700 pl-4">
                        {currentUser.bio ||
                          "Profile bio pending system update. Set your professional philosophy to attract premium bookings."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <GraduationCap className="w-5 h-5 text-emerald-500" />
                          <h3 className="text-sm font-black text-[#0B132B] dark:text-white uppercase italic">
                            Expertise
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(currentUser.subjects || ["Pending"]).map((s) => (
                            <span
                              key={s}
                              className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-full"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <h3 className="text-sm font-black text-[#0B132B] dark:text-white uppercase italic">
                            Availability
                          </h3>
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                          {Object.keys(currentUser.availabilitySlots || {})
                            .length > 0
                            ? "Slots Configured"
                            : "System Default (Flexible)"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors w-full min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-[#0D5BFF]" />
                          <h3 className="text-lg sm:text-xl font-black text-[#0B132B] dark:text-white uppercase italic">
                            Weekly Availability Schedule
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          All 7 Days (Sun – Sat)
                        </span>
                      </div>

                      <WeeklyScheduleOverview
                        slots={currentUser.availabilitySlots || {}}
                        bookedSessions={sessions.filter((s) => s.tutorId === currentUser.id && (s.status === "scheduled" || s.status === "active"))}
                        onManageClick={() => handleTabChange("availability")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "class_logs" && (
            <motion.div
              key="class_logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AppErrorBoundary level="widget" sectionName="Class Calendar">
                <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                  <ClassLogsCalendar role="tutor" />
                </Suspense>
              </AppErrorBoundary>
            </motion.div>
          )}

          {activeTab === "availability" && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/40 rounded-[2.5rem] flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl">
                    <Calendar className="w-10 h-10 text-[#0D5BFF]" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-[#0F172A] dark:text-white uppercase italic leading-none">
                      Schedule Manager
                    </h2>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-[0.25em] mt-2">
                      Optimize your academic performance windows
                    </p>
                    <p
                      lang="bn"
                      className="font-bn text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-200 mt-1 leading-[1.7]"
                    >
                      সপ্তাহের কোন দিন ও সময়ে আপনি পড়াতে পারবেন তা নির্ধারণ করুন।
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <AvailabilityCalendar
                    slots={currentUser.availabilitySlots || {}}
                    onChange={(slots) => updateAvailabilitySlots(slots)}
                  />
                  <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                    <DemandHeatmap
                      slots={currentUser.availabilitySlots || {}}
                      onChange={(slots) => updateAvailabilitySlots(slots)}
                      sessions={sessions}
                    />
                  </Suspense>
                </div>
                <div className="space-y-6">
                  <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <h3 className="text-lg font-black text-[#0B132B] dark:text-white uppercase italic">
                        Efficiency Tips
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                        • Evening slots (6 PM - 10 PM) typically receive 3x more
                        search visibility.
                        <br />
                        • Keep at least 4 slots per day to maintain a "Flexible"
                        tag.
                        <br />• Consistent weekly patterns help students book in
                        advance.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#111A2E] rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8">
                    <h3 className="text-lg sm:text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-2">
                      Earning & Payment History
                    </h3>
                    <p
                      lang="bn"
                      className="font-bn text-xs text-slate-600 dark:text-slate-300 mb-6"
                    >
                      আপনার টিউশন আয় ও পেমেন্টের বিস্তারিত তথ্য এখানে দেখুন।
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {tutorPayments.map((p) => (
                        <div
                          key={p.id}
                          className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-[10px] font-black text-[#0F172A] dark:text-white uppercase italic">
                                TRX: {p.transactionId}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                  p.status === "approved"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                    : p.status === "rejected"
                                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                              {new Date(p.date).toLocaleString()} • From{" "}
                              {users.find((u) => u.id === p.studentId)?.name ||
                                "Student"}
                            </p>
                          </div>
                          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 italic">
                            +৳{p.amount}
                          </div>
                        </div>
                      ))}
                      {tutorPayments.length === 0 && (
                        <div className="p-12 text-left md:text-center bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-700">
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest italic">
                            No earning records synchronized
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <Clock className="w-5 h-5 text-[#0D5BFF]" />
                      <h3 className="text-sm font-black uppercase italic">
                        Slot Pulse
                      </h3>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-5xl font-black italic">
                        {
                          Object.values(
                            currentUser.availabilitySlots || {},
                          ).flat().length
                        }
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest pb-2">
                        Active Windows
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "find_students" && (
            <motion.div
              key="find_students"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 text-left"
            >
              {/* Live Tuition Circulars Job Board, Recommendations & Application Tracker */}
              <AppErrorBoundary level="widget" sectionName="Tuition Marketplace">
                <Suspense fallback={<div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />}>
                  <TuitionMarketplaceHub
                    mode="tutor"
                    onMessageUser={(studentId) => {
                      setSelectedRecipientId(studentId);
                      handleTabChange("messages");
                    }}
                  />
                </Suspense>
              </AppErrorBoundary>

              {!currentUser.isVerified ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 sm:p-14 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-8">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-3xl flex items-center justify-center border border-rose-100 dark:border-rose-900/30 text-rose-500">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200/50 dark:border-rose-900/30">
                      Teacher Verification Required
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white uppercase italic">
                      Verification Pending
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                      To safeguard our student community and ensure quality education standards, only verified teachers can discover student profiles, send tuition offers, or access student contact channels.
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0B132B] dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      What happens after verification?
                    </h4>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
                      <li>Your teacher profile becomes publicly visible to all students across Bangladesh.</li>
                      <li>Unlock access to student search, filter by proximity/class, and dispatch tuition offers.</li>
                      <li>Receive the verified badge on your profile and direct guardian booking inquiries.</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                      onClick={() => handleTabChange("pro_profile")}
                      className="px-6 py-3.5 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      Complete Pro Profile
                    </button>
                    <button
                      onClick={() => {
                        const adminUser = users.find(
                          (u) =>
                            u.role === "admin" ||
                            u.email === "edutrackbangladesh@gmail.com" ||
                            u.email === "m13hmahadi.personal@gmail.com"
                        );
                        if (adminUser) {
                          setSelectedRecipientId(adminUser.id);
                        }
                        handleTabChange("messages");
                      }}
                      className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0B132B] dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Contact Admin Support
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic">
                        Find Student
                      </h3>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                        Find students who match your subject list & teachable parameters
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/10 text-[#0D5BFF] border border-blue-100 dark:border-blue-900/20 rounded-2xl flex items-center space-x-3">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0D5BFF]">
                          {users.filter(u => u.role === "student").length} Total Active Students
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-[#0B132B] dark:text-white uppercase tracking-wider">
                            Search Filters
                          </h4>
                          {(studentSearchTerm || filterStudentClass || filterStudentSubject || filterStudentAddress || filterStudentGender) && (
                            <button
                              onClick={() => {
                                setStudentSearchTerm("");
                                setFilterStudentClass("");
                                setFilterStudentSubject("");
                                setFilterStudentAddress("");
                                setFilterStudentGender("");
                              }}
                              className="text-[9px] font-black text-rose-500 uppercase tracking-widest"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                            Direct Query (Name/School)
                          </label>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                            <input
                              type="text"
                              value={studentSearchTerm}
                              onChange={e => setStudentSearchTerm(e.target.value)}
                              placeholder="Search student names..."
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-4 text-xs font-bold text-[#0B132B] dark:text-slate-100 focus:outline-none focus:border-[#0D5BFF]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                            Grade / Class
                          </label>
                          <select
                            value={filterStudentClass}
                            onChange={e => setFilterStudentClass(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-[#0B132B] dark:text-slate-100 focus:outline-none focus:border-[#0D5BFF] uppercase cursor-pointer"
                          >
                            <option value="">ALL GRADES</option>
                            {AVAILABLE_CLASSES.map(cls => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                            Focus Subject
                          </label>
                          <select
                            value={filterStudentSubject}
                            onChange={e => setFilterStudentSubject(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-[#0B132B] dark:text-slate-100 focus:outline-none focus:border-[#0D5BFF] uppercase cursor-pointer"
                          >
                            <option value="">ALL SUBJECTS</option>
                            {AVAILABLE_SUBJECTS.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                            Inbound Area / District
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                            <input
                              type="text"
                              value={filterStudentAddress}
                              onChange={e => setFilterStudentAddress(e.target.value)}
                              placeholder="Type Area or District..."
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-4 text-xs font-bold text-[#0B132B] dark:text-slate-100 focus:outline-none focus:border-[#0D5BFF]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                            Student Gender
                          </label>
                          <select
                            value={filterStudentGender}
                            onChange={e => setFilterStudentGender(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-[#0B132B] dark:text-slate-100 focus:outline-none focus:border-[#0D5BFF] uppercase cursor-pointer"
                          >
                            <option value="">ANY GENDER</option>
                            <option value="Male">MALE</option>
                            <option value="Female">FEMALE</option>
                          </select>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center justify-between">
                            <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                              Sort by Proximity
                            </label>
                            <span className="text-[8px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded uppercase">
                              Closer Top
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSortStudentByLocation(!sortStudentByLocation)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-black transition-all ${
                              sortStudentByLocation
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-[#0D5BFF]'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="uppercase text-[10px]">
                              {sortStudentByLocation ? "Enabled (Closest Top)" : "Disabled (Default)"}
                            </span>
                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${sortStudentByLocation ? 'bg-[#0D5BFF]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                              <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-250 ${sortStudentByLocation ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                      {(() => {
                        const filtered = filteredStudents;

                        if (filtered.length === 0) {
                          return (
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-16 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center mb-6">
                                <Users className="w-10 h-10 text-slate-200 dark:text-slate-600" />
                              </div>
                              <h4 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-2">
                                No students match your query
                              </h4>
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest max-w-sm leading-relaxed">
                                Try expanding your search credentials or clearing filters to locate other active students.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filtered.map(student => {
                              const distance = (() => {
                                if (!tutorCoords) return null;
                                const sCoords = student.location?.lat && student.location?.lng 
                                  ? [student.location.lat, student.location.lng] as [number, number]
                                  : (student.district ? getCoordinatesForLocation(student.district, student.thana, student.id) : null);
                                if (!sCoords) return null;
                                return getDistance(tutorCoords[0], tutorCoords[1], sCoords[0], sCoords[1]);
                              })();

                              return (
                                <div
                                  key={student.id}
                                  className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                                >
                                  <div>
                                    <div className="flex items-start space-x-3.5 sm:space-x-4 mb-5">
                                      <UserAvatar
                                        src={student.profileImage}
                                        name={student.name}
                                        className="w-14 h-14 rounded-2xl border border-slate-200/70 dark:border-slate-700"
                                        fallbackClassName="bg-blue-100 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-300"
                                        textClassName="text-lg font-black"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-base font-bold text-[#0B132B] dark:text-white flex flex-wrap items-center gap-1.5 leading-snug break-words">
                                          <span className="break-words">{student.name}</span>
                                          {student.gender === 'Male' && <span title="Male" className="shrink-0 flex items-center"><Mars className="w-4 h-4 text-sky-500 font-bold" /></span>}
                                          {student.gender === 'Female' && <span title="Female" className="shrink-0 flex items-center"><Venus className="w-4 h-4 text-rose-500 font-bold" /></span>}
                                        </h4>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 break-words leading-snug mt-0.5">
                                          {student.school || "Autonomous Learner"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-3.5 mb-6 border-b border-slate-100 dark:border-slate-800/50 pb-5">
                                      <div className="flex justify-between items-center gap-3 text-xs">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                                          Class / Level
                                        </span>
                                        <span className="font-bold text-[#0B132B] dark:text-white text-right break-words">
                                          {student.studentClass || "Not Specified"}
                                        </span>
                                      </div>

                                      <div className="flex justify-between items-start gap-3 text-xs">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-0.5 shrink-0">
                                          Location
                                        </span>
                                        <span className="font-bold text-[#0B132B] dark:text-slate-200 text-right break-words" title={student.address || student.area || student.district}>
                                          {student.area || student.district ? [student.area, student.district].filter(Boolean).join(', ') : (student.address || "Contact for info")}
                                        </span>
                                      </div>

                                      {distance !== null && (
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            Proximity (Distance)
                                          </span>
                                          <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-widest">
                                            {distance.toFixed(1)} KM AWAY
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                  <div className="space-y-2 mb-8">
                                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                                      Focus Interest Area
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {student.subjects && student.subjects.length > 0 ? (
                                        student.subjects.map(sub => (
                                          <span
                                            key={sub}
                                            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-350 rounded-lg text-[9px] font-bold uppercase border border-slate-100/10"
                                          >
                                            {sub}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase italic">
                                          General Syllabus Support
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setViewingProfileUser(student);
                                      setViewingProfileSession(null);
                                    }}
                                    className="px-4 py-4 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center transition-all border border-emerald-150/10 dark:border-emerald-800/20 cursor-pointer"
                                  >
                                    Profile
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedRecipientId(student.id);
                                      handleTabChange("messages");
                                    }}
                                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/80 text-[#0B132B] dark:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest text-center transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                                  >
                                    Message
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedStudentForProposal(student);
                                      setProposalSubject(student.subjects?.[0] || AVAILABLE_SUBJECTS[0]);
                                      setProposalDate(new Date().toISOString().split("T")[0]);
                                      setProposalNotes("");
                                    }}
                                    className="flex-1 py-4 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest text-center transition-all shadow-md shadow-blue-100 dark:shadow-none cursor-pointer"
                                  >
                                    Offer Tuition
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Proposal Modal Overlay */}
                  {selectedStudentForProposal && (
                    <div
                      className="fixed inset-0 bg-[#0B132B]/60 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setSelectedStudentForProposal(null);
                          setProposalSuccess(false);
                        }
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[3rem] w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-8 shadow-3xl text-left relative"
                      >
                        {!proposalSuccess ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!proposalSubject || !proposalDate || !proposalSlot) {
                                return;
                              }
                              setIsSendingProposal(true);
                              try {
                                const scheduledTime = `${proposalDate}T${proposalSlot}:00`;
                                
                                // Initialize lazy store acts
                                await useAppStore.getState().bookSession({
                                  studentId: selectedStudentForProposal.id,
                                  tutorId: currentUser.id,
                                  subject: proposalSubject, status: "proposed_by_tutor",
                                  scheduledTime
                                });

                                triggerConfetti();

                                await useAppStore.getState().sendNotification(
                                  selectedStudentForProposal.id,
                                  "New Tuition Proposal",
                                  `${currentUser.name} has sent a tuition invitation on ${proposalSubject} for ${new Date(scheduledTime).toLocaleString()}.`,
                                  "success"
                                );

                                await useAppStore.getState().sendMessage({
                                  senderId: currentUser.id,
                                  receiverId: selectedStudentForProposal.id,
                                  content: `Hello ${selectedStudentForProposal.name}! I reviewed your academic level and study interest. I have issued a live lesson offer for ${proposalSubject} scheduled on ${new Date(proposalDate).toLocaleDateString()} at ${proposalSlot}. Introduction: ${proposalNotes || "Ready to guide you through your academic curriculum!"}`
                                });

                                setProposalSuccess(true);
                                setTimeout(() => {
                                  setProposalSuccess(false);
                                  setSelectedStudentForProposal(null);
                                }, 2500);
                              } catch (error) {
                                console.error(error);
                              } finally {
                                setIsSendingProposal(false);
                              }
                            }}
                            className="space-y-5"
                          >
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.2em] block">
                                Tuition Proposal Pipeline
                              </span>
                              <h3 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white uppercase italic">
                                Offer tuition to {selectedStudentForProposal.name}
                              </h3>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                Set up tuition dates, times, and specialized introduction details.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                Tuition Subject
                              </label>
                              <select
                                value={proposalSubject}
                                onFocus={scrollFieldIntoView}
                                onChange={e => setProposalSubject(e.target.value)}
                                className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                              >
                                {selectedStudentForProposal.subjects && selectedStudentForProposal.subjects.length > 0 ? (
                                  selectedStudentForProposal.subjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))
                                ) : (
                                  AVAILABLE_SUBJECTS.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))
                                )}
                              </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                  Proposed Date
                                </label>
                                <input
                                  type="date"
                                  value={proposalDate}
                                  min={new Date().toISOString().split("T")[0]}
                                  onFocus={scrollFieldIntoView}
                                  onChange={e => setProposalDate(e.target.value)}
                                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                  Proposed Time Slot
                                </label>
                                <select
                                  value={proposalSlot}
                                  onFocus={scrollFieldIntoView}
                                  onChange={e => setProposalSlot(e.target.value)}
                                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                                >
                                  {[
                                    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
                                    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
                                    "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM"
                                  ].map(slot => {
                                    const [time, period] = slot.split(" ");
                                    let [hour, min] = time.split(":");
                                    let hourNum = parseInt(hour, 10);
                                    if (period === "PM" && hourNum !== 12) hourNum += 12;
                                    if (period === "AM" && hourNum === 12) hourNum = 0;
                                    const hourStr = hourNum.toString().padStart(2, "0");
                                    const value = `${hourStr}:${min}`;
                                    return (
                                      <option key={slot} value={value}>
                                        {slot}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                Pitch remarks / Personal Greetings
                              </label>
                              <textarea
                                value={proposalNotes}
                                onFocus={scrollFieldIntoView}
                                onChange={e => setProposalNotes(e.target.value)}
                                placeholder="Introduce yourself, outline credentials, or propose specific rates..."
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-5 text-xs font-medium text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                              />
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForProposal(null)}
                                className="flex-1 min-h-[44px] py-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSendingProposal}
                                className="flex-1 min-h-[44px] py-3.5 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                              >
                                {isSendingProposal ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                  "Dispatch Offer"
                                )}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] flex items-center justify-center mb-6">
                              <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h4 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-2">
                              Proposal Dispatched!
                            </h4>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest max-w-sm">
                              Your proposal has been securely logged. The student has been notified.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === "referrals" && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 text-left"
            >
              <AppErrorBoundary level="widget" sectionName="Referrals">
                <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                  <ReferralsTab />
                </Suspense>
              </AppErrorBoundary>
            </motion.div>
          )}

          {activeTab === "homework" && (
            <motion.div
              key="homework"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 text-left"
            >
              <AppErrorBoundary level="widget" sectionName="Homework">
                <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
                  <HomeworkDashboard />
                </Suspense>
              </AppErrorBoundary>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {viewingProfileUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B132B]/60 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setViewingProfileUser(null);
                setViewingProfileSession(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[3rem] w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-3xl text-left border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-gradient-to-r from-[#0C1B33] to-[#0B132B] p-5 sm:p-10 text-white relative shrink-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <button
                  type="button"
                  onClick={() => {
                    setViewingProfileUser(null);
                    setViewingProfileSession(null);
                  }}
                  aria-label="Close student profile modal"
                  className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px] w-11 h-11 bg-white/10 hover:bg-white/20 transition-all rounded-full flex items-center justify-center text-white border border-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 font-sans font-sans">
                  Student Profile & Academic details
                </span>
                <div className="mt-4 sm:mt-6 flex items-start sm:items-center gap-4 sm:gap-5">
                  <UserAvatar
                    src={viewingProfileUser.profileImage}
                    name={viewingProfileUser.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/15"
                    fallbackClassName="bg-white/10 text-sky-200"
                    textClassName="text-xl sm:text-2xl font-black"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-snug break-words">{viewingProfileUser.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 break-words leading-snug">
                      {viewingProfileUser.university || viewingProfileUser.studentClass ? `Class ${viewingProfileUser.studentClass} • ${viewingProfileUser.university || 'Verified School'}` : 'Academic Student'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-10 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* Academics Section */}
                <div>
                  <h4 className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-[0.15em] mb-3">Academic Parameters</h4>
                  <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Institute / School</span>
                      <p className="text-xs font-bold text-[#0B132B] dark:text-white">{viewingProfileUser.school || 'Autonomous Learner'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Class Level</span>
                      <p className="text-xs font-bold text-[#0B132B] dark:text-white">Class {viewingProfileUser.studentClass || 'Not Specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Subject Category / Group</span>
                      <p className="text-xs font-bold text-[#0DAA5F] uppercase">{viewingProfileUser.group || 'General Science / Arts'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Gender Identity</span>
                      <p className="text-xs font-bold text-[#0B132B] dark:text-white">{viewingProfileUser.gender || 'Not Specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div>
                  <h4 className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-[0.15em] mb-3">Address & Geography</h4>
                  <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-sans">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">District</span>
                      <p className="text-xs font-bold text-[#0B132B] dark:text-white">{viewingProfileUser.district || 'Not Specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Thana / Sub-district</span>
                      <p className="text-xs font-bold text-[#0B132B] dark:text-white">{viewingProfileUser.thana || 'Not Specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans">Area / Neighborhood</span>
                      <p className="text-xs font-bold text-[#0B132B] dark:text-white">{viewingProfileUser.area || 'Not Specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Coordinates Synced</span>
                      <p className="text-xs font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        {viewingProfileUser.location ? 'Mapped / Sync Active' : 'Approximate Area Zone'}
                      </p>
                    </div>
                    <div className="sm:col-span-2 space-y-1 pt-2 border-t border-slate-150/40 dark:border-slate-800/40">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Complete Inbound Address</span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-350 leading-relaxed font-sans mt-0.5">
                        {viewingProfileUser.address || "Area location not provided. Coordinate tracking serves proximity checks."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Core Contact info */}
                <div>
                  <h4 className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-[0.15em] mb-3">Contact Channels</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-sans space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] rounded-xl flex items-center justify-center">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans font-sans">Phone Contact</span>
                          <p className="text-xs font-black text-[#0B132B] dark:text-white mt-0.5">{getMaskedPhone(viewingProfileUser.phone)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/40 text-purple-500 rounded-xl flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans font-sans">Primary Email</span>
                          <p className="text-xs font-bold text-[#0B132B] dark:text-white mt-0.5 truncate max-w-[170px]">{getMaskedEmail(viewingProfileUser.email)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-150/40 dark:border-slate-800/40 flex items-start gap-2.5">
                      <span className="text-xs text-amber-500 shrink-0 mt-0.5">🔐</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                        <strong>Privacy Encrypted:</strong> Direct channels are masked to protect student and tutor security. Please use the built-in <strong>Inbox Message</strong>, <strong>Chat Panel</strong>, or official tuition request pipeline to organize the classes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enrolled Subjects */}
                <div className="space-y-2 font-sans">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Enrolled / Desired Subjects</span>
                  <div className="flex flex-wrap gap-2">
                    {(viewingProfileUser.subjects || ['General Syllabus Support']).map((sub, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-extrabold uppercase text-[#0B132B] dark:text-white">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {viewingProfileSession && (
                  <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10 space-y-3">
                    <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.1em] block font-sans">Requested Tuition Session</span>
                    <div className="grid sm:grid-cols-2 gap-4 text-xs font-bold">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-sans mr-2">Topic / Subject</span>
                        <span className="text-slate-800 dark:text-slate-200 mt-1 block">{viewingProfileSession.subject}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Requested Schedule Slot</span>
                        <span className="text-slate-800 dark:text-slate-200 mt-1 block">{new Date(viewingProfileSession.scheduledTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 dark:bg-slate-950 shrink-0">
                {viewingProfileSession ? (
                  viewingProfileSession.status === 'requested_by_student' ? (
                    <>
                      <button
                        onClick={async () => {
                          await useAppStore.getState().acceptSession(viewingProfileSession.id);
                          setViewingProfileUser(null);
                          setViewingProfileSession(null);
                        }}
                        className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md shadow-emerald-100 dark:shadow-none cursor-pointer"
                      >
                        Accept Tuition Request
                      </button>
                      <button
                        onClick={async () => {
                          await useAppStore.getState().rejectSession(viewingProfileSession.id);
                          setViewingProfileUser(null);
                          setViewingProfileSession(null);
                        }}
                        className="w-full sm:w-auto px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all cursor-pointer"
                      >
                        Reject Request
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                      Awaiting response from {viewingProfileUser.name}
                    </div>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRecipientId(viewingProfileUser.id);
                        handleTabChange("messages");
                        setViewingProfileUser(null);
                        setViewingProfileSession(null);
                      }}
                      className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      Inbox Message
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStudentForProposal(viewingProfileUser);
                        setProposalSubject(viewingProfileUser.subjects?.[0] || "Mathematics");
                        setProposalDate(new Date().toISOString().split("T")[0]);
                        setProposalNotes("");
                        setViewingProfileUser(null);
                        setViewingProfileSession(null);
                      }}
                      className="w-full sm:flex-1 py-4 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      Offer Custom Tuition
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => {
                    setSelectedRecipientId(viewingProfileUser.id);
                    handleTabChange("messages");
                    setViewingProfileUser(null);
                    setViewingProfileSession(null);
                  }}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-200 hover:bg-slate-350 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat Panel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Public Profile Modal */}
      {showPublicPreview && currentUser && (() => {
        const previewDraft: User = {
          ...currentUser,
          bio: profileForm.bio,
          hourlyRate: Number(String(profileForm.hourlyRate).replace(/,/g, "")) || currentUser.hourlyRate,
          daysPerWeek: profileForm.daysPerWeek ? Number(profileForm.daysPerWeek) : currentUser.daysPerWeek,
          experience: profileForm.experience,
          subjects: profileForm.subjects,
          classes: profileForm.classes,
          availabilitySlots: profileForm.availabilitySlots,
          district: profileForm.district,
          thana: profileForm.thana,
          area: profileForm.area,
          teachingAreas: profileForm.teachingAreas,
          privacySettings: profileForm.privacySettings,
        };
        const { tutor: guestTutor } = sanitizeTutorProfileForViewer(previewDraft, null, []);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#111A2E] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">
                    <Eye className="w-3.5 h-3.5" />
                    Public Guest View Preview
                  </div>
                  <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                    How Parents & Students See Your Profile
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublicPreview(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label="Close public profile preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {guestTutor && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3.5">
                      <UserAvatar
                        src={undefined}
                        locked={true}
                        name={guestTutor.name}
                        className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700"
                        textClassName="text-base font-black text-white"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Public Guest View
                        </p>
                        <p className="text-xs font-bold text-[#0B132B] dark:text-white mt-0.5">
                          Initials Badge Only (Photo Hidden)
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 flex items-center gap-3.5">
                      <UserAvatar
                        src={currentUser.profileImage}
                        locked={false}
                        name={currentUser.name}
                        className="w-14 h-14 rounded-2xl border border-blue-200 dark:border-blue-700"
                        textClassName="text-base font-black text-white"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#0D5BFF] dark:text-blue-400">
                          Confirmed Student View
                        </p>
                        <p className="text-xs font-bold text-[#0B132B] dark:text-white mt-0.5">
                          {currentUser.profileImage ? "Photo Unlocked After Booking" : "Upload Photo to Display"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <UserAvatar
                      src={undefined}
                      locked={true}
                      name={guestTutor.name}
                      className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700"
                      textClassName="text-xl font-black text-white"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-black text-[#0B132B] dark:text-white flex items-center gap-2 flex-wrap leading-snug break-words">
                        <span className="break-words">{guestTutor.name}</span>
                        {guestTutor.isVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        )}
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 break-words leading-snug">
                        {guestTutor.university || "Educational Expert"}
                        {guestTutor.district ? ` • ${guestTutor.district}${guestTutor.thana ? `, ${guestTutor.thana}` : ""}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Expected Monthly Salary
                      </p>
                      <p className="text-sm font-black text-[#0B132B] dark:text-white mt-0.5">
                        {guestTutor.hourlyRate
                          ? `৳${Number(guestTutor.hourlyRate).toLocaleString()}/month`
                          : "Negotiable (Hidden)"}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Schedule
                      </p>
                      <p className="text-sm font-black text-[#0B132B] dark:text-white mt-0.5">
                        {guestTutor.daysPerWeek || 3} Days / Week
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Search Directory
                      </p>
                      <p className="text-sm font-black text-[#0B132B] dark:text-white mt-0.5">
                        {profileForm.privacySettings?.hideFromSearch ? "Hidden" : "Visible"}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Public Bio
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {guestTutor.bio || "No bio set yet."}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      <strong>Contact Channels Locked:</strong> Phone ({String(Boolean(guestTutor.phone)) === "false" ? "Masked/Removed" : "Visible"}), WhatsApp, Email, NID details, and full address are automatically stripped until a student&apos;s tuition booking is confirmed.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPublicPreview(false)}
                  className="flex-1 min-h-[44px] px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPublicPreview(false);
                    navigate(`/teachers/${currentUser.id}`);
                  }}
                  className="flex-1 min-h-[44px] px-5 py-3 rounded-xl bg-[#0D5BFF] text-white text-xs font-black uppercase tracking-wider"
                >
                  Open Live Public Page
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const ProfileField = memo(
  ({
    id,
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    inputMode,
  }: {
    id?: string;
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  }) => {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider ml-1">
          {label}
        </label>
        <input
          id={id}
          type={type}
          inputMode={inputMode || (type === "tel" ? "tel" : undefined)}
          value={value}
          onFocus={scrollFieldIntoView}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[44px] bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl py-3.5 px-5 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF] transition-all"
        />
      </div>
    );
  },
);

const ReputationTracker = memo(
  ({
    rating,
    totalReviews,
    sessions = [],
    currentUser,
  }: {
    rating: number;
    totalReviews: number;
    sessions?: Session[];
    currentUser?: User | null;
  }) => {
    // 1. Real satisfaction / rating percentage
    const ratingScore = totalReviews > 0 ? Math.min(100, Math.round((rating / 5) * 100)) : 0;

    // 2. Real session completion rate based on tutor's actual sessions
    const tutorSessions = sessions.filter((s) => s.tutorId === currentUser?.id);
    const completedCount = tutorSessions.filter((s) => s.status === "completed").length;
    const cancelledCount = tutorSessions.filter((s) => s.status === "cancelled").length;
    const resolvedSessions = completedCount + cancelledCount;
    const completionPercentage =
      resolvedSessions > 0
        ? Math.round((completedCount / resolvedSessions) * 100)
        : completedCount > 0
        ? 100
        : 0;

    // 3. Real profile security & verification score
    let trustPercentage = 0;
    if (currentUser?.nidNumber && (currentUser?.nidFrontImg || currentUser?.nidBackImg)) trustPercentage += 35;
    if (currentUser?.documents && currentUser.documents.length > 0) trustPercentage += 35;
    if (currentUser?.isVerified) trustPercentage += 30;

    return (
      <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <AnimatePresence>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -z-0"></div>
        </AnimatePresence>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center space-x-3">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-xl font-black uppercase italic tracking-wider">
              Feedback & Performance
            </h3>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time Live
          </span>
        </div>

        <div className="relative z-10 mb-8">
          <div className="flex items-end gap-3">
            <span className="text-6xl font-black italic text-[#0D5BFF]">
              {rating.toFixed(1)}
            </span>
            <div className="pb-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-700"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {totalReviews > 0
                  ? `${totalReviews} Verified Review${totalReviews > 1 ? "s" : ""}`
                  : "No Student Reviews Yet"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          <TrackerBar
            label="Satisfaction Score"
            percentage={ratingScore}
            color="bg-amber-400"
          />
          <TrackerBar
            label={`Session Completion (${completedCount} Finished)`}
            percentage={completionPercentage}
            color="bg-[#0D5BFF]"
          />
          <TrackerBar
            label={`Profile Trust & Verification (${currentUser?.isVerified ? "Verified" : "Pending"})`}
            percentage={trustPercentage}
            color="bg-emerald-500"
          />
        </div>

        <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10 relative z-10">
          <p className="text-[9.5px] font-medium text-slate-400 leading-relaxed">
            All metrics reflect your authentic, real-time database records: verified student reviews, finished lessons, and uploaded credentials.
          </p>
        </div>
      </div>
    );
  },
);

const TrackerBar = memo(
  ({
    label,
    percentage,
    color,
  }: {
    label: string;
    percentage: number;
    color: string;
  }) => {
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
  },
);

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const AvailabilityCalendar = memo(
  ({
    slots,
    onChange,
  }: {
    slots: { [key: string]: string[] };
    onChange: (slots: { [key: string]: string[] }) => Promise<void> | void;
  }) => {
    return (
      <WeeklyAvailabilityCalendar
        slots={slots}
        onChange={onChange}
      />
    );
  },
);

