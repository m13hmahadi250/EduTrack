import {
  cleanMeaningfulString,
  hasConfiguredAvailabilitySlots,
  parseSubjectsList,
} from './profileCompletion';

export interface TutorFilterCriteria {
  searchQuery?: string;
  subject?: string;
  studentClass?: string;
  district?: string;
  mode?: string;
  curriculum?: string;
  maxBudget?: string;
  onlyAvailableToday?: boolean;
  tags?: string[];
  favoriteIds?: string[];
  favoritesOnly?: boolean;
}

const DISTRICT_ALIASES: Record<string, string> = {
  chittagong: 'chattogram',
  comilla: 'cumilla',
  jessore: 'jashore',
  bogra: 'bogura',
  barisal: 'barishal',
};

export function normalizeDistrictAlias(val: unknown): string {
  const cleaned = cleanMeaningfulString(val).toLowerCase();
  if (!cleaned) return '';
  return DISTRICT_ALIASES[cleaned] || cleaned;
}

export function isTutorVerified(tutor: any): boolean {
  if (!tutor || typeof tutor !== 'object') return false;
  return Boolean(
    tutor.isVerified === true ||
      tutor.verified === true ||
      tutor.isApproved === true
  );
}

export function isTutorEligibleForHome(tutor: any): boolean {
  if (!tutor || typeof tutor !== 'object') return false;
  const role = String(tutor.role || '').toLowerCase();
  if (role !== 'tutor' && role !== 'teacher') return false;
  if (tutor.isBlocked === true) return false;
  if (tutor.showOnHomePage === false) return false;
  if (tutor.privacySettings?.hideFromSearch === true) return false;
  return isTutorVerified(tutor);
}

export function isTutorEligibleForStudentSearch(tutor: any): boolean {
  if (!tutor || typeof tutor !== 'object') return false;
  const role = String(tutor.role || '').toLowerCase();
  if (role !== 'tutor' && role !== 'teacher') return false;
  if (tutor.isBlocked === true) return false;
  if (tutor.privacySettings?.hideFromSearch === true) return false;
  return isTutorVerified(tutor);
}

export interface FormattedSubjectsSummary {
  visible: string[];
  hiddenCount: number;
  totalCount: number;
  text: string;
  moreLabel: string;
  fullText: string;
}

export function formatTutorSubjectsSummary(
  tutor: any,
  maxVisible = 5
): FormattedSubjectsSummary {
  const limit = Math.max(1, maxVisible);
  const primarySources: string[] = [];
  if (tutor && typeof tutor === 'object' && tutor.primarySubjects) {
    primarySources.push(...parseSubjectsList(tutor.primarySubjects));
  }
  const allSubjects = parseSubjectsList(tutor?.subjects, tutor?.subject);

  // Prefer primary teaching subjects first when available, then existing subject order, deduplicated
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const s of [...primarySources, ...allSubjects]) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(s);
    }
  }

  if (ordered.length === 0) {
    return {
      visible: [],
      hiddenCount: 0,
      totalCount: 0,
      text: 'General Academic Subjects',
      moreLabel: '',
      fullText: 'General Academic Subjects',
    };
  }

  const visible = ordered.slice(0, limit);
  const hiddenCount = Math.max(0, ordered.length - visible.length);
  const text = visible.join(', ');
  const moreLabel = hiddenCount > 0 ? `+${hiddenCount} more` : '';
  const fullText = moreLabel ? `${text} ${moreLabel}` : text;

  return {
    visible,
    hiddenCount,
    totalCount: ordered.length,
    text,
    moreLabel,
    fullText,
  };
}

