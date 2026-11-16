import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, useAppStore } from '../../store';
import {
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  Award,
  Coins,
  Mail,
  Send,
  Smartphone,
  X,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Pencil,
  Check,
  MoreVertical,
  UserCog,
  RotateCcw,
} from 'lucide-react';
import AdminSendMailModal from './AdminSendMailModal';
import { useBackHandler } from '../../utils/mobileWebView';
import UserAvatar from '../UserAvatar';
import { getTutorVerificationStatus } from '../../../shared/profileCompletion';

// Helper to format user registration date and time
export const formatJoinDate = (createdAt?: string) => {
  if (!createdAt) return { date: 'Initial Record', time: '', full: 'Initial Record (Legacy)', relative: '' };
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return { date: 'Initial Record', time: '', full: 'Initial Record', relative: '' };

    const date = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let relative = '';
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        relative = diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
      } else {
        relative = `${diffHours}h ago`;
      }
    } else if (diffDays === 1) {
      relative = 'Yesterday';
    } else if (diffDays < 30) {
      relative = `${diffDays}d ago`;
    }

    return {
      date,
      time,
      full: `${date} at ${time}`,
      relative,
    };
  } catch {
    return { date: 'Initial Record', time: '', full: 'Initial Record', relative: '' };
  }
};

interface AdminUserDirectoryProps {
  users: User[];
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  currentUser: User;
  onMessageUser?: (userId: string) => void;
}

const PAGE_SIZE = 15;

