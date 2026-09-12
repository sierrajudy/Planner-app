import { db } from "../db.js";

// Stored as a JSON blob under one row of the existing key/value `settings`
// table — this is a single-user app, so there's no per-user table needed.
const SETTINGS_KEY = "google_auth";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3011/api/google/callback";

// Read-only: we only ever look at the calendar to plan around it, never edit it.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

interface StoredAuth {
  email: string | null;
  access_token: string;
  refresh_token: string | null;
  expiry_date: number; // epoch ms
}

export function googleConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function readAuth(): Promise<StoredAuth | null> {
  const result = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [SETTINGS_KEY] });
  const raw = result.rows[0]?.value as string | undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

async function writeAuth(auth: StoredAuth): Promise<void> {
  await db.execute({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [SETTINGS_KEY, JSON.stringify(auth)],
  });
}

async function fetchEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeCode(code: string): Promise<void> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };

  const existing = await readAuth();
  const email = await fetchEmail(data.access_token);
  await writeAuth({
    email,
    access_token: data.access_token,
    // Google only sends a refresh_token on the first consent (or when
    // prompt=consent forces re-issue, which we always request) — keep the
    // old one if a call ever comes back without it.
    refresh_token: data.refresh_token ?? existing?.refresh_token ?? null,
    expiry_date: Date.now() + data.expires_in * 1000,
  });
}

export async function googleStatus(): Promise<{ connected: boolean; email: string | null }> {
  const auth = await readAuth();
  return { connected: !!auth, email: auth?.email ?? null };
}

export async function disconnectGoogle(): Promise<void> {
  await db.execute({ sql: "DELETE FROM settings WHERE key = ?", args: [SETTINGS_KEY] });
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function getValidAccessToken(): Promise<string | null> {
  const auth = await readAuth();
  if (!auth) return null;
  if (auth.expiry_date - 60_000 > Date.now()) return auth.access_token; // still valid, 1min buffer
  if (!auth.refresh_token) return auth.access_token; // can't refresh; try anyway
  const refreshed = await refreshAccessToken(auth.refresh_token);
  await writeAuth({ ...auth, access_token: refreshed.access_token, expiry_date: Date.now() + refreshed.expires_in * 1000 });
  return refreshed.access_token;
}

export interface BusyEvent {
  /** YYYY-MM-DD, taken verbatim from Google's own (already-local) timestamp — no timezone math. */
  date: string;
  /** "HH:MM" 24h, same local-string slicing, or null for all-day events. */
  startTime: string | null;
  endTime: string | null;
  summary: string;
}

/** Fetches events on the user's primary calendar for the next `daysAhead` days.
 * Returns [] on any failure — a broken calendar connection should never block
 * the study plan, just mean it's generated without calendar awareness. */
export async function fetchUpcomingEvents(daysAhead: number): Promise<BusyEvent[]> {
  try {
    const token = await getValidAccessToken();
    if (!token) return [];

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + daysAhead * 86_400_000).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      items?: Array<{
        summary?: string;
        transparency?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };

    const events: BusyEvent[] = [];
    for (const e of data.items ?? []) {
      if (e.transparency === "transparent") continue; // marked "free" — not a real commitment
      const startRaw = e.start?.dateTime ?? e.start?.date;
      const endRaw = e.end?.dateTime ?? e.end?.date;
      if (!startRaw || !endRaw) continue;
      const isAllDay = !e.start?.dateTime;
      events.push({
        date: startRaw.slice(0, 10),
        startTime: isAllDay ? null : startRaw.slice(11, 16),
        endTime: isAllDay ? null : endRaw.slice(11, 16),
        summary: e.summary ?? "Busy",
      });
    }
    return events;
  } catch (err) {
    console.error("Failed to fetch Google Calendar events:", err);
    return [];
  }
}
