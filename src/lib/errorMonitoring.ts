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

export type ErrorUiContext =
  | 'login'
  | 'signup'
  | 'otp'
  | 'reset'
  | 'booking'
  | 'payment'
  | 'upload'
  | 'search'
  | 'dashboard'
  | 'general';

function extractErrorCodeAndMessage(error: unknown): { code: string; message: string } {
  if (!error) return { code: '', message: '' };
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          code: String(parsed?.code || parsed?.errorCode || '').toLowerCase(),
          message: String(parsed?.error || parsed?.message || ''),
        };
      } catch {
        // Ignore JSON parse failure
      }
    }
    return { code: '', message: trimmed };
  }
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    const rawMsg =
      typeof errObj.message === 'string'
        ? errObj.message
        : typeof errObj.error === 'string'
        ? errObj.error
        : '';
    const rawCode =
      typeof errObj.code === 'string'
        ? errObj.code
        : typeof errObj.errorCode === 'string'
        ? errObj.errorCode
        : '';
    if (rawMsg.trim().startsWith('{') && rawMsg.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(rawMsg.trim());
        return {
          code: String(rawCode || parsed?.code || parsed?.errorCode || '').toLowerCase(),
          message: String(parsed?.error || parsed?.message || ''),
        };
      } catch {
        // Ignore JSON parse failure
      }
    }
    return {
      code: rawCode.toLowerCase(),
      message: rawMsg,
    };
  }
  return { code: '', message: String(error) };
}

/**
 * Detects whether an error was caused by a network connectivity failure, timeout, or offline state.
 */
export function isNetworkConnectivityError(error: unknown): boolean {
  const { code, message } = extractErrorCodeAndMessage(error);
  const combined = `${code} ${message}`.toLowerCase();

  return (
    code === 'auth/network-request-failed' ||
    code === 'unavailable' ||
    code === 'firestore/unavailable' ||
    combined.includes('auth/network-request-failed') ||
    combined.includes('network-request-failed') ||
    combined.includes('network request failed') ||
    combined.includes('failed to fetch') ||
    combined.includes('fetch failed') ||
    combined.includes('networkerror') ||
    combined.includes('network error') ||
    combined.includes('load failed') ||
    combined.includes('client is offline') ||
    combined.includes('internet connection') ||
    combined.includes('connection problem') ||
    combined.includes('econnrefused') ||
    combined.includes('etimedout') ||
    combined.includes('enotfound') ||
    combined.includes('err_internet_disconnected') ||
    combined.includes('err_network')
  );
}

/**
 * Detects whether an authentication error specifically represents invalid login credentials.
 */
export function isInvalidCredentialError(error: unknown): boolean {
  if (isNetworkConnectivityError(error)) return false;
  const { code, message } = extractErrorCodeAndMessage(error);
  const combined = `${code} ${message}`.toLowerCase();

  return (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-login-credentials' ||
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found') ||
    combined.includes('invalid-login-credentials') ||
    combined.includes('invalid email or password') ||
    combined.includes('unable to sign in. please check your email and password')
  );
}

/**
 * Centralized user-friendly error message translator.
 * Never exposes Firebase error codes, stack traces, JSON payloads, or internal service names.
 */
