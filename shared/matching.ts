import {
  cleanMeaningfulString,
  hasConfiguredAvailabilitySlots,
  parseSubjectsList,
} from './profileCompletion';
import {
  DAYS_OF_WEEK,
  normalizeAvailabilitySlots,
} from './availabilityUtils';
import {
  isTutorVerified,
  matchesClassFilter,
  matchesCurriculumFilter,
  matchesModeFilter,
  normalizeDistrictAlias,
} from './tutorListing';

export interface StudentMatchingNeed {
  subject?: string;
  subjects?: string[];
  studentClass?: string;
  curriculum?: string;
  district?: string;
  thana?: string;
  area?: string;
  mode?: string;
  budget?: number;
  preferredTime?: string;
  preferredDays?: string[];
  genderPreference?: string;
}

export interface TuitionCircularMatchInput {
  id: string;
  title?: string;
  subject?: string;
  studentClass?: string;
  curriculum?: string;
  mode?: string;
  district?: string;
  area?: string;
  salary?: number;
  preferredTime?: string;
  preferredDays?: string[];
  status?: string;
}

export interface ExplainableMatchResult<T> {
  item: T;
  matched: boolean;
  score: number;
  matchedCriteriaCount: number;
  reasons: string[];
}

function tokenizeWords(input: unknown): string[] {
  const cleaned = cleanMeaningfulString(input).toLowerCase();
  if (!cleaned) return [];
  return cleaned
    .split(/[\s,;/|()\-–]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function subjectsMatch(candidateSubjects: string[], targetSubjects: string[]): string[] {
  if (candidateSubjects.length === 0 || targetSubjects.length === 0) return [];
  const matched: string[] = [];
  for (const target of targetSubjects) {
    const tLower = target.toLowerCase();
    const hit = candidateSubjects.find((cs) => {
      const cLower = cs.toLowerCase();
      return cLower === tLower || cLower.includes(tLower) || tLower.includes(cLower);
    });
    if (hit && !matched.some((m) => m.toLowerCase() === hit.toLowerCase())) {
      matched.push(hit);
    }
  }
  return matched;
}

function checkAvailabilityWindowOverlap(
  tutorSlots: Record<string, string[]> | undefined,
  preferredTime?: string,
  preferredDays?: string[]
): boolean {
  if (!hasConfiguredAvailabilitySlots(tutorSlots)) return false;
  const normalized = normalizeAvailabilitySlots(tutorSlots);

  const dayList =
    Array.isArray(preferredDays) && preferredDays.length > 0
      ? preferredDays.map((d) => d.toLowerCase())
      : null;

  const candidateHours: string[] = [];
  for (const day of DAYS_OF_WEEK) {
    if (dayList && !dayList.some((pd) => day.toLowerCase().startsWith(pd.slice(0, 3)))) {
      continue;
    }
    const slots = normalized[day] || [];
    candidateHours.push(...slots);
  }
  if (candidateHours.length === 0) return false;

  const prefLower = cleanMeaningfulString(preferredTime).toLowerCase();
  if (!prefLower || prefLower === 'flexible') return true;

  const hoursNumeric = candidateHours
    .map((h) => Number(h.split(':')[0]))
    .filter((n) => Number.isFinite(n));

  if (prefLower.includes('morning')) {
    return hoursNumeric.some((h) => h >= 8 && h < 12);
  }
  if (prefLower.includes('afternoon')) {
    return hoursNumeric.some((h) => h >= 12 && h < 17);
  }
  if (prefLower.includes('evening') || prefLower.includes('night')) {
    return hoursNumeric.some((h) => h >= 17 && h <= 22);
  }
  return true;
}

function checkLocationOverlap(
  tutor: any,
  targetDistrict?: string,
  targetArea?: string,
  targetThana?: string
): { sameDistrict: boolean; sameArea: boolean; locationLabel: string } {
  const normTargetDist = normalizeDistrictAlias(targetDistrict);
  const normTutorDist = normalizeDistrictAlias(tutor?.district);
  const sameDistrict = Boolean(normTargetDist && normTutorDist && normTargetDist === normTutorDist);

  const tutorAreaTokens = [
    cleanMeaningfulString(tutor?.area),
    cleanMeaningfulString(tutor?.thana),
    ...(Array.isArray(tutor?.teachingAreas)
      ? tutor.teachingAreas.map((a: unknown) => cleanMeaningfulString(a))
      : []),
  ]
    .filter(Boolean)
    .map((a) => a.toLowerCase());

  const targetAreaClean = cleanMeaningfulString(targetArea).toLowerCase();
  const targetThanaClean = cleanMeaningfulString(targetThana).toLowerCase();
  const sameArea = Boolean(
    (targetAreaClean &&
      tutorAreaTokens.some((ta) => ta.includes(targetAreaClean) || targetAreaClean.includes(ta))) ||
      (targetThanaClean &&
        tutorAreaTokens.some((ta) => ta.includes(targetThanaClean) || targetThanaClean.includes(ta)))
  );

  const locationLabel = cleanMeaningfulString(targetArea) || cleanMeaningfulString(tutor?.district);
  return { sameDistrict, sameArea, locationLabel };
}

/**
 * Explains why a verified Tutor matches a Student/Guardian's tuition need.
 * Pure deterministic rules — zero fake percentage scores.
 */
export function evaluateTutorForStudentNeed<T extends Record<string, any>>(
  tutor: T,
  need: StudentMatchingNeed
): ExplainableMatchResult<T> {
  const reasons: string[] = [];
  let score = 0;

  const verified = isTutorVerified(tutor);
  if (verified) {
    score += 1;
  }

  const tutorSubjects = parseSubjectsList(tutor?.subjects, tutor?.subject);
  const needSubjects = parseSubjectsList(need?.subjects, need?.subject);
  const subjectHits = subjectsMatch(tutorSubjects, needSubjects);
  if (subjectHits.length > 0) {
    score += 3;
    reasons.push(`Teaches ${subjectHits.slice(0, 2).join(' & ')}`);
  }

  if (need?.studentClass && matchesClassFilter(tutor, need.studentClass)) {
    score += 2;
    reasons.push(`Covers ${cleanMeaningfulString(need.studentClass)}`);
  } else if (need?.studentClass) {
    const classTokens = tokenizeWords(need.studentClass);
    const tutorClassesJoined = (Array.isArray(tutor?.classes) ? tutor.classes.join(' ') : '').toLowerCase();
    if (classTokens.some((t) => tutorClassesJoined.includes(t))) {
      score += 1.5;
      reasons.push(`Covers ${cleanMeaningfulString(need.studentClass)}`);
    }
  }

  if (need?.curriculum && matchesCurriculumFilter(tutor, need.curriculum)) {
    score += 1;
  }

  const loc = checkLocationOverlap(tutor, need?.district, need?.area, need?.thana);
  const modeClean = cleanMeaningfulString(need?.mode);
  const isOnlineRequested = modeClean.toLowerCase().includes('online');

  if (loc.sameArea && loc.sameDistrict) {
    score += 3;
    reasons.push(`Available in ${loc.locationLabel}, ${tutor.district}`);
  } else if (loc.sameDistrict) {
    score += 2;
    reasons.push(`Located in ${tutor.district}`);
  }

  if (modeClean && matchesModeFilter(tutor, modeClean)) {
    score += 1;
    if (isOnlineRequested && !loc.sameDistrict) {
      reasons.push('Available for Online Tutoring');
    }
  }

  if (
    checkAvailabilityWindowOverlap(
      tutor?.availabilitySlots,
      need?.preferredTime,
      need?.preferredDays
    )
  ) {
    score += 1;
    reasons.push('Matches your preferred schedule');
  }

  const tutorRate = Number(tutor?.hourlyRate || 0);
  const budget = Number(need?.budget || 0);
  if (budget > 0 && tutorRate > 0 && tutorRate <= budget) {
    score += 1.5;
    reasons.push(`Within your monthly budget (৳${tutorRate.toLocaleString('en-IN')})`);
  }

  const genderPref = cleanMeaningfulString(need?.genderPreference).toLowerCase();
  const tutorGender = cleanMeaningfulString(tutor?.gender).toLowerCase();
  if (genderPref && genderPref !== 'any' && tutorGender && genderPref === tutorGender) {
    score += 0.5;
  }

  if (verified && reasons.length < 3) {
    reasons.push('Verified EduTrack Tutor');
  }

  const hasCoreMatch =
    subjectHits.length > 0 || loc.sameDistrict || (isOnlineRequested && matchesModeFilter(tutor, 'Online'));
  const matched = verified && hasCoreMatch && score >= 2.5;

  return {
    item: tutor,
    matched,
    score,
    matchedCriteriaCount: reasons.length,
    reasons: reasons.slice(0, 4),
  };
}

/**
 * Ranks and filters verified tutors against a Student/Guardian's profile or circular criteria.
 */
export function matchTutorsForStudentNeed<T extends Record<string, any>>(
  tutors: T[],
  need: StudentMatchingNeed,
  limit = 6
): ExplainableMatchResult<T>[] {
  return (tutors || [])
    .filter((t) => t && t.role === 'tutor' && isTutorVerified(t) && !t.isBlocked && !t.privacySettings?.hideFromSearch)
    .map((t) => evaluateTutorForStudentNeed(t, need))
    .filter((res) => res.matched)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Explains why an open Tuition Circular matches a Tutor's profile (Subject, Class, Curriculum,
 * District/Area, Mode, Budget, and Weekly Availability).
 */
export function evaluateTuitionForTutor<T extends TuitionCircularMatchInput>(
  tuition: T,
  tutor: Record<string, any>
): ExplainableMatchResult<T> {
  const reasons: string[] = [];
  let score = 0;

  if (!tuition || !tutor) {
    return { item: tuition, matched: false, score: 0, matchedCriteriaCount: 0, reasons: [] };
  }

  const tutorSubjects = parseSubjectsList(tutor?.subjects, tutor?.subject);
  const tuitionSubjects = parseSubjectsList(undefined, tuition.subject);
  const subjectHits = subjectsMatch(tutorSubjects, tuitionSubjects);
  if (subjectHits.length > 0) {
    score += 3;
    reasons.push(`Matches subject: ${subjectHits.slice(0, 2).join(', ')}`);
  }

  if (tuition.studentClass) {
    if (matchesClassFilter(tutor, tuition.studentClass)) {
      score += 2;
      reasons.push(`Matches class: ${tuition.studentClass}`);
    } else {
      const classTokens = tokenizeWords(tuition.studentClass);
      const tutorClassesJoined = (Array.isArray(tutor?.classes) ? tutor.classes.join(' ') : '').toLowerCase();
      if (classTokens.some((t) => tutorClassesJoined.includes(t))) {
        score += 1.5;
        reasons.push(`Matches class: ${tuition.studentClass}`);
      }
    }
  }

  if (tuition.curriculum && matchesCurriculumFilter(tutor, tuition.curriculum)) {
    score += 1;
  }

  const loc = checkLocationOverlap(tutor, tuition.district, tuition.area);
  if (loc.sameArea && loc.sameDistrict) {
    score += 3;
    reasons.push(`Nearby area: ${tuition.area || tuition.district}`);
  } else if (loc.sameDistrict) {
    score += 2;
    reasons.push(`Same district (${tuition.district})`);
  }

  if (tuition.mode && matchesModeFilter(tutor, tuition.mode)) {
    score += 1;
    if (tuition.mode.toLowerCase().includes('online')) {
      reasons.push('Online compatible');
    }
  }

  if (
    checkAvailabilityWindowOverlap(
      tutor?.availabilitySlots,
      tuition.preferredTime,
      tuition.preferredDays
    )
  ) {
    score += 1;
    reasons.push('Fits your weekly availability');
  }

  const tutorExpected = Number(tutor?.hourlyRate || 0);
  const tuitionSalary = Number(tuition.salary || 0);
  if (tutorExpected > 0 && tuitionSalary >= tutorExpected) {
    score += 1.5;
    reasons.push(`Meets expected salary (৳${tuitionSalary.toLocaleString('en-IN')}/mo)`);
  }

  const matched =
    reasons.length > 0 &&
    (subjectHits.length > 0 || loc.sameDistrict || Boolean(tuition.mode?.toLowerCase().includes('online')));

  return {
    item: tuition,
    matched,
    score,
    matchedCriteriaCount: reasons.length,
    reasons: reasons.slice(0, 4),
  };
}

export function matchTuitionsForTutor<T extends TuitionCircularMatchInput>(
  tuitions: T[],
  tutor: Record<string, any> | null | undefined
): ExplainableMatchResult<T>[] {
  if (!tutor || tutor.role !== 'tutor') return [];
  return (tuitions || [])
    .filter((t) => t && t.status === 'active')
    .map((t) => evaluateTuitionForTutor(t, tutor))
    .filter((res) => res.matched)
    .sort((a, b) => b.score - a.score);
}
