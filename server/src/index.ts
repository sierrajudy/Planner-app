import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { initDb } from "./db.js";
import { classesRouter } from "./routes/classes.js";
import { tasksRouter } from "./routes/tasks.js";
import { syllabusRouter } from "./routes/syllabus.js";
import { settingsRouter } from "./routes/settings.js";
import { scheduleRouter } from "./routes/schedule.js";
import { googleRouter } from "./routes/google.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await initDb();

  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/classes", classesRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/syllabus", syllabusRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/schedule", scheduleRouter);
  app.use("/api/google", googleRouter);

  const clientDist = path.join(__dirname, "..", "..", "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  // JSON error responses for anything a route throws, so the client always gets
  // { error } it can display instead of an HTML stack-trace page.
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`${req.method} ${req.originalUrl} failed:`, err);
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : "Something went wrong";
    res.status(500).json({ error: message });
  });

  app.listen(PORT, () => {
    console.log(`Planner server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
