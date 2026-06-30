import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

export type Role = 'student' | 'tutor' | 'admin';

export interface AvailabilitySlot {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email: string;
  profileImage?: string;
  balance?: number;
  
  // Shared / Filtering
  subjects?: string[]; // Subjects they teach or study
  classes?: string[]; // Classes they teach or are in
  district?: string;
  area?: string;
  thana?: string;
  teachingAreas?: string[]; // Areas where the tutor provides service
  
  // Student Specific
  address?: string;
  group?: string;
  subject?: string;
  studentClass?: string;
  school?: string;
  
  // Tutor Specific
  semester?: string;
  year?: string;
  course?: string;
  university?: string;
  nidNumber?: string;
  birthDate?: string;
  isVerified?: boolean;
  nidStatus?: 'pending' | 'approved' | 'rejected';
  academicStatus?: 'pending' | 'approved' | 'rejected';
  nidFrontImg?: string;
  nidBackImg?: string;
  documents?: string[];
  isTrackingOn?: boolean;
  location?: { lat: number; lng: number };
  rating?: number;
  totalRatings?: number;
  ratingSum?: number;
  
  // New Profile Details
  bio?: string;
  experience?: string;
  hourlyRate?: number;
  daysPerWeek?: number;
  availabilitySlots?: { [key: string]: string[] }; 
  hasDismissedProfileNotice?: boolean;
  isBlocked?: boolean;
  gender?: 'Male' | 'Female' | 'Other' | string;
  showOnHomePage?: boolean;
  showTour?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  savedTutors?: string[];
}

export interface Session {
  id: string;
  studentId: string;
  tutorId: string;
  subject: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'proposed_by_tutor' | 'requested_by_student' | 'rejected';
  startTime?: string;
  endTime?: string;
  scheduledTime: string;
  duration?: number; // in minutes
  meetingLink?: string;
  rating?: number;
  feedback?: string;
  studentPermissionGranted?: boolean;
  tutorRequestedEnd?: boolean;
}

export interface Withdrawal {
  id: string;
  tutorId: string;
  amount: number;
  bKashNumber: string;
  paymentMethod: 'bkash' | 'nagad' | 'bank';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  adminNote?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  tutorId: string;
  bKashNumber: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  participants: string[];
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  timestamp: string;
}

export interface ClassLog {
  id: string;
  studentId: string;
  tutorId: string;
  date: string; // "YYYY-MM-DD"
  status: 'pending' | 'verified' | 'disputed';
  subject: string;
  loggedAt: string;
  reviewedAt?: string;
  notes?: string;
  tutorNotes?: string;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  payments: Payment[];
  sessions: Session[];
  withdrawals: Withdrawal[];
  messages: Message[];
  notifications: Notification[];
  classLogs: ClassLog[];
  isLoading: boolean;
  isInitialized: boolean;
  isLoggingOut: boolean;
  typingStatus: { [userId: string]: string | null };
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (requestedRole?: Role, additionalUserData?: Partial<User>) => Promise<void>;
  loginAsDemo: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: Partial<User>, password: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateLocation: (id: string, lat: number, lng: number) => Promise<void>;
  toggleTracking: (id: string, isOn: boolean) => Promise<void>;
  updateAvailabilitySlots: (slots: { [key: string]: string[] }) => Promise<void>;
  
  // Class verification actions
  logClass: (studentId: string, tutorId: string, subject: string, date: string, notes?: string) => Promise<void>;
  verifyClass: (classLogId: string, status: 'verified' | 'disputed', notes?: string) => Promise<void>;
  deleteClassLog: (classLogId: string) => Promise<void>;
  
  // Admin actions
  verifyTutor: (id: string, type: 'nid' | 'academic', status: 'approved' | 'rejected') => Promise<void>;
  approvePayment: (id: string) => Promise<void>;
  rejectPayment: (id: string) => Promise<void>;
  approveWithdrawal: (id: string, adminNote?: string) => Promise<void>;
  rejectWithdrawal: (id: string, reason?: string) => Promise<void>;
  
  // Student actions
  submitPayment: (payment: Omit<Payment, 'id' | 'status' | 'date'>) => Promise<void>;
  bookSession: (session: Omit<Session, 'id'> & { status?: Session['status'] }) => Promise<void>;
  acceptSession: (sessionId: string) => Promise<void>;
  rejectSession: (sessionId: string) => Promise<void>;
  grantEndPermission: (sessionId: string, granted: boolean) => Promise<void>;
  
