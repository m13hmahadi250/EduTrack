import React, { useState, useMemo } from 'react';
import { User, useAppStore } from '../../store';
import { 
  Search, 
  Filter, 
  ShieldAlert, 
  ShieldCheck, 
  UserMinus, 
  UserCheck, 
  Award, 
  BadgeAlert,
  Coins,
  ArrowRightLeft,
  Mail,
  Smartphone,
  X,
  GraduationCap,
  BookOpen,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Activity,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';

interface AdminUserDirectoryProps {
  users: User[];
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  currentUser: User;
  onMessageUser?: (userId: string) => void;
}

export default function AdminUserDirectory({ users, updateUser, currentUser, onMessageUser }: AdminUserDirectoryProps) {
  const deleteUser = useAppStore(state => state.deleteUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'tutor' | 'admin'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified' | 'pending'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other' | 'none'>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState<string>('');
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDanger?: boolean;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  const triggerConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void | Promise<void>, 
    confirmText = "Confirm", 
    isDanger = false
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setConfirmModal(null);
        await onConfirm();
      },
      confirmText,
      isDanger
    });
  };

  // Filtering users logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search matches name, email, phone, or university
      const searchStr = `${user.name || ''} ${user.email || ''} ${user.phone || ''} ${user.university || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Verification filter
      let matchesVerification = true;
      if (verificationFilter === 'verified') {
        matchesVerification = !!user.isVerified;
      } else if (verificationFilter === 'unverified') {
        matchesVerification = !user.isVerified;
      } else if (verificationFilter === 'pending') {
        matchesVerification = user.nidStatus === 'pending' || user.academicStatus === 'pending';
      }

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = !user.isBlocked;
      } else if (statusFilter === 'blocked') {
        matchesStatus = !!user.isBlocked;
      }

      // Gender filter
      let matchesGender = true;
      if (genderFilter !== 'all') {
        if (genderFilter === 'none') {
          matchesGender = !user.gender;
        } else {
          matchesGender = user.gender?.toLowerCase() === genderFilter;
        }
      }

      return matchesSearch && matchesRole && matchesVerification && matchesStatus && matchesGender;
    });
  }, [users, searchTerm, roleFilter, verificationFilter, statusFilter, genderFilter]);

  // Block or Unblock user
  const handleToggleBlock = (user: User) => {
    // @ts-ignore
    const isBlocked = !!user.isBlocked;
    const confirmMsg = `Are you sure you want to ${isBlocked ? 'reactivate/unblock' : 'suspend/block'} user: ${user.name || 'this user'}?`;
    
    triggerConfirm(
      isBlocked ? 'Activate User' : 'Block User',
      confirmMsg,
      async () => {
        setUpdatingUserId(user.id);
        try {
          await updateUser(user.id, { 
            // @ts-ignore
            isBlocked: !isBlocked 
          });
          showToast(`User ${isBlocked ? 'activated' : 'suspended'} successfully.`);
        } catch (err) {
          console.error(err);
          showToast('Failed to update suspension status.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      isBlocked ? 'Activate' : 'Block',
      !isBlocked
    );
  };

  // Remove/Delete user profile from system
  const handleRemoveUser = (user: User) => {
    if (user.id === currentUser.id) {
      showToast("You cannot remove your own admin account!", "error");
      return;
    }

    const confirmMsg = `CRITICAL: Are you sure you want to PERMANENTLY REMOVE/DELETE user "${user.name || 'this user'}" (${user.email})? This action is completely irreversible.`;
    
    triggerConfirm(
      'Permanently Remove User',
      confirmMsg,
      async () => {
        setUpdatingUserId(user.id);
        try {
          await deleteUser(user.id);
          showToast(`User profile deleted successfully.`);
        } catch (err) {
          console.error(err);
          showToast('Failed to delete user profile.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      'Permanently Delete',
      true
    );
  };

  // Change user role
  const handleChangeRole = (userId: string, newRole: 'student' | 'tutor' | 'admin') => {
    if (userId === currentUser.id) {
      showToast("You cannot demote or change your own admin role!", "error");
      return;
    }

    // Only edutrackbangladesh@gmail.com or m13hmahadi.personal@gmail.com can set/assign another admin in the directory UI
    const isSuperAdminEmail = currentUser?.email === 'edutrackbangladesh@gmail.com' || currentUser?.email === 'm13hmahadi.personal@gmail.com';
    if (newRole === 'admin' && !isSuperAdminEmail) {
      showToast("Permission denied! Only the main administrator is permitted to assign the admin role.", "error");
      return;
    }

    const confirmMsg = `Are you sure you want to modify user role to: ${newRole.toUpperCase()}?`;
    
    triggerConfirm(
      'Change User Role',
      confirmMsg,
      async () => {
        setUpdatingUserId(userId);
        try {
          await updateUser(userId, { role: newRole });
          showToast(`Role updated to ${newRole}.`);
        } catch (err) {
          console.error(err);
          showToast('Failed to change user role.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      'Update Role',
      false
    );
  };

  // Toggle Verification status manually
  const handleToggleVerification = (user: User) => {
    const isCurrentlyVerified = !!user.isVerified;
    const confirmMsg = isCurrentlyVerified 
      ? `Revoke verified status badge for ${user.name}?` 
      : `Manually grant Verified status badge to ${user.name}?`;
    
    triggerConfirm(
      isCurrentlyVerified ? 'Revoke Verification' : 'Grant Verification',
      confirmMsg,
      async () => {
        setUpdatingUserId(user.id);
        try {
          await updateUser(user.id, { 
            isVerified: !isCurrentlyVerified,
            nidStatus: !isCurrentlyVerified ? 'approved' : 'rejected',
            academicStatus: !isCurrentlyVerified ? 'approved' : 'rejected' 
          });
          showToast(`Verification badge status updated.`);
        } catch (err) {
          console.error(err);
          showToast('Failed to update verification badge Status.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      isCurrentlyVerified ? 'Revoke Badge' : 'Verify Badge',
      isCurrentlyVerified
    );
  };

  // Toggle show on home page manually
  const handleToggleHomeVisibility = (user: User) => {
    const isCurrentlyVisible = user.showOnHomePage !== false;
    const confirmMsg = isCurrentlyVisible
      ? `Hide tutor profile ${user.name} from the landing home page?`
      : `Feature and show tutor profile ${user.name} on the landing home page?`;
    
    triggerConfirm(
      isCurrentlyVisible ? 'Hide from Landing Page' : 'Show on Landing Page',
      confirmMsg,
      async () => {
        setUpdatingUserId(user.id);
        try {
          await updateUser(user.id, { 
            showOnHomePage: !isCurrentlyVisible
          });
          showToast(`Landing page visibility updated.`);
        } catch (err) {
          console.error(err);
          showToast('Failed to update visibility.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      isCurrentlyVisible ? 'Hide Profile' : 'Show Profile',
      isCurrentlyVisible
    );
  };

  // Adjust Wallet Balance
  const handleSaveBalance = async (userId: string) => {
    const numericAmount = parseFloat(balanceInput);
    if (isNaN(numericAmount) || numericAmount < 0) {
      showToast("Please enter a valid positive numeric amount.", "error");
      return;
    }

    setUpdatingUserId(userId);
    try {
      await updateUser(userId, { balance: numericAmount });
      showToast(`Successfully set wallet balance to ৳${numericAmount}`);
      setEditingBalanceId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to update wallet balance.', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const startEditingBalance = (user: User) => {
    setEditingBalanceId(user.id);
    setBalanceInput((user.balance || 0).toString());
  };

  return (
    <div className="space-y-6" id="admin-user-directory-view">
      
      {/* Filtering Options Panel */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-white focus:ring-2 focus:ring-[#0D5BFF] placeholder-slate-400 outline-none"
          />
        </div>

        {/* Filters Select Grid */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Role filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 border-0 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5BFF]"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors (Experts)</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Verification Badge filter */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as any)}
              className="px-4 py-2 border-0 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5BFF]"
            >
              <option value="all">All Verifications</option>
              <option value="verified">Verified Badge</option>
              <option value="unverified">No Badge</option>
              <option value="pending">Review Pending</option>
            </select>
          </div>

          {/* Status filter (Blocked vs Active) */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border-0 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5BFF]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked / Suspended</option>
            </select>
          </div>

          {/* Gender filter */}
          <div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="px-4 py-2 border-0 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-[#0D5BFF]"
            >
              <option value="all">All Genders</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
              <option value="other">Other Only</option>
              <option value="none">Not Specified</option>
            </select>
          </div>
        </div>

      </div>

      {/* Directory Table Grid */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
          <h4 className="text-sm font-black uppercase tracking-widest text-[#0B132B] dark:text-white italic">
            Ledger User Array ({filteredUsers.length} records matched)
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full uppercase select-none">
            <thead>
              <tr className="border-b border-slate-50 dark:border-slate-800/40">
                <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">User Identity</th>
                <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Security Scope/Role</th>
                <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Gender</th>
                <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Verification Ledger</th>
                <th className="px-6 py-4 text-left text-[9px] font-black tracking-widest text-slate-400">Wallet balance</th>
                <th className="px-6 py-4 text-right text-[9px] font-black tracking-widest text-slate-400">Protocol Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {filteredUsers.map((user) => {
                // @ts-ignore
                const isBlocked = !!user.isBlocked;
                const isUserTutor = user.role === 'tutor';

                return (
                  <tr 
                    key={user.id} 
                    className={`group h-20 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                      isBlocked ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''
                    }`}
                  >
                    
                    {/* User Identity Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#0D5BFF]/10 text-[#0D5BFF] flex items-center justify-center font-black italic border border-blue-50 dark:border-blue-900/40 relative overflow-hidden">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{user.name?.charAt(0).toUpperCase()}</span>
                          )}
                          {isBlocked && (
                            <div className="absolute inset-0 bg-rose-500/80 flex items-center justify-center text-white text-[8px] font-black italic">
                              BLOCKED
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <span>{user.name || 'No Name'}</span>
                            {user.isVerified && (
                              <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/15" title="Verified Badge User" />
                            )}
                            {isBlocked ? (
                              <span className="bg-rose-600 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase">
                                Blocked
                              </span>
                            ) : (
                              <span className="bg-emerald-600 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 font-mono tracking-tighter mt-0.5 flex flex-col gap-0.5">
                            <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {user.email}</span>
                            {user.phone && <span className="flex items-center gap-1"><Smartphone className="w-2.5 h-2.5" /> {user.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role / Context Scope */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2.5 py-1 text-[8px] font-black rounded-lg w-max tracking-widest ${
                          user.role === 'admin' 
                            ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/20' 
                            : user.role === 'tutor'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/20'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100/20'
                        }`}>
                          {user.role}
                        </span>
                        
                        {isUserTutor && user.university && (
                          <span className="text-[7.5px] font-extrabold text-slate-400 dark:text-slate-500 font-mono truncate max-w-[150px]">
                            🎓 {user.university}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Gender Selection & Management */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <select
                          value={user.gender || ''}
                          onChange={(e) => {
                            const newGender = e.target.value;
                            setUpdatingUserId(user.id);
                            updateUser(user.id, { gender: newGender })
                              .then(() => showToast(`Gender changed to ${newGender || "Not Specified"}`))
                              .catch(() => showToast("Failed to update gender", "error"))
                              .finally(() => setUpdatingUserId(null));
                          }}
                          disabled={updatingUserId === user.id}
                          className="px-2.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase border border-slate-100 dark:border-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-[#0D5BFF]"
                        >
                          <option value="">SPECIFY</option>
                          <option value="Male">MALE</option>
                          <option value="Female">FEMALE</option>
                          <option value="Other">OTHER</option>
                        </select>
                      </div>
                    </td>

                    {/* Verification Indicators */}
                    <td className="px-6 py-4">
                      {isUserTutor ? (
                        <div className="flex flex-col gap-1 text-[8px] font-black tracking-widest">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">NID:</span>
                            <span className={
                              user.nidStatus === 'approved' ? 'text-emerald-500' :
                              user.nidStatus === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                            }>{user.nidStatus || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">ACADEMIC:</span>
                            <span className={
                              user.academicStatus === 'approved' ? 'text-emerald-500' :
                              user.academicStatus === 'rejected' ? 'text-rose-500' : 'text-amber-500'
                            }>{user.academicStatus || 'N/A'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 font-mono italic">student scope</span>
                      )}
                    </td>

                    {/* Credit Wallet Balance adjusting */}
                    <td className="px-6 py-4">
                      {editingBalanceId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={balanceInput}
                            onChange={(e) => setBalanceInput(e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 text-[10px] font-black rounded border border-slate-200 dark:border-slate-800 outline-none"
                            placeholder="৳0"
                          />
                          <button
                            onClick={() => handleSaveBalance(user.id)}
                            className="bg-emerald-500 text-white p-1 rounded hover:bg-emerald-600 transition-colors text-[8px] font-black uppercase cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingBalanceId(null)}
                            className="bg-rose-500 text-white p-1 rounded hover:bg-rose-600 transition-colors text-[8px] font-black uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-white italic">
                            ৳{(user.balance || 0).toLocaleString()}
                          </span>
                          <button
                            onClick={() => startEditingBalance(user)}
                            className="text-slate-400 hover:text-[#0D5BFF] p-1 transition-colors rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            title="Adjust wallet balance"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Admin Action Menu */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        
                        {/* Inspect Profile */}
                        <button
                          onClick={() => setInspectingUser(user)}
                          className="px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer bg-slate-100 dark:bg-slate-900/40 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800"
                          title="Inspect All User Details"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        {/* Send Message */}
                        {user.id !== currentUser.id && onMessageUser ? (
                          <button
                            onClick={() => onMessageUser(user.id)}
                            className="px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer bg-blue-50 text-[#0D5BFF] dark:bg-blue-950/20 hover:bg-[#0D5BFF] hover:text-white border border-blue-100/20"
                            title="Direct Message User"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Message</span>
                          </button>
                        ) : null}

                        {/* Suspension Toggle */}
                        {user.id !== currentUser.id ? (
                          <button
                            onClick={() => handleToggleBlock(user)}
                            disabled={updatingUserId === user.id}
                            className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                              isBlocked 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 hover:bg-emerald-500 hover:text-white' 
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 hover:bg-rose-500 hover:text-white'
                            }`}
                            title={isBlocked ? "Reactivate User" : "Suspend User"}
                          >
                            {isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                            <span>{isBlocked ? "Reactivate" : "Block"}</span>
                          </button>
                        ) : null}

                        {/* Permanent Account Removal */}
                        {user.id !== currentUser.id ? (
                          <button
                            onClick={() => handleRemoveUser(user)}
                            disabled={updatingUserId === user.id}
                            className="px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer bg-slate-100 dark:bg-slate-900 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800"
                            title="Permanently Delete User"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        ) : null}

                        {/* Custom status verify manually (for Tutors) */}
                        {isUserTutor && (
                          <button
                            onClick={() => handleToggleVerification(user)}
                            disabled={updatingUserId === user.id}
                            className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                              user.isVerified 
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 hover:bg-amber-500 hover:text-white' 
                                : 'bg-[#0D5BFF]/10 text-[#0D5BFF] dark:bg-blue-950/20 hover:bg-[#0D5BFF] hover:text-white'
                            }`}
                            title={user.isVerified ? "Revoke Verification" : "Grant Verified Badge"}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{user.isVerified ? "Revoke Badge" : "Verify Badge"}</span>
                          </button>
                        )}

                        {/* Toggle Home Page Visibility (for Tutors) */}
                        {isUserTutor && (
                          <button
                            onClick={() => handleToggleHomeVisibility(user)}
                            disabled={updatingUserId === user.id}
                            className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                              user.showOnHomePage !== false 
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 hover:bg-indigo-500 hover:text-white' 
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-900/40 hover:bg-slate-500 hover:text-white dark:text-slate-400'
                            }`}
                            title={user.showOnHomePage !== false ? "Hide from landing Home Directory" : "Publish & Feature on Home"}
                          >
                            {user.showOnHomePage !== false ? (
                              <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{user.showOnHomePage !== false ? "Home: Visible" : "Home: Hidden"}</span>
                          </button>
                        )}

                        {/* Quick Role Shift */}
                        {user.id !== currentUser.id && (
                          <div className="relative group/role flex items-center">
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.id, e.target.value as any)}
                              disabled={updatingUserId === user.id}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-[8.5px] font-black uppercase border border-slate-200 dark:border-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-[#0D5BFF]"
                            >
                              <option value="student">Student</option>
                              <option value="tutor">Tutor</option>
                              {(currentUser?.email === 'edutrackbangladesh@gmail.com' || currentUser?.email === 'm13hmahadi.personal@gmail.com' || user.role === 'admin') && (
                                <option value="admin">Admin</option>
                              )}
                            </select>
                          </div>
                        )}

                      </div>
                    </td>
                    
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-black tracking-widest text-[10px]">
                    No corresponding user profiles found in database constraints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
      </div>
      
      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2rem] shadow-2xl p-6 max-w-sm w-full space-y-6 transform scale-100 transition-transform duration-200">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white italic flex items-center gap-2">
                {confirmModal.isDanger ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#0D5BFF]" />
                )}
                {confirmModal.title}
              </h3>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  confirmModal.isDanger 
                     ? 'bg-rose-600 hover:bg-rose-700' 
                     : 'bg-[#0D5BFF] hover:bg-blue-600'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete User Information Inspection Panel */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-slate-955/80 dark:bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 md:p-10 max-w-4xl w-full my-auto space-y-8 relative overflow-hidden font-sans">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0D5BFF]/10 text-[#0D5BFF] dark:text-[#5a91ff] flex items-center justify-center font-black italic border border-blue-50 dark:border-blue-900/30 overflow-hidden shrink-0">
                  {inspectingUser.profileImage ? (
                    <img src={inspectingUser.profileImage} alt={inspectingUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-lg">{inspectingUser.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white italic flex items-center gap-2">
                    {inspectingUser.name || 'Anonymous User'}
                    {inspectingUser.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/15" />
                    )}
                  </h3>
                  <p className="text-[9px] font-black tracking-widest text-[#0D5BFF] uppercase mt-0.5">
                    ID: {inspectingUser.id} • {inspectingUser.role.toUpperCase()} LEDGER NODE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto max-h-[55vh] pr-2 custom-scrollbar">
              
              {/* Profile card & balance */}
              <div className="md:col-span-1 space-y-6">
                
                {/* Visual Overview */}
                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Wallet Balance</span>
                  <div className="flex items-baseline gap-1 text-slate-800 dark:text-white">
                    <span className="text-xl font-bold">৳</span>
                    <span className="text-3xl font-black italic">{(inspectingUser.balance || 0).toLocaleString()}</span>
                  </div>
                  
                  {/* Quick Verification Flags */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-slate-400">Account status</span>
                      <span className={inspectingUser.isBlocked ? "text-rose-550" : "text-emerald-500"}>
                        {inspectingUser.isBlocked ? "Blocked / Suspended" : "Active / Verified"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-slate-400">Identity check</span>
                      <span className={inspectingUser.nidStatus === 'approved' ? "text-emerald-500" : "text-amber-500"}>
                        {inspectingUser.nidStatus || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-slate-400">Academic check</span>
                      <span className={inspectingUser.academicStatus === 'approved' ? "text-emerald-500" : "text-amber-500"}>
                        {inspectingUser.academicStatus || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micro Actions Panel inside inspect */}
                <div className="space-y-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1">Moderation Controls</span>
                  
                  {/* Status Toggle */}
                  {inspectingUser.id !== currentUser.id && (
                    <button
                      onClick={() => {
                        handleToggleBlock(inspectingUser);
                        setInspectingUser(prev => prev ? { ...prev, isBlocked: !prev.isBlocked } : null);
                      }}
                      className="w-full text-left py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:text-[#0D5BFF]"
                    >
                      <span>Toggle block state</span>
                      <span className="font-mono text-slate-400">{inspectingUser.isBlocked ? "UNBLOCK" : "BLOCK"}</span>
                    </button>
                  )}

                  {/* Manual verification status toggle */}
                  {inspectingUser.role === 'tutor' && (
                    <button
                      onClick={() => {
                        handleToggleVerification(inspectingUser);
                        setInspectingUser(prev => prev ? { ...prev, isVerified: !prev.isVerified, nidStatus: !prev.isVerified ? 'approved' : 'rejected', academicStatus: !prev.isVerified ? 'approved' : 'rejected' } : null);
                      }}
                      className="w-full text-left py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:text-[#0D5BFF]"
                    >
                      <span>Verification Badge</span>
                      <span className="font-mono text-slate-400">{inspectingUser.isVerified ? "REVOKE" : "GRANT VERIFIED"}</span>
                    </button>
                  )}

                  {/* Home page directory display toggle */}
                  {inspectingUser.role === 'tutor' && (
                    <button
                      onClick={() => {
                        handleToggleHomeVisibility(inspectingUser);
                        setInspectingUser(prev => prev ? { ...prev, showOnHomePage: prev.showOnHomePage === false } : null);
                      }}
                      className="w-full text-left py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-600"
                    >
                      <span>Show On Homepage</span>
                      <span className="font-mono text-indigo-500">{inspectingUser.showOnHomePage !== false ? "VISIBLE" : "HIDDEN"}</span>
                    </button>
                  )}

                  {/* Send Direct Messages */}
                  {inspectingUser.id !== currentUser.id && onMessageUser && (
                    <button
                      onClick={() => {
                        onMessageUser(inspectingUser.id);
                        setInspectingUser(null);
                      }}
                      className="w-full text-left py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-between bg-[#0D5BFF]/10 text-[#0D5BFF] dark:bg-blue-950/20 hover:bg-[#0D5BFF] hover:text-white border border-[#0D5BFF]/20"
                    >
                      <span>Open chat Inbox</span>
                      <Mail className="w-3 h-3" />
                    </button>
                  )}
                </div>

              </div>

              {/* Core Details Panel */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Contact & Identity Nodes (Unmasked) */}
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Contact & Authentication Credentials (UNMASKED)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Direct Phone Contact</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1 font-mono tracking-wider">{inspectingUser.phone || 'NOT CONFIGURED'}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Verified E-Mail Node</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1 break-all font-mono">{inspectingUser.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Biological Gender</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.gender || 'NOT CONFIGURED'}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Date of Birth</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.birthDate || 'NOT CONFIGURED'}</p>
                    </div>
                  </div>
                </div>

                {/* Geography Area Nodes */}
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Zone & Geographic Parameters</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">District</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.district || 'NOT SPECIFIED'}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Area / Area Code</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.area || 'NOT SPECIFIED'}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Thana</span>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.thana || 'NOT SPECIFIED'}</p>
                    </div>
                  </div>
                </div>

                {/* Role Specific Academic parameters */}
                {inspectingUser.role === 'tutor' ? (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Expert / Academic Qualifications</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/80">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">University</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.university || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Department / Course</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.course || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Academic Class Tenure</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">
                            {inspectingUser.year ? `${inspectingUser.year} Year` : ''} {inspectingUser.semester ? `• Semester ${inspectingUser.semester}` : ''} {!inspectingUser.year && !inspectingUser.semester ? 'Full Program Completed / Standard' : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">National Identity NID (Unmasked)</span>
                          <p className="text-xs font-black text-slate-850 dark:text-white mt-1 font-mono tracking-widest">{inspectingUser.nidNumber || 'NOT SUBMITTED'}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Hourly Rate Quote</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">৳{inspectingUser.hourlyRate || 0} / Hour</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Teaching Availability frequency</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.daysPerWeek || 0} Days / Week</p>
                        </div>
                      </div>
                    </div>

                    {/* Bio / Bio block */}
                    {inspectingUser.bio && (
                      <div>
                        <p className="text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest mb-1.5 ml-1">Expert Profile Bio</p>
                        <p className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl italic leading-relaxed">
                          "{inspectingUser.bio}"
                        </p>
                      </div>
                    )}

                    {/* Subjects and Classes list */}
                    {(inspectingUser.subjects?.length || inspectingUser.classes?.length) ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Service-Level Subjects</span>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectingUser.subjects?.map((subj, sidx) => (
                              <span key={sidx} className="bg-blue-50 dark:bg-blue-900/30 text-[#0D5BFF] dark:text-blue-300 px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider">{subj}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Service-Level Classes</span>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectingUser.classes?.map((cls, cidx) => (
                              <span key={cidx} className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider">{cls}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Verification Documents display */}
                    {(inspectingUser.nidFrontImg || inspectingUser.nidBackImg || (inspectingUser.documents && inspectingUser.documents.length > 0)) && (
                      <div className="space-y-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1.5">Verification Images & Certificates (Secure Ledger Links)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* NID Images */}
                          {inspectingUser.nidFrontImg && (
                            <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">NID Front Image</span>
                              <div className="h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                <img src={inspectingUser.nidFrontImg} alt="NID Front" className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(inspectingUser.nidFrontImg, '_blank')} />
                              </div>
                            </div>
                          )}

                          {inspectingUser.nidBackImg && (
                            <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">NID Back Image</span>
                              <div className="h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                <img src={inspectingUser.nidBackImg} alt="NID Back" className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(inspectingUser.nidBackImg, '_blank')} />
                              </div>
                            </div>
                          )}
                          
                          {/* Academic Documents */}
                          {inspectingUser.documents && inspectingUser.documents.length > 0 && (
                            <div className="sm:col-span-2 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Academic Certificates & Transcripts</span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {inspectingUser.documents.map((docUrl, dIdx) => (
                                  <div key={dIdx} className="h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850 relative group cursor-pointer hover:border-[#0D5BFF] transition-all" onClick={() => window.open(docUrl, '_blank')}>
                                    <img src={docUrl} alt={`Certificate ${dIdx + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-[8px] font-black text-white uppercase tracking-wider">Open Raw</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  // Student Specific fields
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Student / Institution Settings</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/80">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-slate-400 font-sans">School / College</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.school || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-slate-400 font-sans font-sans">Class Grade Level</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.studentClass || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-slate-400 font-sans font-sans">Department / Group</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.group || 'GENERAL'}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-slate-400 font-sans font-sans">Desired Subject Track</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{inspectingUser.subject || 'All General Support'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-slate-400 font-sans">Full Home / Location Address</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-1 truncate" title={inspectingUser.address}>{inspectingUser.address || 'NOT CONFIGURED'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer Closing Button */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
              <button
                onClick={() => setInspectingUser(null)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Audit Inspection
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border uppercase tracking-wider text-[9px] font-black bg-white dark:bg-[#111A2E] border-slate-100 dark:border-slate-800/80">
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
          <span className="text-slate-700 dark:text-slate-200">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
