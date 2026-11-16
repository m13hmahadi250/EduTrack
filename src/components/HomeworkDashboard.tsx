import React, { useState } from 'react';
import { useAppStore, HomeworkAssignment, User } from '../store';
import { 
  BookOpen, Plus, FileText, Calendar, CheckCircle2, AlertCircle, 
  Trash2, Download, Eye, ExternalLink, Send, ArrowRight, X, 
  FileCheck, Clock, RefreshCw, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FileUpload from './FileUpload';

export default function HomeworkDashboard() {
  const { 
    currentUser, 
    users, 
    sessions,
    homeworkAssignments, 
    createHomeworkAssignment, 
    submitHomeworkCompletion, 
    reviewHomeworkAssignment, 
    deleteHomeworkAssignment 
  } = useAppStore();

  // Navigation & Filtering
  const [filter, setFilter] = useState<'all' | 'assigned' | 'submitted' | 'completed' | 'revision'>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedHw, setSelectedHw] = useState<HomeworkAssignment | null>(null);
  const [showWatchModal, setShowWatchModal] = useState<HomeworkAssignment | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<HomeworkAssignment | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<HomeworkAssignment | null>(null);

  // Form states - Assigning
  const [targetStudentId, setTargetStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Form states - Submitting Work
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Form states - Reviewing Work
  const [feedback, setFeedback] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'completed' | 'revision'>('completed');
  const [isReviewingWork, setIsReviewingWork] = useState(false);

  if (!currentUser) return null;

  const isTutor = currentUser.role === 'tutor';
  const isStudent = currentUser.role === 'student';
  const isAdmin = currentUser.role === 'admin';

  // Find users for displays
  const getStudentList = () => {
    if (isTutor) {
      // Find student IDs of accepted/running tuitions (status is scheduled or active) with this tutor
      const activeStudentIds = sessions
        .filter(s => s.tutorId === currentUser.id && (s.status === 'scheduled' || s.status === 'active'))
        .map(s => s.studentId);
      return users.filter(u => u.role === 'student' && activeStudentIds.includes(u.id));
    }
    return users.filter(u => u.role === 'student');
  };
  const getTutorList = () => users.filter(u => u.role === 'tutor');
  
  const getUserName = (id: string, role: 'student' | 'tutor') => {
    if (id === currentUser.id) return currentUser.name;
    const found = users.find(u => u.id === id);
    return found ? found.name : `${role === 'student' ? 'Student' : 'Tutor'}`;
  };

  // Filter homeworks
  const filteredHomeworks = (Array.isArray(homeworkAssignments) ? homeworkAssignments : [])
    .filter(hw => {
      if (!hw) return false;
      if (filter !== 'all' && hw.status !== filter) return false;
      const term = (search || '').toLowerCase();
      if (term) {
        return (
          (hw.title || '').toLowerCase().includes(term) ||
          (hw.subject || '').toLowerCase().includes(term) ||
          (hw.text || '').toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));

  // PDF Download of Homework Sheet
  const downloadHomeworkPDF = async (hw: HomeworkAssignment) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const studentName = getUserName(hw.studentId, 'student');
    const tutorName = getUserName(hw.tutorId, 'tutor');

    doc.setFillColor(11, 19, 43); // Dark background header block
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("HOMEWORK ASSIGNMENT", 15, 25);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated via EduTrack Bangladesh • ${new Date().toLocaleDateString()}`, 15, 33);

    // Metadata Table
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const startY = 55;
    doc.setFont("helvetica", "bold");
    doc.text("Subject:", 15, startY);
    doc.text("Title:", 15, startY + 8);
    doc.text("Tutor:", 15, startY + 16);
    doc.text("Student:", 15, startY + 24);
    doc.text("Due Date:", 15, startY + 32);

    doc.setFont("helvetica", "normal");
    doc.text(hw.subject, 40, startY);
    doc.text(hw.title, 40, startY + 8);
    doc.text(tutorName, 40, startY + 16);
    doc.text(studentName, 40, startY + 24);
    doc.text(hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No specific due date', 40, startY + 32);

    // Separator line
    doc.setDrawColor(220, 224, 230);
    doc.line(15, startY + 40, 195, startY + 40);

    // Assignment Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Instructions & Tasks", 15, startY + 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    // Auto wrap text
    const textLines = doc.splitTextToSize(hw.text, 180);
    doc.text(textLines, 15, startY + 60);

    // Save PDF
    doc.save(`Homework_${hw.subject.replace(/\s+/g, '_')}_${hw.id}.pdf`);
  };

  // Submit Homework creation
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !subject || !title || !text) {
      alert('Please fill out all required fields');
      return;
    }
    setIsAssigning(true);
    try {
      await createHomeworkAssignment({
        tutorId: currentUser.id,
        studentId: targetStudentId,
        subject,
        title,
        text,
        pdfUrl: pdfUrl || undefined,
        dueDate: dueDate || undefined
      });
      // Clear
      setTargetStudentId('');
      setSubject('');
      setTitle('');
      setText('');
      setPdfUrl('');
      setDueDate('');
      setShowAssignModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to assign homework');
    } finally {
      setIsAssigning(false);
    }
  };

  // Submit Homework Completion
  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubmitModal) return;
    if (!submissionNotes) {
      alert('Please provide some notes for your submission');
      return;
    }
    setIsSubmittingWork(true);
    try {
      await submitHomeworkCompletion(showSubmitModal.id, submissionNotes, submissionFileUrl || undefined);
      setSubmissionNotes('');
      setSubmissionFileUrl('');
      setShowSubmitModal(null);
    } catch (e) {
      console.error(e);
      alert('Failed to submit completion report');
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Submit Review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReviewModal) return;
    setIsReviewingWork(true);
    try {
      await reviewHomeworkAssignment(showReviewModal.id, reviewStatus, feedback || undefined);
      setFeedback('');
      setReviewStatus('completed');
      setShowReviewModal(null);
    } catch (e) {
      console.error(e);
      alert('Failed to save review');
    } finally {
      setIsReviewingWork(false);
    }
  };

  // Render Status Badge
  const renderStatus = (status: HomeworkAssignment['status']) => {
    switch (status) {
      case 'assigned':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            Assigned
          </span>
        );
      case 'submitted':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <Send className="w-3.5 h-3.5" />
            Submitted
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'revision':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" />
            Needs Revision
          </span>
        );
    }
  };

  return (
    <div className="space-y-8" id="homework-dashboard-root">
      {/* Upper Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-6 h-6 text-[#0D5BFF]" />
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Homework Desk & Submissions
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isTutor 
              ? "Assign homework, review student completion reports, and manage tasks." 
              : "Track assigned homework, view files, present tasks, and submit your work."}
          </p>
        </div>

        {isTutor && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center justify-center gap-2 bg-[#0B132B] hover:bg-[#0D5BFF] dark:bg-[#0D5BFF] dark:hover:bg-blue-600 text-white font-semibold text-xs px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 duration-200 cursor-pointer text-center"
            id="assign-homework-btn"
          >
            <Plus className="w-4 h-4" />
            Assign New Homework
          </button>
        )}
      </div>

      {/* Filter Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Quick Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Tasks', count: homeworkAssignments.length },
              { id: 'assigned', label: 'Assigned', count: homeworkAssignments.filter(h => h.status === 'assigned').length },
              { id: 'submitted', label: 'Submitted', count: homeworkAssignments.filter(h => h.status === 'submitted').length },
              { id: 'completed', label: 'Completed', count: homeworkAssignments.filter(h => h.status === 'completed').length },
              { id: 'revision', label: 'Revision', count: homeworkAssignments.filter(h => h.status === 'revision').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  filter === tab.id
                    ? "bg-[#0B132B] dark:bg-[#0D5BFF] text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                }`}
                id={`filter-tab-${tab.id}`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.id 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search homework..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="homework-search-input"
            />
          </div>
        </div>
      </div>

      {/* Homework Grid */}
      {filteredHomeworks.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-[2rem] p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Homework Assignments Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try choosing a different status filter or searching for specific terms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {filteredHomeworks.map((hw) => {
            const studentName = getUserName(hw.studentId, 'student');
            const tutorName = getUserName(hw.tutorId, 'tutor');
            const isOverdue = hw.dueDate && new Date(hw.dueDate).getTime() < Date.now() && hw.status !== 'completed';

            return (
              <motion.div
                key={hw.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                id={`homework-card-${hw.id}`}
              >
                {/* Header */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                      {hw.subject}
                    </span>
                    {renderStatus(hw.status)}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">
                      {hw.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isTutor ? `Assigned to student: ` : `Assigned by tutor: `}
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {isTutor ? studentName : tutorName}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Content description preview */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                    {hw.text}
                  </p>
                </div>

                {/* Dates & Attachment */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: </span>
                    <span className={`font-semibold ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                      {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString() : 'Flexible'}
                    </span>
                  </div>

                  {hw.pdfUrl && (
                    <a
                      href={hw.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:underline font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View PDF Task
                    </a>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {/* Universal Actions */}
                  <button
                    onClick={() => setShowWatchModal(hw)}
                    className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 px-3 rounded-2xl text-[11px] font-bold active:scale-95 transition cursor-pointer"
                    title="Present full-screen watch mode during live classes"
                    id={`btn-watch-${hw.id}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Watch Mode
                  </button>

                  <button
                    onClick={() => downloadHomeworkPDF(hw)}
                    className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2.5 rounded-2xl text-xs active:scale-95 transition cursor-pointer"
                    title="Download offline Homework PDF"
                    id={`btn-pdf-${hw.id}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Student Submission Action */}
                  {isStudent && (hw.status === 'assigned' || hw.status === 'revision') && (
                    <button
                      onClick={() => setShowSubmitModal(hw)}
                      className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 bg-[#0B132B] hover:bg-[#0D5BFF] dark:bg-[#0D5BFF] dark:hover:bg-blue-600 text-white py-2.5 px-4 rounded-2xl text-[11px] font-bold active:scale-95 transition cursor-pointer"
                      id={`btn-submit-${hw.id}`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Submit Work
                    </button>
                  )}

                  {/* Tutor Submission Review Action */}
                  {isTutor && hw.status === 'submitted' && (
                    <button
                      onClick={() => {
                        setReviewStatus('completed');
                        setFeedback('');
                        setShowReviewModal(hw);
                      }}
                      className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 rounded-2xl text-[11px] font-bold active:scale-95 transition cursor-pointer"
                      id={`btn-review-${hw.id}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Review Sub
                    </button>
                  )}

                  {/* Tutor / Admin Delete Action */}
                  {(isTutor || isAdmin) && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this homework?')) {
                          deleteHomeworkAssignment(hw.id);
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/50 text-red-500 dark:text-red-400 p-2.5 rounded-2xl text-xs active:scale-95 transition cursor-pointer"
                      id={`btn-delete-${hw.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Submissions feedback or student notes overview */}
                {(hw.status === 'completed' || hw.status === 'revision' || hw.status === 'submitted') && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800 space-y-2">
                    {hw.submissionNotes && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-bold text-slate-600 dark:text-slate-400">Student Response: </span>
                        <p className="italic line-clamp-2 mt-0.5 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                          "{hw.submissionNotes}"
                        </p>
                      </div>
                    )}
                    {hw.submissionFileUrl && (
                      <a
                        href={hw.submissionFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Student Attached Solution Document
                      </a>
                    )}
                    {hw.feedback && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-bold text-slate-600 dark:text-slate-400">Tutor Feedback: </span>
                        <p className="italic line-clamp-2 mt-0.5 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                          "{hw.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: ASSIGN HOMEWORK */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D5BFF]" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Assign New Homework
                  </h3>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                {/* Student Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Select Student *
                  </label>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Student --</option>
                    {getStudentList().map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Only students with an accepted or running tuition are displayed.
                  </p>
                </div>

                {/* Subject & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Subject *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics, Physics"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Homework Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Algebra Problem Set 3, Newton's Laws"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Homework description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Instructions & Text Tasks *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide description, formulas, problems or textbook page references..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* PDF upload field */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Attach PDF Homework Sheet (Optional)
                  </label>
                  <FileUpload
                    currentFileUrl={pdfUrl}
                    folder="homework"
                    onUpload={(url) => setPdfUrl(url)}
                    allowedTypes={['application/pdf']}
                    label="Upload PDF Task Document"
                  />
                  {pdfUrl && (
                    <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Document successfully attached.
                    </p>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="flex items-center gap-1.5 bg-[#0B132B] hover:bg-[#0D5BFF] dark:bg-[#0D5BFF] dark:hover:bg-blue-600 text-white font-semibold text-xs px-6 py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    {isAssigning && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Assign Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SUBMIT HOMEWORK WORK */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#0D5BFF]" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Submit Homework Completion Report
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Submit details for: {showSubmitModal.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubmitModal(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmissionSubmit} className="space-y-4">
                {/* Solution Text Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Completion Notes / Explanation *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe how you completed the tasks, answer numbers, or provide your typed response details..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Upload Solution Document */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Attach Completed Solution (PDF, Images, etc)
                  </label>
                  <FileUpload
                    currentFileUrl={submissionFileUrl}
                    folder="homework"
                    onUpload={(url) => setSubmissionFileUrl(url)}
                    allowedTypes={['application/pdf', 'image/*']}
                    label="Upload PDF or Images of Completed Homework"
                  />
                  {submissionFileUrl && (
                    <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Solution attachment uploaded successfully.
                    </p>
                  )}
                </div>

                {/* Submit actions */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(null)}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWork}
                    className="flex items-center gap-1.5 bg-[#0B132B] hover:bg-[#0D5BFF] dark:bg-[#0D5BFF] dark:hover:bg-blue-600 text-white font-semibold text-xs px-6 py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingWork && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Submit Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REVIEW SUBMISSION (Tutor Mode) */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Review Student Submission
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Task: {showReviewModal.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Response Details */}
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Student Completion Notes:
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed italic">
                    "{showReviewModal.submissionNotes || 'No notes provided'}"
                  </p>

                  {showReviewModal.submissionFileUrl && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <a
                        href={showReviewModal.submissionFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs px-4.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        Open Student Solution Attachment
                      </a>
                    </div>
                  )}
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {/* Status selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Review Status *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReviewStatus('completed')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold text-xs cursor-pointer ${
                          reviewStatus === 'completed'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approved / Completed
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewStatus('revision')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold text-xs cursor-pointer ${
                          reviewStatus === 'revision'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Request Revision
                      </button>
                    </div>
                  </div>

                  {/* Feedback Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Review Feedback Comments
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Type comments, feedback, corrections or specific requests for changes..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit actions */}
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(null)}
                      className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isReviewingWork}
                      className="flex items-center gap-1.5 bg-[#0B132B] hover:bg-[#0D5BFF] dark:bg-[#0D5BFF] dark:hover:bg-blue-600 text-white font-semibold text-xs px-6 py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
                    >
                      {isReviewingWork && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Save Review Report
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WHITEBOARD WATCH MODE OVERLAY (For Online Screen Shares & Live class studies) */}
      <AnimatePresence>
        {showWatchModal && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0B132B] text-white overflow-y-auto">
            {/* Header top bar */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0D5BFF] rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    {showWatchModal.title}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider bg-white/10 text-[#0D5BFF]">
                      {showWatchModal.subject}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Online Tuition Classroom Homework Viewer Mode
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadHomeworkPDF(showWatchModal)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                  title="Download Assignment Sheet"
                >
                  <Download className="w-4 h-4" />
                  Download Sheet
                </button>
                <button
                  onClick={() => setShowWatchModal(null)}
                  className="p-3 bg-white/10 hover:bg-rose-600 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main viewboard container */}
            <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Side parameters */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#0D5BFF]">
                    Homework Information
                  </h4>
                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Tutor:</span>
                      <span className="font-bold text-white text-sm">{getUserName(showWatchModal.tutorId, 'tutor')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Student:</span>
                      <span className="font-bold text-white text-sm">{getUserName(showWatchModal.studentId, 'student')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Due Date:</span>
                      <span className="font-semibold text-white">
                        {showWatchModal.dueDate ? new Date(showWatchModal.dueDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No specific due date'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Assignment Status:</span>
                      <div className="mt-1 inline-block">
                        {renderStatus(showWatchModal.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main whiteboard sheet */}
                <div className="md:col-span-2 bg-slate-950/80 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl relative">
                  <div className="absolute top-4 right-4 text-[9px] font-bold text-white/20 select-none">
                    VIRTUAL LESSON BOARD
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-lg font-black text-white border-b border-white/10 pb-3 uppercase tracking-tight">
                      Instructions & Homework Description
                    </h2>
                    <p className="text-sm md:text-base text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                      {showWatchModal.text}
                    </p>
                  </div>

                  {showWatchModal.pdfUrl && (
                    <div className="pt-6 border-t border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-rose-400" />
                          <div className="text-left">
                            <span className="text-xs font-bold block text-white">Attached Document File</span>
                            <span className="text-[10px] text-slate-400">PDF Homework Sheet provided by Tutor</span>
                          </div>
                        </div>
                        <a
                          href={showWatchModal.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-[#0D5BFF] hover:bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Document
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submissions/Feedback in Watch Mode */}
              {(showWatchModal.status === 'completed' || showWatchModal.status === 'revision' || showWatchModal.status === 'submitted') && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4">
                  <h3 className="font-extrabold text-sm text-[#0D5BFF] uppercase tracking-wider">
                    Work Submission & Verification Logs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                    {showWatchModal.submissionNotes && (
                      <div className="space-y-1">
                        <span className="font-bold text-slate-400">Student Solution Report:</span>
                        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10">
                          <p className="italic leading-relaxed">
                            "{showWatchModal.submissionNotes}"
                          </p>
                          {showWatchModal.submissionFileUrl && (
                            <a
                              href={showWatchModal.submissionFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[#0D5BFF] hover:underline mt-2.5 font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Submitted Solution File
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {showWatchModal.feedback && (
                      <div className="space-y-1">
                        <span className="font-bold text-slate-400">Tutor Feedback Review:</span>
                        <div className="bg-[#0D5BFF]/10 p-4 rounded-2xl border border-[#0D5BFF]/30">
                          <p className="italic leading-relaxed text-blue-100">
                            "{showWatchModal.feedback}"
                          </p>
                          <span className="block text-[10px] text-slate-400 mt-2.5">
                            Reviewed on {showWatchModal.reviewedAt ? new Date(showWatchModal.reviewedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
