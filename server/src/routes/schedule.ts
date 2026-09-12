import { Router } from "express";
import { db } from "../db.js";
import { recommendSchedule, scheduleAiAvailable, type ScheduleTaskInput } from "../lib/scheduleRecommend.js";

export const scheduleRouter = Router();

function localISODate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

scheduleRouter.post("/recommend", async (req, res) => {
  if (!scheduleAiAvailable()) {
    return res
      .status(400)
      .json({ error: "AI recommendations need an ANTHROPIC_API_KEY configured on the server." });
  }

  try {
    const today = localISODate(new Date());
    const [tasksResult, classesResult] = await Promise.all([
      db.execute({ sql: "SELECT * FROM tasks WHERE done = 0 ORDER BY date ASC", args: [] }),
      db.execute("SELECT * FROM classes"),
    ]);

    const classNameById = new Map<string, string>();
    for (const row of classesResult.rows) {
      classNameById.set(row.id as string, row.name as string);
    }

    const tasks: ScheduleTaskInput[] = tasksResult.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      class_name: row.class_id ? classNameById.get(row.class_id as string) ?? null : null,
      type: row.type === "exam" ? "exam" : "assignment",
      date: row.date as string,
    }));

    const plan = await recommendSchedule(tasks, today);
    res.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate a study plan";
    res.status(500).json({ error: message });
  }
});
