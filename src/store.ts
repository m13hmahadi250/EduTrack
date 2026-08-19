import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { sendWelcomeMail } from './services/mailService';
import { mirrorAdminDataToMongoDB } from './services/mongoSyncService';
import { reverseGeocodeLocation } from './utils/geocoding';

export type Role = 'student' | 'tutor' | 'admin';

export function consumePostLoginDestination(defaultPath = '/dashboard'): string {
  try {
    const dest = localStorage.getItem('auth_post_login_destination');
    if (dest) {
      localStorage.removeItem('auth_post_login_destination');
      return dest;
    }
  } catch (e) {
    console.error("Error retrieving stored auth post-login destination:", e);
  }
  return defaultPath;
}

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
  lastLocation?: { lat: number; lng: number };
  lastLocationUpdatedAt?: string;
  lastActiveAt?: string;
  createdAt?: string;
  savedTutors?: string[];
  referralCode?: string;
  referralPoints?: number;
  serviceDiscounts?: number;
  fcmToken?: string;
  whatsappNumber?: string;
  badges?: string[];
  notifyTutorIds?: string[];
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerRole: 'student' | 'tutor';
  refereeId?: string;
  refereeName: string;
  refereeEmail: string;
  refereeRole: 'student' | 'tutor';
  status: 'pending' | 'joined' | 'rewarded';
  rewardType: 'badge_points' | 'service_discount' | 'none';
  rewardValue: number;
  createdAt: string;
  rewardedAt?: string;
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
  homework?: string;
}

export interface HomeworkAssignment {
  id: string;
  tutorId: string;
  studentId: string;
  subject: string;
  title: string;
  text: string;
  pdfUrl?: string;
  dueDate?: string;
  status: 'assigned' | 'submitted' | 'completed' | 'revision';
  createdAt: string;
  submissionNotes?: string;
  submissionFileUrl?: string;
  submittedAt?: string;
  feedback?: string;
  reviewedAt?: string;
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
  homeworkAssignments: HomeworkAssignment[];
  referrals: Referral[];
  isLoading: boolean;
  isInitialized: boolean;
  isLoggingOut: boolean;
  typingStatus: { [userId: string]: string | null };
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (requestedRole?: Role, additionalUserData?: Partial<User>, destinationPath?: string) => Promise<void>;
  loginAsDemo: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: Partial<User>, password: string, referredByCode?: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateLocation: (id: string, lat: number, lng: number) => Promise<void>;
  setUserActiveStatus: (id: string, isOnline: boolean) => Promise<void>;
  toggleTracking: (id: string, isOn: boolean) => Promise<void>;
  updateAvailabilitySlots: (slots: { [key: string]: string[] }) => Promise<void>;
  
  // Class verification actions
  logClass: (studentId: string, tutorId: string, subject: string, date: string, notes?: string) => Promise<void>;
  verifyClass: (classLogId: string, status: 'verified' | 'disputed', notes?: string) => Promise<void>;
  assignHomework: (classLogId: string, homework: string) => Promise<void>;
  deleteClassLog: (classLogId: string) => Promise<void>;

  // Homework Assignments actions
  createHomeworkAssignment: (assignment: Omit<HomeworkAssignment, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  submitHomeworkCompletion: (assignmentId: string, submissionNotes: string, submissionFileUrl?: string) => Promise<void>;
  reviewHomeworkAssignment: (assignmentId: string, status: 'completed' | 'revision', feedback?: string) => Promise<void>;
  deleteHomeworkAssignment: (assignmentId: string) => Promise<void>;
  
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
  toggleNotifyTutor: (tutorId: string) => Promise<boolean>;
  
  // Typing
  setTyping: (targetId: string, isTyping: boolean) => Promise<void>;
  
  // Theme state for entire dashboard
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Promotional banner settings
  promotionalBannerText: string;
  updatePromotionalBannerText: (text: string) => Promise<void>;
  androidAppLink: string;
  updateAndroidAppLink: (link: string) => Promise<void>;

  // Referral actions
  fetchReferrals: () => Promise<void>;
  createReferralInvite: (name: string, email: string, refereeRole: 'student' | 'tutor') => Promise<void>;
  processReferralSignUp: (refereeId: string, refereeName: string, refereeEmail: string, refereeRole: 'student' | 'tutor', referrerCodeOrId: string) => Promise<void>;
  
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

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as any;
  }
  const entries = Object.entries(obj).filter(([_, value]) => value !== undefined);
  return Object.fromEntries(
    entries.map(([key, value]) => [key, cleanUndefined(value)])
  ) as any;
}

let activeUnsubscribes: (() => void)[] = [];

function cleanupListeners() {
  activeUnsubscribes.forEach(unsub => unsub());
  activeUnsubscribes = [];
}

