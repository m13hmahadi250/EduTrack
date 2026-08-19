import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, Clock, Calendar, Sparkles, Volume2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, User, Session } from '../store';
import { 
  requestPushPermission, 
  getPushPermissionState, 
  dispatchPushNotification, 
  playChimeTone 
} from '../lib/pushNotifications';

interface TutorNotifyMeCardProps {
  tutor: User;
  onRequireAuth?: () => void;
}

export default function TutorNotifyMeCard({ tutor, onRequireAuth }: TutorNotifyMeCardProps) {
  const currentUser = useAppStore(state => state.currentUser);
  const sessions = useAppStore(state => state.sessions);
  const toggleNotifyTutor = useAppStore(state => state.toggleNotifyTutor);
  const sendNotification = useAppStore(state => state.sendNotification);

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isToggling, setIsToggling] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermission(getPushPermissionState());
  }, []);

  const isSubscribed = Boolean(
    currentUser?.notifyTutorIds && Array.isArray(currentUser.notifyTutorIds) && currentUser.notifyTutorIds.includes(tutor.id)
  );

  // Find upcoming scheduled sessions with this tutor for the current student
  const upcomingSessions = sessions
    .filter(s => 
      s.tutorId === tutor.id && 
      (currentUser ? s.studentId === currentUser.id : false) && 
      s.status === 'scheduled' && 
      new Date(s.scheduledTime).getTime() > Date.now()
    )
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  const nextSession: Session | undefined = upcomingSessions[0];

  const handleToggleNotify = async () => {
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setIsToggling(true);

    // Request browser notification permission if not yet decided
    let currentPerm = permission;
    if (currentPerm === 'default') {
      currentPerm = await requestPushPermission();
      setPermission(currentPerm);
    }

    try {
      const willBeSubscribed = await toggleNotifyTutor(tutor.id);
      
      if (willBeSubscribed && currentPerm === 'granted') {
        playChimeTone();
        dispatchPushNotification(`🔔 EduTrack: 30-Min Alerts Active for ${tutor.name}`, {
          body: `You'll get a push notification 30 minutes before every scheduled class starts!`,
          tag: `edutrack-subscribe-${tutor.id}`
        });
      }
    } catch (err) {
      console.error('Error toggling notify me:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestAlert = () => {
    if (permission !== 'granted') {
      requestPushPermission().then(p => {
        setPermission(p);
        if (p === 'granted') {
          triggerTest();
        }
      });
    } else {
      triggerTest();
    }
  };

  const triggerTest = () => {
    setTestSent(true);
    playChimeTone();

    const sampleTime = new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // In-app notification
    if (currentUser) {
      sendNotification(
        currentUser.id,
        '⏰ Class Starting in 30 Minutes! (Demo Test)',
        `Your scheduled class with ${tutor.name} starts at ${sampleTime}. 30-minute pre-class push notification is active!`,
        'warning'
      );
    }

    // Web Push Notification
    dispatchPushNotification(`⏰ Class Starting in 30 Minutes!`, {
      body: `Your scheduled class with ${tutor.name} starts at ${sampleTime}. Tap to prepare!`,
      tag: `edutrack-test-${Date.now()}`
    });

    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-5 border-2 transition-all relative overflow-hidden shadow-lg ${
        isSubscribed 
          ? 'bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-sky-50/80 dark:from-blue-950/40 dark:via-slate-900/60 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/80 shadow-blue-500/5'
          : 'bg-white dark:bg-[#111A2E] border-slate-200/80 dark:border-slate-800'
      }`}
      id={`notify-me-card-${tutor.id}`}
    >
      {/* Ambient background glow if subscribed */}
      {isSubscribed && (
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-400/15 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="relative z-10 space-y-4">
        
        {/* Header Title & Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl transition-colors ${
              isSubscribed 
                ? 'bg-[#0D5BFF] text-white shadow-md shadow-blue-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {isSubscribed ? <BellRing className="w-5 h-5 animate-bounce" /> : <Bell className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0B132B] dark:text-white flex items-center gap-1.5">
                <span>Pre-Class Push Alerts</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-[#0D5BFF] dark:text-blue-300">
                  30m Before
                </span>
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Automated reminders sent before scheduled classes start
              </p>
            </div>
          </div>

          {/* Status Chip */}
          <div className="shrink-0">
            {isSubscribed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Off
              </span>
            )}
          </div>
        </div>

        {/* Next Scheduled Class Info (if any) */}
        {nextSession ? (
          <div className="bg-white/80 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-[#0D5BFF] dark:text-blue-400 font-black">
                <Calendar className="w-3.5 h-3.5" />
                Next Scheduled Class
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                {nextSession.subject}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-[#0B132B] dark:text-white">
              <span>{new Date(nextSession.scheduledTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="font-mono bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded text-[#0D5BFF] dark:text-blue-300">
                {new Date(nextSession.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
              <Clock className="w-3 h-3 text-[#0D5BFF]" />
              <span>
                30-min push alert will fire at{' '}
                <strong className="text-[#0B132B] dark:text-slate-200">
                  {new Date(new Date(nextSession.scheduledTime).getTime() - 30 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Click <strong>Notify Me</strong> to receive a desktop & mobile push notification <strong>30 minutes before</strong> every scheduled tuition class starts with {tutor.name}.
          </p>
        )}

        {/* Primary Action Button */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleToggleNotify}
            disabled={isToggling}
            className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
              isSubscribed
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                : 'bg-[#0D5BFF] hover:bg-blue-600 text-white shadow-blue-500/20'
            }`}
            id={`toggle-notify-btn-${tutor.id}`}
          >
            {isToggling ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isSubscribed ? (
              <>
                <BellOff className="w-4 h-4 text-slate-400" />
                <span>Mute 30m Class Alerts</span>
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4 animate-pulse" />
                <span>🔔 Notify Me (30m Before Class)</span>
              </>
            )}
          </button>

          {/* Test Push Button & Permission Note */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleTestAlert}
              className="text-[9px] font-black uppercase tracking-wider text-[#0D5BFF] hover:underline flex items-center gap-1 py-1 cursor-pointer"
              title="Trigger a test 30-minute notification right now"
              id={`test-alert-btn-${tutor.id}`}
            >
              <Volume2 className="w-3 h-3" />
              <span>{testSent ? '✅ Test Alert Dispatched!' : 'Test Push Alert Now'}</span>
            </button>

            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
              <span>Browser Push & Sound</span>
            </span>
          </div>

          {permission === 'denied' && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[9px] font-medium border border-amber-200 dark:border-amber-900/50">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>Browser notifications are blocked. Please allow notifications in site settings to receive popups.</span>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
