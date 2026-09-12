import { Router } from "express";
import { buildAuthUrl, disconnectGoogle, exchangeCode, googleConfigured, googleStatus } from "../lib/googleCalendar.js";

export const googleRouter = Router();

// Where to send the browser back to after the OAuth dance. In production the
// client is served from the same origin as the API, so a relative redirect
// is correct; in dev the Vite client runs on its own port, hence CLIENT_URL.
const CLIENT_URL = process.env.CLIENT_URL || "";

googleRouter.get("/status", async (_req, res) => {
  if (!googleConfigured()) return res.json({ connected: false, configured: false, email: null });
  const status = await googleStatus();
  res.json({ ...status, configured: true });
});

googleRouter.get("/auth-url", (_req, res) => {
  if (!googleConfigured()) {
    return res.status(400).json({ error: "Google Calendar isn't configured on this server yet." });
  }
  res.json({ url: buildAuthUrl() });
});

googleRouter.get("/callback", async (req, res) => {
  const { code, error } = req.query as { code?: string; error?: string };
  if (error || !code) {
    return res.redirect(`${CLIENT_URL}/?google=error`);
  }
  try {
    await exchangeCode(code);
    res.redirect(`${CLIENT_URL}/?google=connected`);
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    res.redirect(`${CLIENT_URL}/?google=error`);
  }
});

googleRouter.post("/disconnect", async (_req, res) => {
  await disconnectGoogle();
  res.status(204).end();
});
