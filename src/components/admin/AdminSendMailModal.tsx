import React, { useState, useMemo, useEffect } from 'react';
import { User } from '../../store';
import { Send, X, Mail, Sparkles, CheckCircle2, AlertCircle, Info, FileCheck, RefreshCw, Copy, Check } from 'lucide-react';
import { sendWelcomeMail, sendCustomAdminMail } from '../../services/mailService';

interface AdminSendMailModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// Generate missing fields bullets based on actual user profile
export function computeMissingFieldsList(user: User): string[] {
  const missing: string[] = [];

  const hasAvailability = !!(user.daysPerWeek || (user.availabilitySlots && Object.keys(user.availabilitySlots).length > 0));
  if (!hasAvailability) {
    missing.push("Your preferred Tuition Days & Time");
  }

  const isVerified = user.isVerified || (user.nidStatus === 'approved' && user.academicStatus === 'approved');
  const hasIdProof = !!(user.nidFrontImg || user.nidBackImg || (user.documents && user.documents.length > 0));
  if (!isVerified || !hasIdProof) {
    missing.push("A clear photo of your NID or University Student ID Card");
  }

  if (user.role === 'tutor') {
    if (!user.university && !user.school) {
      missing.push("Your Current University / College & Department Name");
    }
    if (!user.subjects || (Array.isArray(user.subjects) && user.subjects.length === 0)) {
      missing.push("Your preferred Tutoring Subjects & Class Levels");
    }
    if (!user.hourlyRate) {
      missing.push("Your Expected Tuition Salary / Rate");
    }
  } else {
    if (!user.studentClass && !user.course && !user.subject) {
      missing.push("Current Class Level & Required Tuition Subjects");
    }
  }

  if (!user.district || (!user.thana && !user.area)) {
    missing.push("Your Preferred Tuition Location (District & Area)");
  }

  if (missing.length === 0) {
    missing.push("Your preferred Tuition Days & Time");
    missing.push("A clear photo of your NID or University Student ID Card");
  }

  return missing;
}

export function buildReminderEmailTemplate(user: User): string {
  const userName = user.name ? ` ${user.name}` : "";
  const missingList = computeMissingFieldsList(user);
  const formattedMissing = missingList.map((item) => `• ${item}`).join('\n\n');
  const profileLinkSection = user.role === 'tutor' && user.id 
    ? `\n\n🔗 Your Teacher Profile Link:\nhttps://edutrackbd.vercel.app/teachers/${user.id}` 
    : '';

  return `Hello${userName},

To complete your tuition setup and profile verification on EduTrack, please send us:

${formattedMissing}${profileLinkSection}

This helps us keep the platform safe and verified for everyone. Thank you!

EduTrack Bangladesh
🌐 https://edutrackbd.vercel.app
📧 edutrackbangladesh@gmail.com`;
}