export function getTutorClassesList(tutor: any): string[] {
  if (!tutor || typeof tutor !== 'object') return [];
  const rawSources: unknown[] = [];

  if (Array.isArray(tutor.classes) && tutor.classes.length > 0) {
    rawSources.push(...tutor.classes);
  } else if (typeof tutor.classes === 'string' && tutor.classes.trim()) {
    rawSources.push(...tutor.classes.split(','));
  }

  if (rawSources.length === 0) {
    if (Array.isArray(tutor.preferredClasses) && tutor.preferredClasses.length > 0) {
      rawSources.push(...tutor.preferredClasses);
    } else if (typeof tutor.preferredClasses === 'string' && tutor.preferredClasses.trim()) {
      rawSources.push(...tutor.preferredClasses.split(','));
    } else if (typeof tutor.studentClass === 'string' && tutor.studentClass.trim()) {
      rawSources.push(...tutor.studentClass.split(','));
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of rawSources) {
    const cleaned = cleanMeaningfulString(item);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}

export function formatTutorClassesRange(tutor: any): string {
  const classes = getTutorClassesList(tutor);
  if (classes.length === 0) return 'All Academic Levels';

  const numericSet = new Set<number>();
  let hasSsc = false;
  let hasHsc = false;
  let hasOLevel = false;
  let hasALevel = false;
  let hasAdmission = false;
  let hasUniversity = false;
  const extraTiers: string[] = [];
  const extraSeen = new Set<string>();

  const pushExtra = (label: string) => {
    const key = label.toLowerCase();
    if (!extraSeen.has(key)) {
      extraSeen.add(key);
      extraTiers.push(label);
    }
  };

  for (const rawItem of classes) {
    const item = rawItem.trim();
    const lower = item.toLowerCase();

    // Check explicit pre-formatted ranges like "Class 1-10" or "Class 5–8"
    const explicitRangeMatch = item.match(/^class\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})$/i);
    if (explicitRangeMatch) {
      const a = Number(explicitRangeMatch[1]);
      const b = Number(explicitRangeMatch[2]);
      if (a >= 1 && b <= 12 && a <= b) {
        for (let n = a; n <= b; n++) numericSet.add(n);
        continue;
      }
    }

    // Check single school classes: "Class 8", "Std 6", or bare "8"
    const classNumMatch =
      item.match(/^(?:class|std|grade)[\s.-]*(\d{1,2})(?:\b|$)/i) ||
      item.match(/^(\d{1,2})$/);
    if (classNumMatch) {
      const n = Number(classNumMatch[1]);
      if (n >= 1 && n <= 12) {
        numericSet.add(n);
        continue;
      }
    }

    if (/\b(o[\s-]*level|igcse)\b/i.test(lower)) {
      hasOLevel = true;
      continue;
    }
    if (/\b(a[\s-]*level)\b/i.test(lower)) {
      hasALevel = true;
      continue;
    }
    if (/\b(admission|varsity\s*admission|medical\s*admission|engineering\s*admission|buet\s*admission)\b/i.test(lower)) {
      hasAdmission = true;
      continue;
    }
    if (/\b(hsc|intermediate|alim)\b/i.test(lower)) {
      hasHsc = true;
      continue;
    }
    if (/\b(ssc|dakhil)\b/i.test(lower)) {
      hasSsc = true;
      continue;
    }
    if (/\b(university|undergraduate|honours|honors|bachelor|bsc|bba|masters|msc)\b/i.test(lower)) {
      hasUniversity = true;
      continue;
    }
    if (/^primary$/i.test(lower)) {
      pushExtra('Primary');
      continue;
    }
    if (/^(kg|kindergarten|nursery|play)$/i.test(lower)) {
      pushExtra(lower === 'kg' ? 'KG' : item);
      continue;
    }

    pushExtra(item);
  }

  // If both Class 11 and Class 12 are present, represent them as HSC cleanly
  if (numericSet.has(11) && numericSet.has(12)) {
    numericSet.delete(11);
    numericSet.delete(12);
    hasHsc = true;
  }

  // Group genuinely consecutive numeric classes into ranges without inventing missing levels
  const sortedNums = Array.from(numericSet).sort((a, b) => a - b);
  const runs: Array<{ start: number; end: number }> = [];
  for (const num of sortedNums) {
    const last = runs[runs.length - 1];
    if (last && num === last.end + 1) {
      last.end = num;
    } else {
      runs.push({ start: num, end: num });
    }
  }

  const segments: string[] = [...extraTiers];
  let sscHandled = false;

  for (const run of runs) {
    if (run.start === run.end) {
      segments.push(`Class ${run.start}`);
    } else if (run.start === 9 && run.end === 10 && hasSsc) {
      segments.push('Class 9–10 (SSC)');
      sscHandled = true;
    } else {
      if (run.start <= 9 && run.end >= 10 && hasSsc) {
        sscHandled = true;
      }
      segments.push(`Class ${run.start}–${run.end}`);
    }
  }

  if (hasSsc && !sscHandled) segments.push('SSC');
  if (hasOLevel) segments.push('O Level');
  if (hasHsc) segments.push('HSC');
  if (hasALevel) segments.push('A Level');
  if (hasAdmission) segments.push('Admission');
  if (hasUniversity) segments.push('University');

  // Deduplicate defensively preserving order
  const finalSegments: string[] = [];
  const finalSeen = new Set<string>();
  for (const seg of segments) {
    const key = seg.toLowerCase();
    if (!finalSeen.has(key)) {
      finalSeen.add(key);
      finalSegments.push(seg);
    }
  }

  return finalSegments.length > 0 ? finalSegments.join(', ') : 'All Academic Levels';
}

