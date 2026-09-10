import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../store';
import { 
  Megaphone, 
  Send, 
  Users, 
  GraduationCap, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  Trash2, 
  Clock, 
  ExternalLink,
  RotateCcw,
  Zap,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'tutors' | 'students';
  severity: 'info' | 'warning' | 'error' | 'success';
  actionLink?: string;
  recipientsCount: number;
  authorName: string;
  timestamp: string;
  syncedToBanner?: boolean;
}

interface AdminBroadcastCenterProps {
  users: User[];
  currentUser: User;
  sendNotification: (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
  promotionalBannerText: string;
  updatePromotionalBannerText: (text: string) => Promise<void>;
}

const PRESET_TEMPLATES = [
  {
    title: "National Exam Season Support Guidelines",
    message: "HSC & SSC examinee support is now live. Tutors are encouraged to allocate priority revision slots and mock test reviews for registered students.",
    target: "all" as const,
    severity: "info" as const,
    actionLink: "/#curriculums"
  },
  {
    title: "Tutor Monthly Payout Cycle Notice",
    message: "Outbound bKash & Nagad disbursement requests submitted before Friday 6:00 PM are audited and cleared within 24 hours. Check your wallet balance.",
    target: "tutors" as const,
    severity: "success" as const,
    actionLink: "/dashboard/withdrawals"
  },
  {
    title: "Document Verification Drive for Tutors",
    message: "Unverified tutors: Please submit your NID and University Student ID card in the Identity Protocol section to receive verified badges and student leads.",
    target: "tutors" as const,
    severity: "warning" as const,
    actionLink: "/dashboard"
  },
  {
    title: "Scheduled Server Maintenance Notice",
    message: "Routine database optimization will take place on Saturday from 2:00 AM to 3:00 AM. Live classes during this window may experience brief reconnection pings.",
    target: "all" as const,
    severity: "error" as const,
    actionLink: ""
  },
  {
    title: "Exclusive Parent & Student Math Bootcamps",
    message: "Find top-rated engineering tutors from BUET, DU, and DMC for high-school physics, higher mathematics, and chemistry coaching.",
    target: "students" as const,
    severity: "info" as const,
    actionLink: "/#curriculums"
  }
];

export default function AdminBroadcastCenter({
  users,
  currentUser,
  sendNotification,
  promotionalBannerText,
  updatePromotionalBannerText
}: AdminBroadcastCenterProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'tutors' | 'students'>('all');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'error' | 'success'>('info');
  const [actionLink, setActionLink] = useState('');
  const [syncToBanner, setSyncToBanner] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter
  const [historySearch, setHistorySearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'tutors' | 'students' | 'any'>('any');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message: msg, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Subscribe to real-time broadcasts collection in Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'system_broadcasts'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const records: BroadcastRecord[] = [];
        snapshot.forEach((d) => {
          records.push({ id: d.id, ...d.data() } as BroadcastRecord);
        });
        setBroadcasts(records);
        setLoadingBroadcasts(false);
      }, (err) => {
        console.warn("Could not listen to system_broadcasts:", err);
        setLoadingBroadcasts(false);
      });
    } catch (e) {
      console.warn("Error setting up broadcasts listener:", e);
      setLoadingBroadcasts(false);
    }
    return () => unsubscribe();
  }, []);

  // Audience counts
  const audienceStats = useMemo(() => {
    const tutorsCount = users.filter(u => u.role === 'tutor').length;
    const studentsCount = users.filter(u => u.role === 'student').length;
    return {
      all: users.length,
      tutors: tutorsCount,
      students: studentsCount,
      activeTargetCount: targetAudience === 'all' 
        ? users.length 
        : targetAudience === 'tutors' 
          ? tutorsCount 
          : studentsCount
    };
  }, [users, targetAudience]);

  // Handle Dispatch Broadcast
  const handleDispatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("Please enter both a title and message for the broadcast.", "error");
      return;
    }

    const recipients = users.filter(u => {
      if (targetAudience === 'all') return true;
      if (targetAudience === 'tutors') return u.role === 'tutor';
      if (targetAudience === 'students') return u.role === 'student';
      return true;
    });

    if (recipients.length === 0) {
      showToast("No recipient users found for this target audience.", "error");
      return;
    }

    const confirmSend = window.confirm(
      `Confirm Dispatch:\n\nSend "${title}" to ${recipients.length} ${targetAudience.toUpperCase()} users across EduTrack Bangladesh?`
    );
    if (!confirmSend) return;

    setIsDispatching(true);

    try {
      // 1. Dispatch individual user notifications in Firestore
      const dispatchPromises = recipients.map(user => 
        sendNotification(
          user.id,
          title.trim(),
          actionLink.trim() ? `${message.trim()} (Link: ${actionLink.trim()})` : message.trim(),
          severity
        )
      );
      await Promise.allSettled(dispatchPromises);

      // 2. Optionally sync with Promotional Banner Ticker
      if (syncToBanner) {
        await updatePromotionalBannerText(`${title.trim().toUpperCase()}: ${message.trim()}`);
      }

      // 3. Save broadcast entry to Firestore collection
      const newRecord: Omit<BroadcastRecord, 'id'> = {
        title: title.trim(),
        message: message.trim(),
        targetAudience,
        severity,
        actionLink: actionLink.trim() || undefined,
        recipientsCount: recipients.length,
        authorName: currentUser.name || 'Admin Authority',
        timestamp: new Date().toISOString(),
        syncedToBanner: syncToBanner
      };

      try {
        await addDoc(collection(db, 'system_broadcasts'), newRecord);
      } catch (saveErr) {
        console.warn("Could not save to system_broadcasts collection:", saveErr);
        // Add to local state if firestore write fails
        setBroadcasts(prev => [{ id: `local_${Date.now()}`, ...newRecord }, ...prev]);
      }

      showToast(`Broadcast dispatched successfully to ${recipients.length} users!`, "success");
      setTitle('');
      setMessage('');
      setActionLink('');
      setSyncToBanner(false);
    } catch (err) {
      console.error("Failed to dispatch broadcast:", err);
      showToast("Failed to dispatch broadcast. Check connection.", "error");
    } finally {
      setIsDispatching(false);
    }
  };

  const applyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setTargetAudience(tpl.target);
    setSeverity(tpl.severity);
    setActionLink(tpl.actionLink);
    showToast(`Loaded template: "${tpl.title.slice(0, 30)}..."`);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Remove this broadcast log from history?")) return;
    try {
      await deleteDoc(doc(db, 'system_broadcasts', recordId));
      setBroadcasts(prev => prev.filter(b => b.id !== recordId));
      showToast("Broadcast record removed.");
    } catch (err) {
      console.error(err);
      setBroadcasts(prev => prev.filter(b => b.id !== recordId));
      showToast("Record removed.");
    }
  };

  // Filtered broadcast history
  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter(b => {
      const matchSearch = !historySearch.trim() || 
        b.title.toLowerCase().includes(historySearch.toLowerCase()) || 
        b.message.toLowerCase().includes(historySearch.toLowerCase()) ||
        b.authorName.toLowerCase().includes(historySearch.toLowerCase());
      const matchAudience = audienceFilter === 'any' || b.targetAudience === audienceFilter;
      return matchSearch && matchAudience;
    });
  }, [broadcasts, historySearch, audienceFilter]);

  return (
    <div className="space-y-8" id="admin-broadcast-center">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {feedbackToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedbackToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-[#0B132B] dark:bg-slate-950 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0D5BFF]/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#0D5BFF]/20 border border-[#0D5BFF]/30 flex items-center justify-center text-[#0D5BFF]">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-[#0D5BFF] uppercase tracking-[0.3em]">
                Direct Communication Protocol
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight">
              Broadcast & Push Dispatcher
            </h2>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400 max-w-xl mt-1">
              Dispatch high-priority push announcements and in-app system notices directly to student inboxes, tutor terminals, or the global announcement ticker.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Audience</span>
              <span className="text-lg font-black text-white font-mono">{users.length} Users</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Tutors Registered</span>
              <span className="text-lg font-black text-[#0D5BFF] font-mono">{audienceStats.tutors}</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Students Active</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{audienceStats.students}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Composer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Presets Carousel */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Rapid Dispatch Presets
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Click to Populate</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {PRESET_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  id={`broadcast-preset-${i}`}
                  onClick={() => applyTemplate(tpl)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 text-left shrink-0 max-w-[220px] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 group-hover:text-[#0D5BFF]">
                      {tpl.target}
                    </span>
                    <span className={`text-[7px] font-black uppercase px-1 rounded ${
                      tpl.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                      tpl.severity === 'error' ? 'bg-rose-100 text-rose-800' :
                      tpl.severity === 'success' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {tpl.severity}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                    {tpl.title}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Broadcast Composer Form */}
          <form onSubmit={handleDispatch} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-[#0B132B] dark:text-white italic">
                  Compose System Broadcast
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Targeted delivery to {audienceStats.activeTargetCount} recipient terminals
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[8px] font-black uppercase px-2 py-0.5 text-slate-500">Reach:</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#0D5BFF] text-white rounded-lg font-mono">
                  {audienceStats.activeTargetCount} users
                </span>
              </div>
            </div>

            {/* Target Audience Selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                Target Audience Sector
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'all', label: 'All Users', icon: Users, count: audienceStats.all },
                  { id: 'tutors', label: 'Tutors Only', icon: GraduationCap, count: audienceStats.tutors },
                  { id: 'students', label: 'Students Only', icon: BookOpen, count: audienceStats.students }
                ].map((aud) => {
                  const Icon = aud.icon;
                  const isSelected = targetAudience === aud.id;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      id={`target-audience-${aud.id}`}
                      onClick={() => setTargetAudience(aud.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0B132B] text-white border-[#0B132B] shadow-md dark:bg-[#0D5BFF] dark:border-[#0D5BFF]'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#0D5BFF]'}`} />
                        <span className="text-[9px] font-black font-mono">{aud.count}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">{aud.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Priority Selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                Notice Severity & Priority Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'info', label: 'General Info', color: 'blue', icon: Info },
                  { id: 'warning', label: 'Advisory', color: 'amber', icon: AlertTriangle },
                  { id: 'error', label: 'Urgent Alert', color: 'rose', icon: Zap },
                  { id: 'success', label: 'Offer / Reward', color: 'emerald', icon: Sparkles }
                ].map((sev) => {
                  const isSelected = severity === sev.id;
                  return (
                    <button
                      key={sev.id}
                      type="button"
                      id={`severity-btn-${sev.id}`}
                      onClick={() => setSeverity(sev.id as any)}
                      className={`px-3 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? sev.id === 'warning'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                            : sev.id === 'error'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-md'
                            : sev.id === 'success'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                            : 'bg-[#0D5BFF] text-white border-blue-700 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <sev.icon className="w-3 h-3 shrink-0" />
                      <span>{sev.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                Broadcast Headline / Title
              </label>
              <input
                type="text"
                id="broadcast-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ramadan Schedule Adjustment for Private Tutors"
                maxLength={90}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#0D5BFF] transition-all"
              />
              <span className="text-[7.5px] text-slate-400 float-right font-mono">{title.length}/90</span>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                Full Announcement Body
              </label>
              <textarea
                id="broadcast-message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide detailed instructions, updates, or policies for students or tutors..."
                rows={4}
                maxLength={450}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#0D5BFF] transition-all resize-none"
              />
              <span className="text-[7.5px] text-slate-400 float-right font-mono">{message.length}/450</span>
            </div>

            {/* Optional Action Link */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                Target Route / Action Link (Optional)
              </label>
              <div className="relative">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="broadcast-link-input"
                  value={actionLink}
                  onChange={(e) => setActionLink(e.target.value)}
                  placeholder="e.g. /dashboard/verifications or /#curriculums"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#0D5BFF] transition-all font-mono"
                />
              </div>
            </div>

            {/* Sync to Global Banner Checkbox */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="sync-to-banner-checkbox"
                  checked={syncToBanner}
                  onChange={(e) => setSyncToBanner(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0D5BFF] focus:ring-[#0D5BFF] accent-[#0D5BFF] cursor-pointer"
                />
                <label htmlFor="sync-to-banner-checkbox" className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                  Also overwrite global ticker announcement banner
                </label>
              </div>
              <Megaphone className="w-4 h-4 text-[#0D5BFF] shrink-0" />
            </div>

            {/* Dispatch Button */}
            <button
              type="submit"
              id="dispatch-broadcast-btn"
              disabled={isDispatching || !title.trim() || !message.trim()}
              className="w-full py-4 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            >
              {isDispatching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching to {audienceStats.activeTargetCount} terminals...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Global Broadcast ({audienceStats.activeTargetCount} Users)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Card Preview & Active Ticker (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Notification Preview Box */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                User Inbox Card Preview
              </span>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Live Simulation
              </span>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${
              severity === 'warning' ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-100' :
              severity === 'error' ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-100' :
              severity === 'success' ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-100' :
              'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-100'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  severity === 'warning' ? 'bg-amber-500 text-white' :
                  severity === 'error' ? 'bg-rose-600 text-white' :
                  severity === 'success' ? 'bg-emerald-600 text-white' :
                  'bg-[#0D5BFF] text-white'
                }`}>
                  {severity === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                   severity === 'error' ? <Zap className="w-4 h-4" /> :
                   severity === 'success' ? <Sparkles className="w-4 h-4" /> :
                   <Megaphone className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[7.5px] font-black uppercase tracking-widest font-mono opacity-70">
                      EduTrack Broadcast • Just Now
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/10">
                      {targetAudience}
                    </span>
                  </div>
                  <h4 className="text-xs font-black uppercase italic leading-snug">
                    {title || 'Headline will display here...'}
                  </h4>
                  <p className="text-[10px] font-medium leading-relaxed opacity-90 mt-1">
                    {message || 'Your detailed broadcast text will appear in the recipients in-app notification center.'}
                  </p>
                  {actionLink && (
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider text-[#0D5BFF]">
                      <span>Open Link: {actionLink}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Active Promotional Ticker Preview */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                Active Public Ticker Ticker
              </span>
              <div className="bg-[#0B132B] text-white p-3 rounded-xl text-[10px] font-mono truncate flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{promotionalBannerText || 'NO TICKER ANNOUNCEMENT ACTIVE'}</span>
              </div>
            </div>
          </div>

          {/* Target Audience Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic">
              Recipient Coverage Matrix
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> All Platform Accounts
                </span>
                <span className="font-mono font-black text-slate-900 dark:text-white">{audienceStats.all}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0D5BFF]" /> Expert Instructors & Tutors
                </span>
                <span className="font-mono font-black text-[#0D5BFF]">{audienceStats.tutors}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Students & Registered Parents
                </span>
                <span className="font-mono font-black text-emerald-500">{audienceStats.students}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0D5BFF]" />
              Broadcast Dispatch Ledger ({filteredBroadcasts.length} records)
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Historical record of push announcements sent to client terminals
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold outline-none focus:border-[#0D5BFF]"
              />
            </div>

            {/* Audience Filter */}
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="any">All Audiences</option>
              <option value="all">Global</option>
              <option value="tutors">Tutors</option>
              <option value="students">Students</option>
            </select>
          </div>
        </div>

        {loadingBroadcasts ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
            <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              No previous broadcasts found
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Dispatched notices will be logged here with recipient metrics and timestamps.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBroadcasts.map((b) => (
              <div key={b.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    b.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40' :
                    b.severity === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40' :
                    b.severity === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40' :
                    'bg-blue-100 text-[#0D5BFF] dark:bg-blue-950/40'
                  }`}>
                    <Megaphone className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase italic">
                        {b.title}
                      </h4>
                      <span className="text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        Audience: {b.targetAudience} ({b.recipientsCount} sent)
                      </span>
                      {b.syncedToBanner && (
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-[#0D5BFF]">
                          Banner Synced
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">
                      {b.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[8.5px] text-slate-400 font-mono">
                      <span>By: {b.authorName}</span>
                      <span>•</span>
                      <span>{new Date(b.timestamp).toLocaleString()}</span>
                      {b.actionLink && (
                        <>
                          <span>•</span>
                          <span className="text-[#0D5BFF] truncate max-w-[200px]">Link: {b.actionLink}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(b.title);
                      setMessage(b.message);
                      setTargetAudience(b.targetAudience);
                      setSeverity(b.severity);
                      setActionLink(b.actionLink || '');
                      showToast("Loaded broadcast into composer!");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#0D5BFF] hover:text-white text-[8px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                    title="Clone into composer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Clone
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(b.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                    title="Delete log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
