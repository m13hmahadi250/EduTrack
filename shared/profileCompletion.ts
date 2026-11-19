export type UserRole = 'student' | 'tutor' | 'admin';
export type AccountType = 'student' | 'guardian';

export interface StudentProfileRecord {
  id: string;
  guardianId: string;
  studentName: string;
  studentClass: string;
  school: string;
  curriculum?: string;
  subjects?: string[];
  gender?: string;
  district?: string;
  thana?: string;
  area?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileCompletionUserInput {
  id?: string;
  role?: UserRole | string;
  accountType?: AccountType | string;
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  profileImage?: string;
  district?: string;
  thana?: string;
  area?: string;
  address?: string;
  teachingAreas?: string[];
  // Student / Academic
  studentClass?: string;
  school?: string;
  curriculum?: string;
  group?: string;
  subject?: string;
  subjects?: string[];
  // Guardian
  guardianRelationship?: string;
  activeStudentProfileId?: string;
  studentName?: string;
  // Tutor
  university?: string;
  course?: string;
  year?: string;
  semester?: string;
  classes?: string[];
  hourlyRate?: number;
  daysPerWeek?: number;
  teachingMode?: string;
  bio?: string;
  availabilitySlots?: Record<string, string[]>;
  // Verification (kept strictly separate from completion)
  isVerified?: boolean;
  nidNumber?: string;
  nidFrontImg?: string;
  nidBackImg?: string;
  documents?: string[];
  nidStatus?: 'pending' | 'approved' | 'rejected' | string;
  academicStatus?: 'pending' | 'approved' | 'rejected' | string;
}

export interface ProfileFieldRequirement {
  key: string;
  label: string;
  labelBn?: string;
  completed: boolean;
  displayValue: string;
  targetTab: string;
  targetFieldId: string;
  category: 'basic' | 'contact' | 'location' | 'academic' | 'teaching' | 'student_profile';
}

export interface ProfileCompletionResult {
  role: UserRole;
  accountType: AccountType | null;
  percentage: number;
  isComplete: boolean;
  completedCount: number;
  totalCount: number;
  requirements: ProfileFieldRequirement[];
  missingFields: ProfileFieldRequirement[];
  completedFields: ProfileFieldRequirement[];
  optionalEnhancements: ProfileFieldRequirement[];
  needsAccountTypeSelection: boolean;
  firstMissingFieldId: string | null;
}

export interface RoleMarketplaceAccessResult {
  allowed: boolean;
  status: 'loading' | 'unauthenticated' | 'allowed' | 'restricted_incomplete_profile';
  role: 'student' | 'guardian' | 'tutor' | 'admin' | 'guest';
  targetResource: 'tutor_listings' | 'tuition_opportunities' | 'admin_panel' | 'none';
  completion: ProfileCompletionResult;
  title: string;
  messageBn: string;
  messageEn: string;
  ctaLabel: string;
  primaryMissingFieldId: string;
}

export const PROFILE_COMPLETED_CONFIRMATION = {
  title: 'Profile Completed — 100%',
  messageBn:
    'অভিনন্দন! আপনার প্রোফাইল সম্পূর্ণ হয়েছে। এখন আপনি EduTrack-এর সকল প্রযোজ্য সুবিধা ব্যবহার করতে পারবেন।',
  messageEn:
    'Your mandatory profile information is 100% complete. All eligible marketplace features are unlocked.',
} as const;

export type TutorVerificationOverallStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'changes_required'
  | 'approved'
  | 'rejected';

export interface TutorVerificationSummary {
  overall: TutorVerificationOverallStatus;
  label: string;
  description: string;
  nidStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  academicStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  hasNidSubmission: boolean;
  hasAcademicSubmission: boolean;
}

const PLACEHOLDER_STRINGS = new Set([
  'not specified',
  'not set',
  'n/a',
  'na',
  'none',
  'none selected',
  'pending',
  'pending submission',
  'null',
  'undefined',
  'unset',
  '-',
  '--',
  'select',
  'select gender',
  'select district',
  'select thana',
  'select class',
  'select relationship',
]);

/**
 * Cleans a string and strips meaningless placeholder values so placeholder strings
 * (such as legacy "Not Specified" or "NOT SET") never falsely count as completed.
 */
export function cleanMeaningfulString(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (PLACEHOLDER_STRINGS.has(trimmed.toLowerCase())) return '';
  return trimmed;
}

/**
 * Checks whether a value contains real, non-placeholder data.
 */
export function isMeaningfulValue(val: unknown): boolean {
  if (typeof val === 'string') {
    return cleanMeaningfulString(val).length > 0;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0;
  }
  if (Array.isArray(val)) {
    return val.some((item) => isMeaningfulValue(item));
  }
  if (val && typeof val === 'object') {
    return Object.values(val).some((v) => isMeaningfulValue(v));
  }
  return false;
}

/**
 * Normalizes subjects from either string[] (`subjects`) or comma-separated string (`subject`).
 */
export function parseSubjectsList(subjects?: unknown, singleSubject?: unknown): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const pushClean = (raw: string) => {
    const cleaned = cleanMeaningfulString(raw);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  };

