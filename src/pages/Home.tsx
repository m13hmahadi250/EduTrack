import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
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
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import heroImage from '../assets/images/regenerated_image_1778584226799.png';

export default function Home() {
  return (
    <div className="bg-[#F8F9FA] text-[#0B132B] font-sans selection:bg-[#0D5BFF] selection:text-white">
      {/* Hero Section - Magazine Style */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-white">
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
              <div className="inline-flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D5BFF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D5BFF]"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0D5BFF]">Live in Bangladesh</span>
              </div>
              
              <h1 className="text-[3rem] sm:text-[6rem] lg:text-[7.5rem] font-black font-heading leading-[0.9] sm:leading-[0.82] tracking-[-0.04em] mb-8 uppercase">
                <span className="block text-[#0B132B] opacity-90">Expert</span>
                <span className="block text-[#0D5BFF] italic">Education</span>
                <span className="block text-[#0B132B] -mt-2">At Home</span>
              </h1>
              
              <p className="text-xl text-[#4B5563] mb-10 leading-relaxed font-bold max-w-lg">
                The most secure home tutoring platform. <span className="text-[#0B132B]">Real-time GPS tracking</span>, <span className="text-[#0B132B]">NID verified teachers</span>, and seamless payments for your child's future.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                <Link to="/signup" className="group w-full sm:w-auto px-10 py-5 bg-[#0D5BFF] text-white font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-blue-700 transition-all shadow-[0_20px_40px_-15px_rgba(13,91,255,0.4)] text-center flex items-center justify-center">
                  Find a Tutor <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-transparent text-[#0B132B] border-2 border-[#0B132B] font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-[#0B132B] hover:text-white transition-all text-center">
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
              <div className="relative z-10 rounded-[3rem] overflow-hidden border-[12px] border-white shadow-2xl rotate-2">
                <img 
                  src={heroImage} 
                  alt="Education" 
                  className="w-full h-[600px] object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 z-20 max-w-xs -rotate-3">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-[#0B132B] text-lg leading-tight uppercase">Verified Quality</h3>
                </div>
                <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">100% of our tutors are manually verified by NID and certificates.</p>
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(idx => (
                    <div key={idx} className="w-10 h-10 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                       <img src={`https://i.pravatar.cc/100?u=${idx}`} alt="user" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                    +2k
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section - Visible Grid Style */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">Safety First</h2>
            <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] uppercase italic">
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

      {/* Detailed Features - Horizontal Alternating */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1 - GPS */}
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <div className="inline-block p-4 bg-rose-50 rounded-2xl mb-8">
                <MapPin className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-black font-heading text-[#0B132B] uppercase mb-8 leading-[0.9] italic">
                Real-Time <span className="text-rose-500">Security</span> <br /> In Your Pocket
              </h2>
              <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed max-w-lg">
                Never wonder where the tutor is. Our platform integrates real-time GPS tracking, allowing parents to monitor arrival, session duration, and departure directly from the dashboard.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="border-l-4 border-rose-500 pl-4">
                  <div className="text-2xl font-black text-[#0B132B]">Live Map</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active during transit</p>
                </div>
                <div className="border-l-4 border-emerald-500 pl-4">
                  <div className="text-2xl font-black text-[#0B132B]">Geo-Fencing</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Auto session logs</p>
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
              <div className="relative bg-[#0B132B] p-12 rounded-[4rem] shadow-2xl border-2 border-white/10 overflow-hidden transform rotate-2">
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
              <div className="inline-block p-4 bg-emerald-50 rounded-2xl mb-8">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-black font-heading text-[#0B132B] uppercase mb-8 leading-[0.9] italic">
                NID Verified <span className="text-emerald-500">Elite</span> <br /> Educators
              </h2>
              <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed max-w-lg">
                We don't just take anyone. Every tutor undergoes a rigorous 3-step verification process including National ID check, Academic History audit, and a background interview.
              </p>
              <div className="space-y-4">
                {["100% Manual ID Verification", "Academic Certificate Audit", "University ID Confirmation"].map(t => (
                  <div key={t} className="flex items-center space-x-3 text-[#0B132B] font-bold uppercase text-xs tracking-wider">
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
              <div className="relative bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 transform -rotate-2">
                 <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-slate-100">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                       <Users className="w-10 h-10 text-slate-300" />
                    </div>
                    <div>
                       <div className="h-6 w-32 bg-slate-100 rounded-full mb-2"></div>
                       <div className="h-4 w-24 bg-slate-50 rounded-full"></div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">NID Status</span>
                       <span className="text-[10px] font-black text-white bg-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest">Verified</span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Academic Record</span>
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

      {/* Featured Tutors - Bento Grid Style */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">Elite Network</h2>
              <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.9]">
                Featured <span className="text-[#0D5BFF]">Experts</span>
              </h3>
            </div>
            <Link to="/signup" className="text-[#0D5BFF] font-black uppercase text-xs tracking-widest border-b-2 border-[#0D5BFF] pb-1 hover:text-blue-700 hover:border-blue-700 transition-all">
              View All Tutors
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TutorPreviewCard 
              name="Sarah Rahman" 
              uni="University of Dhaka" 
              subj="Physics & Math" 
              rating={4.9} 
              img="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400"
            />
             <TutorPreviewCard 
              name="Adnan Sami" 
              uni="BUET" 
              subj="Computer Science" 
              rating={5.0} 
              img="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
            />
             <TutorPreviewCard 
              name="Nadia Islam" 
              uni="NSU" 
              subj="English Literature" 
              rating={4.8} 
              img="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400"
            />
          </div>
        </div>
      </section>

      {/* How it Works - Modern Step Layout */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-sm font-black text-[#0D5BFF] uppercase tracking-[0.3em] mb-4">The Process</h2>
              <h3 className="text-4xl lg:text-5xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.9]">
                How EduTrack <span className="text-[#0D5BFF]">Works</span>
              </h3>
            </div>
            <p className="text-slate-500 font-bold max-w-sm lg:text-right">
              A seamless journey from finding the right teacher to tracking progress in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection Line (Hidden on Mobile) */}
            <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-slate-200 z-0"></div>
            
            <Step 
              number="01" 
              title="Search" 
              desc="Browse verified tutors nearby using our advanced filters for subject and location." 
            />
            <Step 
              number="02" 
              title="Connect" 
              desc="Message tutors directly to discuss schedules, requirements, and trial classes." 
            />
            <Step 
              number="03" 
              title="Track" 
              desc="Monitor live GPS location of the tutor during their transit to your home." 
            />
            <Step 
              number="04" 
              title="Pay" 
              desc="Securely pay via bKash through our automated billing system after each session." 
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24">
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
                 <Link to="/signup" className="w-full sm:w-auto px-12 py-5 bg-white text-[#0B132B] font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-slate-50 transition-all text-center">
                   Learn More
                 </Link>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white border-t border-slate-100 py-16 px-4 md:px-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-2xl font-black text-[#0B132B] uppercase italic mb-6">EduTrack</h4>
            <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-6">
              The premier platform for secure, verified home tutoring in Bangladesh. Built with safety and excellence at its core.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#0D5BFF] hover:border-[#0D5BFF] transition-all cursor-pointer">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#0D5BFF] hover:border-[#0D5BFF] transition-all cursor-pointer">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] uppercase tracking-[0.2em] mb-6">Quick Links</h5>
            <ul className="space-y-4">
              <li><Link to="/signup" className="text-slate-500 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Find a Tutor</Link></li>
              <li><Link to="/signup" className="text-slate-500 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Join as Tutor</Link></li>
              <li><Link to="/login" className="text-slate-500 hover:text-[#0D5BFF] transition-all text-sm font-bold uppercase">Login</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black text-[#0B132B] uppercase tracking-[0.2em] mb-6">Contact</h5>
            <p className="text-slate-500 text-sm font-bold uppercase mb-2">Chattogram, Bangladesh</p>
            <p className="text-[#0D5BFF] text-sm font-bold uppercase">m13hmahadi@gmail.com</p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} EduTrack. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-300 uppercase italic">Designed & Built by</span>
            <span className="text-[10px] font-black text-[#0B132B] uppercase italic">Mohammed Mahadi Hossain</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-[#F8F9FA] hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-2xl transition-all duration-500">
      <div className="mb-6 p-4 bg-white shadow-sm border border-slate-50 inline-block rounded-2xl text-[#0D5BFF] transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-2xl font-black font-heading text-[#0B132B] mb-4 uppercase tracking-tight italic">{title}</h4>
      <p className="text-slate-500 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}

function StatBlock({ value, label }: { value: string, label: string }) {
  return (
    <div className="p-8 border-r border-slate-100 last:border-0 flex flex-col justify-center items-center text-center">
       <div className="text-4xl lg:text-5xl font-black font-heading text-[#0D5BFF] mb-2">{value}</div>
       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0B132B]">{label}</div>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left group">
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-100 shadow-sm mb-6 group-hover:border-[#0D5BFF] group-hover:shadow-xl transition-all duration-300">
        <span className="text-2xl font-black font-heading text-[#0B132B] italic">{number}</span>
      </div>
      <h4 className="text-xl font-black text-[#0B132B] mb-2 uppercase italic">{title}</h4>
      <p className="text-sm font-medium text-slate-500 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

function TutorPreviewCard({ name, uni, subj, rating, img }: { name: string, uni: string, subj: string, rating: number, img: string }) {
  return (
    <div className="bg-[#F8F9FA] rounded-[2.5rem] p-4 border border-slate-100 hover:border-[#0D5BFF]/30 hover:shadow-2xl transition-all duration-500 group">
      <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
        <img src={img} alt={name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-black text-[#0B132B]">{rating}</span>
        </div>
      </div>
      <div className="px-2 pb-4">
        <h4 className="text-xl font-black text-[#0B132B] uppercase italic mb-1">{name}</h4>
        <p className="text-[10px] font-black text-[#0D5BFF] uppercase tracking-widest mb-3">{uni}</p>
        <div className="flex items-center text-xs font-bold text-slate-500">
          <BookOpen className="w-3 h-3 mr-2" />
          {subj}
        </div>
      </div>
    </div>
  );
}
