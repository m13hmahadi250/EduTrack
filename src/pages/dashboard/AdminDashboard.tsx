import { useAppStore, User } from "../../store";
import {
  CheckCircle,
  XCircle,
  Shield,
  CreditCard,
  Users,
  History,
  Bell,
  Search,
  Wallet,
  ArrowDownCircle,
  FileText,
  Activity,
  Zap,
  Sparkles,
  LayoutDashboard,
  GraduationCap,
  Mail,
  MessageSquare,
  User as UserIcon,
  Megaphone,
  Smartphone,
  Download,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AdminAnalytics = lazy(() => import("../../components/admin/AdminAnalytics"));
const AdminUserDirectory = lazy(() => import("../../components/admin/AdminUserDirectory"));
const AdminSessionAudits = lazy(() => import("../../components/admin/AdminSessionAudits"));
const AdminMongoDatabase = lazy(() => import("../../components/admin/AdminMongoDatabase"));
const ImageUpload = lazy(() => import("../../components/ImageUpload"));
const ChatWindow = lazy(() => import("../../components/ChatWindow"));

export default function AdminDashboard() {
  const {
    users,
    payments,
    sessions,
    verifyTutor,
    approvePayment,
    rejectPayment,
    withdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    sendNotification,
    sendMessage,
    currentUser,
    updateUser,
    cancelSession,
    messages,
    promotionalBannerText,
    updatePromotionalBannerText,
    androidAppLink,
    updateAndroidAppLink,
  } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo<
    "verifications" | "payments" | "withdrawals" | "analytics" | "users" | "sessions" | "messages" | "account" | "banner" | "downloads" | "mongodb"
  >(() => {
    const path = location.pathname;
    if (path.endsWith("/verifications")) return "verifications";
    if (path.endsWith("/payments")) return "payments";
    if (path.endsWith("/withdrawals")) return "withdrawals";
    if (path.endsWith("/users")) return "users";
    if (path.endsWith("/sessions")) return "sessions";
    if (path.endsWith("/messages")) return "messages";
    if (path.endsWith("/analytics")) return "analytics";
    if (path.endsWith("/banner")) return "banner";
    if (path.endsWith("/downloads")) return "downloads";
    if (path.endsWith("/mongodb")) return "mongodb";
    if (path.endsWith("/account") || path.endsWith("/profile")) return "account";
    return "users";
  }, [location.pathname]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [messagesSearch, setMessagesSearch] = useState("");
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);
  const [approvedAnim, setApprovedAnim] = useState<{
    type: "nid" | "academic" | null;
  }>({ type: null });
  const [activeDocTab, setActiveDocTab] = useState<"nid" | "academic">("nid");
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const [downloadAttempts, setDownloadAttempts] = useState<any[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "downloads") return;

    let unsubscribe = () => {};

    const loadAttempts = async () => {
      setDownloadsLoading(true);
      try {
        const { collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");
        
        const q = query(collection(db, "download_attempts"), orderBy("timestamp", "desc"));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setDownloadAttempts(list);
          setDownloadsLoading(false);
        }, (error) => {
          console.error("Error subscribing to download attempts:", error);
          setDownloadsLoading(false);
        });
      } catch (error) {
        console.error("Failed to load firestore SDK for download attempts:", error);
        setDownloadsLoading(false);
      }
    };

    loadAttempts();
    return () => unsubscribe();
  }, [activeTab]);

  const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelectTutor = (tutorId: string) => {
    setSelectedTutorIds((prev) =>
      prev.includes(tutorId)
        ? prev.filter((id) => id !== tutorId)
        : [...prev, tutorId]
    );
  };

  const toggleSelectAllTutors = () => {
    if (tutors.length === 0) return;
    if (selectedTutorIds.length === tutors.length) {
      setSelectedTutorIds([]);
    } else {
      setSelectedTutorIds(tutors.map((t) => t.id));
    }
  };

  const handleBulkAction = async (status: "approved" | "rejected") => {
    if (selectedTutorIds.length === 0) return;
    const confirmAction = window.confirm(
      `Are you sure you want to bulk ${status === "approved" ? "approve" : "reject"} the ${selectedTutorIds.length} selected experts?`
    );
    if (!confirmAction) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedTutorIds.map(async (tutorId) => {
          await verifyTutor(tutorId, "nid", status);
          await verifyTutor(tutorId, "academic", status);
        })
      );

      if (selectedTutor && selectedTutorIds.includes(selectedTutor.id)) {
        setSelectedTutor((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            nidStatus: status,
            academicStatus: status,
          };
        });
      }

      setSelectedTutorIds([]);
      alert(`Bulk ${status} operation completed successfully.`);
    } catch (err) {
      console.error(err);
      alert("Failed to complete bulk operation.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleVerifyTutor = async (
    tutorId: string,
    type: "nid" | "academic",
    status: "approved" | "rejected",
  ) => {
    try {
      await verifyTutor(tutorId, type, status);
      setSelectedTutor((prev) => {
        if (!prev || prev.id !== tutorId) return prev;
        return {
          ...prev,
          [type === "nid" ? "nidStatus" : "academicStatus"]: status,
        };
      });
      if (status === "approved") {
        setApprovedAnim({ type });
        setTimeout(() => {
          setApprovedAnim({ type: null });
        }, 2200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Active tab is derived directly from route location to avoid double-rendering delays

  const handleTabChange = (
    tab: "analytics" | "verifications" | "payments" | "withdrawals" | "users" | "sessions" | "messages" | "account" | "banner" | "downloads" | "mongodb",
  ) => {
    setSelectedTutorIds([]);
    const pathMap: Record<string, string> = {
      users: "/dashboard",
      verifications: "/dashboard/verifications",
      payments: "/dashboard/payments",
      withdrawals: "/dashboard/withdrawals",
      analytics: "/dashboard/analytics",
      sessions: "/dashboard/sessions",
      messages: "/dashboard/messages",
      account: "/dashboard/account",
      banner: "/dashboard/banner",
      downloads: "/dashboard/downloads",
      mongodb: "/dashboard/mongodb",
    };
    if (pathMap[tab]) {
      navigate(pathMap[tab]);
    }
  };

  const promptForBio = async (tutor: User) => {
    try {
      await sendNotification(
        tutor.id,
        "Bio Required",
        "Please update your professional bio to help students learn more about your expertise.",
        "warning",
      );

      if (currentUser) {
        await sendMessage({
          senderId: currentUser.id,
          receiverId: tutor.id,
          content:
            "Hello! We noticed your profile is missing a bio. A professional bio significantly increases your booking rate. Please head to your profile settings and add a brief description of your experience and teaching style.",
        });
      }

      alert(`Prompt sent to ${tutor.name}`);
    } catch (error) {
      console.error("Failed to send prompt:", error);
    }
  };

  const tutors = useMemo(() => {
    const tutorMap = new Map();
    users
      .filter((u) => u.role === "tutor")
      .forEach((tutor) => {
        if (!tutorMap.has(tutor.id)) {
          tutorMap.set(tutor.id, tutor);
        }
      });
    return Array.from(tutorMap.values());
  }, [users]);

  const pendingPayments = useMemo(() => {
    const paymentMap = new Map();
    payments
      .filter((p) => p.status === "pending")
      .forEach((p) => {
        if (!paymentMap.has(p.id)) {
          paymentMap.set(p.id, p);
        }
      });
    return Array.from(paymentMap.values());
  }, [payments]);

  const pendingWithdrawals = useMemo(() => {
    const withdrawalMap = new Map();
    withdrawals
      .filter((w) => w.status === "pending")
      .forEach((w) => {
        if (!withdrawalMap.has(w.id)) {
          withdrawalMap.set(w.id, w);
        }
      });
    return Array.from(withdrawalMap.values());
  }, [withdrawals]);

  const allPayments = useMemo(() => {
    const paymentMap = new Map();
    payments.forEach((p) => {
      if (!paymentMap.has(p.id)) {
        paymentMap.set(p.id, p);
      }
    });
    return Array.from(paymentMap.values());
  }, [payments]);

  if (!currentUser) return null;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4 text-balance">
            Admin Account
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-[#0B132B] uppercase tracking-[0.2em] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0D5BFF]" />
            Welcome,{" "}
            <span className="font-black text-[#0D5BFF] italic">
              {currentUser.name}
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-[#0B132B] text-white px-8 py-4 rounded-[2rem] flex items-center space-x-4 shadow-2xl">
            <Activity className="w-5 h-5 text-[#0D5BFF]" />
            <div className="border-l border-white/10 pl-4">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-emerald-400">
                System Active
              </p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                Official Command node
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col justify-between h-48 sm:h-56 shadow-sm overflow-hidden relative group transition-all hover:border-[#0D5BFF]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] flex items-center justify-center -mr-4 -mt-4 transition-colors group-hover:bg-blue-50">
            <Users className="w-8 h-8 text-slate-200 group-hover:text-[#0D5BFF]" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Total Payload
            </p>
            <h3 className="text-4xl font-black italic text-[#0B132B]">
              {tutors.length}
            </h3>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
            Registered Tutors
          </p>
        </div>

        <div className="lg:col-span-1 bg-[#0D5BFF] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col justify-between h-48 sm:h-56 shadow-2xl relative overflow-hidden group">
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
          <Shield className="w-8 h-8 text-white/20 mb-4" />
          <div>
            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">
              Awaiting Review
            </p>
            <h3 className="text-4xl font-black italic text-white">
              {
                tutors.filter(
                  (t) =>
                    t.nidStatus !== "approved" ||
                    t.academicStatus !== "approved",
                ).length
              }
            </h3>
          </div>
          <p className="text-[10px] font-black text-white/80 uppercase tracking-widest italic">
            Verification Queue
          </p>
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col justify-between h-48 sm:h-56 shadow-sm group hover:border-amber-400">
          <Zap
            className={`w-8 h-8 ${pendingPayments.length > 0 ? "text-amber-500 animate-pulse" : "text-slate-200"}`}
          />
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Liquid Stream
            </p>
            <h3 className="text-4xl font-black italic text-[#0B132B]">
              {pendingPayments.length}
            </h3>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
            Pending Clearances
          </p>
        </div>

        <div className="lg:col-span-1 border-4 border-dashed border-slate-100 rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-10 flex flex-col justify-between h-48 sm:h-56 text-left md:text-center group hover:bg-slate-50 transition-all">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center ml-0 mr-auto md:mx-auto shadow-lg border border-slate-50 transition-transform group-hover:rotate-12">
            <Wallet className="w-6 h-6 text-[#0D5BFF]" />
          </div>
          <div>
            <h3 className="text-3xl font-black italic text-[#0B132B]">
              {pendingWithdrawals.length}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
              Withdrawal Hooks
            </p>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Adaptive Grid Selector (All Panels Fully Visible) */}
      <div className="lg:hidden block mb-6" id="admin-mobile-tablet-tab-matrix">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 italic">
          Quick Navigation Command Board
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: "analytics", label: "Command Center", icon: LayoutDashboard },
            { id: "users", label: "User directory", icon: Users },
            { id: "verifications", label: "Identity protocol", icon: Shield },
            { id: "payments", label: "Inbound revenue", icon: CreditCard },
            { id: "withdrawals", label: "Tutor payouts", icon: Wallet },
            { id: "sessions", label: "Session audits", icon: History },
            { id: "messages", label: "Secure messages", icon: MessageSquare },
            { id: "banner", label: "Promo Banner", icon: Megaphone },
            { id: "downloads", label: "App Downloads", icon: Smartphone },
            { id: "mongodb", label: "MongoDB Secondary DB", icon: Database },
            { id: "account", label: "Admin profile", icon: UserIcon },
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
                id={`admin-tab-btn-${tab.id}`}
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

      {/* Navigation Matrix */}
      <div className="lg:flex hidden space-x-6 sm:space-x-12 border-b-2 border-slate-100 px-4 overflow-x-auto hide-scrollbar">
        {[
          { id: "users", label: "User directory" },
          { id: "verifications", label: "Identity protocol" },
          { id: "analytics", label: "Command Center" },
          { id: "payments", label: "Inbound revenue" },
          { id: "withdrawals", label: "Tutor payouts" },
          { id: "sessions", label: "Session audits" },
          { id: "messages", label: "Secure messages" },
          { id: "banner", label: "Promo Banner" },
          { id: "downloads", label: "App Downloads" },
          { id: "mongodb", label: "MongoDB Secondary DB" },
          { id: "account", label: "Admin profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`text-[10px] font-black font-heading uppercase tracking-[0.3em] italic pb-6 transition-all relative ${
              activeTab === tab.id
                ? "text-[#0B132B]"
                : "text-[#0B132B]/30 hover:text-[#0B132B]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tabUnderlineAdmin"
                className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#0D5BFF]"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
              <AdminAnalytics 
                users={users} 
                payments={payments} 
                withdrawals={withdrawals} 
                sessions={sessions} 
              />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
              <AdminUserDirectory 
                users={users} 
                updateUser={updateUser} 
                currentUser={currentUser} 
                onMessageUser={(userId) => {
                  setSelectedRecipientId(userId);
                  handleTabChange("messages");
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "messages" && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Contacts list side column */}
            <div className={`lg:col-span-1 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col ${selectedRecipientId ? 'hidden lg:flex' : 'flex'} min-h-[400px] h-[600px]`}>
              <div className="mb-4">
                <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.2em] block mb-1">Administrative Channels</span>
                <h3 className="text-sm font-black uppercase text-[#0B132B] tracking-wider italic mb-4">
                  Active Links
                </h3>
                {/* Search Bar for Contacts */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search any user or role..."
                    value={messagesSearch}
                    onChange={(e) => setMessagesSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-[#0B132B] focus:outline-none focus:ring-1 focus:ring-[#0D5BFF] placeholder-slate-400 text-ellipsis"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar hide-scrollbar">
                {(() => {
                  const adminContacts = users.filter(u => {
                    if (u.id === currentUser.id) return false;
                    
                    // If searching, search in email, name, role, university
                    if (messagesSearch.trim()) {
                      const s = messagesSearch.toLowerCase();
                      return u.name.toLowerCase().includes(s) || 
                             u.role.toLowerCase().includes(s) || 
                             u.email.toLowerCase().includes(s) ||
                             (u.university && u.university.toLowerCase().includes(s));
                    }
                    
                    // Otherwise, only show users we have conversation history with
                    const hasMessages = messages.some(m => 
                      m.participants.includes(currentUser.id) && m.participants.includes(u.id)
                    );
                    return hasMessages;
                  }).sort((a, b) => {
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

                  if (adminContacts.length === 0) {
                    return (
                      <div className="py-20 text-center opacity-40">
                        <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {messagesSearch ? "No active users match criteria." : "No message handshakes. Search above to find any user."}
                        </p>
                      </div>
                    );
                  }

                  return adminContacts.map((contact) => {
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
                        className={`w-full p-4 rounded-[2rem] border transition-all flex items-center gap-3 text-left group relative cursor-pointer ${
                          selectedRecipientId === contact.id
                            ? "bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-xl shadow-blue-150"
                            : "bg-white border-slate-50 text-[#0B132B] hover:border-slate-200"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black italic border ${
                              selectedRecipientId === contact.id
                                ? "bg-white/20 border-white/10"
                                : "bg-slate-50 border-slate-100"
                            }`}
                          >
                            {contact.name.charAt(0)}
                          </div>
                          {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#E51275] text-white text-[8px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-bounce shadow-md">
                              {unreadCount}
                            </span>
                          )}
                          {isContactOnline && (
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-sm" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black italic truncate">
                              {contact.name}
                            </h4>
                            <span className={`text-[7px] shrink-0 font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${
                              selectedRecipientId === contact.id 
                                ? 'bg-white/20 text-white' 
                                : contact.role === 'tutor' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {contact.role}
                            </span>
                          </div>
                          <p
                            className={`text-[8px] font-semibold tracking-wider truncate mt-0.5 ${
                              selectedRecipientId === contact.id
                                ? "opacity-75"
                                : "text-slate-400"
                            }`}
                          >
                            {contact.email}
                          </p>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Chat conversation area */}
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
                <div className="h-[600px] bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200/60 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100 mb-6">
                    <MessageSquare className="w-8 h-8 text-[#0D5BFF]" />
                  </div>
                  <h4 className="text-sm font-black text-[#0B132B] uppercase tracking-widest italic mb-2">
                    Secure Chat Terminal
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider max-w-[280px]">
                    Select an active channel from the left sidebar or search to initiate the administrative hotline.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "sessions" && (
          <motion.div
            key="sessions"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
              <AdminSessionAudits 
                sessions={sessions} 
                users={users} 
                cancelSession={cancelSession} 
                sendNotification={sendNotification} 
              />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "verifications" && (
          <motion.div
            key="verifications"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Bulk Actions Control Bar */}
            {tutors.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border border-slate-150 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="select-all-tutors-header"
                    checked={tutors.length > 0 && selectedTutorIds.length === tutors.length}
                    onChange={toggleSelectAllTutors}
                    className="w-5 h-5 rounded border-slate-300 text-[#0D5BFF] focus:ring-[#0D5BFF] cursor-pointer accent-[#0D5BFF]"
                  />
                  <label
                    htmlFor="select-all-tutors-header"
                    className="text-[10px] sm:text-xs font-black text-[#0B132B] uppercase tracking-wider cursor-pointer select-none"
                  >
                    Select All Experts ({selectedTutorIds.length} of {tutors.length} selected)
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={selectedTutorIds.length === 0 || bulkLoading}
                    onClick={() => handleBulkAction("approved")}
                    className={`px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      selectedTutorIds.length === 0 || bulkLoading
                        ? "opacity-40 cursor-not-allowed"
                        : "shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {bulkLoading ? "Approving..." : "Bulk Approve Selected"}
                  </button>
                  <button
                    disabled={selectedTutorIds.length === 0 || bulkLoading}
                    onClick={() => handleBulkAction("rejected")}
                    className={`px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      selectedTutorIds.length === 0 || bulkLoading
                        ? "opacity-40 cursor-not-allowed"
                        : "shadow-md shadow-rose-600/10 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    {bulkLoading ? "Rejecting..." : "Bulk Reject Selected"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-1 gap-8">
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="bg-white rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-12 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 sm:gap-8 lg:gap-12 group transition-all hover:shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 lg:gap-8 text-center sm:text-left w-full">
                    {/* Multi-select Checkbox */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="flex items-center justify-center shrink-0 p-2 rounded-xl bg-slate-50 border border-slate-150 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer mr-0 sm:mr-4 self-center"
                    >
                      <input
                        type="checkbox"
                        id={`select-tutor-${tutor.id}`}
                        checked={selectedTutorIds.includes(tutor.id)}
                        onChange={() => toggleSelectTutor(tutor.id)}
                        className="w-5 h-5 rounded border-slate-300 text-[#0D5BFF] focus:ring-[#0D5BFF] cursor-pointer accent-[#0D5BFF] transition-transform duration-250 checked:scale-110"
                      />
                    </div>

                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-slate-50 rounded-[1.5rem] sm:rounded-[2.5rem] border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black italic text-slate-300 group-hover:text-[#0D5BFF] transition-colors overflow-hidden shrink-0">
                      {tutor.profileImage ? (
                        <img
                          src={tutor.profileImage}
                          alt={tutor.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        tutor.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base sm:text-lg md:text-xl font-black text-[#0B132B] uppercase italic">
                        {tutor.name}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose truncate">
                        {tutor.university || "Independent Expert"}
                      </p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3 sm:mt-4">
                        <span
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[8.5px] font-black uppercase tracking-widest border flex items-center gap-1.5 sm:gap-2 ${
                            tutor.nidStatus === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : tutor.nidStatus === "rejected"
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              tutor.nidStatus === "approved"
                                ? "bg-emerald-500"
                                : tutor.nidStatus === "rejected"
                                  ? "bg-rose-500"
                                  : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          NID: {tutor.nidStatus || "Pending"}
                        </span>

                        <span
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[8.5px] font-black uppercase tracking-widest border flex items-center gap-1.5 sm:gap-2 ${
                            tutor.academicStatus === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : tutor.academicStatus === "rejected"
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              tutor.academicStatus === "approved"
                                ? "bg-emerald-500"
                                : tutor.academicStatus === "rejected"
                                  ? "bg-rose-500"
                                  : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          Acad: {tutor.academicStatus || "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto">
                    <div className="p-4 sm:p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3 sm:space-y-4 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Protocol Actions
                      </p>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setSelectedTutor(tutor)}
                          className="w-full sm:w-auto px-6 py-3 bg-[#0B132B] text-white rounded-xl text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-[#0D5BFF] transition-all whitespace-nowrap"
                        >
                          Open Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "payments" && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="bg-[#0B132B] rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 lg:p-16 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#0D5BFF]/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 mb-8 sm:mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6 text-[#0D5BFF]" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic">
                    Audit Pending Stream
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Total Volume Pending
                  </p>
                  <p className="text-2xl font-black text-white italic">
                    ৳
                    {pendingPayments
                      .reduce((acc, curr) => acc + curr.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white/5 rounded-[1.8rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border border-white/5 hover:bg-white/[0.08] transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-8 flex-1 min-w-0">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="text-[10px] font-black font-mono text-[#0D5BFF] bg-blue-500/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-blue-500/20 truncate w-fit">
                          TRX: {payment.transactionId}
                        </div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2 sm:pl-4 truncate">
                          Sender: {payment.bKashNumber}
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white italic shrink-0 self-start sm:self-center">
                        ৳{payment.amount}
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button
                        onClick={() => approvePayment(payment.id)}
                        className="flex-grow md:flex-initial px-4 sm:px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase italic shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                      >
                        Authorize
                      </button>
                      <button
                        onClick={() => rejectPayment(payment.id)}
                        className="flex-grow md:flex-initial px-4 sm:px-8 py-3 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase italic hover:bg-rose-500 hover:text-white transition-all whitespace-nowrap"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {pendingPayments.length === 0 && (
                  <div className="py-20 text-left md:text-center opacity-30">
                    <Zap className="w-12 h-12 text-white ml-0 mr-auto md:mx-auto mb-6" />
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.4em]">
                      All inbound signals cleared
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "withdrawals" && (
          <motion.div
            key="withdrawals"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-12"
          >
            <div className="bg-[#0B132B] rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 lg:p-16 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0D5BFF]/10 to-transparent"></div>
              <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-8">
                <div>
                  <h3 className="text-xl sm:text-3xl font-black text-white uppercase italic mb-2 tracking-tighter">
                    Treasury: Outbound Queue
                  </h3>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] font-heading">
                    Awaiting Expert Fund Clearance
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 px-6 py-5 sm:px-10 sm:py-8 rounded-[1.8rem] sm:rounded-[3rem] text-left sm:text-right group hover:border-[#0D5BFF] transition-all">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 font-heading">
                    Total Withdrawal Exposure
                  </p>
                  <h4 className="text-3xl sm:text-5xl font-black text-white italic">
                    ৳
                    {pendingWithdrawals
                      .reduce((acc, curr) => acc + curr.amount, 0)
                      .toLocaleString()}
                  </h4>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {pendingWithdrawals.map((req) => {
                const tutor = users.find((u) => u.id === req.tutorId);
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-12 border border-slate-100 shadow-sm flex flex-col justify-between min-h-0 lg:min-h-[28rem] transition-all hover:shadow-xl group relative"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -z-0"></div>
                    <div className="relative z-10">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-[1.2rem] sm:rounded-[2rem] flex items-center justify-center font-black italic text-[#0D5BFF] border border-slate-100 group-hover:scale-110 transition-transform shrink-0">
                            {tutor?.name?.charAt(0) || "E"}
                          </div>
                          <div>
                            <h4 className="text-lg sm:text-xl font-black text-[#0B132B] uppercase italic leading-none mb-2 break-words max-w-[150px] sm:max-w-[200px]">
                              {tutor?.name || "Expert"}
                            </h4>
                            <div className="flex flex-col gap-1">
                              <p className="text-[9px] sm:text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg w-fit">
                                {req.paymentMethod?.toUpperCase()} CHANNEL:{" "}
                                {req.bKashNumber}
                              </p>
                              <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                Requested:{" "}
                                {new Date(req.timestamp).toLocaleString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0B132B] italic shrink-0 self-start sm:self-center">
                          ৳{req.amount}
                        </div>
                      </div>
                      <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6 sm:mb-8 italic">
                        <textarea
                          placeholder="ADD AUDIT NOTE (OPTIONAL)..."
                          className="w-full bg-transparent text-[10px] font-bold uppercase tracking-widest border-none focus:outline-none placeholder:text-slate-300 resize-none min-h-[4rem] sm:min-h-[5rem] text-[#0B132B]"
                          id={`note-${req.id}`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 relative z-10 mt-auto pt-6 border-t border-slate-50">
                      <button
                        onClick={() => {
                          const note = (
                            document.getElementById(
                              `note-${req.id}`,
                            ) as HTMLTextAreaElement
                          )?.value;
                          approveWithdrawal(
                            req.id,
                            note || "Transaction verified and approved.",
                          );
                        }}
                        className="flex-1 py-5 bg-[#0D5BFF] text-white rounded-[1.5rem] font-black uppercase italic tracking-widest shadow-2xl shadow-blue-500/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve Payout
                      </button>
                      <button
                        onClick={() => {
                          const note = (
                            document.getElementById(
                              `note-${req.id}`,
                            ) as HTMLTextAreaElement
                          )?.value;
                          rejectWithdrawal(
                            req.id,
                            note ||
                              "The provided recipient details are invalid or inconsistent.",
                          );
                        }}
                        className="flex-1 py-5 bg-white border-2 border-slate-100 text-rose-500 rounded-[1.5rem] font-black uppercase italic tracking-widest hover:border-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center gap-3"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
              {pendingWithdrawals.length === 0 && (
                <div className="lg:col-span-2 py-40 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-start md:items-center justify-center text-left md:text-center p-8 opacity-30">
                  <Wallet className="w-16 h-16 text-slate-300 mb-8 ml-0 mr-auto md:mx-auto" />
                  <h4 className="text-2xl font-black text-[#0B132B] uppercase italic">
                    Queue Depleted
                  </h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                    No pending withdrawal hooks detected in sector
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "banner" && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-12 max-w-4xl mx-auto"
          >
            {/* Promotional Ticker Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 md:p-16 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
              <div className="mb-10">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 dark:border-amber-900/30">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white uppercase tracking-wider italic">
                  Promotional Banner Control
                </h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                  Configure live scrolling ticker announcements broadcasted globally to all users.
                </p>
              </div>

              {/* Live Ticker Mock Preview */}
              <div className="mb-12">
                <span className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3">
                  Live Broadcast Ticker Preview
                </span>
                <div className="bg-[#0B132B] dark:bg-slate-950 text-white py-4 rounded-3xl overflow-hidden whitespace-nowrap border border-white/5 relative shadow-inner">
                  <div className="flex items-center">
                    <div className="flex items-center space-x-12 px-12 animate-marquee">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center space-x-8 flex-shrink-0">
                          <span className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                            {promotionalBannerText || "YOUR ANNOUNCEMENT WILL APPEAR HERE..."}
                            <Zap className="w-4 h-4 text-[#0D5BFF] shrink-0" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner Editor Form */}
              <BannerEditorForm 
                currentText={promotionalBannerText} 
                onSave={updatePromotionalBannerText} 
              />
            </div>

            {/* Android App Link Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 md:p-16 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
              <div className="mb-10">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-900/30">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white uppercase tracking-wider italic">
                  Android Application Control
                </h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                  Update and manage the official Android application package (.apk) link.
                </p>
              </div>

              {/* App Link Editor Form */}
              <AppLinkEditorForm 
                currentLink={androidAppLink} 
                onSave={updateAndroidAppLink} 
              />
            </div>
          </motion.div>
        )}

        {activeTab === "downloads" && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Download Analytics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-bl-[2.5rem] flex items-center justify-center -mr-2 -mt-2">
                  <Download className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Total Downloads
                  </p>
                  <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white">
                    {downloadAttempts.length}
                  </h3>
                </div>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">
                  APK Clicks Recorded
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 dark:bg-blue-950/20 rounded-bl-[2.5rem] flex items-center justify-center -mr-2 -mt-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Promo Popup Clicks
                  </p>
                  <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white">
                    {downloadAttempts.filter(d => d.source === 'popup').length}
                  </h3>
                </div>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic">
                  Dismissible Lightbox conversion
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 dark:bg-amber-950/20 rounded-bl-[2.5rem] flex items-center justify-center -mr-2 -mt-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Footer Banner Clicks
                  </p>
                  <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white">
                    {downloadAttempts.filter(d => d.source === 'footer').length}
                  </h3>
                </div>
                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic">
                  Static placement interaction
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 dark:bg-purple-950/20 rounded-bl-[2.5rem] flex items-center justify-center -mr-2 -mt-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Footer Hero CTA Clicks
                  </p>
                  <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white">
                    {downloadAttempts.filter(d => d.source === 'footer_cta').length}
                  </h3>
                </div>
                <p className="text-[8px] font-black text-purple-500 uppercase tracking-widest italic">
                  Primary layout banner
                </p>
              </div>
            </div>

            {/* Android App Link Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 sm:p-10 md:p-12 shadow-sm transition-colors">
              <div className="mb-8">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-900/30">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white uppercase tracking-wider italic">
                  Android Application Control
                </h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                  Update and manage the official Android application package (.apk) link.
                </p>
              </div>

              {/* App Link Editor Form */}
              <AppLinkEditorForm 
                currentLink={androidAppLink} 
                onSave={updateAndroidAppLink} 
              />
            </div>

            {/* Audit Log Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.2em] block mb-1">Live Acquisition Channel Logs</span>
                  <h3 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic tracking-wider">
                    APK Download Ledger
                  </h3>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl">
                  Real-time Listening Active
                </div>
              </div>

              {downloadsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Synchronizing acquisition database...
                  </p>
                </div>
              ) : downloadAttempts.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    No Downloads Recorded
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-2">
                    App download logs will automatically show up here as clients interact with CTA buttons.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                    <thead>
                      <tr>
                        <th className="py-4 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Timestamp
                        </th>
                        <th className="py-4 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          User Ident
                        </th>
                        <th className="py-4 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Location Hook
                        </th>
                        <th className="py-4 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Platform / Client
                        </th>
                        <th className="py-4 text-right text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Attempt Identifier
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {downloadAttempts.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                          <td className="py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(attempt.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4">
                            {attempt.userEmail ? (
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-[#0B132B] dark:text-white">
                                  {attempt.userEmail}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                                  UID: {attempt.userId}
                                </span>
                              </div>
                            ) : (
                              <span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-full text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                                Anonymous Guest
                              </span>
                            )}
                          </td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-widest border shadow-sm ${
                              attempt.source === 'popup' 
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                                : attempt.source === 'footer_cta'
                                ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30'
                                : 'bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400 border-slate-100 dark:border-slate-800'
                            }`}>
                              {attempt.source}
                            </span>
                          </td>
                          <td className="py-4 max-w-[250px]">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                {attempt.platform}
                              </span>
                              <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold truncate hover:text-clip" title={attempt.userAgent}>
                                {attempt.userAgent || 'No Client Agent Header'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-right font-mono text-[9px] text-[#0D5BFF] dark:text-blue-400 font-black">
                            {attempt.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "mongodb" && (
          <motion.div
            key="mongodb"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
          >
            <Suspense fallback={<div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div></div>}>
              <AdminMongoDatabase />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "account" && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 md:p-16 border border-slate-100 shadow-sm max-w-4xl transition-colors mx-auto"
          >
             <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-6 mb-16">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left">
                   <Suspense fallback={<div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 animate-pulse" />}>
                     <ImageUpload 
                       currentImageUrl={currentUser.profileImage} 
                       onUpload={(url) => updateUser(currentUser.id, { profileImage: url })}
                       onDelete={() => updateUser(currentUser.id, { profileImage: "/admin_profile.png" })}
                     />
                   </Suspense>
                   <div>
                      <h3 className="text-3xl font-heading font-black text-[#0B132B] uppercase italic">Admin Credentials</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{currentUser.email}</p>
                   </div>
                </div>
             </div>

             <div className="space-y-8">
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                     <input 
                       type="text"
                       defaultValue={currentUser.name}
                       id="admin-settings-name"
                       className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#0B132B] uppercase tracking-wider focus:outline-none focus:border-[#0D5BFF]"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Role Authorization</label>
                     <input 
                       type="text"
                       value="ADMINISTRATOR"
                       disabled
                       className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider cursor-not-allowed"
                     />
                  </div>
               </div>

               <div className="flex justify-end pt-4">
                 <button 
                   onClick={async () => {
                     const nameInput = document.getElementById("admin-settings-name") as HTMLInputElement;
                     if (nameInput && nameInput.value.trim()) {
                       await updateUser(currentUser.id, { name: nameInput.value.trim() });
                     }
                   }}
                   className="px-8 py-4 bg-[#0D5BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
                 >
                    Confirm Changes
                 </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <AnimatePresence>
        {selectedTutor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTutor(null)}
              className="absolute inset-0 bg-[#0B132B]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[90vh] lg:h-auto max-h-[85vh] md:max-h-[90vh]"
            >
              <AnimatePresence>
                {approvedAnim.type && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0B132B]/95 z-[110] flex flex-col items-center justify-center p-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-emerald-500/40"
                    >
                      <CheckCircle className="w-12 h-12" />
                    </motion.div>
                    <motion.h4
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-wider"
                    >
                      {approvedAnim.type === "nid"
                        ? "NID Verification Authorized"
                        : "Academic Credentials Authorized"}
                    </motion.h4>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 0.7 }}
                      className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3"
                    >
                      Global ledger & tutor protocols synchronized successfully
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Left Column: Info */}
              <div className="flex-1 p-6 sm:p-10 md:p-12 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-slate-100 h-1/2 md:h-auto">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl font-black italic text-[#0D5BFF] shadow-inner overflow-hidden">
                    {selectedTutor.profileImage ? (
                      <img
                        src={selectedTutor.profileImage}
                        alt={selectedTutor.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      selectedTutor.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[#0B132B] uppercase italic leading-none mb-2">
                      {selectedTutor.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {selectedTutor.university || "Expert Profile"}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">
                      Professional Bio
                    </p>
                    <div className="relative group">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-4 border-[#0D5BFF] pl-4 bg-slate-50 py-4 rounded-r-2xl">
                        "
                        {selectedTutor.bio ||
                          "This expert has not provided a bio description yet. Verification should proceed based on credentials."}
                        "
                      </p>
                      {!selectedTutor.bio && (
                        <button
                          onClick={() => promptForBio(selectedTutor)}
                          className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-100"
                        >
                          <Bell className="w-3 h-3" />
                          Prompt for Bio
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Email Node
                      </p>
                      <p className="text-[10px] font-bold text-[#0B132B] truncate">
                        {selectedTutor.email}
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Direct Phone Contact
                      </p>
                      <p className="text-[10px] font-bold text-[#0B132B] font-mono">
                        {selectedTutor.phone || "Not Set"}
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Expertise
                      </p>
                      <p className="text-[10px] font-bold text-[#0B132B]">
                        {selectedTutor.course || "Expert"}
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        NID Number
                      </p>
                      <p className="text-[10px] font-bold text-[#0B132B] font-mono">
                        {selectedTutor.nidNumber || "Not Provided"}
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Birth Date
                      </p>
                      <p className="text-[10px] font-bold text-[#0B132B]">
                        {selectedTutor.birthDate || "Not Provided"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      Verification Protocol Check
                    </p>
                    <div className="space-y-4">
                      {/* NID Section */}
                      <div className={`p-6 rounded-3xl border space-y-4 transition-all duration-500 ${
                        selectedTutor.nidStatus === "approved"
                          ? "bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                          : selectedTutor.nidStatus === "rejected"
                          ? "bg-[#1f0d11]/90 text-rose-100 border-rose-500/30"
                          : "bg-[#0B132B] text-white border-white/5"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Shield className={`w-4 h-4 ${selectedTutor.nidStatus === "approved" ? "text-emerald-400" : "text-[#0D5BFF]"}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              NID DOCUMENTATION
                            </span>
                          </div>
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                              selectedTutor.nidStatus === "approved"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono"
                                : selectedTutor.nidStatus === "rejected"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono"
                                : "text-amber-400 font-mono"
                            }`}
                          >
                            {selectedTutor.nidStatus || "Awaiting"}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <button
                            disabled={selectedTutor.nidStatus === "approved"}
                            onClick={() =>
                              handleVerifyTutor(selectedTutor.id, "nid", "approved")
                            }
                            className={`flex-1 py-3 text-white rounded-xl text-[9px] font-black uppercase italic transition-all flex items-center justify-center gap-1.5 ${
                              selectedTutor.nidStatus === "approved"
                                ? "bg-emerald-600 cursor-default border border-emerald-400/50 shadow-md shadow-emerald-600/10"
                                : "bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                          >
                            {selectedTutor.nidStatus === "approved" ? "✓ Approved NID" : "Approve NID"}
                          </button>
                          <button
                            disabled={selectedTutor.nidStatus === "rejected"}
                            onClick={() =>
                              handleVerifyTutor(selectedTutor.id, "nid", "rejected")
                            }
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all flex items-center justify-center gap-1.5 ${
                              selectedTutor.nidStatus === "rejected"
                                ? "bg-rose-600 text-white border border-rose-400 cursor-default"
                                : "bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                          >
                            {selectedTutor.nidStatus === "rejected" ? "✗ Rejected" : "Reject"}
                          </button>
                        </div>
                      </div>

                      {/* Academic Section */}
                      <div className={`p-6 rounded-3xl border space-y-4 transition-all duration-500 ${
                        selectedTutor.academicStatus === "approved"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-lg shadow-emerald-100/30"
                          : selectedTutor.academicStatus === "rejected"
                          ? "bg-rose-50 border-rose-100 text-rose-900"
                          : "bg-slate-50 border-slate-100"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GraduationCap className={`w-4 h-4 ${selectedTutor.academicStatus === "approved" ? "text-emerald-600" : "text-[#0D5BFF]"}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              ACADEMIC CREDENTIALS
                            </span>
                          </div>
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                              selectedTutor.academicStatus === "approved"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono"
                                : selectedTutor.academicStatus === "rejected"
                                ? "bg-rose-100 text-rose-700 border border-rose-200 font-mono"
                                : "text-amber-500 font-mono"
                            }`}
                          >
                            {selectedTutor.academicStatus || "Awaiting"}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <button
                            disabled={selectedTutor.academicStatus === "approved"}
                            onClick={() =>
                              handleVerifyTutor(
                                selectedTutor.id,
                                "academic",
                                "approved",
                              )
                            }
                            className={`flex-1 py-3 text-white rounded-xl text-[9px] font-black uppercase italic transition-all flex items-center justify-center gap-1.5 ${
                              selectedTutor.academicStatus === "approved"
                                ? "bg-emerald-600 border border-emerald-400/50 cursor-default shadow-md shadow-emerald-600/10"
                                : "bg-[#0D5BFF] hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                          >
                            {selectedTutor.academicStatus === "approved" ? "✓ Credentials Approved" : "Verify Academic"}
                          </button>
                          <button
                            disabled={selectedTutor.academicStatus === "rejected"}
                            onClick={() =>
                              handleVerifyTutor(
                                selectedTutor.id,
                                "academic",
                                "rejected",
                              )
                            }
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase italic transition-all flex items-center justify-center gap-1.5 ${
                              selectedTutor.academicStatus === "rejected"
                                ? "bg-rose-600 text-white border border-rose-400 cursor-default"
                                : "bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-500 hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                          >
                            {selectedTutor.academicStatus === "rejected" ? "✗ Rejected" : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Financial Footprint */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                        Financial Footprint
                      </p>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Wallet className="w-4 h-4 text-[#0D5BFF]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#0B132B]">
                              Earning History
                            </span>
                          </div>
                          <span className="text-xl font-black text-[#0B132B] italic">
                            ৳{selectedTutor.balance || 0}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                          {payments
                            .filter((p) => p.tutorId === selectedTutor.id)
                            .map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 italic"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    {new Date(p.date).toLocaleDateString()}
                                  </span>
                                  <span className="text-[9px] font-bold text-[#0B132B]">
                                    {p.transactionId}
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-black ${p.status === "approved" ? "text-emerald-600" : "text-slate-300"}`}
                                >
                                  +৳{p.amount}
                                </span>
                              </div>
                            ))}
                          {payments.filter(
                            (p) => p.tutorId === selectedTutor.id,
                          ).length === 0 && (
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center py-4">
                              No financial events synchronized
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Evidence */}
              <div className="flex-1 bg-slate-100 p-5 sm:p-8 flex flex-col h-1/2 md:h-auto overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Document Evidence
                  </h4>
                  <button
                    onClick={() => setSelectedTutor(null)}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    <LayoutDashboard className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                {/* Segmented Tab Control */}
                <div className="flex bg-slate-200/60 p-1 rounded-2xl mb-6 border border-slate-200/40">
                  <button
                    onClick={() => setActiveDocTab("nid")}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                      activeDocTab === "nid"
                        ? "bg-[#0B132B] text-white shadow-md shadow-[#0B132B]/10"
                        : "text-slate-500 hover:text-[#0B132B] hover:bg-white/40"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    National ID (NID)
                  </button>
                  <button
                    onClick={() => setActiveDocTab("academic")}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                      activeDocTab === "academic"
                        ? "bg-[#0B132B] text-white shadow-md shadow-[#0B132B]/10"
                        : "text-slate-500 hover:text-[#0B132B] hover:bg-white/40"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Academic ID Card
                  </button>
                </div>

                <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 p-4 shadow-inner flex flex-col overflow-y-auto custom-scrollbar min-h-[320px]">
                  {activeDocTab === "nid" ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Verified NID scans
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded ${
                          selectedTutor.nidStatus === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : selectedTutor.nidStatus === "rejected"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}>
                          NID: {selectedTutor.nidStatus || "awaiting"}
                        </span>
                      </div>

                      {selectedTutor.nidFrontImg || selectedTutor.nidBackImg ? (
                        <div className="grid grid-cols-1 gap-6">
                          {selectedTutor.nidFrontImg && (
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                NID Front Image
                              </p>
                              <div 
                                onClick={() => setZoomImage(selectedTutor.nidFrontImg!)}
                                className="rounded-2xl overflow-hidden border border-slate-150 bg-slate-50 relative group cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
                              >
                                <img
                                  src={selectedTutor.nidFrontImg}
                                  alt="NID Front"
                                  className="w-full object-contain max-h-64 mx-auto"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-[#0B132B]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white text-center p-4">
                                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
                                    <Search className="w-5 h-5 text-white" />
                                  </div>
                                  <span className="text-[9px] font-black uppercase tracking-wider">Inspect Front NID</span>
                                  <span className="text-[7px] text-slate-300 uppercase tracking-widest mt-1">High-resolution magnifier</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTutor.nidBackImg && (
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                NID Back Image
                              </p>
                              <div 
                                onClick={() => setZoomImage(selectedTutor.nidBackImg!)}
                                className="rounded-2xl overflow-hidden border border-slate-150 bg-slate-50 relative group cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
                              >
                                <img
                                  src={selectedTutor.nidBackImg}
                                  alt="NID Back"
                                  className="w-full object-contain max-h-64 mx-auto"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-[#0B132B]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white text-center p-4">
                                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
                                    <Search className="w-5 h-5 text-white" />
                                  </div>
                                  <span className="text-[9px] font-black uppercase tracking-wider">Inspect Back NID</span>
                                  <span className="text-[7px] text-slate-300 uppercase tracking-widest mt-1">High-resolution magnifier</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center p-8 py-16">
                          <Shield className="w-10 h-10 text-slate-300 mb-3" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            No NID Scans Uploaded yet
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Academic ID & credentials
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded ${
                          selectedTutor.academicStatus === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : selectedTutor.academicStatus === "rejected"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}>
                          Academic: {selectedTutor.academicStatus || "awaiting"}
                        </span>
                      </div>

                      {selectedTutor.documents && selectedTutor.documents.length > 0 ? (
                        <div className="grid gap-4">
                          {selectedTutor.documents.map((docUrl, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group shadow-sm"
                            >
                              {docUrl.toLowerCase().endsWith(".pdf") ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center">
                                  <FileText className="w-12 h-12 text-[#0D5BFF] mb-4" />
                                  <p className="text-[10px] font-black text-[#0B132B] uppercase">
                                    Academic Certificate {idx + 1}
                                  </p>
                                  <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 px-5 py-2 bg-[#0D5BFF] hover:bg-blue-600 text-white text-[8px] font-black uppercase rounded-lg shadow-sm transition-all"
                                  >
                                    Open PDF
                                  </a>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => setZoomImage(docUrl)}
                                  className="relative cursor-pointer group"
                                >
                                  <img
                                    src={docUrl}
                                    alt={`Document ${idx + 1}`}
                                    className="w-full object-contain max-h-96 mx-auto"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-[#0B132B]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white text-center p-4">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
                                      <Search className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider">Inspect Document</span>
                                    <span className="text-[7px] text-slate-300 uppercase tracking-widest mt-1">High-resolution magnifier</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center p-8 py-16">
                          <GraduationCap className="w-10 h-10 text-slate-300 mb-3" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            No ID Cards or Credentials Uploaded
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest italic">
                      Admin Advisory
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase opacity-70">
                    Ensure photo identity matches name and university
                    affiliation before authorizing full expert access.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox High Definition Zoom Overlay */}
      <AnimatePresence>
        {zoomImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomImage(null)}
              className="absolute inset-0 cursor-zoom-out"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col z-[210] pointer-events-none"
            >
              <div className="flex justify-between items-center mb-4 text-white pointer-events-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Secure Document Magnifier (High Definition)
                </span>
                <button
                  onClick={() => setZoomImage(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase transition-all"
                >
                  Close Zoom
                </button>
              </div>
              <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0B132B]/50 flex items-center justify-center p-4">
                <img
                  src={zoomImage}
                  alt="High Definition Magnification"
                  className="max-w-full max-h-[75vh] object-contain rounded-xl select-none shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-4 flex justify-center text-[9px] font-black tracking-widest text-[#0D5BFF] uppercase italic">
                Verified cryptographic ledger node security
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-slate-50 rounded-[2rem] sm:rounded-[4rem] p-4 sm:p-10 md:p-12 lg:p-16 border border-slate-100">
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-3xl font-black text-[#0B132B] uppercase italic">
            Global Ledger Audit
          </h3>
          <button className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#0D5BFF] transition-all">
            <ArrowDownCircle className="w-4 h-4 text-[#0D5BFF]" />
            Export XLS
          </button>
        </div>

        <div className="bg-white rounded-[3rem] p-4 border border-slate-100 shadow-sm">
          <div className="overflow-x-auto custom-scrollbar uppercase">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Timestamp
                  </th>
                  <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sender ID
                  </th>
                  <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Reference Hash
                  </th>
                  <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Payload (৳)
                  </th>
                  <th className="p-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Verification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allPayments
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  )
                  .map((payment) => (
                    <tr
                      key={payment.id}
                      className="h-20 group hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-8 text-[10px] font-black text-slate-500 tracking-widest">
                        {new Date(payment.date).toLocaleString()}
                      </td>
                      <td className="px-8">
                        <span className="text-[11px] font-black font-mono text-[#0B132B]">
                          {payment.bKashNumber}
                        </span>
                      </td>
                      <td className="px-8 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black font-mono text-[#0B132B] opacity-70 group-hover:opacity-100 transition-opacity">
                          {payment.transactionId}
                        </span>
                      </td>
                      <td className="px-8">
                        <span className="text-lg font-black text-[#0B132B] italic">
                          ৳{payment.amount}
                        </span>
                      </td>
                      <td className="px-8 text-right">
                        <span
                          className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                            payment.status === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : payment.status === "rejected"
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BannerEditorFormProps {
  currentText: string;
  onSave: (text: string) => Promise<void>;
}

function BannerEditorForm({ currentText, onSave }: BannerEditorFormProps) {
  const [inputText, setInputText] = useState(currentText);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setInputText(currentText);
  }, [currentText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsSaving(true);
    setSuccess(false);
    try {
      await onSave(inputText);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
          Announcement Text
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter promotional banner announcement..."
          maxLength={500}
          rows={3}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent outline-none text-[#0B132B] dark:text-white transition-all resize-none"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          <span>💡 Tip: Separate announcements with ` • ` bullet symbols</span>
          <span>{inputText.length} / 500 characters</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setInputText(inputText.toUpperCase())}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
        >
          Convert to All Caps
        </button>

        <button
          type="button"
          onClick={() => setInputText("0% COMMISSION FOR INTERNATIONAL ISLAMIC UNIVERSITY CHITTAGONG (IIUC) STUDENTS  • JOIN AS A TUTOR TODAY AND GET 0% COMMISSION FOR THE FIRST 3 MONTHS! • VERIFIED EXPERT MENTORS AVAILABLE IN OUR NEAR • ")}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
        >
          Reset to Default
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        {success ? (
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
            ✓ Broadcast applied live successfully!
          </span>
        ) : (
          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Updates will propagate globally in real-time.
          </span>
        )}

        <button
          type="submit"
          disabled={isSaving || !inputText.trim()}
          className="px-6 py-3 bg-[#0D5BFF] hover:bg-[#0D5BFF]/95 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Publishing..." : "Apply Live Changes"}
        </button>
      </div>
    </form>
  );
}

interface AppLinkEditorFormProps {
  currentLink: string;
  onSave: (link: string) => Promise<void>;
}

function AppLinkEditorForm({ currentLink, onSave }: AppLinkEditorFormProps) {
  const [inputLink, setInputLink] = useState(currentLink);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setInputLink(currentLink);
  }, [currentLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim()) return;
    setIsSaving(true);
    setSuccess(false);
    try {
      await onSave(inputLink);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
          Android App Link (.apk URL)
        </label>
        <input
          type="url"
          value={inputLink}
          onChange={(e) => setInputLink(e.target.value)}
          placeholder="Enter Android app APK download URL..."
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-[#0D5BFF] focus:border-transparent outline-none text-[#0B132B] dark:text-white transition-all"
        />
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          This URL will be linked to all "Download APK" buttons on the website.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setInputLink("https://github.com/m13hmahadi250/EduTrack-Bangladesh-APP/releases/download/edutrackbd/EduTrack.Bangladesh.apk")}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
        >
          Reset to Default Release
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        {success ? (
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
            ✓ Link saved successfully!
          </span>
        ) : (
          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Changes will propagate globally in real-time.
          </span>
        )}

        <button
          type="submit"
          disabled={isSaving || !inputLink.trim()}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save App Link"}
        </button>
      </div>
    </form>
  );
}
