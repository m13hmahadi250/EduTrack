import crypto from "crypto";
import {
  getFirebasePublicConfig,
  inspectServiceAccountEnv,
  type ParsedServiceAccount,
} from "./config.js";

type ServiceAccount = ParsedServiceAccount;

function loadFirebaseConfig() {
  return getFirebasePublicConfig();
}

function parseServiceAccount(): ServiceAccount | null {
  const check = inspectServiceAccountEnv();
  if (!check.configured && check.reason === "invalid_format") {
    console.warn("[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT_KEY is set but could not be parsed as valid service account JSON.");
  }
  return check.account;
}

export function isFirebaseAdminConfigured(): boolean {
  return inspectServiceAccountEnv().configured;
}

let cachedToken: { accessToken: string; expiresAtMs: number; clientEmail: string } | null = null;
const EXTERNAL_FETCH_TIMEOUT_MS = 12_000;

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function getGoogleAdminAccessToken(): Promise<{ accessToken: string; projectId: string; databaseId: string }> {
  const sa = parseServiceAccount();
  if (!sa) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
  }
  const fbCfg = loadFirebaseConfig();
  const projectId = sa.project_id || fbCfg.projectId;
  const databaseId = fbCfg.firestoreDatabaseId;

  const nowMs = Date.now();
  if (cachedToken && cachedToken.clientEmail === sa.client_email && cachedToken.expiresAtMs - 60_000 > nowMs) {
    return { accessToken: cachedToken.accessToken, projectId, databaseId };
  }

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
      aud: tokenUri,
      iat,
      exp,
    })
  );

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = base64UrlEncode(signer.sign(sa.private_key));
  const assertion = `${header}.${claim}.${signature}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    cachedToken = null;
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to obtain Firebase Admin OAuth token (HTTP ${res.status}): ${errText.slice(0, 200)}`);
  }

  const data: any = await res.json();
  if (!data?.access_token) {
    cachedToken = null;
    throw new Error("OAuth token response missing access_token.");
  }
  cachedToken = {
    accessToken: data.access_token,
    expiresAtMs: nowMs + (Number(data.expires_in) || 3600) * 1000,
    clientEmail: sa.client_email,
  };

  return { accessToken: cachedToken.accessToken, projectId, databaseId };
}

export interface FirebaseAdminUserInfo {
  uid: string;
  email: string;
  emailVerified: boolean;
  providers: string[];
  disabled: boolean;
}

export async function lookupFirebaseUserByEmail(email: string): Promise<FirebaseAdminUserInfo | null> {
  const { accessToken, projectId } = await getGoogleAdminAccessToken();
  const normalizedEmail = email.trim().toLowerCase();

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email: [normalizedEmail] }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Firebase accounts:lookup failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const user = Array.isArray(data?.users) ? data.users[0] : null;
  if (!user || !user.localId) {
    return null;
  }

  const providers = Array.isArray(user.providerUserInfo)
    ? user.providerUserInfo.map((p: any) => String(p.providerId || "")).filter(Boolean)
    : [];

  return {
    uid: String(user.localId),
    email: String(user.email || normalizedEmail).toLowerCase(),
    emailVerified: Boolean(user.emailVerified),
    providers,
    disabled: Boolean(user.disabled),
  };
}

