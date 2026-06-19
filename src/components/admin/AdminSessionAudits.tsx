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
  ShieldAlert,
  Calendar,
  Layers
} from 'lucide-react';

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

  const handleCancelSession = async (sessionId: string, studentId: string, tutorId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to forcibly CANCEL this tuition session as an administrator? This action is logged.");
    if (!confirmCancel) return;

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

      alert("Tuition session successfully cancelled by Admin.");
    } catch (error) {
      console.error(error);
      alert("Failed to cancel session.");
    } finally {
      setCancellingSessionId(null);
    }
  };

  return (
    <div className="space-y-8" id="admin-session-audits-view">
      
      {/* Filtering Options Grid */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by subject, student, or tutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-white focus:ring-2 focus:ring-[#0D5BFF] placeholder-slate-400 outline-none"
          />
        </div>

        {/* Multi-Filters select options */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border-0 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5BFF]"
            >
              <option value="all">All Sessions</option>
              <option value="active">Active & Scheduled</option>
              <option value="completed">Completed Only</option>
              <option value="cancelled">Cancelled Only</option>
              <option value="proposed_by_tutor">Pending Tutor Offers</option>
              <option value="requested_by_student">Pending Student Requests</option>
            </select>
          </div>

          {/* Rating filter */}
          <div>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="px-4 py-2 border-0 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5BFF]"
            >
              <option value="all">All Ratings</option>
              <option value="rated">Rated Sessions Only</option>
              <option value="poor">Poor Reviews (⭐ 1-3)</option>
              <option value="unrated">Feedback Impending</option>
            </select>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sessions Audit Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-6 border-b border-slate-50 dark:border-slate-800/50">
            <h4 className="text-sm font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic">
              Active Platform Tuition Streams ({filteredSessions.length} listed)
            </h4>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full uppercase select-none">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800/40">
                  <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Class/Subject</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Tutor & Student</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Datetime Details</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black tracking-widest text-slate-400">Quality / Intervene</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {filteredSessions.map((sess) => {
                  const student = getUserById(sess.studentId);
                  const tutor = getUserById(sess.tutorId);

                  return (
                    <tr key={sess.id} className="h-20 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      
                      {/* Subject */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black text-slate-800 dark:text-white block">{sess.subject || 'N/A'}</span>
                            <span className="text-[7.5px] font-bold text-slate-400 font-mono tracking-tighter">ID: {sess.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      {/* Participant lookups */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5 text-[10px] font-black tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1 rounded dark:bg-rose-950/40">T</span>
                            <span className="text-slate-800 dark:text-slate-200">{tutor?.name || 'Unknown Tutor'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1 rounded dark:bg-blue-950/40">S</span>
                            <span className="text-slate-600 dark:text-slate-450">{student?.name || 'Unknown Student'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Timestamps */}
                      <td className="px-6 py-4 text-[9.5px] font-black text-slate-500 dark:text-slate-400 font-mono tracking-tight">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sess.scheduledTime || 'Unscheduled'}</span>
                        </div>
                        {sess.duration && (
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                            Duration: {sess.duration} Mins
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 w-max ${
                          sess.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                          sess.status === 'active' || sess.status === 'scheduled' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' :
                          sess.status === 'cancelled' || sess.status === 'rejected' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                          'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                        }`}>
                          {sess.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {(sess.status === 'active' || sess.status === 'scheduled') && <Clock className="w-3 h-3 animate-pulse" />}
                          {(sess.status === 'cancelled' || sess.status === 'rejected') && <XCircle className="w-3 h-3" />}
                          {sess.status}
                        </span>
                      </td>

                      {/* QA Interventions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sess.rating ? (
                            <div className="flex items-center gap-0.5" title={`${sess.rating} Stars`}>
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${
                                    i < sess.rating! 
                                      ? 'text-amber-500 fill-amber-500' 
                                      : 'text-slate-200 dark:text-slate-800'
                                  }`} 
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[8px] font-black text-slate-300 font-mono italic">unrated</span>
                          )}

                          {/* Trigger intervention cancel */}
                          {(sess.status === 'active' || sess.status === 'scheduled' || sess.status === 'proposed_by_tutor' || sess.status === 'requested_by_student') ? (
                            <button
                              onClick={() => handleCancelSession(sess.id, sess.studentId, sess.tutorId)}
                              disabled={cancellingSessionId === sess.id}
                              className="p-1.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-100 rounded-xl transition-all cursor-pointer shadow-sm"
                              title="Force Administrative Cancellation"
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
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-black tracking-widest text-[10px]">
                      No matches resolved within session database filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Quality Assurance Student Feedbacks Card */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] shadow-sm flex flex-col p-6">
          
          <div className="mb-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white italic flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#0D5BFF]" />
              Quality Oversight Feed
            </h4>
            <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-0.5">
              Direct student testimonials and ratings on tuition delivery
            </p>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1.5 custom-scrollbar flex-1">
            {studentFeedbacks.map((fback) => {
              const isCritical = fback.rating! <= 3;

              return (
                <div 
                  key={fback.id} 
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    isCritical 
                      ? 'bg-rose-50/40 border-rose-100 dark:bg-rose-950/5 dark:border-rose-900/30' 
                      : 'bg-slate-50/50 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">
                      {fback.subject}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < fback.rating! ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 leading-normal italic">
                    "{fback.feedback || 'No written testimony provided'}"
                  </p>

                  <div className="mt-2 text-[8px] font-black tracking-widest uppercase text-slate-400 font-mono flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-rose-500">
                      Expert: {fback.tutor?.name || 'Tutor ID: ' + fback.tutorId.substring(0, 6)}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      Auditor Note: Student {fback.student?.name || 'Student ID: ' + fback.studentId.substring(0, 6)}
                    </span>
                  </div>

                  {isCritical && (
                    <div className="mt-2 flex items-center gap-1 text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider w-max">
                      <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                      Critical Review Action Recommended
                    </div>
                  )}

                </div>
              );
            })}

            {studentFeedbacks.length === 0 && (
              <div className="text-center py-12 text-slate-350 dark:text-slate-600 font-black tracking-widest text-[10px]">
                No students ratings catalogued in system ledger yet.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
