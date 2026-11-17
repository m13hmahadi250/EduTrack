import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

export interface FirebasePublicConfig {
  projectId: string;
  firestoreDatabaseId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
}

export interface ParsedServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

const BUNDLED_FIREBASE_DEFAULTS: FirebasePublicConfig = {
  projectId: "edutrackbd-233",
  firestoreDatabaseId: "ai-studio-e4374c71-7f99-4902-8bb2-6b72aca112de",
  apiKey: "",
  authDomain: "edutrackbd-233.firebaseapp.com",
  storageBucket: "edutrackbd-233.firebasestorage.app",
};

function readRawAppletConfigFile(): Partial<FirebasePublicConfig> | null {
  // 1. Statically traceable require relative to /api/config.ts so Vercel NFT bundles the JSON
  try {
    const req = createRequire(import.meta.url);
    const loaded = req("../firebase-applet-config.json");
    if (loaded && typeof loaded === "object") {
      return loaded as Partial<FirebasePublicConfig>;
    }
  } catch {
    // Fall through to cwd lookup
  }

  // 2. Fallback to process.cwd() lookup for local CLI / test runners
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (parsed && typeof parsed === "object") {
        return parsed as Partial<FirebasePublicConfig>;
      }
    }
  } catch {
    // Fall back to safe defaults below
  }

  return null;
}

export function getFirebasePublicConfig(): FirebasePublicConfig {
  const fileCfg = readRawAppletConfigFile();

  const envProjectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const envDatabaseId = process.env.FIREBASE_DATABASE_ID?.trim();
  const envApiKey =
    process.env.FIREBASE_WEB_API_KEY?.trim() ||
    process.env.VITE_FIREBASE_API_KEY?.trim() ||
    "";

  const projectId =
    (fileCfg?.projectId && String(fileCfg.projectId).trim()) ||
    envProjectId ||
    BUNDLED_FIREBASE_DEFAULTS.projectId;

  // Never fall back to "(default)" when our production named database is known
  const rawDbId =
    (fileCfg?.firestoreDatabaseId && String(fileCfg.firestoreDatabaseId).trim()) ||
    envDatabaseId ||
    BUNDLED_FIREBASE_DEFAULTS.firestoreDatabaseId;
  const firestoreDatabaseId =
    rawDbId && rawDbId !== "undefined" && rawDbId !== "null"
      ? rawDbId
      : BUNDLED_FIREBASE_DEFAULTS.firestoreDatabaseId;

  const apiKey =
    envApiKey ||
    (fileCfg?.apiKey && String(fileCfg.apiKey).trim()) ||
    BUNDLED_FIREBASE_DEFAULTS.apiKey;

  const authDomain =
    (fileCfg?.authDomain && String(fileCfg.authDomain).trim()) ||
    BUNDLED_FIREBASE_DEFAULTS.authDomain;

  const storageBucket =
    (fileCfg?.storageBucket && String(fileCfg.storageBucket).trim()) ||
    BUNDLED_FIREBASE_DEFAULTS.storageBucket;

  return {
    projectId,
    firestoreDatabaseId,
    apiKey,
    authDomain,
    storageBucket,
  };
}

export function inspectServiceAccountEnv(): {
  configured: boolean;
  reason: "ok" | "missing" | "invalid_format";
  account: ParsedServiceAccount | null;
} {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw || raw === "undefined" || raw === "null") {
    return { configured: false, reason: "missing", account: null };
  }

  const attempts: string[] = [raw];
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    attempts.push(raw.slice(1, -1));
  }
  if (!raw.startsWith("{")) {
    try {
      attempts.push(Buffer.from(raw, "base64").toString("utf-8"));
    } catch {
      // Ignore base64 decode failure
    }
  }

  const fallbackProjectId = getFirebasePublicConfig().projectId;

  for (const candidate of attempts) {
    try {
      let parsed: any = JSON.parse(candidate);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      if (parsed && typeof parsed === "object" && parsed.client_email && parsed.private_key) {
        const normalizedKey = String(parsed.private_key).replace(/\\n/g, "\n");
        return {
          configured: true,
          reason: "ok",
          account: {
            project_id: String(parsed.project_id || fallbackProjectId).trim(),
            private_key: normalizedKey,
            client_email: String(parsed.client_email).trim(),
            token_uri: String(parsed.token_uri || "https://oauth2.googleapis.com/token").trim(),
          },
        };
      }
    } catch {
      // Try sanitized control characters variant if env UI injected raw line breaks inside JSON string
      try {
        const sanitizedNewlines = candidate.replace(/\r?\n/g, "\\n");
        const parsed = JSON.parse(sanitizedNewlines);
        if (parsed && typeof parsed === "object" && parsed.client_email && parsed.private_key) {
          return {
            configured: true,
            reason: "ok",
            account: {
              project_id: String(parsed.project_id || fallbackProjectId).trim(),
              private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
              client_email: String(parsed.client_email).trim(),
              token_uri: String(parsed.token_uri || "https://oauth2.googleapis.com/token").trim(),
            },
          };
        }
      } catch {
        // Continue checking remaining candidates
      }
    }
  }

  return { configured: false, reason: "invalid_format", account: null };
}

