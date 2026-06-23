import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore, ClassLog, User } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  AlertTriangle, 
  User as UserIcon, 
  BookOpen, 
  FileText, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  TrendingUp,
  Award,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClassLogsCalendarProps {
  role: 'student' | 'tutor';
}

export default function ClassLogsCalendar({ role }: ClassLogsCalendarProps) {
  const { 
    currentUser, 
    users, 
    sessions, 
    messages, 
    classLogs, 
    logClass, 
    verifyClass,
    deleteClassLog
  } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    users: state.users,
    sessions: state.sessions,
    messages: state.messages,
    classLogs: state.classLogs || [],
    logClass: state.logClass,
    verifyClass: state.verifyClass,
    deleteClassLog: state.deleteClassLog
  })));

  // States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedClassLog, setSelectedClassLog] = useState<ClassLog | null>(null);

  // Form states for Student marking a class
  const [formTutorId, setFormTutorId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Verification notes for Tutor actions
  const [tutorReplyNotes, setTutorReplyNotes] = useState('');

  // Find class logs registered for the selected date
  const selectedDateLogs = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return classLogs.filter(log => log.date === dateStr);
  }, [selectedDate, classLogs]);

  // Auto-select first log of selected date when date changes or logs sync
  React.useEffect(() => {
    if (selectedDateLogs.length > 0) {
      const belongs = selectedDateLogs.some(log => log.id === selectedClassLog?.id);
      if (!belongs) {
        setSelectedClassLog(selectedDateLogs[0]);
      }
    } else {
      setSelectedClassLog(null);
    }
  }, [selectedDateLogs, selectedClassLog]);

  // Fetch relevant date properties
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Memoized connected users based on active sessions or chat logs
  const connectedUsers = useMemo(() => {
    if (!currentUser) return [];
    if (role === 'student') {
      // Find tutors with sessions or conversations
      const tutorIdsWithSessions = new Set(sessions.map(s => s.tutorId));
      return users.filter(u => u.role === 'tutor' && tutorIdsWithSessions.has(u.id));
    } else {
      // Find students with sessions or conversations
      const studentIdsWithSessions = new Set(sessions.map(s => s.studentId));
      return users.filter(u => u.role === 'student' && studentIdsWithSessions.has(u.id));
    }
  }, [users, sessions, currentUser, role]);

  // Split into active connected and other partners for better dropdown organization
  const { activePartners, otherPartners } = useMemo(() => {
    const oppRole = role === 'student' ? 'tutor' : 'student';
    const oppositeUsers = users.filter(u => u.role === oppRole && !u.isBlocked);
    const connectedSet = new Set(connectedUsers.map(u => u.id));
    
    const active = oppositeUsers.filter(u => connectedSet.has(u.id));
    const others = oppositeUsers.filter(u => !connectedSet.has(u.id));
    return { activePartners: active, otherPartners: others };
  }, [users, connectedUsers, role]);

  // Combined sorted list
  const fallbackUsers = useMemo(() => {
    return [...activePartners, ...otherPartners];
  }, [activePartners, otherPartners]);

  // Generate Calendar Days list for grid
  const calendarCells = useMemo(() => {
    // First day of current month
    const firstDayOfMonth = new Date(year, month, 1);
    // Day of the week representation (0: Sun, 1: Mon, ..., 6: Sat)
    // Convert so that Mon is 0, Sun is 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sun becomes index 6

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    // Fill offset with empty cells of previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ isCurrentMonth: false, dayNum: 0, dateStr: '' });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        isCurrentMonth: true,
        dayNum: day,
        dateStr: cellDateStr
      });
    }

    return cells;
  }, [year, month]);

  // Find class logs registered for current year-month
  const monthlyLogs = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return classLogs.filter(log => log.date.startsWith(monthPrefix));
  }, [classLogs, year, month]);



  // Statistics for transparency reporting
  const stats = useMemo(() => {
    const verified = monthlyLogs.filter(l => l.status === 'verified').length;
    const pending = monthlyLogs.filter(l => l.status === 'pending').length;
    const disputed = monthlyLogs.filter(l => l.status === 'disputed').length;
    return { verified, pending, disputed, total: monthlyLogs.length };
  }, [monthlyLogs]);

  // Helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getLogsForDate = (dateStr: string): ClassLog[] => {
    if (!dateStr) return [];
    return classLogs.filter(log => log.date === dateStr);
  };

  const getUserDetails = (userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  };

  // Student logs a class date
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!formTutorId) {
      setFormError('Please select a tutor');
      return;
    }
    if (!formSubject) {
      setFormError('Please input the tuition subject');
      return;
    }
    if (!selectedDate) {
      setFormError('No date selected');
      return;
    }

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    // Check if class log already exists for this date with this tutor
    const logAlreadyExists = classLogs.find(l => l.date === dateStr && l.tutorId === formTutorId);
    if (logAlreadyExists) {
      setFormError('You have already logged a class with this tutor on this date.');
      return;
    }

    setFormError('');
    setFormSuccess(true);

    try {
      await logClass(
        currentUser.id,
        formTutorId,
        formSubject,
        dateStr,
        formNotes
      );
      setTimeout(() => {
        setShowLogModal(false);
        setFormSuccess(false);
        setFormNotes('');
        setFormSubject('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
      setFormSuccess(false);
    }
  };

  // Tutor reviews (verified/disputed) an entry
  const handleVerificationAction = async (logId: string, status: 'verified' | 'disputed') => {
    try {
      await verifyClass(logId, status, tutorReplyNotes);
      setTutorReplyNotes('');
      // Refresh current focused log detail if it matches
      if (selectedClassLog && selectedClassLog.id === logId) {
        setSelectedClassLog(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#0B132B]" id="class-verification-tab-container">
      {/* 1. Header Metrics Panel */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Month Classes</p>
            <h4 className="text-3xl font-black italic uppercase tracking-tight mt-1 text-slate-800 dark:text-white">
              {stats.total} Classes
            </h4>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF]">Verified Classes</p>
            <h4 className="text-3xl font-black italic uppercase tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
              {stats.verified} Verified
            </h4>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Pending Review</p>
            <h4 className="text-3xl font-black italic uppercase tracking-tight mt-1 text-amber-500">
              {stats.pending} Pending
            </h4>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Disputed Entries</p>
            <h4 className="text-3xl font-black italic uppercase tracking-tight mt-1 text-rose-500">
              {stats.disputed} Disputed
            </h4>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Interactive Calendar Panel - 7 columns on Desktop */}
      <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
        <div>
          {/* Calendar Header Toggles */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[8px] font-black tracking-widest uppercase text-slate-400">Month Verification Planner</p>
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                {monthNames[month]} {year}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="w-10 h-10 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-700 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="w-10 h-10 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-700 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Days Grid Heading */}
          <div className="grid grid-cols-7 gap-2 text-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <span key={day} className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid Rendering */}
          <div className="grid grid-cols-7 gap-2.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={`empty-${idx}`} className="h-16 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-dashed border-slate-100/30 dark:border-slate-800/35" />
                );
              }

              const dateLogs = getLogsForDate(cell.dateStr);
              const hasLogs = dateLogs.length > 0;
              
              // Determine status colors based on all logs of that day
              let borderStyle = 'border-slate-100 dark:border-slate-800 hover:border-[#0D5BFF] hover:shadow-md';
              let bgStyle = 'bg-slate-50/50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800';

              if (hasLogs) {
                const statuses = dateLogs.map(l => l.status);
                if (statuses.includes('disputed')) {
                  borderStyle = 'border-rose-300 dark:border-rose-700/50 shadow-inner';
                  bgStyle = 'bg-rose-500/10 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20';
                } else if (statuses.includes('pending')) {
                  borderStyle = 'border-amber-300 dark:border-amber-700/50 shadow-inner';
                  bgStyle = 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 hover:bg-amber-500/20';
                } else {
                  borderStyle = 'border-emerald-300 dark:border-emerald-700/50 shadow-inner';
                  bgStyle = 'bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-405 hover:bg-emerald-500/20';
                }
              }

              const isToday = () => {
                const today = new Date();
                return today.getDate() === cell.dayNum && today.getMonth() === month && today.getFullYear() === year;
              };

              const isSelected = selectedDate && selectedDate.getDate() === cell.dayNum && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

              return (
                <button
                  key={`day-${cell.dayNum}`}
                  onClick={() => {
                    const d = new Date(year, month, cell.dayNum);
                    setSelectedDate(d);
                    if (dateLogs.length > 0) {
                      setSelectedClassLog(dateLogs[0]);
                    } else {
                      setSelectedClassLog(null);
                    }
                  }}
                  className={`h-20 rounded-2xl p-2.5 border text-left flex flex-col justify-between transition-all duration-300 relative cursor-pointer group ${
                    isSelected ? 'ring-2 ring-[#0D5BFF] border-transparent' : borderStyle
                  } ${bgStyle}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[12px] font-black leading-none ${
                      isToday() ? 'bg-[#0D5BFF] text-white w-5 h-5 rounded-md flex items-center justify-center font-bold shadow' : 'text-slate-800 dark:text-slate-300'
                    }`}>
                      {cell.dayNum}
                    </span>
                    {hasLogs && (
                      <div className="flex gap-0.5" id={`day-indicator-${cell.dayNum}`}>
                        {dateLogs.map((log) => {
                          const dotColor = 
                            log.status === 'verified' ? 'bg-emerald-500' :
                            log.status === 'disputed' ? 'bg-rose-500 animate-pulse' :
                            'bg-amber-500';
                          return <span key={log.id} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Miniature Detail on Hover or if small screen */}
                  <div className="text-[7.5px] truncate font-black tracking-tight leading-tight uppercase w-full">
                    {hasLogs ? (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {dateLogs.length > 1 ? (
                          <span className="text-[#0D5BFF] dark:text-blue-400 font-extrabold">{dateLogs.length} Classes Logged</span>
                        ) : (
                          <span className="truncate">{dateLogs[0].subject}</span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-slate-450 dark:text-slate-500 transition-opacity">
                        + Mark class
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Legend Details */}
        <div className="flex flex-wrap items-center gap-5 mt-8 border-t border-slate-100 dark:border-slate-800 pt-5 text-[8.5px] font-black uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
            <span>Class Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-md bg-amber-500" />
            <span>Pending Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-md bg-rose-500" />
            <span>Disputed Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-md border-2 border-slate-200 dark:border-slate-700" />
            <span>Unmarked Day</span>
          </div>
          {role === 'student' && (
            <button 
              onClick={() => {
                if (selectedDate) {
                  setShowLogModal(true);
                  // Setup initial prefilled subject/tutors
                  if (fallbackUsers.length > 0) {
                    setFormTutorId(fallbackUsers[0].id);
                  }
                }
              }}
              className="ml-auto flex items-center gap-2 bg-[#0B132B] hover:bg-[#0D5BFF] hover:shadow-lg hover:shadow-blue-500/10 text-white rounded-xl px-4 py-2 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Class Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Action Panel Detailed Viewer - 5 columns on Desktop */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        
        {/* Detail Panel Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex-1">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
            <p className="text-[8px] font-black uppercase tracking-widest text-[#0D5BFF] mb-1">Interactive Log Deck</p>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">
              {selectedDate ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : 'Select a date'}
            </h3>
          </div>

          {/* Multi-log Selector Tabs if there are multiple entries on the same day */}
          {selectedDateLogs.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="w-full text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
                Multiple logs on this day ({selectedDateLogs.length})
              </p>
              {selectedDateLogs.map((log) => {
                const isCurrent = log.id === selectedClassLog?.id;
                const partner = getUserDetails(role === 'student' ? log.tutorId : log.studentId);
                const statColor = 
                  log.status === 'verified' ? 'text-emerald-500' :
                  log.status === 'disputed' ? 'text-rose-500 animate-pulse' :
                  'text-amber-500';
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedClassLog(log)}
                    className={`flex-1 min-w-[130px] text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isCurrent 
                        ? 'bg-white dark:bg-slate-900 border-[#0D5BFF] shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <p className="text-[10px] font-black truncate text-slate-850 dark:text-white">
                      {log.subject}
                    </p>
                    <div className="flex items-center justify-between gap-1 mt-1.5 min-w-0">
                      <span className="text-[8px] font-bold text-slate-400 truncate uppercase max-w-[70px]">
                        {partner?.name || 'Partner'}
                      </span>
                      <span className={`text-[8px] font-black uppercase shrink-0 ${statColor}`}>
                        • {log.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            {selectedClassLog ? (
              <motion.div
                key={selectedClassLog.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Visual Header Status Badge */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Status:</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      selectedClassLog.status === 'verified' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      selectedClassLog.status === 'disputed' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-450' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400'
                    }`}>
                      {selectedClassLog.status}
                    </span>
                  </div>

                  <div className="text-[8px] font-black text-slate-400 tracking-wider">
                    LOG ID: {selectedClassLog.id}
                  </div>
                </div>

                {/* Subject & User Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-[8px] font-black uppercase tracking-wider mb-2">
                      <BookOpen className="w-3 h-3 text-indigo-500" />
                      <span>Subject / Topic</span>
                    </div>
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wide">
                      {selectedClassLog.subject}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-[8px] font-black uppercase tracking-wider mb-2">
                      <UserIcon className="w-3 h-3 text-sky-500" />
                      <span>{role === 'student' ? 'Assigned Tutor' : 'Student Logger'}</span>
                    </div>
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wide truncate">
                      {getUserDetails(role === 'student' ? selectedClassLog.tutorId : selectedClassLog.studentId)?.name || 'Unknown Partner'}
                    </p>
                  </div>
                </div>

                {/* Custom Notes Section */}
                {selectedClassLog.notes && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-[8px] font-black uppercase tracking-wider mb-2">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>Student Notes</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-350 italic bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                      "{selectedClassLog.notes}"
                    </p>
                  </div>
                )}

                {/* Tutor Responses Section if verified/disputed */}
                {selectedClassLog.tutorNotes && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-[8px] font-black uppercase tracking-wider mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Tutor Response Notes</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-350 italic bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/85 leading-relaxed">
                      "{selectedClassLog.tutorNotes}"
                    </p>
                  </div>
                )}

                {/* Tutor Review Interactive Controls */}
                {role === 'tutor' && selectedClassLog.status === 'pending' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 mb-2">Review & Verify Class Status</p>
                    
                    <textarea 
                      value={tutorReplyNotes}
                      onChange={(e) => setTutorReplyNotes(e.target.value)}
                      placeholder="Optional details or dispute justification note..."
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#0D5BFF]"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleVerificationAction(selectedClassLog.id, 'verified')}
                        className="flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-wider text-[10px] shadow-sm active:scale-95 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Verify & Approve</span>
                      </button>

                      <button
                        onClick={() => handleVerificationAction(selectedClassLog.id, 'disputed')}
                        className="flex items-center justify-center gap-2 py-3.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-wider text-[10px] shadow-sm active:scale-95 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Dispute Log</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Student Retract Controls */}
                {role === 'student' && selectedClassLog.status === 'pending' && (
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-[#0B132B] dark:text-white mb-2">Retract Conduction Mark</p>
                    <ConfirmRetractButton 
                      onConfirm={async () => {
                        await deleteClassLog(selectedClassLog.id);
                        setSelectedClassLog(null);
                      }} 
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/40 dark:bg-slate-800/10 rounded-3xl border border-slate-100/60 dark:border-slate-800/40"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0B132B] dark:text-white mb-2">No Verified Mark registered</h4>
                <p className="text-slate-400 text-xs font-medium max-w-[240px] leading-relaxed">
                  {role === 'student' 
                    ? "Click on any calendar day to declare a tuition session conducted, or select marked days to view active verification cards."
                    : "Review incoming student class entries. Select a marked day on the left to approve or dispute it."
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Side History Log Panel - Shows recent class history */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm h-72 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Class Journal Roll</p>
              <h4 className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">Recent Log History</h4>
            </div>
            <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
              {monthlyLogs.length} Entries
            </span>
          </div>

          <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            {monthlyLogs.length > 0 ? (
              monthlyLogs.slice().sort((a,b) => b.loggedAt.localeCompare(a.loggedAt)).map(log => {
                const companion = getUserDetails(role === 'student' ? log.tutorId : log.studentId);
                return (
                  <div 
                    key={log.id}
                    onClick={() => {
                      const [lYear, lMonth, lDay] = log.date.split('-').map(Number);
                      setSelectedDate(new Date(lYear, lMonth - 1, lDay));
                      setSelectedClassLog(log);
                    }}
                    className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-2xl hover:border-[#0D5BFF]/30 hover:bg-white dark:hover:bg-slate-800 cursor-pointer group transition duration-200"
                  >
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-black uppercase text-slate-800 dark:text-white truncate">
                        {log.subject}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                        {companion?.name || 'Assigned Tutor'} • {log.date}
                      </p>
                    </div>

                    <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${
                      log.status === 'verified' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                      log.status === 'disputed' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400' :
                      'bg-amber-100 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-slate-350 text-xs italic font-medium">
                No logs submitted this month
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Custom Student Mark-Class Interactive Overlay Modal (Editorial Brutalist Styling) */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" id="mark-class-modal-portal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowLogModal(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
                <p className="text-[8px] font-black uppercase tracking-widest text-[#0D5BFF] mb-1">Class Conduction Registry</p>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                  Mark Tuition Converted
                </h3>
                <p className="text-slate-400 text-xs font-bold mt-1">
                  Logging class on: <span className="text-[#0B132B] dark:text-white font-extrabold">{selectedDate ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : ''}</span>
                </p>
              </div>

              {formSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-100 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-black uppercase text-emerald-600">Class Successfully Logged!</h4>
                  <p className="text-xs text-slate-400">Notifying your tutor and updating verification records...</p>
                </div>
              ) : (
                <form onSubmit={handleLogSubmit} className="space-y-5">
                  
                  {/* Select Tutor Dropdown */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Select Active Tutor</label>
                    <select
                      value={formTutorId}
                      onChange={(e) => setFormTutorId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-black uppercase text-[#0B132B] dark:text-white focus:outline-none focus:border-[#0D5BFF] transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Tutor --</option>
                      {activePartners.length > 0 && (
                        <optgroup label="✨ Your Connected Partners" className="font-extrabold text-[#0D5BFF]">
                          {activePartners.map(tutor => (
                            <option key={tutor.id} value={tutor.id} className="font-normal text-[#0B132B] dark:text-white">
                              {tutor.name} ({tutor.subject || (tutor.subjects && tutor.subjects.length > 0 ? tutor.subjects.join(', ') : 'Coaches All Subjects')})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherPartners.length > 0 && (
                        <optgroup label="📋 Other System Tutors" className="font-extrabold text-slate-500">
                          {otherPartners.map(tutor => (
                            <option key={tutor.id} value={tutor.id} className="font-normal text-[#0B132B] dark:text-white">
                              {tutor.name} ({tutor.subject || (tutor.subjects && tutor.subjects.length > 0 ? tutor.subjects.join(', ') : 'Coaches All Subjects')})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Subject Topic</label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="e.g., Physics, Calculus Chapter 5"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-300 focus:outline-none focus:border-[#0D5BFF] transition-all"
                      required
                    />
                    
                    {/* Quick Select Recommendation Pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {['Physics', 'Chemistry', 'Higher Math', 'Biology', 'English', 'ICT', 'General Science'].map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFormSubject(sub)}
                          className="px-2.5 py-1 text-[10px] font-black rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 hover:border-[#0D5BFF] text-slate-600 dark:text-slate-300 hover:text-[#0D5BFF] transition cursor-pointer"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Optional Notes</label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="What was discussed or homework assigned?"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-300 focus:outline-none focus:border-[#0D5BFF] transition-all"
                    />
                  </div>

                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center gap-2.5 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => setShowLogModal(false)}
                      className="w-1/2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-wider transition active:scale-95 cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-4 bg-[#0B132B] hover:bg-[#0D5BFF] text-white rounded-2xl font-black uppercase text-[10px] tracking-wider transition active:scale-95 cursor-pointer text-center"
                    >
                      Verify Class Conducted
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmRetractButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  
  if (confirming) {
    return (
      <div className="w-full flex gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl font-black uppercase tracking-wider text-[10px] transition cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            await onConfirm();
          }}
          className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-wider text-[10px] transition cursor-pointer text-center"
        >
          Yes, Retract
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-500 rounded-2xl font-black uppercase tracking-wider text-[10px] shadow-sm transition cursors-pointer"
    >
      <Trash2 className="w-4 h-4" />
      <span>Retract Class Entry</span>
    </button>
  );
}
