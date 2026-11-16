import React, { useState, useMemo, memo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore, ClassLog, User } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { triggerConfetti } from '../utils/confetti';
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
  Trash2,
  BarChart3,
  History,
  Users,
  Download,
  ArrowUpRight,
  PieChart,
  Pin,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserAvatar from './UserAvatar';
import { canViewTutorPhoto } from '../../shared/tutorPrivacy';
import { useBackHandler, scrollFieldIntoView } from '../utils/mobileWebView';

const AnimatingCount = memo(function AnimatingCount({ value, className = '' }: { value: number | string; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.8, opacity: 0.5, y: -2 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className={`inline-block ${className}`}
    >
      {value}
    </motion.span>
  );
});

interface ClassLogsCalendarProps {
  role: 'student' | 'tutor';
}

const ClassLogsCalendar = memo(function ClassLogsCalendar({ role }: ClassLogsCalendarProps) {
  const { 
    currentUser, 
    users, 
    sessions, 
    messages, 
    classLogs, 
    logClass, 
    verifyClass,
    assignHomework,
    deleteClassLog
  } = useAppStore(useShallow((state) => ({
    currentUser: state.currentUser,
    users: state.users,
    sessions: state.sessions,
    messages: state.messages,
    classLogs: state.classLogs || [],
    logClass: state.logClass,
    verifyClass: state.verifyClass,
    assignHomework: state.assignHomework,
    deleteClassLog: state.deleteClassLog
  })));

  // States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedClassLog, setSelectedClassLog] = useState<ClassLog | null>(null);

  // Homework assignment states
  const [homeworkText, setHomeworkText] = useState('');
  const [showWatchHomeworkModal, setShowWatchHomeworkModal] = useState(false);
  const [isSavingHomework, setIsSavingHomework] = useState(false);
  const [homeworkSuccess, setHomeworkSuccess] = useState(false);

  useBackHandler(showWatchHomeworkModal, () => setShowWatchHomeworkModal(false), 'classlog-watch-hw');
  useBackHandler(showLogModal, () => setShowLogModal(false), 'classlog-log-modal');

  useEffect(() => {
    if (selectedClassLog) {
      setHomeworkText(selectedClassLog.homework || '');
      setHomeworkSuccess(false);
    }
  }, [selectedClassLog?.id]);

  // Form states for Student marking a class
  const [formTutorId, setFormTutorId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Verification notes for Tutor actions
  const [tutorReplyNotes, setTutorReplyNotes] = useState('');

  const [isPinned, setIsPinned] = useState(() => {
    return localStorage.getItem('edutrack_pin_class_cal') === 'true';
  });

  const togglePin = () => {
    const nextVal = !isPinned;
    setIsPinned(nextVal);
    if (nextVal) {
      localStorage.setItem('edutrack_pin_class_cal', 'true');
      useAppStore.getState().sendNotification(
        currentUser?.id || 'anon',
        'Class Cal Pinned 📌',
        'Class Calculator is now set as your primary landing page when entering the site!',
        'success'
      );
    } else {
      localStorage.removeItem('edutrack_pin_class_cal');
      useAppStore.getState().sendNotification(
        currentUser?.id || 'anon',
        'Class Cal Unpinned 📌',
        'Default overview dashboard restored as your landing page.',
        'info'
      );
    }
    // Sync immediately with the tab bar in parent components
    window.dispatchEvent(new Event('class_cal_pin_changed'));
  };

  // Analytics and Monthly Reports states
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'byTutor' | 'byMonth' | 'allYearMonthLog'>('byTutor');
  const [analyticsSearch, setAnalyticsSearch] = useState('');

  // Export features for CSV and PDF records
  const exportMonthToCSV = (mItem: any) => {
    const monthLogs = classLogs.filter(log => {
      const isUserRelevant = role === 'student' ? log.studentId === currentUser?.id : log.tutorId === currentUser?.id;
      return isUserRelevant && log.date.startsWith(mItem.monthKey);
    });

    const headers = ['Date', 'Subject', 'Partner Role', 'Partner Name', 'Status', 'Rate/Session (BDT)', 'Notes'];
    
    const rows = monthLogs.map(log => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      const partnerName = partnerUser?.name || 'Academic Partner';
      const rate = partnerUser?.hourlyRate || currentUser?.hourlyRate || 800;
      
      return [
        log.date,
        `"${log.subject.replace(/"/g, '""')}"`,
        role === 'student' ? 'Teacher' : 'Student',
        `"${partnerName.replace(/"/g, '""')}"`,
        log.status.toUpperCase(),
        rate,
        `"${(log.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const totalRate = monthLogs.reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    const verifiedRate = monthLogs.filter(l => l.status === 'verified').reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    rows.push([]);
    rows.push(['SUMMARY STATS', '', '', '', '', '', '']);
    rows.push(['Total logged sessions', mItem.total, '', '', '', '', '']);
    rows.push(['Verified OK sessions', mItem.verified, '', '', '', '', '']);
    rows.push(['Pending approval sessions', mItem.pending, '', '', '', '', '']);
    rows.push(['Disputed sessions', mItem.disputed, '', '', '', '', '']);
    rows.push(['Estimated Financial Cost/Earnings', `৳${totalRate}`, '', '', '', '', '']);
    rows.push(['Verified Settled Financials', `৳${verifiedRate}`, '', '', '', '', '']);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teaching_log_${mItem.monthKey}_${currentUser?.name?.replace(/\s+/g, '_') || 'ledger'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHomeworkTXT = (log: ClassLog) => {
    const student = users.find(u => u.id === log.studentId);
    const tutor = users.find(u => u.id === log.tutorId);
    const studentName = student?.name || 'Student';
    const tutorName = tutor?.name || 'Tutor';
    
    const textContent = `================================================
EDUTRACK ACADEMIC HOMEWORK SHEET
================================================
Subject: ${log.subject}
Date: ${log.date}
Tutor/Mentor: ${tutorName}
Student Name: ${studentName}
Logged At: ${new Date(log.loggedAt).toLocaleString()}
------------------------------------------------
HOMEWORK ASSIGNMENT / INSTRUCTIONS:
------------------------------------------------
${log.homework || 'No homework text provided.'}
------------------------------------------------
Please show this to your tutor during your live tuition.
================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `homework_${log.date}_${log.subject.replace(/\s+/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHomeworkPDF = async (log: ClassLog) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const margin = 20;
    let y = 25;

    const student = users.find(u => u.id === log.studentId);
    const tutor = users.find(u => u.id === log.tutorId);
    const studentName = student?.name || 'Academic Student';
    const tutorName = tutor?.name || 'Academic Mentor';

    // Stylish header banner
    doc.setFillColor(11, 19, 43); // Deep midnight blue
    doc.rect(0, 0, 220, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('LIVE TUITION HOMEWORK SHEET', margin, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Official Homework Directives — Presentation Ready`, margin, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 20);

    // Metadata
    y = 55;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('LESSON DETAILS', margin, y);
    
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, 190, y);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Subject:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(log.subject, margin + 25, y);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Date:`, margin + 110, y);
    doc.setFont('helvetica', 'bold');
    doc.text(log.date, margin + 130, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Student:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(studentName, margin + 25, y);

    doc.setFont('helvetica', 'normal');
    doc.text(`Tutor:`, margin + 110, y);
    doc.setFont('helvetica', 'bold');
    doc.text(tutorName, margin + 130, y);

    // Homework Text Section
    y += 16;
    doc.setTextColor(11, 19, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ASSIGNED HOMEWORK TASKS', margin, y);

    y += 5;
    doc.setDrawColor(11, 19, 43);
    doc.setLineWidth(1);
    doc.line(margin, y, 190, y);

    y += 10;
    doc.setFillColor(248, 250, 252); // slate-50
    const hwContent = log.homework || 'No specific homework instructions have been provided.';
    const splitHw = doc.splitTextToSize(hwContent, 160);
    const boxHeight = Math.max(40, splitHw.length * 6 + 15);
    doc.rect(margin, y, 170, boxHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, 170, boxHeight, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    doc.text(splitHw, margin + 8, y + 10);

    // Submission statement / signature area
    y += boxHeight + 15;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, 190, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Please keep this sheet handy and show it to your tutor in your live tuition session.', margin, y);

    doc.save(`homework_${log.date}_${log.subject.replace(/\s+/g, '_')}.pdf`);
  };

  const exportMonthToPDF = async (mItem: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    const monthLogs = classLogs.filter(log => {
      const isUserRelevant = role === 'student' ? log.studentId === currentUser?.id : log.tutorId === currentUser?.id;
      return isUserRelevant && log.date.startsWith(mItem.monthKey);
    });

    const totalRate = monthLogs.reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    const verifiedRate = monthLogs.filter(l => l.status === 'verified').reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    // Decorative Header Band
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, 220, 38, 'F');

    // Title inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('MONTHLY TEACHING LEDGER', margin, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Timeline report for ${mItem.monthLabel}`, margin, 26);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 155, 18);

    doc.setTextColor(30, 41, 59);

    y = 52;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('USER PROFILE DETAILS', margin, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Name: ${currentUser?.name || 'N/A'}`, margin, y);
    doc.text(`Email: ${currentUser?.email || 'N/A'}`, margin + 90, y);
    
    y += 5;
    doc.text(`Role: ${role === 'student' ? 'Student' : 'Tutor'}`, margin, y);
    doc.text(`University Branch: ${currentUser?.university || 'N/A'}`, margin + 90, y);

    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, 195, y);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('MONTHLY FINANCIAL & SESSION SUMMARY', margin, y);

    y += 6;
    // Box 1: Sessions
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, 52, 22, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.rect(margin, y, 52, 22, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${mItem.total}`, margin + 6, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Logged Classes', margin + 6, y + 16);

    // Box 2: Verified OK
    doc.setFillColor(240, 253, 250);
    doc.rect(margin + 58, y, 58, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`${mItem.verified}`, margin + 64, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Approved Sessions', margin + 64, y + 16);

    // Box 3: Financial Settlements
    doc.setFillColor(239, 246, 255);
    doc.rect(margin + 122, y, 58, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`BDT ${verifiedRate}`, margin + 128, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Confirmed earnings', margin + 128, y + 16);

    y += 32;
    doc.setTextColor(30, 41, 59);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DETAILED CONDUCTION LEDGER', margin, y);

    y += 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Date', margin + 4, y + 5);
    doc.text('Subject', margin + 30, y + 5);
    doc.text('Partner Participant', margin + 85, y + 5);
    doc.text('Status', margin + 135, y + 5);
    doc.text('Rate', margin + 165, y + 5);

    y += 7;

    doc.setFont('helvetica', 'normal');
    monthLogs.forEach((log, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Date', margin + 4, y + 5);
        doc.text('Subject', margin + 30, y + 5);
        doc.text('Partner Participant', margin + 85, y + 5);
        doc.text('Status', margin + 135, y + 5);
        doc.text('Rate', margin + 165, y + 5);
        y += 7;
        doc.setFont('helvetica', 'normal');
      }

      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, 180, 8, 'F');
      }

      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      const partnerName = partnerUser?.name || 'Academic Partner';
      const rate = partnerUser?.hourlyRate || currentUser?.hourlyRate || 800;

      doc.setFontSize(8);
      doc.text(log.date, margin + 4, y + 5.5);
      doc.text(log.subject.substring(0, 28), margin + 30, y + 5.5);
      doc.text(partnerName.substring(0, 25), margin + 85, y + 5.5);
      
      if (log.status === 'verified') {
        doc.setTextColor(5, 150, 105);
        doc.text('VERIFIED', margin + 135, y + 5.5);
      } else if (log.status === 'disputed') {
        doc.setTextColor(220, 38, 38);
        doc.text('DISPUTED', margin + 135, y + 5.5);
      } else {
        doc.setTextColor(217, 119, 6);
        doc.text('PENDING', margin + 135, y + 5.5);
      }
      doc.setTextColor(30, 41, 59);

      doc.text(`BDT ${rate}`, margin + 165, y + 5.5);

      y += 8;
    });

    // Append Detailed Class Diary Summaries & Assigned Homework
    const activeDiaryLogs = monthLogs.filter(log => log.notes || log.tutorNotes);
    if (activeDiaryLogs.length > 0) {
      doc.addPage();
      y = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('MONTHLY CLASS DIARIES & HOMEWORK COMPENDIUM', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Detailed offline compilation of class summaries and instructor homework guidance.', margin, y);

      y += 8;

      activeDiaryLogs.forEach((log) => {
        const partnerId = role === 'student' ? log.tutorId : log.studentId;
        const partnerUser = users.find(u => u.id === partnerId);
        const partnerName = partnerUser?.name || 'Academic Partner';

        const logNotes = log.notes ? `"${log.notes}"` : 'No summary notes entered.';
        const splitLogNotes = doc.splitTextToSize(logNotes, 165);
        const tutorNotesText = log.tutorNotes ? log.tutorNotes : 'Please revise topics, solve practice questions, and refer to offline textbook exercises.';
        const splitHwNotes = doc.splitTextToSize(tutorNotesText, 165);

        // Calculate heights dynamically
        const entryHeight = 12 + (splitLogNotes.length * 4.5) + 12 + (splitHwNotes.length * 4.5) + 8;

        if (y + entryHeight > 275) {
          doc.addPage();
          y = 20;
        }

        // Draw bounding border
        doc.setFillColor(252, 253, 254);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(margin, y, 180, entryHeight, 'FD');

        // Draw title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${log.date} • ${log.subject}`, margin + 6, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Partner: ${partnerName}`, margin + 115, y + 7);

        // Draw Discussion notes
        let contentY = y + 14;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Class Discussion & Topic Overview:', margin + 6, contentY);
        contentY += 4.5;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(51, 65, 85);
        doc.text(splitLogNotes, margin + 6, contentY);

        // Draw Homework notes
        contentY += (splitLogNotes.length * 4.5) + 4;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(161, 98, 7); // amber-700
        doc.text('Assigned Homework Guidelines & Directives:', margin + 6, contentY);
        contentY += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(113, 63, 18);
        doc.text(splitHwNotes, margin + 6, contentY);

        y += entryHeight + 6;
      });
    }

    y += 12;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated teaching statement. All logs are recorded using geo-verification mechanisms and real-time attendance logging.', margin, y);

    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Student / Parent Signature', margin + 10, y);
    doc.text('Tutor / Instructor Signature', margin + 110, y);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, y - 5, margin + 70, y - 5);
    doc.line(margin + 110, y - 5, margin + 170, y - 5);

    doc.save(`academic_ledger_${mItem.monthKey}.pdf`);
  };

  const exportYearToCSV = (yData: any) => {
    const yearLogs = classLogs.filter(log => {
      const isUserRelevant = role === 'student' ? log.studentId === currentUser?.id : log.tutorId === currentUser?.id;
      return isUserRelevant && log.date.startsWith(`${yData.year}-`);
    });

    const headers = ['Date', 'Month', 'Subject', 'Partner Role', 'Partner Name', 'Status', 'Rate/Session (BDT)', 'Notes'];
    
    const rows = yearLogs.map(log => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      const partnerName = partnerUser?.name || 'Academic Partner';
      const rate = partnerUser?.hourlyRate || currentUser?.hourlyRate || 800;
      const dateParts = log.date.split('-');
      const monthNum = Number(dateParts[1]);
      const monthName = monthNames[monthNum - 1] || '';
      
      return [
        log.date,
        monthName,
        `"${log.subject.replace(/"/g, '""')}"`,
        role === 'student' ? 'Teacher' : 'Student',
        `"${partnerName.replace(/"/g, '""')}"`,
        log.status.toUpperCase(),
        rate,
        `"${(log.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const totalRate = yearLogs.reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    const verifiedRate = yearLogs.filter(l => l.status === 'verified').reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    const totalVerified = yearLogs.filter(l => l.status === 'verified').length;
    const totalPending = yearLogs.filter(l => l.status === 'pending').length;
    const totalDisputed = yearLogs.filter(l => l.status === 'disputed').length;

    rows.push([]);
    rows.push(['ACADEMIC YEAR SUMMARY', yData.year, '', '', '', '', '', '']);
    rows.push(['Total logged sessions', yData.total, '', '', '', '', '', '']);
    rows.push(['Verified OK sessions', totalVerified, '', '', '', '', '', '']);
    rows.push(['Pending approval sessions', totalPending, '', '', '', '', '', '']);
    rows.push(['Disputed sessions', totalDisputed, '', '', '', '', '', '']);
    rows.push(['Estimated Year Earnings/Cost', `৳${totalRate}`, '', '', '', '', '', '']);
    rows.push(['Verified Settled Financials', `৳${verifiedRate}`, '', '', '', '', '', '']);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `academic_year_${yData.year}_${currentUser?.name?.replace(/\s+/g, '_') || 'ledger'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportYearToPDF = async (yData: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    const yearLogs = classLogs.filter(log => {
      const isUserRelevant = role === 'student' ? log.studentId === currentUser?.id : log.tutorId === currentUser?.id;
      return isUserRelevant && log.date.startsWith(`${yData.year}-`);
    });

    const totalRate = yearLogs.reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    const verifiedRate = yearLogs.filter(l => l.status === 'verified').reduce((acc, log) => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      return acc + (partnerUser?.hourlyRate || currentUser?.hourlyRate || 800);
    }, 0);

    const totalVerified = yearLogs.filter(l => l.status === 'verified').length;

    // Decorative Header Band
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, 220, 38, 'F');

    // Title inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ACADEMIC YEAR TEACHING LEDGER', margin, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Full Timeline report for Year ${yData.year}`, margin, 26);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 155, 18);

    doc.setTextColor(30, 41, 59);

    y = 52;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ACADEMIC RECORD DETAILS', margin, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Instructor/Student: ${currentUser?.name || 'N/A'}`, margin, y);
    doc.text(`Email Address: ${currentUser?.email || 'N/A'}`, margin + 90, y);
    
    y += 5;
    doc.text(`Account Role: ${role === 'student' ? 'Student Participant' : 'Certified Tutor'}`, margin, y);
    doc.text(`University Branch: ${currentUser?.university || 'N/A'}`, margin + 90, y);

    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 195, y);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ANNUAL STATS & FINANCIALS', margin, y);

    y += 6;
    // Box 1: Sessions
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, 52, 22, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.rect(margin, y, 52, 22, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${yData.total}`, margin + 6, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Annual Classes Logged', margin + 6, y + 16);

    // Box 2: Verified OK
    doc.setFillColor(240, 253, 250);
    doc.rect(margin + 58, y, 58, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`${totalVerified}`, margin + 64, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Verified Sessions', margin + 64, y + 16);

    // Box 3: Financial Settlements
    doc.setFillColor(239, 246, 255);
    doc.rect(margin + 122, y, 58, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`BDT ${verifiedRate}`, margin + 128, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Confirmed earnings', margin + 128, y + 16);

    y += 32;
    doc.setTextColor(30, 41, 59);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ANNUAL RECORD CHRONOLOGY', margin, y);

    y += 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Date', margin + 4, y + 5);
    doc.text('Subject', margin + 30, y + 5);
    doc.text('Partner Participant', margin + 85, y + 5);
    doc.text('Status', margin + 135, y + 5);
    doc.text('Rate', margin + 165, y + 5);

    y += 7;

    doc.setFont('helvetica', 'normal');
    yearLogs.forEach((log, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Date', margin + 4, y + 5);
        doc.text('Subject', margin + 30, y + 5);
        doc.text('Partner Participant', margin + 85, y + 5);
        doc.text('Status', margin + 135, y + 5);
        doc.text('Rate', margin + 165, y + 5);
        y += 7;
        doc.setFont('helvetica', 'normal');
      }

      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, 180, 8, 'F');
      }

      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      const partnerName = partnerUser?.name || 'Academic Partner';
      const rate = partnerUser?.hourlyRate || currentUser?.hourlyRate || 800;

      doc.setFontSize(8);
      doc.text(log.date, margin + 4, y + 5.5);
      doc.text(log.subject.substring(0, 28), margin + 30, y + 5.5);
      doc.text(partnerName.substring(0, 25), margin + 85, y + 5.5);
      
      if (log.status === 'verified') {
        doc.setTextColor(5, 150, 105);
        doc.text('VERIFIED', margin + 135, y + 5.5);
      } else if (log.status === 'disputed') {
        doc.setTextColor(220, 38, 38);
        doc.text('DISPUTED', margin + 135, y + 5.5);
      } else {
        doc.setTextColor(217, 119, 6);
        doc.text('PENDING', margin + 135, y + 5.5);
      }
      doc.setTextColor(30, 41, 59);

      doc.text(`BDT ${rate}`, margin + 165, y + 5.5);

      y += 8;
    });

    y += 12;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated teaching statement. All logs are recorded using geo-verification mechanisms and real-time attendance logging.', margin, y);

    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Student / Parent Signature', margin + 10, y);
    doc.text('Tutor / Instructor Signature', margin + 110, y);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, y - 5, margin + 70, y - 5);
    doc.line(margin + 110, y - 5, margin + 170, y - 5);

    doc.save(`annual_academic_ledger_${yData.year}.pdf`);
  };

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

  const activeMonthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const relevant = classLogs.filter(log => {
      const isUserRelevant = role === 'student' ? log.studentId === currentUser?.id : log.tutorId === currentUser?.id;
      return isUserRelevant && log.date.startsWith(monthPrefix);
    });
    const total = relevant.length;
    const verified = relevant.filter(l => l.status === 'verified').length;
    const pending = relevant.filter(l => l.status === 'pending').length;
    const disputed = relevant.filter(l => l.status === 'disputed').length;

    return {
      monthKey: monthPrefix,
      monthLabel: `${monthNames[month]} ${year}`,
      total,
      verified,
      pending,
      disputed
    };
  }, [classLogs, year, month, role, currentUser, monthNames]);

  // Memoized connected users based on active sessions or chat logs for the current user
  const connectedUsers = useMemo(() => {
    if (!currentUser) return [];
    if (role === 'student') {
      // Find tutors with active/valid sessions with this student
      const tutorIdsWithSessions = new Set(
        sessions
          .filter(s => s.studentId === currentUser.id && s.status !== 'rejected' && s.status !== 'cancelled')
          .map(s => s.tutorId)
      );
      return users.filter(u => u.role === 'tutor' && tutorIdsWithSessions.has(u.id));
    } else {
      // Find students with active/valid sessions with this tutor
      const studentIdsWithSessions = new Set(
        sessions
          .filter(s => s.tutorId === currentUser.id && s.status !== 'rejected' && s.status !== 'cancelled')
          .map(s => s.studentId)
      );
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

  // Combined sorted list - only return active/connected partners for Class Cal tracking
  const fallbackUsers = useMemo(() => {
    return activePartners;
  }, [activePartners]);

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

  // Aggregate monthly tuition analytics grouped by teacher and by month
  const analyticsData = useMemo(() => {
    if (!currentUser) return { partners: [], months: [] };

    // Filter logs relative to current user role
    const relevantLogs = classLogs.filter(log => {
      if (role === 'student') {
        return log.studentId === currentUser.id;
      } else {
        return log.tutorId === currentUser.id;
      }
    });

    // 1. Group by Partner (Tutor or Student)
    const partnerMap: { 
      [partnerId: string]: {
        partner: User | undefined;
        total: number;
        verified: number;
        pending: number;
        disputed: number;
        byMonth: { 
          [monthKey: string]: { 
            total: number; 
            verified: number; 
            pending: number; 
            disputed: number; 
          } 
        };
      } 
    } = {};

    // 2. Group by Month (e.g. "2026-06")
    const monthMap: { 
      [monthKey: string]: {
        monthLabel: string;
        total: number;
        verified: number;
        pending: number;
        disputed: number;
        partners: { 
          [partnerId: string]: { 
            partner: User | undefined; 
            total: number; 
            verified: number; 
            pending: number; 
            disputed: number; 
          } 
        };
      } 
    } = {};

    relevantLogs.forEach(log => {
      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);
      
      const dateParts = log.date.split('-');
      if (dateParts.length < 2) return;
      const monthKey = `${dateParts[0]}-${dateParts[1]}`; // "YYYY-MM"
      
      const [y, m] = dateParts.map(Number);
      const monthLabel = `${monthNames[m - 1]} ${y}`;

      // Initialize Partner Map
      if (!partnerMap[partnerId]) {
        partnerMap[partnerId] = {
          partner: partnerUser,
          total: 0,
          verified: 0,
          pending: 0,
          disputed: 0,
          byMonth: {}
        };
      }

      // Initialize Month Map
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthLabel,
          total: 0,
          verified: 0,
          pending: 0,
          disputed: 0,
          partners: {}
        };
      }

      if (!monthMap[monthKey].partners[partnerId]) {
        monthMap[monthKey].partners[partnerId] = {
          partner: partnerUser,
          total: 0,
          verified: 0,
          pending: 0,
          disputed: 0
        };
      }

      // Increment counters
      partnerMap[partnerId].total++;
      monthMap[monthKey].total++;
      monthMap[monthKey].partners[partnerId].total++;

      if (log.status === 'verified') {
        partnerMap[partnerId].verified++;
        monthMap[monthKey].verified++;
        monthMap[monthKey].partners[partnerId].verified++;
      } else if (log.status === 'disputed') {
        partnerMap[partnerId].disputed++;
        monthMap[monthKey].disputed++;
        monthMap[monthKey].partners[partnerId].disputed++;
      } else {
        partnerMap[partnerId].pending++;
        monthMap[monthKey].pending++;
        monthMap[monthKey].partners[partnerId].pending++;
      }

      // Track details by month under each partner
      if (!partnerMap[partnerId].byMonth[monthKey]) {
        partnerMap[partnerId].byMonth[monthKey] = { total: 0, verified: 0, pending: 0, disputed: 0 };
      }
      partnerMap[partnerId].byMonth[monthKey].total++;
      if (log.status === 'verified') {
        partnerMap[partnerId].byMonth[monthKey].verified++;
      } else if (log.status === 'disputed') {
        partnerMap[partnerId].byMonth[monthKey].disputed++;
      } else {
        partnerMap[partnerId].byMonth[monthKey].pending++;
      }
    });

    // Format maps into sorted lists
    const partnersArray = Object.keys(partnerMap).map(id => ({
      id,
      ...partnerMap[id],
      byMonthList: Object.keys(partnerMap[id].byMonth).map(mKey => {
        const [y, m] = mKey.split('-').map(Number);
        return {
          monthKey: mKey,
          monthLabel: `${monthNames[m - 1]} ${y}`,
          year: y,
          month: m,
          ...partnerMap[id].byMonth[mKey]
        };
      }).sort((a, b) => b.monthKey.localeCompare(a.monthKey)) // Newest months first
    }));

    const monthsArray = Object.keys(monthMap).map(mKey => ({
      monthKey: mKey,
      ...monthMap[mKey],
      partnersList: Object.keys(monthMap[mKey].partners).map(pId => ({
        id: pId,
        ...monthMap[mKey].partners[pId]
      }))
    })).sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Newest months first

    return { partners: partnersArray, months: monthsArray };
  }, [classLogs, currentUser, role, users]);

  // Aggregate session logs across all years month by month
  const yearlyAnalytics = useMemo(() => {
    if (!currentUser) return [];

    const relevantLogs = classLogs.filter(log => {
      if (role === 'student') {
        return log.studentId === currentUser.id;
      } else {
        return log.tutorId === currentUser.id;
      }
    });

    // structure: { [year: number]: { [month: number]: { total: number, verified: number, pending: number, disputed: number, partners: { [id: string]: { partner: User, count: number, ... } } } } }
    const yearsMap: {
      [year: number]: {
        [month: number]: {
          total: number;
          verified: number;
          pending: number;
          disputed: number;
          partners: {
            [partnerId: string]: {
              partner: any;
              count: number;
              verified: number;
              pending: number;
              disputed: number;
            }
          };
        }
      }
    } = {};

    relevantLogs.forEach(log => {
      const dateParts = log.date.split('-');
      if (dateParts.length < 3) return;
      const y = Number(dateParts[0]);
      const m = Number(dateParts[1]); // 1-12

      if (!yearsMap[y]) {
        yearsMap[y] = {};
        for (let i = 1; i <= 12; i++) {
          yearsMap[y][i] = {
            total: 0,
            verified: 0,
            pending: 0,
            disputed: 0,
            partners: {}
          };
        }
      }

      const partnerId = role === 'student' ? log.tutorId : log.studentId;
      const partnerUser = users.find(u => u.id === partnerId);

      const targetMonth = yearsMap[y][m];
      targetMonth.total++;
      if (log.status === 'verified') targetMonth.verified++;
      else if (log.status === 'disputed') targetMonth.disputed++;
      else targetMonth.pending++;

      if (!targetMonth.partners[partnerId]) {
        targetMonth.partners[partnerId] = {
          partner: partnerUser,
          count: 0,
          verified: 0,
          pending: 0,
          disputed: 0
        };
      }
      targetMonth.partners[partnerId].count++;
      if (log.status === 'verified') targetMonth.partners[partnerId].verified++;
      else if (log.status === 'disputed') targetMonth.partners[partnerId].disputed++;
      else targetMonth.partners[partnerId].pending++;
    });

    const sortedYears = Object.keys(yearsMap)
      .map(Number)
      .sort((a, b) => b - a) // Newest years first
      .map(y => {
        const monthsList = Object.keys(yearsMap[y])
          .map(Number)
          .map(m => {
            const mData = yearsMap[y][m];
            const partnerBreakdown = Object.keys(mData.partners).map(pId => ({
              id: pId,
              ...mData.partners[pId]
            }));

            return {
              monthNum: m,
              monthName: monthNames[m - 1],
              ...mData,
              partnersList: partnerBreakdown
            };
          })
          .filter(mItem => mItem.total > 0) // Only return months that have conduction logs logged
          .sort((a, b) => b.monthNum - a.monthNum); // Newest month first

        const totalYearSessions = monthsList.reduce((acc, curr) => acc + curr.total, 0);

        return {
          year: y,
          total: totalYearSessions,
          months: monthsList
        };
      });

    return sortedYears;
  }, [classLogs, currentUser, role, users, monthNames]);



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

    let finalSubjectsList = [...selectedSubjects];
    if (customSubjectInput.trim()) {
      const val = customSubjectInput.trim();
      if (!finalSubjectsList.includes(val)) {
        finalSubjectsList.push(val);
      }
    }

    if (finalSubjectsList.length === 0) {
      setFormError('Please select or input at least one tuition subject');
      return;
    }

    const finalSubjectStr = finalSubjectsList.join(', ');

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
      const targetStudentId = role === 'student' ? currentUser.id : formTutorId;
      const targetTutorId = role === 'student' ? formTutorId : currentUser.id;

      await logClass(
        targetStudentId,
        targetTutorId,
        finalSubjectStr,
        dateStr,
        formNotes
      );
      triggerConfetti();
      setTimeout(() => {
        setShowLogModal(false);
        setFormSuccess(false);
        setFormNotes('');
        setSelectedSubjects([]);
        setCustomSubjectInput('');
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
      if (status === 'verified') {
        triggerConfetti();
      }
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
      {/* 0. Pin Status Panel */}
      <div className="col-span-12">
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-[#0D5BFF]/5 dark:to-[#1e293b]/20 border border-blue-100/60 dark:border-[#0D5BFF]/10 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${isPinned ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-400 dark:text-slate-300'}`}>
              <Pin className="w-5 h-5 rotate-[45deg]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Class Calculator Pinning Engine
                </h3>
                {isPinned && (
                  <span className="text-[8px] font-black tracking-widest uppercase bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active Landing Page
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isPinned 
                  ? "Class Calculator is currently pinned. Whenever you login or click Dashboard, you will bypass the overview and land directly here."
                  : "Pin this view to bypass the default landing page. You'll instantly see Class Calculator whenever you open your dashboard."}
              </p>
            </div>
          </div>
          <button
            onClick={togglePin}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shrink-0 ${
              isPinned
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10 border border-amber-600/10"
                : "bg-[#0D5BFF] hover:bg-blue-600 text-white shadow-md shadow-blue-500/15"
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : 'rotate-[45deg]'}`} />
            {isPinned ? "Unpin View" : "Pin Class Calculator"}
          </button>
        </div>
      </div>

      {/* 1. Header Metrics Panel */}
      <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Month Classes</p>
            <h4 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight mt-1 text-slate-800 dark:text-white flex items-baseline gap-1">
              <AnimatingCount value={stats.total} />
              <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 lowercase not-italic ml-1">Classes</span>
            </h4>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF]">Verified Classes</p>
            <h4 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 flex items-baseline gap-1">
              <AnimatingCount value={stats.verified} />
              <span className="text-xs sm:text-sm font-bold text-emerald-500/80 dark:text-emerald-400/80 lowercase not-italic ml-1">Verified</span>
            </h4>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Pending Review</p>
            <h4 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight mt-1 text-amber-500 flex items-baseline gap-1">
              <AnimatingCount value={stats.pending} />
              <span className="text-xs sm:text-sm font-bold text-amber-500/80 dark:text-amber-400/80 lowercase not-italic ml-1">Pending</span>
            </h4>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 animate-pulse shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Disputed Entries</p>
            <h4 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight mt-1 text-rose-500 flex items-baseline gap-1">
              <AnimatingCount value={stats.disputed} />
              <span className="text-xs sm:text-sm font-bold text-rose-500/80 dark:text-rose-400/80 lowercase not-italic ml-1">Disputed</span>
            </h4>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Interactive Calendar Panel - 7 columns on Desktop */}
      <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm flex flex-col justify-between">
        <div>
          {/* Calendar Header Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[8px] font-black tracking-widest uppercase text-slate-400">Month Verification Planner</p>
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                {monthNames[month]} {year}
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Dynamic Active Month Export Buttons */}
              <div className="flex items-center gap-1.5 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => exportMonthToCSV(activeMonthStats)}
                  disabled={activeMonthStats.total === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeMonthStats.total === 0
                      ? 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs'
                  }`}
                  title={activeMonthStats.total === 0 ? "No logs to export in this month" : "Download Current Month (CSV)"}
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportMonthToPDF(activeMonthStats)}
                  disabled={activeMonthStats.total === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeMonthStats.total === 0
                      ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  }`}
                  title={activeMonthStats.total === 0 ? "No logs to export in this month" : "Download Current Month (PDF)"}
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevMonth}
                  className="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Days Grid Heading */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 sm:mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <span key={day} className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid Rendering */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={`empty-${idx}`} className="h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-dashed border-slate-100/30 dark:border-slate-800/35" />
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
                  className={`h-12 sm:h-20 rounded-xl sm:rounded-2xl p-1 sm:p-2.5 border text-left flex flex-col justify-between transition-all duration-300 relative cursor-pointer group min-w-0 ${
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
          {(role === 'student' || role === 'tutor') && (
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
              className="ml-auto flex items-center gap-2 bg-[#0B132B] hover:bg-[#0D5BFF] hover:shadow-xl hover:shadow-blue-500/15 text-white rounded-2xl px-6 py-3 text-sm font-bold hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Class Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Action Panel Detailed Viewer - 5 columns on Desktop */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        
        {/* Detail Panel Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm flex-1">
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
                    <p className="text-[10px] font-black truncate text-slate-800 dark:text-white">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                {/* Homework System */}
                {role === 'tutor' && (
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400 text-[8.5px] font-black uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        <span>Teacher's Homework Desk</span>
                      </div>
                      {selectedClassLog.homework && (
                        <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                          Active Homework
                        </span>
                      )}
                    </div>
                    
                    <textarea
                      id="tutor-homework-textarea"
                      value={homeworkText}
                      onChange={(e) => setHomeworkText(e.target.value)}
                      placeholder="Assign offline practice tasks, exercises, or textbook guidelines for the student to show you during live tuition..."
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 dark:text-white leading-relaxed placeholder-slate-400 focus:outline-none transition min-h-[90px]"
                    />

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        id="save-homework-button"
                        onClick={async () => {
                          setIsSavingHomework(true);
                          await assignHomework(selectedClassLog.id, homeworkText);
                          triggerConfetti();
                          setIsSavingHomework(false);
                          setHomeworkSuccess(true);
                          setTimeout(() => setHomeworkSuccess(false), 3000);
                        }}
                        disabled={isSavingHomework}
                        className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingHomework ? 'Saving...' : 'Save & Assign Homework'}
                      </button>

                      {selectedClassLog.homework && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            title="Download PDF Copy"
                            onClick={() => downloadHomeworkPDF(selectedClassLog)}
                            className="p-2.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Download TXT Copy"
                            onClick={() => downloadHomeworkTXT(selectedClassLog)}
                            className="p-2.5 bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 rounded-xl transition cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {homeworkSuccess && (
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider animate-pulse">
                        ✓ Homework instructions updated & notified to student!
                      </p>
                    )}
                  </div>
                )}

                {role === 'student' && (
                  <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/20 dark:from-indigo-950/20 dark:to-blue-950/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-[8.5px] font-black uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>My Homework Assignment</span>
                      </div>
                      
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                        selectedClassLog.homework 
                          ? 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-400 animate-pulse'
                          : 'bg-slate-400/10 text-slate-400'
                      }`}>
                        {selectedClassLog.homework ? 'Action Required' : 'No Tasks'}
                      </span>
                    </div>

                    {selectedClassLog.homework ? (
                      <div className="space-y-3.5">
                        <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30 shadow-xs">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-150 leading-relaxed whitespace-pre-wrap">
                            {selectedClassLog.homework}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <button
                            type="button"
                            id="student-watch-homework"
                            onClick={() => setShowWatchHomeworkModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] shadow-sm hover:shadow transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Watch / Present Homework</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              id="student-download-pdf-homework"
                              onClick={() => downloadHomeworkPDF(selectedClassLog)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-[10px] transition cursor-pointer"
                              title="Download PDF file"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>

                            <button
                              type="button"
                              id="student-download-txt-homework"
                              onClick={() => downloadHomeworkTXT(selectedClassLog)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[10px] transition cursor-pointer"
                              title="Download TXT file"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>TXT</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center font-medium italic">
                          💡 Open watch mode to present this homework on screen during live tuition.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          No homework instructions have been assigned for this class log.
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm h-72 flex flex-col">
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

      {/* 4.5. Monthly Conduction & Partner Analytics Ledger (Added for student/teacher statistics) */}
      <div className="col-span-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm flex flex-col gap-6" id="monthly-analytics-ledger-card">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#0D5BFF] mb-1">
              Monthly Analytics & Ledger
            </p>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <span>{role === 'student' ? 'Tutor Conduction & Monthly Records' : 'Student Log & Performance Analytics'}</span>
            </h3>
            <p className="text-slate-455 dark:text-slate-400 text-xs font-bold mt-1">
              {role === 'student' 
                ? 'Check which teacher total taught you monthly and view all historical months data.' 
                : 'Track student logs, monthly summary statistics, and verified sessions.'}
            </p>
          </div>

          {/* Interactive Tab Selector and Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab('byTutor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeAnalyticsTab === 'byTutor'
                    ? 'bg-white dark:bg-slate-900 text-[#0B132B] dark:text-white shadow-sm'
                    : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>By {role === 'student' ? 'Teacher' : 'Student'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab('byMonth')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeAnalyticsTab === 'byMonth'
                    ? 'bg-white dark:bg-slate-900 text-[#0B132B] dark:text-white shadow-sm'
                    : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>By Month Log</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab('allYearMonthLog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeAnalyticsTab === 'allYearMonthLog'
                    ? 'bg-white dark:bg-slate-900 text-[#0B132B] dark:text-white shadow-sm'
                    : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>All-Year Log</span>
              </button>
            </div>

            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder={`Search ${role === 'student' ? 'teacher' : 'student'}...`}
                value={analyticsSearch}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                onChange={(e) => setAnalyticsSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 pl-9 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF] transition-all w-full sm:w-48"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
            </div>

            {/* Quick Export Active Month Ledger */}
            <div className="flex items-center gap-1 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => exportMonthToCSV(activeMonthStats)}
                disabled={activeMonthStats.total === 0}
                className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeMonthStats.total === 0
                    ? 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs'
                }`}
                title={activeMonthStats.total === 0 ? "No logs to export in this month" : "Download Selected Month (CSV)"}
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Month CSV</span>
              </button>
              <button
                type="button"
                onClick={() => exportMonthToPDF(activeMonthStats)}
                disabled={activeMonthStats.total === 0}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeMonthStats.total === 0
                    ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                }`}
                title={activeMonthStats.total === 0 ? "No logs to export in this month" : "Download Selected Month (PDF)"}
              >
                <FileText className="w-3 h-3 text-rose-500" />
                <span>Month PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Analytics Panels */}
        <div className="space-y-6">
          {activeAnalyticsTab === 'byTutor' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyticsData.partners
                .filter(p => !analyticsSearch || (p.partner?.name || '').toLowerCase().includes(analyticsSearch.toLowerCase()))
                .map(p => {
                  const partnerName = p.partner?.name || `User (${p.id.substring(0, 5)}...)`;
                  const partnerUni = p.partner?.university || 'Expert Academy';
                  const partnerCourse = p.partner?.course || p.partner?.subject || 'Academic Tutor';
                  
                  return (
                    <div 
                      key={p.id}
                      className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:border-[#0D5BFF]/25 transition duration-300 flex flex-col gap-6"
                    >
                      {/* Partner Identity Header */}
                      <div className="flex items-start gap-4">
                        {(() => {
                          const currentUser = useAppStore.getState().currentUser;
                          const sessions = useAppStore.getState().sessions || [];
                          const unlocked =
                            role === 'student' && currentUser
                              ? canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, p.id, sessions)
                              : true;
                          return (
                            <UserAvatar
                              src={unlocked ? p.partner?.profileImage : undefined}
                              locked={!unlocked}
                              name={partnerName}
                              className="w-12 h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-md"
                              textClassName="font-black text-sm text-white"
                            />
                          );
                        })()}
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">
                            {partnerName}
                          </h4>
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                            {partnerUni} • {partnerCourse}
                          </p>
                        </div>
                      </div>

                      {/* Cumulative Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100/60 dark:border-slate-800/80 rounded-2xl p-3 text-center shadow-inner">
                          <p className="text-[7.5px] font-black uppercase tracking-wider text-slate-400">Total</p>
                          <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{p.total}</p>
                        </div>
                        <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/20 rounded-2xl p-3 text-center">
                          <p className="text-[7.5px] font-black uppercase tracking-wider text-emerald-500">Verified</p>
                          <p className="text-lg font-black text-emerald-500 mt-0.5">{p.verified}</p>
                        </div>
                        <div className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/20 rounded-2xl p-3 text-center">
                          <p className="text-[7.5px] font-black uppercase tracking-wider text-amber-500">Pending</p>
                          <p className="text-lg font-black text-amber-500 mt-0.5">{p.pending}</p>
                        </div>
                        <div className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/20 rounded-2xl p-3 text-center">
                          <p className="text-[7.5px] font-black uppercase tracking-wider text-rose-500">Dispute</p>
                          <p className="text-lg font-black text-rose-500 mt-0.5">{p.disputed}</p>
                        </div>
                      </div>

                      {/* Monthly Roll Timeline for this Partner */}
                      <div className="space-y-3">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400 ml-1">
                          Monthly Conduction Breakdown
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {p.byMonthList.map(bm => {
                            const verifiedPct = bm.total > 0 ? (bm.verified / bm.total) * 100 : 0;
                            const pendingPct = bm.total > 0 ? (bm.pending / bm.total) * 100 : 0;
                            const disputedPct = bm.total > 0 ? (bm.disputed / bm.total) * 100 : 0;

                            return (
                              <div 
                                key={bm.monthKey} 
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">
                                    {bm.monthLabel}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase shrink-0">
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                      {bm.total} Classes
                                    </span>
                                    {bm.verified > 0 && (
                                      <span className="text-emerald-500 font-black">• {bm.verified} OK</span>
                                    )}
                                  </div>
                                </div>

                                {/* Stacked progress bar breakdown */}
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                  <div 
                                    style={{ width: `${verifiedPct}%` }} 
                                    className="bg-emerald-500 h-full" 
                                    title={`Verified: ${bm.verified} (${Math.round(verifiedPct)}%)`}
                                  />
                                  <div 
                                    style={{ width: `${pendingPct}%` }} 
                                    className="bg-amber-500 h-full" 
                                    title={`Pending: ${bm.pending} (${Math.round(pendingPct)}%)`}
                                  />
                                  <div 
                                    style={{ width: `${disputedPct}%` }} 
                                    className="bg-rose-500 h-full" 
                                    title={`Disputed: ${bm.disputed} (${Math.round(disputedPct)}%)`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {analyticsData.partners.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 text-xs italic font-semibold">
                  No tuition records available to display stats.
                </div>
              )}
            </div>
          ) : activeAnalyticsTab === 'byMonth' ? (
            /* By Month Chronological Roll */
            <div className="space-y-8">
              {analyticsData.months.map(m => (
                <div 
                  key={m.monthKey} 
                  className="bg-slate-50/40 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-3xl p-6"
                >
                  {/* Month Label Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        {m.monthLabel}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-350 rounded-full tracking-wider">
                        {m.total} Conduction Logs
                      </span>
                      <button
                        onClick={() => exportMonthToCSV(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                        title="Export CSV"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={() => exportMonthToPDF(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                        title="Export PDF"
                      >
                        <FileText className="w-3 h-3 text-rose-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Monthly Highlight Stat Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Highlight Card 1: Total */}
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="space-y-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Sessions</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-none">{m.total}</h4>
                        <p className="text-[9px] font-medium text-slate-400">Classes Taught</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-450 flex items-center justify-center font-black text-lg">
                        📚
                      </div>
                    </div>

                    {/* Highlight Card 2: Verified */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-100/50 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="space-y-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Verified OK</p>
                        <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{m.verified}</h4>
                        <p className="text-[9px] font-medium text-slate-400">Approved Logs</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
                        ✅
                      </div>
                    </div>

                    {/* Highlight Card 3: Pending */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-slate-900 border border-amber-100/50 dark:border-amber-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="space-y-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Approval</p>
                        <h4 className="text-2xl font-black text-amber-600 dark:text-amber-450 leading-none">{m.pending}</h4>
                        <p className="text-[9px] font-medium text-slate-400">Awaiting Signoff</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-450 flex items-center justify-center font-black text-lg">
                        ⏳
                      </div>
                    </div>

                    {/* Highlight Card 4: Disputed */}
                    <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 dark:from-rose-950/20 dark:to-slate-900 border border-rose-100/50 dark:border-rose-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="space-y-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Under Dispute</p>
                        <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none">{m.disputed}</h4>
                        <p className="text-[9px] font-medium text-slate-400">Needs Attention</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-450 flex items-center justify-center font-black text-lg">
                        ⚠️
                      </div>
                    </div>
                  </div>

                  {/* List of Partners during this Month */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {m.partnersList
                      .filter(p => !analyticsSearch || (p.partner?.name || '').toLowerCase().includes(analyticsSearch.toLowerCase()))
                      .map(p => {
                        const partnerName = p.partner?.name || `User (${p.id.substring(0, 5)}...)`;
                        const partnerUni = p.partner?.university || 'Expert Academy';
                        return (
                          <div 
                            key={p.id} 
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow duration-300"
                          >
                            <div className="flex items-start gap-3">
                              {(() => {
                                const currentUser = useAppStore.getState().currentUser;
                                const sessions = useAppStore.getState().sessions || [];
                                const unlocked =
                                  role === 'student' && currentUser
                                    ? canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, p.id, sessions)
                                    : true;
                                return (
                                  <UserAvatar
                                    src={unlocked ? p.partner?.profileImage : undefined}
                                    locked={!unlocked}
                                    name={partnerName}
                                    className="w-9 h-9 rounded-xl border border-slate-200/70 dark:border-slate-700"
                                    fallbackClassName="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                    textClassName="font-extrabold text-[11px]"
                                  />
                                );
                              })()}
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                                  {partnerName}
                                </h5>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                                  {partnerUni}
                                </p>
                              </div>
                            </div>

                            {/* Verification Stats inside Card */}
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider border-t border-slate-50 dark:border-slate-800/60 pt-2.5">
                              <span className="text-slate-400">Total: <span className="text-slate-800 dark:text-white font-extrabold">{p.total}</span></span>
                              <div className="flex gap-2">
                                {p.verified > 0 && (
                                  <span className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-lg">{p.verified} OK</span>
                                )}
                                {p.pending > 0 && (
                                  <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-lg">{p.pending} Wait</span>
                                )}
                                {p.disputed > 0 && (
                                  <span className="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-lg">{p.disputed} Err</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

              {analyticsData.months.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs italic font-semibold">
                  No chronological monthly logs logged.
                </div>
              )}
            </div>
          ) : (
            /* All Year Conduction Logs Month by Month */
            <div className="space-y-8 animate-fade-in" id="all-year-chronological-ledger">
              {yearlyAnalytics.map(yData => (
                <div 
                  key={yData.year} 
                  className="bg-slate-50/40 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-6"
                >
                  {/* Year Header Block */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                        📅
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                          Academic Year {yData.year}
                        </h4>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                          Timeline of Conduction Logs
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-4 py-2 bg-indigo-600 text-white rounded-full tracking-widest shadow-sm">
                        {yData.total} Classes Total
                      </span>
                      <button
                        onClick={() => exportYearToCSV(yData)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                        title="Export Year CSV"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>Year CSV</span>
                      </button>
                      <button
                        onClick={() => exportYearToPDF(yData)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                        title="Export Year PDF"
                      >
                        <FileText className="w-3 h-3 text-rose-500" />
                        <span>Year PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Months Chronological Stack */}
                  <div className="space-y-6">
                    {yData.months
                      .filter(m => !analyticsSearch || m.monthName.toLowerCase().includes(analyticsSearch.toLowerCase()) || m.partnersList.some(p => (p.partner?.name || '').toLowerCase().includes(analyticsSearch.toLowerCase())))
                      .map(mData => (
                        <div 
                          key={`${yData.year}-${mData.monthNum}`}
                          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-500/35 transition duration-300 shadow-sm flex flex-col gap-6"
                        >
                          {/* Month Info Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800/50 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                              <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                {mData.monthName} {yData.year}
                              </h5>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => exportMonthToCSV({ monthKey: `${yData.year}-${String(mData.monthNum).padStart(2, '0')}`, monthLabel: `${mData.monthName} ${yData.year}`, total: mData.total, verified: mData.verified, pending: mData.pending, disputed: mData.disputed })}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                                title="Export CSV"
                              >
                                <Download className="w-2.5 h-2.5 text-slate-500" />
                                <span>CSV</span>
                              </button>
                              <button
                                onClick={() => exportMonthToPDF({ monthKey: `${yData.year}-${String(mData.monthNum).padStart(2, '0')}`, monthLabel: `${mData.monthName} ${yData.year}`, total: mData.total, verified: mData.verified, pending: mData.pending, disputed: mData.disputed })}
                                className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                                title="Export PDF"
                              >
                                <FileText className="w-2.5 h-2.5 text-rose-500" />
                                <span>PDF</span>
                              </button>
                            </div>
                          </div>

                          {/* Monthly Highlight Stat Cards Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Highlight Card 1: Total */}
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                              <div className="space-y-1">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Sessions</p>
                                <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                                  <AnimatingCount value={mData.total} />
                                </h4>
                                <p className="text-[9px] font-medium text-slate-400">Classes Taught</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-455 flex items-center justify-center font-black text-lg">
                                📚
                              </div>
                            </div>

                            {/* Highlight Card 2: Verified */}
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-100/50 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                              <div className="space-y-1">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Verified OK</p>
                                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                  <AnimatingCount value={mData.verified} />
                                </h4>
                                <p className="text-[9px] font-medium text-slate-400">Approved Logs</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 flex items-center justify-center font-black text-lg">
                                ✅
                              </div>
                            </div>

                            {/* Highlight Card 3: Pending */}
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-slate-900 border border-amber-100/50 dark:border-amber-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                              <div className="space-y-1">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Approval</p>
                                <h4 className="text-2xl font-black text-amber-600 dark:text-amber-450 leading-none">
                                  <AnimatingCount value={mData.pending} />
                                </h4>
                                <p className="text-[9px] font-medium text-slate-400">Awaiting Signoff</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-455 flex items-center justify-center font-black text-lg">
                                ⏳
                              </div>
                            </div>

                            {/* Highlight Card 4: Disputed */}
                            <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 dark:from-rose-950/20 dark:to-slate-900 border border-rose-100/50 dark:border-rose-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                              <div className="space-y-1">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Under Dispute</p>
                                <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none">
                                  <AnimatingCount value={mData.disputed} />
                                </h4>
                                <p className="text-[9px] font-medium text-slate-400">Needs Attention</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-455 flex items-center justify-center font-black text-lg">
                                ⚠️
                              </div>
                            </div>
                          </div>

                          {/* List of Teachers (or Students) who taught during this specific month */}
                          <div className="space-y-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[#0D5BFF] ml-1">
                              {role === 'student' ? 'Teachers Conduction details' : 'Student Attendance details'}
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {mData.partnersList.map(partnerData => {
                                const pName = partnerData.partner?.name || `Academic Partner (${partnerData.id.substring(0, 6)}...)`;
                                const pUni = partnerData.partner?.university || 'Academic Department';
                                const pImg = partnerData.partner?.profileImage;

                                return (
                                  <div 
                                    key={partnerData.id}
                                    className="bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
                                  >
                                    {/* Identity block */}
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      {(() => {
                                        const currentUser = useAppStore.getState().currentUser;
                                        const sessions = useAppStore.getState().sessions || [];
                                        const unlocked =
                                          role === 'student' && currentUser
                                            ? canViewTutorPhoto({ id: currentUser.id, role: currentUser.role }, partnerData.id, sessions)
                                            : true;
                                        return (
                                          <UserAvatar
                                            src={unlocked ? pImg : undefined}
                                            locked={!unlocked}
                                            name={pName}
                                            className="w-9 h-9 rounded-xl shadow-sm"
                                            fallbackClassName="bg-gradient-to-tr from-[#0D5BFF] to-blue-600 text-white"
                                            textClassName="font-black text-[11px]"
                                          />
                                        );
                                      })()}
                                      <div className="min-w-0 flex-1">
                                        <h6 className="text-xs font-bold text-slate-800 dark:text-white leading-snug break-words">
                                          {pName}
                                        </h6>
                                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                                          {pUni}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Metrics & Count block */}
                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg flex items-center justify-end gap-1">
                                        <AnimatingCount value={partnerData.count} />
                                        <span>Classes</span>
                                      </span>
                                      <div className="flex gap-1.5 justify-end mt-1.5 text-[7.5px] font-extrabold uppercase">
                                        {partnerData.verified > 0 && (
                                          <span className="text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded-md">
                                            <AnimatingCount value={partnerData.verified} /> OK
                                          </span>
                                        )}
                                        {partnerData.pending > 0 && (
                                          <span className="text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded-md">
                                            <AnimatingCount value={partnerData.pending} /> Wait
                                          </span>
                                        )}
                                        {partnerData.disputed > 0 && (
                                          <span className="text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded-md">
                                            <AnimatingCount value={partnerData.disputed} /> Err
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {yearlyAnalytics.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-xs italic font-semibold">
                  No chronological multi-year conduction logs registered.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Homework Presentation Overlay (Watch Mode) */}
      <AnimatePresence>
        {showWatchHomeworkModal && selectedClassLog && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh]"
            >
              {/* Modal Header */}
              <div className="bg-indigo-900 dark:bg-indigo-950 px-5 sm:px-8 py-4 sm:py-6 flex items-center justify-between text-white border-b border-indigo-950/20">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Live Presentation Deck</span>
                  <h3 className="text-base font-black uppercase tracking-tight mt-0.5">Tuition Homework Reader</h3>
                </div>
                <button 
                  onClick={() => setShowWatchHomeworkModal(false)}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer shrink-0"
                  aria-label="Close homework viewer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/30">
                {/* Header Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-wrap gap-y-4">
                  <div className="w-1/2">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Course / Subject</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{selectedClassLog.subject}</p>
                  </div>
                  <div className="w-1/2">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Session Date</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{selectedClassLog.date}</p>
                  </div>
                  <div className="w-1/2">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Academic Mentor</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {users.find(u => u.id === selectedClassLog.tutorId)?.name || 'Your Mentor'}
                    </p>
                  </div>
                  <div className="w-1/2">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Student</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {users.find(u => u.id === selectedClassLog.studentId)?.name || 'Active Student'}
                    </p>
                  </div>
                </div>

                {/* Text Paper */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[1.8rem] border border-indigo-100 dark:border-slate-800 shadow-sm relative min-h-[220px]">
                  {/* Visual binder decoration */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                    <span>Screen Sharing Mode</span>
                  </div>
                  
                  <h4 className="text-[9px] font-black uppercase text-indigo-500 tracking-wider mb-3">Homework Directives:</h4>
                  <p className="font-mono text-base font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed select-all">
                    {selectedClassLog.homework}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">
                  Present this view during live tutoring session.
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadHomeworkPDF(selectedClassLog)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => downloadHomeworkTXT(selectedClassLog)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download TXT</span>
                  </button>
                  <button
                    onClick={() => setShowWatchHomeworkModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition cursor-pointer"
                  >
                    Close View
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom Student Mark-Class Interactive Overlay Modal (Editorial Brutalist Styling) */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-900/40" id="mark-class-modal-portal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl relative"
            >
              <button 
                onClick={() => setShowLogModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close mark class modal"
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
                      {fallbackUsers.length > 0 ? (
                        fallbackUsers.map(tutor => (
                          <option key={tutor.id} value={tutor.id} className="font-normal text-[#0B132B] dark:text-white">
                            {tutor.name} ({tutor.subject || (tutor.subjects && tutor.subjects.length > 0 ? tutor.subjects.join(', ') : 'Coaches All Subjects')})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No active session-connected tutors found</option>
                      )}
                    </select>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Subject Topic(s)</label>
                    
                    {/* Selected Subjects Chips */}
                    {selectedSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {selectedSubjects.map((sub, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-[#0D5BFF] dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/10"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSubjects(selectedSubjects.filter(s => s !== sub))}
                              className="w-4 h-4 rounded-full bg-blue-500/10 hover:bg-rose-500 hover:text-white flex items-center justify-center text-[9px] transition cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={customSubjectInput}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        onChange={(e) => setCustomSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = customSubjectInput.trim().replace(/,$/, '');
                            if (val) {
                              if (!selectedSubjects.includes(val)) {
                                setSelectedSubjects([...selectedSubjects, val]);
                              }
                              setCustomSubjectInput('');
                            }
                          }
                        }}
                        placeholder={selectedSubjects.length > 0 ? "Add another subject..." : "Type custom subject (Press Enter or comma to add)"}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 pr-16 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-300 focus:outline-none focus:border-[#0D5BFF] transition-all"
                      />
                      {customSubjectInput.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            const val = customSubjectInput.trim();
                            if (!selectedSubjects.includes(val)) {
                              setSelectedSubjects([...selectedSubjects, val]);
                            }
                            setCustomSubjectInput('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0B132B] hover:bg-[#0D5BFF] text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    
                    {/* Quick Select Recommendation Pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {['Physics', 'Chemistry', 'Higher Math', 'Biology', 'English', 'ICT', 'General Science'].map((sub) => {
                        const isSelected = selectedSubjects.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
                              } else {
                                setSelectedSubjects([...selectedSubjects, sub]);
                              }
                            }}
                            className={`px-2.5 py-1 text-[10px] font-black rounded-full border transition cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-500/15 border-[#0D5BFF] text-[#0D5BFF]' 
                                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#0D5BFF] hover:text-[#0D5BFF]'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Optional Notes</label>
                    <textarea
                      value={formNotes}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
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

                  <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
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
})

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

export default ClassLogsCalendar;
