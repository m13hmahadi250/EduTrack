import { 
  Trophy, 
  GraduationCap, 
  Star, 
  Clock, 
  ShieldCheck, 
  CheckCircle, 
  Flame, 
  BookOpen, 
  Heart,
  Users
} from 'lucide-react';
import { User, Session } from '../store';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: any;
  colorClass: string; // e.g. "bg-amber-500 text-white"
  borderColorClass: string; // e.g. "border-amber-200 dark:border-amber-900/30"
  bgLightClass: string; // e.g. "bg-amber-50 dark:bg-amber-950/20"
  iconColorClass: string; // e.g. "text-amber-500"
  role: 'student' | 'tutor' | 'all';
}

export const BADGE_DEFINITIONS: { [id: string]: BadgeDefinition } = {
  // Student Badges
  pioneer_mentee: {
    id: 'pioneer_mentee',
    title: 'Pioneer Mentee',
    description: 'Completed your 1st session. Your educational journey with EduTrack has officially begun!',
    icon: BookOpen,
    colorClass: 'bg-indigo-500 text-white',
    borderColorClass: 'border-indigo-100 dark:border-indigo-900/30',
    bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/20',
    iconColorClass: 'text-indigo-500',
    role: 'student'
  },
  consistent_learner: {
    id: 'consistent_learner',
    title: 'Consistent Learner',
    description: 'Completed 5+ sessions. Consistency is the golden key to deep academic mastery!',
    icon: Flame,
    colorClass: 'bg-orange-500 text-white',
    borderColorClass: 'border-orange-100 dark:border-orange-900/30',
    bgLightClass: 'bg-orange-50 dark:bg-orange-950/20',
    iconColorClass: 'text-orange-500',
    role: 'student'
  },
  dedicated_scholar: {
    id: 'dedicated_scholar',
    title: 'Dedicated Scholar',
    description: 'Completed 15+ hours of tutoring sessions. Highly committed to stellar results!',
    icon: GraduationCap,
    colorClass: 'bg-blue-500 text-white',
    borderColorClass: 'border-blue-100 dark:border-blue-900/30',
    bgLightClass: 'bg-blue-50 dark:bg-blue-950/20',
    iconColorClass: 'text-blue-500',
    role: 'student'
  },
  feedback_champion: {
    id: 'feedback_champion',
    title: 'Feedback Champion',
    description: 'Submitted 3+ helpful session ratings, fostering quality benchmarks on the platform.',
    icon: Heart,
    colorClass: 'bg-rose-500 text-white',
    borderColorClass: 'border-rose-100 dark:border-rose-900/30',
    bgLightClass: 'bg-rose-50 dark:bg-rose-950/20',
    iconColorClass: 'text-rose-500',
    role: 'student'
  },

  // Tutor Badges
  pioneer_tutor: {
    id: 'pioneer_tutor',
    title: 'Pioneer Mentor',
    description: 'Completed your 1st session. Welcome to the EduTrack certified educators league!',
    icon: CheckCircle,
    colorClass: 'bg-cyan-500 text-white',
    borderColorClass: 'border-cyan-100 dark:border-cyan-900/30',
    bgLightClass: 'bg-cyan-50 dark:bg-cyan-950/20',
    iconColorClass: 'text-cyan-500',
    role: 'tutor'
  },
  top_rated_educator: {
    id: 'top_rated_educator',
    title: 'Top Rated Educator',
    description: 'Maintained a stellar 4.8+ star rating with at least 3 reviews. Student-approved favorite!',
    icon: Star,
    colorClass: 'bg-amber-500 text-white',
    borderColorClass: 'border-amber-100 dark:border-amber-900/30',
    bgLightClass: 'bg-amber-50 dark:bg-amber-950/20',
    iconColorClass: 'text-amber-500',
    role: 'tutor'
  },
  elite_educator: {
    id: 'elite_educator',
    title: 'Elite Educator',
    description: 'Successfully delivered 20+ completed sessions. Shaping the future one hour at a time!',
    icon: Trophy,
    colorClass: 'bg-violet-500 text-white',
    borderColorClass: 'border-violet-100 dark:border-violet-900/30',
    bgLightClass: 'bg-violet-50 dark:bg-violet-950/20',
    iconColorClass: 'text-violet-500',
    role: 'tutor'
  },
  hundred_hours_tutored: {
    id: 'hundred_hours_tutored',
    title: '100 Hours Tutored',
    description: 'Completed 100+ hours of tuition. A true structural pillar of academic mentorship!',
    icon: Clock,
    colorClass: 'bg-emerald-500 text-white',
    borderColorClass: 'border-emerald-100 dark:border-emerald-900/30',
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/20',
    iconColorClass: 'text-emerald-500',
    role: 'tutor'
  },
  verified_mentor: {
    id: 'verified_mentor',
    title: 'Verified Mentor',
    description: 'NID identity credentials thoroughly audited and verified by our system administration.',
    icon: ShieldCheck,
    colorClass: 'bg-teal-500 text-white',
    borderColorClass: 'border-teal-100 dark:border-teal-900/30',
    bgLightClass: 'bg-teal-50 dark:bg-teal-950/20',
    iconColorClass: 'text-teal-500',
    role: 'tutor'
  },

  // Shared Badges
  super_connector: {
    id: 'super_connector',
    title: 'Super Connector',
    description: 'Invited colleagues and unlocked significant ecosystem milestones via referral.',
    icon: Users,
    colorClass: 'bg-fuchsia-500 text-white',
    borderColorClass: 'border-fuchsia-100 dark:border-fuchsia-900/30',
    bgLightClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/20',
    iconColorClass: 'text-fuchsia-500',
    role: 'all'
  }
};