  // Tutor actions
  startSession: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  rateSession: (sessionId: string, rating: number, feedback: string) => Promise<void>;
  requestWithdrawal: (withdrawal: Omit<Withdrawal, 'id' | 'status' | 'timestamp'>) => Promise<void>;
  requestEndPermission: (sessionId: string) => Promise<void>;
  
  // Messages
  sendMessage: (msg: Omit<Message, 'id' | 'timestamp' | 'isRead' | 'participants'>) => Promise<void>;
  markMessagesAsRead: (senderId: string) => Promise<void>;
  
  // Notifications
  sendNotification: (userId: string, title: string, message: string, type?: Notification['type']) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  
  // Typing
  setTyping: (targetId: string, isTyping: boolean) => Promise<void>;
  
  // Theme state for entire dashboard
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Promotional banner settings
  promotionalBannerText: string;
  updatePromotionalBannerText: (text: string) => Promise<void>;
  
  // Internal sync
  setLoading: (loading: boolean) => void;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Non-blocking background observers should not crash the page or run unhandled rejections
  if (operationType === OperationType.LIST || (operationType === OperationType.GET && path?.startsWith('users/'))) {
    return;
  }
  throw new Error(JSON.stringify(errInfo));
}

let activeUnsubscribes: (() => void)[] = [];

function cleanupListeners() {
  activeUnsubscribes.forEach(unsub => unsub());
  activeUnsubscribes = [];
}

