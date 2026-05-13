import { useAppStore, User } from '../../store';
import { 
  CheckCircle, 
  XCircle, 
  Shield, 
  CreditCard, 
  Users, 
  History,
  Bell,
  Search,
  Wallet,
  ArrowDownCircle,
  FileText,
  Activity,
  Zap,
  LayoutDashboard,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MetricCard } from '../../components/DashboardComponents';

export default function AdminDashboard() {
  const { 
    users, 
    payments, 
    verifyTutor, 
    approvePayment, 
    rejectPayment, 
    withdrawals, 
    approveWithdrawal, 
    rejectWithdrawal,
    sendNotification,
    sendMessage,
    currentUser
  } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'verifications' | 'payments' | 'withdrawals'>('verifications');
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/payments')) setActiveTab('payments');
    else if (path.endsWith('/withdrawals')) setActiveTab('withdrawals');
    else setActiveTab('verifications');
  }, [location.pathname]);

  const handleTabChange = (tab: 'verifications' | 'payments' | 'withdrawals') => {
    const pathMap = {
      verifications: '/dashboard',
      payments: '/dashboard/payments',
      withdrawals: '/dashboard/withdrawals'
    };
    navigate(pathMap[tab]);
  };

  const promptForBio = async (tutor: User) => {
    try {
      await sendNotification(
        tutor.id, 
        'Bio Required', 
        'Please update your professional bio to help students learn more about your expertise.', 
        'warning'
      );
      
      if (currentUser) {
        await sendMessage({
          senderId: currentUser.id,
          receiverId: tutor.id,
          content: "Hello! We noticed your profile is missing a bio. A professional bio significantly increases your booking rate. Please head to your profile settings and add a brief description of your experience and teaching style."
        });
      }
      
      alert(`Prompt sent to ${tutor.name}`);
    } catch (error) {
      console.error("Failed to send prompt:", error);
    }
  };

  const tutors = users.filter(u => u.role === 'tutor');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const allPayments = payments;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-black font-heading text-[#0B132B] uppercase italic leading-[0.8] mb-4">
            Command Center
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
            <Activity className="w-3 h-3 text-[#0D5BFF]" />
            Infrastructure Node Alpha-01
          </p>
        </div>
        <div className="flex items-center space-x-4">
           <div className="bg-[#0B132B] text-white px-8 py-4 rounded-[2rem] flex items-center space-x-4 shadow-2xl">
              <Shield className="w-5 h-5 text-[#0D5BFF]" />
              <div className="border-l border-white/10 pl-4">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Authorization</p>
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Level 4: Root Admin</p>
              </div>
           </div>
        </div>
      </div>

      {/* Real-time Status Grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[3rem] p-10 flex flex-col justify-between h-56 shadow-sm overflow-hidden relative group transition-all hover:border-[#0D5BFF]">
           <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] flex items-center justify-center -mr-4 -mt-4 transition-colors group-hover:bg-blue-50">
              <Users className="w-8 h-8 text-slate-200 group-hover:text-[#0D5BFF]" />
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payload</p>
              <h3 className="text-4xl font-black italic text-[#0B132B]">{tutors.length}</h3>
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Registered Tutors</p>
        </div>

        <div className="lg:col-span-1 bg-[#0D5BFF] rounded-[3rem] p-10 flex flex-col justify-between h-56 shadow-2xl relative overflow-hidden group">
           <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
           <Shield className="w-8 h-8 text-white/20 mb-4" />
           <div>
              <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Awaiting Review</p>
              <h3 className="text-4xl font-black italic text-white">{tutors.filter(t => t.nidStatus !== 'approved' || t.academicStatus !== 'approved').length}</h3>
           </div>
           <p className="text-[10px] font-black text-white/80 uppercase tracking-widest italic">Verification Queue</p>
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[3rem] p-10 flex flex-col justify-between h-56 shadow-sm group hover:border-amber-400">
           <Zap className={`w-8 h-8 ${pendingPayments.length > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-200'}`} />
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquid Stream</p>
              <h3 className="text-4xl font-black italic text-[#0B132B]">{pendingPayments.length}</h3>
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Pending Clearances</p>
        </div>

        <div className="lg:col-span-1 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-10 flex flex-col justify-between h-56 text-center group hover:bg-slate-50 transition-all">
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-slate-50 transition-transform group-hover:rotate-12">
              <Wallet className="w-6 h-6 text-[#0D5BFF]" />
           </div>
           <div>
              <h3 className="text-3xl font-black italic text-[#0B132B]">{pendingWithdrawals.length}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Withdrawal Hooks</p>
           </div>
        </div>
      </div>

      {/* Navigation Matrix */}
      <div className="flex space-x-12 border-b-2 border-slate-100 px-4">
        {[
          { id: 'verifications', label: 'Identity Protocol' },
          { id: 'payments', label: 'Inbound Revenue' },
          { id: 'withdrawals', label: 'Tutor Payouts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`text-[10px] font-black uppercase tracking-[0.3em] italic pb-6 transition-all relative ${
              activeTab === tab.id ? 'text-[#0D5BFF]' : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tabUnderlineAdmin" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#0D5BFF]" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'verifications' && (
          <motion.div 
            key="verifications"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="grid lg:grid-cols-1 gap-8">
              {tutors.map(tutor => (
                <div key={tutor.id} className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-12 group transition-all hover:shadow-xl">
                  <div className="flex items-center gap-8">
                     <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black italic text-slate-300 group-hover:text-[#0D5BFF] transition-colors overflow-hidden">
                       {tutor.name.charAt(0)}
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-[#0B132B] uppercase italic">{tutor.name}</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose">{tutor.university || 'Independent Expert'}</p>
                        <div className="flex gap-4 mt-4">
                           {/* NID Status Badge */}
                           <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                             tutor.nidStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                             tutor.nidStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                             'bg-amber-50 text-amber-600 border-amber-100'
                           }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${
                               tutor.nidStatus === 'approved' ? 'bg-emerald-500' : 
                               tutor.nidStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                             }`} />
                             NID: {tutor.nidStatus || 'Pending'}
                           </span>

                           {/* Academic Status Badge */}
                           <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                             tutor.academicStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                             tutor.academicStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                             'bg-amber-50 text-amber-600 border-amber-100'
                           }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${
                               tutor.academicStatus === 'approved' ? 'bg-emerald-500' : 
                               tutor.academicStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                             }`} />
                             Acad: {tutor.academicStatus || 'Pending'}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full md:w-fit">
                     <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol Actions</p>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSelectedTutor(tutor)}
                            className="flex-1 py-3 bg-[#0B132B] text-white rounded-xl text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-[#0D5BFF] transition-all"
                          >
                            Open Profile
                          </button>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div 
            key="payments"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
             <div className="bg-[#0B132B] rounded-[4rem] p-16 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#0D5BFF]/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-[#0D5BFF]" />
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase italic">Audit Pending Stream</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Volume Pending</p>
                      <p className="text-2xl font-black text-white italic">৳{pendingPayments.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</p>
                   </div>
                </div>

                <div className="space-y-4">
                   {pendingPayments.map(payment => (
                     <div key={payment.id} className="bg-white/5 rounded-[2.5rem] p-8 flex items-center justify-between border border-white/5 hover:bg-white/[0.08] transition-all group">
                        <div className="flex items-center gap-8">
                           <div className="text-[10px] font-black font-mono text-[#0D5BFF] bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20">
                             TRX: {payment.transactionId}
                           </div>
                           <div className="text-2xl font-black text-white italic">৳{payment.amount}</div>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => approvePayment(payment.id)} className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase italic shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">Authorize</button>
                           <button onClick={() => rejectPayment(payment.id)} className="px-8 py-3 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase italic hover:bg-rose-500 hover:text-white transition-all">Reject</button>
                        </div>
                     </div>
                   ))}
                   {pendingPayments.length === 0 && (
                     <div className="py-20 text-center opacity-30">
                        <Zap className="w-12 h-12 text-white mx-auto mb-6" />
                        <p className="text-[11px] font-black text-white uppercase tracking-[0.4em]">All inbound signals cleared</p>
                     </div>
                   )}
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'withdrawals' && (
          <motion.div 
            key="withdrawals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid lg:grid-cols-2 gap-8"
          >
             {pendingWithdrawals.map(req => {
               const tutor = users.find(u => u.id === req.tutorId);
               return (
                 <div key={req.id} className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm flex flex-col justify-between h-80 transition-all hover:shadow-xl group">
                    <div>
                       <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black italic text-slate-300 group-hover:text-[#0D5BFF] transition-colors">
                               {tutor?.name.charAt(0) || 'E'}
                             </div>
                             <div>
                                <h4 className="text-lg font-black text-[#0B132B] uppercase italic leading-none mb-1">{tutor?.name || 'Expert'}</h4>
                                <p className="text-[9px] font-black text-slate-400 font-mono tracking-widest">{req.bKashNumber}</p>
                             </div>
                          </div>
                          <div className="text-3xl font-black text-[#0B132B] italic">৳{req.amount}</div>
                       </div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                         Tutor hash withdrawal request initiated via bKash gateway. Verify balance before clearing.
                       </p>
                    </div>

                    <div className="flex gap-4">
                       <button onClick={() => approveWithdrawal(req.id)} className="flex-1 py-5 bg-[#0D5BFF] text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-100 hover:-translate-y-1 active:scale-95 transition-all">Clear Payout</button>
                       <button onClick={() => rejectWithdrawal(req.id)} className="px-8 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-300 hover:border-rose-500 hover:text-rose-500 transition-all">Revoke</button>
                    </div>
                 </div>
               );
             })}
             {pendingWithdrawals.length === 0 && (
               <div className="lg:col-span-2 py-40 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center justify-center text-center opacity-30">
                  <Wallet className="w-16 h-16 text-slate-300 mb-8" />
                  <h4 className="text-2xl font-black text-[#0B132B] uppercase italic">Queue Depleted</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">No pending withdrawal hooks detected in sector</p>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <AnimatePresence>
        {selectedTutor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTutor(null)}
              className="absolute inset-0 bg-[#0B132B]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
            >
              {/* Left Column: Info */}
              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar border-r border-slate-100">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl font-black italic text-[#0D5BFF] shadow-inner">
                    {selectedTutor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[#0B132B] uppercase italic leading-none mb-2">{selectedTutor.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedTutor.university || 'Expert Profile'}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Professional Bio</p>
                    <div className="relative group">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-4 border-[#0D5BFF] pl-4 bg-slate-50 py-4 rounded-r-2xl">
                        "{selectedTutor.bio || 'This expert has not provided a bio description yet. Verification should proceed based on credentials.'}"
                      </p>
                      {!selectedTutor.bio && (
                        <button 
                          onClick={() => promptForBio(selectedTutor)}
                          className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-100"
                        >
                          <Bell className="w-3 h-3" />
                          Prompt for Bio
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Node</p>
                      <p className="text-[10px] font-bold text-[#0B132B] truncate">{selectedTutor.email}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expertise</p>
                      <p className="text-[10px] font-bold text-[#0B132B]">{selectedTutor.course || 'Expert'}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">NID Number</p>
                      <p className="text-[10px] font-bold text-[#0B132B]">{selectedTutor.nidNumber || 'Not Provided'}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Birth Date</p>
                      <p className="text-[10px] font-bold text-[#0B132B]">{selectedTutor.birthDate || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Verification Protocol Check</p>
                    <div className="space-y-4">
                      {/* NID Section */}
                      <div className="p-6 bg-[#0B132B] text-white rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-[#0D5BFF]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">NID DOCUMENTATION</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${selectedTutor.nidStatus === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {selectedTutor.nidStatus || 'Awaiting'}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => verifyTutor(selectedTutor.id, 'nid', 'approved')}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase italic transition-all"
                          >
                            Approve NID
                          </button>
                          <button 
                            onClick={() => verifyTutor(selectedTutor.id, 'nid', 'rejected')}
                            className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 rounded-xl text-[9px] font-black uppercase italic transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Academic Section */}
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 text-[#0D5BFF]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#0B132B]">ACADEMIC CREDENTIALS</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${selectedTutor.academicStatus === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {selectedTutor.academicStatus || 'Awaiting'}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => verifyTutor(selectedTutor.id, 'academic', 'approved')}
                            className="flex-1 py-3 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase italic transition-all"
                          >
                            Verify Academic
                          </button>
                          <button 
                            onClick={() => verifyTutor(selectedTutor.id, 'academic', 'rejected')}
                            className="flex-1 py-3 bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-500 rounded-xl text-[9px] font-black uppercase italic transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Evidence */}
              <div className="flex-1 bg-slate-100 p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Evidence</h4>
                   <button 
                    onClick={() => setSelectedTutor(null)}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                   >
                     <LayoutDashboard className="w-5 h-5 rotate-45" />
                   </button>
                </div>
                
                <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 p-4 shadow-inner flex flex-col">
                   <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center p-8">
                      <div>
                         <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Document scan preview unavailable in simulation mode</p>
                      </div>
                   </div>
                </div>

                <div className="mt-6 p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                   <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest italic">Admin Advisory</span>
                   </div>
                   <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase opacity-70">
                      Ensure photo identity matches name and university affiliation before authorizing full expert access.
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-slate-50 rounded-[4rem] p-16 border border-slate-100">
         <div className="flex items-center justify-between mb-12">
            <h3 className="text-3xl font-black text-[#0B132B] uppercase italic">Global Ledger Audit</h3>
            <button className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#0D5BFF] transition-all">
               <ArrowDownCircle className="w-4 h-4 text-[#0D5BFF]" />
               Export XLS
            </button>
         </div>

         <div className="bg-white rounded-[3rem] p-4 border border-slate-100 shadow-sm">
            <div className="overflow-x-auto custom-scrollbar uppercase">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                    <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference Hash</th>
                    <th className="p-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payload (৳)</th>
                    <th className="p-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                    <tr key={payment.id} className="h-20 group hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 text-[10px] font-black text-slate-500 tracking-widest">
                        {new Date(payment.date).toLocaleString()}
                      </td>
                      <td className="px-8 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300">
                           <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black font-mono text-[#0B132B] opacity-70 group-hover:opacity-100 transition-opacity">
                          {payment.transactionId}
                        </span>
                      </td>
                      <td className="px-8">
                         <span className="text-lg font-black text-[#0B132B] italic">৳{payment.amount}</span>
                      </td>
                      <td className="px-8 text-right">
                        <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                          payment.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          payment.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
}
