import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import BadgeDisplay from '../components/BadgeDisplay';
import TutorNotifyMeCard from '../components/TutorNotifyMeCard';
import ApplicationStatusTracker from '../components/ApplicationStatusTracker';
import SEOHead from '../components/SEOHead';
import UserAvatar from '../components/UserAvatar';
import AmbientBackground from '../components/AmbientBackground';
import { formatUserFriendlyError } from '../lib/errorMonitoring';
import { useBackHandler, scrollFieldIntoView, useVirtualKeyboardOpen } from '../utils/mobileWebView';
import {
  canUnlockTutorContact,
  getViewerTutorBookingStatus,
  hasActiveOrPendingBooking,
  sanitizeTutorProfileForViewer,
} from '../../shared/tutorPrivacy';
import {
  formatDhakaDateTime,
  isFutureDhakaSchedule,
  normalizeBangladeshScheduleIso,
  resolveSessionTrackerState,
} from '../../shared/tuitionLifecycle';
import { calculateProfileCompletion } from '../../shared/profileCompletion';
import ProfileCompletionGate from '../components/ProfileCompletionGate';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  BookOpen,
  Award,
  Lock,
  MessageSquare,
  GraduationCap,
  Briefcase,
  Share2,
  Heart,
  Eye,
  Send,
  X,
  Check,
  UserCheck,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  DAYS_OF_WEEK,
  SHORT_DAYS_UPPER,
  normalizeAvailabilitySlots,
  formatHourLabel,
} from '../../shared/availabilityUtils';

const DAYS_ORDER = DAYS_OF_WEEK;