export async function updateFirebaseUserPassword(uid: string, newPassword: string): Promise<void> {
  const { accessToken, projectId } = await getGoogleAdminAccessToken();

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        localId: uid,
        password: newPassword,
      }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `Firebase accounts:update failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
}

// -----------------------------------------------------------------------------
// Firestore REST Helpers for Server-Side Persistent Challenges
// -----------------------------------------------------------------------------
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((item) => item !== undefined).map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return undefined;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("stringValue" in val) return String(val.stringValue);
  if ("timestampValue" in val) return String(val.timestampValue);
  if ("arrayValue" in val) {
    const vals = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return vals.map((item: any) => fromFirestoreValue(item));
  }
  if ("mapValue" in val) {
    return decodeFirestoreFields(val.mapValue?.fields);
  }
  return undefined;
}

function decodeFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

function encodeFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = toFirestoreValue(v);
    }
  }
  return out;
}

export async function firestoreGetDoc(collection: string, docId: string): Promise<{ data: Record<string, any>; updateTime?: string } | null> {
  const { accessToken, projectId, databaseId } = await getGoogleAdminAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore GET failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json: any = await res.json();
  return {
    data: decodeFirestoreFields(json.fields),
    updateTime: json.updateTime,
  };
}

export async function firestoreSetDoc(
  collection: string,
  docId: string,
  data: Record<string, any>,
  preconditionUpdateTime?: string
): Promise<boolean> {
  const { accessToken, projectId, databaseId } = await getGoogleAdminAccessToken();
  const params = new URLSearchParams();
  if (preconditionUpdateTime) {
    params.set("currentDocument.updateTime", preconditionUpdateTime);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}${qs}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });

  if (res.status === 409 || res.status === 412) {
    // Precondition failed (concurrent modification)
    return false;
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore PATCH failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  return true;
}

export async function firestoreQueryByField(
  collection: string,
  field: string,
  value: string,
  limit = 20
): Promise<Array<{ id: string; data: Record<string, any>; updateTime?: string }>> {
  const { accessToken, projectId, databaseId } = await getGoogleAdminAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents:runQuery`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: toFirestoreValue(value),
          },
        },
        limit,
      },
    }),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore runQuery failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const rows: any[] = await res.json();
  const results: Array<{ id: string; data: Record<string, any>; updateTime?: string }> = [];
  for (const row of rows) {
    if (row.document && row.document.fields) {
      const nameParts = String(row.document.name || "").split("/");
      const id = nameParts[nameParts.length - 1] || "";
      results.push({
        id,
        data: decodeFirestoreFields(row.document.fields),
        updateTime: row.document.updateTime,
      });
    }
  }
  return results;
}

// -----------------------------------------------------------------------------
// Cryptographic Firebase Auth ID Token Verification (Google Secure Token x509)
// -----------------------------------------------------------------------------
export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

let cachedGoogleCerts: { certs: Record<string, string>; expiresAtMs: number } | null = null;

async function fetchGoogleSecureTokenCerts(forceRefresh = false): Promise<Record<string, string>> {
  const nowMs = Date.now();
  if (!forceRefresh && cachedGoogleCerts && cachedGoogleCerts.expiresAtMs > nowMs) {
    return cachedGoogleCerts.certs;
  }

  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS) }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google x509 certs (HTTP ${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cc = res.headers.get("cache-control") || "";
  const maxAgeMatch = cc.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
  cachedGoogleCerts = {
    certs,
    expiresAtMs: nowMs + maxAgeSec * 1000,
  };
  return certs;
}

function base64UrlDecode(str: string): Buffer {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const token = String(idToken || "").trim();
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed Firebase ID token");
  }

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]).toString("utf-8"));
    payload = JSON.parse(base64UrlDecode(parts[1]).toString("utf-8"));
  } catch {
    throw new Error("Invalid Firebase ID token encoding");
  }

  if (header?.alg !== "RS256" || typeof header?.kid !== "string" || !header.kid) {
    throw new Error("Unsupported Firebase ID token header");
  }

  const fbCfg = loadFirebaseConfig();
  const projectId = fbCfg.projectId;
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload?.aud !== projectId) {
    throw new Error("Firebase ID token audience mismatch");
  }
  if (payload?.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Firebase ID token issuer mismatch");
  }
  if (typeof payload?.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Firebase ID token expired");
  }
  if (typeof payload?.iat !== "number" || payload.iat > nowSec + 300) {
    throw new Error("Firebase ID token issued in the future");
  }
  const uid = String(payload?.sub || payload?.user_id || "").trim();
  if (!uid || uid.length > 128) {
    throw new Error("Firebase ID token missing valid subject");
  }

  let certs = await fetchGoogleSecureTokenCerts(false);
  let pem = certs[header.kid];
  if (!pem) {
    certs = await fetchGoogleSecureTokenCerts(true);
    pem = certs[header.kid];
  }
  if (!pem) {
    throw new Error("Signing certificate not found for Firebase ID token");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  const signatureBytes = base64UrlDecode(parts[2]);
  const valid = verifier.verify(pem, signatureBytes);
  if (!valid) {
    throw new Error("Invalid Firebase ID token signature");
  }

  return {
    uid,
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: Boolean(payload.email_verified),
  };
}