export default function AdminUserDirectory({ users, updateUser, currentUser, onMessageUser }: AdminUserDirectoryProps) {
  const deleteUser = useAppStore((state) => state.deleteUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'tutor' | 'admin'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified' | 'pending'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other' | 'none'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [menuOpenUpward, setMenuOpenUpward] = useState(false);
  const actionMenuContainerRef = useRef<HTMLDivElement | null>(null);

  // Inspection Modal & Sub-modals
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [emailModalUser, setEmailModalUser] = useState<User | null>(null);

  // Inline editors inside Inspect modal
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availabilityInput, setAvailabilityInput] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);

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
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Sync editing fields when inspecting user changes
  useEffect(() => {
    setEditingRate(false);
    setEditingAvailability(false);
    setEditingBalance(false);
    if (inspectingUser) {
      setRateInput((inspectingUser.hourlyRate || 0).toString());
      setAvailabilityInput((inspectingUser.daysPerWeek || 3).toString());
      setBalanceInput((inspectingUser.balance || 0).toString());
    }
  }, [inspectingUser?.id]);

  // Keep inspectingUser synced if live Firestore user record updates
  useEffect(() => {
    if (!inspectingUser) return;
    const fresh = users.find((u) => u.id === inspectingUser.id);
    if (fresh && fresh !== inspectingUser) {
      setInspectingUser(fresh);
    }
  }, [users, inspectingUser]);

  // Close 3-dot dropdown menu on outside click or Escape
  useEffect(() => {
    if (!openActionMenuId) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-admin-user-menu-root="true"]')) {
        setOpenActionMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionMenuId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionMenuId]);

  useBackHandler(Boolean(confirmModal?.isOpen), () => setConfirmModal(null), 'admin-directory-confirm');
  useBackHandler(Boolean(inspectingUser) && !confirmModal?.isOpen, () => setInspectingUser(null), 'admin-directory-inspect');
  useBackHandler(Boolean(emailModalUser) && !confirmModal?.isOpen, () => setEmailModalUser(null), 'admin-directory-email');

  const isSuperAdminEmail =
    currentUser?.email === 'edutrackbangladesh@gmail.com' ||
    currentUser?.email === 'm13hmahadi.personal@gmail.com';

  // Filtering + sorting users
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users
      .filter((user) => {
        const searchStr = `${user.name || ''} ${user.email || ''} ${user.phone || ''} ${user.university || ''}`.toLowerCase();
        const matchesSearch = !q || searchStr.includes(q);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        let matchesVerification = true;
        if (verificationFilter === 'verified') {
          matchesVerification = !!user.isVerified;
        } else if (verificationFilter === 'unverified') {
          matchesVerification = !user.isVerified;
        } else if (verificationFilter === 'pending') {
          matchesVerification = user.nidStatus === 'pending' || user.academicStatus === 'pending';
        }

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = !user.isBlocked;
        else if (statusFilter === 'blocked') matchesStatus = !!user.isBlocked;

        let matchesGender = true;
        if (genderFilter !== 'all') {
          if (genderFilter === 'none') matchesGender = !user.gender;
          else matchesGender = user.gender?.toLowerCase() === genderFilter;
        }

        return matchesSearch && matchesRole && matchesVerification && matchesStatus && matchesGender;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          if (a.createdAt) return -1;
          if (b.createdAt) return 1;
          return b.id.localeCompare(a.id);
        }
        if (sortOrder === 'oldest') {
          if (a.createdAt && b.createdAt) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          if (a.createdAt) return -1;
          if (b.createdAt) return 1;
          return a.id.localeCompare(b.id);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [users, searchTerm, roleFilter, verificationFilter, statusFilter, genderFilter, sortOrder]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
    setOpenActionMenuId(null);
  }, [searchTerm, roleFilter, verificationFilter, statusFilter, genderFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const startIdx = (safePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredUsers, safePage]);

  const pageStartDisplay = filteredUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEndDisplay = Math.min(safePage * PAGE_SIZE, filteredUsers.length);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    roleFilter !== 'all' ||
    verificationFilter !== 'all' ||
    statusFilter !== 'all' ||
    genderFilter !== 'all';

  const resetAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setVerificationFilter('all');
    setStatusFilter('all');
    setGenderFilter('all');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText = 'Confirm',
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
      isDanger,
    });
  };

  const handleToggleBlock = (user: User) => {
    setOpenActionMenuId(null);
    const isBlocked = !!user.isBlocked;
    const confirmMsg = `Are you sure you want to ${isBlocked ? 'reactivate/unblock' : 'suspend/block'} user: ${user.name || 'this user'}?`;

    triggerConfirm(
      isBlocked ? 'Activate User' : 'Suspend User',
      confirmMsg,
      async () => {
        setUpdatingUserId(user.id);
        try {
          await updateUser(user.id, { isBlocked: !isBlocked });
          setInspectingUser((prev) => (prev?.id === user.id ? { ...prev, isBlocked: !isBlocked } : prev));
          showToast(`User ${isBlocked ? 'activated' : 'suspended'} successfully.`);
        } catch (err) {
          console.error(err);
          showToast('Failed to update suspension status.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      isBlocked ? 'Activate' : 'Suspend',
      !isBlocked
    );
  };

  const handleRemoveUser = (user: User) => {
    setOpenActionMenuId(null);
    if (user.id === currentUser.id) {
      showToast('You cannot remove your own admin account!', 'error');
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
          if (inspectingUser?.id === user.id) setInspectingUser(null);
          showToast('User profile deleted successfully.');
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

  const handleChangeRole = (userId: string, newRole: 'student' | 'tutor' | 'admin') => {
    setOpenActionMenuId(null);
    if (userId === currentUser.id) {
      showToast('You cannot demote or change your own admin role!', 'error');
      return;
    }

    if (newRole === 'admin' && !isSuperAdminEmail) {
      showToast('Permission denied! Only the main administrator is permitted to assign the admin role.', 'error');
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
          setInspectingUser((prev) => (prev?.id === userId ? { ...prev, role: newRole } : prev));
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

  const handleToggleVerification = (user: User) => {
    setOpenActionMenuId(null);
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
            academicStatus: !isCurrentlyVerified ? 'approved' : 'rejected',
          });
          setInspectingUser((prev) =>
            prev?.id === user.id
              ? {
                  ...prev,
                  isVerified: !isCurrentlyVerified,
                  nidStatus: !isCurrentlyVerified ? 'approved' : 'rejected',
                  academicStatus: !isCurrentlyVerified ? 'approved' : 'rejected',
                }
              : prev
          );
          showToast('Verification badge status updated.');
        } catch (err) {
          console.error(err);
          showToast('Failed to update verification badge status.', 'error');
        } finally {
          setUpdatingUserId(null);
        }
      },
      isCurrentlyVerified ? 'Revoke Badge' : 'Verify Badge',
      isCurrentlyVerified
    );
  };

  const handleToggleHomeVisibility = (user: User) => {
    setOpenActionMenuId(null);
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
          await updateUser(user.id, { showOnHomePage: !isCurrentlyVisible });
          setInspectingUser((prev) =>
            prev?.id === user.id ? { ...prev, showOnHomePage: !isCurrentlyVisible } : prev
          );
          showToast('Landing page visibility updated.');
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

  const handleSaveBalance = async (userId: string) => {
    const numericAmount = parseFloat(balanceInput);
    if (isNaN(numericAmount) || numericAmount < 0) {
      showToast('Please enter a valid positive numeric amount.', 'error');
      return;
    }

    setSavingBalance(true);
    try {
      await updateUser(userId, { balance: numericAmount });
      setInspectingUser((prev) => (prev?.id === userId ? { ...prev, balance: numericAmount } : prev));
      showToast(`Wallet balance updated to ৳${numericAmount.toLocaleString()}`);
      setEditingBalance(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update wallet balance.', 'error');
    } finally {
      setSavingBalance(false);
    }
  };

  const handleSaveRate = async () => {
    if (!inspectingUser) return;
    const clean = rateInput.replace(/[^0-9]/g, '');
    const num = clean ? Number(clean) : 0;
    if (isNaN(num) || num < 0) {
      showToast('Please enter a valid monthly salary amount.', 'error');
      return;
    }
    setSavingRate(true);
    try {
      await updateUser(inspectingUser.id, { hourlyRate: num });
      setInspectingUser((prev) => (prev ? { ...prev, hourlyRate: num } : null));
      showToast(`Expected monthly salary updated to ৳${num.toLocaleString()}/month`);
      setEditingRate(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update tutor salary.', 'error');
    } finally {
      setSavingRate(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!inspectingUser) return;
    const clean = availabilityInput.replace(/[^0-9]/g, '');
    const num = clean ? Number(clean) : 0;
    if (isNaN(num) || num < 0 || num > 7) {
      showToast('Availability must be between 0 and 7 days / week.', 'error');
      return;
    }
    setSavingAvailability(true);
    try {
      await updateUser(inspectingUser.id, { daysPerWeek: num });
      setInspectingUser((prev) => (prev ? { ...prev, daysPerWeek: num } : null));
      showToast(`Teaching availability updated to ${num} Days / Week`);
      setEditingAvailability(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update availability.', 'error');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleToggleMenu = (userId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openActionMenuId === userId) {
      setOpenActionMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuOpenUpward(spaceBelow < 290);
    setOpenActionMenuId(userId);
  };

  const getVerificationSummary = (user: User) => {
    if (user.role !== 'tutor') {
      return {
        label: user.role === 'admin' ? 'Admin Access' : 'Standard User',
        tone: 'neutral' as const,
      };
    }
    const status = getTutorVerificationStatus(user);
    if (status.overall === 'approved') {
      return { label: 'Verified', tone: 'verified' as const };
    }
    if (status.overall === 'pending_review') {
      return { label: 'Pending Review', tone: 'pending' as const };
    }
    if (status.overall === 'rejected' || status.overall === 'changes_required') {
      return { label: 'Needs Attention', tone: 'rejected' as const };
    }
    return { label: 'Unverified', tone: 'neutral' as const };
  };

  const renderActionsDropdown = (user: User) => {
    const isBlocked = !!user.isBlocked;
    const isUserTutor = user.role === 'tutor';
    const isSelf = user.id === currentUser.id;
    const nextRoles = (['student', 'tutor', 'admin'] as const).filter(
      (r) => r !== user.role && (r !== 'admin' || isSuperAdminEmail)
    );

    return (
      <div
        ref={actionMenuContainerRef}
        role="menu"
        aria-label={`Actions for ${user.name || 'user'}`}
        className={`absolute right-0 w-56 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-700/80 shadow-xl py-1.5 z-40 normal-case text-left transition-all duration-150 ${
          menuOpenUpward ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
        }`}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpenActionMenuId(null);
            setInspectingUser(user);
          }}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
        >
          <Eye className="w-4 h-4 text-[#0D5BFF] shrink-0" />
          <span>View Full Details</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpenActionMenuId(null);
            setEmailModalUser(user);
          }}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
        >
          <Send className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Send Email</span>
        </button>

        {!isSelf && onMessageUser && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenActionMenuId(null);
              onMessageUser(user.id);
            }}
            className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
          >
            <Mail className="w-4 h-4 text-[#0D5BFF] shrink-0" />
            <span>Direct Message</span>
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpenActionMenuId(null);
            setInspectingUser(user);
            setEditingBalance(true);
          }}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
        >
          <Coins className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Adjust Wallet (৳{(user.balance || 0).toLocaleString()})</span>
        </button>

        {isUserTutor && (
          <>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleToggleVerification(user)}
              disabled={updatingUserId === user.id}
              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
            >
              <Award className={`w-4 h-4 shrink-0 ${user.isVerified ? 'text-amber-500' : 'text-emerald-500'}`} />
              <span>{user.isVerified ? 'Revoke Verification' : 'Grant Verified Badge'}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleToggleHomeVisibility(user)}
              disabled={updatingUserId === user.id}
              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
            >
              {user.showOnHomePage !== false ? (
                <>
                  <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Hide from Homepage</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Show on Homepage</span>
                </>
              )}
            </button>
          </>
        )}

        {!isSelf && nextRoles.length > 0 && (
          <>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Change Role
            </div>
            {nextRoles.map((roleOpt) => (
              <button
                key={roleOpt}
                type="button"
                role="menuitem"
                onClick={() => handleChangeRole(user.id, roleOpt)}
                disabled={updatingUserId === user.id}
                className="w-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer"
              >
                <UserCog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Set as {roleOpt.charAt(0).toUpperCase() + roleOpt.slice(1)}</span>
              </button>
            ))}
          </>
        )}

        {!isSelf && (
          <>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleToggleBlock(user)}
              disabled={updatingUserId === user.id}
              className={`w-full px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 cursor-pointer ${
                isBlocked
                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              {isBlocked ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <span>{isBlocked ? 'Activate Account' : 'Suspend Account'}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleRemoveUser(user)}
              disabled={updatingUserId === user.id}
              className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer"
            >
              <UserMinus className="w-4 h-4 shrink-0" />
              <span>Permanently Delete</span>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full min-w-0" id="admin-user-directory-view">
      {/* Compact Search & Filter Bar */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, phone, or university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#0D5BFF] placeholder-slate-400 outline-none transition-shadow"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 tabular-nums">
              <Filter className="w-3.5 h-3.5 text-[#0D5BFF]" />
              <span>{filteredUsers.length} matched</span>
            </div>
          </div>
        </div>

        {/* Compact Segmented Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/70">
          {/* Role */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Role
            </span>
            <div className="flex bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl w-full gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'student', label: 'Student' },
                { value: 'tutor', label: 'Tutor' },
                { value: 'admin', label: 'Admin' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoleFilter(opt.value as any)}
                  className={`flex-1 py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    roleFilter === opt.value
                      ? 'bg-white dark:bg-slate-800 text-[#0D5BFF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Verification */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Verification
            </span>
            <div className="flex bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl w-full gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending' },
                { value: 'unverified', label: 'Unverified' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVerificationFilter(opt.value as any)}
                  className={`flex-1 py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer truncate ${
                    verificationFilter === opt.value
                      ? 'bg-white dark:bg-slate-800 text-[#0D5BFF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Account Status
            </span>
            <div className="flex bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl w-full gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'blocked', label: 'Suspended' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value as any)}
                  className={`flex-1 py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === opt.value
                      ? 'bg-white dark:bg-slate-800 text-[#0D5BFF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Gender
            </span>
            <div className="flex bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl w-full gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'none', label: 'N/A' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGenderFilter(opt.value as any)}
                  className={`flex-1 py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    genderFilter === opt.value
                      ? 'bg-white dark:bg-slate-800 text-[#0D5BFF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Directory Listing Card */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        {/* Header & Sort Bar */}
        <div className="px-4 py-3.5 sm:px-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#0B132B] dark:text-white flex items-center gap-2">
              <span>User Directory</span>
              <span className="text-xs font-bold text-[#0D5BFF] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg tabular-nums">
                {filteredUsers.length}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              Showing {pageStartDisplay}–{pageEndDisplay} of {filteredUsers.length} accounts • Click View Details for wallet, documents & full ledger
            </p>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800 gap-1">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0D5BFF]" />
              Sort:
            </span>
            {[
              { id: 'newest', label: 'Newest', icon: null },
              { id: 'oldest', label: 'Oldest', icon: Clock },
              { id: 'name', label: 'A–Z', icon: null },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortOrder(s.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    sortOrder === s.id
                      ? 'bg-[#0D5BFF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3 shrink-0" />}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Card View (< md) — Zero Horizontal Scroll */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/70">
          {paginatedUsers.map((user) => {
            const isBlocked = !!user.isBlocked;
            const verificationSummary = getVerificationSummary(user);
            const isMenuOpen = openActionMenuId === user.id;

            return (
              <div
                key={`mobile-${user.id}`}
                className={`p-4 space-y-3 ${isBlocked ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <UserAvatar
                      src={user.profileImage}
                      name={user.name}
                      className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                      fallbackClassName="bg-[#0D5BFF]/10 text-[#0D5BFF]"
                      textClassName="text-xs font-black"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white break-words leading-snug">
                          {user.name || 'No Name'}
                        </span>
                        {user.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                      {user.phone && <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{user.phone}</p>}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg uppercase shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                        : user.role === 'tutor'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      isBlocked
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {isBlocked ? 'Suspended' : 'Active'}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      verificationSummary.tone === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : verificationSummary.tone === 'pending'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : verificationSummary.tone === 'rejected'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {verificationSummary.label}
                  </span>
                  {user.role === 'tutor' && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {user.showOnHomePage !== false ? 'On Home' : 'Hidden'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setInspectingUser(user)}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[#0D5BFF]" />
                    <span>View Details</span>
                  </button>

                  <div className="relative" data-admin-user-menu-root="true">
                    <button
                      type="button"
                      onClick={(e) => handleToggleMenu(user.id, e)}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label={`Actions for ${user.name || 'user'}`}
                      className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {isMenuOpen && renderActionsDropdown(user)}
                  </div>
                </div>
              </div>
            );
          })}

          {paginatedUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-semibold text-xs px-4">
              No matching users found. Try clearing or adjusting your search filters.
            </div>
          )}
        </div>

        {/* Desktop & Tablet Compact Table View (>= md) — Zero Horizontal Scroll */}
        <div className="hidden md:block w-full">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
                <th className="w-[34%] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  User
                </th>
                <th className="w-[12%] px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role
                </th>
                <th className="w-[15%] px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Account Status
                </th>
                <th className="w-[18%] px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Verification
                </th>
                <th className="w-[21%] px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedUsers.map((user) => {
                const isBlocked = !!user.isBlocked;
                const isUserTutor = user.role === 'tutor';
                const joinInfo = formatJoinDate(user.createdAt);
                const verificationSummary = getVerificationSummary(user);
                const isMenuOpen = openActionMenuId === user.id;

                return (
                  <tr
                    key={user.id}
                    className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors duration-150 ${
                      isBlocked ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    {/* User Identity */}
                    <td className="px-4 py-2.5 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          src={user.profileImage}
                          name={user.name}
                          className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0"
                          fallbackClassName="bg-[#0D5BFF]/10 text-[#0D5BFF]"
                          textClassName="text-xs font-black"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[13px] font-bold text-slate-900 dark:text-white break-words leading-snug">
                              {user.name || 'No Name'}
                            </span>
                            {user.isVerified && (
                              <span title="Verified User" className="shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {user.email}
                            {user.phone ? ` · ${user.phone}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-2.5 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                          user.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                            : isUserTutor
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isBlocked
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isBlocked ? 'Suspended' : 'Active'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                          {joinInfo.date}
                        </span>
                      </div>
                    </td>

                    {/* Verification Status */}
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            verificationSummary.tone === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : verificationSummary.tone === 'pending'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : verificationSummary.tone === 'rejected'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {verificationSummary.label}
                        </span>
                        {isUserTutor && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {user.showOnHomePage !== false ? 'Homepage: Visible' : 'Homepage: Hidden'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Compact Actions: View Details + 3-Dot Menu */}
                    <td className="px-4 py-2.5 align-middle text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingUser(user)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0D5BFF] hover:text-white dark:hover:bg-[#0D5BFF] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>View Details</span>
                        </button>

                        <div className="relative" data-admin-user-menu-root="true">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMenu(user.id, e)}
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label={`More actions for ${user.name || 'user'}`}
                            title="More administrative actions"
                            className={`p-1.5 rounded-lg border transition-colors duration-150 cursor-pointer ${
                              isMenuOpen
                                ? 'bg-[#0D5BFF] text-white border-[#0D5BFF]'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {isMenuOpen && renderActionsDropdown(user)}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                    No matching users found. Try clearing or adjusting your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > PAGE_SIZE && (
          <div className="px-4 py-3 sm:px-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/20">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
              Page {safePage} of {totalPages} • Showing {pageStartDisplay}–{pageEndDisplay} of {filteredUsers.length} users
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setConfirmModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-5 animate-fade-in"
          >
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {confirmModal.isDanger ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#0D5BFF] shrink-0" />
                )}
                <span>{confirmModal.title}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex items-center gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="min-h-[40px] px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`min-h-[40px] px-4 py-2 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0D5BFF] hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details & Moderation Modal */}
      {inspectingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={() => setInspectingUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 max-w-4xl w-full my-auto space-y-6 relative overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3.5 min-w-0">
                <UserAvatar
                  src={inspectingUser.profileImage}
                  name={inspectingUser.name}
                  className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0"
                  fallbackClassName="bg-[#0D5BFF]/10 text-[#0D5BFF]"
                  textClassName="text-base font-black"
                />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 break-words leading-snug">
                    <span>{inspectingUser.name || 'Anonymous User'}</span>
                    {inspectingUser.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                        inspectingUser.isBlocked
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                    >
                      {inspectingUser.isBlocked ? 'Suspended' : 'Active'}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2.5 flex-wrap mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[#0D5BFF] font-semibold">
                      ID: {inspectingUser.id} • {inspectingUser.role.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#0D5BFF]" />
                      Joined: {formatJoinDate(inspectingUser.createdAt).full}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                aria-label="Close details"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto max-h-[62vh] pr-1 custom-scrollbar">
              {/* Left Column: Wallet, Status, Role, Moderation */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Wallet Balance
                    </span>
                    {!editingBalance && (
                      <button
                        type="button"
                        onClick={() => {
                          setBalanceInput((inspectingUser.balance || 0).toString());
                          setEditingBalance(true);
                        }}
                        className="text-xs font-bold text-[#0D5BFF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {editingBalance ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-[#0D5BFF] rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                        placeholder="0"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveBalance(inspectingUser.id)}
                          disabled={savingBalance}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {savingBalance ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBalance(false)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1 text-slate-900 dark:text-white tabular-nums">
                      <span className="text-lg font-bold">৳</span>
                      <span className="text-2xl font-black">{(inspectingUser.balance || 0).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">NID Check</span>
                      <span
                        className={`font-bold uppercase ${
                          inspectingUser.nidStatus === 'approved'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : inspectingUser.nidStatus === 'rejected'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {inspectingUser.nidStatus || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Academic Check</span>
                      <span
                        className={`font-bold uppercase ${
                          inspectingUser.academicStatus === 'approved'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : inspectingUser.academicStatus === 'rejected'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {inspectingUser.academicStatus || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role & Gender quick selectors */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Account Role
                    </label>
                    <select
                      value={inspectingUser.role}
                      disabled={inspectingUser.id === currentUser.id || updatingUserId === inspectingUser.id}
                      onChange={(e) => handleChangeRole(inspectingUser.id, e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer disabled:opacity-60"
                    >
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      {(isSuperAdminEmail || inspectingUser.role === 'admin') && (
                        <option value="admin">Admin</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Gender Profile
                    </label>
                    <select
                      value={inspectingUser.gender || ''}
                      disabled={updatingUserId === inspectingUser.id}
                      onChange={(e) => {
                        const newGender = e.target.value;
                        setUpdatingUserId(inspectingUser.id);
                        updateUser(inspectingUser.id, { gender: newGender })
                          .then(() => {
                            setInspectingUser((prev) => (prev ? { ...prev, gender: newGender } : null));
                            showToast(`Gender changed to ${newGender || 'Not Specified'}`);
                          })
                          .catch(() => showToast('Failed to update gender', 'error'))
                          .finally(() => setUpdatingUserId(null));
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="">Not Specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">
                    Moderation Controls
                  </span>

                  {inspectingUser.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => handleToggleBlock(inspectingUser)}
                      className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-[#0D5BFF] cursor-pointer transition-colors"
                    >
                      <span>{inspectingUser.isBlocked ? 'Activate Account' : 'Suspend Account'}</span>
                      <span className={inspectingUser.isBlocked ? 'text-emerald-600' : 'text-rose-600'}>
                        {inspectingUser.isBlocked ? 'UNBLOCK' : 'SUSPEND'}
                      </span>
                    </button>
                  )}

                  {inspectingUser.role === 'tutor' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleVerification(inspectingUser)}
                        className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-[#0D5BFF] cursor-pointer transition-colors"
                      >
                        <span>Verification Badge</span>
                        <span className="text-[#0D5BFF]">{inspectingUser.isVerified ? 'REVOKE' : 'GRANT'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleHomeVisibility(inspectingUser)}
                        className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-colors"
                      >
                        <span>Homepage Display</span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {inspectingUser.showOnHomePage !== false ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </button>
                    </>
                  )}

                  {inspectingUser.id !== currentUser.id && onMessageUser && (
                    <button
                      type="button"
                      onClick={() => {
                        onMessageUser(inspectingUser.id);
                        setInspectingUser(null);
                      }}
                      className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 text-[#0D5BFF] hover:bg-[#0D5BFF] hover:text-white border border-blue-200/70 dark:border-blue-900/50 cursor-pointer transition-colors"
                    >
                      <span>Open Direct Chat</span>
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {inspectingUser.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(inspectingUser)}
                      className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-200/70 dark:border-rose-900/40 cursor-pointer transition-colors"
                    >
                      <span>Permanently Delete User</span>
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right 2 Columns: Full User Metadata */}
              <div className="md:col-span-2 space-y-5">
                {/* Contact & Registration */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Contact & Account Credentials
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Phone Number</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                        {inspectingUser.phone || 'Not configured'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Email Address</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 break-all font-mono">
                        {inspectingUser.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Date of Birth</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inspectingUser.birthDate || 'Not configured'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Joined Date</span>
                      <p className="text-xs font-bold text-[#0D5BFF] mt-0.5 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatJoinDate(inspectingUser.createdAt).full}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Geography */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Location Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">District</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inspectingUser.district || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Area</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inspectingUser.area || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Thana</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inspectingUser.thana || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role-Specific Section */}
                {inspectingUser.role === 'tutor' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Tutor Profile & Compensation
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">University</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {inspectingUser.university || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Department / Subject</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {inspectingUser.course || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Academic Tenure</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {inspectingUser.year ? `${inspectingUser.year} Year` : ''}
                            {inspectingUser.semester ? ` • Semester ${inspectingUser.semester}` : ''}
                            {!inspectingUser.year && !inspectingUser.semester ? 'Standard / Graduated' : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">National ID (NID)</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                            {inspectingUser.nidNumber || 'Not submitted'}
                          </p>
                        </div>

                        {/* Expected Monthly Salary Editor */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-[#0D5BFF]" />
                              Expected Monthly Salary
                            </span>
                            {!editingRate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRateInput((inspectingUser.hourlyRate || 0).toString());
                                  setEditingRate(true);
                                }}
                                className="text-xs font-bold text-[#0D5BFF] hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          {!editingRate ? (
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              ৳{(inspectingUser.hourlyRate || 0).toLocaleString()}{' '}
                              <span className="text-xs font-semibold text-slate-500">/ month</span>
                            </p>
                          ) : (
                            <div className="space-y-2 mt-1">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={rateInput}
                                  onChange={(e) => setRateInput(e.target.value.replace(/[^0-9]/g, ''))}
                                  className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-[#0D5BFF] rounded-lg text-xs font-bold outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveRate}
                                  disabled={savingRate}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRate(false)}
                                  className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Days per week editor */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#0D5BFF]" />
                              Days / Week
                            </span>
                            {!editingAvailability && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAvailabilityInput((inspectingUser.daysPerWeek || 3).toString());
                                  setEditingAvailability(true);
                                }}
                                className="text-xs font-bold text-[#0D5BFF] hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          {!editingAvailability ? (
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              {inspectingUser.daysPerWeek || 0}{' '}
                              <span className="text-xs font-semibold text-slate-500">Days / Week</span>
                            </p>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1">
                              <select
                                value={availabilityInput}
                                onChange={(e) => setAvailabilityInput(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-[#0D5BFF] rounded-lg text-xs font-bold outline-none"
                              >
                                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                                  <option key={num} value={num}>
                                    {num} Days / Week
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={handleSaveAvailability}
                                disabled={savingAvailability}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAvailability(false)}
                                className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {inspectingUser.bio && (
                      <div>
                        <p className="text-[11px] font-bold text-[#0D5BFF] uppercase tracking-wider mb-1.5">Tutor Bio</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 p-3.5 rounded-xl leading-relaxed">
                          "{inspectingUser.bio}"
                        </p>
                      </div>
                    )}

                    {(inspectingUser.subjects?.length || inspectingUser.classes?.length) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                            Subjects
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectingUser.subjects?.map((subj, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-50 dark:bg-blue-900/30 text-[#0D5BFF] dark:text-blue-300 px-2.5 py-1 text-xs font-semibold rounded-lg"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                            Classes
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectingUser.classes?.map((cls, idx) => (
                              <span
                                key={idx}
                                className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 text-xs font-semibold rounded-lg"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {(inspectingUser.nidFrontImg ||
                      inspectingUser.nidBackImg ||
                      (inspectingUser.documents && inspectingUser.documents.length > 0)) && (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1">
                          Verification Documents
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {inspectingUser.nidFrontImg && (
                            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-500 block">NID Front</span>
                              <div className="h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                <img
                                  src={inspectingUser.nidFrontImg}
                                  alt="NID Front"
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover cursor-zoom-in"
                                  onClick={() => window.open(inspectingUser.nidFrontImg, '_blank')}
                                />
                              </div>
                            </div>
                          )}
                          {inspectingUser.nidBackImg && (
                            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-500 block">NID Back</span>
                              <div className="h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                <img
                                  src={inspectingUser.nidBackImg}
                                  alt="NID Back"
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover cursor-zoom-in"
                                  onClick={() => window.open(inspectingUser.nidBackImg, '_blank')}
                                />
                              </div>
                            </div>
                          )}
                          {inspectingUser.documents && inspectingUser.documents.length > 0 && (
                            <div className="sm:col-span-2 border border-slate-200 dark:border-slate-800 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 block">
                                University / College ID & Certificates
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {inspectingUser.documents.map((docUrl, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative group cursor-pointer hover:border-[#0D5BFF] transition-colors"
                                    onClick={() => window.open(docUrl, '_blank')}
                                  >
                                    <img
                                      src={docUrl}
                                      alt={`Document ${dIdx + 1}`}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                    />
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
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Student / Guardian Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">School / College</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{inspectingUser.school || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Class Grade</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{inspectingUser.studentClass || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Group</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{inspectingUser.group || 'General'}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Desired Subject</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{inspectingUser.subject || 'All Subjects'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Address</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 break-words">
                          {inspectingUser.address || 'Not configured'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = inspectingUser;
                  setInspectingUser(null);
                  setEmailModalUser(target);
                }}
                className="min-h-[40px] px-4 py-2 bg-[#0D5BFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="min-h-[40px] px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalUser && (
        <AdminSendMailModal
          user={emailModalUser}
          onClose={() => setEmailModalUser(null)}
          onSuccess={(msg) => showToast(msg, 'success')}
        />
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold bg-white dark:bg-[#111A2E] border-slate-200 dark:border-slate-800">
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-slate-800 dark:text-slate-200">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
