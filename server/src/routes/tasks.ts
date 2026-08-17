import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export const tasksRouter = Router();

tasksRouter.get("/", async (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const result =
    start && end
      ? await db.execute({
          sql: "SELECT * FROM tasks WHERE date >= ? AND date <= ? ORDER BY date ASC",
          args: [start, end],
        })
      : await db.execute("SELECT * FROM tasks ORDER BY date ASC");
  res.json(result.rows);
});

tasksRouter.post("/", async (req, res) => {
  const { class_id, date, title, description, source } = req.body as {
    class_id?: string | null;
    date?: string;
    title?: string;
    description?: string;
    source?: string;
  };
  if (!date || !title || !title.trim()) {
    return res.status(400).json({ error: "date and title are required" });
  }
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO tasks (id, class_id, date, title, description, source) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, class_id || null, date, title.trim(), description || null, source || "manual"],
  });
  const row = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [id] });
  res.status(201).json(row.rows[0]);
});

tasksRouter.post("/bulk", async (req, res) => {
  const { tasks } = req.body as {
    tasks?: Array<{
      class_id?: string | null;
      date: string;
      title: string;
      description?: string;
      source?: string;
    }>;
  };
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: "tasks array is required" });
  }

  const validTasks = tasks.filter((t) => t.date && t.title);
  if (validTasks.length === 0) {
    return res.status(400).json({ error: "no valid tasks provided" });
  }

  const ids = validTasks.map(() => randomUUID());
  const statements = validTasks.map((t, i) => ({
    sql: "INSERT INTO tasks (id, class_id, date, title, description, source) VALUES (?, ?, ?, ?, ?, ?)",
    args: [ids[i], t.class_id || null, t.date, t.title.trim(), t.description || null, t.source || "syllabus"],
  }));
  await db.batch(statements, "write");

  const placeholders = ids.map(() => "?").join(",");
  const rows = await db.execute({
    sql: `SELECT * FROM tasks WHERE id IN (${placeholders})`,
    args: ids,
  });
  res.status(201).json(rows.rows);
});

tasksRouter.patch("/:id", async (req, res) => {
  const existing = await db.execute({
    sql: "SELECT * FROM tasks WHERE id = ?",
    args: [req.params.id],
  });
  if (existing.rows.length === 0) return res.status(404).json({ error: "not found" });

  const body = req.body as {
    class_id?: string | null;
    date?: string;
    title?: string;
    description?: string;
    done?: boolean;
  };

  const fields: string[] = [];
  const values: unknown[] = [];
  if ("class_id" in body) {
    fields.push("class_id = ?");
    values.push(body.class_id ?? null);
  }
  if (body.date !== undefined) {
    fields.push("date = ?");
    values.push(body.date);
  }
  if (body.title !== undefined) {
    fields.push("title = ?");
    values.push(body.title);
  }
  if (body.description !== undefined) {
    fields.push("description = ?");
    values.push(body.description);
  }
  if (body.done !== undefined) {
    fields.push("done = ?");
    values.push(body.done ? 1 : 0);
  }
  if (fields.length > 0) {
    values.push(req.params.id);
    await db.execute({ sql: `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, args: values as (string | number | null)[] });
  }
  const row = await db.execute({ sql: "SELECT * FROM tasks WHERE id = ?", args: [req.params.id] });
  res.json(row.rows[0]);
});

tasksRouter.delete("/:id", async (req, res) => {
  await db.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [req.params.id] });
  res.status(204).end();
});
