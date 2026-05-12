import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
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
  increment,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

export type Role = 'student' | 'tutor' | 'admin';

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email: string;
  balance?: number;
  
  // Shared / Filtering
  subjects?: string[]; // Subjects they teach or study
  classes?: string[]; // Classes they teach or are in
  
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
  isVerified?: boolean;
  nidStatus?: 'pending' | 'approved' | 'rejected';
  academicStatus?: 'pending' | 'approved' | 'rejected';
  nidImage?: string;
  academicCertificates?: string[];
  isTrackingOn?: boolean;
  location?: { lat: number; lng: number };
  rating?: number;
  
  // New Profile Details
  bio?: string;
  experience?: string;
  availability?: string; // e.g. "Mon-Fri, 4PM-8PM"
  hourlyRate?: number;
}

export interface Session {
  id: string;
  studentId: string;
  tutorId: string;
  subject: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  scheduledTime: string;
  duration?: number; // in minutes
  meetingLink?: string;
}

export interface Withdrawal {
  id: string;
  tutorId: string;
  amount: number;
  bKashNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
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

interface AppState {
  currentUser: User | null;
  users: User[];
  payments: Payment[];
  sessions: Session[];
  withdrawals: Withdrawal[];
  messages: Message[];
  notifications: Notification[];
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: Partial<User>, password: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  updateLocation: (id: string, lat: number, lng: number) => Promise<void>;
  toggleTracking: (id: string, isOn: boolean) => Promise<void>;
  
  // Admin actions
  verifyTutor: (id: string, type: 'nid' | 'academic', status: 'approved' | 'rejected') => Promise<void>;
  approvePayment: (id: string) => Promise<void>;
  rejectPayment: (id: string) => Promise<void>;
  approveWithdrawal: (id: string) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
  
  // Student actions
  submitPayment: (payment: Omit<Payment, 'id' | 'status' | 'date'>) => Promise<void>;
  bookSession: (session: Omit<Session, 'id' | 'status'>) => Promise<void>;
  
  // Tutor actions
  startSession: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  requestWithdrawal: (withdrawal: Omit<Withdrawal, 'id' | 'status' | 'timestamp'>) => Promise<void>;
  
  // Messages
  sendMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  
  // Notifications
  sendNotification: (userId: string, title: string, message: string, type?: Notification['type']) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  
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
  throw new Error(JSON.stringify(errInfo));
}

let activeUnsubscribes: (() => void)[] = [];

function cleanupListeners() {
  activeUnsubscribes.forEach(unsub => unsub());
  activeUnsubscribes = [];
}

export const useAppStore = create<AppState>((set, get) => {
  // Listen for Auth changes
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in, fetch profile
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
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
        set({ isLoading: false });
      }
    } else {
      cleanupListeners();
      set({ currentUser: null, users: [], payments: [], messages: [], isLoading: false });
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
    isLoading: true,

    setLoading: (loading) => set({ isLoading: loading }),

    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },

