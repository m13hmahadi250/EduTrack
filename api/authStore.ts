import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import {
  isFirebaseAdminConfigured,
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreQueryByField,
} from "./firebaseAdmin.js";

export type OtpChallengeStatus =
  | "pending"
  | "verified"
  | "replaced"
  | "expired"
  | "locked"
  | "delivery_failed";

export type ResetChallengeStatus = "pending" | "used" | "replaced" | "expired";

export interface OtpChallengeRecord {
  challengeId: string;
  email: string;
  otpHash: string;
  hashVersion: "hmac-v2" | "sha256-v1";
  status: OtpChallengeStatus;
  attempts: number;
  maxAttempts: number;
  createdAtMs: number;
  expiresAtMs: number;
  resendAvailableAtMs: number;
  verifiedAtMs?: number;
  providerMessageId?: string;
}

export interface ResetChallengeRecord {
  challengeId: string;
  tokenHash: string;
  email: string;
  status: ResetChallengeStatus;
  createdAtMs: number;
  expiresAtMs: number;
  usedAtMs?: number;
}

export type OtpErrorCode =
  | "OTP_NOT_FOUND"
  | "OTP_EXPIRED"
  | "OTP_REPLACED"
  | "OTP_ALREADY_USED"
  | "OTP_MAX_ATTEMPTS"
  | "OTP_INVALID"
  | "OTP_RATE_LIMITED"
  | "STORAGE_UNAVAILABLE";

export interface VerifyOtpResult {
  ok: boolean;
  code?: OtpErrorCode;
  error?: string;
  remainingAttempts?: number;
  challengeId?: string;
}

export interface CreateOtpInput {
  challengeId: string;
  email: string;
  otpCode: string;
  createdAtMs: number;
  expiresAtMs: number;
  resendAvailableAtMs: number;
  maxAttempts: number;
}

export interface AuthChallengeStore {
  backendName: string;
  getActiveCooldownChallenge(email: string, nowMs: number): Promise<OtpChallengeRecord | null>;
  createOtpChallenge(input: CreateOtpInput): Promise<OtpChallengeRecord>;
  markOtpDeliveryFailed(challengeId: string): Promise<void>;
  updateOtpProviderMessageId(challengeId: string, messageId: string): Promise<void>;
  verifyOtpChallenge(params: {
    email: string;
    otpCode: string;
    challengeId?: string;
    nowMs: number;
  }): Promise<VerifyOtpResult>;
  createResetChallenge(params: {
    challengeId: string;
    email: string;
    rawToken: string;
    createdAtMs: number;
    expiresAtMs: number;
  }): Promise<ResetChallengeRecord>;
  getResetChallengeByToken(rawToken: string, nowMs: number): Promise<{
    record: ResetChallengeRecord | null;
    reason?: "NOT_FOUND" | "USED" | "REPLACED" | "EXPIRED";
  }>;
  consumeResetChallenge(rawToken: string, nowMs: number): Promise<{
    ok: boolean;
    record?: ResetChallengeRecord;
    reason?: "NOT_FOUND" | "USED" | "REPLACED" | "EXPIRED";
  }>;
}