export function formatTutorClassesBadge(tutor: any): string {
  return formatTutorClassesRange(tutor);
}

const RECOGNIZED_INSTITUTIONS: Array<[RegExp, string]> = [
  [/^international islamic university[\s,]*chitt?agong$/i, 'IIUC'],
  [/^bangladesh university of engineering (?:and|&) technology$/i, 'BUET'],
  [/^(?:university of dhaka|dhaka university)$/i, 'DU'],
  [/^chitt?agong university of engineering (?:and|&) technology$/i, 'CUET'],
  [/^rajshahi university of engineering (?:and|&) technology$/i, 'RUET'],
  [/^khulna university of engineering (?:and|&) technology$/i, 'KUET'],
  [/^dhaka university of engineering (?:and|&) technology$/i, 'DUET'],
  [/^shahjalal university of science (?:and|&) technology$/i, 'SUST'],
  [/^(?:university of chitt?agong|chitt?agong university)$/i, 'CU'],
  [/^jahangirnagar university$/i, 'JU'],
  [/^jagannath university$/i, 'JnU'],
  [/^(?:university of rajshahi|rajshahi university)$/i, 'RU'],
  [/^khulna university$/i, 'KU'],
  [/^bangladesh university of professionals$/i, 'BUP'],
  [/^islamic university of technology$/i, 'IUT'],
  [/^ahsanullah university of science (?:and|&) technology$/i, 'AUST'],
  [/^north south university$/i, 'NSU'],
  [/^brac university$/i, 'BRACU'],
  [/^independent university[\s,]*bangladesh$/i, 'IUB'],
  [/^american international university[\s-]*bangladesh$/i, 'AIUB'],
  [/^east west university$/i, 'EWU'],
  [/^united international university$/i, 'UIU'],
  [/^daffodil international university$/i, 'DIU'],
  [/^dhaka medical college$/i, 'DMC'],
  [/^chitt?agong medical college$/i, 'CMC'],
  [/^sir salimullah medical college$/i, 'SSMC'],
  [/^bangladesh agricultural university$/i, 'BAU'],
  [/^noakhali science (?:and|&) technology university$/i, 'NSTU'],
  [/^military institute of science (?:and|&) technology$/i, 'MIST'],
  [/^bangladesh university of textiles$/i, 'BUTEX'],
];

export function formatInstitutionDisplay(rawInstitution: unknown): string {
  const cleaned = cleanMeaningfulString(rawInstitution);
  if (!cleaned) return '';

  // If formatted like "International Islamic University Chittagong (IIUC)" and acronym is standard
  const parenMatch = cleaned.match(/^(.+?)\s*\(([A-Z]{2,8})\)\s*$/);
  if (parenMatch) {
    const baseName = parenMatch[1].trim();
    for (const [pattern, abbr] of RECOGNIZED_INSTITUTIONS) {
      if (pattern.test(baseName)) return abbr;
    }
    return cleaned;
  }

  for (const [pattern, abbr] of RECOGNIZED_INSTITUTIONS) {
    if (pattern.test(cleaned)) return abbr;
  }

  // Do not invent abbreviations for unknown institutions
  return cleaned;
}

export function formatInstitutionWithLocation(
  rawInstitution: unknown,
  rawDistrict?: unknown
): string {
  const uni = formatInstitutionDisplay(rawInstitution);
  const district = cleanMeaningfulString(rawDistrict);
  if (!uni && !district) return '';
  if (!uni) return district;
  if (!district) return uni;

  const uniLower = uni.toLowerCase();
  const distLower = district.toLowerCase();
  const distAlias = normalizeDistrictAlias(district);
  if (
    uniLower.includes(distLower) ||
    (distAlias && uniLower.includes(distAlias)) ||
    (distAlias === 'chattogram' && uniLower.includes('chittagong'))
  ) {
    return uni;
  }
  return `${uni} · ${district}`;
}