function normalizeWhatsAppLink(num?: string) {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.startsWith('01') && digits.length === 11) {
    return `https://wa.me/88${digits}`;
  }
  if (digits.startsWith('880')) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}`;
}

export default function TeacherProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentUser = useAppStore((state) => state.currentUser);
  const storeSessions = useAppStore((state) => state.sessions);
  const studentProfiles = useAppStore((state) => state.studentProfiles);
  const bookSession = useAppStore((state) => state.bookSession);
  const toggleSavedTutor = useAppStore((state) => state.toggleSavedTutor);

  const studentCompletion = useMemo(
    () => calculateProfileCompletion(currentUser, { studentProfiles }),
    [currentUser, studentProfiles]
  );

  const handleNavigateToMissingStudentField = (fieldId?: string | null) => {
    const resolvedField = fieldId || studentCompletion.firstMissingFieldId || 'account-field-school';
    navigate(`/dashboard/profile?focusField=${encodeURIComponent(resolvedField)}`);
  };

  const [tutor, setTutor] = useState<any | null>(null);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [photoUnlocked, setPhotoUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Shortlist & booking modal states
  const [isTogglingShortlist, setIsTogglingShortlist] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState('05:00 PM');
  const [bookingSubjects, setBookingSubjects] = useState<string[]>([]);
  const [bookingIsTrial, setBookingIsTrial] = useState(false);
  const [bookingNote, setBookingNote] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  useBackHandler(showBookingModal, () => setShowBookingModal(false), 'teacher-booking-modal');
  const isKeyboardOpen = useVirtualKeyboardOpen();

  const viewerContext = useMemo(
    () => (currentUser ? { id: currentUser.id, role: currentUser.role } : null),
    [currentUser?.id, currentUser?.role]
  );

  const shouldUnlockContact = useMemo(
    () => (id ? canUnlockTutorContact(viewerContext, id, storeSessions) : false),
    [viewerContext, id, storeSessions]
  );

  const existingBooking = useMemo(
    () => (id ? getViewerTutorBookingStatus(viewerContext, id, storeSessions) : null),
    [viewerContext, id, storeSessions]
  );

  const activeOrPendingBooking = useMemo(
    () =>
      currentUser && id
        ? hasActiveOrPendingBooking(currentUser.id, id, storeSessions)
        : null,
    [currentUser?.id, id, storeSessions]
  );

  const isShortlisted = Boolean(
    currentUser?.savedTutors && id && currentUser.savedTutors.includes(id)
  );

  // Real-time Firestore listener for Tutor profile (sanitized immediately before state)
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const subscribeTutor = async () => {
      try {
        const [{ doc, onSnapshot }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('../lib/firebase'),
        ]);
        if (cancelled) return;

        const docRef = doc(db, 'users', id);
        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (cancelled) return;
            if (!docSnap.exists()) {
              setTutor(null);
              setContactUnlocked(false);
              setPhotoUnlocked(false);
              setLoading(false);
              return;
            }
            const raw = { id: docSnap.id, ...docSnap.data() } as any;
            if (raw.role !== 'tutor') {
              setTutor(null);
              setContactUnlocked(false);
              setPhotoUnlocked(false);
              setLoading(false);
              return;
            }

            const {
              tutor: safeTutor,
              contactUnlocked: unlocked,
              photoUnlocked: canViewPhoto,
            } = sanitizeTutorProfileForViewer(raw, viewerContext, storeSessions);
            setTutor(safeTutor);
            setContactUnlocked(unlocked);
            setPhotoUnlocked(canViewPhoto);
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to tutor document:', error);
            if (!cancelled) setLoading(false);
          }
        );
      } catch (err) {
        console.error('Failed to subscribe tutor profile:', err);
        if (!cancelled) setLoading(false);
      }
    };

    subscribeTutor();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [id, currentUser?.id, currentUser?.role, shouldUnlockContact]);

  // Real-time Firestore listener for verified student reviews
  useEffect(() => {
    if (!id) {
      setReviewsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const subscribeReviews = async () => {
      setReviewsLoading(true);
      try {
        const [{ collection, query, where, onSnapshot }, { db }] =
          await Promise.all([
            import('firebase/firestore'),
            import('../lib/firebase'),
          ]);
        if (cancelled) return;

        const q = query(
          collection(db, 'sessions'),
          where('tutorId', '==', id),
          where('rating', '>', 0)
        );
        unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            if (cancelled) return;
            const ratedSessions: any[] = [];
            querySnapshot.forEach((docSnap) => {
              const sData = docSnap.data();
              if (sData.rating && Number(sData.rating) > 0) {
                ratedSessions.push({ id: docSnap.id, ...sData });
              }
            });

            ratedSessions.sort((a, b) =>
              String(b.endTime || b.scheduledTime || '').localeCompare(
                String(a.endTime || a.scheduledTime || '')
              )
            );

            const reviewsWithDetails = ratedSessions.map((sess) => ({
              id: sess.id,
              subject: sess.subject,
              rating: sess.rating,
              feedback: sess.feedback,
              scheduledTime: sess.scheduledTime,
              endTime: sess.endTime,
              studentName: sess.studentDisplayName || 'Verified Student',
              studentImage: undefined,
            }));

            if (!cancelled) {
              setReviews(reviewsWithDetails);
              setReviewsLoading(false);
            }
          },
          (error) => {
            console.error('Error listening to reviews:', error);
            if (!cancelled) setReviewsLoading(false);
          }
        );
      } catch (err) {
        console.error('Failed to subscribe reviews:', err);
        if (!cancelled) setReviewsLoading(false);
      }
    };

    subscribeReviews();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  // Pre-fill first available tutor subject & slot when modal opens
  useEffect(() => {
    if (showBookingModal && tutor) {
      if (bookingSubjects.length === 0 && Array.isArray(tutor.subjects) && tutor.subjects.length > 0) {
        setBookingSubjects([tutor.subjects[0]]);
      }
      setBookingError('');
    }
  }, [showBookingModal, tutor]);

  const loginRedirectUrl = `/login?redirect=${encodeURIComponent(`/teachers/${id || ''}`)}`;

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2200);
  };

  const shareProfile = async () => {
    const shareData = {
      title: `${tutor?.name || 'Verified Tutor'} | EduTrack Bangladesh`,
      text: `Check out ${tutor?.name || 'this verified tutor'} (${tutor?.university || 'Subject Specialist'}) on EduTrack Bangladesh.`,
      url: window.location.href,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        copyToClipboard(window.location.href, 'profile');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        copyToClipboard(window.location.href, 'profile');
      }
    }
  };

  const handleShortlistToggle = async () => {
    if (!id) return;
    if (!currentUser) {
      navigate(loginRedirectUrl);
      return;
    }
    setIsTogglingShortlist(true);
    try {
      await toggleSavedTutor(id);
    } finally {
      setIsTogglingShortlist(false);
    }
  };

  const handleOpenBookingModal = () => {
    if (!currentUser) {
      navigate(loginRedirectUrl);
      return;
    }
    if (currentUser.role !== 'student') {
      navigate('/dashboard');
      return;
    }
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !tutor || !id) return;

    if (currentUser.role === 'student' && !studentCompletion.isComplete) {
      setBookingError(
        'টিচার বুকিং বা ট্রায়াল ক্লাস অনুরোধ পাঠাতে প্রথমে আপনার প্রোফাইলের প্রয়োজনীয় তথ্যগুলো সম্পূর্ণ করুন।'
      );
      return;
    }

    if (activeOrPendingBooking) {
      setBookingError('You already have an active or pending booking with this tutor.');
      return;
    }

    const chosenSubject =
      bookingSubjects.length > 0
        ? bookingSubjects.join(', ')
        : tutor.subjects?.[0] || 'General Tuition';

    const scheduledIso = normalizeBangladeshScheduleIso(bookingDate, bookingSlot);
    if (!scheduledIso || !isFutureDhakaSchedule(scheduledIso)) {
      setBookingError('Please select a future date and valid time in Bangladesh Standard Time.');
      return;
    }

    setIsSubmittingBooking(true);
    setBookingError('');
    try {
      await bookSession({
        studentId: currentUser.id,
        tutorId: id,
        subject: chosenSubject,
        scheduledTime: scheduledIso,
        status: 'requested_by_student',
        duration: 60,
        isTrial: bookingIsTrial,
        ...(bookingIsTrial ? { trialStatus: 'proposed_by_student' as const } : {}),
        trialProposedBy: currentUser.id,
        ...(bookingNote.trim() ? { note: bookingNote.trim() } : {}),
      });
      if (bookingNote.trim()) {
        try {
          await useAppStore.getState().sendMessage({
            senderId: currentUser.id,
            receiverId: id,
            content: `[${bookingIsTrial ? 'Trial Class Request' : 'Booking Request'} - ${chosenSubject}]: ${bookingNote.trim()}`,
          });
        } catch {
          // Non-blocking note message
        }
      }
      setBookingNote('');
      setBookingIsTrial(false);
      setShowBookingModal(false);
      setBookingSuccessMsg(
        bookingIsTrial
          ? 'Your trial class request has been sent to the tutor.'
          : 'Your tuition request has been sent to the tutor.'
      );
      setTimeout(() => setBookingSuccessMsg(''), 5000);
    } catch (err: any) {
      setBookingError(formatUserFriendlyError(err, 'booking'));
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const initDirectChat = () => {
    if (!currentUser) {
      navigate(`/login?redirect=${encodeURIComponent(`/messages?tId=${tutor?.id || id}`)}`);
      return;
    }
    navigate(`/messages?tId=${tutor?.id || id}`);
  };

  const scrollToAvailability = () => {
    const el = document.getElementById('availability-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const normalizedSlots = useMemo(
    () => normalizeAvailabilitySlots(tutor?.availabilitySlots),
    [tutor?.availabilitySlots]
  );

  const availabilityEntries = useMemo(() => {
    return DAYS_ORDER.map((day) => ({
      day,
      slots: normalizedSlots[day] || [],
    })).filter((entry) => entry.slots.length > 0);
  }, [normalizedSlots]);

  const totalWeeklySlots = useMemo(
    () => availabilityEntries.reduce((acc, e) => acc + e.slots.length, 0),
    [availabilityEntries]
  );

  const avgRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      return Number((sum / reviews.length).toFixed(1));
    }
    return tutor?.rating ? Number(Number(tutor.rating).toFixed(1)) : 0;
  }, [reviews, tutor?.rating]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B132B] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#111A2E] rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl border-4 border-slate-200 dark:border-slate-700 border-t-[#0D5BFF] animate-spin mx-auto" />
          <h2 className="text-base font-bold text-[#0B132B] dark:text-white">
            Loading Tutor Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verifying availability and academic credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B132B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white dark:bg-[#111A2E] rounded-3xl p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mx-auto mb-5">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black font-heading text-[#0B132B] dark:text-white mb-2">
            Tutor Profile Unavailable
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            This educator profile may have been deactivated or moved. Browse other verified tutors across Bangladesh.
          </p>
          <Link
            to="/#find-tutors"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Verified Tutors
          </Link>
        </div>
      </div>
    );
  }

  const isStrictlyVerified = Boolean(tutor.isVerified === true);
  const locationParts = [tutor.area, tutor.thana, tutor.district].filter(Boolean);
  const locationString =
    locationParts.length > 0 ? locationParts.join(', ') : 'Bangladesh (Online & Home)';
  const teachingModeLabel = tutor.teachingMode || tutor.mode || 'Home & Online';
  const feeValue = tutor.hourlyRate || tutor.expectedSalary;
  const hideFeeForGuest = Boolean(
    !currentUser && tutor.privacySettings?.hideExpectedSalaryPublic
  );
  const isOwner = currentUser?.id === tutor.id;
  const isStudent = currentUser?.role === 'student';

  const getBookingBadgeMeta = () => {
    if (!existingBooking) return null;
    switch (existingBooking.status) {
      case 'requested_by_student':
        return {
          label: 'Request Sent • Pending Tutor Reply',
          tone: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      case 'proposed_by_tutor':
        return {
          label: 'Tutor Proposal Received • Review in Dashboard',
          tone: 'bg-blue-50 dark:bg-blue-950/50 text-[#0D5BFF] dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        };
      case 'scheduled':
        return {
          label: 'Confirmed Booking Scheduled',
          tone: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
      case 'active':
        return {
          label: 'Live Session Active',
          tone: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
      case 'completed':
        return {
          label: 'Past Session Completed',
          tone: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
      default:
        return null;
    }
  };

  const bookingMeta = getBookingBadgeMeta();

  return (
    <div className="relative min-h-screen bg-[#FCFDFF] dark:bg-[#0B132B] pt-4 pb-28 md:pb-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <AmbientBackground />
      <SEOHead
        title={`${tutor.name} | Verified Tutor Profile - EduTrack Bangladesh`}
        description={`Connect with ${tutor.name} (${tutor.university || 'Academic Specialist'}) for ${tutor.subjects?.slice(0, 4).join(', ') || 'academic coaching'} in ${tutor.district || 'Bangladesh'}.`}
        keywords={`tutor ${tutor.name}, home tutor ${tutor.district || 'Dhaka'}, ${tutor.university || ''}, ${tutor.subjects?.join(', ') || ''}`}
        canonicalUrl={`https://edutrackbd.vercel.app/teachers/${tutor.id}`}
      />

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/#find-tutors'))}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0D5BFF] hover:text-[#0D5BFF] transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tutors</span>
          </button>

          <div className="flex items-center gap-2">
            {currentUser && !isOwner && (
              <button
                type="button"
                onClick={handleShortlistToggle}
                disabled={isTogglingShortlist}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isShortlisted
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400'
                    : 'bg-white dark:bg-[#111A2E] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-300'
                }`}
                aria-label={isShortlisted ? 'Remove from Shortlist' : 'Shortlist Tutor'}
              >
                <Heart className={`w-4 h-4 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={shareProfile}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0D5BFF] hover:text-[#0D5BFF] transition-colors cursor-pointer"
            >
              {copied === 'profile' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Toast Banner after Booking */}
        <AnimatePresence>
          {bookingSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold">{bookingSuccessMsg}</p>
              </div>
              <Link
                to="/dashboard/activity"
                className="text-xs font-bold text-[#0D5BFF] dark:text-blue-400 hover:underline shrink-0"
              >
                View Status
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Profile Summary Card */}
        <section className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Identity Block */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
              <UserAvatar
                src={photoUnlocked ? tutor.profileImage : undefined}
                locked={!photoUnlocked}
                name={tutor.name}
                isOnline={Boolean(tutor.isOnline)}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-200 dark:border-slate-700"
                fallbackClassName="bg-gradient-to-br from-[#0B132B] to-[#1E3A8A] text-white"
                textClassName="text-2xl font-black font-heading"
                onlineDotClassName="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111A2E]"
              />

              <div className="min-w-0 space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0B132B] dark:text-white tracking-tight break-words leading-snug">
                    {tutor.name}
                  </h1>
                  {isStrictlyVerified && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 text-xs font-bold shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Tutor</span>
                    </span>
                  )}
                  {tutor.gender && (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0">
                      {tutor.gender}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 break-words leading-snug">
                  {[tutor.university, tutor.course].filter(Boolean).join(' • ') ||
                    'Verified Subject Specialist'}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#0D5BFF] shrink-0" />
                    <span>{locationString}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[#0D5BFF] shrink-0" />
                    <span>{tutor.experience || 'Experienced Mentor'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                    <strong className="text-[#0B132B] dark:text-white">
                      {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400">
                      ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {bookingMeta && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${bookingMeta.tone}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{bookingMeta.label}</span>
                    </span>
                  )}
                  {!photoUnlocked && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5 text-[#0D5BFF] shrink-0" />
                      <span>Photo Protected • Unlocks Upon Confirmed Tuition</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Fee & Quick Action Block */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
              <div className="lg:text-right">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Monthly Tuition Fee
                </span>
                {hideFeeForGuest ? (
                  <Link
                    to={loginRedirectUrl}
                    className="text-sm font-bold text-[#0D5BFF] hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Sign in to view fee
                  </Link>
                ) : (
                  <div className="flex items-baseline gap-1.5 lg:justify-end">
                    <span className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white">
                      {feeValue ? `৳${Number(feeValue).toLocaleString()}` : 'Negotiable'}
                    </span>
                    {feeValue && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        /month • {tutor.daysPerWeek || 3} days/wk
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={scrollToAvailability}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-[#0D5BFF] text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-[#0D5BFF]" />
                  <span>View Availability</span>
                </button>

                {!isOwner && (
                  <button
                    type="button"
                    onClick={initDirectChat}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#0D5BFF] text-xs sm:text-sm font-semibold text-[#0B132B] dark:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-[#0D5BFF]" />
                    <span>Message</span>
                  </button>
                )}

                {isOwner ? (
                  <Link
                    to="/dashboard/profile"
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Edit My Profile</span>
                  </Link>
                ) : activeOrPendingBooking ? (
                  <Link
                    to="/dashboard/activity"
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0B132B] dark:bg-[#0D5BFF] text-white text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>View Booking Status</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenBookingModal}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Request Tutor</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {activeOrPendingBooking && (
          <ApplicationStatusTracker
            state={resolveSessionTrackerState(
              activeOrPendingBooking,
              currentUser?.role === 'tutor' ? 'tutor' : 'student'
            )}
            scheduleLabel={formatDhakaDateTime(activeOrPendingBooking.scheduledTime)}
            compact
          />
        )}

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Primary Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* About / Teaching Philosophy */}
            <section className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold font-heading text-[#0B132B] dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D5BFF]" />
                  <span>About & Teaching Approach</span>
                </h2>
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {teachingModeLabel}
                </span>
              </div>

              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {tutor.bio ||
                  `${tutor.name} is an EduTrack educator offering structured one-on-one and small-group academic guidance tailored to student exam goals and concept mastery.`}
              </p>

              {/* Key Academic Facts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    University / Institution
                  </span>
                  <span className="text-sm font-bold text-[#0B132B] dark:text-white mt-0.5 block">
                    {tutor.university || 'Academic Specialist'}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Department / Qualification
                  </span>
                  <span className="text-sm font-bold text-[#0B132B] dark:text-white mt-0.5 block">
                    {tutor.course || 'Subject Expert'}
                    {tutor.year ? ` • ${tutor.year} Year` : ''}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Preferred Areas
                  </span>
                  <span className="text-sm font-bold text-[#0B132B] dark:text-white mt-0.5 block">
                    {Array.isArray(tutor.teachingAreas) && tutor.teachingAreas.length > 0
                      ? tutor.teachingAreas.join(', ')
                      : locationString}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Curriculum / Schedule
                  </span>
                  <span className="text-sm font-bold text-[#0B132B] dark:text-white mt-0.5 block">
                    {[tutor.curriculum || 'Bangla & English Version', `${tutor.daysPerWeek || 3} Days/Week`]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
              </div>
            </section>

            {/* Subjects & Target Classes */}
            <section className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-5">
              <div>
                <h3 className="text-base font-bold font-heading text-[#0B132B] dark:text-white mb-3">
                  Subjects Taught
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(tutor.subjects) && tutor.subjects.length > 0 ? (
                    tutor.subjects.map((sub: string) => (
                      <span
                        key={sub}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold"
                      >
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      General Academic Subjects
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold font-heading text-[#0B132B] dark:text-white mb-3">
                  Classes & Levels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(tutor.classes) && tutor.classes.length > 0 ? (
                    tutor.classes.map((cls: string) => (
                      <span
                        key={cls}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 text-xs font-semibold"
                      >
                        {cls}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      School, College & Admission Preparation
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Weekly Availability Slots */}
            <section
              id="availability-section"
              className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4 scroll-mt-24"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold font-heading text-[#0B132B] dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0D5BFF]" />
                    <span>Weekly Availability</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live schedule synced directly from the tutor&apos;s calendar
                  </p>
                  <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 mt-1">
                    সপ্তাহের কোন দিন ও সময়ে শিক্ষক পড়াতে পারবেন তা নিচে দেখুন।
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 text-xs font-bold">
                  {totalWeeklySlots > 0 ? `${totalWeeklySlots} Open Slots` : 'Flexible Schedule'}
                </span>
              </div>

              {/* 7-Weekday Responsive Overview Bar (SUN - SAT, Zero Horizontal Scroll) */}
              <div
                data-testid="profile-weekly-7day-grid"
                className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full min-w-0"
              >
                {DAYS_ORDER.map((day) => {
                  const daySlots = normalizedSlots[day] || [];
                  const hasSlots = daySlots.length > 0;
                  return (
                    <div
                      key={day}
                      className={`min-w-0 flex flex-col items-center justify-center rounded-xl py-2 px-0.5 sm:px-1 border text-center transition-colors ${
                        hasSlots
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800 opacity-75'
                      }`}
                    >
                      <span className="text-[10px] sm:text-xs font-black tracking-tight text-[#0B132B] dark:text-white leading-tight">
                        {SHORT_DAYS_UPPER[day]}
                      </span>
                      <span
                        className={`mt-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                          hasSlots
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {hasSlots ? `${daySlots.length}h` : 'Off'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {availabilityEntries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availabilityEntries.map((entry) => (
                    <div
                      key={entry.day}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-[#0B132B] dark:text-white mb-2 flex items-center justify-between">
                        <span>{entry.day}</span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {entry.slots.length} {entry.slots.length === 1 ? 'slot' : 'slots'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.slots.map((slot: string) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setBookingSlot(slot);
                              if (isStudent && !activeOrPendingBooking) {
                                setShowBookingModal(true);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0D5BFF] hover:text-[#0D5BFF] transition-colors cursor-pointer"
                          >
                            <Clock className="w-3 h-3 text-[#0D5BFF]" />
                            <span>{formatHourLabel(slot)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                  No fixed slots listed yet — send a booking request or message {tutor.name} to arrange a mutually convenient time.
                </div>
              )}
            </section>

            {/* Achievements & Badges */}
            {Array.isArray(tutor.badges) && tutor.badges.length > 0 && (
              <section className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
                <h2 className="text-lg font-bold font-heading text-[#0B132B] dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0D5BFF]" />
                  <span>Milestones & Recognition</span>
                </h2>
                <BadgeDisplay badgeIds={tutor.badges} role="tutor" />
              </section>
            )}

            {/* Verified Student Reviews */}
            <section className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold font-heading text-[#0B132B] dark:text-white flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>Student Feedback</span>
                </h2>
                {reviews.length > 0 && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {avgRating.toFixed(1)} average from {reviews.length}{' '}
                    {reviews.length === 1 ? 'session' : 'sessions'}
                  </span>
                )}
              </div>

              {reviewsLoading ? (
                <div className="space-y-3">
                  <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            src={undefined}
                            locked={true}
                            name={rev.studentName}
                            className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700"
                            fallbackClassName="bg-blue-100 dark:bg-blue-950/70 text-[#0D5BFF] dark:text-blue-300"
                            textClassName="font-bold text-xs"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0B132B] dark:text-white break-words leading-snug">
                              {rev.studentName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 break-words leading-snug">
                              {rev.subject || 'Tuition Session'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= Number(rev.rating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rev.feedback && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          &ldquo;{rev.feedback}&rdquo;
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                  No written student reviews yet. Be the first to rate a completed session with {tutor.name}.
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar: Trust, Contact Privacy & Alerts */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Verification Trust Card (Status Badges Only — Zero Private Docs) */}
            <div className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold font-heading text-[#0B132B] dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <span>Safety &amp; Verification</span>
              </h3>
              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Identity Verification (NID / Univ ID)
                  </span>
                  <span
                    className={`font-bold ${
                      tutor.isVerified || tutor.nidStatus === 'approved' || tutor.academicStatus === 'approved'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {tutor.isVerified || tutor.nidStatus === 'approved' || tutor.academicStatus === 'approved'
                      ? 'Verified'
                      : 'Under Review'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Credential Compliance
                  </span>
                  <span
                    className={`font-bold ${
                      tutor.isVerified || tutor.nidStatus === 'approved' || tutor.academicStatus === 'approved'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {tutor.isVerified || tutor.nidStatus === 'approved' || tutor.academicStatus === 'approved'
                      ? 'Approved'
                      : 'Pending Check'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Identity documents (NID or University/College ID Card) are reviewed privately by EduTrack compliance administrators and are never exposed publicly.
              </p>
            </div>

            {/* Conditional Contact Unlock Card */}
            <div className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold font-heading text-[#0B132B] dark:text-white flex items-center gap-2">
                  {contactUnlocked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-[#0D5BFF]" />
                  )}
                  <span>Direct Contact</span>
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    contactUnlocked
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {contactUnlocked ? 'Unlocked' : 'Protected'}
                </span>
              </div>

              {contactUnlocked ? (
                <div className="space-y-2.5">
                  {tutor.phone && (
                    <a
                      href={`tel:${tutor.phone}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 hover:border-[#0D5BFF] transition-colors"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-[#0B132B] dark:text-white">
                        <Phone className="w-4 h-4 text-[#0D5BFF]" />
                        <span>{tutor.phone}</span>
                      </span>
                      <span className="text-xs font-bold text-[#0D5BFF]">Call</span>
                    </a>
                  )}
                  {(tutor.whatsappNumber || tutor.phone) && (
                    <a
                      href={normalizeWhatsAppLink(tutor.whatsappNumber || tutor.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 hover:border-emerald-400 transition-colors"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                        <MessageCircle className="w-4 h-4" />
                        <span>{tutor.whatsappNumber || tutor.phone}</span>
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        WhatsApp
                      </span>
                    </a>
                  )}
                  {tutor.email && (
                    <a
                      href={`mailto:${tutor.email}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 hover:border-[#0D5BFF] transition-colors"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-[#0B132B] dark:text-white min-w-0">
                        <Mail className="w-4 h-4 text-[#0D5BFF] shrink-0" />
                        <span className="truncate">{tutor.email}</span>
                      </span>
                      <span className="text-xs font-bold text-[#0D5BFF] shrink-0">Email</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Phone, WhatsApp, and email remain private until your tuition request is accepted and confirmed. You can still message or request a session anytime.
                  </div>
                  {!currentUser ? (
                    <Link
                      to={loginRedirectUrl}
                      className="w-full py-3 min-h-[44px] rounded-xl bg-[#0B132B] dark:bg-[#0D5BFF] hover:opacity-95 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sign In to Request & Unlock</span>
                    </Link>
                  ) : !isOwner && !activeOrPendingBooking && isStudent ? (
                    <button
                      type="button"
                      onClick={handleOpenBookingModal}
                      className="w-full py-3 min-h-[44px] rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Booking Request</span>
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* 30-Minute Pre-Class Push Alerts Card */}
            <TutorNotifyMeCard
              tutor={tutor}
              onRequireAuth={() => navigate(loginRedirectUrl)}
            />
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (320px–767px) */}
      {!isOwner && !isKeyboardOpen && !showBookingModal && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111A2E]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-4 py-3 pb-safe shadow-[0_-6px_24px_rgba(11,19,43,0.08)]">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                {tutor.daysPerWeek || 3} Days/Week
              </span>
              <span className="text-base font-black text-[#0B132B] dark:text-white truncate block">
                {hideFeeForGuest
                  ? 'Sign in for fee'
                  : feeValue
                    ? `৳${Number(feeValue).toLocaleString()}/mo`
                    : 'Negotiable'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShortlistToggle}
                disabled={isTogglingShortlist}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  isShortlisted
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
                aria-label="Shortlist Tutor"
              >
                <Heart className={`w-5 h-5 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>

              {activeOrPendingBooking ? (
                <Link
                  to="/dashboard/activity"
                  className="px-4 h-11 rounded-xl bg-[#0B132B] dark:bg-[#0D5BFF] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>View Status</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenBookingModal}
                  className="px-5 h-11 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Request Tutor</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Tutor / Book Session Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-white dark:bg-[#111A2E] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90dvh] overflow-y-auto p-5 sm:p-7 pb-safe"
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black font-heading text-[#0B132B] dark:text-white">
                    Request Tuition Session
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Send a request to {tutor.name} ({tutor.university || 'Verified Tutor'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                  aria-label="Close booking dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {currentUser?.role === 'student' && !studentCompletion.isComplete ? (
                <div className="pt-5">
                  <ProfileCompletionGate
                    role="student"
                    accountType={currentUser.accountType === 'guardian' ? 'guardian' : 'student'}
                    completion={studentCompletion}
                    onNavigateToField={handleNavigateToMissingStudentField}
                    variant="gate"
                  />
                </div>
              ) : (
                <form onSubmit={handleSubmitBooking} className="space-y-5 pt-5">
                {bookingError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Subject selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Select Subject(s)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(tutor.subjects) && tutor.subjects.length > 0
                      ? tutor.subjects
                      : ['Mathematics', 'English', 'Physics', 'General Coaching']
                    ).map((sub: string) => {
                      const active = bookingSubjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() =>
                            setBookingSubjects((prev) =>
                              active ? prev.filter((s) => s !== sub) : [...prev, sub]
                            )
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Preferred Start Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingDate}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Preferred Time
                    </label>
                    <select
                      value={bookingSlot}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      onChange={(e) => setBookingSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    >
                      {Array.from(
                        new Set([
                          ...availabilityEntries.flatMap((e) => e.slots),
                          '03:00 PM',
                          '04:00 PM',
                          '05:00 PM',
                          '06:30 PM',
                          '08:00 PM',
                        ])
                      ).map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Trial class option */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingIsTrial}
                    onChange={(e) => setBookingIsTrial(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0D5BFF] focus:ring-[#0D5BFF]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#0B132B] dark:text-white block">
                      Schedule as a Demo / Trial Class first
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tutor contact details stay protected until the trial or tuition is confirmed.
                    </span>
                  </div>
                </label>

                {/* Optional Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Note for Tutor (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={bookingNote}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Share your class, area, or specific goals..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-[#0B132B] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF]"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="w-full sm:flex-1 py-3 min-h-[44px] rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingBooking ? 'Sending Request...' : 'Send Booking Request'}</span>
                  </button>
                </div>
              </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
