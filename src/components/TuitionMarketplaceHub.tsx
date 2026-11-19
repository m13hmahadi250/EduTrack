import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore, User } from '../store';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshData';
import UserAvatar from './UserAvatar';
import {
  formatInstitutionWithLocation,
  formatTeachingModeLabel,
  formatTutorClassesRange,
  formatTutorSubjectsSummary,
  isTutorVerified,
} from '../../shared/tutorListing';
import { canViewTutorPhoto } from '../../shared/tutorPrivacy';
import { calculateProfileCompletion } from '../../shared/profileCompletion';
import ProfileCompletionGate from './ProfileCompletionGate';
import { matchTuitionsForTutor, matchTutorsForStudentNeed } from '../../shared/matching';
import {
  formatDhakaDateTime,
  hasScheduleConflict,
  isFutureDhakaSchedule,
  normalizeBangladeshScheduleIso,
  resolveApplicationTrackerState,
  TrialScheduleStatus,
} from '../../shared/tuitionLifecycle';
import {
  dispatchMatchingTuitionAlerts,
  sendWorkflowEmailNotification,
} from '../services/mailService';
import ApplicationStatusTracker from './ApplicationStatusTracker';
import { useBackHandler, scrollFieldIntoView } from '../utils/mobileWebView';
import {
  BookOpen,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle,
  Search,
  Plus,
  Send,
  Briefcase,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  MessageSquare,
  Bookmark,
  GraduationCap,
  Filter,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';

export interface TuitionApplicationItem {
  tutorId: string;
  tutorName: string;
  tutorInstitution?: string;
  tutorSubjects?: string[];
  tutorExperience?: string;
  tutorIsVerified?: boolean;
  proposedRate?: number;
  message: string;
  status: 'submitted' | 'shortlisted' | 'trial_scheduled' | 'selected' | 'rejected';
  trialDate?: string;
  trialStatus?: TrialScheduleStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface TuitionCircularRecord {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  subject: string;
  studentClass: string;
  curriculum?: string;
  mode?: 'Home Tutoring' | 'Online Tutoring' | 'Home & Online';
  district: string;
  area?: string;
  salary: number;
  daysPerWeek: number;
  preferredTime?: string;
  genderPreference?: string;
  requirements?: string;
  status: 'active' | 'assigned' | 'closed';
  selectedTutorId?: string;
  selectedTutorName?: string;
  applications?: TuitionApplicationItem[];
  createdAt: string;
}

interface TuitionMarketplaceHubProps {
  mode: 'student' | 'tutor' | 'admin' | 'public';
  onMessageUser?: (targetUserId: string) => void;
}

const DRAFT_STORAGE_KEY = 'edutrack_tuition_post_draft_v1';
const SAVED_TUITIONS_KEY = 'edutrack_saved_tuitions_v1';

export default function TuitionMarketplaceHub({ mode, onMessageUser }: TuitionMarketplaceHubProps) {
  const navigate = useNavigate();
  const {
    currentUser,
    users,
    sessions,
    studentProfiles,
    sendNotification,
    bookSession,
    acceptSession,
    confirmTrialSession,
    proposeSessionReschedule,
    cancelSession,
    toggleSavedTuition,
    updateNotificationPreferences,
  } = useAppStore();

  const [tuitions, setTuitions] = useState<TuitionCircularRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const userCompletion = useMemo(
    () => calculateProfileCompletion(currentUser, { studentProfiles }),
    [currentUser, studentProfiles]
  );

  const handleNavigateToMissingField = (fieldId?: string | null) => {
    const resolvedField =
      fieldId ||
      userCompletion.firstMissingFieldId ||
      (currentUser?.role === 'tutor' ? 'tutor-field-university' : 'account-field-school');
    navigate(`/dashboard/profile?focusField=${encodeURIComponent(resolvedField)}`);
  };

  // Active sub-view inside the hub
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'post' | 'my_posts' | 'my_applications' | 'recommended'>(
    mode === 'student' ? 'my_posts' : mode === 'tutor' ? 'browse' : 'browse'
  );

  useEffect(() => {
    const handleTourSubTab = (event: Event) => {
      const custom = event as CustomEvent<{
        mode?: 'student' | 'tutor' | 'admin' | 'public';
        subTab?: 'browse' | 'post' | 'my_posts' | 'my_applications' | 'recommended';
      }>;
      const targetSubTab = custom.detail?.subTab;
      if (!targetSubTab) return;
      if (custom.detail?.mode && custom.detail.mode !== mode) return;
      setActiveSubTab(targetSubTab);
    };
    window.addEventListener('edutrack-tour-marketplace-subtab', handleTourSubTab);
    return () => window.removeEventListener('edutrack-tour-marketplace-subtab', handleTourSubTab);
  }, [mode]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [filterCurriculum, setFilterCurriculum] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('All');
  const [filterMode, setFilterMode] = useState('All');
  const [filterMinSalary, setFilterMinSalary] = useState('All');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const [savedTuitionIds, setSavedTuitionIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_TUITIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const effectiveSavedTuitionIds = currentUser?.savedTuitions ?? savedTuitionIds;

  const toggleSaveTuition = async (id: string) => {
    await toggleSavedTuition(id);
    if (!currentUser) {
      setSavedTuitionIds((prev) => {
        const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
        try {
          localStorage.setItem(SAVED_TUITIONS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  // Student 5-Step Guided Posting Form State (with safe draft persistence)
  const [postStep, setPostStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedChildProfileId, setSelectedChildProfileId] = useState<string>(
    currentUser?.activeStudentProfileId || studentProfiles[0]?.id || ''
  );
  const hasDirtyDraftRef = React.useRef<boolean>((() => {
    try {
      return Boolean(localStorage.getItem(DRAFT_STORAGE_KEY));
    } catch {
      return false;
    }
  })());

  const buildProfileDefaults = React.useCallback((overrideChildId?: string) => {
    const targetId = overrideChildId ?? selectedChildProfileId ?? currentUser?.activeStudentProfileId;
    const activeChild =
      studentProfiles.find((p) => p.id === targetId) ||
      studentProfiles.find((p) => p.id === currentUser?.activeStudentProfileId) ||
      studentProfiles[0];
    return {
      subject:
        (activeChild?.subjects && activeChild.subjects.join(', ')) ||
        currentUser?.subject ||
        (currentUser?.subjects && currentUser.subjects.join(', ')) ||
        'Mathematics, Physics',
      studentClass: activeChild?.studentClass || currentUser?.studentClass || 'Class 9 - 10 (SSC)',
      curriculum: activeChild?.curriculum || currentUser?.curriculum || 'NCTB Bangla Medium',
      tutoringMode: 'Home Tutoring' as 'Home Tutoring' | 'Online Tutoring' | 'Home & Online',
      district: activeChild?.district || currentUser?.district || 'Dhaka',
      area: activeChild?.area || currentUser?.area || '',
      daysPerWeek: 3,
      preferredTime: 'Evening (5:00 PM - 8:00 PM)',
      genderPreference: 'Any Verified Tutor',
      salary: 6000,
      requirements: '',
    };
  }, [currentUser, studentProfiles, selectedChildProfileId]);

  const [postForm, setPostForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return buildProfileDefaults();
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tutor Application Modal State
  const [applyingTuition, setApplyingTuition] = useState<TuitionCircularRecord | null>(null);
  const [proposedRate, setProposedRate] = useState('');
  const [applicationNote, setApplicationNote] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Student Trial Scheduling Modal State
  const [trialModalState, setTrialModalState] = useState<{
    tuition: TuitionCircularRecord;
    applicant: TuitionApplicationItem;
  } | null>(null);
  const [trialDateTime, setTrialDateTime] = useState('');
  const [rescheduleTargetKey, setRescheduleTargetKey] = useState<string | null>(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState('');
  const [savingAlertPref, setSavingAlertPref] = useState(false);

  useBackHandler(Boolean(applyingTuition), () => setApplyingTuition(null), 'marketplace-apply-modal');
  useBackHandler(Boolean(trialModalState), () => setTrialModalState(null), 'marketplace-trial-modal');

  // Auto-populate wizard fields when Firestore user / studentProfiles hydrate asynchronously
  useEffect(() => {
    if (mode !== 'student') return;
    if (!selectedChildProfileId && (currentUser?.activeStudentProfileId || studentProfiles[0]?.id)) {
      setSelectedChildProfileId(currentUser?.activeStudentProfileId || studentProfiles[0]?.id || '');
    }
    if (!hasDirtyDraftRef.current && currentUser) {
      setPostForm((prev: any) => ({
        ...prev,
        ...buildProfileDefaults(),
        tutoringMode: prev.tutoringMode || 'Home Tutoring',
        daysPerWeek: prev.daysPerWeek || 3,
        preferredTime: prev.preferredTime || 'Evening (5:00 PM - 8:00 PM)',
        genderPreference: prev.genderPreference || 'Any Verified Tutor',
        salary: prev.salary || 6000,
        requirements: prev.requirements || '',
      }));
    }
  }, [mode, currentUser, studentProfiles, selectedChildProfileId, buildProfileDefaults]);

  const updatePostForm = (updater: any) => {
    hasDirtyDraftRef.current = true;
    setPostForm(updater);
  };

  // Persist draft only when user explicitly edits the wizard
  useEffect(() => {
    if (mode === 'student' && hasDirtyDraftRef.current) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(postForm));
      } catch {}
    }
  }, [postForm, mode]);

  // Real-time Firestore listener on `tuitions`
  useEffect(() => {
    const q = query(collection(db, 'tuitions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: TuitionCircularRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            studentId: d.studentId || '',
            studentName: d.studentName || 'Guardian',
            title: d.title || `${d.subject || 'Academic'} Tutor Needed in ${d.district || 'Dhaka'}`,
            subject: d.subject || 'General Subjects',
            studentClass: d.studentClass || 'Standard Class',
            curriculum: d.curriculum || 'NCTB Bangla Medium',
            mode: d.mode || 'Home Tutoring',
            district: d.district || 'Dhaka',
            area: d.area || '',
            salary: Number(d.salary || 5000),
            daysPerWeek: Number(d.daysPerWeek || 3),
            preferredTime: d.preferredTime || 'Flexible',
            genderPreference: d.genderPreference || 'Any',
            requirements: d.requirements || d.notes || '',
            status: d.status || 'active',
            selectedTutorId: d.selectedTutorId,
            selectedTutorName: d.selectedTutorName,
            applications: Array.isArray(d.applications) ? d.applications : [],
            createdAt: d.createdAt || new Date().toISOString(),
          };
        });
        setTuitions(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error listening to tuitions collection:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Student's own posted tuition circulars
  const myStudentPosts = useMemo(() => {
    if (!currentUser) return [];
    return tuitions.filter((t) => t.studentId === currentUser.id);
  }, [tuitions, currentUser]);

  // Tutor's submitted applications across all tuition circulars
  const myTutorApplications = useMemo(() => {
    if (!currentUser) return [];
    const results: Array<{ tuition: TuitionCircularRecord; myApp: TuitionApplicationItem }> = [];
    tuitions.forEach((t) => {
      const found = t.applications?.find((a) => a.tutorId === currentUser.id);
      if (found) {
        results.push({ tuition: t, myApp: found });
      }
    });
    return results;
  }, [tuitions, currentUser]);

  // Filtered open tuitions for browsing
  const filteredTuitions = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return (Array.isArray(tuitions) ? tuitions : []).filter((t) => {
      if (!t) return false;
      if (mode !== 'admin' && t.status === 'closed') return false;
      if (showSavedOnly && !effectiveSavedTuitionIds.includes(t.id)) return false;

      const titleStr = (t.title || '').toLowerCase();
      const subjectStr = (t.subject || '').toLowerCase();
      const districtStr = (t.district || '').toLowerCase();
      const areaStr = (t.area || '').toLowerCase();
      const classStr = (t.studentClass || '').toLowerCase();

      const matchesSearch =
        !q ||
        titleStr.includes(q) ||
        subjectStr.includes(q) ||
        districtStr.includes(q) ||
        areaStr.includes(q) ||
        classStr.includes(q);

      const matchesSubject =
        filterSubject === 'All' || subjectStr.includes(filterSubject.toLowerCase());

      const matchesClass =
        filterClass === 'All' || classStr.includes(filterClass.toLowerCase());

      const matchesCurriculum =
        filterCurriculum === 'All' ||
        (t.curriculum && t.curriculum.toLowerCase().includes(filterCurriculum.toLowerCase()));

      const matchesDistrict =
        filterDistrict === 'All' || districtStr === filterDistrict.toLowerCase();

      const matchesMode =
        filterMode === 'All' ||
        (t.mode && t.mode.toLowerCase().includes(filterMode.toLowerCase()));

      const matchesSalary =
        filterMinSalary === 'All' || Number(t.salary || 0) >= Number(filterMinSalary);

      return (
        matchesSearch &&
        matchesSubject &&
        matchesClass &&
        matchesCurriculum &&
        matchesDistrict &&
        matchesMode &&
        matchesSalary
      );
    });
  }, [
    tuitions,
    mode,
    showSavedOnly,
    effectiveSavedTuitionIds,
    searchQuery,
    filterSubject,
    filterClass,
    filterCurriculum,
    filterDistrict,
    filterMode,
    filterMinSalary,
  ]);

  // Explainable Rule-Based Recommendations for Tutors
  const recommendedTuitionsForTutor = useMemo(() => {
    if (!currentUser || currentUser.role !== 'tutor') return [];
    return matchTuitionsForTutor(tuitions, currentUser).map((match) => ({
      tuition: match.item,
      reasons: match.reasons,
      score: match.score,
    }));
  }, [tuitions, currentUser]);

  // Explainable Rule-Based Tutor Recommendations for Students
  const recommendedTutorsForStudent = useMemo(() => {
    if (!currentUser) return [];
    const latestPost = myStudentPosts[0];
    const activeChild =
      studentProfiles.find((p) => p.id === currentUser.activeStudentProfileId) ||
      studentProfiles[0];

    return matchTutorsForStudentNeed(
      users,
      {
        subject:
          latestPost?.subject ||
          activeChild?.subjects?.join(', ') ||
          currentUser.subject ||
          currentUser.subjects?.join(', '),
        studentClass:
          latestPost?.studentClass || activeChild?.studentClass || currentUser.studentClass,
        curriculum: latestPost?.curriculum || activeChild?.curriculum || currentUser.curriculum,
        district: latestPost?.district || activeChild?.district || currentUser.district,
        area: latestPost?.area || activeChild?.area || currentUser.area,
        mode: latestPost?.mode,
        budget: latestPost?.salary,
        genderPreference: latestPost?.genderPreference,
      },
      6
    ).map((match) => ({
      tutor: match.item,
      reasons: match.reasons,
      score: match.score,
    }));
  }, [users, currentUser, myStudentPosts, studentProfiles]);

  // Publish new Student Tuition Requirement
  const handlePublishTuition = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!postForm.subject.trim() || !postForm.studentClass.trim() || !postForm.district.trim()) {
      setFeedbackBanner({
        type: 'error',
        text: 'Please complete Subject, Class, and District before publishing.',
      });
      return;
    }

    setIsPublishing(true);
    setFeedbackBanner(null);
    try {
      const generatedTitle = `${postForm.studentClass} — ${postForm.subject} Tutor Needed in ${
        postForm.area ? `${postForm.area}, ${postForm.district}` : postForm.district
      }`;

      const selectedChild = studentProfiles.find((p) => p.id === selectedChildProfileId);
      const createdTuitionDoc = await addDoc(collection(db, 'tuitions'), {
        studentId: currentUser.id,
        studentName: selectedChild?.studentName || currentUser.studentName || currentUser.name || 'Guardian',
        ...(selectedChild ? { studentProfileId: selectedChild.id } : {}),
        title: generatedTitle,
        subject: postForm.subject.trim(),
        studentClass: postForm.studentClass.trim(),
        curriculum: postForm.curriculum,
        mode: postForm.tutoringMode,
        district: postForm.district,
        area: postForm.area.trim(),
        daysPerWeek: Number(postForm.daysPerWeek) || 3,
        preferredTime: postForm.preferredTime,
        genderPreference: postForm.genderPreference,
        salary: Number(postForm.salary) || 5000,
        requirements: postForm.requirements.trim() || 'Looking for a punctual, verified tutor.',
        status: 'active',
        applications: [],
        createdAt: new Date().toISOString(),
      });

      const matchedTutors = matchTutorsForStudentNeed(
        users,
        {
          subject: postForm.subject.trim(),
          studentClass: postForm.studentClass.trim(),
          curriculum: postForm.curriculum,
          district: postForm.district,
          area: postForm.area.trim(),
          mode: postForm.tutoringMode,
          budget: Number(postForm.salary) || 5000,
          genderPreference: postForm.genderPreference,
        },
        15
      );
      if (matchedTutors.length > 0) {
        dispatchMatchingTuitionAlerts(
          createdTuitionDoc.id,
          matchedTutors.map((m) => m.item.id)
        ).catch(() => {});
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      hasDirtyDraftRef.current = false;
      setPostStep(1);
      setActiveSubTab('my_posts');
      setFeedbackBanner({
        type: 'success',
        text: 'Your tuition requirement has been published! Matching verified tutors have been alerted.',
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Could not publish tuition circular. Please try again.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Tutor submits an application to an open tuition circular
  const handleTutorSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !applyingTuition) return;

    if (currentUser.role === 'tutor' && !userCompletion.isComplete) {
      setFeedbackBanner({
        type: 'error',
        text: 'নতুন টিউশনে আবেদন করতে আপনার প্রোফাইলের প্রয়োজনীয় তথ্যগুলো সম্পূর্ণ করুন। (Please complete all required tutor profile fields before applying.)',
      });
      setApplyingTuition(null);
      return;
    }

    const alreadyApplied = applyingTuition.applications?.some(
      (a) => a.tutorId === currentUser.id
    );
    if (alreadyApplied) {
      setFeedbackBanner({
        type: 'error',
        text: 'You have already applied to this tuition requirement.',
      });
      setApplyingTuition(null);
      return;
    }

    setIsSubmittingApp(true);
    try {
      const newApp: TuitionApplicationItem = {
        tutorId: currentUser.id,
        tutorName: currentUser.name,
        tutorInstitution: currentUser.university || 'Verified Educator',
        tutorSubjects: currentUser.subjects || [],
        tutorExperience: currentUser.experience || '',
        tutorIsVerified: Boolean(currentUser.isVerified),
        proposedRate: Number(proposedRate) || applyingTuition.salary,
        message:
          applicationNote.trim() ||
          `Assalamu Alaikum, I am experienced in teaching ${applyingTuition.subject} for ${applyingTuition.studentClass} and would love to conduct a trial session.`,
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'tuitions', applyingTuition.id), {
        applications: arrayUnion(newApp),
      });

      sendWorkflowEmailNotification({
        eventType: 'tuition_application_received',
        tuitionId: applyingTuition.id,
        idempotencyKey: `app:${applyingTuition.id}:${currentUser.id}`,
        summaryNote: newApp.message,
      }).catch(() => {});

      if (applyingTuition.studentId) {
        await sendNotification(
          applyingTuition.studentId,
          'New Tutor Application Received',
          `${currentUser.name} (${currentUser.university || 'Verified Tutor'}) applied for "${applyingTuition.title}".`,
          'info'
        );
      }

      setApplyingTuition(null);
      setApplicationNote('');
      setFeedbackBanner({
        type: 'success',
        text: 'Application submitted! You can track its status in "My Applications".',
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Failed to submit application.',
      });
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Student updates applicant status: Shortlist / Schedule Trial / Confirm Hiring / Reject
  const handleUpdateApplicantStatus = async (
    tuition: TuitionCircularRecord,
    targetTutorId: string,
    newStatus: TuitionApplicationItem['status'],
    extraTrialDate?: string
  ) => {
    if (!currentUser || !tuition.applications) return;

    try {
      const targetApp = tuition.applications.find((a) => a.tutorId === targetTutorId);
      if (!targetApp) return;

      let normalizedTrialIso: string | undefined;
      if (newStatus === 'trial_scheduled') {
        const candidateIso = extraTrialDate
          ? normalizeBangladeshScheduleIso(extraTrialDate)
          : new Date(Date.now() + 86400000).toISOString();
        if (!candidateIso || !isFutureDhakaSchedule(candidateIso)) {
          setFeedbackBanner({
            type: 'error',
            text: 'Please choose a future date and valid time in Bangladesh Standard Time for the trial class.',
          });
          return;
        }
        const conflictCheck = hasScheduleConflict(candidateIso, sessions, {
          tutorId: targetTutorId,
          studentId: currentUser.id,
        });
        if (conflictCheck.conflict) {
          setFeedbackBanner({
            type: 'error',
            text:
              conflictCheck.reason ||
              'That time slot conflicts with an existing booking or trial session.',
          });
          return;
        }
        normalizedTrialIso = candidateIso;
      }

      const updatedApps = tuition.applications.map((app) => {
        if (app.tutorId === targetTutorId) {
          return {
            ...app,
            status: newStatus,
            ...(normalizedTrialIso
              ? {
                  trialDate: normalizedTrialIso,
                  trialStatus: 'proposed_by_student' as TrialScheduleStatus,
                }
              : {}),
            updatedAt: new Date().toISOString(),
          };
        }
        return app;
      });

      const docPayload: Record<string, any> = {
        applications: updatedApps,
      };

      if (newStatus === 'selected') {
        docPayload.status = 'assigned';
        docPayload.selectedTutorId = targetTutorId;
        docPayload.selectedTutorName = targetApp.tutorName;
      }

      await updateDoc(doc(db, 'tuitions', tuition.id), docPayload);

      // Sync Session record & dispatch smart email notifications
      if (newStatus === 'shortlisted') {
        await sendNotification(
          targetTutorId,
          'You Have Been Shortlisted!',
          `${currentUser.name} shortlisted your application for "${tuition.title}".`,
          'info'
        );
        sendWorkflowEmailNotification({
          eventType: 'tutor_shortlisted',
          tuitionId: tuition.id,
          targetTutorId,
          idempotencyKey: `shortlist:${tuition.id}:${targetTutorId}`,
        }).catch(() => {});
      } else if (newStatus === 'trial_scheduled' && normalizedTrialIso) {
        // Privacy lock: Keep status at requested_by_student until tutor confirms trial
        await bookSession({
          studentId: currentUser.id,
          tutorId: targetTutorId,
          subject: `${tuition.subject} (Trial Class)`,
          scheduledTime: normalizedTrialIso,
          duration: 60,
          status: 'requested_by_student',
          isTrial: true,
          trialStatus: 'proposed_by_student',
          trialProposedBy: currentUser.id,
          tuitionId: tuition.id,
        });
      } else if (newStatus === 'selected') {
        const existingPendingOrActive = sessions.find(
          (s) =>
            s.studentId === currentUser.id &&
            s.tutorId === targetTutorId &&
            !['cancelled', 'rejected', 'completed'].includes(s.status)
        );
        if (existingPendingOrActive && existingPendingOrActive.status !== 'scheduled' && existingPendingOrActive.status !== 'active') {
          await acceptSession(existingPendingOrActive.id);
        } else if (!existingPendingOrActive) {
          await bookSession({
            studentId: currentUser.id,
            tutorId: targetTutorId,
            subject: tuition.subject,
            scheduledTime: new Date(Date.now() + 86400000).toISOString(),
            duration: 60,
            status: 'scheduled',
            tuitionId: tuition.id,
          });
        }
        await sendNotification(
          targetTutorId,
          'Congratulations! Tuition Confirmed',
          `${currentUser.name} confirmed you as the selected tutor for "${tuition.title}".`,
          'success'
        );
        sendWorkflowEmailNotification({
          eventType: 'tuition_confirmed',
          tuitionId: tuition.id,
          targetTutorId,
          idempotencyKey: `confirm:${tuition.id}:${targetTutorId}`,
        }).catch(() => {});
      } else if (newStatus === 'rejected') {
        await sendNotification(
          targetTutorId,
          'Application Status Update',
          `The guardian has updated the status of "${tuition.title}". Thank you for applying.`,
          'info'
        );
        sendWorkflowEmailNotification({
          eventType: 'request_declined',
          tuitionId: tuition.id,
          targetTutorId,
          idempotencyKey: `reject:${tuition.id}:${targetTutorId}`,
        }).catch(() => {});
      }

      setFeedbackBanner({
        type: 'success',
        text:
          newStatus === 'selected'
            ? `Confirmed ${targetApp.tutorName} for this tuition! A scheduled session has been created.`
            : newStatus === 'trial_scheduled'
            ? `Trial class invitation sent to ${targetApp.tutorName} for ${formatDhakaDateTime(normalizedTrialIso)}.`
            : newStatus === 'shortlisted'
            ? `${targetApp.tutorName} added to your shortlist.`
            : `Updated application status for ${targetApp.tutorName}.`,
      });
      setTrialModalState(null);
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Could not update application status.',
      });
    }
  };

  // Tutor or Guardian responds to a proposed trial schedule (Confirm / Suggest Alternate Time / Cancel)
  const handleTrialResponse = async (
    tuition: TuitionCircularRecord,
    targetTutorId: string,
    action: 'confirm' | 'reschedule' | 'cancel',
    alternateDateTime?: string
  ) => {
    if (!currentUser || !tuition.applications) return;
    try {
      let nextTrialIso: string | undefined;
      if (action === 'reschedule') {
        const parsedIso = alternateDateTime ? normalizeBangladeshScheduleIso(alternateDateTime) : null;
        if (!parsedIso || !isFutureDhakaSchedule(parsedIso)) {
          setFeedbackBanner({
            type: 'error',
            text: 'Please choose a valid future date & time in Bangladesh Standard Time.',
          });
          return;
        }
        const conflictCheck = hasScheduleConflict(parsedIso, sessions, {
          tutorId: targetTutorId,
          studentId: tuition.studentId,
        });
        if (conflictCheck.conflict) {
          setFeedbackBanner({
            type: 'error',
            text: conflictCheck.reason || 'Requested alternate time overlaps with another scheduled class.',
          });
          return;
        }
        nextTrialIso = parsedIso;
      }

      const nextTrialStatus: TrialScheduleStatus =
        action === 'confirm'
          ? 'confirmed'
          : action === 'reschedule'
            ? 'rescheduled_by_tutor'
            : 'cancelled';

      const updatedApps = tuition.applications.map((app) => {
        if (app.tutorId !== targetTutorId) return app;
        return {
          ...app,
          trialStatus: nextTrialStatus,
          ...(nextTrialIso ? { trialDate: nextTrialIso } : {}),
          updatedAt: new Date().toISOString(),
        };
      });

      await updateDoc(doc(db, 'tuitions', tuition.id), {
        applications: updatedApps,
      });

      const linkedSession = sessions.find(
        (s) =>
          (s.tuitionId === tuition.id || (s.studentId === tuition.studentId && s.tutorId === targetTutorId)) &&
          !['cancelled', 'rejected', 'completed'].includes(s.status)
      );

      if (linkedSession) {
        if (action === 'confirm') {
          await confirmTrialSession(linkedSession.id);
        } else if (action === 'reschedule' && nextTrialIso) {
          await proposeSessionReschedule(linkedSession.id, nextTrialIso);
        } else if (action === 'cancel') {
          await cancelSession(linkedSession.id);
        }
      } else {
        const eventType =
          action === 'confirm'
            ? 'trial_confirmed'
            : action === 'reschedule'
              ? 'trial_rescheduled'
              : 'trial_cancelled';
        sendWorkflowEmailNotification({
          eventType,
          tuitionId: tuition.id,
          targetTutorId,
          scheduleIso: nextTrialIso,
        }).catch(() => {});
      }

      setRescheduleTargetKey(null);
      setRescheduleDateTime('');
      setFeedbackBanner({
        type: 'success',
        text:
          action === 'confirm'
            ? 'Trial class schedule confirmed!'
            : action === 'reschedule'
              ? `Alternate trial time proposed: ${formatDhakaDateTime(nextTrialIso)}.`
              : 'Trial class cancelled.',
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Could not update trial class schedule.',
      });
    }
  };

  // Close or reopen circular
  const handleToggleCircularStatus = async (tuition: TuitionCircularRecord, nextStatus: 'active' | 'closed') => {
    try {
      await updateDoc(doc(db, 'tuitions', tuition.id), { status: nextStatus });
      setFeedbackBanner({
        type: 'success',
        text: `Tuition circular marked as ${nextStatus}.`,
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Failed to update circular status.',
      });
    }
  };

  const handleDeleteCircular = async (tuitionId: string) => {
    try {
      await deleteDoc(doc(db, 'tuitions', tuitionId));
      setFeedbackBanner({
        type: 'success',
        text: 'Tuition circular removed.',
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Failed to delete circular.',
      });
    }
  };

  return (
    <div
      className="space-y-6"
      data-tour-id={
        mode === 'student'
          ? 'student-marketplace-hub'
          : mode === 'tutor'
          ? 'tutor-marketplace-hub'
          : undefined
      }
    >
      {/* Header & Sub-Navigation Tabs */}
      {mode !== 'public' && (
        <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D5BFF]">
              {mode === 'student'
                ? 'Guardian Tuition & Matching Hub'
                : mode === 'tutor'
                ? 'Verified Tuition Job Board & Application Tracker'
                : 'Tuition Circulars Moderation'}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-[#0B132B] dark:text-white mt-0.5">
              {mode === 'student'
                ? 'Post Tuition Requirements & Hire Verified Tutors'
                : mode === 'tutor'
                ? 'Discover Matching Tuitions & Track Applications'
                : 'Manage All Tuition Circulars & Applications'}
            </h2>
            {mode === 'student' && (
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-[1.65]"
              >
                আপনার প্রয়োজন অনুযায়ী টিউশনের বিস্তারিত তথ্য দিন।
              </p>
            )}
            {mode === 'tutor' && (
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-[1.65]"
              >
                আপনার যোগ্যতা ও পছন্দ অনুযায়ী টিউশন খুঁজুন।
              </p>
            )}
            {mode === 'admin' && (
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-[1.65]"
              >
                প্রকাশিত টিউশন সার্কুলার ও শিক্ষকদের আবেদন তদারকি করুন।
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'student' && (
              <>
                <button
                  type="button"
                  data-tour-id="student-my-posts-btn"
                  onClick={() => setActiveSubTab('my_posts')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'my_posts'
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  My Tuition Posts ({myStudentPosts.length})
                </button>
                <button
                  type="button"
                  data-tour-id="student-post-tuition-btn"
                  onClick={() => setActiveSubTab('post')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'post'
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Tuition Requirement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('recommended')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'recommended'
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Recommended Tutors ({recommendedTutorsForStudent.length})
                </button>
              </>
            )}

            {mode === 'tutor' && (
              <>
                <button
                  type="button"
                  data-tour-id="tutor-browse-tuitions-btn"
                  onClick={() => setActiveSubTab('browse')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'browse'
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Open Tuitions ({filteredTuitions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('recommended')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'recommended'
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Recommended For You ({recommendedTuitionsForTutor.length})
                </button>
                <button
                  type="button"
                  data-tour-id="tutor-my-applications-btn"
                  onClick={() => setActiveSubTab('my_applications')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'my_applications'
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  My Applications ({myTutorApplications.length})
                </button>
              </>
            )}

            {mode === 'tutor' && currentUser && (
              <div className="flex items-center gap-1.5 pl-2 sm:border-l border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Job Alerts:
                </span>
                <select
                  aria-label="Tuition Alert Email Frequency"
                  disabled={savingAlertPref}
                  value={currentUser.notificationPreferences?.tuitionAlertFrequency || 'instant'}
                  onChange={async (e) => {
                    const freq = e.target.value as 'instant' | 'daily_digest' | 'off';
                    setSavingAlertPref(true);
                    try {
                      await updateNotificationPreferences({ tuitionAlertFrequency: freq });
                    } finally {
                      setSavingAlertPref(false);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs font-bold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                >
                  <option value="instant">Instant Email</option>
                  <option value="daily_digest">Daily Summary</option>
                  <option value="off">Off</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          STUDENT VIEW 1: GUIDED 5-STEP TUITION POSTING WIZARD
      ===================================================================== */}
      {mode === 'student' && activeSubTab === 'post' && (
        <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          {/* Progress Steps Bar */}
          <div className="flex items-center justify-between gap-2 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            {[
              { step: 1, label: '1. Subject & Class' },
              { step: 2, label: '2. Mode & Location' },
              { step: 3, label: '3. Schedule & Preferences' },
              { step: 4, label: '4. Budget & Details' },
              { step: 5, label: '5. Review & Publish' },
            ].map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setPostStep(item.step as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  postStep === item.step
                    ? 'bg-[#0D5BFF] text-white'
                    : postStep > item.step
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {postStep === 1 && (
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]">
                  আপনার প্রোফাইলের তথ্য থেকে বিষয়, শ্রেণি ও এলাকা স্বয়ংক্রিয়ভাবে পূরণ করা হয়েছে—প্রয়োজন হলে পরিবর্তন করুন।
                </p>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      hasDirtyDraftRef.current = false;
                      try {
                        localStorage.removeItem(DRAFT_STORAGE_KEY);
                      } catch {}
                      setPostForm(buildProfileDefaults());
                    }}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-xs font-bold text-[#0D5BFF] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0 cursor-pointer"
                  >
                    Fill from Profile
                  </button>
                )}
              </div>

              {currentUser?.accountType === 'guardian' && studentProfiles.length > 0 && (
                <div className="sm:col-span-2 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                    Select Student Profile to Pre-fill Details
                  </label>
                  <select
                    value={selectedChildProfileId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedChildProfileId(id);
                      const child = studentProfiles.find((p) => p.id === id);
                      if (child) {
                        updatePostForm((prev: any) => ({
                          ...prev,
                          studentClass: child.studentClass || prev.studentClass,
                          curriculum: child.curriculum || prev.curriculum,
                          subject:
                            child.subjects && child.subjects.length > 0
                              ? child.subjects.join(', ')
                              : prev.subject,
                          district: child.district || prev.district,
                          area: child.area || prev.area,
                        }));
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#0B132B] text-sm font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                  >
                    {studentProfiles.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.studentName} — {sp.studentClass} ({sp.school})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Required Subject(s) *
                </label>
                <input
                  type="text"
                  value={postForm.subject}
                  onChange={(e) => updatePostForm({ ...postForm, subject: e.target.value })}
                  placeholder="e.g., Higher Mathematics, Physics, Chemistry"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Student Class / Grade Level *
                </label>
                <select
                  value={postForm.studentClass}
                  onChange={(e) => updatePostForm({ ...postForm, studentClass: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                >
                  {postForm.studentClass &&
                    ![
                      'Class 1 - 5',
                      'Class 6 - 8',
                      'Class 9 - 10 (SSC)',
                      'Class 11 - 12 (HSC)',
                      'Cambridge / Edexcel O Level',
                      'Cambridge / Edexcel A Level',
                      'University Admission',
                    ].includes(postForm.studentClass) && (
                      <option value={postForm.studentClass}>{postForm.studentClass} (From Profile)</option>
                    )}
                  <option value="Class 1 - 5">Class 1 - 5 (Primary)</option>
                  <option value="Class 6 - 8">Class 6 - 8 (Junior)</option>
                  <option value="Class 9 - 10 (SSC)">Class 9 - 10 (SSC Candidate)</option>
                  <option value="Class 11 - 12 (HSC)">Class 11 - 12 (HSC Candidate)</option>
                  <option value="Cambridge / Edexcel O Level">Cambridge / Edexcel O Level</option>
                  <option value="Cambridge / Edexcel A Level">Cambridge / Edexcel A Level</option>
                  <option value="University Admission">University / Medical / BUET Admission</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Academic Curriculum / Medium *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    'NCTB Bangla Medium',
                    'NCTB English Version',
                    'English Medium (CIE / Edexcel)',
                    'Alim / Madrasah Curriculum',
                  ].map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => updatePostForm({ ...postForm, curriculum: curr })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        postForm.curriculum === curr
                          ? 'border-[#0D5BFF] bg-blue-50/60 dark:bg-blue-950/50 text-[#0D5BFF] dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
                {postForm.curriculum &&
                  ![
                    'NCTB Bangla Medium',
                    'NCTB English Version',
                    'English Medium (CIE / Edexcel)',
                    'Alim / Madrasah Curriculum',
                  ].includes(postForm.curriculum) && (
                    <p className="mt-2 text-xs font-semibold text-[#0D5BFF] dark:text-blue-400">
                      Current profile curriculum: {postForm.curriculum} (or pick a standard category above)
                    </p>
                  )}
              </div>
            </div>
          )}

          {postStep === 2 && (
            <div className="grid sm:grid-cols-3 gap-5">
              <div className="sm:col-span-3">
                <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]">
                  বাসায় গিয়ে পড়ানো বা অনলাইন—কোন পদ্ধতিতে শিক্ষক প্রয়োজন ও আপনার এলাকা নির্বাচন করুন।
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tutoring Mode *
                </label>
                <select
                  value={postForm.tutoringMode}
                  onChange={(e) =>
                    updatePostForm({ ...postForm, tutoringMode: e.target.value as any })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                >
                  <option value="Home Tutoring">Home Tutoring (At Student's Residence)</option>
                  <option value="Online Tutoring">Online Tutoring</option>
                  <option value="Home & Online">Flexible (Home or Online)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  District *
                </label>
                <select
                  value={postForm.district}
                  onChange={(e) => updatePostForm({ ...postForm, district: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Thana / Area / Neighborhood
                </label>
                <input
                  type="text"
                  value={postForm.area}
                  onChange={(e) => updatePostForm({ ...postForm, area: e.target.value })}
                  placeholder="e.g., Dhanmondi Road 15, Mirpur-10, Panchlaish"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                />
              </div>
            </div>
          )}

          {postStep === 3 && (
            <div className="grid sm:grid-cols-3 gap-5">
              <div className="sm:col-span-3">
                <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]">
                  সপ্তাহে কয়দিন পড়াতে হবে, সুবিধাজনক সময় ও শিক্ষকের ধরন ঠিক করুন।
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Days Per Week *
                </label>
                <select
                  value={postForm.daysPerWeek}
                  onChange={(e) =>
                    updatePostForm({ ...postForm, daysPerWeek: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                >
                  {[2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {d} Days / Week
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Preferred Time Slot
                </label>
                <input
                  type="text"
                  value={postForm.preferredTime}
                  onChange={(e) => updatePostForm({ ...postForm, preferredTime: e.target.value })}
                  placeholder="e.g., Evening 5:00 PM - 8:00 PM"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tutor Preference
                </label>
                <select
                  value={postForm.genderPreference}
                  onChange={(e) => updatePostForm({ ...postForm, genderPreference: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                >
                  <option value="Any Verified Tutor">Any Verified Tutor</option>
                  <option value="Female Tutor Preferred">Female Tutor Preferred</option>
                  <option value="Male Tutor Preferred">Male Tutor Preferred</option>
                  <option value="Public University (BUET/DU/Medical) Preferred">
                    Public University (BUET/DU/Medical) Preferred
                  </option>
                </select>
              </div>
            </div>
          )}

          {postStep === 4 && (
            <div className="space-y-5">
              <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]">
                মাসিক সম্ভাব্য সম্মানী (BDT ৳) ও শিক্ষার্থীর বিশেষ চাহিদা বা লক্ষ্য উল্লেখ করুন।
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Monthly Tuition Budget / Honorarium (BDT ৳) *
                </label>
                <input
                  type="number"
                  min={1000}
                  max={50000}
                  step={500}
                  value={postForm.salary}
                  onChange={(e) => updatePostForm({ ...postForm, salary: Number(e.target.value) })}
                  className="w-full sm:w-72 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-bold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Specific Learning Goals or Tutor Requirements
                </label>
                <textarea
                  rows={3}
                  value={postForm.requirements}
                  onChange={(e) => updatePostForm({ ...postForm, requirements: e.target.value })}
                  placeholder="Describe the student's school/college, exam targets, or any specific expectations..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                />
              </div>
            </div>
          )}

          {postStep === 5 && (
            <div className="bg-slate-50 dark:bg-[#0B132B] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B132B] dark:text-white">
                  Review Your Tuition Circular
                </h3>
                <p lang="bn" className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65] mt-0.5">
                  সব তথ্য যাচাই করে প্রকাশ করুন — যাচাইকৃত শিক্ষকরা সরাসরি আবেদন করতে পারবেন।
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500">Subject &amp; Class:</span>{' '}
                  <strong className="text-[#0B132B] dark:text-white">
                    {postForm.subject} ({postForm.studentClass})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Curriculum:</span>{' '}
                  <strong className="text-[#0B132B] dark:text-white">{postForm.curriculum}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Location &amp; Mode:</span>{' '}
                  <strong className="text-[#0B132B] dark:text-white">
                    {postForm.area ? `${postForm.area}, ` : ''}
                    {postForm.district} • {postForm.tutoringMode}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Schedule &amp; Budget:</span>{' '}
                  <strong className="text-[#0D5BFF] tabular-nums">
                    {postForm.daysPerWeek} Days/Week • ৳{Number(postForm.salary).toLocaleString()}/mo
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Preference &amp; Notes:</span>{' '}
                  <span className="text-slate-700 dark:text-slate-300">
                    {postForm.genderPreference} — {postForm.requirements || 'Standard academic guidance'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            {postStep > 1 ? (
              <button
                type="button"
                onClick={() => setPostStep((prev) => (prev - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Auto-filled from profile · Draft saved on edit
              </span>
            )}

            {postStep < 5 ? (
              <button
                type="button"
                onClick={() => setPostStep((prev) => (prev + 1) as any)}
                className="px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isPublishing}
                onClick={handlePublishTuition}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isPublishing ? 'Publishing...' : 'Publish Tuition Requirement'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          STUDENT VIEW 2: MY TUITION POSTS & APPLICANT PIPELINE
      ===================================================================== */}
      {mode === 'student' && activeSubTab === 'my_posts' && (
        <div className="space-y-4">
          {myStudentPosts.length === 0 ? (
            <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <Briefcase className="w-10 h-10 text-[#0D5BFF] mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-[#0B132B] dark:text-white">
                You Haven't Posted Any Tuition Circulars Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Post your subject, class, location, and budget in 60 seconds so verified tutors from top universities can apply directly.
              </p>
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto"
              >
                আপনার টিউশনের প্রয়োজনীয় তথ্য দিয়ে অনুরোধ প্রকাশ করুন।
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('post')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post Your First Tuition Requirement</span>
              </button>
            </div>
          ) : (
            myStudentPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span
                        className={`font-bold uppercase ${
                          post.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : post.status === 'assigned'
                            ? 'text-[#0D5BFF]'
                            : 'text-slate-400'
                        }`}
                      >
                        {post.status === 'active'
                          ? 'Open for Applications'
                          : post.status === 'assigned'
                          ? `Tutor Confirmed (${post.selectedTutorName || 'Assigned'})`
                          : 'Closed'}
                      </span>
                      <span>·</span>
                      <span>{post.curriculum || 'National Curriculum'}</span>
                      <span>·</span>
                      <span>{post.mode || 'Home Tutoring'}</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {post.applications?.length || 0} Applicant(s)
                      </span>
                    </div>
                    <Link
                      to={`/tuitions/${post.id}`}
                      className="text-base sm:text-lg font-extrabold text-[#0B132B] dark:text-white hover:text-[#0D5BFF] transition-colors"
                    >
                      {post.title}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-sm font-extrabold text-[#0D5BFF] tabular-nums mr-2">
                      ৳{Number(post.salary).toLocaleString()}/mo
                    </span>
                    {post.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleCircularStatus(post, 'closed')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Close Post
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleCircularStatus(post, 'active')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0D5BFF] hover:bg-blue-50 cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {/* Applicants List */}
                {!post.applications || post.applications.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No tutor applications yet. Verified tutors matching {post.subject} in {post.district} can view and apply to this circular.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Tutor Applications ({post.applications.length})
                      </h4>
                      <p
                        lang="bn"
                        className="font-bn text-xs text-slate-600 dark:text-slate-300 leading-[1.65]"
                      >
                        আগ্রহী শিক্ষকদের প্রোফাইল দেখে পছন্দের শিক্ষক নির্বাচন করুন।
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {post.applications.map((app) => (
                        <div
                          key={app.tutorId}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200/70 dark:border-slate-800 space-y-3"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/teachers/${app.tutorId}`}
                                  className="text-sm font-extrabold text-[#0B132B] dark:text-white hover:text-[#0D5BFF] flex items-center gap-1"
                                >
                                  <span>{app.tutorName}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                                <span className="text-xs text-slate-500">·</span>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  {app.tutorInstitution || 'Verified Educator'}
                                </span>
                                <span className="text-xs text-slate-500">·</span>
                                <span className="text-xs font-bold text-[#0D5BFF] tabular-nums">
                                  Proposed: ৳{Number(app.proposedRate || post.salary).toLocaleString()}/mo
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                "{app.message}"
                              </p>
                              {app.trialDate && (
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  Trial Class: {formatDhakaDateTime(app.trialDate)}
                                </p>
                              )}
                            </div>

                            {/* Student Action Controls on Applicant */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {onMessageUser && (
                                <button
                                  type="button"
                                  onClick={() => onMessageUser(app.tutorId)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#0D5BFF] flex items-center gap-1.5 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Message</span>
                                </button>
                              )}

                              {app.status === 'submitted' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateApplicantStatus(post, app.tutorId, 'shortlisted')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-300 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                                >
                                  Shortlist
                                </button>
                              )}

                              {(app.status === 'submitted' || app.status === 'shortlisted') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrialModalState({ tuition: post, applicant: app });
                                    setTrialDateTime(
                                      new Date(Date.now() + 86400000).toISOString().slice(0, 16)
                                    );
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                                >
                                  Schedule Trial
                                </button>
                              )}

                              {app.status === 'trial_scheduled' &&
                                app.trialStatus === 'rescheduled_by_tutor' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleTrialResponse(post, app.tutorId, 'confirm')
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Confirm Tutor's Proposed Time
                                  </button>
                                )}

                              {app.status === 'trial_scheduled' &&
                                app.trialStatus !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleTrialResponse(post, app.tutorId, 'cancel')
                                    }
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                                  >
                                    Cancel Trial
                                  </button>
                                )}

                              {app.status !== 'selected' && app.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateApplicantStatus(post, app.tutorId, 'selected')
                                  }
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  Confirm Hiring
                                </button>
                              )}

                              {app.status !== 'rejected' && app.status !== 'selected' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateApplicantStatus(post, app.tutorId, 'rejected')
                                  }
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </div>

                          <ApplicationStatusTracker
                            state={resolveApplicationTrackerState(app, {
                              viewerRole: 'student',
                              tuitionStatus: post.status,
                            })}
                            scheduleLabel={app.trialDate ? formatDhakaDateTime(app.trialDate) : undefined}
                            compact
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* =====================================================================
          STUDENT VIEW 3: RECOMMENDED VERIFIED TUTORS (EXPLAINABLE MATCHING)
      ===================================================================== */}
      {mode === 'student' && activeSubTab === 'recommended' && !userCompletion.isComplete && (
        <ProfileCompletionGate
          role="student"
          accountType={currentUser?.accountType === 'guardian' ? 'guardian' : 'student'}
          completion={userCompletion}
          onNavigateToField={handleNavigateToMissingField}
          variant="gate"
        />
      )}

      {mode === 'student' && activeSubTab === 'recommended' && userCompletion.isComplete && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedTutorsForStudent.map(({ tutor, reasons }) => {
            const subjectSummary = formatTutorSubjectsSummary(tutor, 5);
            const institutionLine =
              formatInstitutionWithLocation(tutor.university, tutor.district) ||
              'Verified University Educator';
            const classRange = formatTutorClassesRange(tutor);
            const modeLabel = formatTeachingModeLabel(tutor.teachingMode);

            return (
            <div
              key={tutor.id}
              className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start gap-3 mb-2">
                  {(() => {
                    const sessions = useAppStore.getState().sessions || [];
                    const photoUnlocked =
                      currentUser?.role === 'student'
                        ? canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, tutor.id, sessions)
                        : false;
                    return (
                      <UserAvatar
                        src={photoUnlocked ? tutor.profileImage : undefined}
                        locked={!photoUnlocked}
                        name={tutor.name}
                        className="w-12 h-12 rounded-xl border border-slate-200/70 dark:border-slate-700"
                        textClassName="text-sm font-black text-white"
                      />
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/teachers/${tutor.id}`}
                      className="text-[15px] font-bold text-[#0B132B] dark:text-white hover:text-[#0D5BFF] dark:hover:text-blue-400 leading-snug break-words block"
                    >
                      {tutor.name}
                    </Link>
                    {isTutorVerified(tutor) && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug break-words">
                  {institutionLine}
                </p>
                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 mt-1.5 leading-snug break-words">
                  <span>{subjectSummary.text}</span>
                  {subjectSummary.moreLabel && (
                    <span className="ml-1.5 font-semibold text-[#0D5BFF] dark:text-blue-400">
                      {subjectSummary.moreLabel}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                  {classRange} · {modeLabel}
                </p>
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#0D5BFF] dark:text-blue-400 leading-snug break-words">
                  Why matched: {reasons.join(' · ')}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1.5">
                <span className="text-xs sm:text-sm font-extrabold text-[#0B132B] dark:text-white tabular-nums">
                  {tutor.hourlyRate ? `৳${tutor.hourlyRate.toLocaleString()}/mo` : 'Negotiable'}
                </span>
                <Link
                  to={`/teachers/${tutor.id}`}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center transition-colors shrink-0"
                >
                  View Profile
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          TUTOR VIEW: MY APPLICATIONS TRACKER
      ===================================================================== */}
      {mode === 'tutor' && activeSubTab === 'my_applications' && (
        <div className="space-y-4">
          {myTutorApplications.length === 0 ? (
            <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <Briefcase className="w-10 h-10 text-[#0D5BFF] mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-[#0B132B] dark:text-white">
                You Haven't Applied to Any Tuition Circulars Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Browse open tuition requirements or check your recommended matches to submit your first application.
              </p>
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto"
              >
                আপনার যোগ্যতা ও পছন্দ অনুযায়ী টিউশনে আবেদন করুন এবং আবেদনের সর্বশেষ অবস্থা এখানে দেখুন।
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('browse')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#0D5BFF] text-white text-xs font-bold cursor-pointer"
              >
                Explore Open Tuitions
              </button>
            </div>
          ) : (
            myTutorApplications.map(({ tuition, myApp }) => {
              const targetKey = `${tuition.id}:${myApp.tutorId}`;
              const isRescheduling = rescheduleTargetKey === targetKey;
              const trackerState = resolveApplicationTrackerState(myApp, {
                viewerRole: 'tutor',
                tuitionStatus: tuition.status,
              });

              return (
                <div
                  key={tuition.id}
                  className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span>{tuition.district}</span>
                        <span>·</span>
                        <span>{tuition.studentClass}</span>
                        <span>·</span>
                        <span className="tabular-nums">
                          Proposed Honorarium: ৳{Number(myApp.proposedRate || tuition.salary).toLocaleString()}/mo
                        </span>
                      </div>
                      <Link
                        to={`/tuitions/${tuition.id}`}
                        className="text-base font-extrabold text-[#0B132B] dark:text-white hover:text-[#0D5BFF]"
                      >
                        {tuition.title}
                      </Link>
                    </div>
                  </div>

                  <ApplicationStatusTracker
                    state={trackerState}
                    scheduleLabel={myApp.trialDate ? formatDhakaDateTime(myApp.trialDate) : undefined}
                  />

                  {myApp.status === 'trial_scheduled' &&
                    myApp.trialStatus !== 'cancelled' && (
                      <div className="pt-2 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {myApp.trialStatus !== 'confirmed' && myApp.trialStatus !== 'rescheduled_by_tutor' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleTrialResponse(tuition, myApp.tutorId, 'confirm')
                              }
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Confirm Trial Time
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTargetKey(isRescheduling ? null : targetKey);
                              setRescheduleDateTime(
                                new Date(Date.now() + 86400000).toISOString().slice(0, 16)
                              );
                            }}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0B132B] dark:text-white hover:border-[#0D5BFF] cursor-pointer"
                          >
                            {isRescheduling ? 'Close Reschedule' : 'Suggest Alternate Time'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleTrialResponse(tuition, myApp.tutorId, 'cancel')
                            }
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            Cancel Trial
                          </button>
                        </div>

                        {isRescheduling && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <input
                              type="datetime-local"
                              value={rescheduleDateTime}
                              onChange={(e) => setRescheduleDateTime(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111A2E] text-xs font-semibold text-[#0B132B] dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleTrialResponse(
                                  tuition,
                                  myApp.tutorId,
                                  'reschedule',
                                  rescheduleDateTime
                                )
                              }
                              className="px-4 py-2 rounded-lg bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Send Proposed Time
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =====================================================================
          TUTOR VIEW: RECOMMENDED OPPORTUNITIES (EXPLAINABLE MATCHING)
      ===================================================================== */}
      {mode === 'tutor' && activeSubTab === 'recommended' && !userCompletion.isComplete && (
        <ProfileCompletionGate
          role="tutor"
          completion={userCompletion}
          onNavigateToField={handleNavigateToMissingField}
          variant="gate"
        />
      )}

      {mode === 'tutor' && activeSubTab === 'recommended' && userCompletion.isComplete && (
        <div className="space-y-4">
          {recommendedTuitionsForTutor.length === 0 ? (
            <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <h3 className="text-base font-bold text-[#0B132B] dark:text-white">
                Complete Your Subjects &amp; District to Unlock Personalized Matches
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                We match open tuition circulars against your listed teaching subjects, preferred classes, and district.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {recommendedTuitionsForTutor.map(({ tuition, reasons }) => {
                const hasApplied = tuition.applications?.some(
                  (a) => a.tutorId === currentUser?.id
                );
                return (
                  <div
                    key={tuition.id}
                    className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-[#0D5BFF] dark:text-blue-400">
                        Recommended because: {reasons.join(' · ')}
                      </div>
                      <Link
                        to={`/tuitions/${tuition.id}`}
                        className="text-base font-extrabold text-[#0B132B] dark:text-white hover:text-[#0D5BFF] block"
                      >
                        {tuition.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span>{tuition.studentClass}</span>
                        <span>·</span>
                        <span>{tuition.curriculum || 'National Curriculum'}</span>
                        <span>·</span>
                        <span>
                          {tuition.area ? `${tuition.area}, ` : ''}
                          {tuition.district}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">{tuition.daysPerWeek} Days/Wk</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-extrabold text-[#0D5BFF] tabular-nums">
                        ৳{Number(tuition.salary).toLocaleString()}/mo
                      </span>
                      {hasApplied ? (
                        <span className="text-xs font-bold text-emerald-600">✓ Applied</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setApplyingTuition(tuition);
                            setProposedRate(String(tuition.salary));
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          BROWSE & INSTANT MULTI-FILTER TUITION JOB BOARD (TUTOR / ADMIN / PUBLIC)
      ===================================================================== */}
      {mode === 'tutor' && activeSubTab === 'browse' && !userCompletion.isComplete && (
        <ProfileCompletionGate
          role="tutor"
          completion={userCompletion}
          onNavigateToField={handleNavigateToMissingField}
          variant="gate"
        />
      )}

      {(mode === 'public' ||
        mode === 'admin' ||
        (mode === 'tutor' && activeSubTab === 'browse' && userCompletion.isComplete)) && (
        <div className="space-y-5">
          {/* Real-Time Search & Multi-Filter Bar */}
          <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, area, or class..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                />
              </div>

              <select
                aria-label="Filter Tuition by Subject"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
              >
                <option value="All">All Subjects</option>
                <option value="Math">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="English">English</option>
                <option value="ICT">ICT</option>
                <option value="Accounting">Accounting</option>
              </select>

              <select
                aria-label="Filter Tuition by District"
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
              >
                <option value="All">All 64 Districts</option>
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter Tuition by Mode"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
              >
                <option value="All">Home &amp; Online</option>
                <option value="Home">Home Tutoring</option>
                <option value="Online">Online Tutoring</option>
              </select>

              <select
                aria-label="Filter Tuition by Minimum Salary"
                value={filterMinSalary}
                onChange={(e) => setFilterMinSalary(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs font-semibold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
              >
                <option value="All">Any Honorarium</option>
                <option value="4000">৳4,000+ / mo</option>
                <option value="6000">৳6,000+ / mo</option>
                <option value="8000">৳8,000+ / mo</option>
                <option value="10000">৳10,000+ / mo</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/70">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                    showSavedOnly
                      ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Circulars ({effectiveSavedTuitionIds.length})</span>
                </button>
              </div>

              {(searchQuery ||
                filterSubject !== 'All' ||
                filterClass !== 'All' ||
                filterCurriculum !== 'All' ||
                filterDistrict !== 'All' ||
                filterMode !== 'All' ||
                filterMinSalary !== 'All' ||
                showSavedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterSubject('All');
                    setFilterClass('All');
                    setFilterCurriculum('All');
                    setFilterDistrict('All');
                    setFilterMode('All');
                    setFilterMinSalary('All');
                    setShowSavedOnly(false);
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Tuition Circular Cards Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : filteredTuitions.length === 0 ? (
            <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm sm:text-base font-bold text-[#0B132B] dark:text-white">
                No Matching Tuition Circulars Found
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing a filter or selecting a different district or subject.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTuitions.map((t) => {
                const isSaved = effectiveSavedTuitionIds.includes(t.id);
                const myApp = t.applications?.find((a) => a.tutorId === currentUser?.id);

                return (
                  <div
                    key={t.id}
                    className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 hover:border-[#0D5BFF]/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#0D5BFF]">
                            {t.mode || 'Home Tutoring'}
                          </span>
                          <span>·</span>
                          <span>{t.curriculum || 'NCTB'}</span>
                          <span>·</span>
                          <span className="tabular-nums">
                            {t.applications?.length || 0} applicant(s)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSaveTuition(t.id)}
                          aria-label="Bookmark tuition circular"
                          className="p-1 text-slate-400 hover:text-[#0D5BFF] cursor-pointer"
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              isSaved ? 'fill-[#0D5BFF] text-[#0D5BFF]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <Link
                        to={`/tuitions/${t.id}`}
                        className="text-base font-extrabold text-[#0B132B] dark:text-white hover:text-[#0D5BFF] block leading-snug"
                      >
                        {t.title}
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <span>Class: {t.studentClass}</span>
                        <span>·</span>
                        <span>
                          Location: {t.area ? `${t.area}, ` : ''}
                          {t.district}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">{t.daysPerWeek} Days/Week</span>
                      </div>

                      {t.requirements && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {t.requirements}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Monthly Honorarium</span>
                        <span className="text-base font-extrabold text-[#0B132B] dark:text-white tabular-nums">
                          ৳{Number(t.salary).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/tuitions/${t.id}`}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#0D5BFF]"
                        >
                          Details
                        </Link>

                        {mode === 'tutor' &&
                          (myApp ? (
                            <span className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                              ✓ {myApp.status.replace('_', ' ')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setApplyingTuition(t);
                                setProposedRate(String(t.salary));
                              }}
                              className="px-4 py-2 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Apply Now
                            </button>
                          ))}

                        {mode === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCircular(t.id)}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Delete Circular"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: TUTOR APPLICATION SUBMISSION
      ===================================================================== */}
      {applyingTuition && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setApplyingTuition(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-[#0D5BFF]">
                  Submit Tuition Application
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-[#0B132B] dark:text-white mt-0.5">
                  {applyingTuition.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApplyingTuition(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                aria-label="Close application modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTutorSubmitApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Proposed Monthly Honorarium (BDT ৳)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min={1000}
                  max={50000}
                  value={proposedRate}
                  onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-sm font-bold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Introduction &amp; Relevant Teaching Experience
                </label>
                <textarea
                  rows={3}
                  required
                  value={applicationNote}
                  onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  placeholder="Briefly highlight your university department, experience with this curriculum, and availability for a trial class..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs sm:text-sm font-medium text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingTuition(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubmittingApp ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: STUDENT TRIAL CLASS SCHEDULER
      ===================================================================== */}
      {trialModalState && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setTrialModalState(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-[#0D5BFF]">
                  Schedule Demo / Trial Class
                </span>
                <h3 className="text-base font-extrabold text-[#0B132B] dark:text-white mt-0.5">
                  Trial with {trialModalState.applicant.tutorName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTrialModalState(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                aria-label="Close trial modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Trial Class Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={trialDateTime}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                onChange={(e) => setTrialDateTime(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-xs sm:text-sm font-bold text-[#0B132B] dark:text-white outline-none focus:border-[#0D5BFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrialModalState(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateApplicantStatus(
                    trialModalState.tuition,
                    trialModalState.applicant.tutorId,
                    'trial_scheduled',
                    trialDateTime
                  )
                }
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Trial Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