    loginAsDemo: async (role: Role) => {
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
          await get().signup({ 
            email, 
            name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            role,
            phone: '01700000000'
          }, password);
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          // If credentials fail but user might exist, try to update password or just throw clear error
          // For demo, we expect the preset password to work. 
          // If it fails with invalid-credential and it's not user-not-found, it might be an existing user with different password.
          // Let's try to signup anyway since it's a demo, but catch the email-already-in-use specifically.
          try {
            await get().signup({ 
              email, 
              name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role,
              phone: '01700000000'
            }, password);
          } catch (signupError: any) {
            if (signupError.message?.includes('auth/email-already-in-use') || signupError.code === 'auth/email-already-in-use') {
              throw new Error(`Demo account ${email} exists with a different password. Please use the standard login or contact support.`);
            }
            throw signupError;
          }
        } else {
          throw error;
        }
      }
    },

    logout: async () => {
      cleanupListeners();
      await signOut(auth);
    },

    signup: async (userData, password) => {
      // Create auth user
      const result = await createUserWithEmailAndPassword(auth, userData.email!, password);
      const uid = result.user.uid;

      // Determine role - handle the requested admin email
      let finalRole: Role = userData.role as Role;
      if (userData.email === 'admin@gmail.com') {
        finalRole = 'admin';
      }

      const newUser: User = {
        ...userData,
        id: uid,
        role: finalRole,
        balance: 0,
        isVerified: finalRole === 'admin',
        isTrackingOn: false,
        rating: 0,
      } as User;

      // Save to Firestore
      try {
        await setDoc(doc(db, 'users', uid), newUser);
        set({ currentUser: newUser });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
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
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
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

    approveWithdrawal: async (id) => {
      const withdrawal = get().withdrawals.find(w => w.id === id);
      if (!withdrawal) return;
      try {
        await updateDoc(doc(db, 'withdrawals', id), { status: 'approved' });
        await get().sendNotification(withdrawal.tutorId, 'Withdrawal Processed', `Your withdrawal of ৳${withdrawal.amount} has been approved and sent.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${id}`);
      }
    },

    rejectWithdrawal: async (id) => {
      const withdrawal = get().withdrawals.find(w => w.id === id);
      if (!withdrawal) return;
      try {
        await updateDoc(doc(db, 'withdrawals', id), { status: 'rejected' });
        await updateDoc(doc(db, 'users', withdrawal.tutorId), {
          balance: increment(withdrawal.amount)
        });
        await get().sendNotification(withdrawal.tutorId, 'Withdrawal Rejected', `Your withdrawal request of ৳${withdrawal.amount} was rejected. Funds returned to wallet.`, 'error');
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
          status: 'scheduled'
        });
        await get().sendNotification(sessionData.tutorId, 'New Booking Request', 'A student has scheduled a new session with you.', 'info');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `sessions/${id}`);
      }
    },

    startSession: async (id) => {
      try {
        await updateDoc(doc(db, 'sessions', id), { 
          status: 'active', 
          startTime: new Date().toISOString() 
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
        await updateDoc(doc(db, 'sessions', id), { 
          status: 'completed', 
          endTime: new Date().toISOString() 
        });
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

    requestWithdrawal: async (withdrawalData) => {
      const id = `with_${Date.now()}`;
      try {
        // DEDUCT from balance immediately
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
          await get().sendNotification(admin.id, 'New Withdrawal Request', `An expert requested a payout of ৳${withdrawalData.amount}`, 'warning');
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
          timestamp: new Date().toISOString()
        });
        
        // Notify Receiver
        await get().sendNotification(
          msgData.receiverId, 
          'New Secure Transmission', 
          `Received a message from ${get().currentUser?.name || 'User'}`, 
          'info'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `messages/${id}`);
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
    }
  };
});

function setupListeners(uid: string, role: Role, set: any, get: any) {
  cleanupListeners();

  // Listen to ALL users for tutor searching and admin management
  const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as User);
    const updatedCurrentUser = users.find(u => u.id === uid);
    set({ 
      users, 
      currentUser: updatedCurrentUser || get().currentUser 
    });
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
    const payments = snapshot.docs.map(doc => doc.data() as Payment);
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
    const sessions = snapshot.docs.map(doc => doc.data() as Session);
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
      const withdrawals = snapshot.docs.map(doc => doc.data() as Withdrawal);
      set({ withdrawals });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });
    activeUnsubscribes.push(unsubWithdrawals);
  }

  // Listen to messages where user is sender or receiver
  const messagesQuery = (role === 'admin')
    ? query(collection(db, 'messages'))
    : query(collection(db, 'messages'), where('participants', 'array-contains', uid));
  
  const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data() as Message);
    set({ messages });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'messages');
  });
  activeUnsubscribes.push(unsubMessages);

  // Listen to notifications
  const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', uid));
  const unsubNotifs = onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => doc.data() as Notification);
    set({ notifications });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  });
  activeUnsubscribes.push(unsubNotifs);
}