/**
 * Dynamically computes which badges a user has earned based on their profile data and sessions.
 */
export function calculateEarnedBadges(user: User, sessions: Session[]): string[] {
  const earned: string[] = [];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  
  if (user.role === 'student') {
    // 1. Pioneer Mentee (at least 1 completed session)
    if (completedSessions.length >= 1) {
      earned.push('pioneer_mentee');
    }
    
    // 2. Consistent Learner (at least 5 completed sessions)
    if (completedSessions.length >= 5) {
      earned.push('consistent_learner');
    }
    
    // 3. Dedicated Scholar (at least 15 hours of tuition sessions)
    // duration might be stored in minutes or hours. Let's assume duration is in hours,
    // if duration > 100, it's minutes. Let's do a safe conversion.
    const totalHours = completedSessions.reduce((acc, s) => {
      const dur = s.duration || 1; // fallback to 1 hour
      // if dur is large (e.g. 60, 90, 120), it's probably minutes
      return acc + (dur >= 30 ? dur / 60 : dur);
    }, 0);
    
    if (totalHours >= 15) {
      earned.push('dedicated_scholar');
    }
    
    // 4. Feedback Champion (submitted 3+ reviews and ratings)
    const ratedSessionsCount = completedSessions.filter(s => s.rating !== undefined && s.rating > 0).length;
    if (ratedSessionsCount >= 3) {
      earned.push('feedback_champion');
    }

    // 5. Super Connector (invited colleagues/friends)
    if ((user.referralPoints || 0) >= 30 || (user.serviceDiscounts || 0) >= 150) {
      earned.push('super_connector');
    }
  } else if (user.role === 'tutor') {
    // 1. Pioneer Tutor (at least 1 completed session)
    if (completedSessions.length >= 1) {
      earned.push('pioneer_tutor');
    }
    
    // 2. Top Rated Educator (average rating >= 4.8 and at least 3 ratings)
    const tutorRating = user.rating || 0;
    const totalRatings = user.totalRatings || 0;
    if (tutorRating >= 4.8 && totalRatings >= 3) {
      earned.push('top_rated_educator');
    }
    
    // 3. Elite Educator (delivered 20+ completed sessions)
    if (completedSessions.length >= 20) {
      earned.push('elite_educator');
    }
    
    // 4. 100 Hours Tutored (100+ hours of tutoring)
    const totalHours = completedSessions.reduce((acc, s) => {
      const dur = s.duration || 1;
      return acc + (dur >= 30 ? dur / 60 : dur);
    }, 0);
    if (totalHours >= 100) {
      earned.push('hundred_hours_tutored');
    }
    
    // 5. Verified Mentor (isVerified is true)
    if (user.isVerified) {
      earned.push('verified_mentor');
    }

    // 6. Super Connector (referred 3+ people / has referral points)
    if ((user.referralPoints || 0) >= 15) {
      earned.push('super_connector');
    }
  }
  
  return earned;
}
