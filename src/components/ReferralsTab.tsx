import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Gift, Copy, Check, Users, Mail, Award, Sparkles, Share2, Send, Ticket, ArrowRight, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReferralsTab() {
  const currentUser = useAppStore(state => state.currentUser);
  const referrals = useAppStore(state => state.referrals);
  const createReferralInvite = useAppStore(state => state.createReferralInvite);
  const fetchReferrals = useAppStore(state => state.fetchReferrals);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'student' | 'tutor'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  if (!currentUser) return null;

  // Programmatic generation of referral code if not saved
  const referralCode = currentUser.referralCode || `EDU-${currentUser.name ? currentUser.name.split(' ')[0].toUpperCase() : 'USER'}-${currentUser.id.substring(0, 4).toUpperCase()}`;
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setErrorMessage('Please fill out all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReferralInvite(inviteName, inviteEmail, inviteRole);
      setSuccessMessage(`Invitation successfully registered for ${inviteName}!`);
      setInviteName('');
      setInviteEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalInvited = referrals.length;
  const successfulReferrals = referrals.filter(r => r.status === 'rewarded');
  const successfulCount = successfulReferrals.length;

  return (
    <div className="space-y-8 uppercase">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-[2.5rem] p-8 md:p-12 border border-slate-800 shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-[45%] h-[60%] bg-[#0D5BFF]/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[35%] h-[50%] bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            EduTrack Rewards Hub
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tight text-white uppercase leading-none mb-4">
            Invite colleagues, <br />get rewarded!
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium normal-case tracking-wide leading-relaxed mb-8 max-w-2xl">
            Spread the word about Bangladesh's safest home tutoring platform. When your friends sign up with your code, they join our trusted learning network, and you receive premium rewards instantly!
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-8 mt-4">
            <div>
              <span className="text-[9px] font-black tracking-widest text-slate-400 block mb-1">Total Invitations</span>
              <span className="text-2xl font-black text-white italic">{totalInvited}</span>
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-slate-400 block mb-1">Successful Joins</span>
              <span className="text-2xl font-black text-emerald-400 italic">{successfulCount}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[9px] font-black tracking-widest text-slate-400 block mb-1">
                {currentUser.role === 'tutor' ? 'Badge Points' : 'Service Discounts'}
              </span>
              <span className="text-2xl font-black text-amber-400 italic">
                {currentUser.role === 'tutor' 
                  ? `${currentUser.referralPoints || 0} PTS` 
                  : `${currentUser.serviceDiscounts || 0} Coupon(s)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link & Sharing Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#111A2E] rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800/80 shadow-md">
          <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-wider flex items-center gap-2 mb-6 italic">
            <Share2 className="w-5 h-5 text-blue-500" />
            Your Referral Identity
          </h2>
          
          <div className="space-y-6">
            {/* Referral Code Box */}
            <div>
              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest block mb-2 uppercase">
                Unique Referral Code
              </label>
              <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 items-center justify-between">
                <span className="text-xs font-mono font-black text-slate-800 dark:text-white pl-2">
                  {referralCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-[#0D5BFF] dark:text-blue-400 rounded-xl text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Referral Link Box */}
            <div>
              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest block mb-2 uppercase">
                Instant Invite Link
              </label>
              <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pl-2 truncate max-w-[180px] sm:max-w-xs normal-case">
                  {referralLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-[#0D5BFF] dark:text-blue-400 rounded-xl text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Reward Information Callout */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 p-5 rounded-2xl">
              <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                <Gift className="w-4 h-4" />
                Active Reward Tier:
              </h4>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider">
                {currentUser.role === 'tutor' 
                  ? "Tutors get +15 featured points per join! Points boost search results, increasing direct booking requests by up to 250%!"
                  : "Students earn a 10% discount on their next platform transaction or lesson fee per join! Save more as you share!"}
              </p>
            </div>
          </div>
        </div>

        {/* Invite Form Panel */}
        <div className="bg-white dark:bg-[#111A2E] rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800/80 shadow-md">
          <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-wider flex items-center gap-2 mb-6 italic">
            <Mail className="w-5 h-5 text-amber-500 animate-pulse" />
            Send invitation
          </h2>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest block mb-2 uppercase">
                Colleague / Friend Name
              </label>
              <input
                type="text"
                placeholder="Enter their full name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-bold text-slate-800 dark:text-white tracking-wide uppercase transition-all"
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest block mb-2 uppercase">
                Email Address
              </label>
              <input
                type="email"
                placeholder="friend@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium text-slate-800 dark:text-white tracking-wide normal-case transition-all"
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest block mb-2 uppercase">
                Target Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInviteRole('student')}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${inviteRole === 'student' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                >
                  Student / Parent
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole('tutor')}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${inviteRole === 'tutor' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                >
                  Tutor / Teacher
                </button>
              </div>
            </div>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 p-3.5 rounded-xl text-[10px] font-bold text-center tracking-wider"
                >
                  {successMessage}
                </motion.div>
              )}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-500/10 text-red-500 border border-red-500/15 p-3.5 rounded-xl text-[10px] font-bold text-center tracking-wider"
                >
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 dark:bg-[#0D5BFF] hover:bg-slate-800 dark:hover:bg-blue-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Register invitation'}
            </button>
          </form>
        </div>
      </div>

      {/* Invitations History Table */}
      <div className="bg-white dark:bg-[#111A2E] rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800/80 shadow-md">
        <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-wider flex items-center gap-2 mb-6 italic">
          <Users className="w-5 h-5 text-emerald-500" />
          Referral Log History
        </h2>

        {referrals.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3 animate-bounce" />
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-widest">No invitations registered yet</h3>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-600 tracking-wider mt-1">
              Invite your colleagues to build your reputation and unlock key rewards!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80">
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Friend Profile</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Role</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Created At</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Referral Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-xs uppercase">
                          {ref.refereeName ? ref.refereeName.substring(0, 2) : 'FR'}
                        </div>
                        <div>
                          <span className="font-black text-xs text-slate-800 dark:text-slate-200 block tracking-wider">
                            {ref.refereeName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 normal-case tracking-wide block">
                        {ref.refereeEmail}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${ref.refereeRole === 'student' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {ref.refereeRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider block">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ref.status === 'rewarded' ? (
                          <>
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full text-[8px] font-black tracking-widest uppercase">
                              <UserCheck className="w-3 h-3" />
                              Reward Earned
                            </span>
                            {ref.rewardType !== 'none' && (
                              <span className="text-[10px] font-black italic text-amber-500 tracking-wider">
                                +{ref.rewardValue} {ref.rewardType === 'badge_points' ? 'Points' : 'Discount'}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full text-[8px] font-black tracking-widest uppercase">
                            Pending Join
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
