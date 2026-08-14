import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import AIChatWidget from '../components/AIChatWidget';
import Logo from '../components/Logo';
import { prefetchPage } from '../utils/prefetch';
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
  ExternalLink,
  Heart,
  ChevronDown,
  ChevronUp,
  Quote,
  HelpCircle,
  Check,
  Settings,
  Edit3,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Loader2,
  Eye,
  EyeOff,
  Smartphone,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshData';
import heroImage from '../assets/images/regenerated_image_1779606039351.png';

export default function Home() {
  const [realTutors, setRealTutors] = React.useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('edutrack_cached_home_tutors');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const location = useLocation();

  React.useEffect(() => {
    document.title = "EduTrack | Security-First Home Tutoring Platform in Bangladesh";
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', "Connect with trusted, NID-verified home tutors in Bangladesh or list your profile as an expert tutor. Experience real-time GPS tracking, secure billing, and premium academic pairing on EduTrack.");
    }
  }, []);

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
            .filter((u: any) => !u.isBlocked && u.showOnHomePage !== false && Boolean(u.isVerified || u.verified || u.isApproved));
          setRealTutors(fetched);
          try {
            localStorage.setItem('edutrack_cached_home_tutors', JSON.stringify(fetched));
          } catch (e) {}
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
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);

  const { currentUser, updateUser, androidAppLink } = useAppStore();
  const [localFavorites, setLocalFavorites] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('edutrack_saved_tutors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = async (tutorId: string) => {
    if (currentUser) {
      const currentSaved = currentUser.savedTutors || [];
      const isFav = currentSaved.includes(tutorId);
      const newSaved = isFav 
        ? currentSaved.filter(id => id !== tutorId)
        : [...currentSaved, tutorId];
      await updateUser(currentUser.id, { savedTutors: newSaved });
    } else {
      const isFav = localFavorites.includes(tutorId);
      const newFavs = isFav
        ? localFavorites.filter(id => id !== tutorId)
        : [...localFavorites, tutorId];
      setLocalFavorites(newFavs);
      localStorage.setItem('edutrack_saved_tutors', JSON.stringify(newFavs));
    }
  };

  // Unified list of available tutors (Firestore Real)
  const [showDownloadPopup, setShowDownloadPopup] = React.useState(false);

  React.useEffect(() => {
    const dismissed = localStorage.getItem('edutrack_app_download_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => {
        setShowDownloadPopup(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismissPopup = () => {
    localStorage.setItem('edutrack_app_download_dismissed', 'true');
    setShowDownloadPopup(false);
  };

  const logDownloadAttempt = async (source: string) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const attemptId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const payload = {
        id: attemptId,
        timestamp: new Date().toISOString(),
        platform: 'android',
        source,
        userId: currentUser?.id || null,
        userEmail: currentUser?.email || null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      };

      try {
        await setDoc(doc(db, 'download_attempts', attemptId), payload);
      } catch (error) {
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          authInfo: {
            userId: currentUser?.id || null,
            email: currentUser?.email || null,
          },
          operationType: 'create',
          path: `download_attempts/${attemptId}`
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        throw new Error(JSON.stringify(errInfo));
      }
    } catch (error) {
      console.error('Error logging download attempt:', error);
    }
  };

  const allTutors = React.useMemo(() => {
    return realTutors;
  }, [realTutors]);

  // Compute live search filter results
  const filteredTutors = React.useMemo(() => {
    const favoriteIds = currentUser?.savedTutors || localFavorites;
    return allTutors.filter(t => {
      // 0. Favorites filter match
      const matchesFavorites = !showFavoritesOnly || favoriteIds.includes(t.id);

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

      // 3. Tag-based filtering match (matches at least one selected tag if tags are active)
      const matchesTags = 
        selectedTags.length === 0 ||
        (t.subjects && t.subjects.some((s: string) => 
          selectedTags.some(tag => s.toLowerCase().includes(tag.toLowerCase()))
        ));

      // 4. Geographic District filter match
      const matchesDistrict = 
        selectedDistrict === 'All' ||
        (t.district && t.district.toLowerCase() === selectedDistrict.toLowerCase());

      // Must be a verified teacher
      const isVerified = Boolean(t.isVerified || t.verified || t.isApproved);
      if (!isVerified) return false;

      return matchesFavorites && matchesSearch && matchesSubject && matchesTags && matchesDistrict;
    });
  }, [allTutors, searchQuery, selectedSubject, selectedTags, selectedDistrict, showFavoritesOnly, currentUser?.savedTutors, localFavorites]);

  return (
    <div className="bg-[#F8F9FA] dark:bg-[#0B132B] text-[#0B132B] dark:text-slate-100 font-sans selection:bg-[#0D5BFF] selection:text-white transition-colors duration-300">

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
              
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-sans font-medium tracking-wide max-w-lg antialiased">
                The most secure home tutoring platform in Bangladesh. Featuring <span className="text-[#0D5BFF] dark:text-blue-400 font-bold transition-colors duration-200 border-b-2 border-[#0D5BFF]/20">real-time GPS tracking</span>, <span className="text-[#0D5BFF] dark:text-blue-400 font-bold transition-colors duration-200 border-b-2 border-[#0D5BFF]/20">NID-verified educators</span>, and seamless payments for your child's success.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                  <Link 
                    to="/signup" 
                    onMouseEnter={() => prefetchPage('Signup')}
                    onFocus={() => prefetchPage('Signup')}
                    className="group w-full sm:w-auto px-10 py-5 bg-[#0D5BFF] text-white font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-blue-700 transition-all shadow-[0_20px_40px_-15px_rgba(13,91,255,0.4)] text-center flex items-center justify-center cursor-pointer"
                  >
                    Find a Tutor <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                  <Link 
                    to="/signup" 
                    onMouseEnter={() => prefetchPage('Signup')}
                    onFocus={() => prefetchPage('Signup')}
                    className="w-full sm:w-auto px-10 py-5 bg-transparent text-[#0B132B] dark:text-white border-2 border-[#0B132B] dark:border-slate-700 font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-[#0B132B] dark:hover:bg-white dark:hover:text-[#0B132B] transition-all text-center block cursor-pointer"
                  >
                    Join as Teacher
                  </Link>
                </motion.div>
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
                  loading="eager"
                  // @ts-ignore
                  fetchPriority="high"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute -bottom-10 -left-10 bg-white dark:bg-[#1E293B] p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800/80 z-20 max-w-xs -rotate-3 transition-all duration-300 hover:rotate-0">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-[#0B132B] dark:text-white text-base leading-tight uppercase tracking-tight">Verified Quality</h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider leading-relaxed">100% of our tutors are manually verified by NID and certificates.</p>
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

              {/* Favorites Filter */}
              <button
                type="button"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer shrink-0 ${
                  showFavoritesOnly
                    ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600 shadow-md shadow-rose-200 dark:shadow-none'
                    : 'bg-white dark:bg-[#0B132B] text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800 hover:border-rose-500 hover:text-rose-500'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 transition-colors duration-300 ${showFavoritesOnly ? 'fill-white text-white' : 'text-rose-500'}`} />
                <span>Favorites</span>
              </button>

            </div>

          </div>

          {/* Tag-Based Subject Filters */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#0D5BFF]" />
                Filter by Subject Tags
              </span>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Clear All Tags ({selectedTags.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5 px-2">
              {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT', 'Higher Math', 'Bangla'].map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all duration-200 transform hover:scale-[1.02] active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0D5BFF] border-[#0D5BFF] text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-[#111A2E]/40 border-slate-200/50 dark:border-slate-800 text-[#0B132B] dark:text-slate-300 hover:border-[#0D5BFF] hover:text-[#0D5BFF]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
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
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 max-h-[1480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
              {filteredTutors.map((t) => {
                const isFavorite = currentUser?.savedTutors?.includes(t.id) || localFavorites.includes(t.id);
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <TutorPreviewCard 
                      tutor={t} 
                      isFavorite={isFavorite}
                      onToggleFavorite={() => toggleFavorite(t.id)}
                    />
                  </motion.div>
                );
              })}
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

      {/* Verified Real-User Reviews Section */}
      <section className="py-28 bg-[#F8F9FA] dark:bg-[#111A2E]/20 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">Success Stories</h2>
            <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic">
              Trusted By <span className="text-[#0D5BFF]">Guardians & Tutors</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3 max-w-lg mx-auto">
              See how EduTrack is revolutionizing home tutoring with top safety measures and academic discipline.
            </p>
          </div>

          <RealUserSuccessStories />
        </div>
      </section>

      {/* Interactive Frequently Asked Questions (FAQ) Section */}
      <section className="py-28 bg-white dark:bg-[#0B132B] border-t border-slate-100 dark:border-slate-800/60 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">Common Concerns</h2>
            <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] dark:text-white uppercase italic">
              Frequently Asked <span className="text-[#0D5BFF]">Questions</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3">
              Quick, honest answers regarding verification, safety, matchings, and billing structures.
            </p>
          </div>

          <div className="space-y-4">
            <FAQAccordionList />
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
                 <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                   <Link to="/signup" onMouseEnter={() => prefetchPage('Signup')} onFocus={() => prefetchPage('Signup')} className="w-full sm:w-auto px-12 py-5 bg-[#0D5BFF] text-white font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-blue-700 transition-all text-center block cursor-pointer">
                     Get Started Now
                   </Link>
                 </motion.div>
                 <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                   <a 
                      href={androidAppLink}
                     target="_blank" 
                     rel="noopener noreferrer" 
                     onClick={() => logDownloadAttempt('footer_cta')}
                     className="w-full sm:w-auto px-12 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-sm uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                   >
                     <Smartphone className="w-4.5 h-4.5" />
                     Download APK
                   </a>
                 </motion.div>
                 <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                   <Link to="/signup" onMouseEnter={() => prefetchPage('Signup')} onFocus={() => prefetchPage('Signup')} className="w-full sm:w-auto px-12 py-5 bg-white dark:bg-slate-100 text-[#0B132B] font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-slate-50 hover:bg-slate-200 transition-all text-center block cursor-pointer">
                     Learn More
                   </Link>
                 </motion.div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white dark:bg-[#0B132B] border-t border-slate-100 dark:border-slate-800/60 py-16 px-4 md:px-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6 select-none cursor-default">
              <Logo className="w-10 h-10 sm:w-11 sm:h-11 hover:rotate-6 transition-transform duration-300" />
              <h4 className="text-2xl font-black text-[#0B132B] dark:text-white uppercase italic flex">
                {"EduTrack".split("").map((char, index) => (
                  <span
                    key={index}
                    className="inline-block origin-bottom animate-logo-letter"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {char}
                  </span>
                ))}
              </h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed mb-6 text-sm">
              The premier platform for secure, verified home tutoring in Bangladesh. Built with safety, trust, and academic excellence at its core.
            </p>
            <div className="flex gap-3.5">
              <motion.div 
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-[#0D5BFF] hover:border-[#0D5BFF] hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
                title="Trending Tutors"
              >
                <TrendingUp className="w-5 h-5" />
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-[#0D5BFF] hover:border-[#0D5BFF] hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
                title="Community Directory"
              >
                <Users className="w-5 h-5" />
              </motion.div>
            </div>
          </div>
          
          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase tracking-[0.2em] mb-6">Quick Links</h5>
            <ul className="space-y-4">
              <li><Link to="/signup" onMouseEnter={() => prefetchPage('Signup')} onFocus={() => prefetchPage('Signup')} className="text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Find a Tutor</Link></li>
              <li><Link to="/signup" onMouseEnter={() => prefetchPage('Signup')} onFocus={() => prefetchPage('Signup')} className="text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Join as Tutor</Link></li>
              <li><Link to="/login" onMouseEnter={() => prefetchPage('Login')} onFocus={() => prefetchPage('Login')} className="text-slate-500 dark:text-slate-400 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Login</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase tracking-[0.2em] mb-6">Contact</h5>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase mb-2">Chattogram, Bangladesh</p>
            <p className="text-[#0D5BFF] text-sm font-bold uppercase">m13hmahadi@gmail.com</p>
          </div>

          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase tracking-[0.2em] mb-6">Android App</h5>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mb-4">
              Download our official mobile app for real-time tracking, alerts, and more.
            </p>
            <a 
              href={androidAppLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={() => logDownloadAttempt('footer')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Download APK
            </a>
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
      <AIChatWidget />

      {/* One-time Android App Download Popup */}
      <AnimatePresence>
        {showDownloadPopup && (
          <div className="fixed inset-0 bg-[#0B132B]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center overflow-hidden"
            >
              {/* Decorative Background Glows */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0D5BFF]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleDismissPopup}
                className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B]/60 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Container */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20 relative group">
                <Smartphone className="w-8 h-8" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0D5BFF] rounded-lg flex items-center justify-center text-white border-2 border-white dark:border-[#111A2E] shadow-md">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Headings */}
              <h3 className="text-xl font-black text-[#0B132B] dark:text-white uppercase tracking-wider mb-2">
                EduTrack Bangladesh
              </h3>
              <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-4">
                Official Android App
              </p>

              {/* Description */}
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-6">
                Take tracking and tutor coordination with you on the go! Experience real-time GPS updates, NID verification checking, and instant class scheduling directly from your smartphone.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <a
                  href={androidAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { logDownloadAttempt('popup'); handleDismissPopup(); }}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Download APK
                </a>
                <button
                  onClick={handleDismissPopup}
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1E293B]/50 dark:hover:bg-[#1E293B]/80 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer"
                >
                  No thanks, maybe later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DEFAULT_FALLBACK_STORIES = [
  {
    id: "story_1",
    quote: "EduTrack has completely eliminated my anxiety regarding my child's home tutoring. The ability to monitor active GPS transit maps and receive verified class logs after every session is incredibly reassuring.",
    author: "Nusrat Jahan",
    role: "Parent of Grade 9 Student",
    location: "Gulshan, Dhaka",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
    badge: "ambassador"
  },
  {
    id: "story_2",
    quote: "Finding high-quality home tutoring used to require tedious networking. EduTrack verified my BUET credentials in a few hours, and I connected with 3 wonderful students immediately. The automated billing is a lifesaver.",
    author: "Tanvir Rahman",
    role: "Mathematics Tutor",
    location: "BUET, CSE '24",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120",
    badge: "verified_member"
  },
  {
    id: "story_3",
    quote: "The automated bKash sandbox payment saves us from awkward monthly salary conversations. Everything is transparently logged. Our tutor from DU is exceptionally disciplined and knowledgeable.",
    author: "Dr. M. A. Karim",
    role: "Parent of Grade 12 Student",
    location: "Halishahar, Chattogram",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    badge: "verified_match"
  }
];

const RealUserSuccessStories = () => {
  const [stories, setStories] = React.useState<any[]>([]);
  const [rawCustomStories, setRawCustomStories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  const currentUser = useAppStore(state => state.currentUser);
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.email === 'edutrackbangladesh@gmail.com' || 
                  currentUser?.email === 'm13hmahadi.personal@gmail.com' ||
                  currentUser?.email === 'admin@gmail.com';

  React.useEffect(() => {
    let unsubscribe: () => void = () => {};

    const setupListener = async () => {
      try {
        const { collection, query, where, onSnapshot, getDocs, setDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        const reviewsRef = collection(db, 'reviews');
        
        // Ensure the reviews collection has initial fallback stories if it is empty
        const snap = await getDocs(reviewsRef);
        if (snap.empty) {
          for (const s of DEFAULT_FALLBACK_STORIES) {
            await setDoc(doc(db, 'reviews', s.id), {
              ...s,
              featured: true,
              showOnHomePage: true,
              createdAt: new Date().toISOString()
            });
          }
        }

        // Real-time query matching user intent:
        // Query the reviews collection with a 'featured: true' filter to ensure data consistency.
        // For admin, we query the entire collection so they can see everything and toggle their featured status!
        const q = isAdmin 
          ? query(reviewsRef) 
          : query(reviewsRef, where('featured', '==', true));

        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...docSnap.data()
            });
          });

          // Sort or ensure we have at least 3 reviews on home screen using fallbacks if list is too small
          let finalStories = [...list];
          if (finalStories.length < 3) {
            const currentAuthors = finalStories.map(s => s.author);
            for (const fallback of DEFAULT_FALLBACK_STORIES) {
              if (finalStories.length >= 3) break;
              if (!currentAuthors.includes(fallback.author)) {
                finalStories.push({
                  ...fallback,
                  isFallback: true,
                  featured: true,
                  showOnHomePage: true
                });
              }
            }
          }

          setStories(finalStories);
          setRawCustomStories(list);
          setLoading(false);
        }, (error) => {
          console.error("Error in onSnapshot for reviews:", error);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error setting up Firestore listener:", err);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAdmin]);

  const toggleStoryVisibility = async (storyId: string) => {
    try {
      setIsSaving(true);
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      // Find the story in current local stories list
      const clickedStory = stories.find(s => s.id === storyId);
      if (!clickedStory) return;

      const currentFeatured = clickedStory.featured !== false;
      const newFeatured = !currentFeatured;

      // Update the reviews document with both properties for compatibility
      const reviewRef = doc(db, 'reviews', storyId);
      await updateDoc(reviewRef, { 
        featured: newFeatured,
        showOnHomePage: newFeatured
      });

      setIsSaving(false);
      setSuccessMsg(`"${clickedStory.author}" review successfully ${newFeatured ? "featured on homepage" : "hidden from visitors"}`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Error toggling story visibility:", err);
      setIsSaving(false);
      setSuccessMsg("Failed to update visibility.");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  const handleSaveLiveStories = async (newCustomStories: any[]) => {
    try {
      setIsSaving(true);
      const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      // Filter out and identify which stories were deleted from the manager list
      const currentIds = newCustomStories.map(s => s.id);
      const deletedStories = rawCustomStories.filter(s => !currentIds.includes(s.id));
      for (const d of deletedStories) {
        await deleteDoc(doc(db, 'reviews', d.id));
      }

      // Save/Update all currently managed stories to the reviews collection
      for (const story of newCustomStories) {
        const id = story.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const ref = doc(db, 'reviews', id);
        
        await setDoc(ref, {
          id,
          quote: story.quote || "",
          author: story.author || "",
          role: story.role || "",
          location: story.location || "",
          rating: Number(story.rating) || 5,
          avatar: story.avatar || "",
          badge: story.badge || "none",
          featured: story.featured !== false,
          showOnHomePage: story.showOnHomePage !== false,
          isRealSession: story.isRealSession || false,
          isRealTutor: story.isRealTutor || false,
          createdAt: story.createdAt || new Date().toISOString()
        }, { merge: true });
      }

      setIsSaving(false);
      setSuccessMsg("Success stories saved live successfully in real-time!");
      setTimeout(() => setSuccessMsg(""), 3000);
      setEditModalOpen(false);
    } catch (err) {
      console.error("Error saving live custom stories:", err);
      setIsSaving(false);
      setSuccessMsg("Failed to save changes. Please try again.");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white dark:bg-[#1E293B]/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 animate-pulse space-y-6">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="w-4.5 h-4.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
            </div>
            <div className="flex items-center gap-4 pt-6 border-t border-slate-50 dark:border-slate-800/40">
              <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Action Control Panel Trigger */}
      {isAdmin && (
        <div className="flex flex-col items-center gap-2 mb-8">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0D5BFF] to-[#1E67FF] hover:from-[#0047E0] hover:to-[#0D5BFF] text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/10 border border-blue-400/20 cursor-pointer select-none"
          >
            <Settings className="w-3.5 h-3.5" />
            Admin Panel: Edit Success Stories
          </motion.button>
          
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-emerald-500/20"
            >
              {successMsg}
            </motion.div>
          )}
        </div>
      )}

      {/* Testimonials Grid Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {stories.map((item, idx) => (
          <motion.div
            key={`${item.id || 'story'}-${idx}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            whileHover={{ y: -6, scale: 1.01 }}
            className={`bg-white dark:bg-[#1E293B]/50 p-8 rounded-[2rem] border transition-all duration-300 relative flex flex-col justify-between ${
              item.showOnHomePage === false
                ? "opacity-60 border-dashed border-red-300 dark:border-red-900 bg-red-50/5 dark:bg-red-950/5"
                : "border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-2xl"
            }`}
          >
            {/* Direct toggle visibility button on card for admins */}
            {isAdmin && (
              <div className="absolute top-5 right-5 z-20 flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStoryVisibility(item.id);
                  }}
                  title={item.showOnHomePage === false ? "Show on Homepage" : "Hide from Homepage"}
                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    item.showOnHomePage === false
                      ? "bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                  }`}
                >
                  {item.showOnHomePage === false ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Hidden
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Visible
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Dynamic badge indicator showing real verification status */}
            <div className="absolute top-6 left-8 flex items-center gap-1.5">
              {item.isRealSession && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Real Match Review
                </span>
              )}
              {item.isRealTutor && (
                <span className="bg-[#0D5BFF]/10 text-[#0D5BFF] text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified Member
                </span>
              )}
              {item.badge === 'verified_match' && !item.isRealSession && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Real Match Review
                </span>
              )}
              {item.badge === 'verified_member' && !item.isRealTutor && (
                <span className="bg-[#0D5BFF]/10 text-[#0D5BFF] text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified Member
                </span>
              )}
              {item.badge === 'ambassador' && (
                <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  ★ Platform Ambassador
                </span>
              )}
              {(item.isFallback || (!item.badge && !item.isRealSession && !item.isRealTutor)) && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Platform Ambassador
                </span>
              )}
            </div>

            {!isAdmin && (
              <div className="absolute top-6 right-8 text-blue-500/10 dark:text-blue-400/5 pointer-events-none">
                <Quote className="w-14 h-14 rotate-180" />
              </div>
            )}
            <div className="pt-6">
              <div className="flex gap-1 mb-5">
                {Array.from({ length: Math.round(item.rating || 5) }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed mb-6 italic relative z-10">
                "{item.quote}"
              </p>
            </div>
            <div className="flex items-center gap-4 mt-auto pt-6 border-t border-slate-50 dark:border-slate-800/40">
              <div>
                <h4 className="text-xs font-black text-[#0B132B] dark:text-white uppercase tracking-wider">{item.author}</h4>
                <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-wider mt-0.5">{item.role}</p>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  {item.location} {item.tutorUni ? `• ${item.tutorUni}` : ''}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Admin Testimonial Manager Modal */}
      <AnimatePresence>
        {editModalOpen && (
          <AdminTestimonialManager
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            initialStories={rawCustomStories}
            onSave={handleSaveLiveStories}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-component: Administrative Testimonials Editor & Form Manager
const AdminTestimonialManager = ({
  isOpen,
  onClose,
  initialStories,
  onSave,
  isSaving
}: {
  isOpen: boolean;
  onClose: () => void;
  initialStories: any[];
  onSave: (stories: any[]) => Promise<void>;
  isSaving: boolean;
}) => {
  const [managerStories, setManagerStories] = React.useState<any[]>(() => {
    // Make sure we have a deep/clean copy of initial stories
    return JSON.parse(JSON.stringify(initialStories)).map((s: any) => {
      if (!s.id) s.id = `story_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      return s;
    });
  });

  const [selectedStoryId, setSelectedStoryId] = React.useState<string | null>(
    managerStories.length > 0 ? managerStories[0].id : null
  );

  const selectedStory = managerStories.find(s => s.id === selectedStoryId) || null;

  // Deletion confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  // Form states
  const [formAuthor, setFormAuthor] = React.useState("");
  const [formRole, setFormRole] = React.useState("");
  const [formLocation, setFormLocation] = React.useState("");
  const [formRating, setFormRating] = React.useState(5);
  const [formQuote, setFormQuote] = React.useState("");
  const [formAvatar, setFormAvatar] = React.useState("");
  const [formBadge, setFormBadge] = React.useState("none");
  const [formShowOnHomePage, setFormShowOnHomePage] = React.useState(true);

  // Tabbed layout inside admin selector side panel
  const [activeTab, setActiveTab] = React.useState<"list" | "import">("list");
  const [sessionCandidates, setSessionCandidates] = React.useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = React.useState(false);

  // Fetch rated sessions to populate the import tab
  React.useEffect(() => {
    if (isOpen) {
      const fetchCandidates = async () => {
        try {
          setCandidatesLoading(true);
          const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const sessionsRef = collection(db, 'sessions');
          const qSessions = query(sessionsRef, where('rating', '>', 0));
          const sessionsSnap = await getDocs(qSessions);
          
          const candidates: any[] = [];
          for (const sDoc of sessionsSnap.docs) {
            const sData = sDoc.data();
            
            // Get student info
            let studentName = 'Verified Student';
            let studentImage = '';
            let studentDistrict = '';
            if (sData.studentId) {
              try {
                const studentSnap = await getDoc(doc(db, 'users', sData.studentId));
                if (studentSnap.exists()) {
                  const sUser = studentSnap.data();
                  studentName = sUser.name || 'Verified Student';
                  studentImage = sUser.profileImage || '';
                  studentDistrict = sUser.district || sUser.area || '';
                }
              } catch (studentErr) {
                console.warn("Error fetching student info:", studentErr);
              }
            }

            candidates.push({
              id: sDoc.id,
              quote: sData.feedback || `Highly structured session. The tutoring was exceptionally clear and professional for ${sData.subject || 'academics'}.`,
              author: studentName,
              role: sData.subject ? `Student / Parent (${sData.subject})` : 'Student Guardian',
              location: studentDistrict || 'Dhaka',
              rating: sData.rating || 5,
              avatar: studentImage || "",
              badge: 'verified_match',
              isRealSession: true,
              featured: true,
              showOnHomePage: true
            });
          }

          setSessionCandidates(candidates);
          setCandidatesLoading(false);
        } catch (err) {
          console.error("Error fetching session candidates:", err);
          setCandidatesLoading(false);
        }
      };

      fetchCandidates();
    }
  }, [isOpen]);

  const handleImportCandidate = (cand: any) => {
    // Check if already in list
    if (managerStories.some(s => s.id === cand.id)) {
      return;
    }

    const newStory = {
      ...cand,
      id: cand.id || `custom_${Date.now()}`
    };

    setManagerStories(prev => [...prev, newStory]);
    setSelectedStoryId(newStory.id);
    setActiveTab("list");
  };

  // Load selected story into form states
  React.useEffect(() => {
    if (selectedStory) {
      setFormAuthor(selectedStory.author || "");
      setFormRole(selectedStory.role || "");
      setFormLocation(selectedStory.location || "");
      setFormRating(selectedStory.rating || 5);
      setFormQuote(selectedStory.quote || "");
      setFormAvatar(selectedStory.avatar || "");
      setFormBadge(selectedStory.badge || "none");
      setFormShowOnHomePage(selectedStory.showOnHomePage !== false);
    } else {
      setFormAuthor("");
      setFormRole("");
      setFormLocation("");
      setFormRating(5);
      setFormQuote("");
      setFormAvatar("");
      setFormBadge("none");
      setFormShowOnHomePage(true);
    }
  }, [selectedStoryId]);

  const avatarPresets = [
    { name: "Female Parent", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120" },
    { name: "Male Student/Tutor", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120" },
    { name: "Male Parent", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120" },
    { name: "Female Student/Tutor", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120" },
    { name: "Female Educator", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120" }
  ];

  const handleUpdateStoryInList = () => {
    if (!selectedStoryId) return;
    setManagerStories(prev => prev.map(s => {
      if (s.id === selectedStoryId) {
        return {
          ...s,
          author: formAuthor,
          role: formRole,
          location: formLocation,
          rating: Number(formRating),
          quote: formQuote,
          avatar: formAvatar,
          badge: formBadge,
          showOnHomePage: formShowOnHomePage
        };
      }
      return s;
    }));
  };

  const handleCreateNewStory = () => {
    const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newStory = {
      id: newId,
      author: "New Storyteller",
      role: "Student Guardian",
      location: "Dhaka",
      rating: 5,
      quote: "Type a beautiful success story quote here about classroom achievements, NID verifications, and professional tutors.",
      avatar: avatarPresets[0].url,
      badge: "none",
      showOnHomePage: true
    };

    setManagerStories(prev => [...prev, newStory]);
    setSelectedStoryId(newId);
  };

  const handleDeleteStoryConfirm = (idToDelete: string) => {
    const remaining = managerStories.filter(s => s.id !== idToDelete);
    setManagerStories(remaining);
    if (selectedStoryId === idToDelete) {
      setSelectedStoryId(remaining.length > 0 ? remaining[0].id : null);
    }
    setDeleteConfirmId(null);
  };

  const handleMoveUp = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx === 0) return;
    setManagerStories(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const handleMoveDown = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx === managerStories.length - 1) return;
    setManagerStories(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0B132B]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-5xl w-full bg-white dark:bg-[#1E293B] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header bar */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50 dark:bg-[#111A2E]/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/10 rounded-lg text-[#0D5BFF]">
                <Settings className="w-5 h-5" />
              </span>
              <h2 className="text-sm font-black text-[#0B132B] dark:text-white uppercase tracking-wider">
                Manage Success Stories (Live Editor)
              </h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Add, update, or reorder client testimonies and tutor feedback featured on the home screen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Bento Style Two Column layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-5">
          {/* Left Column: Story List Selector & Import Tab */}
          <div className="col-span-2 border-r border-slate-100 dark:border-slate-800/60 p-6 overflow-y-auto flex flex-col justify-between bg-slate-50/40 dark:bg-[#111A2E]/20">
            <div className="space-y-4">
              {/* Segmented Control Tab Bar */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeTab === "list"
                      ? "bg-white dark:bg-slate-700 text-[#0D5BFF] dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Featured List ({managerStories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("import")}
                  className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    activeTab === "import"
                      ? "bg-white dark:bg-slate-700 text-[#0D5BFF] dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Import User Reviews ({sessionCandidates.length})
                </button>
              </div>

              {activeTab === "list" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Featured Stories ({managerStories.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateNewStory}
                      className="flex items-center gap-1 bg-blue-500/10 text-[#0D5BFF] dark:text-blue-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-blue-500/15 hover:bg-[#0D5BFF] hover:text-white transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  </div>

                  {managerStories.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Quote className="w-8 h-8 mx-auto opacity-20 mb-2 rotate-180" />
                      <p className="text-[10px] font-black uppercase tracking-wide">No stories defined.</p>
                      <p className="text-[9px] font-bold mt-1">Click "+ Add New" to start building one!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                      {managerStories.map((story, idx) => {
                        const isSelected = story.id === selectedStoryId;
                        return (
                          <div
                            key={`${story.id || 'story'}-${idx}`}
                            onClick={() => {
                              setSelectedStoryId(story.id);
                              setDeleteConfirmId(null);
                            }}
                            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-[#0D5BFF]/5 dark:bg-[#0D5BFF]/10 border-[#0D5BFF]/40 shadow-sm"
                                : "bg-white dark:bg-[#1E293B]/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 border-slate-100 dark:border-slate-800/50"
                            } ${story.showOnHomePage === false ? "opacity-75 border-dashed" : ""}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                              {story.avatar ? (
                                <img
                                  src={story.avatar}
                                  alt=""
                                  className="w-9 h-9 rounded-full object-cover border border-slate-100 dark:border-slate-800 shadow-sm shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[10px] text-slate-500 shrink-0">
                                  {story.author ? story.author[0] : "S"}
                                </div>
                              )}
                              <div className="overflow-hidden flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-black text-[#0B132B] dark:text-white uppercase truncate">
                                    {story.author || "Unnamed Author"}
                                  </h4>
                                  {story.showOnHomePage === false ? (
                                    <span title="Hidden from landing page">
                                      <EyeOff className="w-3 h-3 text-red-400 shrink-0" />
                                    </span>
                                  ) : (
                                    <span title="Active on landing page">
                                      <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] font-black text-[#0D5BFF] uppercase truncate mt-0.5">
                                  {story.role || "Guardian"}
                                </p>
                              </div>
                            </div>

                            {/* Reordering / Edit controls */}
                            {deleteConfirmId === story.id ? (
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStoryConfirm(story.id)}
                                  className="px-2 py-1 text-[8px] font-black uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white rounded transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 text-[8px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-all cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => handleMoveUp(idx, e)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded transition-all cursor-pointer"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === managerStories.length - 1}
                                  onClick={(e) => handleMoveDown(idx, e)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded transition-all cursor-pointer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(story.id)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === "import" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Real Student Reviews in Database
                    </span>
                  </div>

                  {candidatesLoading ? (
                    <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0D5BFF] mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-wide">Loading Rated Sessions...</p>
                    </div>
                  ) : sessionCandidates.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Quote className="w-8 h-8 mx-auto opacity-20 mb-2 rotate-180" />
                      <p className="text-[10px] font-black uppercase tracking-wide">No reviews found in sessions.</p>
                      <p className="text-[9px] font-bold mt-1">Once students rate their sessions, they will appear here!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {sessionCandidates.map((cand, idx) => {
                        const isAlreadyImported = managerStories.some(s => s.id === cand.id);
                        return (
                          <div
                            key={`${cand.id || 'cand'}-${idx}`}
                            className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#1E293B]/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-left transition-all flex flex-col gap-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {cand.avatar ? (
                                  <img
                                    src={cand.avatar}
                                    alt=""
                                    className="w-7 h-7 rounded-full object-cover shadow-sm shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[9px] text-slate-500 shrink-0">
                                    {cand.author ? cand.author[0] : "S"}
                                  </div>
                                )}
                                <div className="overflow-hidden">
                                  <h4 className="text-[10px] font-black text-[#0B132B] dark:text-white uppercase truncate">
                                    {cand.author}
                                  </h4>
                                  <p className="text-[8px] font-bold text-[#0D5BFF] uppercase truncate mt-0.5">
                                    {cand.role}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                {Array.from({ length: cand.rating }).map((_, i) => (
                                  <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400 italic line-clamp-2 leading-relaxed">
                              "{cand.quote}"
                            </p>
                            <button
                              type="button"
                              disabled={isAlreadyImported}
                              onClick={() => handleImportCandidate(cand)}
                              className={`w-full py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                                isAlreadyImported
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                                  : "bg-[#0D5BFF] hover:bg-blue-700 text-white shadow-sm"
                              }`}
                            >
                              {isAlreadyImported ? "Already Featured" : "Import & Feature on Homepage"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onSave(managerStories)}
                className="w-full flex items-center justify-center gap-2 bg-[#0D5BFF] hover:bg-[#0047E0] disabled:bg-[#0D5BFF]/50 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer select-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Live...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save All Changes Live
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Add/Edit Details Form */}
          <div className="col-span-3 p-8 overflow-y-auto bg-white dark:bg-[#1E293B]">
            {selectedStory ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                    Edit Testimony Parameters
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Live changes made to this form are temporarily stored in list memory. Click "Save All Changes Live" on the left panel to persist them.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Author Name */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      Author Full Name
                    </label>
                    <input
                      type="text"
                      value={formAuthor}
                      onChange={(e) => {
                        setFormAuthor(e.target.value);
                        setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, author: e.target.value } : s));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111A2E]/40 text-xs font-bold focus:border-[#0D5BFF] focus:outline-none dark:text-white"
                      placeholder="e.g. Farhan Ahmed"
                    />
                  </div>

                  {/* Role / Subtitle */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      Role / Subtitle / Title
                    </label>
                    <input
                      type="text"
                      value={formRole}
                      onChange={(e) => {
                        setFormRole(e.target.value);
                        setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, role: e.target.value } : s));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111A2E]/40 text-xs font-bold focus:border-[#0D5BFF] focus:outline-none dark:text-white"
                      placeholder="e.g. Parent of Grade 10 Student"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      Location / Affiliation
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => {
                        setFormLocation(e.target.value);
                        setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, location: e.target.value } : s));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111A2E]/40 text-xs font-bold focus:border-[#0D5BFF] focus:outline-none dark:text-white"
                      placeholder="e.g. Gulshan, Dhaka"
                    />
                  </div>

                  {/* Badge Choice */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      Verification Badge
                    </label>
                    <select
                      value={formBadge}
                      onChange={(e) => {
                        setFormBadge(e.target.value);
                        setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, badge: e.target.value } : s));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111A2E]/40 text-xs font-bold focus:border-[#0D5BFF] focus:outline-none dark:text-white cursor-pointer"
                    >
                      <option value="none">Platform Ambassador (Default)</option>
                      <option value="verified_match">Real Match Review (Green Badge)</option>
                      <option value="verified_member">Verified Member (Blue Badge)</option>
                      <option value="ambassador">Platform Ambassador (Purple Badge)</option>
                    </select>
                  </div>
                </div>

                {/* Rating selection */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                    Rating Count (1 to 5 Stars)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => {
                          setFormRating(stars);
                          setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, rating: stars } : s));
                        }}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          formRating === stars
                            ? "bg-amber-500/10 border-amber-500 text-amber-500"
                            : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-slate-50/20 dark:bg-[#111A2E]/20 text-slate-400"
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {stars}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Landing Page Visibility Toggle */}
                <div className="p-4 bg-slate-50/50 dark:bg-[#111A2E]/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#0B132B] dark:text-white block">
                      Featured on Homepage landing
                    </label>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                      Toggle whether this success story is visible to visitors on the landing page.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formShowOnHomePage}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormShowOnHomePage(checked);
                        setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, showOnHomePage: checked } : s));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0D5BFF]"></div>
                  </label>
                </div>



                {/* Quote / Testimony Message */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      Testimony / Quote Paragraph
                    </label>
                    <span className="text-[8.5px] font-mono font-bold text-slate-400">
                      {formQuote.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={formQuote}
                    onChange={(e) => {
                      setFormQuote(e.target.value);
                      setManagerStories(prev => prev.map(s => s.id === selectedStoryId ? { ...s, quote: e.target.value } : s));
                    }}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111A2E]/40 text-xs font-bold focus:border-[#0D5BFF] focus:outline-none dark:text-white leading-relaxed resize-none"
                    placeholder="Type the customer success story text..."
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Settings className="w-10 h-10 text-slate-200 dark:text-slate-800 mb-4 animate-spin-slow" />
                <p className="text-xs font-black uppercase tracking-wider">No story selected</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold max-w-xs mt-1 uppercase tracking-wide">
                  Select an existing testimonial card from the left panel to edit its details, or click "+ Add New" to write a fresh story.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const FAQAccordionList = () => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const faqs = [
    {
      q: "Is EduTrack free to join for guardians and parents?",
      a: "Absolutely. Guardians can search, filter, and message verified tutors completely free of charge. There are no hidden matching fees or registration costs."
    },
    {
      q: "How does the manual NID & Academic verification work?",
      a: "Every tutor must upload their official National ID card and Student ID. Our verification department manually confirms their academic standing and identity through institutional cross-checks within 24 hours."
    },
    {
      q: "Can we request a trial class before long-term commitment?",
      a: "Yes, we highly encourage a 1-day trial class. This lets parents evaluate the teacher's tutoring style and communication skills before formalizing a full monthly schedule."
    },
    {
      q: "Is the live GPS transit tracking secure for tutors?",
      a: "Security is reciprocal. Live location tracking only activates when a tutor marks their transit status 'on the way' to an active class log, and is shared exclusively with the matched parent's dashboard, automatically self-terminating upon session clock-in."
    },
    {
      q: "How does bKash billing and class tracking work?",
      a: "Tutors submit digital class logs with specific topics, duration, and coordinates after each session. Once the parent approves, they can seamlessly pay the calculated class salary via our integrated bKash Gateway, ensuring a zero-hassle experience."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div 
            key={idx} 
            className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-[#1E293B]/20 hover:bg-white dark:hover:bg-[#1E293B]/40 transition-all duration-300"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left select-none focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-[#0D5BFF] shrink-0" />
                <span className="text-sm font-black text-[#0B132B] dark:text-white uppercase tracking-wide">
                  {faq.q}
                </span>
              </div>
              <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <div className="px-6 pb-6 pt-1 text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed border-t border-slate-100/50 dark:border-slate-800/40">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

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

const TutorPreviewCard = React.memo(({ 
  tutor, 
  isFavorite, 
  onToggleFavorite 
}: { 
  tutor: any; 
  isFavorite: boolean; 
  onToggleFavorite: () => void; 
}) => {
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
      onMouseEnter={() => prefetchPage('TeacherProfile')}
      onFocus={() => prefetchPage('TeacherProfile')}
      className="bg-[#F8F9FA] dark:bg-[#1E293B]/40 rounded-[2.5rem] p-4 border border-slate-100 dark:border-slate-800/80 hover:border-[#0D5BFF]/30 dark:hover:border-[#0D5BFF]/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-2xl hover:-translate-y-2.5 hover:scale-[1.015] active:scale-[0.985] transition-all duration-500 group flex flex-col justify-between h-full"
    >
      <div>
        <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
          {img ? (
            <img src={img} alt={name} className="w-full h-full object-cover grayscale blur-[12px] group-hover:blur-0 scale-105 group-hover:scale-100 transition-all duration-500" referrerPolicy="no-referrer" loading="lazy" />
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

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute top-4 right-16 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2 rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all text-rose-500 hover:text-rose-600 focus:outline-none z-10 cursor-pointer flex items-center justify-center"
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart className={`w-3.5 h-3.5 transition-colors duration-300 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500'}`} />
          </button>

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