export function isConfiguredEnvValue(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed.startsWith("your_") ||
    trimmed === "MY_BREVO_API_KEY"
  ) {
    return false;
  }
  return true;
}

export interface BackendReadinessSummary {
  firebaseAdminConfigured: boolean;
  firebaseAdminStatus: "ok" | "missing" | "invalid_format";
  firestoreDatabaseConfigured: boolean;
  firebaseProjectId: string;
  brevoConfigured: boolean;
  r2Configured: boolean;
  aiConfigured: boolean;
  otpHmacConfigured: boolean;
  isVercelRuntime: boolean;
}

export function validateBackendRuntimeEnv(): BackendReadinessSummary {
  const fbCfg = getFirebasePublicConfig();
  const saCheck = inspectServiceAccountEnv();
  const brevoConfigured = isConfiguredEnvValue(process.env.BREVO_API_KEY);
  const r2Configured =
    isConfiguredEnvValue(process.env.R2_ACCESS_KEY_ID) &&
    isConfiguredEnvValue(process.env.R2_SECRET_ACCESS_KEY) &&
    isConfiguredEnvValue(process.env.R2_ENDPOINT) &&
    isConfiguredEnvValue(process.env.R2_BUCKET_NAME);
  const aiConfigured =
    isConfiguredEnvValue(process.env.GROQ_API_KEY) ||
    isConfiguredEnvValue(process.env.GEMINI_API_KEY);
  const otpHmacConfigured = isConfiguredEnvValue(process.env.OTP_HMAC_SECRET);

  return {
    firebaseAdminConfigured: saCheck.configured,
    firebaseAdminStatus: saCheck.reason,
    firestoreDatabaseConfigured:
      Boolean(fbCfg.firestoreDatabaseId) && fbCfg.firestoreDatabaseId !== "(default)",
    firebaseProjectId: fbCfg.projectId,
    brevoConfigured,
    r2Configured,
    aiConfigured,
    otpHmacConfigured,
    isVercelRuntime: Boolean(process.env.VERCEL),
  };
}

// -----------------------------------------------------------------------------
// Request ID, Masked Logging & Registration/Auth Failure Spike Monitoring
// -----------------------------------------------------------------------------
export function generateRequestId(): string {
  return `req_${crypto.randomBytes(6).toString("hex")}`;
}

export function maskEmailForLog(email: string): string {
  const parts = String(email || "").split("@");
  if (parts.length !== 2) return "***";
  const local = parts[0];
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${parts[1]}`;
}

const FAILURE_SPIKE_WINDOW_MS = 5 * 60 * 1000;
const FAILURE_SPIKE_THRESHOLD = 5;

interface AuthFailureEntry {
  timestampMs: number;
  route: string;
  code: string;
  status: number;
}

const recentAuthFailures: AuthFailureEntry[] = [];

export function recordAuthFailureEvent(params: {
  route: string;
  code: string;
  status: number;
  requestId: string;
  nowMs?: number;
}) {
  const nowMs = params.nowMs ?? Date.now();
  const cutoff = nowMs - FAILURE_SPIKE_WINDOW_MS;
  while (recentAuthFailures.length > 0 && recentAuthFailures[0].timestampMs < cutoff) {
    recentAuthFailures.shift();
  }
  recentAuthFailures.push({
    timestampMs: nowMs,
    route: params.route,
    code: params.code,
    status: params.status,
  });

  if (recentAuthFailures.length >= FAILURE_SPIKE_THRESHOLD) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "AUTH_FAILURE_SPIKE_DETECTED",
        requestId: params.requestId,
        route: params.route,
        code: params.code,
        status: params.status,
        failuresLast5m: recentAuthFailures.length,
      })
    );
  }
}

export function getAuthFailureTelemetry(nowMs: number = Date.now()): {
  failuresLast5m: number;
  spikeDetected: boolean;
} {
  const cutoff = nowMs - FAILURE_SPIKE_WINDOW_MS;
  while (recentAuthFailures.length > 0 && recentAuthFailures[0].timestampMs < cutoff) {
    recentAuthFailures.shift();
  }
  return {
    failuresLast5m: recentAuthFailures.length,
    spikeDetected: recentAuthFailures.length >= FAILURE_SPIKE_THRESHOLD,
  };
}

export function resetAuthFailureTelemetryForTests(): void {
  recentAuthFailures.length = 0;
}

export function getSafeHealthStatus(requestId: string) {
  const readiness = validateBackendRuntimeEnv();
  const authTelemetry = getAuthFailureTelemetry();
  const vercelCriticalMissing =
    readiness.isVercelRuntime && !readiness.firebaseAdminConfigured;

  return {
    status: vercelCriticalMissing ? "degraded" : "ok",
    env: process.env.NODE_ENV || "development",
    cloud: readiness.isVercelRuntime,
    requestId,
    readiness: {
      firebaseAdminConfigured: readiness.firebaseAdminConfigured,
      firebaseAdminStatus: readiness.firebaseAdminStatus,
      firestoreDatabaseConfigured: readiness.firestoreDatabaseConfigured,
      brevoConfigured: readiness.brevoConfigured,
      r2Configured: readiness.r2Configured,
      aiConfigured: readiness.aiConfigured,
      otpHmacConfigured: readiness.otpHmacConfigured,
    },
    authTelemetry,
  };
}
