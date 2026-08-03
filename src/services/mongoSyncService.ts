/**
 * MongoDB Secondary Database Sync Service
 * Mirrors data pushed/updated by Admin to MongoDB alongside primary Firestore storage.
 */

export interface MirrorParams {
  actionType: string;
  entityType: 'users' | 'system' | 'mail' | 'tuition' | 'payments' | 'withdrawals';
  entityId?: string;
  payload: any;
  adminEmail?: string;
}

export async function mirrorAdminDataToMongoDB(params: MirrorParams) {
  try {
    const response = await fetch('/api/admin/mongo/mirror', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error) {
    console.warn('[MongoDB Secondary Mirror Service] Backend API offline or unreachable:', error);
    return { success: false, error };
  }
}

export async function fetchMongoDBStatus() {
  try {
    const res = await fetch('/api/admin/mongo/status');
    return await res.json();
  } catch (err) {
    return { connected: false, isConfigured: false, counts: { userMirrors: 0, adminLogs: 0 } };
  }
}

export async function fetchMongoDBLogs() {
  try {
    const res = await fetch('/api/admin/mongo/logs');
    return await res.json();
  } catch (err) {
    return { connected: false, logs: [], userMirrors: [], systemConfigs: [], adminMails: [] };
  }
}
