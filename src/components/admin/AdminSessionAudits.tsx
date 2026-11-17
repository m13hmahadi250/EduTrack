import React, { useState, useMemo } from 'react';
import { Session, User } from '../../store';
import { 
  Search, 
  Filter, 
  Star, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  MessageSquare,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import { useBackHandler } from '../../utils/mobileWebView';
import ModalPortal from '../ModalPortal';

interface AdminSessionAuditsProps {
  sessions: Session[];
  users: User[];
  cancelSession: (id: string) => Promise<void>;
  sendNotification: (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
}

export default function AdminSessionAudits({ sessions, users, cancelSession, sendNotification }: AdminSessionAuditsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'proposed_by_tutor' | 'requested_by_student'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'rated' | 'poor' | 'unrated'>('all');
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [pendingCancelTarget, setPendingCancelTarget] = useState<{ sessionId: string; studentId: string; tutorId: string; subject?: string } | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useBackHandler(Boolean(pendingCancelTarget), () => setPendingCancelTarget(null), 'admin-cancel-session-modal');

  // Quick lookup helper for user records
  const getUserById = (id: string) => {
    return users.find(u => u.id === id);
  };

  // Filtered session records
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const student = getUserById(session.studentId);
      const tutor = getUserById(session.tutorId);
      
      const searchStr = `${session.subject || ''} ${student?.name || ''} ${tutor?.name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

      // Status translation matches
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          matchesStatus = session.status === 'active' || session.status === 'scheduled';
        } else {
          matchesStatus = session.status === statusFilter;
        }
      }

      // Rating filter
      let matchesRating = true;
      if (ratingFilter === 'rated') {
        matchesRating = session.rating !== undefined && session.rating > 0;
      } else if (ratingFilter === 'poor') {
        matchesRating = session.rating !== undefined && session.rating > 0 && session.rating <= 3;
      } else if (ratingFilter === 'unrated') {
        matchesRating = !session.rating;
      }

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [sessions, users, searchTerm, statusFilter, ratingFilter]);

  // Feed of student feedbacks
  const studentFeedbacks = useMemo(() => {
    return sessions
      .filter(s => s.rating && s.rating > 0)
      .map(s => ({
        ...s,
        student: getUserById(s.studentId),
        tutor: getUserById(s.tutorId)
      }))
      .sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime));
  }, [sessions, users]);

  const executeConfirmCancel = async () => {
    if (!pendingCancelTarget) return;
    const { sessionId, studentId, tutorId } = pendingCancelTarget;
    setCancellingSessionId(sessionId);
    try {
      await cancelSession(sessionId);
      
      // Notify both parties of admin intervention
      await sendNotification(
        studentId,
        "Tuition Intervened",
        "An administrator has cancelled your ongoing tuition session due to audit directives.",
        "error"
      );

      await sendNotification(
        tutorId,
        "Tuition Intervened",
        "An administrator has cancelled your tuition session. If you believe this is an error, please contact support.",
        "warning"
      );

      setPendingCancelTarget(null);
      setStatusBanner({ type: 'success', message: 'Tuition session cancelled by Admin and both parties notified.' });
      setTimeout(() => setStatusBanner(null), 5000);
    } catch (error) {
      console.error(error);
      setStatusBanner({ type: 'error', message: 'Failed to cancel tuition session. Please try again.' });
      setTimeout(() => setStatusBanner(null), 5000);
    } finally {
      setCancellingSessionId(null);
    }
  };

  return (
    <div className="space-y-5" id="admin-session-audits-view">
      {statusBanner && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs font-bold ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{statusBanner.message}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Filtering Options Grid */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Search & Header Row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject, student, or tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#0D5BFF] placeholder-slate-400 outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-[#0D5BFF]" />
            <span>Session Audit Filters ({filteredSessions.length})</span>
          </div>
        </div>

        {/* Segmented Option Switchers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Session Status</span>
            <div className="flex flex-wrap bg-slate-50 dark:bg-slate-900 p-1 rounded-xl gap-1 w-full">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'proposed_by_tutor', label: 'Offers' },
                { value: 'requested_by_student', label: 'Requests' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value as any)}
                  className={`flex-1 min-w-[74px] py-1.5 px-2 text-[11px] font-bold rounded-lg transition-colors duration-150 cursor-pointer text-center ${
                    statusFilter === opt.value
                      ? 'bg-white dark:bg-slate-800 text-[#0D5BFF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Review Rating</span>
            <div className="flex flex-wrap sm:flex-nowrap bg-slate-50 dark:bg-slate-900 p-1 rounded-xl gap-1 w-full">
              {[
                { value: 'all', label: 'All Ratings' },
                { value: 'rated', label: 'Rated' },
                { value: 'poor', label: 'Low (1-3★)' },
                { value: 'unrated', label: 'Unrated' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRatingFilter(opt.value as any)}
                  className={`flex-1 min-w-[76px] py-1.5 px-2 text-[11px] font-bold rounded-lg transition-colors duration-150 cursor-pointer text-center ${
                    ratingFilter === opt.value
                      ? 'bg-white dark:bg-slate-800 text-[#0D5BFF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Sessions Audit Table & Mobile Cards */}
        <div className="xl:col-span-2 bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0B132B] dark:text-white">
              Platform Tuition Streams ({filteredSessions.length})
            </h4>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredSessions.map((sess) => {
              const student = getUserById(sess.studentId);
              const tutor = getUserById(sess.tutorId);
              const canCancel = sess.status === 'active' || sess.status === 'scheduled' || sess.status === 'proposed_by_tutor' || sess.status === 'requested_by_student';

              return (
                <div key={sess.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{sess.subject || 'N/A'}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">#{String(sess.id || '').substring(0, 8)}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize shrink-0 inline-flex items-center gap-1 ${
                      sess.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                      sess.status === 'active' || sess.status === 'scheduled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' :
                      sess.status === 'cancelled' || sess.status === 'rejected' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                    }`}>
                      {String(sess.status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2.5">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase block">Tutor</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{tutor?.name || 'Unknown'}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase block">Student</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{student?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sess.scheduledTime || 'Unscheduled'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sess.rating ? (
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < sess.rating! ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-700'}`} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Unrated</span>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => setPendingCancelTarget({ sessionId: sess.id, studentId: sess.studentId, tutorId: sess.tutorId, subject: sess.subject })}
                          disabled={cancellingSessionId === sess.id}
                          className="min-w-[44px] min-h-[44px] p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                          title="Force Administrative Cancellation"
                          aria-label="Force cancel session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-bold text-xs">
                No matches resolved within session database filters.
              </div>
            )}
          </div>

          {/* Desktop & Tablet Compact Table (Zero Horizontal Overflow) */}
          <div className="hidden md:block flex-1">
            <table className="w-full table-fixed select-none">
              <thead className="bg-slate-50/70 dark:bg-slate-900/40">
                <tr className="border-b border-slate-100 dark:border-slate-800/60">
                  <th className="w-[24%] px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject</th>
                  <th className="w-[26%] px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tutor & Student</th>
                  <th className="w-[20%] px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Schedule</th>
                  <th className="w-[15%] px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="w-[15%] px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">QA / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredSessions.map((sess) => {
                  const student = getUserById(sess.studentId);
                  const tutor = getUserById(sess.tutorId);

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors">
                      
                      {/* Subject */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate" title={sess.subject || 'N/A'}>{sess.subject || 'N/A'}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block truncate">#{String(sess.id || '').substring(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Participant lookups */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5 text-xs min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-1.5 rounded dark:bg-rose-950/40 dark:text-rose-400 shrink-0">T</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tutor?.name || 'Unknown Tutor'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 rounded dark:bg-blue-950/40 dark:text-blue-400 shrink-0">S</span>
                            <span className="text-slate-600 dark:text-slate-400 truncate">{student?.name || 'Unknown Student'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Timestamps */}
                      <td className="px-3 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{sess.scheduledTime || 'Unscheduled'}</span>
                        </div>
                        {sess.duration && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {sess.duration} mins
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize inline-flex items-center gap-1 max-w-full truncate ${
                          sess.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                          sess.status === 'active' || sess.status === 'scheduled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' :
                          sess.status === 'cancelled' || sess.status === 'rejected' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                        }`}>
                          {sess.status === 'completed' && <CheckCircle className="w-3 h-3 shrink-0" />}
                          {(sess.status === 'active' || sess.status === 'scheduled') && <Clock className="w-3 h-3 shrink-0" />}
                          {(sess.status === 'cancelled' || sess.status === 'rejected') && <XCircle className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{String(sess.status || 'pending').replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      {/* QA Interventions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {sess.rating ? (
                            <div className="flex items-center gap-0.5" title={`${sess.rating} Stars`}>
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${
                                    i < sess.rating! 
                                      ? 'text-amber-500 fill-amber-500' 
                                      : 'text-slate-200 dark:text-slate-700'
                                  }`} 
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">Unrated</span>
                          )}

                          {(sess.status === 'active' || sess.status === 'scheduled' || sess.status === 'proposed_by_tutor' || sess.status === 'requested_by_student') ? (
                            <button
                              type="button"
                              onClick={() => setPendingCancelTarget({ sessionId: sess.id, studentId: sess.studentId, tutorId: sess.tutorId, subject: sess.subject })}
                              disabled={cancellingSessionId === sess.id}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Force Administrative Cancellation"
                              aria-label="Force cancel session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500 dark:text-slate-400 font-bold text-xs">
                      No matches resolved within session database filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Quality Assurance Student Feedbacks Card */}
        <div className="xl:col-span-1 bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col p-4 sm:p-5">
          
          <div className="mb-3">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#0D5BFF]" />
              Quality Oversight Feed
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Student testimonials and ratings on tuition delivery
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 custom-scrollbar flex-1">
            {studentFeedbacks.map((fback) => {
              const isCritical = fback.rating! <= 3;

              return (
                <div 
                  key={fback.id} 
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-colors ${
                    isCritical 
                      ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/15 dark:border-rose-900/40' 
                      : 'bg-slate-50/60 border-slate-200/70 dark:bg-slate-900/40 dark:border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {fback.subject}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < fback.rating! ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-700'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{fback.feedback || 'No written testimony provided'}"
                  </p>

                  <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                    <span className="text-rose-600 dark:text-rose-400">
                      Tutor: {fback.tutor?.name || 'ID ' + fback.tutorId.substring(0, 6)}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      Student: {fback.student?.name || 'ID ' + fback.studentId.substring(0, 6)}
                    </span>
                  </div>

                  {isCritical && (
                    <div className="mt-1 flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg text-[11px] font-bold w-max">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Critical Review Action Recommended
                    </div>
                  )}

                </div>
              );
            })}

            {studentFeedbacks.length === 0 && (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                No student ratings catalogued in ledger yet.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Confirmation Modal for Admin Cancellation */}
      <ModalPortal
        isOpen={Boolean(pendingCancelTarget)}
        onClose={() => setPendingCancelTarget(null)}
        level="elevated"
        labelledBy="admin-cancel-session-title"
        overlayClassName="bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4"
      >
        {pendingCancelTarget && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-[min(420px,calc(100vw-24px))] space-y-5 my-auto"
          >
            <div className="space-y-2">
              <h3 id="admin-cancel-session-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>Cancel Tuition Session?</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                Are you sure you want to forcibly cancel <strong className="text-slate-900 dark:text-white">{pendingCancelTarget.subject || 'this session'}</strong> as an administrator? Both student and tutor will be notified.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingCancelTarget(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Keep Session
              </button>
              <button
                type="button"
                disabled={cancellingSessionId === pendingCancelTarget.sessionId}
                onClick={executeConfirmCancel}
                className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancellingSessionId === pendingCancelTarget.sessionId ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        )}
      </ModalPortal>

    </div>
  );
}
