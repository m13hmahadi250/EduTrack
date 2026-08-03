import mongoose from "mongoose";

let isConnected = false;

export async function connectMongoDB(): Promise<boolean> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri || uri === "MY_MONGODB_URI" || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) {
    console.warn("[MongoDB Secondary DB] MONGODB_URI is not set or invalid scheme. Secondary database mirror is in standby mode.");
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("[MongoDB Secondary DB] Connected successfully to MongoDB!");
    return true;
  } catch (error: any) {
    console.error("[MongoDB Secondary DB] Connection error:", error.message);
    isConnected = false;
    return false;
  }
}

// -------------------------------------------------------------
// Mongoose Schemas & Models for Secondary Mirroring
// -------------------------------------------------------------

// 1. Admin Action Log
const AdminActionLogSchema = new mongoose.Schema(
  {
    actionType: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
    adminEmail: { type: String, default: "admin@edutrack.bd" },
    syncedToFirestore: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 2. User Mirror Schema (Primary user data mirrored when pushed/updated by Admin)
const UserMirrorSchema = new mongoose.Schema(
  {
    firestoreId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String },
    role: { type: String, default: "student" },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    nidStatus: { type: String },
    academicStatus: { type: String },
    gender: { type: String },
    phone: { type: String },
    district: { type: String },
    showOnHomePage: { type: Boolean, default: true },
    updatedByAdmin: { type: String, default: "system" },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 3. System Config Mirror Schema (Banners, App Links, Global Notices created/pushed by Admin)
const SystemConfigMirrorSchema = new mongoose.Schema(
  {
    configKey: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
    pushedByAdmin: { type: String, default: "admin@edutrack.bd" },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 4. Admin Custom Mail/Notification Broadcast Mirror
const AdminMailMirrorSchema = new mongoose.Schema(
  {
    toEmail: { type: String, required: true },
    toName: { type: String },
    subject: { type: String },
    messageBody: { type: String, required: true },
    roleScope: { type: String },
    districtScope: { type: String },
    pushedByAdmin: { type: String, default: "admin@edutrack.bd" },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 5. Tuition / Audit Log Mirror
const TuitionMirrorSchema = new mongoose.Schema(
  {
    firestoreId: { type: String, required: true, unique: true },
    title: { type: String },
    subject: { type: String },
    studentClass: { type: String },
    district: { type: String },
    salary: { type: Number },
    status: { type: String, default: "active" },
    pushedByAdmin: { type: String, default: "admin@edutrack.bd" },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AdminActionLog = mongoose.models.AdminActionLog || mongoose.model("AdminActionLog", AdminActionLogSchema);
export const UserMirror = mongoose.models.UserMirror || mongoose.model("UserMirror", UserMirrorSchema);
export const SystemConfigMirror = mongoose.models.SystemConfigMirror || mongoose.model("SystemConfigMirror", SystemConfigMirrorSchema);
export const AdminMailMirror = mongoose.models.AdminMailMirror || mongoose.model("AdminMailMirror", AdminMailMirrorSchema);
export const TuitionMirror = mongoose.models.TuitionMirror || mongoose.model("TuitionMirror", TuitionMirrorSchema);
