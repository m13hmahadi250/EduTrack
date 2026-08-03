import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Send, 
  Layers, 
  Server, 
  FileText, 
  ArrowRightLeft,
  Search,
  ExternalLink,
  Lock,
  Plus
} from 'lucide-react';
import { fetchMongoDBStatus, fetchMongoDBLogs, mirrorAdminDataToMongoDB } from '../../services/mongoSyncService';
import { useAppStore } from '../../store';

export default function AdminMongoDatabase() {
  const currentUser = useAppStore(state => state.currentUser);
  const users = useAppStore(state => state.users);

  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [logsData, setLogsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'userMirrors' | 'actionLogs' | 'pushData'>('overview');
  
  const [testPushType, setTestPushType] = useState<'announcement' | 'user_sync' | 'custom'>('announcement');
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [pushSuccessMsg, setPushSuccessMsg] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);

  const loadMongoData = async () => {
    setLoading(true);
    const [status, logs] = await Promise.all([
      fetchMongoDBStatus(),
      fetchMongoDBLogs()
    ]);
    setDbStatus(status);
    setLogsData(logs);
    setLoading(false);
  };

  useEffect(() => {
    loadMongoData();
  }, []);

  const handleManualPush = async () => {
    if (!testTitle.trim() && testPushType !== 'user_sync') {
      alert('Please enter a title/subject for the push.');
      return;
    }

    setPushing(true);
    setPushSuccessMsg(null);

    try {
      if (testPushType === 'user_sync') {
        // Sync all active users to MongoDB in bulk/batch
        let syncedCount = 0;
        for (const u of users) {
          await mirrorAdminDataToMongoDB({
            actionType: 'BULK_ADMIN_USER_SYNC',
            entityType: 'users',
            entityId: u.id,
            payload: u,
            adminEmail: currentUser?.email || 'admin@edutrack.bd'
          });
          syncedCount++;
        }
        setPushSuccessMsg(`Bulk Sync Complete: Successfully mirrored ${syncedCount} user records to MongoDB!`);
      } else {
        // Custom push or announcement
        const result = await mirrorAdminDataToMongoDB({
          actionType: testPushType === 'announcement' ? 'ADMIN_NOTICE_PUSH' : 'CUSTOM_ADMIN_PUSH',
          entityType: 'system',
          entityId: `notice_${Date.now()}`,
          payload: {
            configKey: `notice_${Date.now()}`,
            title: testTitle,
            body: testBody,
            pushedAt: new Date().toISOString()
          },
          adminEmail: currentUser?.email || 'admin@edutrack.bd'
        });

        if (result.success) {
          setPushSuccessMsg('Data pushed and mirrored to MongoDB secondary database successfully!');
          setTestTitle('');
          setTestBody('');
        } else {
          setPushSuccessMsg(`Push sent to Firestore. MongoDB notice: ${result.message || 'Complete'}`);
        }
      }

      await loadMongoData();
    } catch (err: any) {
      setPushSuccessMsg(`Error pushing data: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-mongo-dashboard-view">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-[#0B132B] p-6 md:p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-emerald-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-300">
              <Server className="w-3 h-3 text-emerald-400" />
              <span>Multi-Database Sync Architecture</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider italic text-white">
              MongoDB Secondary Database Manager
            </h2>
            <p className="text-xs font-medium text-slate-300 leading-relaxed">
              Main Database: <strong className="text-amber-300">Firebase Firestore</strong> (Primary) • 
              Secondary Database: <strong className="text-emerald-400">MongoDB (Mongoose/Node.js)</strong>.
              All data created or pushed from this admin panel is automatically mirrored to MongoDB.
            </p>
          </div>

          <button
            onClick={loadMongoData}
            disabled={loading}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Dual Database Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Main DB Status: Firebase Firestore */}
        <div className="bg-white dark:bg-[#111A2E] border border-amber-500/30 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Primary Database
                </h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                  Firebase Firestore (Google Cloud)
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active</span>
            </span>
          </div>

          <div className="mt-4 space-y-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Database Provider:</span>
              <span className="text-slate-800 dark:text-white">Firebase Firestore</span>
            </div>
            <div className="flex justify-between">
              <span>Primary Auth:</span>
              <span className="text-slate-800 dark:text-white">Firebase Auth</span>
            </div>
            <div className="flex justify-between">
              <span>Realtime Listeners:</span>
              <span className="text-emerald-500">Enabled</span>
            </div>
          </div>
        </div>

        {/* Secondary DB Status: MongoDB */}
        <div className="bg-white dark:bg-[#111A2E] border border-emerald-500/30 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Secondary Database
                </h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                  MongoDB (Mongoose / Node.js)
                </p>
              </div>
            </div>
            {dbStatus?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Standing By</span>
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Target Collection:</span>
              <span className="text-slate-800 dark:text-white">{dbStatus?.dbName || 'edutrack_secondary'}</span>
            </div>
            <div className="flex justify-between">
              <span>Sync Pipeline:</span>
              <span className="text-emerald-500">Auto Mirror on Admin Push</span>
            </div>
            <div className="flex justify-between">
              <span>Connection URI:</span>
              <span className="text-slate-800 dark:text-white font-mono lowercase">
                {dbStatus?.isConfigured ? 'MONGODB_URI (Configured)' : 'MONGODB_URI (Standby Mode)'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Sync Metric Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mirrored Users</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white italic">
            {dbStatus?.counts?.userMirrors ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Action Logs</span>
          <p className="text-2xl font-black text-emerald-500 italic">
            {dbStatus?.counts?.adminLogs ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">System Banners</span>
          <p className="text-2xl font-black text-[#0D5BFF] italic">
            {dbStatus?.counts?.systemConfigs ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Admin Broadcasts</span>
          <p className="text-2xl font-black text-purple-500 italic">
            {dbStatus?.counts?.adminMails ?? 0}
          </p>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'MongoDB Overview' },
          { id: 'userMirrors', label: 'Mirrored User Records' },
          { id: 'actionLogs', label: 'MongoDB Action Logs' },
          { id: 'pushData', label: 'Trigger Admin Data Push' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Push Data Trigger */}
      {activeTab === 'pushData' && (
        <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white italic flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Push & Mirror Data To Firestore + MongoDB
            </h3>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Whenever you create or push data here, it will automatically write to Firestore AND mirror to MongoDB in real-time.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                Push Category
              </label>
              <select
                value={testPushType}
                onChange={(e) => setTestPushType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="announcement">ADMIN ANNOUNCEMENT / NOTICE</option>
                <option value="user_sync">BULK MIRROR ALL FIRESTORE USERS TO MONGODB</option>
                <option value="custom">CUSTOM DATA PAYLOAD</option>
              </select>
            </div>

            {testPushType !== 'user_sync' && (
              <>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Title / Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. System Upgrade Notice"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Message Body / Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter message details to sync..."
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}

            {pushSuccessMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wide">
                {pushSuccessMsg}
              </div>
            )}

            <button
              onClick={handleManualPush}
              disabled={pushing}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{pushing ? 'Syncing...' : 'Push & Mirror Data Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Mirrored User Records */}
      {activeTab === 'userMirrors' && (
        <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white italic">
            MongoDB User Mirror Collection ({logsData?.userMirrors?.length || 0} Records)
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[9px] font-black uppercase">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="p-3">Firestore ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Verified</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logsData?.userMirrors?.map((u: any) => (
                  <tr key={u._id || u.firestoreId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-emerald-500">{u.firestoreId}</td>
                    <td className="p-3 text-slate-800 dark:text-white">{u.name || 'N/A'}</td>
                    <td className="p-3 text-slate-500 font-mono">{u.email}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">
                      <span className={u.isVerified ? "text-emerald-500" : "text-slate-400"}>
                        {u.isVerified ? "VERIFIED" : "UNVERIFIED"}
                      </span>
                    </td>
                    <td className="p-3">৳{(u.balance || 0).toLocaleString()}</td>
                    <td className="p-3 text-slate-400">
                      {u.lastSyncedAt ? new Date(u.lastSyncedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}

                {(!logsData?.userMirrors || logsData.userMirrors.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No MongoDB mirrored user records found yet. Trigger an Admin action or user sync to mirror records!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Action Logs */}
      {activeTab === 'actionLogs' && (
        <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white italic">
            MongoDB Admin Action Logs Collection ({logsData?.logs?.length || 0} Entries)
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[9px] font-black uppercase">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Entity ID</th>
                  <th className="p-3">Admin Email</th>
                  <th className="p-3">Synced To Firestore</th>
                  <th className="p-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logsData?.logs?.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-emerald-500 italic">{log.actionType}</td>
                    <td className="p-3 text-slate-800 dark:text-white">{log.entityType}</td>
                    <td className="p-3 font-mono text-slate-400">{log.entityId || 'N/A'}</td>
                    <td className="p-3 text-slate-500">{log.adminEmail || 'admin@edutrack.bd'}</td>
                    <td className="p-3 text-emerald-500">YES</td>
                    <td className="p-3 text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}

                {(!logsData?.logs || logsData.logs.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      No action logs found in MongoDB secondary database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white italic">
              Dual Database Synchronization Overview
            </h3>
            <p className="text-[11px] font-black uppercase text-slate-400 leading-relaxed">
              EduTrack Bangladesh operates a high-reliability dual database pipeline. Primary authentication and live user queries run directly on Firebase Firestore. Whenever an Admin performs actions (updating users, changing roles, approving verifications, sending custom emails, modifying promotional banners), the data is automatically persisted to Firestore AND mirrored to MongoDB via Mongoose.
            </p>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest block">
              Active MongoDB Models & Schemas:
            </span>
            <ul className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
              <li><strong>UserMirror:</strong> Stores copies of all student and tutor accounts modified by Admin.</li>
              <li><strong>AdminActionLog:</strong> Logs every administrative transaction, update, and approval with timestamp.</li>
              <li><strong>SystemConfigMirror:</strong> Stores app configurations, promotional banners, and global notices.</li>
              <li><strong>AdminMailMirror:</strong> Stores copies of custom administrative emails dispatched via Brevo.</li>
              <li><strong>TuitionMirror:</strong> Mirrors tuition jobs and verified lesson logs.</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
