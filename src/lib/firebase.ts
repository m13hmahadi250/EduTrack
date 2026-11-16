import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  getDocFromServer, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createResilientFirestore(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      databaseId
    );
  } catch (persistErr) {
    // Fallback for private browsing, restricted Android WebViews, or HMR re-init
    try {
      return initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          localCache: memoryLocalCache(),
        },
        databaseId
      );
    } catch {
      return getFirestore(app, databaseId);
    }
  }
}

export const db = createResilientFirestore();
export const auth = getAuth(app);

// Connectivity check as per guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silent offline or initialization check
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