export const useAppStore = create<AppState>((set, get) => {
  // Listen for global system configurations like promotional banner
  onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data && data.promotionalBannerText !== undefined) {
        set({ promotionalBannerText: data.promotionalBannerText });
      }
    }
  }, (error) => {
    console.warn("Non-blocking: could not fetch promotional banner config:", error);
  });

  // Listen for Auth changes
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in, fetch profile
      set({ isLoading: true });
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          let userData = userDoc.data() as User;
          const lowercaseEmail = firebaseUser.email?.toLowerCase();
          if (lowercaseEmail === 'edutrackbangladesh@gmail.com' || lowercaseEmail === 'm13hmahadi.personal@gmail.com') {
            if (userData.role !== 'admin' || !userData.isVerified) {
              userData = { ...userData, role: 'admin', isVerified: true };
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin', isVerified: true });
              } catch (e) {
                console.error("Error upgrading main admin role in Firestore Auth observer:", e);
              }
            }
          }
          if (userData.role === 'admin') {
            if (!userData.profileImage || userData.profileImage.startsWith('https://i.pravatar.cc') || userData.profileImage.includes('googleusercontent.com') || userData.profileImage === '' || userData.profileImage === '/admin_profile.svg') {
              userData.profileImage = '/admin_profile.png';
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { profileImage: '/admin_profile.png' });
              } catch (e) {
                console.error("Error updating admin profile image in Firestore observer:", e);
              }
            }
          }
          set({ currentUser: userData });
          
          // Setup real-time listeners for data
          setupListeners(firebaseUser.uid, userData.role, set, get);
        } else {
          set({ currentUser: null });
          cleanupListeners();
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        set({ currentUser: null });
        cleanupListeners();
      } finally {
        set({ isLoading: false, isInitialized: true });
      }
    } else {
      cleanupListeners();
      set({ currentUser: null, users: [], payments: [], messages: [], isLoading: false, isInitialized: true });
    }
  });

  return {
    currentUser: null,
    users: [],
    payments: [],
    sessions: [],
    withdrawals: [],
    messages: [],
    notifications: [],
    classLogs: [],
    isLoading: true,
    isInitialized: false,
    isLoggingOut: false,
    typingStatus: {},
    theme: (typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'light' | 'dark' || 'light') : 'light'),

    promotionalBannerText: "0% COMMISSION FOR INTERNATIONAL ISLAMIC UNIVERSITY CHITTAGONG (IIUC) STUDENTS  • JOIN AS A TUTOR TODAY AND GET 0% COMMISSION FOR THE FIRST 3 MONTHS! • VERIFIED EXPERT MENTORS AVAILABLE IN OUR NEAR • ",

    updatePromotionalBannerText: async (text: string) => {
      try {
        await setDoc(doc(db, 'system', 'config'), { promotionalBannerText: text }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'system/config');
      }
    },

    toggleTheme: () => {
      const currentTheme = get().theme;
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      set({ theme: nextTheme });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    login: async (email, password) => {
      set({ isLoading: true });
      const trimmedEmail = email.trim();
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (error: any) {
        // Auto-provision primary main admin on the fly if the credentials match
        const lowerEmail = trimmedEmail.toLowerCase();
        if ((lowerEmail === 'edutrackbangladesh@gmail.com' || lowerEmail === 'm13hmahadi.personal@gmail.com') && password === 'Mahdi250') {
          try {
            const signupRes = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            const uid = signupRes.user.uid;
            const newUser: User = {
              id: uid,
              email: trimmedEmail.toLowerCase(),
              name: 'Main Provider Admin',
              phone: '01711223344',
              role: 'admin',
              balance: 0,
              isVerified: true,
              isTrackingOn: false,
              rating: 5,
              showTour: true,
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', uid), newUser);
            set({ currentUser: newUser, isLoading: false });
            return;
          } catch (signupErr) {
            console.error("Auto-provision of main admin failed:", signupErr);
          }
        }
        set({ isLoading: false });
        throw error;
      }
    },

    loginWithGoogle: async (requestedRole, additionalUserData) => {
      set({ isLoading: true });
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const { user } = result;

        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // New user from Google
          const lowerGEmail = user.email?.toLowerCase();
          const isMainAdmin = lowerGEmail === 'edutrackbangladesh@gmail.com' || lowerGEmail === 'm13hmahadi.personal@gmail.com';
          const newUser: User = {
            id: user.uid,
            email: user.email!,
            name: user.displayName || (isMainAdmin ? 'Main Provider Admin' : 'Google User'),
            phone: user.phoneNumber || '',
            role: isMainAdmin ? 'admin' : (requestedRole || 'student'), // Admin if main email
            balance: 0,
            isVerified: isMainAdmin ? true : false,
            isTrackingOn: false,
            rating: isMainAdmin ? 5 : 0,
            profileImage: isMainAdmin ? '/admin_profile.png' : (user.photoURL || ''),
            showTour: true,
            createdAt: new Date().toISOString(),
            ...additionalUserData
          };
          await setDoc(doc(db, 'users', user.uid), newUser);
          set({ currentUser: newUser });
        } else {
          let userData = userDoc.data() as User;
          const lowerGEmail = user.email?.toLowerCase();
          if (lowerGEmail === 'edutrackbangladesh@gmail.com' || lowerGEmail === 'm13hmahadi.personal@gmail.com') {
            if (userData.role !== 'admin' || !userData.isVerified) {
              userData = { ...userData, role: 'admin', isVerified: true };
              try {
                await updateDoc(doc(db, 'users', user.uid), { role: 'admin', isVerified: true });
              } catch (e) {
                console.error("Error setting Google logged-in admin role:", e);
              }
            }
          }
          if (userData.role === 'admin') {
            if (!userData.profileImage || userData.profileImage.startsWith('https://i.pravatar.cc') || userData.profileImage.includes('googleusercontent.com') || userData.profileImage === '' || userData.profileImage === '/admin_profile.svg') {
              userData.profileImage = '/admin_profile.png';
              try {
                await updateDoc(doc(db, 'users', user.uid), { profileImage: '/admin_profile.png' });
              } catch (e) {
                console.error("Error updating admin profile image in Firestore google login:", e);
              }
            }
          }
          set({ currentUser: userData });
        }
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    loginAsDemo: async (role: Role) => {
      set({ isLoading: true });
      const demoAccounts = {
        student: { email: 'student@gmail.com', password: 'password123' },
        tutor: { email: 'teacher@gmail.com', password: 'password123' },
        admin: { email: 'admin@gmail.com', password: 'password123' }
      };

      const { email, password } = demoAccounts[role];
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        // Only attempt signup if the user definitely does not exist
        if (error.code === 'auth/user-not-found') {
          try {
            await get().signup({ 
              email, 
              name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role,
              phone: '01700000000'
            }, password);
          } catch (signupErr) {
            set({ isLoading: false });
            throw signupErr;
          }
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          try {
            await get().signup({ 
              email, 
              name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role,
              phone: '01700000000'
            }, password);
          } catch (signupError: any) {
            set({ isLoading: false });
            if (signupError.message?.includes('auth/email-already-in-use') || signupError.code === 'auth/email-already-in-use') {
              throw new Error(`Demo account ${email} exists with a different password. Please use the standard login or contact support.`);
            }
            throw signupError;
          }
        } else {
          set({ isLoading: false });
          throw error;
        }
      }
    },

    logout: async () => {
      set({ isLoggingOut: true });
      cleanupListeners();
      // Allow the UI logout transition animation to execute perfectly
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await signOut(auth);
      set({ isLoggingOut: false });
    },

    signup: async (userData, password) => {
      set({ isLoading: true });
      try {
        // Create auth user
        const result = await createUserWithEmailAndPassword(auth, userData.email!, password);
        const uid = result.user.uid;

        // Determine role - handle the requested admin email
        let finalRole: Role = userData.role as Role;
        const lowerSignupEmail = userData.email?.toLowerCase();
        if (lowerSignupEmail === 'admin@gmail.com' || lowerSignupEmail === 'edutrackbangladesh@gmail.com' || lowerSignupEmail === 'm13hmahadi.personal@gmail.com') {
          finalRole = 'admin';
        }

        const newUser: User = {
          ...userData,
          id: uid,
          role: finalRole,
          balance: 0,
          isVerified: finalRole === 'admin' || finalRole === 'student',
          isTrackingOn: false,
          rating: 0,
          showTour: true,
          createdAt: new Date().toISOString(),
          profileImage: finalRole === 'admin' ? '/admin_profile.png' : (userData.profileImage || '')
        } as User;

        // Save to Firestore
        await setDoc(doc(db, 'users', uid), newUser);
        set({ currentUser: newUser });
      } catch (error) {
        set({ isLoading: false });
        if (error instanceof Error && !error.message.includes('users/')) {
          handleFirestoreError(error, OperationType.WRITE, `users`);
        } else {
          throw error;
        }
      }
    },

    updateUser: async (id, data) => {
      try {
        await updateDoc(doc(db, 'users', id), data as any);
        // Update local state immediately for snappy UI
        const current = get().currentUser;
        if (current?.id === id) {
          set({ currentUser: { ...current, ...data } as User });
        }
        const usersList = get().users;
        if (usersList.some(u => u.id === id)) {
          set({
            users: usersList.map(u => u.id === id ? { ...u, ...data } as User : u)
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      }
    },

    deleteUser: async (id) => {
      try {
        await deleteDoc(doc(db, 'users', id));
        // Remove from local users list
        const usersList = get().users;
        set({
          users: usersList.filter(u => u.id !== id)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      }
    },

    updateLocation: async (id, lat, lng) => {
      try {
        const location = { lat, lng };
        await updateDoc(doc(db, 'users', id), { location });
        // Update local state immediately
        const current = get().currentUser;
        if (current?.id === id) {
          set({ currentUser: { ...current, location } });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      }
    },

    toggleTracking: async (id, isOn) => {
      try {
        await updateDoc(doc(db, 'users', id), { isTrackingOn: isOn });
        
        // Notify students who have payments with this tutor
        const tutor = get().users.find(u => u.id === id);
        if (isOn && tutor) {
          const relevantPayments = get().payments.filter(p => p.tutorId === id);
          const studentIds = Array.from(new Set(relevantPayments.map(p => p.studentId)));
          
          for (const sId of studentIds) {
            await get().sendNotification(
              sId, 
              'Session In Transit', 
              `${tutor.name} has started broadcasting their live location.`,
              'success'
            );
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      }
    },

    updateAvailabilitySlots: async (slots) => {
      const user = get().currentUser;
      if (!user) return;
      try {
        await updateDoc(doc(db, 'users', user.id), { availabilitySlots: slots });
        set({ currentUser: { ...user, availabilitySlots: slots } });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      }
    },

    verifyTutor: async (id, type, status) => {
      try {
        const updateData: any = {};
        if (type === 'nid') updateData.nidStatus = status;
        if (type === 'academic') updateData.academicStatus = status;

        // Check if both are approved to set overall isVerified
        const user = get().users.find(u => u.id === id);
        if (user) {
          const currentNidStatus = type === 'nid' ? status : user.nidStatus;
          const currentAcademicStatus = type === 'academic' ? status : user.academicStatus;
          
          if (currentNidStatus === 'approved' && currentAcademicStatus === 'approved') {
            updateData.isVerified = true;
          } else {
            updateData.isVerified = false;
          }
        }

        await updateDoc(doc(db, 'users', id), updateData);
        
        const typeLabel = type === 'nid' ? 'NID' : 'Academic Certificates';
        const message = status === 'approved' 
          ? `Your ${typeLabel} have been approved.` 
          : `Your ${typeLabel} verification was rejected. Please re-upload valid documents.`;
        
        await get().sendNotification(id, 'Verification Update', message, status === 'approved' ? 'success' : 'error');
        
        if (updateData.isVerified) {
          await get().sendNotification(id, 'Full Verification Complete', 'Your expert profile is now fully verified!', 'success');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      }
    },

    approvePayment: async (id) => {
      const payment = get().payments.find(p => p.id === id);
      if (!payment) return;

      try {
        await updateDoc(doc(db, 'payments', id), { status: 'approved' });
        await updateDoc(doc(db, 'users', payment.tutorId), {
          balance: increment(payment.amount)
        });
        
        await get().sendNotification(payment.studentId, 'Payment Approved', `Your payment of ৳${payment.amount} has been cleared.`, 'success');
        await get().sendNotification(payment.tutorId, 'Balance Updated', `৳${payment.amount} has been added to your teaching wallet.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'payments/approval');
      }
    },

    rejectPayment: async (id) => {
      const payment = get().payments.find(p => p.id === id);
      if (!payment) return;
      try {
        await updateDoc(doc(db, 'payments', id), { status: 'rejected' });
        await get().sendNotification(payment.studentId, 'Payment Rejected', `Your payment of ৳${payment.amount} could not be verified.`, 'error');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `payments/${id}`);
      }
    },

    approveWithdrawal: async (id, adminNote?: string) => {
      const withdrawal = get().withdrawals.find(w => w.id === id);
      if (!withdrawal) return;
      try {
        await updateDoc(doc(db, 'withdrawals', id), { 
          status: 'approved',
          adminNote: adminNote || 'Batch payment processed successfully.'
        });

        // Add to global ledger for auditing
        const ledgerId = `ledger_${Date.now()}`;
        await setDoc(doc(db, 'ledger', ledgerId), {
          id: ledgerId,
          type: 'withdrawal',
          amount: withdrawal.amount,
          referenceId: id,
          description: `Payout to expert: ${withdrawal.tutorId} via ${withdrawal.paymentMethod?.toUpperCase()}`,
          timestamp: new Date().toISOString()
        });

        await get().sendNotification(
          withdrawal.tutorId, 
          'Withdrawal Processed', 
          `Your withdrawal of ৳${withdrawal.amount} has been approved and sent via ${withdrawal.paymentMethod?.toUpperCase() || 'bKash'}.`, 
          'success'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${id}`);
      }
    },

    rejectWithdrawal: async (id, reason?: string) => {
      const withdrawal = get().withdrawals.find(w => w.id === id);
      if (!withdrawal) return;
      try {
        await updateDoc(doc(db, 'withdrawals', id), { 
          status: 'rejected',
          adminNote: reason || 'Information mismatch or insufficient verified sessions.'
        });
        await updateDoc(doc(db, 'users', withdrawal.tutorId), {
          balance: increment(withdrawal.amount)
        });
        await get().sendNotification(
          withdrawal.tutorId, 
          'Withdrawal Rejected', 
          `Withdrawal of ৳${withdrawal.amount} was rejected. Reason: ${reason || 'Contact support'}. Funds returned to wallet.`, 
          'error'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${id}`);
      }
    },

    submitPayment: async (paymentData) => {
      const id = `pay_${Date.now()}`;
      try {
        await setDoc(doc(db, 'payments', id), {
          ...paymentData,
          id,
          status: 'pending',
          date: new Date().toISOString()
        });
        
        // Notify Admin
        const admin = get().users.find(u => u.role === 'admin');
        if (admin) {
          await get().sendNotification(admin.id, 'New Payment Request', `A new deposit of ৳${paymentData.amount} requires validation.`, 'warning');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `payments/${id}`);
      }
    },

    bookSession: async (sessionData) => {
      const id = `sess_${Date.now()}`;
      try {
        await setDoc(doc(db, 'sessions', id), {
          ...sessionData,
          id,
          status: sessionData.status || 'scheduled'
        });
        const recipientId = sessionData.status === 'proposed_by_tutor' ? sessionData.studentId : sessionData.tutorId;
        const noteMsg = sessionData.status === 'proposed_by_tutor' 
          ? 'A tutor has sent you a tuition proposal.' 
          : 'A student has scheduled or requested a new tuition session with you.';
        await get().sendNotification(recipientId, 'New Booking Request', noteMsg, 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `sessions/${id}`);
      }
    },

    acceptSession: async (id) => {
      try {
        await updateDoc(doc(db, 'sessions', id), { status: 'scheduled' });
        const s = get().sessions.find(x => x.id === id);
        if (s) {
          await get().sendNotification(s.studentId, 'Tuition Accepted', 'The tuition session has been accepted and scheduled.', 'success');
          await get().sendNotification(s.tutorId, 'Tuition Accepted', 'The tuition session has been accepted and scheduled.', 'success');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    rejectSession: async (id) => {
      try {
        await updateDoc(doc(db, 'sessions', id), { status: 'rejected' });
        const s = get().sessions.find(x => x.id === id);
        if (s) {
          await get().sendNotification(s.studentId, 'Tuition Proposal Declined', 'The tuition session was declined.', 'error');
          await get().sendNotification(s.tutorId, 'Tuition Proposal Declined', 'The tuition session was declined.', 'error');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    startSession: async (id) => {
      try {
        await updateDoc(doc(db, 'sessions', id), { 
          status: 'active', 
          startTime: new Date().toISOString(),
          studentPermissionGranted: false,
          tutorRequestedEnd: false
        });
        const sess = get().sessions.find(s => s.id === id);
        if (sess) {
          await get().sendNotification(sess.studentId, 'Session Started', 'Your session has just begun. Connect now!', 'success');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    endSession: async (id) => {
      try {
        const sess = get().sessions.find(s => s.id === id);
        if (sess && !sess.studentPermissionGranted) {
          throw new Error('Teacher cannot finish this session without student permission.');
        }
        await updateDoc(doc(db, 'sessions', id), { 
          status: 'completed', 
          endTime: new Date().toISOString() 
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    grantEndPermission: async (id, granted) => {
      try {
        await updateDoc(doc(db, 'sessions', id), {
          studentPermissionGranted: granted
        });
        const sess = get().sessions.find(s => s.id === id);
        if (sess) {
          if (granted) {
            await get().sendNotification(sess.tutorId, 'Permission Granted', 'Your student has granted you permission to complete the active lesson.', 'success');
          } else {
            await get().sendNotification(sess.tutorId, 'Permission Revoked', 'Your student has revoked or declined permission to complete the lesson.', 'error');
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    requestEndPermission: async (id) => {
      try {
        await updateDoc(doc(db, 'sessions', id), {
          tutorRequestedEnd: true
        });
        const sess = get().sessions.find(s => s.id === id);
        if (sess) {
          await get().sendNotification(sess.studentId, 'Completion Permission Requested', 'Your tutor wishes to complete the session. Please grant permission.', 'info');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    cancelSession: async (id) => {
      try {
        await updateDoc(doc(db, 'sessions', id), { status: 'cancelled' });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
      }
    },

    rateSession: async (sessionId, rating, feedback) => {
      try {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Update session with rating
        await updateDoc(doc(db, 'sessions', sessionId), { rating, feedback });

        // Update tutor rating stats
        const tutorRef = doc(db, 'users', session.tutorId);
        const tutor = get().users.find(u => u.id === session.tutorId);
        
        if (tutor) {
          const newRatingSum = (tutor.ratingSum || 0) + rating;
          const newTotalRatings = (tutor.totalRatings || 0) + 1;
          const newAverageRating = newRatingSum / newTotalRatings;

          await updateDoc(tutorRef, {
            rating: newAverageRating,
            ratingSum: newRatingSum,
            totalRatings: newTotalRatings
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
      }
    },

    logClass: async (studentId, tutorId, subject, date, notes = '') => {
      const id = `clog_${Date.now()}`;
      try {
        await setDoc(doc(db, 'class_logs', id), {
          id,
          studentId,
          tutorId,
          subject,
          date,
          status: 'pending',
          notes,
          loggedAt: new Date().toISOString()
        });
        
        // Notify the tutor
        const student = get().currentUser;
        const studentName = student?.name || 'A student';
        await get().sendNotification(
          tutorId,
          'Class Verification Request',
          `${studentName} has marked ${date} as a conducted class for ${subject}. Please verify or dispute.`,
          'info'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `class_logs/${id}`);
      }
    },

    verifyClass: async (classLogId, status, notes = '') => {
      try {
        const updates: any = { 
          status,
          reviewedAt: new Date().toISOString()
        };
        if (notes) {
          updates.tutorNotes = notes;
        }
        await updateDoc(doc(db, 'class_logs', classLogId), updates);

        const log = get().classLogs.find(l => l.id === classLogId);
        if (log) {
          const tutor = get().currentUser;
          const tutorName = tutor?.name || 'Your tutor';
          const notificationTitle = status === 'verified' ? 'Class Log Verified' : 'Class Log Disputed';
          const notificationBody = status === 'verified'
            ? `${tutorName} verified that the class on ${log.date} took place.`
            : `${tutorName} disputed the class on ${log.date}.`;

          await get().sendNotification(
            log.studentId,
            notificationTitle,
            notificationBody,
            status === 'verified' ? 'success' : 'error'
          );
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `class_logs/${classLogId}`);
      }
    },

    deleteClassLog: async (classLogId) => {
      try {
        await deleteDoc(doc(db, 'class_logs', classLogId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `class_logs/${classLogId}`);
      }
    },

    requestWithdrawal: async (withdrawalData) => {
      const id = `with_${Date.now()}`;
      
      // Real-world validations
      if (withdrawalData.amount < 500) {
        throw new Error('Minimum withdrawal amount is ৳500');
      }

      const tutor = get().currentUser;
      if (!tutor || (tutor.balance || 0) < withdrawalData.amount) {
        throw new Error('Insufficient balance for this request');
      }

      try {
        // DEDUCT from balance immediately to lock funds
        await updateDoc(doc(db, 'users', withdrawalData.tutorId), {
          balance: increment(-withdrawalData.amount)
        });

        await setDoc(doc(db, 'withdrawals', id), {
          ...withdrawalData,
          id,
          status: 'pending',
          timestamp: new Date().toISOString()
        });

        // Notify Admin
        const admin = get().users.find(u => u.role === 'admin');
        if (admin) {
          await get().sendNotification(admin.id, 'Financial: Payout Hook', `Expert ${tutor.name} requested ৳${withdrawalData.amount} via ${withdrawalData.paymentMethod.toUpperCase()}`, 'warning');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `withdrawals/${id}`);
      }
    },

    sendMessage: async (msgData) => {
      const id = `msg_${Date.now()}`;
      try {
        await setDoc(doc(db, 'messages', id), {
          ...msgData,
          id,
          participants: [msgData.senderId, msgData.receiverId],
          timestamp: new Date().toISOString(),
          isRead: false
        });
        
        // Notify Receiver
        const senderName = get().currentUser?.role === 'admin' ? 'EDUTRACK ADMIN' : (get().currentUser?.name || 'User');
        await get().sendNotification(
          msgData.receiverId, 
          'New Secure Transmission', 
          `Received a message from ${senderName}`, 
          'info'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `messages/${id}`);
      }
    },

    markMessagesAsRead: async (senderId) => {
      const user = get().currentUser;
      if (!user) return;
      
      const unreadMessages = get().messages.filter(m => 
        m.receiverId === user.id && m.senderId === senderId && !m.isRead
      );

      if (unreadMessages.length === 0) return;

      try {
        const promises = unreadMessages.map(m => 
          updateDoc(doc(db, 'messages', m.id), { isRead: true })
        );
        await Promise.all(promises);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'messages/markAsRead');
      }
    },

    sendNotification: async (userId, title, message, type = 'info') => {
      const id = `notif_${Date.now()}`;
      try {
        await setDoc(doc(db, 'notifications', id), {
          id,
          userId,
          title,
          message,
          type,
          isRead: false,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
      }
    },

    markAsRead: async (id) => {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
      }
    },

    setTyping: async (targetId, isTyping) => {
      const user = get().currentUser;
      if (!user) return;
      try {
        await setDoc(doc(db, 'typing', user.id), {
          typingTo: isTyping ? targetId : null,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } catch (error) {
        // Silently fail for typing status to avoid UI flicker
        console.warn('Typing status update failed');
      }
    }
  };
});

function setupListeners(uid: string, role: Role, set: any, get: any) {
  cleanupListeners();

  // 1. Listen to OWN user document for real-time profile updates (balance, verification, etc.)
  const unsubSelf = onSnapshot(doc(db, 'users', uid), async (snapshot) => {
    if (snapshot.exists()) {
      const userData = { id: snapshot.id, ...snapshot.data() } as User;
      const lowerSelfEmail = userData.email?.toLowerCase();
      if (lowerSelfEmail === 'edutrackbangladesh@gmail.com' || lowerSelfEmail === 'm13hmahadi.personal@gmail.com') {
        if (userData.role !== 'admin' || !userData.isVerified) {
          const updatedData = { ...userData, role: 'admin' as Role, isVerified: true };
          set({ currentUser: updatedData });
          try {
            await updateDoc(doc(db, 'users', uid), { role: 'admin', isVerified: true });
          } catch (e) {
            console.error("Error upgrading main admin role in Firestore:", e);
          }
          return;
        }
      }
      set({ currentUser: userData });
    } else {
      // User document was deleted (e.g. removed by admin)
      set({ currentUser: null });
      auth.signOut();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  });
  activeUnsubscribes.push(unsubSelf);

  // 2. Listen to other users based on the role to speed up loading and reduce bandwidth/PII exposure
  let usersQuery;
  if (role === 'student') {
    // Students only need to discover tutors and admins
    usersQuery = query(collection(db, 'users'), where('role', 'in', ['tutor', 'admin']));
  } else if (role === 'tutor') {
    // Tutors only need to see students and admins (for sessions/messaging/billing)
    usersQuery = query(collection(db, 'users'), where('role', 'in', ['student', 'admin']));
  } else {
    // Admins manage everyone
    usersQuery = collection(db, 'users');
  }

  const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
    let users = snapshot.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() } as User;
      if (data.role === 'admin') {
        return { ...data, name: 'ADMIN ACCOUNT', profileImage: '/admin_profile.png' };
      }
      return data;
    });
    if (role !== 'admin') {
      users = users.filter(user => !user.isBlocked);
    }
    set({ users });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'users');
  });
  activeUnsubscribes.push(unsubUsers);

  // Listen to relevant payments
  let paymentsQuery = query(collection(db, 'payments'));
  if (role === 'student') {
    paymentsQuery = query(collection(db, 'payments'), where('studentId', '==', uid));
  } else if (role === 'tutor') {
    paymentsQuery = query(collection(db, 'payments'), where('tutorId', '==', uid));
  }
  
  const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    set({ payments });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'payments');
  });
  activeUnsubscribes.push(unsubPayments);

  // Listen to sessions
  let sessionsQuery = query(collection(db, 'sessions'));
  if (role === 'student') {
    sessionsQuery = query(collection(db, 'sessions'), where('studentId', '==', uid));
  } else if (role === 'tutor') {
    sessionsQuery = query(collection(db, 'sessions'), where('tutorId', '==', uid));
  }
  const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
    set({ sessions });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'sessions');
  });
  activeUnsubscribes.push(unsubSessions);

  // Listen to withdrawals
  if (role === 'tutor' || role === 'admin') {
    let withdrawalsQuery = query(collection(db, 'withdrawals'));
    if (role === 'tutor') {
      withdrawalsQuery = query(collection(db, 'withdrawals'), where('tutorId', '==', uid));
    }
    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      set({ withdrawals });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });
    activeUnsubscribes.push(unsubWithdrawals);
  }

  // Listen to messages where user is sender or receiver
  const messagesQuery = query(collection(db, 'messages'), where('participants', 'array-contains', uid));
  
  const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    set({ messages });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'messages');
  });
  activeUnsubscribes.push(unsubMessages);

  // Listen to notifications
  const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', uid));
  const unsubNotifs = onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    set({ notifications });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  });
  activeUnsubscribes.push(unsubNotifs);

  // Listen to class verifications
  let classLogsQuery;
  if (role === 'student') {
    classLogsQuery = query(collection(db, 'class_logs'), where('studentId', '==', uid));
  } else if (role === 'tutor') {
    classLogsQuery = query(collection(db, 'class_logs'), where('tutorId', '==', uid));
  } else {
    classLogsQuery = query(collection(db, 'class_logs'));
  }
  const unsubClassLogs = onSnapshot(classLogsQuery, (snapshot) => {
    const classLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassLog));
    set({ classLogs });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'class_logs');
  });
  activeUnsubscribes.push(unsubClassLogs);

  // Listen to typing indicators
  const unsubTyping = onSnapshot(collection(db, 'typing'), (snapshot) => {
    const typingStatus: { [userId: string]: string | null } = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      typingStatus[doc.id] = data.typingTo;
    });
    set({ typingStatus });
  });
  activeUnsubscribes.push(unsubTyping);
}
