import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../store';
import { 
  Mail, 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Search, 
  Smartphone, 
  Monitor, 
  ExternalLink, 
  Copy, 
  Check, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Shield, 
  GraduationCap, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Layers, 
  Eye, 
  CheckSquare, 
  Square,
  Flame,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sendBulkCampaignMail, BulkCampaignMailParams } from '../../services/mailService';

interface AdminBulkEmailerProps {
  users: User[];
  currentUser: User;
  sendNotification?: (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
}

interface CampaignRecord {
  id: string;
  campaignName: string;
  subject: string;
  category: 'promotional' | 'announcement' | 'update' | 'custom';
  targetAudience: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  authorEmail: string;
  timestamp: string;
  actionButtonText?: string;
  actionButtonUrl?: string;
}

const CAMPAIGN_PRESETS = [
  {
    name: "Tutor Verification Drive",
    category: "announcement" as const,
    targetRole: "tutor_unverified",
    subject: "Action Required: Complete your NID & Student ID verification on EduTrack",
    preheader: "Verified tutors receive 5x more tuition leads and official trust badge.",
    headline: "Verify Your Profile & Unlock Premium Tuition Leads",
    messageBody: `Dear {{name}},

We noticed that your EduTrack tutor profile is currently pending verification. Verified tutors are given priority placement in student search results and receive up to 5 times more tuition inquiries across {{district}}.

To complete your verification today:
• Log into your dashboard and navigate to the Identity Protocol section
• Upload a clear photo of your National ID (NID) or Passport
• Upload your current University Student ID Card or Academic Certificate
• Specify your preferred tuition days, subjects, and hourly rate

Our administrative team audits and verifies credentials within 12 hours. Keep your profile verified to start receiving verified student leads immediately!

Best regards,
EduTrack Bangladesh Verification Desk`,
    actionButtonText: "Complete Verification Now",
    actionButtonUrl: "https://edutrackbd.vercel.app/dashboard",
  },
  {
    name: "Student & Parent Tuition Matching",
    category: "promotional" as const,
    targetRole: "student",
    subject: "Connect with Verified Home & Online Tutors from BUET, DU & Medical Colleges",
    preheader: "Browse thousands of top-rated verified educators across Bangladesh.",
    headline: "Excellence in Tutoring — Handpicked for Your Child",
    messageBody: `Hello {{name}},

Preparing for upcoming school exams, HSC/SSC board finals, or English medium examinations?

EduTrack connects you with background-verified, high-achieving educators from Bangladesh's most prestigious institutions, including BUET, Dhaka University, and top Medical Colleges.

Why families choose EduTrack:
• 100% ID and academically verified tutors
• Safe escrow tuition payments via bKash & Nagad
• Free demo class guarantee before committing
• Personalized matching based on your location in {{district}}

Browse top-rated tutors in your area today or post your requirements for instant tutor applications!`,
    actionButtonText: "Browse Top Tutors",
    actionButtonUrl: "https://edutrackbd.vercel.app/#curriculums",
  },
  {
    name: "New Tuition Inquiries in Your District",
    category: "promotional" as const,
    targetRole: "tutor",
    subject: "Fresh Tuition Inquiries Posted in {{district}} — Apply Now",
    preheader: "Guardians in your area are actively searching for experienced tutors.",
    headline: "New Tuition Opportunities Live in {{district}}",
    messageBody: `Hello Teacher {{name}},

Multiple parents and students in {{district}} have recently published new home and online tuition requests matching your educational credentials and preferred subjects.

How to apply and secure tuitions:
• Browse active posts in the Tuition Jobs board
• Submit your application directly to the guardian
• Schedule an introductory demo session
• Receive guaranteed automated payouts directly to your bKash wallet

Log in to your account and review the newest listings before application slots fill up!`,
    actionButtonText: "View Tuition Listings",
    actionButtonUrl: "https://edutrackbd.vercel.app/#curriculums",
  },
  {
    name: "Platform Security & System Upgrade",
    category: "update" as const,
    targetRole: "all",
    subject: "EduTrack Bangladesh Platform Update: New Classroom & Messaging Tools",
    preheader: "Explore high-speed direct chat, instant bKash disbursements, and new map search.",
    headline: "Upgrades to the EduTrack Bangladesh Platform",
    messageBody: `Dear {{name}},

We have released major performance, safety, and operational enhancements to provide an even smoother experience for our educators and students.

What is new in this update:
• Enhanced Real-time Messenger with instant file sharing and status pings
• Accelerated bKash & Nagad withdrawal processing within 24 hours
• Real-time District Geo-Mapping for discovering tutors in your neighborhood
• Upgraded identity protocol and badge verification standards

Thank you for being an integral member of Bangladesh's premier tutoring community!`,
    actionButtonText: "Open EduTrack Dashboard",
    actionButtonUrl: "https://edutrackbd.vercel.app/dashboard",
  }
];

export default function AdminBulkEmailer({
  users,
  currentUser,
  sendNotification,
}: AdminBulkEmailerProps) {
  // Campaign Configuration State
  const [campaignName, setCampaignName] = useState("Platform Announcement Campaign");
  const [category, setCategory] = useState<'promotional' | 'announcement' | 'update' | 'custom'>('promotional');
  const [subject, setSubject] = useState(CAMPAIGN_PRESETS[1].subject);
  const [preheader, setPreheader] = useState(CAMPAIGN_PRESETS[1].preheader);
  const [headline, setHeadline] = useState(CAMPAIGN_PRESETS[1].headline);
  const [messageBody, setMessageBody] = useState(CAMPAIGN_PRESETS[1].messageBody);
  const [enableCta, setEnableCta] = useState(true);
  const [actionButtonText, setActionButtonText] = useState(CAMPAIGN_PRESETS[1].actionButtonText);
  const [actionButtonUrl, setActionButtonUrl] = useState(CAMPAIGN_PRESETS[1].actionButtonUrl);

  // Audience Filtering State
  const [audienceRole, setAudienceRole] = useState<'all' | 'tutor' | 'tutor_verified' | 'tutor_unverified' | 'student' | 'incomplete'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [excludedEmailSet, setExcludedEmailSet] = useState<Set<string>>(new Set());
  const [showRecipientDrawer, setShowRecipientDrawer] = useState(false);

  // Preview & Device Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);

  // Dispatch & Telemetry State
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    total: number;
    message: string;
    isIpError?: boolean;
    brevoLink?: string;
  } | null>(null);

