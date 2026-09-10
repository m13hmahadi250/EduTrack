import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import SEOHead from '../components/SEOHead';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  BookOpen, 
  DollarSign, 
  Share2, 
  CheckCircle, 
  Briefcase, 
  GraduationCap, 
  Sparkles,
  UserCheck,
  PhoneCall,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TuitionData {
  id: string;
  title: string;
  subject: string;
  studentClass: string;
  district: string;
  area?: string;
  salary?: number;
  daysPerWeek?: number;
  genderPreference?: string;
  requirements?: string;
  status?: string;
  createdAt?: string;
}

// Fallback seed directory data matching sitemap entries
const SEED_DIRECTORY: Record<string, TuitionData> = {
  'tuition-hsc-science-dhanmondi': {
    id: 'tuition-hsc-science-dhanmondi',
    title: 'HSC Science Higher Mathematics & Physics Home Tutor',
    subject: 'Higher Mathematics, Physics',
    studentClass: 'HSC 2nd Year (Science)',
    district: 'Dhaka',
    area: 'Dhanmondi (Near Road 27)',
    salary: 8000,
    daysPerWeek: 3,
    genderPreference: 'Any (BUET / DU Preferred)',
    requirements: 'Strong conceptual background in calculus, vector algebra, electromagnetism, and previous HSC board question solutions.',
    status: 'active',
    createdAt: '2026-08-15'
  },
  'tuition-olevel-pure-math-gulshan': {
    id: 'tuition-olevel-pure-math-gulshan',
    title: 'Cambridge O Level Pure Math & Chemistry Private Tutor',
    subject: 'Pure Mathematics, Chemistry',
    studentClass: 'O Level / Cambridge IGCSE',
    district: 'Dhaka',
    area: 'Gulshan-2',
    salary: 12000,
    daysPerWeek: 4,
    genderPreference: 'Any (English Medium Background)',
    requirements: 'Familiarity with Cambridge CIE syllabus, past papers 1 & 2 problem-solving, and topical revision sheets.',
    status: 'active',
    createdAt: '2026-08-20'
  },
  'tuition-ssc-english-version-ctg': {
    id: 'tuition-ssc-english-version-ctg',
    title: 'SSC Science English Version Home Tutor',
    subject: 'Physics, Chemistry, General Math',
    studentClass: 'SSC Candidate (Class 10)',
    district: 'Chittagong',
    area: 'Panchlaish',
    salary: 7500,
    daysPerWeek: 3,
    genderPreference: 'Any',
    requirements: 'Fluency in English Medium / English Version NCTB curriculum. Thorough chapter tests and weekly revision.',
    status: 'active',
    createdAt: '2026-08-25'
  },
  'tuition-admission-buet-mirpur': {
    id: 'tuition-admission-buet-mirpur',
    title: 'Engineering Admission Test (BUET/CKRUET) Mentor',
    subject: 'Advanced Mathematics, Physics',
    studentClass: 'University Admission Candidate',
    district: 'Dhaka',
    area: 'Mirpur-10',
    salary: 10000,
    daysPerWeek: 3,
    genderPreference: 'Male (BUET Student preferred)',
    requirements: 'Focus on BUET engineering admission question bank solving, shortcut techniques, and test mock examinations.',
    status: 'active',
    createdAt: '2026-08-28'
  },
  'tuition-class8-all-uttara': {
    id: 'tuition-class8-all-uttara',
    title: 'Class 8 General Math, Science & English Tutor',
    subject: 'General Math, Science, English',
    studentClass: 'Class 8',
    district: 'Dhaka',
    area: 'Uttara Sector 4',
    salary: 6000,
    daysPerWeek: 4,
    genderPreference: 'Female tutor preferred',
    requirements: 'Punctual, friendly and patient mentor for daily homework guidance and school term exam preparations.',
    status: 'active',
    createdAt: '2026-08-30'
  },
  'tuition-alevel-physics-sylhet': {
    id: 'tuition-alevel-physics-sylhet',
    title: 'Edexcel A Level Physics & Further Mathematics Tutor',
    subject: 'Physics, Further Mathematics',
    studentClass: 'A Level',
    district: 'Sylhet',
    area: 'Zindabazar',
    salary: 11000,
    daysPerWeek: 3,
    genderPreference: 'Any',
    requirements: 'Expertise in Edexcel mechanics, waves, and past exam solving with thorough topical worksheets.',
    status: 'active',
    createdAt: '2026-09-01'
  }
};

