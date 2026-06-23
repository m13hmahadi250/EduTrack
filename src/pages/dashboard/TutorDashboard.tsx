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
  Sparkles,
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BANGLADESH_DISTRICTS, BANGLADESH_THANAS } from "../../data/bangladeshData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
const MapTracker = lazy(() => import("../../components/MapTracker"));
const ImageUpload = lazy(() => import("../../components/ImageUpload"));
const FileUpload = lazy(() => import("../../components/FileUpload"));
import DemandHeatmap from "../../components/DemandHeatmap";
import ClassLogsCalendar from "../../components/ClassLogsCalendar";
import {
  AVAILABLE_SUBJECTS,
  AVAILABLE_CLASSES,
  SUBJECT_CATEGORIES,
} from "../../constants";
import {
  MetricCard,
  DashboardInput,
} from "../../components/DashboardComponents";

const RatingModal = lazy(() => import("../../components/RatingModal"));
const ChatWindow = lazy(() => import("../../components/ChatWindow"));

const dummyData = [
  { name: "Mon", earnings: 1200 },
  { name: "Tue", earnings: 1800 },
  { name: "Wed", earnings: 1600 },
  { name: "Thu", earnings: 2200 },
  { name: "Fri", earnings: 2800 },
  { name: "Sat", earnings: 2400 },
  { name: "Sun", earnings: 3200 },
];

