import { Router } from "express";
import { db } from "../db.js";

export const settingsRouter = Router();

async function readSettings(): Promise<Record<string, string>> {
  const result = await db.execute("SELECT key, value FROM settings");
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key as string] = row.value as string;
  }
  return settings;
}

settingsRouter.get("/", async (_req, res) => {
  res.json(await readSettings());
});

settingsRouter.patch("/", async (req, res) => {
  const body = req.body as Record<string, string>;
  const statements = Object.entries(body).map(([key, value]) => ({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, value],
  }));
  if (statements.length > 0) {
    await db.batch(statements, "write");
  }
  res.json(await readSettings());
});