  if (Array.isArray(subjects)) {
    for (const item of subjects) {
      if (typeof item === 'string') {
        pushClean(item);
      }
    }
  }

  if (typeof singleSubject === 'string') {
    for (const part of singleSubject.split(',')) {
      pushClean(part);
    }
  }

  return result;
}

export function hasConfiguredAvailabilitySlots(slots?: Record<string, string[]>): boolean {
  if (!slots || typeof slots !== 'object') return false;
  return Object.values(slots).some(
    (daySlots) => Array.isArray(daySlots) && daySlots.some((s) => isMeaningfulValue(s))
  );
}

/**
 * Normalizes canonical profile fields and applies non-destructive backward-compatible
 * migration for legacy student records where `university` stored school name or
 * `school` stored literal `"Not Specified"`.
 */
export function normalizeUserProfileFields<T extends ProfileCompletionUserInput>(user: T): T {
  if (!user || typeof user !== 'object') return user;

  const role = (user.role || 'student') as UserRole;
  const normalizedName = cleanMeaningfulString(user.name) || user.name || '';
  const normalizedPhone = cleanMeaningfulString(user.phone);
  const normalizedDistrict = cleanMeaningfulString(user.district);
  const normalizedThana = cleanMeaningfulString(user.thana);
  const normalizedArea = cleanMeaningfulString(user.area);
  const normalizedAddress = cleanMeaningfulString(user.address);
  const normalizedGender = cleanMeaningfulString(user.gender);
  const normalizedSubjects = parseSubjectsList(user.subjects, user.subject);

  if (role === 'student') {
    const cleanSchool = cleanMeaningfulString(user.school);
    const legacySchoolFromUniversity = cleanMeaningfulString(user.university);
    const resolvedSchool = cleanSchool || legacySchoolFromUniversity;
    const resolvedCurriculum =
      cleanMeaningfulString(user.curriculum) || cleanMeaningfulString(user.group);
    const resolvedClass = cleanMeaningfulString(user.studentClass);
    const resolvedAccountType =
      user.accountType === 'guardian' || user.accountType === 'student'
        ? user.accountType
        : undefined;

    return {
      ...user,
      name: normalizedName,
      phone: normalizedPhone,
      district: normalizedDistrict,
      thana: normalizedThana,
      area: normalizedArea,
      address: normalizedAddress,
      gender: normalizedGender,
      school: resolvedSchool,
      studentClass: resolvedClass,
      curriculum: resolvedCurriculum,
      group: resolvedCurriculum,
      subjects: normalizedSubjects,
      subject: normalizedSubjects.join(', '),
      guardianRelationship: cleanMeaningfulString(user.guardianRelationship),
      studentName: cleanMeaningfulString(user.studentName),
      ...(resolvedAccountType ? { accountType: resolvedAccountType } : {}),
    };
  }

  if (role === 'tutor') {
    const cleanClasses = Array.isArray(user.classes)
      ? user.classes.map((c) => cleanMeaningfulString(c)).filter(Boolean)
      : [];
    const parsedAreas = Array.isArray(user.teachingAreas)
      ? user.teachingAreas.map((a) => cleanMeaningfulString(a)).filter(Boolean)
      : [];
    const fallbackAreas = [normalizedArea, normalizedThana]
      .filter(Boolean)
      .filter((item, idx, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === idx);
    const cleanAreas = parsedAreas.length > 0 ? parsedAreas : fallbackAreas;

    return {
      ...user,
      name: normalizedName,
      phone: normalizedPhone,
      district: normalizedDistrict,
      thana: normalizedThana,
      area: normalizedArea,
      address: normalizedAddress,
      gender: normalizedGender,
      university: cleanMeaningfulString(user.university),
      course: cleanMeaningfulString(user.course),
      year: cleanMeaningfulString(user.year),
      semester: cleanMeaningfulString(user.semester),
      subjects: normalizedSubjects,
      subject: normalizedSubjects.join(', '),
      classes: cleanClasses,
      teachingAreas: cleanAreas,
      teachingMode: cleanMeaningfulString(user.teachingMode),
      curriculum: cleanMeaningfulString(user.curriculum),
      bio: cleanMeaningfulString(user.bio),
    };
  }

  return {
    ...user,
    name: normalizedName,
    phone: normalizedPhone,
    district: normalizedDistrict,
    thana: normalizedThana,
    area: normalizedArea,
    address: normalizedAddress,
  };
}

/**
 * Centralized verification evaluator for Tutors.
 * Completely independent from Profile Completion percentage so missing NID/certificates
 * never falsely show a completed teaching profile as incomplete.
 */
export function getTutorVerificationStatus(
  user?: ProfileCompletionUserInput | null
): TutorVerificationSummary {
  if (!user) {
    return {
      overall: 'not_submitted',
      label: 'Not Submitted',
      description:
        'Upload any ONE valid identity document: National ID (NID) or University/College ID Card.',
      nidStatus: 'not_submitted',
      academicStatus: 'not_submitted',
      isVerified: false,
      hasNidSubmission: false,
      hasAcademicSubmission: false,
    };
  }

  const hasNidSubmission =
    isMeaningfulValue(user.nidFrontImg) ||
    (isMeaningfulValue(user.nidNumber) && isMeaningfulValue((user as any).nidBackImg));
  const hasAcademicSubmission =
    Array.isArray(user.documents) && user.documents.some((d) => isMeaningfulValue(d));

  const nidStatus: TutorVerificationSummary['nidStatus'] =
    user.nidStatus === 'approved'
      ? 'approved'
      : user.nidStatus === 'rejected'
      ? 'rejected'
      : hasNidSubmission
      ? 'pending'
      : 'not_submitted';

  const academicStatus: TutorVerificationSummary['academicStatus'] =
    user.academicStatus === 'approved'
      ? 'approved'
      : user.academicStatus === 'rejected'
      ? 'rejected'
      : hasAcademicSubmission
      ? 'pending'
      : 'not_submitted';

  const hasAnyRejection = nidStatus === 'rejected' || academicStatus === 'rejected';
  const hasAnyApproval = nidStatus === 'approved' || academicStatus === 'approved';

  // One-Document Verification Rule:
  // A tutor is verified if user.isVerified is true OR at least one submitted identity document
  // (NID OR University/College ID) is approved without an active unaddressed rejection.
  if (user.isVerified || (hasAnyApproval && !hasAnyRejection)) {
    return {
      overall: 'approved',
      label: 'Verified Educator',
      description:
        nidStatus === 'approved' && academicStatus === 'approved'
          ? 'Your National ID and institutional credentials are verified by EduTrack.'
          : nidStatus === 'approved'
          ? 'Your National ID (NID) is verified by EduTrack.'
          : academicStatus === 'approved'
          ? 'Your University/College ID Card is verified by EduTrack.'
          : 'Your identity credentials are verified by EduTrack.',
      nidStatus: user.isVerified && nidStatus === 'not_submitted' && academicStatus === 'not_submitted' ? 'approved' : nidStatus,
      academicStatus: user.isVerified && nidStatus === 'not_submitted' && academicStatus === 'not_submitted' ? 'approved' : academicStatus,
      isVerified: true,
      hasNidSubmission: hasNidSubmission || nidStatus === 'approved' || Boolean(user.isVerified),
      hasAcademicSubmission: hasAcademicSubmission || academicStatus === 'approved' || Boolean(user.isVerified),
    };
  }

  if (
    (nidStatus === 'rejected' && academicStatus === 'rejected') ||
    (nidStatus === 'rejected' && !hasAcademicSubmission && academicStatus === 'not_submitted') ||
    (academicStatus === 'rejected' && !hasNidSubmission && nidStatus === 'not_submitted')
  ) {
    return {
      overall: 'rejected',
      label: 'Verification Rejected',
      description:
        'Your submitted identity document could not be verified. Please upload a clear National ID (NID) or University/College ID Card.',
      nidStatus,
      academicStatus,
      isVerified: false,
      hasNidSubmission,
      hasAcademicSubmission,
    };
  }

  if (hasAnyRejection) {
    return {
      overall: 'changes_required',
      label: 'Additional Information Required',
      description:
        'A submitted verification document requires attention. Please re-upload a clear file or provide an alternative ID.',
      nidStatus,
      academicStatus,
      isVerified: false,
      hasNidSubmission,
      hasAcademicSubmission,
    };
  }

  if (hasNidSubmission || hasAcademicSubmission) {
    return {
      overall: 'pending_review',
      label: 'Pending Admin Review',
      description:
        hasNidSubmission && hasAcademicSubmission
          ? 'Your National ID (NID) and University/College ID documents are under admin review.'
          : hasNidSubmission
          ? 'Your National ID (NID) is submitted and awaiting admin review.'
          : 'Your University/College ID Card is submitted and awaiting admin review.',
      nidStatus,
      academicStatus,
      isVerified: false,
      hasNidSubmission,
      hasAcademicSubmission,
    };
  }

  return {
    overall: 'not_submitted',
    label: 'Not Submitted',
    description:
      'Upload any ONE valid identity document: National ID (NID) or University/College ID Card.',
    nidStatus: 'not_submitted',
    academicStatus: 'not_submitted',
    isVerified: false,
    hasNidSubmission: false,
    hasAcademicSubmission: false,
  };
}

/**
 * Single source of truth for calculating role-aware profile completion across
 * Student, Guardian, Tutor, and Admin accounts.
 */
export function calculateProfileCompletion(
  rawUser?: ProfileCompletionUserInput | null,
  options?: { studentProfiles?: StudentProfileRecord[] }
): ProfileCompletionResult {
  if (!rawUser) {
    return {
      role: 'student',
      accountType: null,
      percentage: 0,
      isComplete: false,
      completedCount: 0,
      totalCount: 0,
      requirements: [],
      missingFields: [],
      completedFields: [],
      optionalEnhancements: [],
      needsAccountTypeSelection: false,
      firstMissingFieldId: null,
    };
  }

  const user = normalizeUserProfileFields(rawUser);
  const role: UserRole =
    user.role === 'tutor' ? 'tutor' : user.role === 'admin' ? 'admin' : 'student';

  if (role === 'admin') {
    const reqs: ProfileFieldRequirement[] = [
      {
        key: 'name',
        label: 'Admin Name',
        completed: isMeaningfulValue(user.name),
        displayValue: cleanMeaningfulString(user.name) || 'Not Specified',
        targetTab: 'account',
        targetFieldId: 'profile-field-name',
        category: 'basic',
      },
      {
        key: 'email',
        label: 'Admin Email',
        completed: isMeaningfulValue(user.email),
        displayValue: cleanMeaningfulString(user.email) || 'Not Specified',
        targetTab: 'account',
        targetFieldId: 'profile-field-email',
        category: 'contact',
      },
    ];
    const completedFields = reqs.filter((r) => r.completed);
    const missingFields = reqs.filter((r) => !r.completed);
    const percentage = Math.round((completedFields.length / reqs.length) * 100);
    return {
      role: 'admin',
      accountType: null,
      percentage,
      isComplete: percentage === 100,
      completedCount: completedFields.length,
      totalCount: reqs.length,
      requirements: reqs,
      missingFields,
      completedFields,
      optionalEnhancements: [],
      needsAccountTypeSelection: false,
      firstMissingFieldId: missingFields[0]?.targetFieldId || null,
    };
  }

  if (role === 'tutor') {
    const locationParts = [user.area, user.thana, user.district].filter((p) =>
      isMeaningfulValue(p)
    );
    const hasLocation =
      isMeaningfulValue(user.district) &&
      (isMeaningfulValue(user.area) ||
        (Array.isArray(user.teachingAreas) && user.teachingAreas.length > 0));
    const hasAcademic =
      isMeaningfulValue(user.university) &&
      isMeaningfulValue(user.course) &&
      isMeaningfulValue(user.year);
    const hasSubjects = Array.isArray(user.subjects) && user.subjects.length > 0;
    const hasClasses = Array.isArray(user.classes) && user.classes.length > 0;
    const hasRate = isMeaningfulValue(user.hourlyRate);
    const hasBio = isMeaningfulValue(user.bio);
    const hasAvailability = hasConfiguredAvailabilitySlots(user.availabilitySlots);
    const hasContact = isMeaningfulValue(user.name) && isMeaningfulValue(user.phone);
    const hasTeachingMode = isMeaningfulValue(user.teachingMode);

    const requirements: ProfileFieldRequirement[] = [
      {
        key: 'basic_contact',
        label: 'Name & Contact Phone',
        labelBn: 'পূর্ণ নাম ও মোবাইল নম্বর (Name & Contact Phone)',
        completed: hasContact,
        displayValue: hasContact
          ? `${user.name} (${user.phone})`
          : !isMeaningfulValue(user.name)
          ? 'Missing Name'
          : 'Missing Phone',
        targetTab: 'pro_profile',
        targetFieldId: !isMeaningfulValue(user.name) ? 'tutor-field-name' : 'tutor-field-phone',
        category: 'contact',
      },
      {
        key: 'academic',
        label: 'University, Department & Year',
        labelBn: 'বিশ্ববিদ্যালয়, বিভাগ ও বর্ষ (University, Department & Year)',
        completed: hasAcademic,
        displayValue: hasAcademic
          ? `${user.university} • ${user.course} (${user.year})`
          : 'Missing Academic Info',
        targetTab: 'pro_profile',
        targetFieldId: !isMeaningfulValue(user.university)
          ? 'tutor-field-university'
          : !isMeaningfulValue(user.course)
          ? 'tutor-field-course'
          : 'tutor-field-year',
        category: 'academic',
      },
      {
        key: 'subjects',
        label: 'Teaching Subjects',
        labelBn: 'পড়ানোর বিষয়সমূহ (Preferred Subjects)',
        completed: hasSubjects,
        displayValue: hasSubjects
          ? `${user.subjects!.slice(0, 3).join(', ')}${user.subjects!.length > 3 ? ` +${user.subjects!.length - 3}` : ''}`
          : 'No Subjects Selected',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-subjects',
        category: 'teaching',
      },
      {
        key: 'classes',
        label: 'Target Classes',
        labelBn: 'পড়ানোর ক্লাস বা লেভেল (Preferred Classes)',
        completed: hasClasses,
        displayValue: hasClasses
          ? `${user.classes!.slice(0, 3).join(', ')}${user.classes!.length > 3 ? ` +${user.classes!.length - 3}` : ''}`
          : 'No Classes Selected',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-classes',
        category: 'teaching',
      },
      {
        key: 'location_mode',
        label: 'Location & Teaching Mode',
        labelBn: 'জেলা, এলাকা ও টিউশন ধরন (District, Area & Teaching Mode)',
        completed: hasLocation && hasTeachingMode,
        displayValue:
          hasLocation && hasTeachingMode
            ? `${locationParts.join(', ')} • ${user.teachingMode}`
            : !hasLocation
            ? 'Missing District / Area'
            : 'Missing Teaching Mode',
        targetTab: 'pro_profile',
        targetFieldId: !isMeaningfulValue(user.district)
          ? 'tutor-field-district'
          : !hasTeachingMode
          ? 'tutor-field-teaching-mode'
          : 'tutor-field-area',
        category: 'location',
      },
      {
        key: 'hourlyRate',
        label: 'Expected Monthly Salary',
        labelBn: 'প্রত্যাশিত মাসিক সম্মানী (Expected Monthly Salary)',
        completed: hasRate,
        displayValue: hasRate ? `৳${Number(user.hourlyRate).toLocaleString()}/month` : 'Salary Not Set',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-hourly-rate',
        category: 'teaching',
      },
      {
        key: 'bio',
        label: 'Teaching Bio',
        labelBn: 'টিউশন অভিজ্ঞতা ও সংক্ষিপ্ত পরিচিতি (Short Bio)',
        completed: hasBio,
        displayValue: hasBio ? 'Bio Added' : 'Bio Not Added',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-bio',
        category: 'basic',
      },
      {
        key: 'availability',
        label: 'Weekly Availability Slots',
        labelBn: 'সাপ্তাহিক পড়ানোর সময়সূচি (Weekly Availability)',
        completed: hasAvailability,
        displayValue: hasAvailability ? 'Schedule Configured' : 'No Slots Selected',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-availability',
        category: 'teaching',
      },
    ];

    const optionalEnhancements: ProfileFieldRequirement[] = [
      {
        key: 'profileImage',
        label: 'Profile Photo',
        labelBn: 'প্রোফাইল ছবি (Profile Photo)',
        completed: isMeaningfulValue(user.profileImage) || Boolean((user as any).hasProfilePhoto),
        displayValue: isMeaningfulValue(user.profileImage) || Boolean((user as any).hasProfilePhoto) ? 'Uploaded' : 'Optional',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-photo',
        category: 'basic',
      },
      {
        key: 'gender',
        label: 'Gender',
        labelBn: 'লিঙ্গ (Gender)',
        completed: isMeaningfulValue(user.gender),
        displayValue: cleanMeaningfulString(user.gender) || 'Optional',
        targetTab: 'pro_profile',
        targetFieldId: 'tutor-field-gender',
        category: 'basic',
      },
    ];

    const completedFields = requirements.filter((r) => r.completed);
    const missingFields = requirements.filter((r) => !r.completed);
    const percentage = Math.round((completedFields.length / requirements.length) * 100);

    return {
      role: 'tutor',
      accountType: null,
      percentage,
      isComplete: missingFields.length === 0,
      completedCount: completedFields.length,
      totalCount: requirements.length,
      requirements,
      missingFields,
      completedFields,
      optionalEnhancements,
      needsAccountTypeSelection: false,
      firstMissingFieldId: missingFields[0]?.targetFieldId || null,
    };
  }

  // Student vs Guardian (both carry role === 'student' for route & RBAC compatibility)
  const needsAccountTypeSelection =
    user.accountType !== 'student' && user.accountType !== 'guardian';
  const effectiveAccountType: AccountType =
    user.accountType === 'guardian' ? 'guardian' : 'student';

  const hasAddressOrArea = isMeaningfulValue(user.address) || isMeaningfulValue(user.area);
  const hasLocation = isMeaningfulValue(user.district) && hasAddressOrArea;
  const locationDisplay = [user.address, user.area, user.thana, user.district]
    .filter((v) => isMeaningfulValue(v))
    .join(', ');

  if (effectiveAccountType === 'guardian') {
    const profiles = (options?.studentProfiles || []).filter(
      (p) => !user.id || p.guardianId === user.id
    );
    const activeProfile =
      profiles.find((p) => p.id === user.activeStudentProfileId) || profiles[0];

    const studentName = cleanMeaningfulString(activeProfile?.studentName || user.studentName);
    const studentClass = cleanMeaningfulString(activeProfile?.studentClass || user.studentClass);
    const studentSchool = cleanMeaningfulString(activeProfile?.school || user.school);
    const studentCurriculum = cleanMeaningfulString(
      activeProfile?.curriculum || user.curriculum || user.group
    );
    const hasLinkedStudent =
      Boolean(studentName) &&
      Boolean(studentClass) &&
      Boolean(studentSchool) &&
      Boolean(studentCurriculum);

    const requirements: ProfileFieldRequirement[] = [
      {
        key: 'name',
        label: 'Guardian Full Name',
        labelBn: 'অভিভাবকের পূর্ণ নাম (Guardian Full Name)',
        completed: isMeaningfulValue(user.name),
        displayValue: cleanMeaningfulString(user.name) || 'Not Specified',
        targetTab: 'account',
        targetFieldId: 'account-field-name',
        category: 'basic',
      },
      {
        key: 'phone',
        label: 'Guardian Contact Phone',
        labelBn: 'মোবাইল নম্বর (Guardian Mobile Number)',
        completed: isMeaningfulValue(user.phone),
        displayValue: cleanMeaningfulString(user.phone) || 'Not Specified',
        targetTab: 'account',
        targetFieldId: 'account-field-phone',
        category: 'contact',
      },
      {
        key: 'guardianRelationship',
        label: 'Relationship to Student',
        labelBn: 'শিক্ষার্থীর সাথে সম্পর্ক (Relationship to Student)',
        completed: isMeaningfulValue(user.guardianRelationship),
        displayValue: cleanMeaningfulString(user.guardianRelationship) || 'Not Specified',
        targetTab: 'account',
        targetFieldId: 'account-field-relationship',
        category: 'basic',
      },
      {
        key: 'location',
        label: 'Tuition Location & Address',
        labelBn: 'জেলা ও বাসার ঠিকানা (District / Location)',
        completed: hasLocation,
        displayValue: locationDisplay || 'Not Specified',
        targetTab: 'account',
        targetFieldId: !isMeaningfulValue(user.district)
          ? 'account-field-district'
          : 'account-field-address',
        category: 'location',
      },
      {
        key: 'studentProfile',
        label: 'Linked Student Profile',
        labelBn: 'সন্তানের একাডেমিক তথ্য — নাম, ক্লাস ও স্কুল (Linked Student Profile)',
        completed: hasLinkedStudent,
        displayValue: hasLinkedStudent
          ? `${studentName} • ${studentClass} (${studentSchool})`
          : !studentName
          ? 'Add Student Details'
          : !studentClass
          ? 'Missing Student Class'
          : !studentSchool
          ? 'Missing Student School'
          : 'Missing Curriculum',
        targetTab: 'account',
        targetFieldId: 'guardian-student-profile-section',
        category: 'student_profile',
      },
    ];

    const optionalEnhancements: ProfileFieldRequirement[] = [
      {
        key: 'subjects',
        label: 'Target Learning Subjects',
        labelBn: 'টিউশনের বিষয়সমূহ (Learning Subjects)',
        completed:
          (activeProfile?.subjects && activeProfile.subjects.length > 0) ||
          (Array.isArray(user.subjects) && user.subjects.length > 0),
        displayValue:
          activeProfile?.subjects?.length
            ? activeProfile.subjects.join(', ')
            : user.subjects?.length
            ? user.subjects.join(', ')
            : 'Optional',
        targetTab: 'account',
        targetFieldId: 'account-field-subjects',
        category: 'academic',
      },
      {
        key: 'profileImage',
        label: 'Profile Photo',
        labelBn: 'প্রোফাইল ছবি (Profile Photo)',
        completed: isMeaningfulValue(user.profileImage) || Boolean((user as any).hasProfilePhoto),
        displayValue: isMeaningfulValue(user.profileImage) || Boolean((user as any).hasProfilePhoto) ? 'Uploaded' : 'Optional',
        targetTab: 'account',
        targetFieldId: 'account-field-photo',
        category: 'basic',
      },
    ];

    const completedFields = requirements.filter((r) => r.completed);
    const missingFields = requirements.filter((r) => !r.completed);
    const percentage = Math.round((completedFields.length / requirements.length) * 100);

    return {
      role: 'student',
      accountType: needsAccountTypeSelection ? null : 'guardian',
      percentage,
      isComplete: missingFields.length === 0,
      completedCount: completedFields.length,
      totalCount: requirements.length,
      requirements,
      missingFields,
      completedFields,
      optionalEnhancements,
      needsAccountTypeSelection,
      firstMissingFieldId: missingFields[0]?.targetFieldId || null,
    };
  }

  // Standard Student account
  const requirements: ProfileFieldRequirement[] = [
    {
      key: 'name',
      label: 'Full Name',
      labelBn: 'আপনার পূর্ণ নাম (Full Name)',
      completed: isMeaningfulValue(user.name),
      displayValue: cleanMeaningfulString(user.name) || 'Not Specified',
      targetTab: 'account',
      targetFieldId: 'account-field-name',
      category: 'basic',
    },
    {
      key: 'phone',
      label: 'Contact Phone',
      labelBn: 'মোবাইল নম্বর (Contact Phone)',
      completed: isMeaningfulValue(user.phone),
      displayValue: cleanMeaningfulString(user.phone) || 'Not Specified',
      targetTab: 'account',
      targetFieldId: 'account-field-phone',
      category: 'contact',
    },
    {
      key: 'studentClass',
      label: 'Academic Class',
      labelBn: 'আপনার বর্তমান ক্লাস (Academic Class)',
      completed: isMeaningfulValue(user.studentClass),
      displayValue: cleanMeaningfulString(user.studentClass) || 'Not Specified',
      targetTab: 'account',
      targetFieldId: 'account-field-class',
      category: 'academic',
    },
    {
      key: 'school',
      label: 'School / College',
      labelBn: 'শিক্ষা প্রতিষ্ঠান (School / College)',
      completed: isMeaningfulValue(user.school),
      displayValue: cleanMeaningfulString(user.school) || 'Not Specified',
      targetTab: 'account',
      targetFieldId: 'account-field-school',
      category: 'academic',
    },
    {
      key: 'curriculum',
      label: 'Curriculum / Group',
      labelBn: 'কারিকুলাম বা বিভাগ (Curriculum / Group)',
      completed: isMeaningfulValue(user.curriculum),
      displayValue: cleanMeaningfulString(user.curriculum) || 'Not Specified',
      targetTab: 'account',
      targetFieldId: 'account-field-curriculum',
      category: 'academic',
    },
    {
      key: 'location',
      label: 'Delivery / Tuition Address',
      labelBn: 'জেলা ও বর্তমান ঠিকানা (District / Location)',
      completed: hasLocation,
      displayValue: locationDisplay || 'Not Specified',
      targetTab: 'account',
      targetFieldId: !isMeaningfulValue(user.district)
        ? 'account-field-district'
        : 'account-field-address',
      category: 'location',
    },
  ];

  const optionalEnhancements: ProfileFieldRequirement[] = [
    {
      key: 'subjects',
      label: 'Learning Subjects',
      labelBn: 'টিউশনের বিষয়সমূহ (Learning Subjects)',
      completed: Array.isArray(user.subjects) && user.subjects.length > 0,
      displayValue:
        Array.isArray(user.subjects) && user.subjects.length > 0
          ? user.subjects.join(', ')
          : 'Optional',
      targetTab: 'account',
      targetFieldId: 'account-field-subjects',
      category: 'academic',
    },
    {
      key: 'profileImage',
      label: 'Profile Photo',
      labelBn: 'প্রোফাইল ছবি (Profile Photo)',
      completed: isMeaningfulValue(user.profileImage) || Boolean((user as any).hasProfilePhoto),
      displayValue: isMeaningfulValue(user.profileImage) || Boolean((user as any).hasProfilePhoto) ? 'Uploaded' : 'Optional',
      targetTab: 'account',
      targetFieldId: 'account-field-photo',
      category: 'basic',
    },
  ];

  const completedFields = requirements.filter((r) => r.completed);
  const missingFields = requirements.filter((r) => !r.completed);
  const percentage = Math.round((completedFields.length / requirements.length) * 100);

  return {
    role: 'student',
    accountType: needsAccountTypeSelection ? null : 'student',
    percentage,
    isComplete: missingFields.length === 0,
    completedCount: completedFields.length,
    totalCount: requirements.length,
    requirements,
    missingFields,
    completedFields,
    optionalEnhancements,
    needsAccountTypeSelection,
    firstMissingFieldId: missingFields[0]?.targetFieldId || null,
  };
}

/**
 * Evaluates role-based access to marketplace listings:
 * - Student / Guardian: requires 100% mandatory profile completion before accessing Tutor Search & tutor listings.
 * - Tutor: requires 100% mandatory tutor profile completion before accessing Tuition Circulars & student requests.
 * - Admin: full unrestricted access to all records and panels.
 * - Distinguishes loading states from incomplete profile states so users never see false restriction flashes.
 */
export function evaluateRoleMarketplaceAccess(
  rawUser: ProfileCompletionUserInput | null | undefined,
  options?: {
    studentProfiles?: StudentProfileRecord[];
    isInitialized?: boolean;
    isLoading?: boolean;
  }
): RoleMarketplaceAccessResult {
  const completion = calculateProfileCompletion(rawUser, {
    studentProfiles: options?.studentProfiles,
  });

  if (options?.isInitialized === false || options?.isLoading === true) {
    return {
      allowed: false,
      status: 'loading',
      role: !rawUser
        ? 'guest'
        : rawUser.role === 'admin'
        ? 'admin'
        : rawUser.role === 'tutor'
        ? 'tutor'
        : completion.accountType === 'guardian'
        ? 'guardian'
        : 'student',
      targetResource: 'none',
      completion,
      title: 'Checking Profile Status...',
      messageBn: 'প্রোফাইল তথ্য যাচাই করা হচ্ছে...',
      messageEn: 'Verifying your profile completion status...',
      ctaLabel: 'Please Wait',
      primaryMissingFieldId: '',
    };
  }

  if (!rawUser) {
    return {
      allowed: false,
      status: 'unauthenticated',
      role: 'guest',
      targetResource: 'none',
      completion,
      title: 'Sign In Required',
      messageBn: 'এই সুবিধাটি ব্যবহার করতে অনুগ্রহ করে লগইন করুন।',
      messageEn: 'Please sign in to access personalized listings.',
      ctaLabel: 'Sign In',
      primaryMissingFieldId: '',
    };
  }

  if (rawUser.role === 'admin') {
    return {
      allowed: true,
      status: 'allowed',
      role: 'admin',
      targetResource: 'admin_panel',
      completion,
      title: PROFILE_COMPLETED_CONFIRMATION.title,
      messageBn: PROFILE_COMPLETED_CONFIRMATION.messageBn,
      messageEn: PROFILE_COMPLETED_CONFIRMATION.messageEn,
      ctaLabel: 'Admin Panel',
      primaryMissingFieldId: '',
    };
  }

  if (rawUser.role === 'tutor') {
    if (completion.isComplete) {
      return {
        allowed: true,
        status: 'allowed',
        role: 'tutor',
        targetResource: 'tuition_opportunities',
        completion,
        title: PROFILE_COMPLETED_CONFIRMATION.title,
        messageBn: PROFILE_COMPLETED_CONFIRMATION.messageBn,
        messageEn: PROFILE_COMPLETED_CONFIRMATION.messageEn,
        ctaLabel: 'Browse Tuitions',
        primaryMissingFieldId: '',
      };
    }
    return {
      allowed: false,
      status: 'restricted_incomplete_profile',
      role: 'tutor',
      targetResource: 'tuition_opportunities',
      completion,
      title: 'Complete Your Tutor Profile',
      messageBn: 'নতুন টিউশন খুঁজতে আপনার প্রোফাইলের প্রয়োজনীয় তথ্যগুলো সম্পূর্ণ করুন।',
      messageEn:
        'Please complete all mandatory tutor profile details below to unlock available tuition opportunities and student listings.',
      ctaLabel: 'Complete Now',
      primaryMissingFieldId: completion.firstMissingFieldId || 'tutor-field-university',
    };
  }

  // Student or Guardian
  const effectiveRole = completion.accountType === 'guardian' ? 'guardian' : 'student';
  if (completion.isComplete) {
    return {
      allowed: true,
      status: 'allowed',
      role: effectiveRole,
      targetResource: 'tutor_listings',
      completion,
      title: PROFILE_COMPLETED_CONFIRMATION.title,
      messageBn: PROFILE_COMPLETED_CONFIRMATION.messageBn,
      messageEn: PROFILE_COMPLETED_CONFIRMATION.messageEn,
      ctaLabel: 'Find Tutors',
      primaryMissingFieldId: '',
    };
  }

  return {
    allowed: false,
    status: 'restricted_incomplete_profile',
    role: effectiveRole,
    targetResource: 'tutor_listings',
    completion,
    title: 'Complete Your Profile',
    messageBn: 'টিচার খোঁজার সুবিধা চালু করতে প্রথমে আপনার প্রোফাইলের প্রয়োজনীয় তথ্যগুলো সম্পূর্ণ করুন।',
    messageEn:
      'Please complete your mandatory profile details below to unlock tutor search results and personalized tutor recommendations.',
    ctaLabel: 'Complete Profile',
    primaryMissingFieldId: completion.firstMissingFieldId || 'account-field-school',
  };
}

