import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
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
  DollarSign
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

export default function TeacherProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);
  
  const [tutor, setTutor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Fallback Mock data mapping if firebase doesn't have it or we match a mock id
  const fallbackList = [
    {
      id: 'mock-sarah',
      name: "Sarah Rahman",
      role: 'tutor',
      university: "University of Dhaka",
      course: "B.Sc. in Physics",
      subjects: ["Physics", "Math", "Further Mathematics"],
      classes: ["Class 9", "Class 10", "HSC Level"],
      rating: 4.9,
      totalRatings: 18,
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
      hourlyRate: 800,
      daysPerWeek: 3,
      district: "Dhaka",
      area: "Dhanmondi",
      thana: "Dhanmondi Thana",
      phone: "+8801755123456",
      email: "sarah.rahman.du@gmail.com",
      bio: "Dedicated Physics undergraduate at University of Dhaka with 3+ years of experience helping students break down complex physical sciences into simple, intuitive mechanical steps. Specializes in HSC board preparation.",
      isVerified: true,
      experience: "3 Years in Dhanmondi area",
      availabilitySlots: {
        "Saturday": ["04:00 PM - 06:00 PM"],
        "Monday": ["04:00 PM - 06:00 PM"],
        "Wednesday": ["06:00 PM - 08:00 PM"]
      }
    },
    {
      id: 'mock-adnan',
      name: "Adnan Sami",
      role: 'tutor',
      university: "BUET",
      course: "B.Sc. in Computer Science & Engineering",
      subjects: ["ICT", "Programming", "Math", "Computer Science"],
      classes: ["Class 8", "HSC Level", "Admission Candidates"],
      rating: 5.0,
      totalRatings: 32,
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
      hourlyRate: 1200,
      daysPerWeek: 2,
      district: "Dhaka",
      area: "Bakhshibazar",
      thana: "Lalbagh",
      phone: "+8801811987654",
      email: "adnan.sami.cse@buet.ac.bd",
      bio: "BUET CSE student passionate about coding, algorithms, and high-school ICT courses. Offers hands-on coding exercises, rigorous structural preparation, and strategic exam tricks for securing highest marks.",
      isVerified: true,
      experience: "4 Years coaching and private tuition",
      availabilitySlots: {
        "Sunday": ["05:00 PM - 07:00 PM"],
        "Tuesday": ["05:00 PM - 07:00 PM"]
      }
    },
    {
      id: 'mock-nadia',
      name: "Nadia Islam",
      role: 'tutor',
      university: "North South University (NSU)",
      course: "B.A. in English Literature",
      subjects: ["English Literature", "Grammar", "IELTS Prep", "Spoken English"],
      classes: ["Class 6", "Class 10", "O/A Levels", "IELTS aspirants"],
      rating: 4.8,
      totalRatings: 14,
      profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400",
      hourlyRate: 700,
      daysPerWeek: 4,
      district: "Dhaka",
      area: "Gulshan",
      thana: "Gulshan Thana",
      phone: "+8801911456123",
      email: "nadia.islam.nsu@outlook.com",
      bio: "Gold Medalist from English department NSU. Highly skilled in customized curriculum planning, communicative language teaching, writing mechanics, and preparation for Cambridge O/A-level curricula.",
      isVerified: true,
      experience: "2 Years at International School Prep",
      availabilitySlots: {
        "Monday": ["03:00 PM - 05:00 PM"],
        "Tuesday": ["03:00 PM - 05:00 PM"],
        "Thursday": ["03:00 PM - 05:00 PM"],
        "Friday": ["09:00 AM - 11:30 AM"]
      }
    },
    {
      id: 'mock-sajid',
      name: "Sajid Hasan",
      role: 'tutor',
      university: "IUT",
      course: "B.Sc. in Mechanical Engineering",
      subjects: ["Chemistry", "Analytical Mechanics", "Higher Mathematics"],
      classes: ["Class 9", "Class 10", "HSC Level"],
      rating: 4.9,
      totalRatings: 9,
      profileImage: undefined,
      hourlyRate: 600,
      daysPerWeek: 3,
      district: "Gazipur",
      area: "Board Bazar",
      thana: "Joydebpur",
      phone: "+8801511234789",
      email: "sajid.hasan.iut@gmail.com",
      bio: "Senior level Mechanical Engineering student at Islamic University of Technology. Focused on concept building over rote learning. Teaches physical and analytical chemistry with real-world mechanical diagrams.",
      isVerified: false,
      experience: "1.5 Years tutoring experience",
      availabilitySlots: {
        "Saturday": ["06:00 PM - 08:00 PM"],
        "Sunday": ["06:00 PM - 08:00 PM"],
        "Wednesday": ["06:00 PM - 08:00 PM"]
      }
    }
  ];

  // Check if current reader is a verified student
  // Active/valid student means roles includes 'student' (or we check if currentUser exists and is any student role)
  const isVerifiedStudent = currentUser && (currentUser.role === 'student' || currentUser.role === 'admin');

  useEffect(() => {
    let active = true;
    const fetchTutorDetails = async () => {
      if (!id) return;
      
      // First check if it matches a mock tutor
      const mockMatch = fallbackList.find(item => item.id === id);
      if (mockMatch) {
        setTutor(mockMatch);
        setLoading(false);
        return;
      }

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (active) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.role === 'tutor') {
              setTutor({ id: docSnap.id, ...data });
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const initDirectChat = () => {
    if (!currentUser) {
      navigate('/login');
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
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed uppercase">
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

  return (
    <div className="bg-[#F8F9FA] dark:bg-[#0B132B] text-[#0B132B] dark:text-slate-100 font-sans min-h-screen pb-24 selection:bg-[#0D5BFF] selection:text-white" id={`teacher-profile-root-${tutor.id}`}>
      
      {/* Top Banner & Navigation */}
      <div className="bg-white dark:bg-[#111A2E] border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-45 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-[#0D5BFF] transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>EduTrack Directory</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-[#0D5BFF] border border-blue-100 dark:border-blue-900/30">
              {tutor.isVerified ? "🔒 Verified Ledger Verified" : "📜 Public Listing"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Banner Card */}
        <div className="relative h-60 bg-gradient-to-r from-slate-900 to-[#0B132B] rounded-[2.5rem] overflow-hidden shadow-2xl p-8 mb-8 border border-white/5 flex items-end">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#0D5BFF_1.5px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="absolute right-10 top-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6 w-full">
            
            {/* Direct Avatar placement */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-white dark:bg-slate-800 border-4 border-white dark:border-[#111A2E] overflow-hidden shadow-xl shrink-0 -mb-16 md:-mb-20 z-20 flex items-center justify-center">
              {tutor.profileImage ? (
                <img src={tutor.profileImage} alt={tutor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0D5BFF] to-blue-400 flex items-center justify-center text-white font-black italic text-4xl">
                  {tutor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-grow text-white space-y-2 md:pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight italic">{tutor.name}</h1>
                {tutor.isVerified && (
                  <ShieldCheck className="w-7 h-7 text-emerald-400 fill-emerald-500/15" />
                )}
              </div>
              <p className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                {tutor.university || 'Certified Academic Mentor'} • {tutor.course || 'Expert Department'}
              </p>
            </div>

            {/* Float Stars Rating */}
            <div className="md:pb-4 self-end flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-sm select-none">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-white">{Number(tutor.rating || 5.0).toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 font-bold">({tutor.totalRatings || 12} Reviews)</span>
            </div>

          </div>
        </div>

        {/* Outer details split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 md:pt-12">
          
          {/* Main Info Column (Left 8 columns on large screens) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Segment: Overview Bio */}
            <div className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-4 transition-colors">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0D5BFF]" />
                <span>Biography & Vision</span>
              </h3>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 italic leading-relaxed font-medium">
                "{tutor.bio || `${tutor.name} is a highly regarded member of the EduTrack mentorship platform, having dedicated extensive study parameters and practical teaching methodology to secure outstanding student results.`}"
              </p>
              
              {tutor.experience && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Experience Level</span>
                    <span className="text-xs font-black text-[#0B132B] dark:text-white uppercase">{tutor.experience}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Segment: Class & Subject expertise parameters */}
            <div className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0D5BFF]" />
                <span>Expertise Settings</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Subjects */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Subjects Certified</span>
                  <div className="flex flex-wrap gap-2">
                    {tutor.subjects && tutor.subjects.length > 0 ? (
                      tutor.subjects.map((s: string, idx: number) => (
                        <span key={idx} className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-[#0D5BFF] dark:text-blue-300 text-[10px] font-black uppercase rounded-xl border border-blue-100/50 dark:border-blue-900/30 tracking-wider">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 uppercase font-bold italic">See bio for subjects</span>
                    )}
                  </div>
                </div>

                {/* Grade Classes */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classes Offered</span>
                  <div className="flex flex-wrap gap-2">
                    {tutor.classes && tutor.classes.length > 0 ? (
                      tutor.classes.map((c: string, idx: number) => (
                        <span key={idx} className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-300 text-[10px] font-black uppercase rounded-xl border border-purple-100/50 dark:border-purple-900/30 tracking-wider">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 uppercase font-bold italic">All General Grades</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Segment: Availability Slots */}
            <div className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0D5BFF] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0D5BFF]" />
                <span>Availability and Schedules</span>
              </h3>
              
              <div className="bg-slate-50 dark:bg-[#0B132B]/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  These represent the standard weekly time slots configured by {tutor.name}. Exact durations are customized upon conversation.
                </p>

                {tutor.availabilitySlots && Object.keys(tutor.availabilitySlots).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(tutor.availabilitySlots).map(([day, slots]: [string, any]) => (
                      <div key={day} className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white_80">{day}</span>
                        <div className="text-right space-y-1">
                          {slots.map((slot: string, sIdx: number) => (
                            <span key={sIdx} className="inline-block bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400">
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold uppercase italic">No rigid slots configured. Flexible scheduling available.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Area Card (Right 4 columns) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Financials card */}
            <div className="bg-white dark:bg-[#111A2E] rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Standard Remuneration</span>
              
              <div className="flex items-baseline gap-1 text-[#0B132B] dark:text-white">
                <span className="text-2xl font-bold">৳</span>
                <span className="text-5xl font-black italic">{(tutor.hourlyRate || 800).toLocaleString()}</span>
                <span className="text-xs text-slate-400 font-black uppercase tracking-wider ml-1">/ Hour</span>
              </div>

              <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                  <span>Days per Week</span>
                  <span className="font-mono text-[#0B132B] dark:text-white font-black">{tutor.daysPerWeek || 3} Days</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                  <span>Service Zone</span>
                  <span className="text-[#0B132B] dark:text-white font-black flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0D5BFF]" />
                    {tutor.area || 'Dhanmondi'}, {tutor.district || 'Dhaka'}
                  </span>
                </div>
                {tutor.thana && (
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                    <span>Thana Sector</span>
                    <span className="text-slate-400 font-black">{tutor.thana}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Contact Ledger - Security Lockdown Zone */}
            <div className={`rounded-[2.5rem] p-6 border-2 transition-all overflow-hidden relative shadow-xl ${
              isVerifiedStudent 
              ? 'bg-emerald-50/10 border-emerald-500/25 dark:bg-emerald-950/5 dark:border-emerald-500/15' 
              : 'bg-blue-50/10 border-[#0D5BFF]/15 dark:bg-blue-950/5 dark:border-blue-900/20'
            }`}>
              
              {!isVerifiedStudent ? (
                // Lock screen: Guest cannot view.
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] border border-blue-100 dark:border-blue-900/30">
                      <Lock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white">Credentials Locked</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PUBLIC SAFETY PROTOCOL</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-bold">
                    Direct communication ledgers and unmasked credentials remain protected. Only verified students or designated system administrators may interact or view them.
                  </p>

                  <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-3xl space-y-3.5 border border-slate-200/50 dark:border-slate-800/80">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Verify E-Mail Node</span>
                      <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-200 mt-1">{maskEmail(tutor.email)}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Direct Phone Contact</span>
                      <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-200 mt-1">{maskPhone(tutor.phone)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link 
                      to="/login"
                      className="block text-center w-full py-4 bg-[#0D5BFF] hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl shadow-lg shadow-[#0D5BFF]/15 transition-all"
                    >
                      Log In as Student
                    </Link>
                    <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Don't have an account? <Link to="/signup" className="text-[#0D5BFF] hover:underline">Register now</Link>
                    </p>
                  </div>

                </div>
              ) : (
                // Unlocked screen: Verified Student OR Admin can see direct credentials!
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-200 dark:border-emerald-900/40">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Credentials Unlocked</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">STUDENT IDENTITY CONFIRMED</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Unmasked Phone */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Direct Phone Contact</span>
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
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Verified E-Mail Node</span>
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

      </div>

    </div>
  );
}