export default function AdminSendMailModal({ user, onClose, onSuccess }: AdminSendMailModalProps) {
  const hasIdProof = !!(user.nidFrontImg || user.nidBackImg || (user.documents && user.documents.length > 0));
  const hasAvailability = !!(user.daysPerWeek || (user.availabilitySlots && Object.keys(user.availabilitySlots).length > 0));
  const isProfileIncomplete = !user.isVerified || !hasIdProof || !hasAvailability || !user.district;
  const [mailType, setMailType] = useState<'reminder' | 'welcome' | 'custom'>(
    isProfileIncomplete ? 'reminder' : 'welcome'
  );

  const initialSubject = useMemo(() => {
    if (isProfileIncomplete) {
      return `Complete your tuition setup & profile verification - EduTrack`;
    }
    return `Welcome to EduTrack Bangladesh, ${user.name || 'Member'}! 🎓`;
  }, [isProfileIncomplete, user.name]);

  const [subject, setSubject] = useState(initialSubject);
  const [customMessage, setCustomMessage] = useState(
    isProfileIncomplete ? buildReminderEmailTemplate(user) : ''
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Update defaults when switching template types
  const handleSwitchType = (type: 'reminder' | 'welcome' | 'custom') => {
    setMailType(type);
    setError(null);
    if (type === 'reminder') {
      setSubject(`Complete your tuition setup & profile verification - EduTrack`);
      setCustomMessage(buildReminderEmailTemplate(user));
    } else if (type === 'welcome') {
      setSubject(`Welcome to EduTrack Bangladesh, ${user.name || 'Member'}! 🎓`);
      setCustomMessage('');
    } else {
      setSubject(`Important Update from EduTrack Bangladesh Administration`);
      setCustomMessage(`Hello ${user.name || 'Member'},\n\nWe are reaching out to you from EduTrack Bangladesh administration regarding your account.\n\n`);
    }
  };

  const handleResetToTemplate = () => {
    setCustomMessage(buildReminderEmailTemplate(user));
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage || subject);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      let res;
      if (mailType === 'welcome' && !customMessage.trim()) {
        res = await sendWelcomeMail({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentClass: user.studentClass,
          school: user.school,
          university: user.university,
          course: user.course,
          district: user.district,
        });
      } else {
        res = await sendCustomAdminMail({
          userId: user.id,
          toEmail: user.email,
          toName: user.name,
          subject: subject.trim() || `Message from EduTrack Bangladesh Administration`,
          messageBody: customMessage.trim(),
          role: user.role,
          district: user.district,
          studentClass: user.studentClass,
          school: user.school,
          university: user.university,
          course: user.course,
          profileUrl: user.role === 'tutor' && user.id ? `https://edutrackbd.vercel.app/teachers/${user.id}` : undefined,
        });
      }

      if (res && res.success) {
        onSuccess(`Email delivered to ${user.email} via Brevo Mail!${res.simulated ? ' (Simulated)' : ''}`);
        onClose();
      } else if (res && res.isIpError) {
        setError(res.message || "Brevo IP Whitelist restriction active.");
      } else {
        setError(res?.error || res?.message || "Failed to deliver email via Brevo.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An unexpected error occurred while sending email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#0B132B] via-[#111A2E] to-[#0D5BFF] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
              <Mail className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-blue-300">Admin Email Dispatcher</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">Manual Trigger</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Send Notification to {user.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* Target Recipient Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0D5BFF]/10 text-[#0D5BFF] font-black flex items-center justify-center text-sm">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 font-mono">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-[8px] font-black rounded uppercase tracking-wider ${
                user.role === 'tutor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400'
              }`}>
                {user.role}
              </span>
              <span className={`px-2 py-1 text-[8px] font-black rounded uppercase tracking-wider ${
                user.isVerified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400'
              }`}>
                {user.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>

          {/* Mail Mode Toggle */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
              Select Email Template Type
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Reminder Template Button */}
              <button
                type="button"
                onClick={() => handleSwitchType('reminder')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  mailType === 'reminder'
                    ? 'border-[#0D5BFF] bg-blue-50/50 dark:bg-blue-950/30 text-[#0D5BFF] ring-2 ring-[#0D5BFF]/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileCheck className="w-4 h-4 text-[#0D5BFF]" />
                  {mailType === 'reminder' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0D5BFF]" />}
                </div>
                <div className="mt-2">
                  <p className="text-[11px] font-black leading-tight">Verification Reminder</p>
                  <p className="text-[8px] text-slate-400 font-medium mt-0.5">Missing ID, Days & Time</p>
                </div>
              </button>

              {/* Welcome Template Button */}
              <button
                type="button"
                onClick={() => handleSwitchType('welcome')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  mailType === 'welcome'
                    ? 'border-[#0D5BFF] bg-blue-50/50 dark:bg-blue-950/30 text-[#0D5BFF] ring-2 ring-[#0D5BFF]/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="w-4 h-4 text-[#0D5BFF]" />
                  {mailType === 'welcome' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0D5BFF]" />}
                </div>
                <div className="mt-2">
                  <p className="text-[11px] font-black leading-tight">Standard Welcome</p>
                  <p className="text-[8px] text-slate-400 font-medium mt-0.5">Platform Overview</p>
                </div>
              </button>

              {/* Custom Admin Template Button */}
              <button
                type="button"
                onClick={() => handleSwitchType('custom')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  mailType === 'custom'
                    ? 'border-[#0D5BFF] bg-blue-50/50 dark:bg-blue-950/30 text-[#0D5BFF] ring-2 ring-[#0D5BFF]/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Mail className="w-4 h-4 text-[#0D5BFF]" />
                  {mailType === 'custom' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0D5BFF]" />}
                </div>
                <div className="mt-2">
                  <p className="text-[11px] font-black leading-tight">Custom Note</p>
                  <p className="text-[8px] text-slate-400 font-medium mt-0.5">Blank custom message</p>
                </div>
              </button>

            </div>
          </div>

          {/* Email Subject Input */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Action Required: Complete Your Profile & Verification"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0D5BFF]"
              required
            />
          </div>

          {/* Message Body Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                {mailType === 'reminder' ? 'Actionable Reminder Message Body' : mailType === 'custom' ? 'Custom Admin Message Body' : 'Add Optional Personal Note'}
              </label>
              <div className="flex items-center gap-2">
                {mailType === 'reminder' && (
                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-[#0D5BFF] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto-Fill Missing Fields
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
              </div>
            </div>
            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={
                mailType === 'reminder'
                  ? "Type or customize your profile reminder message..."
                  : mailType === 'custom'
                  ? "Type your specific announcement or message to the user here..."
                  : "Optional custom note to include inside the welcome email..."
              }
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0D5BFF] font-mono leading-relaxed"
              required={mailType === 'reminder' || mailType === 'custom'}
            />
          </div>

          {/* Helper Note */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#0D5BFF] shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Emails are sent to <strong>{user.email}</strong> via Brevo Transactional Email Service. The user will receive an actionable link pointing to <strong>edutrackbd.vercel.app</strong>.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-2xl space-y-2">
              <div className="flex items-start gap-2.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes("authorised_ips") && (
                <div className="pt-1 pl-6">
                  <a
                    href="https://app.brevo.com/security/authorised_ips"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-amber-700 transition-colors"
                  >
                    Manage Brevo Authorised IPs ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <a
              href={`mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(customMessage)}`}
              className="text-[10px] font-black text-slate-500 hover:text-[#0D5BFF] uppercase tracking-wider underline cursor-pointer"
            >
              Open in Mail App (mailto) ↗
            </a>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#0D5BFF] to-[#0040C9] text-white text-xs font-black uppercase tracking-wider hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reminder Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