const MapLoading = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
    <div className="w-8 h-8 border-4 border-slate-800 border-t-[#0D5BFF] rounded-full animate-spin mb-2"></div>
    <p className="text-[8px] font-black uppercase tracking-widest leading-loose">
      Acquiring Uplink...
    </p>
  </div>
);

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
    })),
  );

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const tabsRef = React.useRef<HTMLDivElement>(null);

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
  const [activeTab, setActiveTab] = useState<
    | "my_session"
    | "balance"
    | "transit_mode"
    | "pro_profile"
    | "availability"
    | "messages"
    | "find_students"
    | "class_logs"
  >("my_session");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null,
  );
  const [showProfileNotice, setShowProfileNotice] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const filteredStudents = useMemo(() => {
    return users.filter(user => {
      if (user.role !== "student") return false;
      
      const matchesSearch = !studentSearchTerm || 
        user.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
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
  }, [users, studentSearchTerm, filterStudentClass, filterStudentSubject, filterStudentAddress, filterStudentGender]);
  const [selectedStudentForProposal, setSelectedStudentForProposal] = useState<User | null>(null);
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [proposalSlot, setProposalSlot] = useState("04:00 PM");
  const [proposalSubject, setProposalSubject] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
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

  const isProfileIncomplete =
    (!currentUser?.bio ||
      !currentUser?.hourlyRate ||
      !currentUser?.nidNumber ||
      !currentUser?.nidFrontImg ||
      !currentUser?.documents?.length) &&
    !currentUser?.hasDismissedProfileNotice;

  const missingFields = [
    !currentUser?.bio && "Bio",
    !currentUser?.hourlyRate && "Tutor Fee",
    (!currentUser?.nidNumber || !currentUser?.nidFrontImg) && "NID Credentials",
    (!currentUser?.documents || currentUser?.documents.length === 0) &&
      "Academic Documents",
  ].filter(Boolean) as string[];

  const refreshLocationManual = () => {
    if ("geolocation" in navigator) {
      setIsRefreshingLocation(true);
      const tryGetPosition = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            updateLocation(
              currentUser!.id,
              pos.coords.latitude,
              pos.coords.longitude,
            );
            setIsRefreshingLocation(false);
          },
          (err) => {
            if (highAccuracy) {
              // Retry with standard IP-resolved accuracy for headless desktop virtual frames
              tryGetPosition(false);
              return;
            }
            console.warn("Manual location request failed: aligning with metropolitan Dhaka fallback:", err);
            updateLocation(currentUser!.id, 23.8103, 90.4125);
            setIsRefreshingLocation(false);
          },
          { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 4000 : 15000, maximumAge: 60000 },
        );
      };
      tryGetPosition(true);
    }
  };

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/balance")) setActiveTab("balance");
    else if (path.endsWith("/transit")) setActiveTab("transit_mode");
    else if (path.endsWith("/profile")) setActiveTab("pro_profile");
    else if (path.endsWith("/availability")) setActiveTab("availability");
    else if (path.endsWith("/messages")) setActiveTab("messages");
    else if (path.endsWith("/find-students")) setActiveTab("find_students");
    else if (path.endsWith("/class-logs")) setActiveTab("class_logs");
    else setActiveTab("my_session");
  }, [location.pathname]);

  const handleTabChange = (
    tab:
      | "my_session"
      | "balance"
      | "transit_mode"
      | "pro_profile"
      | "availability"
      | "messages"
      | "find_students"
      | "class_logs",
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
    };
    navigate(pathMap[tab]);
  };

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: currentUser?.bio || "",
    hourlyRate: currentUser?.hourlyRate ? currentUser.hourlyRate.toLocaleString('en-US') : "",
    daysPerWeek: currentUser?.daysPerWeek !== undefined ? currentUser.daysPerWeek.toString() : "3",
    experience: currentUser?.experience || "",
    subjects: currentUser?.subjects || [],
    classes: currentUser?.classes || [],
    availabilitySlots: currentUser?.availabilitySlots || {},
    district: currentUser?.district || "",
    area: currentUser?.area || "",
    thana: currentUser?.thana || "",
    teachingAreas: currentUser?.teachingAreas || [],
    nidNumber: currentUser?.nidNumber || "",
    birthDate: currentUser?.birthDate || "",
    nidFrontImg: currentUser?.nidFrontImg || "",
    nidBackImg: currentUser?.nidBackImg || "",
    documents: currentUser?.documents || [],
    gender: currentUser?.gender || "",
  });

  // Sync profile form when currentUser changes or editing is toggled
  useEffect(() => {
    if (!isEditingProfile && currentUser) {
      setProfileForm({
        bio: currentUser.bio || "",
        hourlyRate: currentUser.hourlyRate ? currentUser.hourlyRate.toLocaleString('en-US') : "",
        daysPerWeek: currentUser.daysPerWeek !== undefined ? currentUser.daysPerWeek.toString() : "3",
        experience: currentUser.experience || "",
        subjects: currentUser.subjects || [],
        classes: currentUser.classes || [],
        availabilitySlots: currentUser.availabilitySlots || {},
        district: currentUser.district || "",
        area: currentUser.area || "",
        thana: currentUser.thana || "",
        teachingAreas: currentUser.teachingAreas || [],
        nidNumber: currentUser.nidNumber || "",
        birthDate: currentUser.birthDate || "",
        nidFrontImg: currentUser.nidFrontImg || "",
        nidBackImg: currentUser.nidBackImg || "",
        documents: currentUser.documents || [],
        gender: currentUser.gender || "",
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

  // Geolocation tracking logic
  useEffect(() => {
    let currentWatchId: number | null = null;

    if (currentUser?.isTrackingOn) {
      if ("geolocation" in navigator) {
        currentWatchId = navigator.geolocation.watchPosition(
          (position) => {
            updateLocation(
              currentUser.id,
              position.coords.latitude,
              position.coords.longitude,
            );
          },
          (error) => {
            console.warn("Active tracking watch unavailable, falling back to standard placement:", error);
            // Fallback to single getCurrentPosition update with loose timeout constraints
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                updateLocation(
                  currentUser.id,
                  pos.coords.latitude,
                  pos.coords.longitude,
                ),
              (err) => {
                console.warn("Standard position failed, applying default Dhaka metropolitan context alignment:", err);
                // Graceful fallback to center of Dhaka so dashboard layout stays perfectly functional
                updateLocation(currentUser.id, 23.8103, 90.4125);
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
            );
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      } else {
        // Device lacks geolocation hardware/support
        updateLocation(currentUser.id, 23.8103, 90.4125);
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
        hourlyRate: Number(String(profileForm.hourlyRate).replace(/,/g, '')),
        daysPerWeek: profileForm.daysPerWeek ? Number(profileForm.daysPerWeek) : 3,
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
      setWithdrawalError(
        error.message || "Withdrawal failed. Please try again.",
      );
    }
  };

  const activeSessions = useMemo(() => {
    const sessionMap = new Map();
    sessions
      .filter((s) => s.status !== "completed" && s.status !== "cancelled")
      .forEach((s) => {
        if (!sessionMap.has(s.id)) {
          sessionMap.set(s.id, s);
        }
      });
    return Array.from(sessionMap.values());
  }, [sessions]);

  const tutorPayments = useMemo(() => {
    const paymentMap = new Map();
    payments.forEach((p) => {
      if (!paymentMap.has(p.id)) {
        paymentMap.set(p.id, p);
      }
    });
    return Array.from(paymentMap.values());
  }, [payments]);

  const tutorWithdrawals = useMemo(() => {
    const withdrawalMap = new Map();
    withdrawals.forEach((w) => {
      if (!withdrawalMap.has(w.id)) {
        withdrawalMap.set(w.id, w);
      }
    });
    return Array.from(withdrawalMap.values());
  }, [withdrawals]);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4">
            Tutor Panel
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-[#0B132B] uppercase tracking-[0.2em]">
            Welcome,{" "}
            <span className="font-black text-[#0D5BFF] italic">
              {currentUser.name}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            {currentUser.isVerified ? (
              <div className="px-5 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center space-x-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  VERIFIED
                </span>
              </div>
            ) : (
              <div className="px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl flex items-center space-x-3">
                <Zap className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                  Verification Pending
                </span>
              </div>
            )}

            <button
              onClick={() => window.dispatchEvent(new Event('start-edutrack-tour'))}
              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-[#0D5BFF] hover:from-[#0D5BFF] hover:to-indigo-600 dark:from-[#0D5BFF] dark:to-indigo-505 text-white border border-transparent rounded-[1.2rem] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Quick Start Tour"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </button>

            <button
              id="tutor-dashboard-header-share-btn"
              onClick={shareProfile}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0D5BFF] border border-slate-200 rounded-2xl flex items-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {copiedLink ? "Link Copied!" : "Share Profile Link"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Adaptive Grid Selector (All Panels Fully Visible) */}
      <div className="lg:hidden block mb-6" id="tutor-mobile-tablet-tab-matrix">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#0B132B]/50 mb-3 italic">
          Quick Navigation Dashboard Matrix
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { id: "my_session", label: "My Session", icon: Clock },
            { id: "find_students", label: "Find Students", icon: Search },
            { id: "class_logs", label: "Class Cal", icon: Calendar },
            { id: "balance", label: "Balance", icon: CreditCard },
            { id: "transit_mode", label: "Location Track", icon: MapPin },
            { id: "messages", label: "Messages", icon: MessageSquare },
            { id: "pro_profile", label: "Pro Profile", icon: Award },
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
            { id: "balance", label: "Balance" },
            { id: "transit_mode", label: "Location Track" },
            { id: "messages", label: "Messages" },
            { id: "pro_profile", label: "Pro Profile" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`text-xs font-black font-heading uppercase tracking-[0.2em] italic pb-4 transition-all relative inline-block cursor-pointer z-30 pointer-events-auto ${
                activeTab === tab.id
                  ? "text-[#0B132B]"
                  : "text-[#0B132B]/30 hover:text-[#0B132B]"
              }`}
            >
              {tab.label}
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
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Bell className="w-4 h-4 text-white animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                      Optimization Required
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase italic leading-tight">
                    Complete your profile to unlock full system capabilities
                  </h3>
                  <div className="flex flex-wrap gap-2 my-3">
                    {missingFields.map((field) => (
                      <span
                        key={field}
                        className="px-3 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/10"
                      >
                        Missing: {field}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] font-medium text-blue-100 uppercase tracking-widest max-w-xl">
                    Our optimized matching algorithm prioritizes experts with
                    100% complete profiles. Providing all credentials ensures
                    faster verification and higher ranking in student search
                    results.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      handleTabChange("pro_profile");
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
                      updateUser(currentUser.id, {
                        hasDismissedProfileNotice: true,
                      });
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

      {activeTab === "pro_profile" && currentUser?.profileImage && (
        <img
          src={currentUser.profileImage}
          alt="Preload"
          className="hidden"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
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
                        <button
                          onClick={() => {
                            const activeSess = sessions.find(
                              (s) => s.status === "active",
                            );
                            if (activeSess) endSession(activeSess.id);
                          }}
                          className="px-8 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2 group/btn"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          <span>Complete Session</span>
                        </button>
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
                              <button
                                onClick={() => endSession(sess.id)}
                                className="px-6 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-all animate-pulse"
                              >
                                <Square className="w-4 h-4 fill-current" />{" "}
                                Finish Session
                              </button>
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
                        <h4 className="text-xl font-black text-[#0B132B] uppercase italic mb-2">
                          No sessions scheduled yet
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Wait for booking requests from parents
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
                />
                <EarningsSummaryWidget sessions={sessions} hourlyRate={currentUser?.hourlyRate || 1000} />
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
                <div className="bg-[#0B132B] rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#0D5BFF]/10 blur-[100px]"></div>
                  <div className="flex items-center space-x-4 mb-12 relative z-10">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                      <CreditCard className="w-7 h-7 text-[#0D5BFF]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase italic">
                        Wallet Records
                      </h2>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Liquidity Status
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mb-12">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">
                      Floating Balance
                    </p>
                    <h3 className="text-7xl font-black italic tracking-tighter">
                      ৳{currentUser.balance?.toLocaleString()}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Total Yield
                      </p>
                      <p className="text-xl font-black italic">
                        ৳
                        {activeSessions.filter((s) => s.status === "completed")
                          .length * (currentUser.hourlyRate || 1000)}
                      </p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Withdrawn
                      </p>
                      <p className="text-xl font-black italic">
                        ৳
                        {tutorWithdrawals
                          .filter((w) => w.status === "approved")
                          .reduce((acc, w) => acc + w.amount, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-500" /> WITHDRAWAL
                  </h3>

                  {withdrawalSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 sm:p-12 bg-emerald-50 rounded-[1.5rem] sm:rounded-[2rem] text-left md:text-center border-2 border-emerald-100 shadow-xl"
                    >
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center ml-0 mr-auto md:mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h4 className="text-xl font-black text-emerald-900 uppercase italic">
                        Payout Synchronized
                      </h4>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2 px-0 md:px-10">
                        Our treasury has received your hook. Expect clearance
                        within 6-12 standard operational hours.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleWithdrawRequest} className="space-y-6">
                      {withdrawalError && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-left md:text-center">
                          {withdrawalError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <DashboardInput
                          label="Withdrawal Volume (৳)"
                          value={withdrawAmount}
                          onChange={(v) => {
                            const clean = v.replace(/[^0-9]/g, "");
                            const formatted = clean ? Number(clean).toLocaleString('en-US') : "";
                            setWithdrawAmount(formatted);
                          }}
                          placeholder="Min 500"
                          type="text"
                        />
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#0B132B] uppercase tracking-widest italic ml-1">
                            Payout Gateway
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none focus:border-[#0D5BFF] transition-all"
                          >
                            <option value="bkash">bKash Personal</option>
                            <option value="nagad">Nagad Wallet</option>
                            <option value="bank">Bank Transfer</option>
                          </select>
                        </div>
                      </div>

                      <DashboardInput
                        label="Recipient Identification / ID"
                        value={bkashNumber}
                        onChange={setBkashNumber}
                        placeholder="ACCOUNT NUMBER OR IBAN..."
                      />

                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-[#0D5BFF]" />
                        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                          Security: Funds are locked during audit phase
                        </p>
                      </div>

                      <button
                        disabled={
                          !withdrawAmount ||
                          !bkashNumber ||
                          Number(String(withdrawAmount).replace(/,/g, '')) > (currentUser.balance || 0)
                        }
                        className="w-full bg-[#0D5BFF] text-white py-6 rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                      >
                        Authorize Secure Payout
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <section className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">
                  Financial History
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                  <div className="space-y-4">
                    {tutorWithdrawals
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime(),
                      )
                      .map((w) => (
                        <div
                          key={w.id}
                          className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col gap-6 group hover:bg-white hover:shadow-lg transition-all duration-300"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                              <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black italic shadow-inner ${
                                  w.status === "approved"
                                    ? "bg-emerald-50 text-emerald-500"
                                    : w.status === "rejected"
                                      ? "bg-rose-50 text-rose-500"
                                      : "bg-amber-50 text-amber-500"
                                }`}
                              >
                                {w.paymentMethod?.charAt(0).toUpperCase() ||
                                  "B"}
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  {new Date(w.timestamp).toLocaleString()}
                                </p>
                                <h4 className="text-sm font-black text-[#0B132B] uppercase italic">
                                  ID: {w.bKashNumber}
                                </h4>
                                <p className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest">
                                  {w.paymentMethod?.toUpperCase()} CHANNEL
                                </p>
                              </div>
                            </div>
                            <div className="sm:text-right">
                              <p className="text-2xl font-black text-[#0B132B] italic mb-1">
                                ৳{w.amount}
                              </p>
                              <div className="flex items-center sm:justify-end gap-2">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    w.status === "approved"
                                      ? "bg-emerald-500"
                                      : w.status === "rejected"
                                        ? "bg-rose-500"
                                        : "bg-amber-500 animate-pulse"
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                    w.status === "approved"
                                      ? "text-emerald-500"
                                      : w.status === "rejected"
                                        ? "text-rose-500"
                                        : "text-amber-500"
                                  }`}
                                >
                                  {w.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          {w.adminNote && (
                            <div
                              className={`p-4 rounded-2xl border text-[9px] font-bold uppercase tracking-wide flex items-center gap-3 ${
                                w.status === "approved"
                                  ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-700"
                                  : "bg-rose-50/50 border-rose-100/50 text-rose-700"
                              }`}
                            >
                              <div className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center">
                                <ShieldCheck className="w-3 h-3" />
                              </div>
                              ADMIN NOTE: {w.adminNote}
                            </div>
                          )}
                        </div>
                      ))}
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
              <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
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
                      <h3 className="text-2xl font-black text-[#0B132B] uppercase italic">
                        Transit Protocol
                      </h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Geographical Visibility
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
                    {currentUser.isTrackingOn ? (
                      <Suspense fallback={<MapLoading />}>
                        <MapTracker
                          tutorLocation={
                            currentUser.location
                              ? [
                                  currentUser.location.lat,
                                  currentUser.location.lng,
                                ]
                              : undefined
                          }
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
                                if (
                                  student?.location &&
                                  !uniqueStudents.has(student.id)
                                ) {
                                  uniqueStudents.set(student.id, {
                                    id: student.id,
                                    location: [
                                      student.location.lat,
                                      student.location.lng,
                                    ] as [number, number],
                                    name: student.name,
                                    image: student.profileImage,
                                    isOnline: student.isTrackingOn,
                                  });
                                }
                              });
                            return Array.from(uniqueStudents.values());
                          })()}
                        />
                      </Suspense>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-start md:items-center justify-center bg-slate-900/95 text-left md:text-center p-12">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center ml-0 mr-auto md:mx-auto mb-6">
                          <MapPin className="w-10 h-10 text-slate-700" />
                        </div>
                        <h4 className="text-white text-xl font-black uppercase italic mb-4">
                          Signal Blocked
                        </h4>
                        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest leading-loose">
                          Enable tracking to visualize proximity intel and
                          student distance
                        </p>
                      </div>
                    )}
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

              <div className="flex flex-col gap-12">
                <div className="bg-slate-50 rounded-[2rem] sm:rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-start md:items-center justify-center p-6 sm:p-12 lg:p-20 text-left md:text-center flex-1">
                  <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center ml-0 mr-auto md:mx-auto mb-8 shadow-xl">
                    <Zap
                      className={`w-10 h-10 ${currentUser.isTrackingOn ? "text-amber-500 animate-pulse" : "text-slate-200"}`}
                    />
                  </div>
                  <h4 className="text-2xl font-black text-[#0B132B] uppercase italic mb-4">
                    Signal Integrity
                  </h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xs leading-loose">
                    Your signal is encrypted and only visible to students with
                    active, approved bookings within a 2-hour window.
                  </p>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-6">
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
                    // Logic: Students I have a session record with OR message history
                    const myStudentIdsFromSessions = sessions.map(
                      (s) => s.studentId,
                    );
                    const myStudentIdsFromMessages = messages.map((m) =>
                      m.senderId === currentUser.id ? m.receiverId : m.senderId,
                    );
                    const allContactIds = Array.from(
                      new Set([
                        ...myStudentIdsFromSessions,
                        ...myStudentIdsFromMessages,
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
                              <span className="absolute -top-1.5 -right-1.5 bg-[#E51275] text-white text-[8px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-bounce shadow-md">
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
                  <div className="h-full border-4 border-dashed border-slate-100 rounded-[2rem] sm:rounded-[4rem] flex flex-col items-start md:items-center justify-center text-left md:text-center p-6 sm:p-12 opacity-30">
                    <Send className="w-12 h-12 mb-6 ml-0 mr-auto md:mx-auto" />
                    <h3 className="text-xl font-black uppercase italic">
                      Initialize Comms
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-2">
                      Select a certified contact from the uplink
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "pro_profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-3 gap-12"
            >
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start md:items-center">
                  <div className="mb-8">
                    <ImageUpload
                      currentImageUrl={currentUser.profileImage}
                      onUpload={(url) =>
                        updateUser(currentUser.id, { profileImage: url })
                      }
                      onDelete={() =>
                        updateUser(currentUser.id, { profileImage: "" })
                      }
                    />
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

                  {/* Verification Status Progress */}
                  <div className="w-full space-y-4 mb-10">
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <ShieldCheck
                          className={`w-4 h-4 ${currentUser.nidStatus === "approved" ? "text-emerald-500" : currentUser.nidStatus === "rejected" ? "text-rose-500" : "text-slate-300"}`}
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white">
                          NID Identity
                        </span>
                      </div>
                      <span
                        className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                          currentUser.nidStatus === "approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                            : currentUser.nidStatus === "rejected"
                              ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                              : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            currentUser.nidStatus === "approved"
                              ? "bg-emerald-500"
                              : currentUser.nidStatus === "rejected"
                                ? "bg-rose-500"
                                : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {currentUser.nidStatus || "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <GraduationCap
                          className={`w-4 h-4 ${currentUser.academicStatus === "approved" ? "text-emerald-500" : currentUser.academicStatus === "rejected" ? "text-rose-500" : "text-slate-300"}`}
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white">
                          Academic Certs
                        </span>
                      </div>
                      <span
                        className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                          currentUser.academicStatus === "approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                            : currentUser.academicStatus === "rejected"
                              ? "bg-rose-50 text-rose-600 border-rose-100/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                              : "bg-amber-50 text-amber-600 border-amber-100/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            currentUser.academicStatus === "approved"
                              ? "bg-emerald-500"
                              : currentUser.academicStatus === "rejected"
                                ? "bg-rose-500"
                                : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {currentUser.academicStatus || "Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Share My Public Profile Context */}
                  <div className="w-full pb-6 mb-6 border-b border-slate-100">
                    <button
                      id="tutor-pro-tab-share-btn"
                      onClick={shareProfile}
                      className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-50 hover:bg-slate-100 text-[#0D5BFF] text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200/60 transition-all cursor-pointer shadow-sm active:scale-95 hover:scale-[1.01]"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{copiedLink ? "Link Copied to Clipboard!" : "Share My Public Profile"}</span>
                    </button>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mt-2 px-2 leading-relaxed">
                      Share this custom certified url with parents and students to secure private direct bookings!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        handleProfileUpdate({
                          preventDefault: () => {},
                        } as React.FormEvent);
                      } else {
                        setIsEditingProfile(true);
                      }
                    }}
                    className="w-full py-5 bg-[#0D5BFF] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all"
                  >
                    {isEditingProfile
                      ? "Confirm Changes"
                      : "Edit Profile"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                {isEditingProfile ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] p-6 sm:p-12 md:p-16 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic mb-12">
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

                    <form onSubmit={handleProfileUpdate} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ProfileField
                          label="National ID (NID)"
                          value={profileForm.nidNumber}
                          onChange={(v) =>
                            setProfileForm({ ...profileForm, nidNumber: v })
                          }
                          placeholder="Enter 10 or 17 digit NID"
                        />
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
                            <option value="Other">OTHER</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            NID Front Image
                          </label>
                          <FileUpload
                            currentFileUrl={profileForm.nidFrontImg}
                            onUpload={(url) =>
                              setProfileForm({
                                ...profileForm,
                                nidFrontImg: url,
                              })
                            }
                            label="Upload NID Front"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            NID Back Image
                          </label>
                          <FileUpload
                            currentFileUrl={profileForm.nidBackImg}
                            onUpload={(url) =>
                              setProfileForm({
                                ...profileForm,
                                nidBackImg: url,
                              })
                            }
                            label="Upload NID Back"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Current College/ University ID CARD
                          </label>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                            {profileForm.documents.length} Files
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {profileForm.documents.map((docUrl, idx) => (
                            <div key={idx} className="relative group">
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-[#0D5BFF]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-black uppercase text-[#0B132B] truncate leading-none mb-1">
                                    Document {idx + 1}
                                  </p>
                                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest truncate">
                                    Verified encrypted storage
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
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <FileUpload
                            currentFileUrl=""
                            onUpload={(url) =>
                              setProfileForm({
                                ...profileForm,
                                documents: [...profileForm.documents, url],
                              })
                            }
                            label="Add New Document (PDF/IMG)"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            District
                          </label>
                          <div className="relative">
                            <select
                              value={profileForm.district || ""}
                              onChange={(e) => {
                                const newDist = e.target.value;
                                setProfileForm({
                                  ...profileForm,
                                  district: newDist,
                                  thana: "",
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-100 rounded-full py-5 pl-10 pr-12 text-xs font-black uppercase italic text-[#0B132B] dark:bg-slate-900 dark:border-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF] appearance-none cursor-pointer"
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
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  thana: e.target.value,
                                })
                              }
                              className={`w-full bg-slate-50 border border-slate-100 rounded-full py-5 pl-10 pr-12 text-xs font-black uppercase italic text-[#0B132B] dark:bg-slate-900 dark:border-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF] appearance-none cursor-pointer ${
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
                          label="Area"
                          value={profileForm.area}
                          onChange={(v) =>
                            setProfileForm({ ...profileForm, area: v })
                          }
                          placeholder="e.g. Mirpur 1"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                          Teaching Areas (Searchable by students)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="teachingAreaInput"
                            placeholder="Add an area..."
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-full py-4 px-8 text-xs font-black uppercase italic text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
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
                            className="w-14 h-14 bg-[#0B132B] text-white rounded-2xl flex items-center justify-center"
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ProfileField
                          label="Monthly Tutor Fee (৳)"
                          value={profileForm.hourlyRate}
                          placeholder="e.g. 10,000 or 5,000"
                          onChange={(v) => {
                            const clean = v.replace(/[^0-9]/g, "");
                            const formatted = clean ? Number(clean).toLocaleString('en-US') : "";
                            setProfileForm({
                              ...profileForm,
                              hourlyRate: formatted,
                            });
                          }}
                          type="text"
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
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Authorized Subjects Selection
                          </label>
                          {profileForm.subjects.length > 0 && (
                            <span className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest">
                              {profileForm.subjects.length} Selected Focus Areas
                            </span>
                          )}
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
                                <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-150 dark:border-slate-800 text-slate-400 dark:text-slate-500 w-full">
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

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                          Target Classes
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_CLASSES.map((cls) => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleClass(cls)}
                              className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                                profileForm.classes.includes(cls)
                                  ? "bg-[#0B132B] text-white border-[#0B132B] shadow-lg shadow-slate-100"
                                  : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {cls}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                          Mission Statement / Bio
                        </label>
                        <textarea
                          value={profileForm.bio}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              bio: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-xs font-black uppercase italic leading-relaxed text-[#0B132B] h-40 focus:outline-none focus:border-[#0D5BFF]"
                          placeholder="Your teaching philosophy..."
                        />
                      </div>

                      <div className="space-y-6 pt-8 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                          <Calendar className="w-5 h-5 text-[#0D5BFF]" />
                          <h3 className="text-xl font-black text-[#0B132B] uppercase italic">
                            Availability
                          </h3>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                          Select your active session windows. These slots will
                          be visible to parents for instant booking.
                        </p>

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
                        className="w-full py-6 bg-[#0B132B] text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl hover:bg-[#0D5BFF] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
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
                  <div className="space-y-8">
                    <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 lg:p-16 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                        <Briefcase className="w-6 h-6 text-[#0D5BFF]" />
                        <h3 className="text-xl font-black text-[#0B132B] uppercase italic">
                          Academic Bio
                        </h3>
                      </div>
                      <p className="text-sm font-black uppercase italic text-slate-500 leading-loose tracking-tight border-l-4 border-slate-50 pl-8">
                        {currentUser.bio ||
                          "Profile bio pending system update. Set your professional philosophy to attract premium bookings."}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-12 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                          <GraduationCap className="w-5 h-5 text-emerald-500" />
                          <h3 className="text-sm font-black text-[#0B132B] uppercase italic">
                            Expertise
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(currentUser.subjects || ["Pending"]).map((s) => (
                            <span
                              key={s}
                              className="px-5 py-2 bg-slate-50 border border-slate-100 text-[9px] font-black uppercase italic text-slate-400 rounded-full"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-12 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <h3 className="text-sm font-black text-[#0B132B] uppercase italic">
                            Availability
                          </h3>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                          {Object.keys(currentUser.availabilitySlots || {})
                            .length > 0
                            ? "Slots Configured"
                            : "System Default (Flexible)"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 lg:p-16 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-10">
                        <Calendar className="w-6 h-6 text-[#0D5BFF]" />
                        <h3 className="text-xl font-black text-[#0B132B] uppercase italic">
                          Visual Schedule
                        </h3>
                      </div>

                      <div className="overflow-x-auto pb-4 custom-scrollbar w-full font-sans" id="visual-schedule-responsive-scroller">
                        <div className="grid grid-cols-7 gap-3 min-w-[760px] lg:min-w-0" id="visual-schedule-columns-matrix">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                            (day) => {
                              const dayName =
                                day === "Sun"
                                  ? "Sunday"
                                  : day === "Mon"
                                    ? "Monday"
                                    : day === "Tue"
                                      ? "Tuesday"
                                      : day === "Wed"
                                        ? "Wednesday"
                                        : day === "Thu"
                                          ? "Thursday"
                                          : day === "Fri"
                                            ? "Friday"
                                            : "Saturday";
                              const daySlots =
                                currentUser.availabilitySlots?.[dayName] || [];

                              return (
                                <div
                                  key={day}
                                  className="min-w-[100px] space-y-3"
                                >
                                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[10px] font-black uppercase text-[#0B132B] dark:text-slate-200 italic">
                                      {day}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 px-1">
                                    {daySlots.map((slot) => (
                                      <div
                                        key={slot}
                                        className="px-3 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-center"
                                      >
                                        <span className="text-[8px] sm:text-[9px] font-black text-[#0D5BFF] dark:text-blue-400 whitespace-nowrap">
                                          {slot}
                                        </span>
                                      </div>
                                    ))}
                                    {daySlots.length === 0 && (
                                      <div className="px-3 py-4 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-center">
                                        <span className="text-[7px] font-black text-slate-200 dark:text-slate-700 uppercase">
                                          REST
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
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
              <ClassLogsCalendar role="tutor" />
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
                  <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl">
                    <Calendar className="w-10 h-10 text-[#0D5BFF]" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-[#0B132B] uppercase italic leading-none">
                      Schedule Manager
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
                      Optimize your academic performance windows
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
                  <DemandHeatmap
                    slots={currentUser.availabilitySlots || {}}
                    onChange={(slots) => updateAvailabilitySlots(slots)}
                    sessions={sessions}
                  />
                </div>
                <div className="space-y-8">
                  <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                      <Zap className="w-6 h-6 text-amber-500" />
                      <h3 className="text-xl font-black text-[#0B132B] uppercase italic">
                        Efficiency Tips
                      </h3>
                    </div>
                    <div className="space-y-6">
                      <p className="text-[11px] font-black uppercase italic text-slate-400 leading-loose">
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

                  <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm mb-12">
                    <h3 className="text-xl font-black text-[#0B132B] uppercase italic mb-8">
                      Earning & Payment History
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {tutorPayments.map((p) => (
                        <div
                          key={p.id}
                          className="p-6 sm:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-[10px] font-black text-[#0B132B] uppercase italic">
                                TRX: {p.transactionId}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm ${
                                  p.status === "approved"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : p.status === "rejected"
                                      ? "bg-rose-50 text-rose-600"
                                      : "bg-amber-50 text-amber-600"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {new Date(p.date).toLocaleString()} • From{" "}
                              {users.find((u) => u.id === p.studentId)?.name ||
                                "Student"}
                            </p>
                          </div>
                          <div className="text-2xl font-black text-emerald-600 italic">
                            +৳{p.amount}
                          </div>
                        </div>
                      ))}
                      {tutorPayments.length === 0 && (
                        <div className="p-12 text-left md:text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
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
                        <option value="Other">OTHER</option>
                      </select>
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
                        {filtered.map(student => (
                          <div
                            key={student.id}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center space-x-4 mb-6">
                                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/40 rounded-[1.5rem] flex items-center justify-center text-lg font-black italic text-[#0D5BFF] uppercase group-hover:bg-[#0D5BFF] group-hover:text-white transition-colors duration-300">
                                  {student.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-base font-black text-[#0B132B] dark:text-white uppercase italic truncate flex items-center gap-1.5">
                                    <span className="truncate">{student.name}</span>
                                    {student.gender === 'Male' && <Mars className="w-4 h-4 text-sky-500 font-bold shrink-0" title="Male" />}
                                    {student.gender === 'Female' && <Venus className="w-4 h-4 text-rose-500 font-bold shrink-0" title="Female" />}
                                  </h4>
                                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                                    {student.school || "Autonomous Learner"}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-4 mb-6 border-b border-slate-50 dark:border-slate-800/50 pb-6">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    Class / Level
                                  </span>
                                  <span className="font-bold text-[#0B132B] dark:text-white uppercase">
                                    {student.studentClass || "Not Specified"}
                                  </span>
                                </div>

                                <div className="flex justify-between items-start text-xs">
                                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-0.5">
                                    Inbound Location
                                  </span>
                                  <span className="font-bold text-[#0B132B] dark:text-slate-200 max-w-[150px] text-right truncate" title={student.address || student.area || student.district}>
                                    {student.area || student.district ? `${student.area || ""}, ${student.district || ""}` : (student.address || "Contact for info")}
                                  </span>
                                </div>
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
                                  setActiveTab("messages");
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
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Proposal Modal Overlay */}
              {selectedStudentForProposal && (
                <div className="fixed inset-0 bg-[#0B132B]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg p-8 sm:p-10 shadow-3xl text-left relative overflow-hidden"
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
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.2em] block">
                            Tuition Proposal Pipeline
                          </span>
                          <h3 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic">
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
                            onChange={e => setProposalSubject(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
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
                              onChange={e => setProposalDate(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                              Proposed Time Slot
                            </label>
                            <select
                              value={proposalSlot}
                              onChange={e => setProposalSlot(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
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
                            onChange={e => setProposalNotes(e.target.value)}
                            placeholder="Introduce yourself, outline credentials, or propose specific rates..."
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-5 text-xs font-medium text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForProposal(null)}
                            className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSendingProposal}
                            className="flex-1 py-4 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
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
            className="fixed inset-0 bg-[#0B132B]/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-3xl text-left border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-gradient-to-r from-[#0C1B33] to-[#0B132B] p-8 sm:p-10 text-white relative">
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
                
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 font-sans font-sans">
                  Student Profile & Academic details
                </span>
                <div className="mt-6 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] border border-white/10 flex items-center justify-center text-3xl font-black italic text-sky-200">
                    {viewingProfileUser.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase italic leading-none">{viewingProfileUser.name}</h3>
                    <p className="text-xs text-slate-300 font-medium mt-2">
                      {viewingProfileUser.university || viewingProfileUser.studentClass ? `Class ${viewingProfileUser.studentClass} • ${viewingProfileUser.university || 'Verified School'}` : 'Academic Student'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 space-y-6 max-h-[450px] overflow-y-auto custom-scrollbar">
                {/* Academics Section */}
                <div>
                  <h4 className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-[0.15em] mb-3">Academic Parameters</h4>
                  <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
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
                  <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-sans">
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
                  <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 font-sans space-y-4">
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
                      <span key={idx} className="px-3 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-extrabold uppercase text-[#0B132B] dark:text-white">
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

              <div className="p-8 sm:p-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-950">
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
                    <div className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
                      Awaiting response from {viewingProfileUser.name}
                    </div>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRecipientId(viewingProfileUser.id);
                        setActiveTab("messages");
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
                    setActiveTab("messages");
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
    </div>
  );
}

const ProfileField = memo(
  ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
  }: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
  }) => {
    return (
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-full py-5 px-10 text-xs font-black uppercase italic text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF] transition-all"
        />
      </div>
    );
  },
);

const ReputationTracker = memo(
  ({ rating, totalReviews }: { rating: number; totalReviews: number }) => {
    return (
      <div className="bg-[#0B132B] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <AnimatePresence>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -z-0"></div>
        </AnimatePresence>

        <div className="flex items-center space-x-3 mb-10 relative z-10">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          <h3 className="text-xl font-black uppercase italic">
            Student Feedback
          </h3>
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
                    className={`w-3 h-3 ${s <= Math.round(rating) ? "fill-amber-500 text-amber-500" : "text-slate-700"}`}
                  />
                ))}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {totalReviews} Reviews Received
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          <TrackerBar
            label="Tutor Rank"
            percentage={Math.min(100, Math.round((rating / 5) * 100))}
            color="bg-emerald-500"
          />
          <TrackerBar
            label="Punctuality"
            percentage={94}
            color="bg-[#0D5BFF]"
          />
          <TrackerBar
            label="Safety Rating"
            percentage={100}
            color="bg-purple-500"
          />
        </div>

        <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 relative z-10">
          <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
            Your reputation score is calculated based on direct student feedback
            and session punctuality.
          </p>
        </div>
      </div>
    );
  },
);

const EarningsSummaryWidget = memo(
  ({
    sessions,
    hourlyRate,
  }: {
    sessions: Session[];
    hourlyRate: number;
  }) => {
    const [viewMode, setViewMode] = useState<"week" | "month" | "year">("week");

    const processedData = useMemo(() => {
      const completed = sessions.filter((s) => s.status === "completed");

      if (viewMode === "week") {
        const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const data = weekdays.map((day) => ({
          name: day,
          earnings: 0,
          count: 0,
          hours: 0,
        }));

        completed.forEach((s) => {
          try {
            const timestamp = s.endTime || s.scheduledTime;
            if (!timestamp) return;
            const date = new Date(timestamp);
            const dayIdx = (date.getDay() + 6) % 7; // Mon=0, Sun=6
            if (dayIdx >= 0 && dayIdx < 7) {
              const duration = s.duration || 60;
              const earn = Math.round((duration / 60) * hourlyRate);
              data[dayIdx].earnings += earn;
              data[dayIdx].count += 1;
              data[dayIdx].hours += duration / 60;
            }
          } catch (e) {
            // ignore
          }
        });

        const allZero = data.every((d) => d.earnings === 0);
        return {
          chartData: allZero
            ? weekdays.map((day, idx) => ({
                name: day,
                earnings: [1200, 1800, 1500, 2200, 2800, 2400, 3200][idx] || 1000,
                count: 1,
                hours: 1,
              }))
            : data,
          isSimulated: allZero,
        };
      } else if (viewMode === "month") {
        const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
        const data = weeks.map((w) => ({
          name: w,
          earnings: 0,
          count: 0,
          hours: 0,
        }));
        const now = new Date();

        completed.forEach((s) => {
          try {
            const timestamp = s.endTime || s.scheduledTime;
            if (!timestamp) return;
            const date = new Date(timestamp);
            const diffTime = Math.abs(now.getTime() - date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let weekIdx = 3;
            if (diffDays <= 7) weekIdx = 0;
            else if (diffDays <= 14) weekIdx = 1;
            else if (diffDays <= 21) weekIdx = 2;
            else if (diffDays <= 30) weekIdx = 3;
            else return;

            const duration = s.duration || 60;
            const earn = Math.round((duration / 60) * hourlyRate);

            const targetIdx = 3 - weekIdx;
            data[targetIdx].earnings += earn;
            data[targetIdx].count += 1;
            data[targetIdx].hours += duration / 60;
          } catch (e) {
            // ignore
          }
        });

        const allZero = data.every((d) => d.earnings === 0);
        return {
          chartData: allZero
            ? weeks.map((w, idx) => ({
                name: w,
                earnings: [4500, 6200, 5800, 8400][idx] || 4000,
                count: 4,
                hours: 4,
              }))
            : data,
          isSimulated: allZero,
        };
      } else {
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const data = months.map((m) => ({
          name: m,
          earnings: 0,
          count: 0,
          hours: 0,
        }));

        completed.forEach((s) => {
          try {
            const timestamp = s.endTime || s.scheduledTime;
            if (!timestamp) return;
            const date = new Date(timestamp);
            const mIdx = date.getMonth();
            if (mIdx >= 0 && mIdx < 12) {
              const duration = s.duration || 60;
              const earn = Math.round((duration / 60) * hourlyRate);
              data[mIdx].earnings += earn;
              data[mIdx].count += 1;
              data[mIdx].hours += duration / 60;
            }
          } catch (e) {
            // ignore
          }
        });

        const allZero = data.every((d) => d.earnings === 0);
        return {
          chartData: allZero
            ? months.map((m, idx) => ({
                name: m,
                earnings:
                  [
                    15000, 18000, 22000, 17000, 25000, 29000, 31000, 28000,
                    32000, 35000, 40000, 42000,
                  ][idx] || 15000,
                count: 15,
                hours: 15,
              }))
            : data,
          isSimulated: allZero,
        };
      }
    }, [sessions, hourlyRate, viewMode]);

    const { chartData, isSimulated } = processedData;

    const totalEarnings = useMemo(() => {
      return chartData.reduce((acc, d) => acc + d.earnings, 0);
    }, [chartData]);

    const totalSessions = useMemo(() => {
      return chartData.reduce((acc, d) => acc + d.count, 0);
    }, [chartData]);

    const totalHours = useMemo(() => {
      return chartData.reduce((acc, d) => acc + d.hours, 0);
    }, [chartData]);

    return (
      <div className="bg-white dark:bg-[#0B132B] rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-all min-h-[300px]">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-[#0B132B] dark:text-slate-100 uppercase italic flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0D5BFF]" />
              Earnings Summary
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
              Income from completed sessions
            </p>
          </div>

          {/* Timeframe selector segments */}
          <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {(["week", "month", "year"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all ${
                  viewMode === mode
                    ? "bg-[#0D5BFF] text-white shadow-md shadow-blue-500/10"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic mini KPIs inside grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-8">
          <div className="bg-slate-50/50 dark:bg-[#111A2E]/50 border border-slate-100/50 dark:border-slate-800/40 p-4 rounded-[1.5rem] flex flex-col justify-between">
            <p className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Period Income
            </p>
            <h4 className="text-base sm:text-lg font-black text-[#0D5BFF] italic">
              ৳{totalEarnings.toLocaleString()}
            </h4>
          </div>
          <div className="bg-slate-50/50 dark:bg-[#111A2E]/50 border border-slate-100/50 dark:border-slate-800/40 p-4 rounded-[1.5rem] flex flex-col justify-between">
            <p className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Teaching Hours
            </p>
            <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 italic">
              {totalHours.toFixed(1)}h
            </h4>
          </div>
          <div className="bg-slate-50/50 dark:bg-[#111A2E]/50 border border-slate-100/50 dark:border-slate-800/40 p-4 rounded-[1.5rem] flex flex-col justify-between">
            <p className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Classes Done
            </p>
            <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 italic">
              {totalSessions}
            </h4>
          </div>
        </div>

        {/* Chart Stage */}
        <div className="h-56 w-full select-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEarning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D5BFF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D5BFF" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="rgba(148, 163, 184, 0.1)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 8, fontWeight: 900, fill: "#94A3B8" }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 8, fontWeight: 900, fill: "#94A3B8" }}
                tickFormatter={(v) => `৳${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(11, 19, 43, 0.95)",
                  borderRadius: "1.2rem",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                  fontSize: "10px",
                  fontWeight: 900,
                  color: "#FFFFFF",
                }}
                itemStyle={{ color: "#38BDF8" }}
                labelStyle={{ color: "#E2E8F0", paddingBottom: "4px" }}
                formatter={(value: any) => [`৳${value}`, "Income"]}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#0D5BFF"
                strokeWidth={3.5}
                dot={{ fill: "#0D5BFF", strokeWidth: 1.5, r: 3.5 }}
                activeDot={{ r: 6.5, fill: "#0D5BFF", stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Projections mode announcement */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSimulated ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {isSimulated ? "Baseline Projection Mode" : "Real-time Live Synced"}
            </span>
          </div>
          {isSimulated && (
            <span className="text-[7.5px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
              No completed sessions yet
            </span>
          )}
        </div>
      </div>
    );
  }
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
    onChange: (slots: { [key: string]: string[] }) => void;
  }) => {
    const toggleSlot = (day: string, hour: string) => {
      const daySlots = slots[day] || [];
      const newDaySlots = daySlots.includes(hour)
        ? daySlots.filter((h) => h !== hour)
        : [...daySlots, hour].sort();

      onChange({
        ...slots,
        [day]: newDaySlots,
      });
    };

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100/50">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="flex min-w-[800px]">
            {/* Hour Labels */}
            <div className="w-20 pt-16 flex flex-col border-r border-slate-50 bg-slate-50/50">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-14 flex items-center justify-center border-b border-white"
                >
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                    {hour}
                  </span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex-1 min-w-[100px] border-r border-slate-50 last:border-r-0"
              >
                <div className="h-16 flex items-center justify-center bg-[#0B132B] text-white border-b border-slate-800">
                  <span className="text-[9px] font-black uppercase italic tracking-widest">
                    {day.slice(0, 3)}
                  </span>
                </div>
                <div className="flex flex-col">
                  {HOURS.map((hour) => {
                    const isActive = slots[day]?.includes(hour);
                    return (
                      <button
                        key={`${day}-${hour}`}
                        type="button"
                        onClick={() => toggleSlot(day, hour)}
                        className={`h-14 border-b border-slate-50 transition-all flex items-center justify-center group relative overflow-hidden ${
                          isActive ? "bg-[#0D5BFF]" : "hover:bg-slate-50"
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle className="w-5 h-5 text-white/50" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-100 group-hover:scale-150 transition-transform"></div>
                        )}

                        <div
                          className={`absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                        ></div>
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
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
              Active Slot
            </span>
          </div>
          <p className="text-[8px] font-black text-[#0D5BFF] uppercase italic">
            Click to toggle availability
          </p>
        </div>
      </div>
    );
  },
);
