import crypto from "crypto";
import fs from "fs";
import path from "path";

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return {
        projectId: raw.projectId || process.env.FIREBASE_PROJECT_ID || "edutrackbd-233",
        firestoreDatabaseId: raw.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID || "(default)",
      };
    }
  } catch (err) {
    console.warn("[FirebaseAdmin] Could not read firebase-applet-config.json:", err);
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || "edutrackbd-233",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "(default)",
  };
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw || raw === "undefined" || raw === "null") {
    return null;
  }

  const attempts: string[] = [raw];
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    attempts.push(raw.slice(1, -1));
  }
  if (!raw.trim().startsWith("{")) {
    try {
      attempts.push(Buffer.from(raw, "base64").toString("utf-8"));
    } catch {
      // ignore base64 failure
    }
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id || loadFirebaseConfig().projectId,
          private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
          client_email: parsed.client_email,
          token_uri: parsed.token_uri || "https://oauth2.googleapis.com/token",
        };
      }
    } catch {
      // try next candidate
    }
  }

  console.warn("[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT_KEY is set but could not be parsed as valid service account JSON.");
  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return parseServiceAccount() !== null;
}

let cachedToken: { accessToken: string; expiresAtMs: number; clientEmail: string } | null = null;

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
  const databaseId = fbCfg.firestoreDatabaseId || "(default)";

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
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to obtain Firebase Admin OAuth token (HTTP ${res.status}): ${errText.slice(0, 200)}`);
  }

  const data: any = await res.json();
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
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return undefined;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("stringValue" in val) return String(val.stringValue);
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
