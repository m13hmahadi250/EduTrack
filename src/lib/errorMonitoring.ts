import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export type ErrorCategory =
  | 'CHUNK_LOAD_ERROR'
  | 'AUTH_ERROR'
  | 'FIRESTORE_ERROR'
  | 'NETWORK_ERROR'
  | 'REACT_RENDER_ERROR'
  | 'UNHANDLED_REJECTION'
  | 'RUNTIME_ERROR';

export interface ErrorReportOptions {
  category?: ErrorCategory;
  componentStack?: string;
  section?: string;
  route?: string;
  userId?: string | null;
  extra?: Record<string, unknown>;
}

export interface ErrorReportResult {
  incidentId: string;
  logged: boolean;
  category: ErrorCategory;
  isChunkError: boolean;
  sanitizedMessage: string;
}

export const APP_VERSION = '2026.04.19-stable.1';

const DEDUP_WINDOW_MS = 60_000;
const recentErrorFingerprints = new Map<string, { timestamp: number; incidentId: string; logged: boolean }>();

/**
 * Redacts PII, credentials, tokens, OTP codes, emails, Bangladesh phone numbers,
 * and National ID numbers from any diagnostic text or stack trace.
 */
export function sanitizeDiagnosticText(input: unknown, maxLength = 1500): string {
  if (input === null || input === undefined) return '';
  let text = typeof input === 'string' ? input : input instanceof Error ? `${input.name}: ${input.message}` : String(input);

  // Redact Bearer / JWT tokens
  text = text.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]');
  text = text.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]');

  // Redact key/secret/password/token/otp/nid query params or JSON fields
  text = text.replace(
    /((?:password|passwd|secret|token|idToken|accessToken|refreshToken|otp|code|nid|nidNumber|apiKey|authorization)\s*[:=]\s*["']?)([^"',\s}&]+)/gi,
    '$1[REDACTED]'
  );

  // Redact email addresses
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');

  // Redact Bangladesh phone numbers (+8801..., 8801..., 01[3-9]\d{8})
  text = text.replace(/(?:\+?88)?01[3-9]\d{8}\b/g, '[REDACTED_PHONE]');

  // Redact 10, 13, or 17 digit NID-like numeric sequences
  text = text.replace(/\b\d{10}\b|\b\d{13}\b|\b\d{17}\b/g, '[REDACTED_ID]');

  // Redact standalone 6-digit OTP patterns when preceded by otp/code/pin keywords
  text = text.replace(/\b(otp|verification\s*code|pin)\s*(?:is|:|=)?\s*\d{4,8}\b/gi, '$1: [REDACTED_OTP]');

  if (text.length > maxLength) {
    return `${text.slice(0, maxLength)}...[truncated]`;
  }
  return text;
}

/**
 * Sanitizes a URL by stripping sensitive query parameters and hashes.
 */
export function sanitizeUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://edutrackbd.vercel.app');
    const sensitiveParams = ['token', 'id_token', 'access_token', 'refresh_token', 'code', 'otp', 'password', 'key', 'email', 'phone', 'nid'];
    sensitiveParams.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    parsed.hash = '';
    return sanitizeDiagnosticText(parsed.toString(), 450);
  } catch {
    return sanitizeDiagnosticText(rawUrl, 450);
  }
}

/**
 * Detects whether an error is caused by a stale deployment chunk or dynamic import failure.
 */
export function isChunkOrModuleLoadError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? '');

  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('unable to preload css') ||
    normalized.includes('loading chunk') ||
    normalized.includes('loading css chunk') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes("unexpected token '<'") ||
    normalized.includes('mime type')
  );
}

/**
 * Classifies an error into a deterministic category for telemetry and recovery UI.
 */
export function classifyError(error: unknown, explicitCategory?: ErrorCategory): ErrorCategory {
  if (explicitCategory) return explicitCategory;
  if (isChunkOrModuleLoadError(error)) return 'CHUNK_LOAD_ERROR';

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? `${error.name} ${error.message} ${error.stack || ''}`
      : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('auth/') || lower.includes('id-token') || lower.includes('unauthenticated')) {
    return 'AUTH_ERROR';
  }
  if (lower.includes('firestore') || lower.includes('permission-denied') || lower.includes('failed-precondition')) {
    return 'FIRESTORE_ERROR';
  }
  if (lower.includes('networkerror') || lower.includes('failed to fetch') || lower.includes('load failed')) {
    return 'NETWORK_ERROR';
  }
  return 'RUNTIME_ERROR';
}

