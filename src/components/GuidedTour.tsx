import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  MapPin, 
  MessageSquare, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Play, 
  CheckCircle2, 
  Search, 
  Award,
  BellRing
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GuidedTour() {
  const { currentUser, updateUser } = useAppStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if the user needs to see the tour on first login
  useEffect(() => {
    if (currentUser && currentUser.showTour === true) {
      const tourCompletedKey = `edutrack_tour_completed_${currentUser.id}`;
      const isCompleted = localStorage.getItem(tourCompletedKey);
      if (!isCompleted) {
        // Trigger with a tiny delay for visual entry comfort
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 2200);
        return () => clearTimeout(timer);
      }
    } else {
      setIsOpen(false);
    }
  }, [currentUser]);

  // Listen to a custom global event to trigger the tour manually
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('start-edutrack-tour', handleStartTour);
    return () => window.removeEventListener('start-edutrack-tour', handleStartTour);
  }, []);

  if (!currentUser) return null;

  const handleComplete = () => {
    const tourCompletedKey = `edutrack_tour_completed_${currentUser.id}`;
    localStorage.setItem(tourCompletedKey, 'true');
    setIsOpen(false);
    
    // Update Firestore to disable auto-tour permanently for this account
    if (currentUser.showTour === true) {
      updateUser(currentUser.id, { showTour: false });
    }
  };

  const steps = [
    {
      title: "Welcome to EduTrack Bangladesh!",
      subtitle: "NID-VERIFIED TUTORING REVOLUTION",
      description: "Welcome to Bangladesh's premium ledger-backed tutoring network. Let us show you around so you can connect, chat, and learn securely in 4 painless steps.",
      icon: Compass,
      color: "from-blue-500 via-[#0D5BFF] to-indigo-600",
      content: (
        <div className="space-y-4 font-sans text-left">
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-[1.8rem] border border-blue-100/40 dark:border-blue-900/40 text-slate-800 dark:text-slate-300">
            <p className="text-[10px] uppercase font-black tracking-widest text-[#0D5BFF] mb-1">🔥 THE LEDGER ADVANTAGE</p>
            <p className="text-xs leading-relaxed font-medium">
              EduTrack Bangladesh bridges the gap between ambitious students and elite educators. Gain direct access to verified tutors from the nation’s leading public and private universities, including BUET, DU, CUET, CU, and IIUC etc.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black text-rose-500 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/10">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>CRITICAL SECURITY: EVERY TUTOR PROFILE IS HARDWARE-VERIFIED AGAINST GOVERNMENT NID AND ACADEMIC TRANSCRIPTS.</span>
          </div>
        </div>
      ),
      actionLabel: "Start Experience Walkthrough",
      action: () => setCurrentStep(1)
    },
    {
      title: "Secure Tutor Finder",
      subtitle: "DISCOVER MATCHING ACADEMIC MENTORS",
      description: "Find qualified academic tutors aligned to your curriculum requirements using our state-of-the-art interactive map search and criteria selector.",
      icon: Search,
      color: "from-[#0D5BFF] to-cyan-500",
      content: (
        <div className="space-y-4 font-sans text-left">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[18px] block mb-1">🎯</span>
              <span className="text-[9px] font-black uppercase text-[#0B132B] dark:text-slate-300 block">Class Filters</span>
              <span className="text-[8px] font-medium text-slate-400 block mt-1">Filter classes instantly from Play to HSC levels.</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[18px] block mb-1">🛡️</span>
              <span className="text-[9px] font-black uppercase text-[#0B132B] dark:text-slate-300 block">Institution</span>
              <span className="text-[8px] font-medium text-slate-400 block mt-1">Direct verification of BUET, DU & DM graduates.</span>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500 font-medium bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            💡 <span className="font-bold text-slate-700 dark:text-slate-300">Tutor Cards:</span> Look for cards with the double check ledger badge, providing NID-verified state credentials.
          </p>
          <div className="text-center pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/');
              }}
              className="text-[9px] font-black uppercase tracking-wider text-[#0D5BFF] hover:underline"
            >
              Take me to Tutor Finder ↗
            </button>
          </div>
        </div>
      ),
      actionLabel: "Next: Live Messaging Network",
      action: () => setCurrentStep(2)
    },
    {
      title: "Instant Secure Messaging",
      subtitle: "COMMUNICATE DIRECTLY WITH EXPERT TUTORS",
      description: "Chat in real-time with tutors. Agree on salary, daily hours, and days per week with absolute transparency.",
      icon: MessageSquare,
      color: "from-cyan-500 to-emerald-500",
      content: (
        <div className="space-y-4 font-sans text-left">
          <div className="bg-slate-900 text-slate-300 p-4 rounded-[1.8rem] border border-slate-800 font-sans relative overflow-hidden">
            <p className="text-[7px] font-black uppercase tracking-wider text-[#0D5BFF] mb-2">SECURE ENDPOINT ACTIVE</p>
            <div className="space-y-2 text-[10px]">
              <div className="flex items-start gap-2">
                <span className="text-[#0D5BFF] font-black">Parent:</span>
                <span className="italic text-slate-400">"Is your NID verified code available?"</span>
              </div>
              <div className="flex items-start gap-2 border-t border-slate-800 pt-2">
                <span className="text-emerald-400 font-black">Tutor:</span>
                <span className="italic text-slate-300">"Yes, my verified ledger badge is active on my public profile page."</span>
              </div>
            </div>
            <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
            Tutors can request live session scheduling directly in the messaging screen! Once approved, parents can clear safe escrows securely.
          </p>
          <div className="text-center pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/messages');
              }}
              className="text-[9px] font-black uppercase tracking-wider text-emerald-500 hover:underline"
            >
              Open Messaging Hub ↗
            </button>
          </div>
        </div>
      ),
      actionLabel: "Next: Live Location Track",
      action: () => setCurrentStep(3)
    },
    {
      title: "Real-time Location Track",
      subtitle: "SAFEGUARD TRAVEL SCHEDULES AND INITIATE SECURE ESCROW",
      description: "Track your private lessons with live map telemetry. Perfect safety, perfect accuracy.",
      icon: MapPin,
      color: "from-emerald-500 to-indigo-600",
      content: (
        <div className="space-y-4 font-sans text-left">
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/40 dark:border-emerald-900/40 rounded-[1.8rem] text-slate-800 dark:text-slate-300">
            <p className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">🗺️ DYNAMIC GEOLOCATION</p>
            <p className="text-xs leading-relaxed font-medium">
              See the exact location of your assigned tutor on the interactive map during current session transits. Rest assured with extreme transparency.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <span className="text-base">💳</span>
              <div>
                <span className="text-[9px] font-black uppercase text-[#0B132B] dark:text-slate-300 block">Bksh / Nagad</span>
                <span className="text-[8px] font-medium text-slate-400 block">Seamless secure payments.</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <span className="text-base">📅</span>
              <div>
                <span className="text-[9px] font-black uppercase text-[#0B132B] dark:text-slate-300 block">Calender Slots</span>
                <span className="text-[8px] font-medium text-slate-400 block">Custom dynamic routines.</span>
              </div>
            </div>
          </div>
        </div>
      ),
      actionLabel: "Complete Guided Setup",
      action: handleComplete
    }
  ];

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          id="guided-tour-overlay" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100000] flex items-center justify-center p-4 font-sans"
        >
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -30 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-[#0B132B] text-slate-800 dark:text-white rounded-[2.8rem] w-full max-w-lg p-8 sm:p-10 border border-slate-100 dark:border-slate-800/80 shadow-[0_24px_80px_rgba(0,0,0,0.4)] relative overflow-hidden"
          >
          {/* Top colored accent line glow */}
          <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${step.color}`}></div>
          
          {/* Dismiss button */}
          <button
            onClick={handleComplete}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-100 dark:border-slate-800"
            title="Skip Tour"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon with surrounding visual accent circles */}
          <div className="flex justify-center mb-6 mt-2">
            <div className={`relative p-5 rounded-[2rem] bg-gradient-to-tr ${step.color} text-white shadow-xl flex items-center justify-center`}>
              <StepIcon className="w-8 h-8 animate-pulse" />
              <div className="absolute inset-0 bg-white/10 rounded-[2rem] scale-110 blur-md -z-10 animate-ping opacity-50"></div>
            </div>
          </div>

          {/* Stepper info indicators */}
          <div className="text-center space-y-2 mb-6">
            <span className={`text-[8px] font-black uppercase tracking-[0.25em] bg-gradient-to-r ${step.color} bg-clip-text text-transparent px-3 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-full border border-slate-100 dark:border-slate-800/40`}>
              {step.subtitle}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white tracking-tight leading-tight mt-1">
              {step.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
              {step.description}
            </p>
          </div>

          {/* Dynamic Content */}
          <div className="mb-8" id={`guided-tour-step-${currentStep}-inner`}>
            {step.content}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-6">
            <div className="flex items-center justify-between">
              {/* Stepper dot indicators */}
              <div className="flex items-center gap-2">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentStep 
                        ? `w-7 bg-gradient-to-r ${step.color}` 
                        : "w-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              {/* Next and Previous quick controls */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 hover:text-slate-700 dark:hover:text-amber-50 flex items-center justify-center transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={step.action}
                  className={`px-6 h-11 bg-gradient-to-r ${step.color} hover:shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2.5 shadow-md justify-center cursor-pointer`}
                >
                  <span>{step.actionLabel}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Helper footer */}
            <div className="flex items-center justify-between text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">
              <span>Secure verified onboarding flow</span>
              <span>Step {currentStep + 1} of {steps.length}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
