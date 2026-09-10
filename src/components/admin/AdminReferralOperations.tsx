import React, { useState, useMemo } from 'react';
import { User, Referral } from '../../store';
import { 
  Gift, 
  Users, 
  Award, 
  TrendingUp, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Sparkles, 
  Send, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminReferralOperationsProps {
  referrals: Referral[];
  users: User[];
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  sendNotification: (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
}

export default function AdminReferralOperations({
  referrals,
  users,
  updateUser,
  sendNotification
}: AdminReferralOperationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'joined' | 'rewarded'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'tutor' | 'student'>('all');

  // Bonus Grant Modal state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [bonusPoints, setBonusPoints] = useState(50);
  const [bonusReason, setBonusReason] = useState('Top Ambassador Monthly Reward');
  const [isGrantingBonus, setIsGrantingBonus] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Copied code: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Referral Metrics
  const metrics = useMemo(() => {
    const totalCount = referrals.length;
    const joinedCount = referrals.filter(r => r.status === 'joined' || r.status === 'rewarded').length;
    const pendingCount = referrals.filter(r => r.status === 'pending').length;
    const totalPointsInCirculation = users.reduce((acc, u) => acc + (u.referralPoints || 0), 0);
    const conversionRate = totalCount > 0 ? Math.round((joinedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      joinedCount,
      pendingCount,
      totalPointsInCirculation,
      conversionRate
    };
  }, [referrals, users]);

  // Top Ambassadors Leaderboard
  const topAmbassadors = useMemo(() => {
    return [...users]
      .filter(u => (u.referralPoints && u.referralPoints > 0) || u.referralCode)
      .sort((a, b) => (b.referralPoints || 0) - (a.referralPoints || 0))
      .slice(0, 5);
  }, [users]);

  // Filtered referrals list
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchSearch = !searchTerm.trim() || 
        r.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.refereeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.refereeName && r.refereeName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchRole = roleFilter === 'all' || r.referrerRole === roleFilter;

      return matchSearch && matchStatus && matchRole;
    });
  }, [referrals, searchTerm, statusFilter, roleFilter]);

  // Handle Manual Bonus Points Grant
  const handleGrantBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast("Please select a recipient user.", "error");
      return;
    }

    const recipient = users.find(u => u.id === selectedUserId);
    if (!recipient) {
      showToast("User not found.", "error");
      return;
    }

    setIsGrantingBonus(true);
    try {
      const currentPoints = recipient.referralPoints || 0;
      const newPoints = currentPoints + Number(bonusPoints);

      // 1. Update user points in Firestore
      await updateUser(recipient.id, {
        referralPoints: newPoints
      });

      // 2. Dispatch push notification to user
      await sendNotification(
        recipient.id,
        "Referral Bonus Credited! 🎉",
        `Congratulations! You have received ${bonusPoints} bonus ambassador points for "${bonusReason}". Current balance: ${newPoints} pts.`,
        "success"
      );

      showToast(`Granted ${bonusPoints} pts to ${recipient.name}!`, "success");
      setShowBonusModal(false);
      setSelectedUserId('');
      setBonusPoints(50);
    } catch (err) {
      console.error(err);
      showToast("Failed to grant bonus points.", "error");
    } finally {
      setIsGrantingBonus(false);
    }
  };

  return (
    <div className="space-y-8" id="admin-referral-operations">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-[#0B132B] dark:bg-slate-950 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Gift className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.3em]">
                Growth & Community Incentives
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight">
              Referral Program & Rewards Operations
            </h2>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400 max-w-xl mt-1">
              Oversee student and tutor referral invites, reward point circulations, ambassador leaderboards, and issue manual reward bonuses.
            </p>
          </div>

          <button
            type="button"
            id="open-grant-bonus-modal-btn"
            onClick={() => setShowBonusModal(true)}
            className="px-6 py-4 bg-gradient-to-r from-purple-600 to-[#0D5BFF] hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Grant Ambassador Bonus</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Invites</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white font-mono">
              {metrics.totalCount}
            </h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              {metrics.pendingCount} pending invitations
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Converted Signups</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white font-mono">
              {metrics.joinedCount}
            </h3>
            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
              {metrics.conversionRate}% conversion rate
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Points In Circulation</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white font-mono">
              {metrics.totalPointsInCirculation} pts
            </h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Redeemable for platform discounts
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Active Ambassadors</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black italic text-[#0B132B] dark:text-white font-mono">
              {topAmbassadors.length}
            </h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Users with active referral codes
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Referrals Ledger & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Referrals Stream (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic">
                Referrals Activity Stream ({filteredReferrals.length})
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Real-time tracking of peer-to-peer invitations across Bangladesh
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name/email..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="joined">Joined</option>
                <option value="rewarded">Rewarded</option>
              </select>
            </div>
          </div>

          {filteredReferrals.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              <Gift className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                No referral records found
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                New user signups using ambassador codes will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReferrals.map((ref) => (
                <div key={ref.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase italic text-slate-900 dark:text-white">
                        {ref.referrerName}
                      </span>
                      <span className="text-[7.5px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono">
                        {ref.referrerRole}
                      </span>
                      <span className="text-[10px] text-slate-400">➔</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {ref.refereeName || ref.refereeEmail}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[8.5px] text-slate-400 font-mono">
                      <span>Invited: {ref.refereeEmail}</span>
                      <span>•</span>
                      <span>{new Date(ref.createdAt).toLocaleDateString()}</span>
                      {ref.rewardValue > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-bold">+{ref.rewardValue} pts</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider font-mono ${
                      ref.status === 'rewarded'
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                        : ref.status === 'joined'
                        ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                        : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Top Ambassadors Leaderboard (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                Top Ambassadors
              </h4>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Rankings
              </span>
            </div>

            <div className="space-y-3">
              {topAmbassadors.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-6">
                  No active ambassadors yet.
                </p>
              ) : (
                topAmbassadors.map((amb, index) => (
                  <div
                    key={amb.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                        index === 0 ? 'bg-amber-400 text-slate-950 shadow-md' :
                        index === 1 ? 'bg-slate-300 text-slate-950' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        #{index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-slate-900 dark:text-white truncate">
                          {amb.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] font-mono font-bold text-[#0D5BFF]">
                            {amb.referralCode || 'NO_CODE'}
                          </span>
                          {amb.referralCode && (
                            <button
                              type="button"
                              onClick={() => handleCopyCode(amb.referralCode!)}
                              className="text-slate-400 hover:text-[#0D5BFF] transition-colors cursor-pointer"
                              title="Copy code"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400 block">
                        {amb.referralPoints || 0} pts
                      </span>
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400">
                        {amb.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incentive Rule Card */}
          <div className="bg-gradient-to-br from-purple-900 to-[#0B132B] rounded-[2rem] p-6 text-white space-y-3 shadow-xl">
            <span className="text-[8px] font-black text-purple-300 uppercase tracking-[0.2em] block">
              Program Economics
            </span>
            <h4 className="text-sm font-black uppercase italic">
              Referral Multipliers
            </h4>
            <ul className="text-[10px] space-y-2 text-purple-100 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>50 Points</strong> granted upon referee account creation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>৳100 Service Discount</strong> on tuition booking completion.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct ambassador badges display on public profiles.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bonus Grant Modal */}
      <AnimatePresence>
        {showBonusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white italic">
                      Grant Ambassador Bonus
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      Credit extra referral reward points to a user
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBonusModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGrantBonus} className="space-y-4">
                {/* User Selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    Recipient User
                  </label>
                  <select
                    id="bonus-recipient-select"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">Select a student or tutor...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()} • {u.email}) — Balance: {u.referralPoints || 0} pts
                      </option>
                    ))}
                  </select>
                </div>

                {/* Points Amount */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    Bonus Points Amount
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 250].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setBonusPoints(pts)}
                        className={`py-2.5 rounded-xl border text-xs font-mono font-black transition-all cursor-pointer ${
                          bonusPoints === pts
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        +{pts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Note */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    Award Reason / Memo
                  </label>
                  <input
                    type="text"
                    id="bonus-reason-input"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value)}
                    placeholder="e.g. Top Ambassador Monthly Reward"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBonusModal(false)}
                    className="px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="confirm-grant-bonus-btn"
                    disabled={isGrantingBonus || !selectedUserId}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGrantingBonus ? (
                      <span>Crediting Points...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Credit +{bonusPoints} Points</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