function loadFirestoreAuthHeaders(callerIdToken?: string): Promise<{
  headers: Record<string, string>;
  projectId: string;
  databaseId: string;
}> {
  return (async () => {
    const fbCfg = loadFirebaseConfig();
    if (isFirebaseAdminConfigured()) {
      const { accessToken, projectId, databaseId } = await getGoogleAdminAccessToken();
      return {
        headers: { Authorization: `Bearer ${accessToken}` },
        projectId,
        databaseId,
      };
    }
    if (!callerIdToken) {
      throw new Error("Neither FIREBASE_SERVICE_ACCOUNT_KEY nor caller Firebase ID token is available.");
    }
    const apiKey = fbCfg.apiKey || "";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${callerIdToken}`,
    };
    if (apiKey) headers["X-Goog-Api-Key"] = apiKey;
    return {
      headers,
      projectId: fbCfg.projectId,
      databaseId: fbCfg.firestoreDatabaseId,
    };
  })();
}

export async function firestoreGetDocWithToken(
  collection: string,
  docId: string,
  callerIdToken?: string
): Promise<{ data: Record<string, any>; updateTime?: string } | null> {
  const { headers, projectId, databaseId } = await loadFirestoreAuthHeaders(callerIdToken);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore GET failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json: any = await res.json();
  return {
    data: decodeFirestoreFields(json.fields),
    updateTime: json.updateTime,
  };
}

export async function firestoreGetSubdoc(
  collection: string,
  docId: string,
  subcollection: string,
  subDocId: string,
  callerIdToken?: string
): Promise<{ data: Record<string, any>; updateTime?: string } | null> {
  const { headers, projectId, databaseId } = await loadFirestoreAuthHeaders(callerIdToken);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}/${encodeURIComponent(subcollection)}/${encodeURIComponent(subDocId)}`;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore subdoc GET failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json: any = await res.json();
  return {
    data: decodeFirestoreFields(json.fields),
    updateTime: json.updateTime,
  };
}

const CONFIRMED_SESSION_STATUS_SET = new Set(["scheduled", "active", "completed"]);

export async function firestoreHasConfirmedSession(
  studentId: string,
  tutorId: string,
  callerIdToken?: string
): Promise<boolean> {
  const { headers, projectId, databaseId } = await loadFirestoreAuthHeaders(callerIdToken);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents:runQuery`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "sessions" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "studentId" },
                  op: "EQUAL",
                  value: toFirestoreValue(studentId),
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: "tutorId" },
                  op: "EQUAL",
                  value: toFirestoreValue(tutorId),
                },
              },
            ],
          },
        },
        limit: 50,
      },
    }),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore confirmed-session runQuery failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const rows: any[] = await res.json();
  return rows.some((row) => {
    if (!row?.document?.fields) return false;
    const decoded = decodeFirestoreFields(row.document.fields);
    return CONFIRMED_SESSION_STATUS_SET.has(String(decoded.status || ""));
  });
}

export async function firestoreCreateDocIfAbsentWithToken(
  collection: string,
  docId: string,
  data: Record<string, any>,
  callerIdToken?: string
): Promise<{ created: boolean; alreadyExists?: boolean; unavailable?: boolean }> {
  try {
    const { headers, projectId, databaseId } = await loadFirestoreAuthHeaders(callerIdToken);
    const params = new URLSearchParams({ "currentDocument.exists": "false" });
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}?${params.toString()}`;

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    if (res.status === 409 || res.status === 412) {
      return { created: false, alreadyExists: true };
    }
    if (res.status === 403 || res.status === 401) {
      return { created: false, unavailable: true };
    }
    if (!res.ok) {
      return { created: false, unavailable: true };
    }
    return { created: true };
  } catch {
    return { created: false, unavailable: true };
  }
}

export async function firestorePatchDocWithToken(
  collection: string,
  docId: string,
  data: Record<string, any>,
  callerIdToken?: string
): Promise<boolean> {
  try {
    const { headers, projectId, databaseId } = await loadFirestoreAuthHeaders(callerIdToken);
    const updateMaskParams = Object.keys(data)
      .filter((k) => data[k] !== undefined)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const qs = updateMaskParams ? `?${updateMaskParams}` : "";
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}${qs}`;

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    return res.ok;
  } catch {
    return false;
  }
}

