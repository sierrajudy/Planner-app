import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export const classesRouter = Router();

const PALETTE = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#4ade80", "#34d399", "#2dd4bf", "#38bdf8",
  "#818cf8", "#a78bfa", "#e879f9", "#fb7185",
];

async function nextColor(): Promise<string> {
  const result = await db.execute("SELECT COUNT(*) as c FROM classes");
  const count = Number(result.rows[0]?.c ?? 0);
  return PALETTE[count % PALETTE.length];
}

classesRouter.get("/", async (_req, res) => {
  const result = await db.execute(
    "SELECT * FROM classes ORDER BY sort_order ASC, created_at ASC"
  );
  res.json(result.rows);
});

classesRouter.post("/", async (req, res) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const id = randomUUID();
  const maxOrderResult = await db.execute("SELECT MAX(sort_order) as m FROM classes");
  const maxOrder = maxOrderResult.rows[0]?.m as number | null;
  const chosenColor = color || (await nextColor());

  await db.execute({
    sql: "INSERT INTO classes (id, name, color, sort_order) VALUES (?, ?, ?, ?)",
    args: [id, name.trim(), chosenColor, (maxOrder ?? -1) + 1],
  });
  const row = await db.execute({ sql: "SELECT * FROM classes WHERE id = ?", args: [id] });
  res.status(201).json(row.rows[0]);
});

classesRouter.patch("/:id", async (req, res) => {
  const { name, color, sort_order } = req.body as {
    name?: string;
    color?: string;
    sort_order?: number;
  };
  const existing = await db.execute({
    sql: "SELECT * FROM classes WHERE id = ?",
    args: [req.params.id],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "not found" });

  await db.execute({
    sql: "UPDATE classes SET name = COALESCE(?, name), color = COALESCE(?, color), sort_order = COALESCE(?, sort_order) WHERE id = ?",
    args: [name ?? null, color ?? null, sort_order ?? null, req.params.id],
  });
  const row = await db.execute({
    sql: "SELECT * FROM classes WHERE id = ?",
    args: [req.params.id],
  });
  res.json(row.rows[0]);
});

classesRouter.delete("/:id", async (req, res) => {
  await db.execute({ sql: "DELETE FROM classes WHERE id = ?", args: [req.params.id] });
  res.status(204).end();
});