export function formatTeachingModeLabel(rawMode: unknown): string {
  const cleaned = cleanMeaningfulString(rawMode);
  if (!cleaned) return 'Home / Online';
  const lower = cleaned.toLowerCase();
  if (
    lower === 'both' ||
    lower.includes('home & online') ||
    lower.includes('home and online') ||
    (lower.includes('home') && lower.includes('online'))
  ) {
    return 'Home / Online';
  }
  if (lower.includes('online')) return 'Online';
  if (lower.includes('home')) return 'Home';
  return cleaned;
}

export function matchesDistrictFilter(tutor: any, selectedDistrict: string): boolean {
  if (!selectedDistrict || selectedDistrict === 'All') return true;
  const target = normalizeDistrictAlias(selectedDistrict);
  const tutorDist = normalizeDistrictAlias(tutor?.district);
  if (!tutorDist) return false;
  return tutorDist === target;
}

export function matchesClassFilter(tutor: any, selectedClass: string): boolean {
  if (!selectedClass || selectedClass === 'All') return true;

  const classes = getTutorClassesList(tutor);
  const joined = classes.join(' | ').toLowerCase();
  const target = selectedClass.trim().toLowerCase();

  if (target === 'class 1 - 5') {
    if (classes.length === 0) return false;
    return (
      /\bclass\s*[1-5]\b/i.test(joined) ||
      /\b(primary|kg|nursery|play|pec|all)\b/i.test(joined)
    );
  }

  if (target === 'class 6 - 8') {
    if (classes.length === 0) return false;
    return /\bclass\s*[6-8]\b/i.test(joined) || /\b(jsc|all)\b/i.test(joined);
  }

  if (target === 'class 9 - 10') {
    if (classes.length === 0) return false;
    return (
      /\bclass\s*(9|10)\b/i.test(joined) ||
      /\b(ssc|dakhil|all)\b/i.test(joined)
    );
  }

  if (target === 'class 11 - 12') {
    if (classes.length === 0) return false;
    return (
      /\bclass\s*(11|12)\b/i.test(joined) ||
      /\b(hsc|alim|intermediate|all)\b/i.test(joined)
    );
  }

  if (target === 'english medium') {
    const cur = cleanMeaningfulString(tutor?.curriculum || tutor?.medium).toLowerCase();
    const subs = parseSubjectsList(tutor?.subjects, tutor?.subject).join(' ').toLowerCase();
    return (
      cur.includes('english medium') ||
      cur.includes('cambridge') ||
      cur.includes('edexcel') ||
      /\b(o[\s-]*level|a[\s-]*level|cambridge|edexcel|igcse|english medium)\b/i.test(joined) ||
      /\b(o[\s-]*level|a[\s-]*level|igcse|cambridge|edexcel)\b/i.test(subs)
    );
  }

  if (target === 'admission') {
    return /\b(admission|medical|buet|varsity|university|engineering|all)\b/i.test(joined);
  }

  if (classes.length === 0) return false;
  return classes.some((c) => c.toLowerCase().includes(target));
}

export function matchesCurriculumFilter(tutor: any, selectedCurriculum: string): boolean {
  if (!selectedCurriculum || selectedCurriculum === 'All') return true;

  const target = selectedCurriculum.trim().toLowerCase();
  const explicitCur = cleanMeaningfulString(tutor?.curriculum || tutor?.medium).toLowerCase();
  const subjects = parseSubjectsList(tutor?.subjects, tutor?.subject);
  const subjectsJoined = subjects.join(' ').toLowerCase();
  const classesJoined = getTutorClassesList(tutor).join(' ').toLowerCase();

  if (explicitCur) {
    if (target === 'english medium') {
      return (
        explicitCur.includes('english medium') ||
        explicitCur.includes('cambridge') ||
        explicitCur.includes('edexcel')
      );
    }
    return explicitCur.includes(target);
  }

  const hasEnglishVersionMarker =
    /\(ev\)|english\s*version/i.test(subjectsJoined) ||
    /english\s*version/i.test(classesJoined);
  const hasEnglishMediumMarker =
    /\b(o[\s-]*level|a[\s-]*level|cambridge|edexcel|igcse|english\s*medium)\b/i.test(
      `${classesJoined} ${subjectsJoined}`
    );

  if (target === 'english version') {
    return hasEnglishVersionMarker;
  }

  if (target === 'english medium') {
    return hasEnglishMediumMarker;
  }

  if (target === 'bangla medium') {
    // Legacy tutor docs without explicit curriculum typically teach NCTB Bangla Medium
    // unless marked exclusively as English Medium.
    return !hasEnglishMediumMarker || /\b(class\s*\d+|ssc|hsc)\b/i.test(classesJoined);
  }

  return true;
}