export const useAppStore = create<AppState>((set, get) => {
  // Listen for global system configurations like promotional banner & android app link
  onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const updates: Partial<AppState> = {};
      if (data) {
        if (data.promotionalBannerText !== undefined) {
          updates.promotionalBannerText = data.promotionalBannerText;
        }
        if (data.androidAppLink !== undefined) {
          updates.androidAppLink = data.androidAppLink;
        }
        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      }
    }
  }, (error) => {
    console.warn("Non-blocking: could not fetch system config:", error);
  });

  // Handle Google Redirect login results (e.g. for iframe environments or popup-blocked fallbacks)
  getRedirectResult(auth)
    .then(async (result) => {
      if (result?.user) {
        console.log("Redirect sign-in completed successfully for:", result.user.email);
      }
    })
    .catch((error) => {
      console.error("Error processing Google redirect login result:", error);
    });

  // Listen for Auth changes
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in, fetch profile
      set({ isLoading: true });
      try {
        let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        // If doc not found immediately, retry after a short delay (in case signup/redirect is still writing to Firestore)
        if (!userDoc.exists()) {
          await new Promise((r) => setTimeout(r, 450));
          userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        }

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
          set({ currentUser: userData, isLoading: false, isInitialized: true });
          try {
            localStorage.setItem('edutrack_cached_user', JSON.stringify(userData));
          } catch (e) {}
          
          // Setup real-time listeners for data
          setupListeners(firebaseUser.uid, userData.role, set, get);
        } else {
          // Fallback / Self-Healing: Create profile for signed-in Firebase user
          const requestedRoleStr = localStorage.getItem('google_auth_requested_role') as Role | null;
          let additionalUserData: any = {};
          try {
            const storedData = localStorage.getItem('google_auth_additional_user_data');
            if (storedData) {
              additionalUserData = JSON.parse(storedData);
            }
          } catch (e) {
            console.error("Error parsing stored google additional user data:", e);
          }

          // Clean up temporary registration storage
          localStorage.removeItem('google_auth_requested_role');
          localStorage.removeItem('google_auth_additional_user_data');

          const lowerGEmail = (firebaseUser.email || '').toLowerCase();
          const isMainAdmin = lowerGEmail === 'edutrackbangladesh@gmail.com' || lowerGEmail === 'm13hmahadi.personal@gmail.com';
          const finalRole = isMainAdmin ? 'admin' : (requestedRoleStr || 'student');
          const referralCode = `EDU-${firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0].toUpperCase() : 'USER'}-${firebaseUser.uid.substring(0, 4).toUpperCase()}`;

          const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || (isMainAdmin ? 'Main Provider Admin' : (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'EduTrack User')),
            phone: firebaseUser.phoneNumber || (additionalUserData?.phone || ''),
            role: finalRole,
            balance: 0,
            isVerified: isMainAdmin || finalRole === 'student',
            isTrackingOn: false,
            rating: isMainAdmin ? 5 : 0,
            profileImage: isMainAdmin ? '/admin_profile.png' : (firebaseUser.photoURL || ''),
            showTour: true,
            createdAt: new Date().toISOString(),
            referralCode,
            referralPoints: 0,
            serviceDiscounts: 0,
            ...additionalUserData
          };

          const cleanedUser = cleanUndefined(newUser);
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), cleanedUser);
          } catch (createErr) {
            console.warn("Could not save initial user doc in onAuthStateChanged:", createErr);
          }

          set({ currentUser: cleanedUser, isLoading: false, isInitialized: true });

          if (cleanedUser.email && cleanedUser.role === 'tutor') {
            sendWelcomeMail({
              userId: cleanedUser.id,
              email: cleanedUser.email,
              name: cleanedUser.name,
              role: cleanedUser.role,
              university: cleanedUser.university,
              course: cleanedUser.course,
              district: cleanedUser.district,
            }).catch((mailErr) => console.error("Welcome mail error:", mailErr));
          }

          try {
            localStorage.setItem('edutrack_cached_user', JSON.stringify(cleanedUser));
          } catch (e) {}
          setupListeners(firebaseUser.uid, cleanedUser.role, set, get);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        set({ isLoading: false, isInitialized: true });
      }
    } else {
      cleanupListeners();
      try {
        localStorage.removeItem('edutrack_cached_user');
      } catch (e) {}
      set({ currentUser: null, users: [], payments: [], messages: [], homeworkAssignments: [], isLoading: false, isInitialized: true });
    }
  });

  const cachedUserInitial = typeof window !== 'undefined' ? (() => {
    try {
      const raw = localStorage.getItem('edutrack_cached_user');
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      return null;
    }
  })() : null;

  return {
    currentUser: cachedUserInitial,
    users: [],
    payments: [],
    sessions: [],
    withdrawals: [],
    messages: [],
    notifications: [],
    classLogs: [],
    homeworkAssignments: [],
    referrals: [],
    isLoading: false,
    isInitialized: true,
    isLoggingOut: false,
    typingStatus: {},
    theme: (typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'light' | 'dark' || 'light') : 'light'),

    promotionalBannerText: "0% COMMISSION FOR INTERNATIONAL ISLAMIC UNIVERSITY CHITTAGONG (IIUC) STUDENTS  • JOIN AS A TUTOR TODAY AND GET 0% COMMISSION FOR THE FIRST 3 MONTHS! • VERIFIED EXPERT MENTORS AVAILABLE IN OUR NEAR • ",
    androidAppLink: "https://github.com/m13hmahadi250/EduTrack-Bangladesh-APP/releases/download/edutrackbd/EduTrack.Bangladesh.apk",

    updatePromotionalBannerText: async (text: string) => {
      try {
        await setDoc(doc(db, 'system', 'config'), { promotionalBannerText: text }, { merge: true });
        // Secondary DB mirror trigger
        const adminEmail = get().currentUser?.email || 'admin@edutrack.bd';
        mirrorAdminDataToMongoDB({
          actionType: 'UPDATE_BANNER',
          entityType: 'system',
          entityId: 'promotionalBannerText',
          payload: { configKey: 'promotionalBannerText', value: text },
          adminEmail
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'system/config');
      }
    },

    updateAndroidAppLink: async (link: string) => {
      try {
        await setDoc(doc(db, 'system', 'config'), { androidAppLink: link }, { merge: true });
        // Secondary DB mirror trigger
        const adminEmail = get().currentUser?.email || 'admin@edutrack.bd';
        mirrorAdminDataToMongoDB({
          actionType: 'UPDATE_APP_LINK',
          entityType: 'system',
          entityId: 'androidAppLink',
          payload: { configKey: 'androidAppLink', value: link },
          adminEmail
        });
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

    fetchReferrals: async () => {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      try {
        let q;
        if (currentUser.role === 'admin') {
          q = query(collection(db, 'referrals'));
        } else {
          q = query(collection(db, 'referrals'), where('referrerId', '==', currentUser.id));
        }
        const snapshot = await getDocs(q);
        const referrals = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Referral));
        set({ referrals });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'referrals');
      }
    },

    createReferralInvite: async (name: string, email: string, refereeRole: 'student' | 'tutor') => {
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error("Must be logged in to invite colleagues");
      
      const referralId = `ref_invite_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const referralData: Referral = {
        id: referralId,
        referrerId: currentUser.id,
        referrerName: currentUser.name,
        referrerRole: currentUser.role as 'student' | 'tutor',
        refereeName: name,
        refereeEmail: email.trim().toLowerCase(),
        refereeRole,
        status: 'pending',
        rewardType: 'none',
        rewardValue: 0,
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'referrals', referralId), referralData);
        
        await get().sendNotification(
          currentUser.id,
          'Referral Invitation Created',
          `You've sent an invitation to ${name} (${email}). You'll get rewarded once they sign up!`,
          'success'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `referrals/${referralId}`);
      }
    },

    processReferralSignUp: async (refereeId: string, refereeName: string, refereeEmail: string, refereeRole: 'student' | 'tutor', referrerCodeOrId: string) => {
      if (!referrerCodeOrId) return;
      
      try {
        let referrerUser: User | null = null;
        
        const directDoc = await getDoc(doc(db, 'users', referrerCodeOrId));
        if (directDoc.exists()) {
          referrerUser = { id: directDoc.id, ...directDoc.data() } as User;
        } else {
          const cleanCode = referrerCodeOrId.trim();
          const usersQuery = query(collection(db, 'users'), where('referralCode', '==', cleanCode));
          const usersSnap = await getDocs(usersQuery);
          if (!usersSnap.empty) {
            referrerUser = { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() } as User;
          } else {
            const allUsersSnap = await getDocs(collection(db, 'users'));
            for (const d of allUsersSnap.docs) {
              const u = d.data() as User;
              const generatedCode = `EDU-${u.name ? u.name.split(' ')[0].toUpperCase() : 'USER'}-${d.id.substring(0, 4).toUpperCase()}`;
              if (generatedCode === cleanCode) {
                referrerUser = { id: d.id, ...u } as User;
                break;
              }
            }
          }
        }
        
        if (!referrerUser) {
          console.warn("No referrer found matching:", referrerCodeOrId);
          return;
        }
        
        if (referrerUser.id === refereeId) {
          console.warn("Self referral is not allowed");
          return;
        }

        const cleanEmail = refereeEmail.trim().toLowerCase();
        const existingInvitesQuery = query(
          collection(db, 'referrals'),
          where('referrerId', '==', referrerUser.id),
          where('refereeEmail', '==', cleanEmail)
        );
        const invitesSnap = await getDocs(existingInvitesQuery);
        
        let referralId = `ref_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        let referralData: Referral;
        
        const rewardType = referrerUser.role === 'tutor' ? 'badge_points' : 'service_discount';
        const rewardValue = referrerUser.role === 'tutor' ? 15 : 1;
        
        if (!invitesSnap.empty) {
          const inviteDoc = invitesSnap.docs[0];
          referralId = inviteDoc.id;
          const originalData = inviteDoc.data() as Referral;
          
          referralData = {
            ...originalData,
            refereeId,
            status: 'rewarded',
            rewardType,
            rewardValue,
            rewardedAt: new Date().toISOString()
          };
        } else {
          referralData = {
            id: referralId,
            referrerId: referrerUser.id,
            referrerName: referrerUser.name,
            referrerRole: referrerUser.role as 'student' | 'tutor',
            refereeId,
            refereeName,
            refereeEmail: cleanEmail,
            refereeRole,
            status: 'rewarded',
            rewardType,
            rewardValue,
            createdAt: new Date().toISOString(),
            rewardedAt: new Date().toISOString()
          };
        }
        
        await setDoc(doc(db, 'referrals', referralId), referralData);
        
        if (referrerUser.role === 'tutor') {
          const currentPoints = referrerUser.referralPoints || 0;
          await updateDoc(doc(db, 'users', referrerUser.id), {
            referralPoints: currentPoints + rewardValue
          });
        } else if (referrerUser.role === 'student') {
          const currentDiscounts = referrerUser.serviceDiscounts || 0;
          await updateDoc(doc(db, 'users', referrerUser.id), {
            serviceDiscounts: currentDiscounts + rewardValue
          });
        }
        
        const rewardMessage = referrerUser.role === 'tutor' 
          ? `Congrats! Your friend ${refereeName} joined EduTrack. You've been rewarded with ${rewardValue} Featured Tutor points!`
          : `Congrats! Your friend ${refereeName} joined EduTrack. You've earned a 10% Service Discount coupon code!`;
          
        await get().sendNotification(
          referrerUser.id,
          'Referral Reward Earned! 🎉',
          rewardMessage,
          'success'
        );
        
      } catch (error) {
        console.error("Error processing referral signup:", error);
      }
    },

    setLoading: (loading) => set({ isLoading: loading }),

    login: async (email, password) => {
      set({ isLoading: true });
      const trimmedEmail = email.trim();
      try {
        const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const firebaseUser = result.user;

        // Retrieve the user document from Firestore
        let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          // Short retry in case it's in flight
          await new Promise((r) => setTimeout(r, 400));
          userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        }

        let userData: User;
        if (userDoc.exists()) {
          userData = userDoc.data() as User;
          const lowerEmail = trimmedEmail.toLowerCase();
          if (lowerEmail === 'edutrackbangladesh@gmail.com' || lowerEmail === 'm13hmahadi.personal@gmail.com') {
            if (userData.role !== 'admin' || !userData.isVerified) {
              userData = { ...userData, role: 'admin', isVerified: true };
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin', isVerified: true });
              } catch (e) {
                console.error("Error upgrading main admin role in login:", e);
              }
            }
          }
        } else {
          // Self-heal user document if user authenticated in Firebase Auth
          const lowerEmail = trimmedEmail.toLowerCase();
          const isMainAdmin = lowerEmail === 'edutrackbangladesh@gmail.com' || lowerEmail === 'm13hmahadi.personal@gmail.com';
          const finalRole: Role = isMainAdmin ? 'admin' : 'student';
          const referralCode = `EDU-${firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0].toUpperCase() : 'USER'}-${firebaseUser.uid.substring(0, 4).toUpperCase()}`;
          
          userData = {
            id: firebaseUser.uid,
            email: lowerEmail,
            name: firebaseUser.displayName || (isMainAdmin ? 'Main Provider Admin' : lowerEmail.split('@')[0]),
            phone: firebaseUser.phoneNumber || '',
            role: finalRole,
            balance: 0,
            isVerified: isMainAdmin || finalRole === 'student',
            isTrackingOn: false,
            rating: isMainAdmin ? 5 : 0,
            profileImage: isMainAdmin ? '/admin_profile.png' : (firebaseUser.photoURL || ''),
            showTour: true,
            createdAt: new Date().toISOString(),
            referralCode,
            referralPoints: 0,
            serviceDiscounts: 0,
          };

          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), cleanUndefined(userData));
          } catch (createErr) {
            console.warn("Could not save initial user doc in login:", createErr);
          }
        }

        // Set state immediately so route guards immediately recognize the user
        set({ currentUser: userData, isLoading: false, isInitialized: true });
        try {
          localStorage.setItem('edutrack_cached_user', JSON.stringify(userData));
        } catch (e) {}

        // Setup real-time listeners for data
        setupListeners(firebaseUser.uid, userData.role, set, get);
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
              referralPoints: 0,
              serviceDiscounts: 0,
            };
            await setDoc(doc(db, 'users', uid), newUser);
            set({ currentUser: newUser, isLoading: false, isInitialized: true });
            try {
              localStorage.setItem('edutrack_cached_user', JSON.stringify(newUser));
            } catch (e) {}
            setupListeners(uid, newUser.role, set, get);
            return;
          } catch (signupErr) {
            console.error("Auto-provision of main admin failed:", signupErr);
          }
        }
        set({ isLoading: false });
        throw error;
      }
    },

    loginWithGoogle: async (requestedRole, additionalUserData, destinationPath) => {
      set({ isLoading: true });

      // Store intended post-login destination in localStorage before initiating Google auth / redirect
      const destinationToStore = destinationPath || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null) || '/dashboard';
      try {
        localStorage.setItem('auth_post_login_destination', destinationToStore);
      } catch (e) {
        console.error("Error storing auth post-login destination in localStorage:", e);
      }

      // Store registration details in localStorage to persist across redirect if fallback happens
      if (requestedRole) {
        localStorage.setItem('google_auth_requested_role', requestedRole);
      } else {
        localStorage.removeItem('google_auth_requested_role');
      }
      if (additionalUserData) {
        localStorage.setItem('google_auth_additional_user_data', JSON.stringify(additionalUserData));
      } else {
        localStorage.removeItem('google_auth_additional_user_data');
      }

      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        let firebaseUser: FirebaseUser | null = null;
        try {
          const result = await signInWithPopup(auth, provider);
          firebaseUser = result.user;
        } catch (popupErr: any) {
          console.warn("signInWithPopup failed, falling back to signInWithRedirect:", popupErr);
          const popupErrStr = String(popupErr).toLowerCase();
          const popupErrCode = (popupErr?.code || '').toLowerCase();
          
          if (
            popupErrCode === 'auth/popup-closed-by-user' || 
            popupErrStr.includes('popup-closed-by-user') ||
            popupErrStr.includes('popup closed by user')
          ) {
            set({ isLoading: false });
            throw popupErr;
          }

          // Fallback to redirect if popup is blocked
          await signInWithRedirect(auth, provider);
          return;
        }

        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          let userData: User;
          if (userDoc.exists()) {
            userData = userDoc.data() as User;
            const lowercaseEmail = firebaseUser.email?.toLowerCase();
            if (lowercaseEmail === 'edutrackbangladesh@gmail.com' || lowercaseEmail === 'm13hmahadi.personal@gmail.com') {
              if (userData.role !== 'admin' || !userData.isVerified) {
                userData = { ...userData, role: 'admin', isVerified: true };
                try {
                  await updateDoc(userDocRef, { role: 'admin', isVerified: true });
                } catch (e) {
                  console.error("Error updating admin role in Google login:", e);
                }
              }
            }
          } else {
            const lowerGEmail = firebaseUser.email?.toLowerCase();
            const isMainAdmin = lowerGEmail === 'edutrackbangladesh@gmail.com' || lowerGEmail === 'm13hmahadi.personal@gmail.com';

            // UNREGISTERED USER GUARD: If requestedRole is not provided (meaning user is trying to log in on /login) and is not main admin, reject login!
            if (!requestedRole && !isMainAdmin) {
              await signOut(auth);
              set({ currentUser: null, isLoading: false });
              try {
                localStorage.removeItem('edutrack_cached_user');
                localStorage.removeItem('google_auth_requested_role');
                localStorage.removeItem('google_auth_additional_user_data');
              } catch (e) {}
              throw new Error('No registered account found with this Google email. Please create an account first.');
            }

            const finalRole = isMainAdmin ? 'admin' : (requestedRole || 'student');
            const referralCode = `EDU-${firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0].toUpperCase() : 'USER'}-${firebaseUser.uid.substring(0, 4).toUpperCase()}`;

            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: firebaseUser.displayName || (isMainAdmin ? 'Main Provider Admin' : 'Google User'),
              phone: firebaseUser.phoneNumber || (additionalUserData?.phone || ''),
              role: finalRole,
              balance: 0,
              isVerified: isMainAdmin ? true : false,
              isTrackingOn: false,
              rating: isMainAdmin ? 5 : 0,
              profileImage: isMainAdmin ? '/admin_profile.png' : (firebaseUser.photoURL || ''),
              showTour: true,
              createdAt: new Date().toISOString(),
              referralCode,
              referralPoints: 0,
              serviceDiscounts: 0,
              ...additionalUserData
            };

            const cleanedUser = cleanUndefined(newUser);
            await setDoc(userDocRef, cleanedUser);
            userData = cleanedUser;

            if (userData.email && userData.role === 'tutor') {
              sendWelcomeMail({
                userId: userData.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                university: userData.university,
                course: userData.course,
                district: userData.district,
              }).catch((mailErr) => console.error("Welcome mail error on Google Auth:", mailErr));
            }
          }

          set({ currentUser: userData, isLoading: false });
          try {
            localStorage.setItem('edutrack_cached_user', JSON.stringify(userData));
          } catch (e) {}
          localStorage.removeItem('google_auth_requested_role');
          localStorage.removeItem('google_auth_additional_user_data');
        }
      } catch (error: any) {
        console.error("Error initiating Google sign-in:", error);
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

    signup: async (userData, password, referredByCode) => {
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

        const referralCode = `EDU-${userData.name ? userData.name.split(' ')[0].toUpperCase() : 'USER'}-${uid.substring(0, 4).toUpperCase()}`;

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
          profileImage: finalRole === 'admin' ? '/admin_profile.png' : (userData.profileImage || ''),
          referralCode,
          referralPoints: 0,
          serviceDiscounts: 0,
        } as User;

        const cleanedUser = cleanUndefined(newUser);

        // Save to Firestore
        await setDoc(doc(db, 'users', uid), cleanedUser);
        set({ currentUser: cleanedUser, isLoading: false, isInitialized: true });
        try {
          localStorage.setItem('edutrack_cached_user', JSON.stringify(cleanedUser));
        } catch (e) {}
        setupListeners(uid, cleanedUser.role, set, get);

        // Trigger Brevo Welcome & App Detailed Email (Profile link included for teachers)
        if (cleanedUser.email && cleanedUser.role === 'tutor') {
          sendWelcomeMail({
            userId: cleanedUser.id,
            email: cleanedUser.email,
            name: cleanedUser.name,
            role: cleanedUser.role,
            studentClass: cleanedUser.studentClass,
            school: cleanedUser.school,
            university: cleanedUser.university,
            course: cleanedUser.course,
            district: cleanedUser.district,
          }).catch((mailErr) => console.error("Welcome mail error on signup:", mailErr));
        }

        if (referredByCode) {
          try {
            await get().processReferralSignUp(uid, newUser.name, newUser.email, newUser.role as 'student' | 'tutor', referredByCode);
          } catch (refErr) {
            console.error("Non-blocking referral signup processing failed:", refErr);
          }
        }
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
        const cleanedData = cleanUndefined(data);
        await updateDoc(doc(db, 'users', id), cleanedData as any);
        // Update local state immediately for snappy UI
        const current = get().currentUser;
        if (current?.id === id) {
          set({ currentUser: { ...current, ...cleanedData } as User });
        }
        const usersList = get().users;
        if (usersList.some(u => u.id === id)) {
          set({
            users: usersList.map(u => u.id === id ? { ...u, ...cleanedData } as User : u)
          });
        }

        // Trigger MongoDB secondary DB mirror automatically
        const targetUser = get().users.find(u => u.id === id) || (get().currentUser?.id === id ? get().currentUser : null);
        const fullPayload = targetUser ? { ...targetUser, ...cleanedData } : { id, ...cleanedData };
        const activeAdminEmail = get().currentUser?.role === 'admin' ? get().currentUser?.email : 'admin@edutrack.bd';
        
        mirrorAdminDataToMongoDB({
          actionType: 'UPDATE_USER_RECORD',
          entityType: 'users',
          entityId: id,
          payload: fullPayload,
          adminEmail: activeAdminEmail
        });
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
        const now = new Date().toISOString();
        const location = { lat, lng };
        const updatesPayload: Record<string, any> = { 
          location,
          lastLocation: location,
          lastLocationUpdatedAt: now,
          lastActiveAt: now,
          isOnline: true
        };

        // Cache to local storage immediately for fast restoration on reload
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('edutrack_last_gps_location', JSON.stringify({ lat, lng, updatedAt: now }));
          } catch (e) {}
        }

        // Attempt non-blocking reverse geocoding to keep user area & district accurate in real-time
        try {
          const geoData = await reverseGeocodeLocation(lat, lng);
          if (geoData) {
            if (geoData.area) updatesPayload.area = geoData.area;
            if (geoData.district) updatesPayload.district = geoData.district;
          }
        } catch (e) {
          // Non-critical reverse geocoding fallback
        }

        await updateDoc(doc(db, 'users', id), updatesPayload);

        // Update local state immediately
        const current = get().currentUser;
        if (current?.id === id) {
          set({ currentUser: { ...current, ...updatesPayload } });
        }

        // Keep users list in state synchronized
        const usersList = get().users;
        set({
          users: usersList.map(u => u.id === id ? { ...u, ...updatesPayload } : u)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      }
    },

    setUserActiveStatus: async (id: string, isOnline: boolean) => {
      try {
        const now = new Date().toISOString();
        const updatesPayload: Record<string, any> = {
          isOnline,
          lastActiveAt: now
        };
        await updateDoc(doc(db, 'users', id), updatesPayload);

        const current = get().currentUser;
        if (current?.id === id) {
          set({ currentUser: { ...current, ...updatesPayload } });
        }
        const usersList = get().users;
        set({
          users: usersList.map(u => u.id === id ? { ...u, ...updatesPayload } : u)
        });
      } catch (error) {
        // Non-critical presence update error
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

    assignHomework: async (classLogId, homework) => {
      try {
        await updateDoc(doc(db, 'class_logs', classLogId), { homework });

        const log = get().classLogs.find(l => l.id === classLogId);
        if (log) {
          const tutor = get().currentUser;
          const tutorName = tutor?.name || 'Your tutor';
          await get().sendNotification(
            log.studentId,
            'New Homework Assigned',
            `${tutorName} has assigned homework for ${log.subject} on ${log.date}.`,
            'info'
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

    createHomeworkAssignment: async (assignmentData) => {
      try {
        const id = `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newAssignment: HomeworkAssignment = {
          ...assignmentData,
          id,
          status: 'assigned',
          createdAt: new Date().toISOString()
        };
        
        // Remove undefined values to prevent Firestore validation failures
        const cleanedAssignment = Object.fromEntries(
          Object.entries(newAssignment).filter(([_, value]) => value !== undefined)
        );

        await setDoc(doc(db, 'homework_assignments', id), cleanedAssignment);

        // Notify Student
        const tutor = get().currentUser;
        const tutorName = tutor?.name || 'Your tutor';
        await get().sendNotification(
          assignmentData.studentId,
          'New Homework Assignment',
          `${tutorName} has assigned you a new homework: "${assignmentData.title}".`,
          'info'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'homework_assignments');
      }
    },

    submitHomeworkCompletion: async (assignmentId, submissionNotes, submissionFileUrl) => {
      try {
        const assignment = get().homeworkAssignments.find(h => h.id === assignmentId);
        if (!assignment) throw new Error('Homework assignment not found');

        const updates: Partial<HomeworkAssignment> = {
          status: 'submitted',
          submissionNotes,
          submittedAt: new Date().toISOString()
        };
        if (submissionFileUrl !== undefined) {
          updates.submissionFileUrl = submissionFileUrl;
        }

        await updateDoc(doc(db, 'homework_assignments', assignmentId), updates);

        // Notify Tutor
        const student = get().currentUser;
        const studentName = student?.name || 'Your student';
        await get().sendNotification(
          assignment.tutorId,
          'Homework Submitted',
          `${studentName} has submitted completion report for: "${assignment.title}".`,
          'success'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `homework_assignments/${assignmentId}`);
      }
    },

    reviewHomeworkAssignment: async (assignmentId, status, feedback) => {
      try {
        const assignment = get().homeworkAssignments.find(h => h.id === assignmentId);
        if (!assignment) throw new Error('Homework assignment not found');

        const updates: Partial<HomeworkAssignment> = {
          status,
          reviewedAt: new Date().toISOString()
        };
        if (feedback !== undefined) {
          updates.feedback = feedback;
        }

        await updateDoc(doc(db, 'homework_assignments', assignmentId), updates);

        // Notify Student
        const tutor = get().currentUser;
        const tutorName = tutor?.name || 'Your tutor';
        const titleText = status === 'completed' ? 'Homework Completed' : 'Homework Needs Revision';
        const bodyText = status === 'completed'
          ? `${tutorName} marked your homework "${assignment.title}" as completed!`
          : `${tutorName} requested revision for your homework "${assignment.title}".`;

        await get().sendNotification(
          assignment.studentId,
          titleText,
          bodyText,
          status === 'completed' ? 'success' : 'warning'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `homework_assignments/${assignmentId}`);
      }
    },

    deleteHomeworkAssignment: async (assignmentId) => {
      try {
        await deleteDoc(doc(db, 'homework_assignments', assignmentId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `homework_assignments/${assignmentId}`);
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
      // Prevent creating duplicate unread notifications with identical title and message
      const existingNotifs = get().notifications || [];
      const duplicate = existingNotifs.find(n => 
        n.userId === userId && 
        !n.isRead && 
        n.title === title && 
        n.message === message
      );
      if (duplicate) return;

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

    toggleNotifyTutor: async (tutorId: string) => {
      const currentUser = get().currentUser;
      if (!currentUser) return false;

      const currentList = Array.isArray(currentUser.notifyTutorIds) ? currentUser.notifyTutorIds : [];
      const isAlreadySubscribed = currentList.includes(tutorId);
      const updatedList = isAlreadySubscribed
        ? currentList.filter(id => id !== tutorId)
        : [...currentList, tutorId];

      const tutor = get().users.find(u => u.id === tutorId);
      const tutorName = tutor?.name || 'Your Tutor';

      try {
        await updateDoc(doc(db, 'users', currentUser.id), {
          notifyTutorIds: updatedList
        });

        const updatedUser = { ...currentUser, notifyTutorIds: updatedList };
        set({ currentUser: updatedUser });
        try {
          localStorage.setItem('edutrack_cached_user', JSON.stringify(updatedUser));
        } catch (e) {}

        if (!isAlreadySubscribed) {
          await get().sendNotification(
            currentUser.id,
            '🔔 Class Alerts Activated',
            `You will receive a push notification 30 minutes before every scheduled class starts with ${tutorName}.`,
            'success'
          );
        } else {
          await get().sendNotification(
            currentUser.id,
            '🔕 Class Alerts Muted',
            `You will no longer receive 30-minute pre-class push alerts for ${tutorName}.`,
            'info'
          );
        }

        return !isAlreadySubscribed;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.id}`);
        return isAlreadySubscribed;
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

function persistOfflineData(uid: string, state: any) {
  if (!uid) return;
  try {
    const cacheData = {
      sessions: state.sessions || [],
      classLogs: state.classLogs || [],
      messages: state.messages || [],
      users: state.users || [],
      homeworkAssignments: state.homeworkAssignments || [],
      payments: state.payments || [],
      notifications: state.notifications || [],
      withdrawals: state.withdrawals || [],
      referrals: state.referrals || [],
      cachedAt: new Date().toISOString()
    };
    localStorage.setItem(`edutrack_offline_cache_${uid}`, JSON.stringify(cacheData));
  } catch (err) {
    console.warn('Failed to persist offline state cache:', err);
  }
}

function loadOfflineData(uid: string, set: any) {
  if (!uid) return;
  try {
    const raw = localStorage.getItem(`edutrack_offline_cache_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        set({
          sessions: parsed.sessions || [],
          classLogs: parsed.classLogs || [],
          messages: parsed.messages || [],
          users: parsed.users || [],
          homeworkAssignments: parsed.homeworkAssignments || [],
          payments: parsed.payments || [],
          notifications: parsed.notifications || [],
          withdrawals: parsed.withdrawals || [],
          referrals: parsed.referrals || []
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load offline state cache:', err);
  }
}

function setupListeners(uid: string, role: Role, set: any, get: any) {
  cleanupListeners();

  // Load local offline cached schedules & messages immediately so app works seamlessly offline
  loadOfflineData(uid, set);

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
      // User document not found in snapshot: check if auth is still active before clearing
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        set({ currentUser: null });
      }
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
    persistOfflineData(uid, get());
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
    persistOfflineData(uid, get());
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
    persistOfflineData(uid, get());
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
    persistOfflineData(uid, get());
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'class_logs');
  });
  activeUnsubscribes.push(unsubClassLogs);

  // Listen to homework assignments
  let homeworkQuery;
  if (role === 'student') {
    homeworkQuery = query(collection(db, 'homework_assignments'), where('studentId', '==', uid));
  } else if (role === 'tutor') {
    homeworkQuery = query(collection(db, 'homework_assignments'), where('tutorId', '==', uid));
  } else {
    homeworkQuery = query(collection(db, 'homework_assignments'));
  }
  const unsubHomework = onSnapshot(homeworkQuery, (snapshot) => {
    const homeworkAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HomeworkAssignment));
    set({ homeworkAssignments });
    persistOfflineData(uid, get());
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'homework_assignments');
  });
  activeUnsubscribes.push(unsubHomework);

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

  // Listen to referrals
  let referralsQuery;
  if (role === 'admin') {
    referralsQuery = query(collection(db, 'referrals'));
  } else {
    referralsQuery = query(collection(db, 'referrals'), where('referrerId', '==', uid));
  }
  const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
    const referrals = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Referral));
    set({ referrals });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'referrals');
  });
  activeUnsubscribes.push(unsubReferrals);
}
