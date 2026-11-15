import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import BadgeDisplay from '../components/BadgeDisplay';
import TutorNotifyMeCard from '../components/TutorNotifyMeCard';
import SEOHead from '../components/SEOHead';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Star, 
  CheckCircle, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  BookOpen, 
  Award, 
  Lock, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Briefcase,
  DollarSign,
  Share2
} from 'lucide-react';
import { motion } from 'motion/react';

// Help helper to mask phone
const maskPhone = (phone?: string) => {
  if (!phone) return 'Not Configured';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 5) return '***-***';
  return clean.substring(0, 3) + '******' + clean.substring(clean.length - 2);
};

// Help helper to mask email
const maskEmail = (email?: string) => {
  if (!email) return 'Not Provided';
  const parts = email.split('@');
  if (parts.length !== 2) return '******@***.com';
  const [username, domain] = parts;
  if (username.length <= 2) return `${username[0]}*****@${domain}`;
  return `${username.substring(0, 2)}*****${username.substring(username.length - 1)}@${domain}`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 15,
    }
  }
};

export default function TeacherProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);
  
  const [tutor, setTutor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Check if current reader is a verified student
  // Active/valid student means roles includes 'student' (or we check if currentUser exists and is any student role)
  const isVerifiedStudent = currentUser && (currentUser.role === 'student' || currentUser.role === 'admin');

  // Students can NEVER see actual phone/email. Only Admins or the Tutor themselves can see unmasked credentials.
  const canSeeContactInfo = currentUser && (currentUser.role === 'admin' || currentUser.id === id);

  useEffect(() => {
    let active = true;
    const fetchReviews = async () => {
      if (!id) return;
      setReviewsLoading(true);
      try {
        const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        // Fetch sessions where tutorId === id
        const q = query(
          collection(db, 'sessions'),
          where('tutorId', '==', id)
        );
        const querySnapshot = await getDocs(q);
        const ratedSessions: any[] = [];
        
        for (const docSnap of querySnapshot.docs) {
          const sData = docSnap.data();
          if (sData.rating && sData.rating > 0) {
            ratedSessions.push({
              id: docSnap.id,
              ...sData
            });
          }
        }

        // Fetch student user details for each rated session
        const reviewsWithDetails = await Promise.all(
          ratedSessions.map(async (sess) => {
            let studentName = 'Verified Student';
            let studentImage = undefined;
            try {
              const studentRef = doc(db, 'users', sess.studentId);
              const studentSnap = await getDoc(studentRef);
              if (studentSnap.exists()) {
                const sUserData = studentSnap.data();
                studentName = sUserData.name || 'Verified Student';
                studentImage = sUserData.profileImage;
              }
            } catch (err) {
              console.error("Error fetching student info for review:", err);
            }
            return {
              ...sess,
              studentName,
              studentImage
            };
          })
        );

        if (active) {
          setReviews(reviewsWithDetails);
          setReviewsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching reviews: ", error);
        if (active) {
          setReviewsLoading(false);
        }
      }
    };

    fetchReviews();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    const fetchTutorDetails = async () => {
      if (!id) return;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (active) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.role === 'tutor') {
              const isViewerAdminOrSelf =
                currentUser?.role === 'admin' || currentUser?.id === docSnap.id;
              const sanitizedData = isViewerAdminOrSelf
                ? data
                : {
                    ...data,
                    nidNumber: undefined,
                    nidFrontImg: undefined,
                    nidBackImg: undefined,
                    documents: undefined,
                    balance: undefined,
                    fcmToken: undefined,
                    password: undefined,
                  };
              setTutor({ id: docSnap.id, ...sanitizedData });
            } else {
              setTutor(null);
            }
          } else {
            setTutor(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error reading tutor document: ", error);
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchTutorDetails();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (tutor) {
      document.title = `${tutor.name} | Home Tutor from ${tutor.university || 'Expert Academy'} - EduTrack`;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute('content', `Book home tution with ${tutor.name} (${tutor.course || 'Expert Mentor'}). Specializing in ${tutor.subjects?.join(', ') || 'academic core coaching'} in ${tutor.area || 'Dhaka'}, Bangladesh. Rated ${Number(tutor.rating || 5.0).toFixed(1)}/5.`);
      }
    }
  }, [tutor]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareProfile = async () => {
    const shareData = {
      title: `${tutor?.name || 'Expert Tutor'} | EduTrack`,
      text: `Connect with NID-verified tutor ${tutor?.name || 'Academic Mentor'} from ${tutor?.university || 'Expert institution'} on EduTrack Bangladesh.`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        copyToClipboard(window.location.href, 'profile');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        copyToClipboard(window.location.href, 'profile');
      }
    }
  };

  const initDirectChat = () => {
    if (!currentUser) {
      navigate(`/login?redirect=${encodeURIComponent(`/messages?tId=${tutor?.id}`)}`);
      return;
    }
    // Verified students can start direct chats or apply session requests. Redirect them to global contact stream.
    navigate(`/messages?tId=${tutor?.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B132B] flex items-center justify-center p-6" id="loading-profile-stage">
        <div className="text-center">
          <div className="w-16 h-16 border-[6px] border-[#0D5BFF]/10 border-t-[#0D5BFF] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white/80">Syncing Credentials Ledger...</p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B132B] flex items-center justify-center p-6 text-center" id="missing-profile-stage">
        <div className="max-w-md w-full bg-white dark:bg-[#111A2E] p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto border border-rose-100 dark:border-rose-900/60">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-[#0B132B] dark:text-white mb-2">Mentor Not Found</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed uppercase">
              The user account specified is either blocked, does not exist, or does not maintain a verified tutor ledger.
            </p>
          </div>
          <Link to="/" className="inline-block px-8 py-4 bg-[#0D5BFF] text-white font-black text-[10px] uppercase tracking-wider rounded-2xl hover:bg-blue-600 transition-all shadow-md">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Use real ratings from sessions if available, otherwise fall back to user profile stats
  const displayRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length) 
    : (tutor?.rating || 5.0);
  const displayTotalReviews = reviews.length > 0 
    ? reviews.length 
    : (tutor?.totalRatings || 0);

  const seoTitle = `${tutor.name} - Verified ${tutor.university || 'Home'} Tutor in ${tutor.district || tutor.area || 'Bangladesh'} | EduTrack`;
  const seoDescription = `Hire ${tutor.name} (${tutor.course || 'Expert Mentor'}) from ${tutor.university || 'top institutions'}. Subjects: ${tutor.subjects?.join(', ') || 'Academic Curriculums'}. NID verified with ${displayRating.toFixed(1)}/5 rating on EduTrack Bangladesh.`;
  const seoKeywords = `${tutor.name}, home tutor ${tutor.district || 'dhaka'}, ${tutor.university || 'tutor'}, ${tutor.subjects?.join(', ') || 'tuition'}, ssc hsc tutor, private tutor bangladesh, ${tutor.area || 'dhaka'}`;

  const tutorJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `https://edutrackbd.vercel.app/teachers/${tutor.id}#webpage`,
        "url": `https://edutrackbd.vercel.app/teachers/${tutor.id}`,
        "name": `${tutor.name} - Verified Tutor Profile`,
        "description": seoDescription,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://edutrackbd.vercel.app/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Tutors",
              "item": "https://edutrackbd.vercel.app/#tutors"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": tutor.name,
              "item": `https://edutrackbd.vercel.app/teachers/${tutor.id}`
            }
          ]
        },
        "mainEntity": {
          "@id": `https://edutrackbd.vercel.app/teachers/${tutor.id}#person`
        }
      },
      {
        "@type": "Person",
        "@id": `https://edutrackbd.vercel.app/teachers/${tutor.id}#person`,
        "name": tutor.name,
        "jobTitle": "Academic Tutor & Educator",
        "description": tutor.bio || seoDescription,
        "image": tutor.profileImage || "https://edutrackbd.vercel.app/og-image.png",
        "url": `https://edutrackbd.vercel.app/teachers/${tutor.id}`,
        "alumniOf": {
          "@type": "EducationalOrganization",
          "name": tutor.university || "Bangladesh University"
        },
        "address": {
          "@type": "PostalAddress",
          "addressLocality": tutor.area || "Dhaka",
          "addressRegion": tutor.district || "Dhaka",
          "addressCountry": "BD"
        },
        "knowsAbout": tutor.subjects || ["Mathematics", "Science", "English"],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": Number(displayRating).toFixed(1),
          "reviewCount": Math.max(displayTotalReviews, 1).toString(),
          "bestRating": "5",
          "worstRating": "1"
        }
      }
    ]
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-[#F8F9FA] dark:bg-[#0B132B] text-[#0B132B] dark:text-slate-100 font-sans min-h-screen pb-24 selection:bg-[#0D5BFF] selection:text-white" 
      id={`teacher-profile-root-${tutor.id}`}
    >
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={`https://edutrackbd.vercel.app/teachers/${tutor.id}`}
        ogImage={tutor.profileImage || "https://edutrackbd.vercel.app/og-image.png"}
        ogType="profile"
        jsonLd={tutorJsonLd}
      />
      
      {/* Top Banner & Navigation */}
      <div className="bg-white dark:bg-[#111A2E] border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-45 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-600 dark:text-slate-300 hover:text-[#0D5BFF] transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>EduTrack Directory</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={shareProfile}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              id="share-profile-header-btn"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0D5BFF]" />
              <span>{copied === 'profile' ? 'Link Copied!' : 'Share Profile'}</span>
            </button>
            <div className="px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-[#0D5BFF] border border-blue-100 dark:border-blue-900/30">
              {tutor.isVerified ? "🔒 Verified Ledger Verified" : "📜 Public Listing"}
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-4 mt-8"
      >
        
        {/* Immersive Singular Profile Banner */}
        <motion.div 
          variants={cardVariants}
          className="relative bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-[2.5rem] overflow-hidden shadow-2xl p-6 md:p-10 mb-8 border border-white/10 flex flex-col md:flex-row items-center gap-6 justify-between select-none"
        >
          
          {/* Subtle Ambient Backdrop Image (Deeply Blurred) */}
          {tutor.profileImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 pointer-events-none scale-110" 
              style={{ backgroundImage: `url(${tutor.profileImage})` }}
            />
          )}

          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#0D5BFF_1.5px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="absolute right-1/4 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full">
            
            {/* Profile Avatar inside the Banner (Clean frame with soft drop glow behind) */}
            <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-3xl bg-white/10 p-1.5 backdrop-blur-md shadow-2xl shrink-0 border border-white/20">
              
              {/* Outer soft glowing blur backdrop for the photo frame */}
              {tutor.profileImage && (
                <div 
                  className="absolute inset-1.5 rounded-2xl bg-cover bg-center blur-md opacity-60 pointer-events-none scale-105" 
                  style={{ backgroundImage: `url(${tutor.profileImage})` }}
                />
              )}

              {/* Precise profile photo container */}
              <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-900 border border-white/10 z-10">
                {tutor.profileImage ? (
                  <img 
                    src={tutor.profileImage} 
                    alt={tutor.name} 
                    className={`w-full h-full object-cover transition-all duration-300 ${!isVerifiedStudent ? 'blur-lg select-none pointer-events-none' : 'blur-none'}`} 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0D5BFF] to-blue-500 flex items-center justify-center text-white font-black italic text-4xl">
                    {tutor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Verification checkmark icon layer */}
              {tutor.isVerified && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-xl p-1.5 shadow-lg shadow-emerald-500/30 border-2 border-[#1E293B] z-20">
                  <ShieldCheck className="w-3.5 h-3.5 text-white fill-white/10" />
                </div>
              )}
            </div>

            {/* Title / Teacher Name Group perfectly inside and high visibility */}
            <div className="flex-grow space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight italic text-white drop-shadow-md">
                  {tutor.name}
                </h1>
                {tutor.isVerified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                    ID Verified
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 font-extrabold">{tutor.university || 'Certified Academic Mentor'}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-200">{tutor.course || 'Expert Department'}</span>
              </p>
            </div>

            {/* Stars Rating right inside the banner */}
            <div className="md:self-center shrink-0">
              <div className="bg-[#0F172A]/70 backdrop-blur-md border border-white/10 px-5 py-3.5 rounded-3xl flex items-center gap-3 shadow-md justify-center text-white">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <div className="text-left">
                  <div className="text-sm font-black tracking-tight">{displayTotalReviews > 0 ? Number(displayRating).toFixed(1) : 'New'}</div>
                  <div className="text-[9px] text-slate-300 font-bold uppercase tracking-wider block">({displayTotalReviews} {displayTotalReviews === 1 ? 'Review' : 'Reviews'})</div>
                </div>
              </div>
            </div>

          </div>

        </motion.div>

        {/* Outer details split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 md:pt-12">
          
          {/* Main Info Column (Left 8 columns on large screens) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Segment: Overview Bio */}
            <motion.div 
              variants={cardVariants}
              className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-4 transition-colors"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0D5BFF]" />
                <span>Biography & Vision</span>
              </h3>
              <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 italic leading-relaxed font-medium">
                "{tutor.bio || `${tutor.name} is a highly regarded member of the EduTrack mentorship platform, having dedicated extensive study parameters and practical teaching methodology to secure outstanding student results.`}"
              </p>
              
              {tutor.experience && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Experience Level</span>
                    <span className="text-xs font-black text-[#0B132B] dark:text-white uppercase">{tutor.experience}</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Segment: Achievements & Badges */}
            <motion.div 
              variants={cardVariants}
              className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-4 transition-colors"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>Verified Milestones & Badges</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                These gamified credentials verify live milestones, tutor ratings, and dedicated hours delivered securely on the platform.
              </p>
              <BadgeDisplay badgeIds={tutor.badges || []} role="tutor" />
            </motion.div>

            {/* Segment: Class & Subject expertise parameters */}
            <motion.div 
              variants={cardVariants}
              className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0D5BFF]" />
                <span>Expertise Settings</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Subjects */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Subjects Certified</span>
                  <div className="flex flex-wrap gap-2">
                    {tutor.subjects && tutor.subjects.length > 0 ? (
                      tutor.subjects.map((s: string, idx: number) => (
                        <span key={idx} className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-[#0D5BFF] dark:text-blue-300 text-[10px] font-black uppercase rounded-xl border border-blue-100/50 dark:border-blue-900/30 tracking-wider">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-300 uppercase font-bold italic">See bio for subjects</span>
                    )}
                  </div>
                </div>

                {/* Grade Classes */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Classes Offered</span>
                  <div className="flex flex-wrap gap-2">
                    {tutor.classes && tutor.classes.length > 0 ? (
                      tutor.classes.map((c: string, idx: number) => (
                        <span key={idx} className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-300 text-[10px] font-black uppercase rounded-xl border border-purple-100/50 dark:border-purple-900/30 tracking-wider">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-300 uppercase font-bold italic">All General Grades</span>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>

            {/* Segment: Availability Slots */}
            <motion.div 
              variants={cardVariants}
              className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0D5BFF]" />
                <span>Availability and Schedules</span>
              </h3>
              
              <div className="bg-slate-50 dark:bg-[#0B132B]/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider leading-relaxed">
                  These represent the standard weekly time slots configured by {tutor.name}. Exact durations are customized upon conversation.
                </p>

                {tutor.availabilitySlots && Object.keys(tutor.availabilitySlots).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(tutor.availabilitySlots).map(([day, slots]: [string, any]) => (
                      <div key={day} className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white">{day}</span>
                        <div className="text-right space-y-1">
                          {slots.map((slot: string, sIdx: number) => (
                            <span key={sIdx} className="inline-block bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold uppercase italic">No rigid slots configured. Flexible scheduling available.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Segment: Reviews & Testimonials */}
            <motion.div 
              variants={cardVariants}
              className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <Star className="w-4 h-4 text-[#0D5BFF] fill-[#0D5BFF]/10" />
                <span>Reviews & Testimonials</span>
                {reviews.length > 0 && (
                  <span className="ml-auto bg-blue-50 dark:bg-blue-950 text-[#0D5BFF] dark:text-blue-300 text-xs font-black px-2.5 py-1 rounded-xl">
                    {reviews.length} Total
                  </span>
                )}
              </h3>

              {reviewsLoading ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-6 h-6 border-2 border-[#0D5BFF] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest">Loading testimonials ledger...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="p-5 rounded-3xl bg-slate-50 dark:bg-[#0B132B]/40 border border-slate-100 dark:border-slate-800/60 space-y-3.5 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Student Author */}
                        <div className="flex items-center gap-3">
                          {rev.studentImage ? (
                            <img 
                              src={rev.studentImage} 
                              alt={rev.studentName} 
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-[#0D5BFF] dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase italic">
                              {rev.studentName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-black text-[#0B132B] dark:text-white uppercase italic">{rev.studentName}</h4>
                            {rev.subject && (
                              <span className="text-[9px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                                Class Focus: {rev.subject}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stars Indicator */}
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, starIdx) => (
                            <Star 
                              key={starIdx} 
                              className={`w-3.5 h-3.5 ${
                                starIdx < rev.rating 
                                  ? 'text-amber-500 fill-amber-500' 
                                  : 'text-slate-300 dark:text-slate-700'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>

                      {/* Review Feedback Text */}
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic font-medium">
                        "{rev.feedback || 'The student left a five-star rating with no text commentary.'}"
                      </p>

                      {/* Session Date */}
                      {rev.scheduledTime && (
                        <div className="text-[8px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Session Delivered: {new Date(rev.scheduledTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 dark:bg-[#0B132B]/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80">
                  <Star className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider">No student ratings logged yet</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium mt-1 uppercase tracking-widest">Delivered tuition sessions will appear here after rating submission.</p>
                </div>
              )}
            </motion.div>

          </div>

          {/* Sidebar Area Card (Right 4 columns) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Financials card */}
            <motion.div 
              variants={cardVariants}
              className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors"
            >
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Standard Remuneration</span>
              
              <div className="flex items-baseline gap-1 text-[#0B132B] dark:text-white">
                <span className="text-2xl font-bold">৳</span>
                <span className="text-5xl font-black italic">{(tutor.hourlyRate || 800).toLocaleString()}</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider ml-1">/ Month</span>
              </div>

              <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  <span>Days per Week</span>
                  <span className="font-mono text-[#0B132B] dark:text-white font-black">{tutor.daysPerWeek || 3} Days</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  <span>Service Zone</span>
                  <span className="text-[#0B132B] dark:text-white font-black flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0D5BFF]" />
                    {tutor.area || 'Dhanmondi'}, {tutor.district || 'Dhaka'}
                  </span>
                </div>
                {tutor.thana && (
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    <span>Thana Sector</span>
                    <span className="text-slate-700 dark:text-slate-200 font-black">{tutor.thana}</span>
                  </div>
                )}
                
                {/* Embedded dynamic share action */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={shareProfile}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-[#0D5BFF] dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-2xl border border-slate-200/60 dark:border-slate-800/80 transition-all cursor-pointer shadow-sm active:scale-95"
                    id="share-profile-financials-btn"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copied === 'profile' ? 'Link Copied to Clipboard!' : 'Share Teacher Profile'}</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* 30-Minute Class Push Alert Subscription Card */}
            <TutorNotifyMeCard 
              tutor={tutor} 
              onRequireAuth={() => navigate(`/login?redirect=${encodeURIComponent(`/teacher/${tutor.id}`)}`)} 
            />

            {/* Direct Contact Ledger - Security Lockdown Zone */}
            <div className={`rounded-[2.5rem] p-6 border-2 transition-all overflow-hidden relative shadow-xl ${
              !currentUser 
                ? 'bg-blue-50/10 border-[#0D5BFF]/15 dark:bg-blue-950/5 dark:border-blue-900/20'
                : canSeeContactInfo
                  ? 'bg-emerald-50/10 border-emerald-500/25 dark:bg-emerald-950/5 dark:border-emerald-500/15'
                  : 'bg-[#0D5BFF]/5 border-[#0D5BFF]/20 dark:bg-blue-950/5 dark:border-blue-900/20'
            }`}>
              
              {!currentUser ? (
                // Lock screen: Guest cannot view.
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] border border-blue-100 dark:border-blue-900/30">
                      <Lock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white">Credentials Locked</h4>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-0.5">PUBLIC SAFETY PROTOCOL</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                    Direct communication ledgers and unmasked credentials remain protected. Only verified students or designated system administrators may interact or view them.
                  </p>

                  <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-3xl space-y-3.5 border border-slate-200/50 dark:border-slate-800/80">
                    <div>
                      <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Verify E-Mail Node</span>
                      <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 mt-1">{maskEmail(tutor.email)}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Direct Phone Contact</span>
                      <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 mt-1">{maskPhone(tutor.phone)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link 
                      to={`/login?redirect=${encodeURIComponent(`/teacher/${tutor.id}`)}`}
                      className="block text-center w-full py-4 bg-[#0D5BFF] hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl shadow-lg shadow-[#0D5BFF]/15 transition-all"
                    >
                      Log In as Student
                    </Link>
                    <p className="text-center text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Don't have an account? <Link to="/signup" className="text-[#0D5BFF] hover:underline">Register now</Link>
                    </p>
                  </div>

                </div>
              ) : !canSeeContactInfo ? (
                // Locked screen for student context: Can start a chat and see beautiful masked details
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-[#0D5BFF]/10 text-[#0D5BFF] dark:bg-blue-950/40 border border-[#0D5BFF]/25 dark:border-blue-900/40">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white">Direct Contacts Masked</h4>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-0.5">PRIVACY PROTECTION PROTOCOL</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                    For public safety and security, raw email addresses and phone numbers are masked. Please coordinate using our encrypted direct peer messaging network.
                  </p>

                  <div className="space-y-4">
                    
                    {/* Masked Phone */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Direct Phone Contact</span>
                        <p className="text-sm font-mono font-black text-slate-600 dark:text-slate-300 tracking-wider mt-0.5">{maskPhone(tutor.phone)}</p>
                      </div>
                      <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-[8px] font-bold text-slate-600 dark:text-slate-300 uppercase rounded-lg border border-slate-100 dark:border-slate-800">Protected</span>
                    </div>

                    {/* Masked Email */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Verified E-Mail Node</span>
                        <p className="text-sm font-mono font-black text-slate-600 dark:text-slate-300 break-all mt-0.5">{maskEmail(tutor.email)}</p>
                      </div>
                      <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-[8px] font-bold text-slate-600 dark:text-slate-300 uppercase rounded-lg border border-slate-100 dark:border-slate-800">Protected</span>
                    </div>

                  </div>

                  <div className="space-y-2.5">
                    <button 
                      onClick={initDirectChat}
                      className="w-full py-4.5 bg-[#0D5BFF] hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl shadow-lg shadow-[#0D5BFF]/15 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Initiate Direct Chat</span>
                    </button>
                  </div>

                </div>
              ) : (
                // Privileged administrator or verified self-profile access
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-200 dark:border-emerald-900/40">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Credentials Unlocked</h4>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-0.5">PRIVILEGED LEDGER ACCESS</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Unmasked Phone */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Direct Phone Contact</span>
                        <p className="text-sm font-mono font-black text-slate-800 dark:text-white tracking-wider mt-0.5">{tutor.phone || 'Contact via email / chat'}</p>
                      </div>
                      {tutor.phone && (
                        <button 
                          onClick={() => copyToClipboard(tutor.phone, 'phone')}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[9px] font-black text-[#0B132B] dark:text-white uppercase transition-all rounded-xl border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                        >
                          {copied === 'phone' ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {/* Unmasked Email */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Verified E-Mail Node</span>
                        <p className="text-sm font-mono font-black text-slate-800 dark:text-white break-all mt-0.5">{tutor.email || 'N/A'}</p>
                      </div>
                      {tutor.email && (
                        <button 
                          onClick={() => copyToClipboard(tutor.email, 'email')}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[9px] font-black text-[#0B132B] dark:text-white uppercase transition-all rounded-xl border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                        >
                          {copied === 'email' ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>

                  </div>

                  <div className="space-y-2.5">
                    <button 
                      onClick={initDirectChat}
                      className="w-full py-4.5 bg-[#0D5BFF] hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl shadow-lg shadow-[#0D5BFF]/15 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Initiate Direct Chat</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </motion.div>

    </motion.div>
  );
}