  // History State
  const [campaignHistory, setCampaignHistory] = useState<CampaignRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Extract unique districts from users
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.district && typeof u.district === 'string' && u.district.trim()) {
        set.add(u.district.trim());
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // Compute matched recipients based on filters
  const matchedRecipients = useMemo(() => {
    return users.filter(u => {
      if (!u.email || !u.email.includes('@')) return false;

      // Filter by role / segment
      if (audienceRole === 'tutor') {
        if (u.role !== 'tutor') return false;
      } else if (audienceRole === 'tutor_verified') {
        const isVerified = u.isVerified || (u.nidStatus === 'approved' && u.academicStatus === 'approved');
        if (u.role !== 'tutor' || !isVerified) return false;
      } else if (audienceRole === 'tutor_unverified') {
        const isVerified = u.isVerified || (u.nidStatus === 'approved' && u.academicStatus === 'approved');
        if (u.role !== 'tutor' || isVerified) return false;
      } else if (audienceRole === 'student') {
        if ((u.role as string) !== 'student' && (u.role as string) !== 'guardian') return false;
      } else if (audienceRole === 'incomplete') {
        const hasId = !!(u.nidFrontImg || u.nidBackImg || (u.documents && u.documents.length > 0));
        const hasDays = !!(u.daysPerWeek || (u.availabilitySlots && Object.keys(u.availabilitySlots).length > 0));
        const isComplete = hasId && hasDays && u.district;
        if (isComplete) return false;
      }

      // Filter by district
      if (selectedDistrict !== 'all') {
        if (!u.district || u.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }

      // Filter by search query if present
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchDistrict = u.district?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDistrict) return false;
      }

      return true;
    });
  }, [users, audienceRole, selectedDistrict, searchQuery]);

  // Target recipients excluding any individually unchecked emails
  const finalTargetRecipients = useMemo(() => {
    return matchedRecipients.filter(r => !excludedEmailSet.has(r.email.toLowerCase()));
  }, [matchedRecipients, excludedEmailSet]);

  // Handle preset application
  const applyPreset = (preset: typeof CAMPAIGN_PRESETS[0]) => {
    setCampaignName(preset.name);
    setCategory(preset.category);
    setSubject(preset.subject);
    setPreheader(preset.preheader);
    setHeadline(preset.headline);
    setMessageBody(preset.messageBody);
    setEnableCta(!!preset.actionButtonText);
    setActionButtonText(preset.actionButtonText || '');
    setActionButtonUrl(preset.actionButtonUrl || '');

    if (preset.targetRole === 'tutor_unverified') {
      setAudienceRole('tutor_unverified');
    } else if (preset.targetRole === 'tutor') {
      setAudienceRole('tutor');
    } else if (preset.targetRole === 'student') {
      setAudienceRole('student');
    } else {
      setAudienceRole('all');
    }
  };

  // Toggle recipient exclusion
  const toggleRecipient = (email: string) => {
    const key = email.toLowerCase();
    setExcludedEmailSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all or deselect all
  const selectAll = () => {
    setExcludedEmailSet(new Set());
  };

  const deselectAll = () => {
    const set = new Set<string>();
    matchedRecipients.forEach(r => set.add(r.email.toLowerCase()));
    setExcludedEmailSet(set);
  };

  // Subscribe to campaign history from Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'bulk_email_campaigns'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list: CampaignRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        setCampaignHistory(list);
        setHistoryLoading(false);
      }, (err) => {
        console.warn("[Campaign History] Firestore offline fallback:", err);
        setHistoryLoading(false);
      });
    } catch (e) {
      setHistoryLoading(false);
    }
    return () => unsubscribe();
  }, []);

  // Dispatch campaign
  const handleDispatchCampaign = async () => {
    if (finalTargetRecipients.length === 0) {
      alert("No recipients selected! Please adjust your filters or selection.");
      return;
    }

    if (!subject.trim() || !messageBody.trim()) {
      alert("Please specify both an Email Subject and Message Body.");
      return;
    }

    const confirmMsg = `Are you ready to dispatch this email campaign to ${finalTargetRecipients.length} recipients via Brevo?\n\nSubject: ${subject}\nCategory: ${category.toUpperCase()}`;
    if (!window.confirm(confirmMsg)) return;

    setIsSending(true);
    setLastResult(null);
    setSendProgress({ sent: 0, failed: 0, total: finalTargetRecipients.length });

    try {
      const payloadRecipients = finalTargetRecipients.map(r => ({
        id: r.id,
        email: r.email,
        name: r.name || r.email.split('@')[0],
        role: r.role || 'member',
        district: r.district || '',
      }));

      const res = await sendBulkCampaignMail({
        recipients: payloadRecipients,
        subject,
        preheader,
        headline,
        messageBody,
        category,
        actionButtonText: enableCta ? actionButtonText : undefined,
        actionButtonUrl: enableCta ? actionButtonUrl : undefined,
        adminEmail: currentUser?.email || 'admin@edutrack.bd',
        campaignName,
      });

      setLastResult({
        success: res.success,
        sentCount: res.sentCount || 0,
        failedCount: res.failedCount || 0,
        total: res.total || finalTargetRecipients.length,
        message: res.message || (res.success ? "Campaign successfully dispatched!" : "Campaign delivery issue."),
        isIpError: res.isIpError,
        brevoLink: res.brevoLink,
      });

      // Record campaign in Firestore
      try {
        await addDoc(collection(db, 'bulk_email_campaigns'), {
          campaignName,
          subject,
          category,
          targetAudience: audienceRole,
          recipientCount: finalTargetRecipients.length,
          sentCount: res.sentCount || 0,
          failedCount: res.failedCount || 0,
          authorEmail: currentUser?.email || 'admin@edutrack.bd',
          timestamp: new Date().toISOString(),
          actionButtonText: enableCta ? actionButtonText : null,
          actionButtonUrl: enableCta ? actionButtonUrl : null,
        });
      } catch (firestoreErr) {
        console.warn("[Bulk Mailer] Firestore logging warning:", firestoreErr);
      }

      // Optional admin push notification
      if (sendNotification && currentUser?.id) {
        sendNotification(
          currentUser.id,
          "Campaign Dispatched",
          `Sent "${subject}" to ${res.sentCount || 0} recipients via Brevo.`,
          res.success ? "success" : "warning"
        );
      }
    } catch (err: any) {
      console.error("[Bulk Mailer Error]:", err);
      setLastResult({
        success: false,
        sentCount: 0,
        failedCount: finalTargetRecipients.length,
        total: finalTargetRecipients.length,
        message: err?.message || "An unexpected error occurred during campaign dispatch.",
      });
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  // Sample recipient for live preview
  const previewUser = finalTargetRecipients[previewRecipientIndex] || {
    name: "Sadia Rahman",
    email: "sadia.rahman@example.com",
    role: "tutor",
    district: "Dhaka",
  };

  // Generate preview body with placeholders replaced
  const previewBody = useMemo(() => {
    return messageBody
      .replace(/\{\{\s*name\s*\}\}/gi, previewUser.name || 'Member')
      .replace(/\{\{\s*email\s*\}\}/gi, previewUser.email || 'user@example.com')
      .replace(/\{\{\s*role\s*\}\}/gi, previewUser.role === 'tutor' ? 'Tutor / Educator' : 'Student / Guardian')
      .replace(/\{\{\s*district\s*\}\}/gi, previewUser.district || 'Dhaka');
  }, [messageBody, previewUser]);

  return (
    <div className="space-y-8" id="admin-bulk-email-tool-root">
      
      {/* Top Banner & Relay Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center font-bold shadow-inner">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic tracking-wide">
                    Brevo Bulk Mail Campaign Engine
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    SMTP v3 Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Dispatch branded promotional announcements and segment-targeted updates directly to verified inboxes.
                </p>
              </div>
            </div>
          </div>

          {/* Brevo Relay Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Verified Sender</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">edutrackbangladesh@gmail.com</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#0D5BFF]" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Selected Audience</p>
                <p className="text-xs font-black text-[#0D5BFF]">{finalTargetRecipients.length} of {users.length} Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Presets Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            One-Click Campaign Presets
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {CAMPAIGN_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 hover:border-[#0D5BFF]/50 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      preset.category === 'promotional' 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                        : preset.category === 'announcement'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                    }`}>
                      {preset.category}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Preset {idx + 1}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white group-hover:text-[#0D5BFF] transition-colors line-clamp-1">
                    {preset.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {preset.subject}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-[#0D5BFF] uppercase tracking-wider mt-2.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Load Template →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Composer (Left) & Audience Filter / Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Composer Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-[#0B132B] dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0D5BFF]" />
                  Campaign Composer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Customize content, dynamic placeholders, and category aesthetics</p>
              </div>
              
              {/* Category Pill Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                {(['promotional', 'announcement', 'update', 'custom'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      category === cat
                        ? 'bg-white dark:bg-slate-700 text-[#0D5BFF] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Name (Internal) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Campaign Reference Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. Spring 2026 Tutor Verification Drive"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
              />
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Email Subject Line *
                </label>
                <span className="text-[10px] font-mono text-slate-400">{subject.length} chars</span>
              </div>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Action Required: Complete your NID & Student ID verification"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
              />
            </div>

            {/* Preheader & Headline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Preheader Snippet (Inbox preview)
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={e => setPreheader(e.target.value)}
                  placeholder="Summary shown beside subject in inbox"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="Large banner title inside email"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                />
              </div>
            </div>

            {/* Message Body & Variable Pills */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Email Message Body (Supports Markdown bullets) *
                </label>
                
                {/* Dynamic tag insert helpers */}
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className="text-slate-400 uppercase font-black">Insert Tags:</span>
                  {[
                    { tag: '{{name}}', label: 'Name' },
                    { tag: '{{role}}', label: 'Role' },
                    { tag: '{{district}}', label: 'District' },
                    { tag: '{{email}}', label: 'Email' }
                  ].map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setMessageBody(prev => prev + ` ${item.tag} `)}
                      className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] border border-blue-200 dark:border-blue-900 rounded-md font-mono font-bold hover:bg-blue-100 transition-colors"
                      title={`Insert ${item.tag}`}
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={11}
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                placeholder="Write your email content here. Use double returns for paragraphs and • or - for bullets..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-normal text-slate-800 dark:text-white leading-relaxed focus:outline-none focus:border-[#0D5BFF] resize-y"
              />
            </div>

            {/* Call to Action Button Toggle & Inputs */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cta-toggle"
                    checked={enableCta}
                    onChange={e => setEnableCta(e.target.checked)}
                    className="w-4 h-4 text-[#0D5BFF] rounded cursor-pointer"
                  />
                  <label htmlFor="cta-toggle" className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 cursor-pointer">
                    Include Action Button (CTA)
                  </label>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Increases click-through rate</span>
              </div>

              {enableCta && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Button Label</label>
                    <input
                      type="text"
                      value={actionButtonText}
                      onChange={e => setActionButtonText(e.target.value)}
                      placeholder="e.g. Verify Profile Now"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Destination URL</label>
                    <input
                      type="text"
                      value={actionButtonUrl}
                      onChange={e => setActionButtonUrl(e.target.value)}
                      placeholder="https://edutrackbd.vercel.app/dashboard"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dispatch Action Panel */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-xs font-black text-[#0B132B] dark:text-white uppercase tracking-wider">
                  Ready to send to <span className="text-[#0D5BFF]">{finalTargetRecipients.length} recipients</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Rate-paced delivery via Brevo with real-time audit logging
                </p>
              </div>

              <button
                type="button"
                onClick={handleDispatchCampaign}
                disabled={isSending || finalTargetRecipients.length === 0}
                className="w-full sm:w-auto px-8 py-4 bg-[#0D5BFF] hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Dispatching Campaign...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Bulk Campaign</span>
                  </>
                )}
              </button>
            </div>

            {/* Last Execution Result Notice */}
            {lastResult && (
              <div className={`p-4 rounded-2xl border text-left text-xs ${
                lastResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-start gap-3">
                  {lastResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="font-bold">{lastResult.message}</p>
                    <p className="text-[11px] opacity-80">
                      Dispatched: <strong>{lastResult.sentCount}</strong> / <strong>{lastResult.total}</strong> | Failed: <strong>{lastResult.failedCount}</strong>
                    </p>
                    {lastResult.isIpError && (
                      <div className="pt-2">
                        <a
                          href="https://app.brevo.com/security/authorised_ips"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white px-3 py-1.5 rounded-xl hover:bg-rose-700 transition-colors"
                        >
                          Authorize Server IPs in Brevo →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Audience Selector & Live Email Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Audience Segment Filter Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0D5BFF]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
                  Audience Segmentation
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF]">
                {finalTargetRecipients.length} Selected
              </span>
            </div>

            {/* Target Role Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                User Category Filter
              </label>
              <select
                value={audienceRole}
                onChange={e => {
                  setAudienceRole(e.target.value as any);
                  setExcludedEmailSet(new Set());
                }}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
              >
                <option value="all">All Platform Users ({users.length})</option>
                <option value="tutor">All Tutors (Verified & Pending)</option>
                <option value="tutor_verified">Verified Tutors Only</option>
                <option value="tutor_unverified">Pending / Unverified Tutors</option>
                <option value="student">Students & Guardians Only</option>
                <option value="incomplete">Incomplete Profiles Only</option>
              </select>
            </div>

            {/* District Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                District Geo-Filter
              </label>
              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
              >
                <option value="all">All Districts of Bangladesh ({availableDistricts.length} active)</option>
                {availableDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search recipient by name or email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>

            {/* Recipient Roster Drawer Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRecipientDrawer(!showRecipientDrawer)}
                className="text-xs font-bold text-[#0D5BFF] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                {showRecipientDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showRecipientDrawer ? "Hide Recipient List" : "Review & Select Individual Recipients"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  All
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Recipient List Drawer */}
            <AnimatePresence>
              {showRecipientDrawer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border border-slate-200/60 dark:border-slate-700 rounded-2xl p-2 bg-slate-50 dark:bg-slate-800/50 max-h-64 overflow-y-auto space-y-1.5"
                >
                  {matchedRecipients.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No users match this filter criteria.</p>
                  ) : (
                    matchedRecipients.map(user => {
                      const isIncluded = !excludedEmailSet.has(user.email.toLowerCase());
                      return (
                        <div
                          key={user.id || user.email}
                          onClick={() => toggleRecipient(user.email)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isIncluded 
                              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs' 
                              : 'bg-transparent text-slate-400 line-through opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isIncluded ? <CheckSquare className="w-4 h-4 text-[#0D5BFF] shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                            <div className="truncate">
                              <p className="font-bold truncate leading-tight">{user.name || user.email.split('@')[0]}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 shrink-0 ml-2">
                            {user.role}
                          </span>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Live Responsive Email Client Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0D5BFF]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
                  Live Inbox Preview
                </h3>
              </div>

              {/* Viewport switch: Desktop vs Mobile */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-[#0D5BFF] shadow-xs' : 'text-slate-400'
                  }`}
                  title="Desktop Outlook/Gmail view"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-[#0D5BFF] shadow-xs' : 'text-slate-400'
                  }`}
                  title="Mobile smartphone view"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Email Preview Frame */}
            <div className={`mx-auto bg-[#0f172a] rounded-3xl p-3 sm:p-4 text-left transition-all ${
              previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'
            }`}>
              
              {/* Simulated Client Top Bar */}
              <div className="bg-[#1e293b] rounded-2xl p-3 mb-3 text-[11px] text-slate-300 font-sans space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>From: <strong>EduTrack Bangladesh</strong> &lt;edutrackbangladesh@gmail.com&gt;</span>
                  <span>Today</span>
                </div>
                <div className="text-white font-bold truncate">Subject: {subject || "Untitled Campaign"}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  To: {previewUser.name} &lt;{previewUser.email}&gt;
                </div>
              </div>

              {/* Rendered Email Card Container */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl text-slate-800 font-sans text-xs">
                
                {/* Top Accent Stripe */}
                <div className={`h-1.5 w-full ${
                  category === 'promotional' 
                    ? 'bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500' 
                    : category === 'announcement'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`} />

                {/* Email Header */}
                <div className={`p-6 text-center text-white ${
                  category === 'promotional'
                    ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900'
                    : category === 'announcement'
                    ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-900'
                    : 'bg-gradient-to-br from-[#0B132B] to-[#1E293B]'
                }`}>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black tracking-wider uppercase mb-3">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    <span>EduTrack</span>
                    <span className="bg-[#0D5BFF] px-1.5 py-0.2 rounded text-[8px]">BD</span>
                  </div>

                  <h3 className="text-base font-black uppercase tracking-tight text-white line-clamp-2">
                    {headline || subject}
                  </h3>
                  <p className="text-[10px] text-white/60 mt-1">Official Platform Dispatch</p>
                </div>

                {/* Email Body */}
                <div className="p-5 space-y-3">
                  <div className="pb-3 border-b border-slate-100">
                    <p className="font-extrabold text-sm text-slate-900">Hello {previewUser.name || 'Member'},</p>
                    <p className="text-[10px] text-slate-400">Role: <strong className="text-[#0D5BFF]">{previewUser.role}</strong> • District: {previewUser.district || 'Dhaka'}</p>
                  </div>

                  <div className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                    {previewBody}
                  </div>

                  {enableCta && actionButtonText && (
                    <div className="py-4 text-center">
                      <span className={`inline-block px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md ${
                        category === 'promotional' ? 'bg-emerald-600' : 'bg-[#0D5BFF]'
                      }`}>
                        {actionButtonText} →
                      </span>
                    </div>
                  )}

                  {/* Verification note */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-[10px] text-slate-500 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-[#0D5BFF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-700">Verified Platform Relay</p>
                      <p className="text-[9px] text-slate-400">Dispatched through EduTrack's official Brevo API communication pipeline.</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-400 border-t border-slate-100">
                  <p className="font-bold text-slate-600 uppercase">EduTrack Bangladesh</p>
                  <p className="text-[9px] mt-0.5">Dhaka, Bangladesh • edutrackbangladesh@gmail.com</p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Campaign Dispatch History Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#0D5BFF]" />
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
                Campaign Dispatch History
              </h3>
              <p className="text-xs text-slate-400">Past mass email campaigns sent through Brevo</p>
            </div>
          </div>
          <span className="text-xs font-black text-slate-400 font-mono">
            {campaignHistory.length} Record{campaignHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#0D5BFF]/30 border-t-[#0D5BFF] rounded-full animate-spin" />
            <span className="text-xs">Loading campaign audit logs...</span>
          </div>
        ) : campaignHistory.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Mail className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No campaigns dispatched yet.</p>
            <p className="text-[10px] text-slate-400 mt-1">Select an audience above and click "Dispatch Bulk Campaign" to launch your first mailer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Campaign Name</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Audience Segment</th>
                  <th className="pb-3">Delivered</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaignHistory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 pl-2 font-bold text-slate-800 dark:text-white">
                      {item.campaignName || "Campaign"}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate font-medium">
                      {item.subject}
                    </td>
                    <td className="py-3">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.category === 'promotional' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : item.category === 'announcement'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 font-semibold uppercase text-[10px]">
                      {item.targetAudience}
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.sentCount} / {item.recipientCount}
                    </td>
                    <td className="py-3 text-[10px] text-slate-400">
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setCampaignName(item.campaignName || "");
                          setSubject(item.subject);
                          setCategory(item.category || 'promotional');
                          if (item.actionButtonText) setActionButtonText(item.actionButtonText);
                          if (item.actionButtonUrl) setActionButtonUrl(item.actionButtonUrl);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-[#0D5BFF] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Clone
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