export function formatUserFriendlyError(error: unknown, context: ErrorUiContext = 'general'): string {
  // 1. Always check network connectivity first
  if (isNetworkConnectivityError(error)) {
    return 'Connection problem. Please check your internet connection and try again.';
  }

  // 2. Check invalid login credentials
  if (isInvalidCredentialError(error)) {
    return 'Unable to sign in. Please check your email and password.';
  }

  const { code, message } = extractErrorCodeAndMessage(error);
  const combined = `${code} ${message}`.toLowerCase();

  // 3. Authentication & Account Errors
  if (code === 'auth/invalid-email' || combined.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (
    code === 'auth/email-already-in-use' ||
    code === 'email_exists' ||
    combined.includes('auth/email-already-in-use') ||
    combined.includes('already registered') ||
    combined.includes('already exists')
  ) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password' || combined.includes('auth/weak-password')) {
    return 'Please choose a stronger password with at least 6 characters.';
  }
  if (
    code === 'auth/too-many-requests' ||
    code === 'rate_limited' ||
    code === 'cooldown' ||
    combined.includes('auth/too-many-requests') ||
    combined.includes('too many failed') ||
    combined.includes('too many attempts')
  ) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (code === 'auth/user-disabled' || combined.includes('auth/user-disabled')) {
    return 'This account has been deactivated. Please contact support for assistance.';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    combined.includes('popup-closed-by-user')
  ) {
    return 'Sign-in window was closed before completing. Please try again.';
  }
  if (code === 'auth/popup-blocked' || combined.includes('popup-blocked')) {
    return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/requires-recent-login' || combined.includes('requires-recent-login')) {
    return 'For your security, please sign in again before making this change.';
  }

  // 4. OTP & Password Reset Errors
  if (code === 'expired_otp' || combined.includes('code has expired') || combined.includes('expired otp')) {
    return 'This verification code has expired. Please request a new code.';
  }
  if (code === 'invalid_otp' || combined.includes('incorrect verification code') || combined.includes('invalid otp')) {
    return 'The verification code you entered is incorrect. Please check and try again.';
  }
  if (code === 'not_found' && context === 'otp') {
    return 'No active verification code was found. Please request a new code.';
  }
  if (
    code === 'expired_token' ||
    code === 'invalid_token' ||
    code === 'used_token' ||
    combined.includes('reset link has expired') ||
    combined.includes('invalid or expired reset')
  ) {
    return 'This password reset link is invalid or has expired. Please request a new link.';
  }

  // 5. Permission & Database Errors
  if (
    code === 'permission-denied' ||
    code === 'firestore/permission-denied' ||
    combined.includes('missing or insufficient permissions') ||
    combined.includes('permission-denied') ||
    combined.includes('unauthorized')
  ) {
    return 'You do not have permission to perform this action. Please make sure you are signed in to the right account.';
  }
  if (
    code === 'resource-exhausted' ||
    code === 'quota-exceeded' ||
    combined.includes('quota-exceeded') ||
    combined.includes('resource-exhausted')
  ) {
    return 'The service is temporarily busy. Please wait a moment and try again.';
  }

  // 6. Upload & Storage Errors
  if (
    context === 'upload' ||
    combined.includes('r2_bucket') ||
    combined.includes('cloudflare') ||
    combined.includes('presigned') ||
    combined.includes('storage upload') ||
    combined.includes('s3client')
  ) {
    if (
      combined.includes('5mb') ||
      combined.includes('10mb') ||
      combined.includes('file size') ||
      combined.includes('too large')
    ) {
      return 'The selected file is too large. Please upload a smaller file.';
    }
    if (combined.includes('file type') || combined.includes('format') || combined.includes('allowed')) {
      return 'Unsupported file format. Please upload a JPG, PNG, WebP, or PDF file.';
    }
    return 'Unable to upload your file right now. Please check the file and try again.';
  }

  // 7. Sanitize any clean human-readable message that doesn't contain technical leaks
  const hasTechnicalLeak =
    /firebase|firestore|cloudflare|\br2\b|brevo|gemini|groq|s3client|auth\/|firestore\/|storage\/|r2_bucket|api_key|stack|typeerror|referenceerror|syntaxerror|\{"|\[object/i.test(
      message
    );

  if (message && !hasTechnicalLeak && message.length < 220) {
    return message;
  }

  // 8. Context-specific fallback messages
  switch (context) {
    case 'login':
      return 'Unable to sign in right now. Please check your details and try again.';
    case 'signup':
      return 'Unable to create your account right now. Please check your information and try again.';
    case 'otp':
      return 'Unable to verify your code right now. Please try again or request a new code.';
    case 'reset':
      return 'Unable to reset your password right now. Please request a new reset link and try again.';
    case 'booking':
      return 'Unable to complete your booking request right now. Please try again in a moment.';
    case 'payment':
      return 'Unable to process your payment update right now. Please try again shortly.';
    case 'search':
      return 'Unable to load search results right now. Please refresh and try again.';
    default:
      return 'Something went wrong while completing your request. Please try again.';
  }
}