export function matchesModeFilter(tutor: any, selectedMode: string): boolean {
  if (!selectedMode || selectedMode === 'All') return true;
  const tutorMode = String(tutor?.teachingMode || tutor?.mode || 'Home & Online').toLowerCase();
  const target = selectedMode.trim().toLowerCase();
  if (target === 'home & online') {
    return (
      tutorMode.includes('home & online') ||
      tutorMode.includes('both') ||
      (tutorMode.includes('home') && tutorMode.includes('online'))
    );
  }
  return (
    tutorMode.includes(target) ||
    tutorMode.includes('both') ||
    tutorMode.includes('home & online')
  );
}

export function matchesBudgetFilter(tutor: any, selectedMaxBudget: string): boolean {
  if (!selectedMaxBudget || selectedMaxBudget === 'All') return true;
  const maxVal = Number(selectedMaxBudget);
  if (!Number.isFinite(maxVal) || maxVal <= 0) return true;
  const rawFee = tutor?.expectedSalary ?? tutor?.hourlyRate ?? 0;
  const tutorSalaryNum = Number(String(rawFee).replace(/[^0-9]/g, ''));
  if (!tutorSalaryNum) return true;
  return tutorSalaryNum <= maxVal;
}

export function matchesAvailabilityFilter(tutor: any, onlyAvailableToday: boolean): boolean {
  if (!onlyAvailableToday) return true;
  return (
    hasConfiguredAvailabilitySlots(tutor?.availabilitySlots) ||
    Boolean(tutor?.availableSlots?.length || tutor?.availability || tutor?.isOnline)
  );
}

export function filterPublicTutors<T extends Record<string, any>>(
  tutors: T[],
  criteria: TutorFilterCriteria = {}
): T[] {
  const {
    searchQuery = '',
    subject = 'All',
    studentClass = 'All',
    district = 'All',
    mode = 'All',
    curriculum = 'All',
    maxBudget = 'All',
    onlyAvailableToday = false,
    tags = [],
    favoriteIds = [],
    favoritesOnly = false,
  } = criteria;

  const queryStr = searchQuery.toLowerCase().trim();

  return tutors.filter((t) => {
    if (!isTutorEligibleForHome(t)) return false;

    if (favoritesOnly && !favoriteIds.includes(t.id)) return false;

    const subjects = parseSubjectsList(t.subjects, t.subject);

    if (queryStr) {
      const teachingAreas = Array.isArray(t.teachingAreas) ? t.teachingAreas : [];
      const searchable = [
        t.name,
        t.university,
        t.course,
        t.district,
        t.thana,
        t.area,
        ...teachingAreas,
        ...subjects,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      if (!searchable.some((v) => v.includes(queryStr))) {
        return false;
      }
    }

    if (subject !== 'All') {
      const subLower = subject.toLowerCase();
      if (!subjects.some((s) => s.toLowerCase().includes(subLower))) {
        return false;
      }
    }

    if (!matchesClassFilter(t, studentClass)) return false;

    if (tags.length > 0) {
      const hasAnyTag = subjects.some((s) =>
        tags.some((tag) => s.toLowerCase().includes(tag.toLowerCase()))
      );
      if (!hasAnyTag) return false;
    }

    if (!matchesDistrictFilter(t, district)) return false;
    if (!matchesModeFilter(t, mode)) return false;
    if (!matchesCurriculumFilter(t, curriculum)) return false;
    if (!matchesBudgetFilter(t, maxBudget)) return false;
    if (!matchesAvailabilityFilter(t, onlyAvailableToday)) return false;

    return true;
  });
}