export default function TuitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const [tuition, setTuition] = useState<TuitionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadTuition() {
      if (!id) {
        setLoading(false);
        return;
      }

      // 1. Check seed directory first
      if (SEED_DIRECTORY[id]) {
        setTuition(SEED_DIRECTORY[id]);
        setLoading(false);
        return;
      }

      // 2. Fetch from Firestore (tuitions or tuition_posts)
      try {
        const docRef = doc(db, 'tuitions', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setTuition({
            id: snap.id,
            title: data.title || `${data.subject} Tuition in ${data.district}`,
            subject: data.subject || 'Academic Subjects',
            studentClass: data.studentClass || 'Standard Class',
            district: data.district || 'Dhaka',
            area: data.area,
            salary: data.salary,
            daysPerWeek: data.daysPerWeek,
            genderPreference: data.genderPreference,
            requirements: data.requirements || data.notes,
            status: data.status || 'active',
            createdAt: data.createdAt
          });
          setLoading(false);
          return;
        }

        // Secondary fallback to tuition_posts
        const postRef = doc(db, 'tuition_posts', id);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const data = postSnap.data();
          setTuition({
            id: postSnap.id,
            title: data.title || `${data.subject} Tuition in ${data.district}`,
            subject: data.subject || 'Academic Subjects',
            studentClass: data.studentClass || 'Standard Class',
            district: data.district || 'Dhaka',
            area: data.area,
            salary: data.salary,
            daysPerWeek: data.daysPerWeek,
            genderPreference: data.genderPreference,
            requirements: data.requirements || data.notes,
            status: data.status || 'active',
            createdAt: data.createdAt
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Error fetching tuition document:', err);
      }

      // Fallback dynamic generator from ID if not found in db
      const formattedTitle = id
        .replace(/^tuition-/, '')
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      setTuition({
        id,
        title: `${formattedTitle} Tuition Circular`,
        subject: 'Academic Curriculums',
        studentClass: 'School & College',
        district: 'Dhaka',
        salary: 7000,
        daysPerWeek: 3,
        status: 'active',
        requirements: 'Verified tutor needed with background in relevant curriculum.'
      });
      setLoading(false);
    }

    loadTuition();
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApply = () => {
    if (!currentUser) {
      navigate('/signup?role=tutor');
    } else if (currentUser.role === 'tutor') {
      navigate('/dashboard/tutor');
    } else {
      navigate('/dashboard/student');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B132B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0D5BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Tuition Circular...</p>
        </div>
      </div>
    );
  }

  if (!tuition) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B132B] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase mb-2">Tuition Circular Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">This tuition circular may have already been filled or updated.</p>
        <Link to="/" className="px-6 py-2.5 rounded-xl bg-[#0D5BFF] text-white text-xs font-black uppercase">
          Browse All Tutors & Jobs
        </Link>
      </div>
    );
  }

  const seoTitle = `${tuition.title} in ${tuition.district} (${tuition.salary ? `${tuition.salary} BDT/mo` : 'Negotiable'}) | EduTrack Bangladesh`;
  const seoDescription = `Tuition Job in ${tuition.district}: ${tuition.title} for ${tuition.studentClass}. Subjects: ${tuition.subject}. Days: ${tuition.daysPerWeek || 3} days/week. Apply as a verified home tutor on EduTrack BD.`;
  const seoKeywords = `${tuition.title}, tuition in ${tuition.district}, home tutor wanted ${tuition.district}, ${tuition.subject} tutor bd, ssc hsc tuition circular, edutrack tuition jobs`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://edutrackbd.vercel.app/" },
          { "@type": "ListItem", "position": 2, "name": "Tuitions", "item": "https://edutrackbd.vercel.app/#curriculums" },
          { "@type": "ListItem", "position": 3, "name": tuition.title, "item": `https://edutrackbd.vercel.app/tuitions/${tuition.id}` }
        ]
      },
      {
        "@type": "JobPosting",
        "title": tuition.title,
        "description": seoDescription,
        "identifier": {
          "@type": "PropertyValue",
          "name": "EduTrack Bangladesh",
          "value": tuition.id
        },
        "datePosted": tuition.createdAt || "2026-08-20",
        "validThrough": "2026-12-31",
        "employmentType": "PART_TIME",
        "hiringOrganization": {
          "@type": "Organization",
          "name": "EduTrack Bangladesh",
          "sameAs": "https://edutrackbd.vercel.app",
          "logo": "https://edutrackbd.vercel.app/og-image.png"
        },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": tuition.area || tuition.district,
            "addressRegion": tuition.district,
            "addressCountry": "BD"
          }
        },
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "BDT",
          "value": {
            "@type": "QuantitativeValue",
            "value": tuition.salary || 8000,
            "unitText": "MONTH"
          }
        }
      }
    ]
  };

  return (
    <div className="bg-[#F8F9FA] dark:bg-[#0B132B] text-[#0B132B] dark:text-slate-100 font-sans min-h-screen pb-24 selection:bg-[#0D5BFF] selection:text-white">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={`https://edutrackbd.vercel.app/tuitions/${tuition.id}`}
        ogImage="https://edutrackbd.vercel.app/og-image.png"
        ogType="website"
        jsonLd={jsonLd}
      />

      {/* Top Banner Navigation */}
      <div className="bg-white dark:bg-[#111A2E] border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Directory</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied' : 'Share Job'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Verification & Category Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Tuition Circular</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{tuition.district} Division</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
            <span>Job ID: {tuition.id}</span>
          </div>
        </div>

        {/* Title Header */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic tracking-tight mb-4">
          {tuition.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0D5BFF]" />
            <span>{tuition.area ? `${tuition.area}, ` : ''}{tuition.district}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            <span>{tuition.studentClass}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>{tuition.subject}</span>
          </div>
        </div>

        {/* Key Metrics Bento Grid */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          
          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Monthly Remuneration</p>
                <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                  {tuition.salary ? `${tuition.salary.toLocaleString()} BDT` : 'Negotiable'}
                </h3>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">Paid securely via bKash / Bank</p>
          </div>

          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Weekly Schedule</p>
                <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                  {tuition.daysPerWeek || 3} Days / Week
                </h3>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">Flexible timings discussed directly</p>
          </div>

          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tutor Preference</p>
                <h3 className="text-base font-black text-[#0B132B] dark:text-white truncate">
                  {tuition.genderPreference || 'Any Qualified Tutor'}
                </h3>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">NID & Student ID verification required</p>
          </div>

        </div>

        {/* Detailed Description & Curriculum Specifications */}
        <div className="bg-white dark:bg-[#111A2E] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800/80 shadow-sm mb-8 space-y-6">
          <div>
            <h2 className="text-base font-black text-[#0B132B] dark:text-white uppercase tracking-tight flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-[#0D5BFF]" />
              <span>Job Requirements & Academic Scope</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {tuition.requirements || 'The student requires consistent, structured academic mentorship in the specified subjects. Regular syllabus tracking, conceptual lectures, homework review, and weekly evaluations will be logged in the EduTrack verified session log.'}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Included Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {tuition.subject.split(',').map((subj, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-[#0B132B] dark:text-white border border-slate-100 dark:border-slate-700/60"
                >
                  {subj.trim()}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-[#0B132B] dark:text-white">EduTrack Zero-Harassment Safety</p>
                <p className="text-[10px] font-medium text-slate-400">All contact info and location transit logs are securely encrypted.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0D5BFF] hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              Apply as Tutor →
            </button>
          </div>
        </div>

        {/* Student/Parent Notice */}
        <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/40 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-[#0B132B] dark:text-white uppercase">Looking for a tutor for your own child?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Create a free student profile and choose verified tutors from BUET, DU, Medical, and English Medium backgrounds.
            </p>
          </div>
          <Link
            to="/signup?role=student"
            className="shrink-0 px-6 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] text-[#0D5BFF] dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-black uppercase tracking-wider hover:shadow transition-all"
          >
            Post Tuition Free
          </Link>
        </div>

      </main>
    </div>
  );
}
