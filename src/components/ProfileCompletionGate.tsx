import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  AccountType,
  PROFILE_COMPLETED_CONFIRMATION,
  ProfileCompletionResult,
  RoleMarketplaceAccessResult,
  TUTOR_VERIFICATION_PENDING_MESSAGE,
} from '../../shared/profileCompletion';

export interface ProfileCompletionGateProps {
  role: 'student' | 'tutor';
  accountType?: AccountType | null;
  completion: ProfileCompletionResult;
  accessEvaluation?: RoleMarketplaceAccessResult;
  onNavigateToField: (fieldId: string) => void;
  variant?: 'gate' | 'banner' | 'completed';
  contextTitle?: string;
  onExploreUnlocked?: () => void;
  exploreUnlockedLabel?: string;
}

export default function ProfileCompletionGate({
  role,
  accountType,
  completion,
  accessEvaluation,
  onNavigateToField,
  variant = 'gate',
  contextTitle,
  onExploreUnlocked,
  exploreUnlockedLabel,
}: ProfileCompletionGateProps) {
  const isTutor = role === 'tutor';
  const isGuardian = !isTutor && accountType === 'guardian';

  // Admin Verification Pending / Rejected / Unsubmitted Gates for Tutors with 100% profile
  if (
    isTutor &&
    variant === 'gate' &&
    accessEvaluation &&
    !accessEvaluation.allowed &&
    (accessEvaluation.status === 'restricted_verification_pending' ||
      accessEvaluation.status === 'restricted_verification_rejected' ||
      accessEvaluation.status === 'restricted_verification_unsubmitted')
  ) {
    const isPending = accessEvaluation.status === 'restricted_verification_pending';
    const isRejected = accessEvaluation.status === 'restricted_verification_rejected';

    const headerAccent = isRejected
      ? 'from-[#2A0E18] via-[#1C1226] to-[#111A2E]'
      : isPending
      ? 'from-[#0B132B] via-[#122040] to-[#1D355E]'
      : 'from-[#0B132B] via-[#111A2E] to-[#142B60]';

    const iconBg = isRejected
      ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
      : isPending
      ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
      : 'bg-[#0D5BFF]/20 border-[#0D5BFF]/40 text-sky-300';

    const statusBadgeStyle = isRejected
      ? 'bg-rose-500/20 border-rose-400/30 text-rose-200'
      : isPending
      ? 'bg-amber-500/20 border-amber-400/30 text-amber-200'
      : 'bg-sky-500/20 border-sky-400/30 text-sky-200';

    const noticeCardStyle = isRejected
      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
      : isPending
      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
      : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/50';

    const targetField = accessEvaluation.primaryMissingFieldId || 'tutor-identity-verification-section';

    return (
      <div
        data-testid="profile-completion-gate"
        data-gate-status={accessEvaluation.status}
        className="w-full max-w-3xl mx-auto my-4 sm:my-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111A2E] shadow-sm overflow-hidden text-left"
      >
        <div className={`bg-gradient-to-r ${headerAccent} p-6 sm:p-8 text-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shrink-0 ${iconBg}`}>
                {isRejected ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : isPending ? (
                  <Clock className="w-6 h-6" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-sky-200">
                    {contextTitle || 'Admin Verification Gate'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-200 tabular-nums">
                    Profile: 100% Complete
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${statusBadgeStyle}`}>
                    {isRejected ? 'Rejected' : isPending ? 'Pending Admin Approval' : 'ID Required'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {accessEvaluation.title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToField(targetField)}
              className={`min-h-[46px] px-6 py-3 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer shrink-0 ${
                isRejected
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#0D5BFF] hover:bg-blue-600'
              }`}
            >
              <span>{accessEvaluation.ctaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${noticeCardStyle}`}>
            <p
              lang="bn"
              data-testid={isPending ? 'tutor-verification-pending-message' : undefined}
              className="font-bn text-sm sm:text-base font-bold text-[#0B132B] dark:text-white leading-[1.75]"
            >
              {isPending ? TUTOR_VERIFICATION_PENDING_MESSAGE : accessEvaluation.messageBn}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {accessEvaluation.messageEn}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/25 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#0B132B] dark:text-white">Step 1: Profile Info</p>
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  100% Completed ({completion.completedCount}/{completion.totalCount})
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isPending
                  ? 'border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/25'
                  : isRejected
                  ? 'border-rose-200/80 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/25'
                  : 'border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/25'
              }`}
            >
              {isPending ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle
                  className={`w-5 h-5 shrink-0 ${
                    isRejected ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                />
              )}
              <div>
                <p className="text-xs font-bold text-[#0B132B] dark:text-white">Step 2: NID / Univ. ID</p>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {isPending
                    ? 'Document Submitted'
                    : isRejected
                    ? 'Needs Clear Re-upload'
                    : 'Not Yet Uploaded'}
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isRejected
                  ? 'border-rose-200/80 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/25'
                  : 'border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/25'
              }`}
            >
              {isRejected ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-[#0B132B] dark:text-white">Step 3: Admin Approval</p>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {isRejected ? 'Rejected — Re-upload ID' : 'Awaiting Admin Review'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isPending
                ? 'Your tuition marketplace and public tutor visibility will unlock automatically once an admin approves your verification — no logout or refresh needed.'
                : isRejected
                ? 'Upload a legible photo of your NID or University/College ID Card and save your profile to re-enter the Admin Verification Queue.'
                : 'Submit either your National ID (NID) or University/College ID Card in your profile verification section.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigateToField(targetField)}
              className={`min-h-[46px] px-6 py-3 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0 ${
                isRejected ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0D5BFF] hover:bg-blue-700'
              }`}
            >
              <span>{accessEvaluation.ctaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 100% Completed State
  if (variant === 'completed' || completion.isComplete) {
    return (
      <div
        data-testid="profile-completed-confirmation"
        className="rounded-2xl sm:rounded-3xl border border-emerald-200 dark:border-emerald-800/70 bg-gradient-to-r from-emerald-50/90 via-white to-blue-50/50 dark:from-emerald-950/35 dark:via-[#111A2E] dark:to-blue-950/25 p-4 sm:p-6 shadow-xs transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#0B132B] dark:text-white tracking-tight">
                  {PROFILE_COMPLETED_CONFIRMATION.title}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {completion.completedCount}/{completion.totalCount} Mandatory Fields Verified
                  </span>
                </span>
              </div>
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-[1.7]"
              >
                “{PROFILE_COMPLETED_CONFIRMATION.messageBn}”
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {PROFILE_COMPLETED_CONFIRMATION.messageEn}
              </p>
            </div>
          </div>

          {onExploreUnlocked && (
            <button
              type="button"
              onClick={onExploreUnlocked}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <span>
                {exploreUnlockedLabel ||
                  (isTutor ? 'Browse Tuition Opportunities' : 'Explore Verified Tutors')}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const title = isTutor ? 'Complete Your Tutor Profile' : 'Complete Your Profile';
  const banglaNotice = isTutor
    ? 'নতুন টিউশন খুঁজতে আপনার প্রোফাইলের প্রয়োজনীয় তথ্যগুলো সম্পূর্ণ করুন।'
    : 'টিচার খোঁজার সুবিধা চালু করতে প্রথমে আপনার প্রোফাইলের প্রয়োজনীয় তথ্যগুলো সম্পূর্ণ করুন।';
  const englishSubtitle = isTutor
    ? 'Your tutor profile requires a few mandatory teaching and academic details before tuition circulars and student listings are unlocked.'
    : isGuardian
    ? 'Complete your guardian details and linked student profile to unlock verified tutor listings and personalized recommendations.'
    : 'Complete your mandatory academic and location details to unlock verified tutor search results and recommendations.';
  const ctaButtonLabel = isTutor ? 'Complete Now' : 'Complete Profile';
  const defaultFieldId =
    completion.firstMissingFieldId ||
    completion.missingFields[0]?.targetFieldId ||
    (isTutor ? 'tutor-field-university' : 'account-field-school');

  if (variant === 'banner') {
    return (
      <div
        data-testid="profile-completion-banner"
        className="rounded-2xl sm:rounded-3xl border border-amber-200/90 dark:border-amber-800/60 bg-white dark:bg-[#111A2E] p-4 sm:p-6 shadow-xs space-y-4 text-left"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#0B132B] dark:text-white">
                  {title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold tabular-nums">
                  Progress: {completion.percentage}% Completed
                </span>
              </div>
              <p
                lang="bn"
                className="font-bn text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-[1.7]"
              >
                “{banglaNotice}”
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToField(defaultFieldId)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <span>{ctaButtonLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-[#0D5BFF] transition-all duration-300 rounded-full"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Missing Information ({completion.missingFields.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {completion.missingFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => onNavigateToField(field.targetFieldId)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span lang="bn" className="font-bn">
                  {field.labelBn || field.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full Marketplace Restriction Gate Variant
  return (
    <div
      data-testid="profile-completion-gate"
      className="w-full max-w-3xl mx-auto my-4 sm:my-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111A2E] shadow-sm overflow-hidden text-left"
    >
      {/* Top Navy / Blue Accent Header */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#111A2E] to-[#142B60] p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0D5BFF]/20 border border-[#0D5BFF]/40 flex items-center justify-center text-sky-300 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-sky-200">
                  {contextTitle ||
                    (isTutor
                      ? 'Tutor Access Gate'
                      : isGuardian
                      ? 'Guardian Access Gate'
                      : 'Student Access Gate')}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-[11px] font-bold text-amber-200 tabular-nums">
                  Progress: {completion.percentage}% Completed
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToField(defaultFieldId)}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-[#0D5BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 transition-all cursor-pointer shrink-0"
          >
            <span>{ctaButtonLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>Profile Completion Progress</span>
            <span className="tabular-nums font-bold text-sky-300">
              Progress: {completion.percentage}% Completed ({completion.completedCount}/
              {completion.totalCount})
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0D5BFF] to-sky-400 transition-all duration-300 rounded-full"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 space-y-1.5">
          <p
            lang="bn"
            className="font-bn text-sm sm:text-base font-semibold text-[#0B132B] dark:text-white leading-[1.75]"
          >
            “{banglaNotice}”
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {englishSubtitle}
          </p>
        </div>

        {/* Missing Fields Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
              Missing Information ({completion.missingFields.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Click any item to jump directly to the field
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completion.missingFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => onNavigateToField(field.targetFieldId)}
                className="min-h-[56px] p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/25 hover:bg-amber-50 dark:hover:bg-amber-950/45 hover:border-amber-300 dark:hover:border-amber-700 transition-all flex items-center justify-between gap-3 text-left group cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      lang="bn"
                      className="font-bn text-xs sm:text-sm font-bold text-[#0B132B] dark:text-white leading-snug break-words"
                    >
                      {field.labelBn || field.label}
                    </p>
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 mt-0.5 truncate">
                      {field.displayValue}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0D5BFF] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Completed Fields Summary */}
        {completion.completedFields.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Already Completed ({completion.completedFields.length}/{completion.totalCount})
            </p>
            <div className="flex flex-wrap gap-2">
              {completion.completedFields.map((field) => (
                <span
                  key={field.key}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{field.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Primary Action */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access unlocks automatically in real time as soon as you save your required details.
          </p>
          <button
            type="button"
            onClick={() => onNavigateToField(defaultFieldId)}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <span>{ctaButtonLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