export class StorageUnavailableError extends Error {
  code = "STORAGE_UNAVAILABLE";
  constructor(message = "Persistent verification storage is unavailable. Please try again later.") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getOtpHashSecret(): string {
  return (
    process.env.OTP_HMAC_SECRET ||
    process.env.VITE_FIREBASE_API_KEY ||
    "edutrack-bd-otp-challenge-hmac-key"
  );
}

export function hashOtpForChallenge(challengeId: string, email: string, otpCode: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanDigits = String(otpCode).trim().replace(/\D/g, "");
  return crypto
    .createHmac("sha256", getOtpHashSecret())
    .update(`${challengeId}:${normalizedEmail}:${cleanDigits}`)
    .digest("hex");
}

function verifyOtpHash(record: OtpChallengeRecord, email: string, candidateOtp: string): boolean {
  const cleanCandidate = String(candidateOtp).trim().replace(/\D/g, "");
  const expectedHash =
    record.hashVersion === "sha256-v1"
      ? sha256Hex(cleanCandidate)
      : hashOtpForChallenge(record.challengeId, email, cleanCandidate);

  if (
    typeof record.otpHash !== "string" ||
    record.otpHash.length !== expectedHash.length ||
    !/^[a-f0-9]{64}$/.test(record.otpHash)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(record.otpHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

function mapFailureFromRecord(record: OtpChallengeRecord, nowMs: number): VerifyOtpResult | null {
  if (record.status === "verified") {
    return {
      ok: false,
      code: "OTP_ALREADY_USED",
      error: "This verification code has already been used. Please request a new 6-digit code if needed.",
      challengeId: record.challengeId,
    };
  }
  if (record.status === "replaced") {
    return {
      ok: false,
      code: "OTP_REPLACED",
      error: "A newer verification code was requested. Please enter the latest 6-digit code sent to your email.",
      challengeId: record.challengeId,
    };
  }
  if (record.status === "delivery_failed") {
    return {
      ok: false,
      code: "OTP_NOT_FOUND",
      error: "No active 6-digit verification code found. Please click 'Resend code'.",
      challengeId: record.challengeId,
    };
  }
  if (record.status === "locked" || record.attempts >= record.maxAttempts) {
    return {
      ok: false,
      code: "OTP_MAX_ATTEMPTS",
      remainingAttempts: 0,
      error: "Maximum verification attempts exceeded. Please request a new 6-digit OTP code.",
      challengeId: record.challengeId,
    };
  }
  if (record.status === "expired" || nowMs > record.expiresAtMs) {
    return {
      ok: false,
      code: "OTP_EXPIRED",
      error: "Verification code has expired (5-minute limit). Please click 'Resend code' to receive a new 6-digit OTP.",
      challengeId: record.challengeId,
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// 1. Firestore Admin REST Persistent Store (Primary Cloud Backend)
// -----------------------------------------------------------------------------
class FirestoreAuthChallengeStore implements AuthChallengeStore {
  backendName = "firestore";

  async getActiveCooldownChallenge(email: string, nowMs: number): Promise<OtpChallengeRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const docs = await firestoreQueryByField("otp_challenges", "email", normalizedEmail, 25);
    const active = docs
      .map((d) => d.data as unknown as OtpChallengeRecord)
      .filter((r) => r.status === "pending" && r.expiresAtMs > nowMs && r.resendAvailableAtMs > nowMs)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
    return active[0] || null;
  }

  async createOtpChallenge(input: CreateOtpInput): Promise<OtpChallengeRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingDocs = await firestoreQueryByField("otp_challenges", "email", normalizedEmail, 25);
    for (const d of existingDocs) {
      if (d.data.status === "pending") {
        await firestoreSetDoc(
          "otp_challenges",
          d.id,
          { ...d.data, status: "replaced" },
          d.updateTime
        );
      }
    }

    const record: OtpChallengeRecord = {
      challengeId: input.challengeId,
      email: normalizedEmail,
      otpHash: hashOtpForChallenge(input.challengeId, normalizedEmail, input.otpCode),
      hashVersion: "hmac-v2",
      status: "pending",
      attempts: 0,
      maxAttempts: input.maxAttempts,
      createdAtMs: input.createdAtMs,
      expiresAtMs: input.expiresAtMs,
      resendAvailableAtMs: input.resendAvailableAtMs,
    };

    await firestoreSetDoc("otp_challenges", record.challengeId, record);
    return record;
  }

  async markOtpDeliveryFailed(challengeId: string): Promise<void> {
    const existing = await firestoreGetDoc("otp_challenges", challengeId);
    if (existing && existing.data.status === "pending") {
      await firestoreSetDoc(
        "otp_challenges",
        challengeId,
        { ...existing.data, status: "delivery_failed" },
        existing.updateTime
      );
    }
  }

  async updateOtpProviderMessageId(challengeId: string, messageId: string): Promise<void> {
    const existing = await firestoreGetDoc("otp_challenges", challengeId);
    if (existing) {
      await firestoreSetDoc(
        "otp_challenges",
        challengeId,
        { ...existing.data, providerMessageId: messageId },
        existing.updateTime
      );
    }
  }

  async verifyOtpChallenge({
    email,
    otpCode,
    challengeId,
    nowMs,
  }: {
    email: string;
    otpCode: string;
    challengeId?: string;
    nowMs: number;
  }): Promise<VerifyOtpResult> {
    const normalizedEmail = email.trim().toLowerCase();

    for (let retry = 0; retry < 3; retry++) {
      let target: { id: string; data: OtpChallengeRecord; updateTime?: string } | null = null;
      if (challengeId) {
        const doc = await firestoreGetDoc("otp_challenges", challengeId);
        if (doc && doc.data.email === normalizedEmail) {
          target = { id: challengeId, data: doc.data as unknown as OtpChallengeRecord, updateTime: doc.updateTime };
        }
      } else {
        const docs = await firestoreQueryByField("otp_challenges", "email", normalizedEmail, 25);
        const candidates = docs
          .map((d) => ({ id: d.id, data: d.data as unknown as OtpChallengeRecord, updateTime: d.updateTime }))
          .filter((d) => d.data.status !== "delivery_failed")
          .sort((a, b) => b.data.createdAtMs - a.data.createdAtMs);
        target = candidates[0] || null;
      }

      if (!target) {
        return {
          ok: false,
          code: "OTP_NOT_FOUND",
          error: "No active 6-digit verification code found or OTP has expired. Please click 'Resend code'.",
        };
      }

      const record = target.data;
      const immediateFailure = mapFailureFromRecord(record, nowMs);
      if (immediateFailure) {
        if (immediateFailure.code === "OTP_EXPIRED" && record.status === "pending") {
          await firestoreSetDoc("otp_challenges", target.id, { ...record, status: "expired" }, target.updateTime);
        } else if (immediateFailure.code === "OTP_MAX_ATTEMPTS" && record.status === "pending") {
          await firestoreSetDoc("otp_challenges", target.id, { ...record, status: "locked" }, target.updateTime);
        }
        return immediateFailure;
      }

      const matched = verifyOtpHash(record, normalizedEmail, otpCode);
      if (!matched) {
        const nextAttempts = record.attempts + 1;
        const nextStatus: OtpChallengeStatus = nextAttempts >= record.maxAttempts ? "locked" : "pending";
        const saved = await firestoreSetDoc(
          "otp_challenges",
          target.id,
          { ...record, attempts: nextAttempts, status: nextStatus },
          target.updateTime
        );
        if (!saved) continue;

        if (nextAttempts >= record.maxAttempts) {
          return {
            ok: false,
            code: "OTP_MAX_ATTEMPTS",
            remainingAttempts: 0,
            challengeId: record.challengeId,
            error: "Maximum verification attempts exceeded. Please request a new 6-digit OTP code.",
          };
        }
        const remainingAttempts = record.maxAttempts - nextAttempts;
        return {
          ok: false,
          code: "OTP_INVALID",
          remainingAttempts,
          challengeId: record.challengeId,
          error: `Incorrect 6-digit verification code. Please check your inbox and try again. (${remainingAttempts} ${
            remainingAttempts === 1 ? "attempt" : "attempts"
          } remaining)`,
        };
      }

      const saved = await firestoreSetDoc(
        "otp_challenges",
        target.id,
        { ...record, status: "verified", verifiedAtMs: nowMs },
        target.updateTime
      );
      if (!saved) continue;

      return { ok: true, challengeId: record.challengeId };
    }

    return {
      ok: false,
      code: "OTP_ALREADY_USED",
      error: "Verification state changed concurrently. Please try again.",
    };
  }

  async createResetChallenge(params: {
    challengeId: string;
    email: string;
    rawToken: string;
    createdAtMs: number;
    expiresAtMs: number;
  }): Promise<ResetChallengeRecord> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const tokenHash = sha256Hex(params.rawToken);
    const existingDocs = await firestoreQueryByField("password_reset_challenges", "email", normalizedEmail, 25);
    for (const d of existingDocs) {
      if (d.data.status === "pending") {
        await firestoreSetDoc(
          "password_reset_challenges",
          d.id,
          { ...d.data, status: "replaced" },
          d.updateTime
        );
      }
    }

    const record: ResetChallengeRecord = {
      challengeId: params.challengeId,
      tokenHash,
      email: normalizedEmail,
      status: "pending",
      createdAtMs: params.createdAtMs,
      expiresAtMs: params.expiresAtMs,
    };
    await firestoreSetDoc("password_reset_challenges", tokenHash, record);
    return record;
  }

  async getResetChallengeByToken(rawToken: string, nowMs: number): Promise<{
    record: ResetChallengeRecord | null;
    reason?: "NOT_FOUND" | "USED" | "REPLACED" | "EXPIRED";
  }> {
    const tokenHash = sha256Hex(rawToken.trim());
    const doc = await firestoreGetDoc("password_reset_challenges", tokenHash);
    if (!doc) return { record: null, reason: "NOT_FOUND" };

    const record = doc.data as unknown as ResetChallengeRecord;
    if (record.status === "used") return { record, reason: "USED" };
    if (record.status === "replaced") return { record, reason: "REPLACED" };
    if (record.status === "expired" || nowMs > record.expiresAtMs) {
      if (record.status === "pending") {
        await firestoreSetDoc("password_reset_challenges", tokenHash, { ...record, status: "expired" }, doc.updateTime);
      }
      return { record: { ...record, status: "expired" }, reason: "EXPIRED" };
    }
    return { record };
  }

  async consumeResetChallenge(rawToken: string, nowMs: number): Promise<{
    ok: boolean;
    record?: ResetChallengeRecord;
    reason?: "NOT_FOUND" | "USED" | "REPLACED" | "EXPIRED";
  }> {
    const tokenHash = sha256Hex(rawToken.trim());
    for (let retry = 0; retry < 3; retry++) {
      const doc = await firestoreGetDoc("password_reset_challenges", tokenHash);
      if (!doc) return { ok: false, reason: "NOT_FOUND" };
      const record = doc.data as unknown as ResetChallengeRecord;
      if (record.status === "used") return { ok: false, record, reason: "USED" };
      if (record.status === "replaced") return { ok: false, record, reason: "REPLACED" };
      if (record.status === "expired" || nowMs > record.expiresAtMs) {
        return { ok: false, record: { ...record, status: "expired" }, reason: "EXPIRED" };
      }

      const saved = await firestoreSetDoc(
        "password_reset_challenges",
        tokenHash,
        { ...record, status: "used", usedAtMs: nowMs },
        doc.updateTime
      );
      if (saved) {
        return { ok: true, record: { ...record, status: "used", usedAtMs: nowMs } };
      }
    }
    return { ok: false, reason: "USED" };
  }
}

// -----------------------------------------------------------------------------
// 2. Local File-Backed Persistent Store (Local Dev & Automated Multi-Instance Tests Only)
// -----------------------------------------------------------------------------
const OTP_CACHE_FILE = path.join(os.tmpdir(), "edutrack_otp_cache.json");
const RESET_CACHE_FILE = path.join(os.tmpdir(), "edutrack_reset_tokens_cache.json");

export class LocalAuthChallengeStore implements AuthChallengeStore {
  backendName = "local-persistent-file";
  private otpFile: string;
  private resetFile: string;

  constructor(options?: { otpFile?: string; resetFile?: string }) {
    this.otpFile = options?.otpFile || OTP_CACHE_FILE;
    this.resetFile = options?.resetFile || RESET_CACHE_FILE;
  }

  private readOtpList(): OtpChallengeRecord[] {
    try {
      if (!fs.existsSync(this.otpFile)) return [];
      const parsed = JSON.parse(fs.readFileSync(this.otpFile, "utf-8"));
      if (!Array.isArray(parsed)) return [];
      const valid: OtpChallengeRecord[] = [];
      for (const item of parsed) {
        if (
          item &&
          typeof item.email === "string" &&
          typeof item.otpHash === "string" &&
          /^[a-f0-9]{64}$/.test(item.otpHash) &&
          !("otp" in item) &&
          typeof item.expiresAt === "number" &&
          !item.challengeId
        ) {
          // Legacy test fixture compatibility (tests/edutrack.test.ts)
          valid.push({
            challengeId: `legacy_${sha256Hex(`${item.email}:${item.createdAt || 0}`).slice(0, 16)}`,
            email: item.email.trim().toLowerCase(),
            otpHash: item.otpHash,
            hashVersion: "sha256-v1",
            status: item.used ? "verified" : "pending",
            attempts: Number(item.attempts || 0),
            maxAttempts: 5,
            createdAtMs: Number(item.createdAt || Date.now()),
            expiresAtMs: Number(item.expiresAt),
            resendAvailableAtMs: Number(item.createdAt || Date.now()) + 55_000,
          });
        } else if (
          item &&
          typeof item.challengeId === "string" &&
          typeof item.email === "string" &&
          typeof item.otpHash === "string" &&
          /^[a-f0-9]{64}$/.test(item.otpHash) &&
          !("otp" in item)
        ) {
          valid.push(item as OtpChallengeRecord);
        }
      }
      return valid;
    } catch {
      return [];
    }
  }

  private writeOtpList(list: OtpChallengeRecord[], referenceNowMs: number = Date.now()) {
    // Prune entries older than 24 hours past expiry
    const cutoff = referenceNowMs - 86_400_000;
    const pruned = list
      .filter((r) => r.expiresAtMs > cutoff)
      .map(({ ...rest }) => rest);
    fs.writeFileSync(this.otpFile, JSON.stringify(pruned, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  }

  private readResetList(): ResetChallengeRecord[] {
    try {
      if (!fs.existsSync(this.resetFile)) return [];
      const parsed = JSON.parse(fs.readFileSync(this.resetFile, "utf-8"));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.tokenHash === "string" &&
          /^[a-f0-9]{64}$/.test(item.tokenHash) &&
          !("token" in item)
      );
    } catch {
      return [];
    }
  }

  private writeResetList(list: ResetChallengeRecord[], referenceNowMs: number = Date.now()) {
    const cutoff = referenceNowMs - 86_400_000;
    const pruned = list.filter((r) => r.expiresAtMs > cutoff);
    fs.writeFileSync(this.resetFile, JSON.stringify(pruned, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  }

  async getActiveCooldownChallenge(email: string, nowMs: number): Promise<OtpChallengeRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const list = this.readOtpList();
    const active = list
      .filter(
        (r) =>
          r.email === normalizedEmail &&
          r.status === "pending" &&
          r.expiresAtMs > nowMs &&
          r.resendAvailableAtMs > nowMs
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
    return active[0] || null;
  }

  async createOtpChallenge(input: CreateOtpInput): Promise<OtpChallengeRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const list = this.readOtpList().map((r) =>
      r.email === normalizedEmail && r.status === "pending" ? { ...r, status: "replaced" as const } : r
    );

    const record: OtpChallengeRecord = {
      challengeId: input.challengeId,
      email: normalizedEmail,
      otpHash: hashOtpForChallenge(input.challengeId, normalizedEmail, input.otpCode),
      hashVersion: "hmac-v2",
      status: "pending",
      attempts: 0,
      maxAttempts: input.maxAttempts,
      createdAtMs: input.createdAtMs,
      expiresAtMs: input.expiresAtMs,
      resendAvailableAtMs: input.resendAvailableAtMs,
    };

    list.push(record);
    this.writeOtpList(list, input.createdAtMs);
    return record;
  }

  async markOtpDeliveryFailed(challengeId: string): Promise<void> {
    const list = this.readOtpList();
    let changed = false;
    let maxCreatedAt = 0;
    const updated = list.map((r) => {
      if (r.createdAtMs > maxCreatedAt) maxCreatedAt = r.createdAtMs;
      if (r.challengeId === challengeId && r.status === "pending") {
        changed = true;
        return { ...r, status: "delivery_failed" as const };
      }
      return r;
    });
    if (changed) this.writeOtpList(updated, maxCreatedAt || Date.now());
  }

  async updateOtpProviderMessageId(challengeId: string, messageId: string): Promise<void> {
    const list = this.readOtpList();
    let changed = false;
    let maxCreatedAt = 0;
    const updated = list.map((r) => {
      if (r.createdAtMs > maxCreatedAt) maxCreatedAt = r.createdAtMs;
      if (r.challengeId === challengeId) {
        changed = true;
        return { ...r, providerMessageId: messageId };
      }
      return r;
    });
    if (changed) this.writeOtpList(updated, maxCreatedAt || Date.now());
  }

  async verifyOtpChallenge({
    email,
    otpCode,
    challengeId,
    nowMs,
  }: {
    email: string;
    otpCode: string;
    challengeId?: string;
    nowMs: number;
  }): Promise<VerifyOtpResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const list = this.readOtpList();

    let targetIdx = -1;
    if (challengeId) {
      targetIdx = list.findIndex((r) => r.challengeId === challengeId && r.email === normalizedEmail);
    } else {
      let bestCreated = -1;
      for (let i = 0; i < list.length; i++) {
        if (list[i].email === normalizedEmail && list[i].status !== "delivery_failed") {
          if (list[i].createdAtMs >= bestCreated) {
            bestCreated = list[i].createdAtMs;
            targetIdx = i;
          }
        }
      }
    }

    if (targetIdx === -1) {
      return {
        ok: false,
        code: "OTP_NOT_FOUND",
        error: "No active 6-digit verification code found or OTP has expired. Please click 'Resend code'.",
      };
    }

    const record = list[targetIdx];
    const failure = mapFailureFromRecord(record, nowMs);
    if (failure) {
      if (failure.code === "OTP_EXPIRED" && record.status === "pending") {
        list[targetIdx] = { ...record, status: "expired" };
        this.writeOtpList(list, nowMs);
      } else if (failure.code === "OTP_MAX_ATTEMPTS" && record.status === "pending") {
        list[targetIdx] = { ...record, status: "locked" };
        this.writeOtpList(list, nowMs);
      }
      return failure;
    }

    if (!verifyOtpHash(record, normalizedEmail, otpCode)) {
      const nextAttempts = record.attempts + 1;
      const locked = nextAttempts >= record.maxAttempts;
      list[targetIdx] = {
        ...record,
        attempts: nextAttempts,
        status: locked ? "locked" : "pending",
      };
      this.writeOtpList(list, nowMs);

      if (locked) {
        return {
          ok: false,
          code: "OTP_MAX_ATTEMPTS",
          remainingAttempts: 0,
          challengeId: record.challengeId,
          error: "Maximum verification attempts exceeded. Please request a new 6-digit OTP code.",
        };
      }
      const remainingAttempts = record.maxAttempts - nextAttempts;
      return {
        ok: false,
        code: "OTP_INVALID",
        remainingAttempts,
        challengeId: record.challengeId,
        error: `Incorrect 6-digit verification code. Please check your inbox and try again. (${remainingAttempts} ${
          remainingAttempts === 1 ? "attempt" : "attempts"
        } remaining)`,
      };
    }

    list[targetIdx] = {
      ...record,
      status: "verified",
      verifiedAtMs: nowMs,
    };
    this.writeOtpList(list, nowMs);
    return { ok: true, challengeId: record.challengeId };
  }

  async createResetChallenge(params: {
    challengeId: string;
    email: string;
    rawToken: string;
    createdAtMs: number;
    expiresAtMs: number;
  }): Promise<ResetChallengeRecord> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const tokenHash = sha256Hex(params.rawToken);
    const list = this.readResetList().map((r) =>
      r.email === normalizedEmail && r.status === "pending"
        ? { ...r, status: "replaced" as const }
        : r
    );

    const record: ResetChallengeRecord = {
      challengeId: params.challengeId,
      tokenHash,
      email: normalizedEmail,
      status: "pending",
      createdAtMs: params.createdAtMs,
      expiresAtMs: params.expiresAtMs,
    };
    list.push(record);
    this.writeResetList(list, params.createdAtMs);
    return record;
  }

  async getResetChallengeByToken(rawToken: string, nowMs: number): Promise<{
    record: ResetChallengeRecord | null;
    reason?: "NOT_FOUND" | "USED" | "REPLACED" | "EXPIRED";
  }> {
    const tokenHash = sha256Hex(rawToken.trim());
    const list = this.readResetList();
    const idx = list.findIndex((r) => r.tokenHash === tokenHash);
    if (idx === -1) return { record: null, reason: "NOT_FOUND" };

    const record = list[idx];
    if (record.status === "used") return { record, reason: "USED" };
    if (record.status === "replaced") return { record, reason: "REPLACED" };
    if (record.status === "expired" || nowMs > record.expiresAtMs) {
      if (record.status === "pending") {
        list[idx] = { ...record, status: "expired" };
        this.writeResetList(list, nowMs);
      }
      return { record: { ...record, status: "expired" }, reason: "EXPIRED" };
    }
    return { record };
  }

  async consumeResetChallenge(rawToken: string, nowMs: number): Promise<{
    ok: boolean;
    record?: ResetChallengeRecord;
    reason?: "NOT_FOUND" | "USED" | "REPLACED" | "EXPIRED";
  }> {
    const tokenHash = sha256Hex(rawToken.trim());
    const list = this.readResetList();
    const idx = list.findIndex((r) => r.tokenHash === tokenHash);
    if (idx === -1) return { ok: false, reason: "NOT_FOUND" };

    const record = list[idx];
    if (record.status === "used") return { ok: false, record, reason: "USED" };
    if (record.status === "replaced") return { ok: false, record, reason: "REPLACED" };
    if (record.status === "expired" || nowMs > record.expiresAtMs) {
      list[idx] = { ...record, status: "expired" };
      this.writeResetList(list, nowMs);
      return { ok: false, record: { ...record, status: "expired" }, reason: "EXPIRED" };
    }

    const updated: ResetChallengeRecord = { ...record, status: "used", usedAtMs: nowMs };
    list[idx] = updated;
    this.writeResetList(list, nowMs);
    return { ok: true, record: updated };
  }
}

const firestoreStore = new FirestoreAuthChallengeStore();
const localStore = new LocalAuthChallengeStore();

export async function getAuthChallengeStore(override?: AuthChallengeStore): Promise<AuthChallengeStore> {
  if (override) return override;

  if (isFirebaseAdminConfigured()) {
    return firestoreStore;
  }

  if (process.env.VERCEL) {
    console.error(
      "[AuthStore CRITICAL] FIREBASE_SERVICE_ACCOUNT_KEY is not available on Vercel serverless runtime!"
    );
    throw new StorageUnavailableError(
      "Verification storage service is temporarily unavailable because Firebase Admin credentials are not configured."
    );
  }

  return localStore;
}
