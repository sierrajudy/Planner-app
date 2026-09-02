import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "planner.db")}`;
}

export const db: Client = createClient({
  url: resolveDbUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function localISODate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export async function initDb(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_class ON tasks(class_id)`);

  // Migration: add `type` column for distinguishing exams (tests/midterms/finals)
  // from regular assignments. Older databases won't have it.
  const cols = await db.execute(`PRAGMA table_info(tasks)`);
  if (!cols.rows.some((r) => r.name === "type")) {
    await db.execute(`ALTER TABLE tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'assignment'`);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const defaultSettings: Record<string, string> = {
    semester_start: localISODate(new Date()),
    semester_end: localISODate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 120)),
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      args: [key, value],
    });
  }
}
