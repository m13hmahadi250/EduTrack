import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { Helmet } from 'react-helmet-async';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Star, 
  MapPin, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  TrendingUp,
  Award,
  Search,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshData';
import heroImage from '../assets/images/regenerated_image_1779606039351.png';

export default function Home() {
  const [realTutors, setRealTutors] = React.useState<any[]>([]);
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location]);

  React.useEffect(() => {
    let active = true;
    const fetchTutors = async () => {
      try {
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
        const querySnapshot = await getDocs(q);
        if (active) {
          const fetched = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() as any }))
            .filter((u: any) => !u.isBlocked && u.showOnHomePage !== false);
          setRealTutors(fetched);
        }
      } catch (error) {
        console.error("Error fetching tutors:", error);
      }
    };
    fetchTutors();
    return () => {
      active = false;
    };
  }, []);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSubject, setSelectedSubject] = React.useState('All');
  const [selectedDistrict, setSelectedDistrict] = React.useState('All');

  // Unified list of available tutors (Firestore Real)
  const allTutors = React.useMemo(() => {
    return realTutors;
  }, [realTutors]);

  // Compute live search filter results
  const filteredTutors = React.useMemo(() => {
    return allTutors.filter(t => {
      // 1. Text Search query matching Name, University, or listed Subjects
      const queryStr = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        queryStr === '' ||
        (t.name && t.name.toLowerCase().includes(queryStr)) ||
        (t.university && t.university.toLowerCase().includes(queryStr)) ||
        (t.subjects && t.subjects.some((s: string) => s.toLowerCase().includes(queryStr)));

      // 2. Exact Subject classification match
      const matchesSubject = 
        selectedSubject === 'All' ||
        (t.subjects && t.subjects.some((s: string) => s.toLowerCase().includes(selectedSubject.toLowerCase())));

      // 3. Geographic District filter match
      const matchesDistrict = 
        selectedDistrict === 'All' ||
        (t.district && t.district.toLowerCase() === selectedDistrict.toLowerCase());

      return matchesSearch && matchesSubject && matchesDistrict;
    });
  }, [allTutors, searchQuery, selectedSubject, selectedDistrict]);

  return (
    <div className="bg-[#F8F9FA] dark:bg-[#0B132B] text-[#0B132B] dark:text-slate-100 font-sans selection:bg-[#0D5BFF] selection:text-white transition-colors duration-300">
      <Helmet>
        <title>EduTrack | Security-First Home Tutoring Platform in Bangladesh</title>
        <meta name="description" content="Connect with trusted, NID-verified home tutors in Bangladesh or list your profile as an expert tutor. Experience real-time GPS tracking, secure billing, and premium academic pairing on EduTrack." />
        <meta property="og:title" content="EduTrack | Security-First Home Tutoring Platform in Bangladesh" />
        <meta property="og:description" content="Connect with trusted, NID-verified home tutors in Bangladesh. Real-time GPS tracking, secure billing, and premium academic pairing." />
        <meta name="twitter:title" content="EduTrack | Security-First Home Tutoring Platform in Bangladesh" />
        <meta name="twitter:description" content="Connect with trusted, NID-verified home tutors in Bangladesh. Real-time GPS tracking, secure billing, and premium academic pairing." />
      </Helmet>

      {/* Hero Section - Magazine Style */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-white dark:bg-[#111A2E] transition-colors duration-300">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#0D5BFF]/5 skew-x-[-15deg] transform translate-x-20 z-0"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl z-0"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl relative z-20"
            >
              <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/50 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D5BFF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D5BFF]"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0D5BFF] dark:text-blue-400">Live in Bangladesh</span>
              </div>
              
              <h1 className="text-[3rem] sm:text-[6rem] lg:text-[7.5rem] font-black font-heading leading-[0.9] sm:leading-[0.82] tracking-[-0.04em] mb-8 uppercase">
                <span className="block text-[#0B132B] dark:text-white opacity-90">Expert</span>
                <span className="block text-[#0D5BFF] italic">Education</span>
                <span className="block text-[#0B132B] dark:text-white -mt-2">At Home</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-[#1f1b1b] dark:text-slate-300 mb-10 leading-relaxed font-sans font-bold tracking-wide max-w-lg">
                The most secure home tutoring platform in Bangladesh. Featuring <span className="text-[#0D5BFF] dark:text-blue-400 font-semibold transition-colors duration-200 border-b-2 border-[#0D5BFF]/20">real-time GPS tracking</span>, <span className="text-[#0D5BFF] dark:text-blue-400 font-semibold transition-colors duration-200 border-b-2 border-[#0D5BFF]/20">NID-verified educators</span>, and seamless payments for your child's success.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                <Link to="/signup" className="group w-full sm:w-auto px-10 py-5 bg-[#0D5BFF] text-white font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-blue-700 transition-all shadow-[0_20px_40px_-15px_rgba(13,91,255,0.4)] text-center flex items-center justify-center">
                  Find a Tutor <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-transparent text-[#0B132B] dark:text-white border-2 border-[#0B132B] dark:border-slate-700 font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-[#0B132B] dark:hover:bg-white dark:hover:text-[#0B132B] transition-all text-center">
                  Join as Teacher
                </Link>
              </div>


            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 rounded-[3rem] overflow-hidden border-[12px] border-white dark:border-slate-800 shadow-2xl rotate-2 transition-colors duration-300">
                <img 
                  src={heroImage} 
                  alt="Education" 
                  className="w-full h-[600px] object-cover"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute -bottom-10 -left-10 bg-white dark:bg-[#1E293B] p-8 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800/80 z-20 max-w-xs -rotate-3 transition-colors">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-[#0B132B] dark:text-white text-lg leading-tight uppercase">Verified Quality</h3>
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">100% of our tutors are manually verified by NID and certificates.</p>
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(idx => (
                    <div key={idx} className="w-10 h-10 rounded-full border-4 border-white dark:border-[#1E293B] bg-slate-200 overflow-hidden">
                       <img 
                         src={`https://i.pravatar.cc/100?u=${idx}`} 
                         alt="user" 
                         loading="lazy" 
                         referrerPolicy="no-referrer" 
                       />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-4 border-white dark:border-[#1E293B] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">
                    +2k
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Tutors - Bento Grid Style */}
      <section id="find-tutors" className="py-24 bg-white dark:bg-[#0B132B] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">Elite Network</h2>
              <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic leading-[0.9]">
                Teacher <span className="text-[#0D5BFF]">Directory</span>
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3 max-w-xl">
                Browse, search, and verify certified home tutors in real-time. Click any card to view their full credentials in a new tab.
              </p>
            </div>
          </div>

          {/* Search Controls Bento Box */}
          <div className="bg-slate-50 dark:bg-[#111A2E]/50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 gap-6 flex flex-col md:flex-row items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by name, university, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#0B132B] text-sm font-bold text-[#0B132B] dark:text-white rounded-2xl border border-slate-200/50 dark:border-slate-800 focus:border-[#0D5BFF] outline-none shadow-sm transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
              
              {/* Subject Filter */}
              <div className="relative w-full sm:w-48">
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-4 bg-white dark:bg-[#0B132B] text-xs font-black uppercase text-[#0B132B] dark:text-white rounded-2xl border border-slate-200/50 dark:border-slate-800 outline-none cursor-pointer hover:border-[#0D5BFF] transition-colors shadow-sm"
                >
                  <option value="All">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Math">Math</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="English">English</option>
                  <option value="ICT">ICT</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              {/* District Filter */}
              <div className="relative w-full sm:w-48">
                <select 
                  value={selectedDistrict} 
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-4 py-4 bg-white dark:bg-[#0B132B] text-xs font-black uppercase text-[#0B132B] dark:text-white rounded-2xl border border-slate-200/50 dark:border-slate-800 outline-none cursor-pointer hover:border-[#0D5BFF] transition-colors shadow-sm"
                >
                  <option value="All">All Districts</option>
                  {BANGLADESH_DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

            </div>

          </div>

          {/* Grid of Cards with Motion layout animation */}
          {filteredTutors.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 p-8 bg-slate-50 dark:bg-[#111A2E]/20 rounded-[3rem] border-2 border-dashed border-slate-200/80 dark:border-slate-800 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4"
            >
              <Users className="w-12 h-12 text-[#0D5BFF] animate-pulse" />
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic">No Mentors Found</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 leading-relaxed max-w-sm mx-auto">
                  We couldn't locate any tutors matching your query. Check spelling or expand district search parameters.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-h-[1480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
              {filteredTutors.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <TutorPreviewCard tutor={t} />
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>
      </section>

      {/* Detailed Features - Horizontal Alternating */}
      <section className="py-32 bg-white dark:bg-[#111A2E]/40 overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1 - GPS */}
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <div className="inline-block p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl mb-8">
                <MapPin className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-black font-heading text-[#0B132B] dark:text-white uppercase mb-8 leading-[0.9] italic">
                Real-Time <span className="text-rose-500">Security</span> <br /> In Your Pocket
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-300 font-medium mb-10 leading-relaxed max-w-lg">
                Never wonder where the tutor is. Our platform integrates real-time GPS tracking, allowing parents to monitor arrival, session duration, and departure directly from the dashboard.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="border-l-4 border-rose-500 pl-4">
                  <div className="text-2xl font-black text-[#0B132B] dark:text-white">Live Map</div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active during transit</p>
                </div>
                <div className="border-l-4 border-emerald-500 pl-4">
                  <div className="text-2xl font-black text-[#0B132B] dark:text-white">Geo-Fencing</div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Auto session logs</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute inset-0 bg-rose-500/10 blur-[120px] rounded-full"></div>
              <div className="relative bg-[#0B132B] p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] shadow-2xl border-2 border-white/10 overflow-hidden transform rotate-2">
                 {/* Mock Tracking UI */}
                 <div className="space-y-6">
                    <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                       <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <div className="text-white font-black uppercase text-xs tracking-widest">Tutor Location</div>
                          <div className="text-slate-400 text-[10px] font-bold">2 mins away from your home</div>
                       </div>
                    </div>
                    <div className="h-48 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center italic text-slate-600 font-black uppercase text-[10px] tracking-[0.3em]">
                       Live Map View
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>

          {/* Row 2 - Verification */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <div className="inline-block p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl mb-8">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-black font-heading text-[#0B132B] dark:text-white uppercase mb-8 leading-[0.9] italic">
                NID Verified <span className="text-emerald-500">Elite</span> <br /> Educators
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-300 font-medium mb-10 leading-relaxed max-w-lg">
                We don't just take anyone. Every tutor undergoes a rigorous 3-step verification process including National ID check, Academic History audit, and a background interview.
              </p>
              <div className="space-y-4">
                {["100% Manual ID Verification", "Academic Certificate Audit", "University ID Confirmation"].map(t => (
                  <div key={t} className="flex items-center space-x-3 text-[#0B132B] dark:text-slate-200 font-bold uppercase text-xs tracking-wider">
                     <CheckCircle className="w-5 h-5 text-emerald-500" />
                     <span>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute inset-0 bg-emerald-500/10 blur-[120px] rounded-full"></div>
              <div className="relative bg-white dark:bg-[#1E293B] p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800/85 transform -rotate-2 transition-colors">
                 <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                       <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div>
                       <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded-full mb-2"></div>
                       <div className="h-4 w-24 bg-slate-50 dark:bg-slate-800/50 rounded-full"></div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                       <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">NID Status</span>
                       <span className="text-[10px] font-black text-white bg-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest">Verified</span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                       <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Academic Record</span>
                       <span className="text-[10px] font-black text-white bg-[#0D5BFF] px-3 py-1 rounded-full uppercase tracking-widest">Approved</span>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats - Massive Visuals */}
      <section className="py-24 bg-[#0B132B] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-full bg-[#0D5BFF]/5 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
              <StatBlock value="5k+" label="Guardians Trust" />
              <StatBlock value="1.2k+" label="Active Tutors" />
              <StatBlock value="99%" label="Success Rate" />
              <StatBlock value="24h" label="Instant Support" />
           </div>
        </div>
      </section>

      {/* Trust & Safety Section - Visible Grid Style */}
      <section id="safety" className="py-24 bg-white dark:bg-[#0B132B] border-y border-slate-100 dark:border-slate-800/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">Safety First</h2>
            <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic">
              Security You Can <span className="text-[#0D5BFF]">Trust</span>
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <TrustCard 
              icon={<Shield className="w-10 h-10" />}
              title="Identity Verification"
              description="Every tutor must upload their National ID and Student ID card. Our team manually verifies each document before they can join."
            />
            <TrustCard 
              icon={<MapPin className="w-10 h-10" />}
              title="Live GPS Tracking"
              description="Parents can track the tutor's live location via their dashboard to ensure safety and confirm punctuality."
            />
            <TrustCard 
              icon={<Award className="w-10 h-10" />}
              title="Verified Certification"
              description="Academic records and university IDs are double-checked. Only top-tier students from reputable institutions are accepted."
            />
          </div>
        </div>
      </section>

      {/* How it Works - Modern Step Layout */}
      <section id="how-it-works" className="py-24 bg-slate-50/50 dark:bg-[#111A2E]/30 border-y border-slate-100/50 dark:border-slate-800/40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">The Process</h2>
              <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic leading-[0.9]">
                How EduTrack <span className="text-[#0D5BFF]">Works</span>
              </h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm lg:text-right">
              A seamless journey from finding the right teacher to tracking progress in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection Line (Hidden on Mobile) */}
            <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-slate-200 dark:bg-slate-800/80 z-0 overflow-hidden">
              <motion.div 
                initial={{ scaleX: 0, originX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.1 }}
                className="w-full h-full bg-gradient-to-r from-slate-200 via-[#0D5BFF] to-slate-200 dark:from-slate-800 dark:via-[#0D5BFF] dark:to-slate-800"
              />
            </div>
            
            <Step 
              number="01" 
              title="Search" 
              desc="Browse verified tutors nearby using our advanced filters for subject and location." 
              index={0}
            />
            <Step 
              number="02" 
              title="Connect" 
              desc="Message tutors directly to discuss schedules, requirements, and trial classes." 
              index={1}
            />
            <Step 
              number="03" 
              title="Track" 
              desc="Monitor live GPS location of the tutor during their transit to your home." 
              index={2}
            />
            <Step 
              number="04" 
              title="Pay" 
              desc="Securely pay via bKash through our automated billing system after each session." 
              index={3}
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-white dark:bg-[#0B132B] transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0B132B] rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#0D5BFF]/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
             <div className="relative z-10">
               <h2 className="text-[3rem] lg:text-[4.5rem] font-black font-heading text-white leading-none uppercase mb-8">
                 Ready to <span className="text-[#0D5BFF]">Start?</span>
               </h2>
               <p className="text-slate-400 text-lg mb-12 max-w-xl mx-auto">
                 Join thousands of parents who have already upgraded their child's education with EduTrack.
               </p>
               <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                 <Link to="/signup" className="w-full sm:w-auto px-12 py-5 bg-[#0D5BFF] text-white font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-blue-700 transition-all text-center">
                   Get Started Now
                 </Link>
                 <Link to="/signup" className="w-full sm:w-auto px-12 py-5 bg-white dark:bg-slate-100 text-[#0B132B] font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-slate-50 hover:bg-slate-200 transition-all text-center">
                   Learn More
                 </Link>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white dark:bg-[#0B132B] border-t border-slate-100 dark:border-slate-800/60 py-16 px-4 md:px-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic mb-6">EduTrack</h4>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed mb-6">
              The premier platform for secure, verified home tutoring in Bangladesh. Built with safety and excellence at its core.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-[#0D5BFF] hover:border-[#0D5BFF] transition-all cursor-pointer">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-[#0D5BFF] hover:border-[#0D5BFF] transition-all cursor-pointer">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase tracking-[0.2em] mb-6">Quick Links</h5>
            <ul className="space-y-4">
              <li><Link to="/signup" className="text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Find a Tutor</Link></li>
              <li><Link to="/signup" className="text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Join as Tutor</Link></li>
              <li><Link to="/login" className="text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Login</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase tracking-[0.2em] mb-6">Contact</h5>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase mb-2">Chattogram, Bangladesh</p>
            <p className="text-[#0D5BFF] text-sm font-bold uppercase">m13hmahadi@gmail.com</p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-50 dark:border-slate-850 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            © {new Date().getFullYear()} EduTrack. All rights reserved.
          </p>
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="flex items-center gap-2.5 group cursor-pointer bg-slate-50/50 dark:bg-[#1E293B]/40 px-4 py-2 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 hover:border-[#0D5BFF]/30 hover:bg-white dark:hover:bg-[#1E293B]/60 hover:shadow-xl hover:shadow-[#0D5BFF]/5 transition-all duration-300"
          >
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors duration-300">
              Designed & Built by
            </span>
            <div className="relative">
              <span className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase italic tracking-wider group-hover:text-[#0D5BFF] transition-colors duration-300">
                Mohammed Mahadi Hossain
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#0D5BFF] to-[#1EA5FC] group-hover:w-full transition-all duration-300 rounded-full" />
            </div>

          </motion.div>
        </div>
      </footer>
    </div>
  );
}

const TrustCard = React.memo(({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => {
  return (
    <div className="group p-8 rounded-3xl bg-[#F8F9FA] dark:bg-[#1E293B]/40 hover:bg-white dark:hover:bg-[#1E293B] border border-transparent hover:border-slate-100 dark:hover:border-slate-800 hover:shadow-2xl transition-all duration-500">
      <div className="mb-6 p-4 bg-white dark:bg-[#1E293B] shadow-sm border border-slate-50 dark:border-slate-800/80 inline-block rounded-2xl text-[#0D5BFF] transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-2xl font-black font-heading text-[#0B132B] dark:text-white mb-4 uppercase tracking-tight italic">{title}</h4>
      <p className="text-slate-500 dark:text-slate-300 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
});

const StatBlock = React.memo(({ value, label }: { value: string, label: string }) => {
  return (
    <div className="p-8 border-r border-white/10 last:border-0 flex flex-col justify-center items-center text-center">
       <div className="text-4xl lg:text-5xl font-black font-heading text-blue-500 mb-2">{value}</div>
       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{label}</div>
    </div>
  );
});

const Step = React.memo(({ number, title, desc, index }: { number: string, title: string, desc: string, index: number }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        type: "spring", 
        stiffness: 70, 
        damping: 15,
        delay: index * 0.15 
      }}
      className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left group cursor-default"
    >
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        {/* Animated glowing backplate */}
        <div className="absolute inset-0 bg-[#0D5BFF]/10 dark:bg-[#0D5BFF]/20 rounded-2xl scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 blur-xl transition-all duration-300 z-0" />
        
        {/* Step Indicator container */}
        <div className="relative z-10 w-20 h-20 bg-white dark:bg-[#1E293B] rounded-2xl flex items-center justify-center border-2 border-slate-100 dark:border-slate-800 shadow-sm group-hover:border-[#0D5BFF] group-hover:shadow-2xl group-hover:shadow-[#0D5BFF]/10 group-hover:-translate-y-1 transition-all duration-300">
          <span className="text-2xl font-black font-heading text-[#0B132B] dark:text-white italic group-hover:text-[#0D5BFF] transition-colors">{number}</span>
        </div>
      </div>
      
      <h4 className="text-xl font-black text-[#0B132B] dark:text-white mb-2 uppercase italic group-hover:text-[#0D5BFF] transition-colors duration-300">{title}</h4>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
        {desc}
      </p>
    </motion.div>
  );
});

const TutorPreviewCard = React.memo(({ tutor }: { tutor: any }) => {
  const name = tutor.name;
  const uni = tutor.university || tutor.uni || 'Expert Educator';
  const subj = (tutor.subjects && tutor.subjects.join(', ')) || tutor.subj || 'Academic Mentor';
  const rating = tutor.rating || 5.0;
  const img = tutor.profileImage || tutor.img;
  
  return (
    <Link 
      to={`/teachers/${tutor.id}`} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="bg-[#F8F9FA] dark:bg-[#1E293B]/40 rounded-[2.5rem] p-4 border border-slate-100 dark:border-slate-800/80 hover:border-[#0D5BFF]/30 dark:hover:border-[#0D5BFF]/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-2xl hover:-translate-y-2.5 hover:scale-[1.015] active:scale-[0.985] transition-all duration-500 group flex flex-col justify-between h-full"
    >
      <div>
        <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
          {img ? (
            <img src={img} alt={name} className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0B132B] to-[#1C2541] flex flex-col items-center justify-center text-center p-6 text-white transition-all duration-500">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0D5BFF] to-blue-400 rounded-2xl flex items-center justify-center text-2xl font-black italic shadow-2xl mb-3">
                {name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#0D5BFF]">Certified Mentorship</p>
            </div>
          )}
          
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-black text-[#0B132B] dark:text-white">{Number(rating || 0).toFixed(1)}</span>
          </div>

          {tutor.isVerified && (
            <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <ShieldCheck className="w-3 h-3 text-white fill-white/10" />
              <span>Verified ID</span>
            </div>
          )}
        </div>
        
        <div className="px-2 pb-2">
          <h4 className="text-xl font-black text-[#0B132B] dark:text-white uppercase italic mb-1 group-hover:text-[#0D5BFF] transition-colors">{name}</h4>
          <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest mb-3 line-clamp-1">{uni}</p>
          <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
            <BookOpen className="w-3 h-3 mr-2 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{subj}</span>
          </div>
          {tutor.area && (
            <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5">
              <MapPin className="w-3 h-3 mr-2 text-slate-400 shrink-0" />
              <span>{tutor.area}{tutor.district ? `, ${tutor.district}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-2 pt-4">
        <div className="w-full bg-[#0D5BFF] text-white text-center py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-[0_10px_20px_-5px_rgba(13,91,255,0.3)]">
          <span>View Profile</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
});