/**
 * Generates a short, non-sensitive Incident Reference ID for user support.
 */
export function generateIncidentId(): string {
  const timePart = Date.now().toString(36).toUpperCase().slice(-5);
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INC-${timePart}-${randPart}`;
}

/**
 * Logs a sanitized error event to Firestore `error_logs` with deduplication.
 * Never throws; returns whether logging actually succeeded so UI never makes false claims.
 */
export async function reportProductionError(
  error: unknown,
  options: ErrorReportOptions = {}
): Promise<ErrorReportResult> {
  const category = classifyError(error, options.category);
  const isChunkError = category === 'CHUNK_LOAD_ERROR';

  const rawMessage =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
      ? error
      : 'Unexpected application error';

  const sanitizedMessage = sanitizeDiagnosticText(rawMessage, 900) || 'Unexpected application error';
  const rawStack =
    (error instanceof Error && error.stack ? error.stack : '') +
    (options.componentStack ? `\nComponent Stack:${options.componentStack}` : '');
  const sanitizedStack = sanitizeDiagnosticText(rawStack, 3800);

  const currentUrl =
    typeof window !== 'undefined' ? sanitizeUrl(window.location.href) : sanitizeUrl(options.route || '');
  const route =
    options.route ||
    (typeof window !== 'undefined' ? sanitizeDiagnosticText(window.location.pathname, 200) : '/');

  // Deduplicate identical errors within a 60-second window to prevent log flooding
  const fingerprint = `${category}|${route}|${sanitizedMessage.slice(0, 180)}`;
  const now = Date.now();
  const existing = recentErrorFingerprints.get(fingerprint);
  if (existing && now - existing.timestamp < DEDUP_WINDOW_MS) {
    return {
      incidentId: existing.incidentId,
      logged: existing.logged,
      category,
      isChunkError,
      sanitizedMessage,
    };
  }

  // Prune old fingerprints
  if (recentErrorFingerprints.size > 100) {
    for (const [key, entry] of recentErrorFingerprints.entries()) {
      if (now - entry.timestamp >= DEDUP_WINDOW_MS) {
        recentErrorFingerprints.delete(key);
      }
    }
  }

  const incidentId = generateIncidentId();
  recentErrorFingerprints.set(fingerprint, { timestamp: now, incidentId, logged: false });

  try {
    const resolvedUserId = options.userId ?? auth?.currentUser?.uid ?? undefined;
    const userAgent =
      typeof navigator !== 'undefined' ? sanitizeDiagnosticText(navigator.userAgent, 280) : 'unknown';

    // Matches firestore.rules isValidErrorLog schema:
    // Required: id (string <= 128), message (string <= 1000), timestamp (string <= 64)
    // Optional: stack (<= 4000), url (<= 500), userId (<= 128), userAgent (<= 300)
    const payload: Record<string, string> = {
      id: incidentId,
      message: `[${category}]${options.section ? ` (${options.section})` : ''} ${sanitizedMessage}`.slice(0, 990),
      stack: `${sanitizedStack}\n[Version: ${APP_VERSION} | Route: ${route}]`.slice(0, 3950),
      url: (currentUrl || route || 'https://edutrackbd.vercel.app').slice(0, 490),
      timestamp: new Date(now).toISOString(),
      userAgent: userAgent.slice(0, 290),
    };

    if (resolvedUserId && typeof resolvedUserId === 'string') {
      payload.userId = resolvedUserId.slice(0, 120);
    }

    await setDoc(doc(db, 'error_logs', incidentId), payload);
    recentErrorFingerprints.set(fingerprint, { timestamp: now, incidentId, logged: true });

    return {
      incidentId,
      logged: true,
      category,
      isChunkError,
      sanitizedMessage,
    };
  } catch (loggingError) {
    console.warn('[EduTrack ErrorMonitor] Could not persist error log:', loggingError);
    return {
      incidentId,
      logged: false,
      category,
      isChunkError,
      sanitizedMessage,
    };
  }
}

export function clearErrorDeduplicationCache(): void {
  recentErrorFingerprints.clear();
}
