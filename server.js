// server.js - in-memory backend for testing with logging of trial start/end and license activation/end
import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // allow all origins for testing
app.use(express.json());

const PORT = process.env.PORT || 3000;

// durations
const TRIAL_MS = 2 * 60 * 1000;   // 2 minutes trial
const LICENSE_MS = 2 * 60 * 1000; // 2 minutes license

// in-memory store
// structure: users[userId] = {
//   trialStart: number,        // ms timestamp
//   trialEndedLogged: boolean, // true after we've logged the end
//   licenseKey: string|null,
//   licenseActivatedAt: number|null,
//   licenseEndedLogged: boolean
// }
const users = Object.create(null);

function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      trialStart: Date.now(),
      trialEndedLogged: false,
      licenseKey: null,
      licenseActivatedAt: null,
      licenseEndedLogged: false
    };
    console.log(`🟢 [server] Trial started for user ${userId} at ${new Date(users[userId].trialStart).toISOString()}`);
  }
  return users[userId];
}

// Helper to check and log expirations
function evaluateAndLog(userId) {
  const u = users[userId];
  const now = Date.now();

  // Trial
  const trialExpired = now - u.trialStart > TRIAL_MS;
  if (trialExpired && !u.trialEndedLogged) {
    u.trialEndedLogged = true;
    console.log(`🔴 [server] Trial ended for user ${userId} at ${new Date(now).toISOString()} (started at ${new Date(u.trialStart).toISOString()})`);
  }

  // License
  let licenseActive = false;
  if (u.licenseKey && u.licenseActivatedAt) {
    licenseActive = now - u.licenseActivatedAt <= LICENSE_MS;
    if (!licenseActive && !u.licenseEndedLogged) {
      u.licenseEndedLogged = true;
      console.log(`🔴 [server] License ended for user ${userId} at ${new Date(now).toISOString()} (activated at ${new Date(u.licenseActivatedAt).toISOString()})`);
    }
  }

  return { trialExpired, licenseActive };
}

// test endpoint
app.get("/test", (_, res) => res.send("✅ backend running"));

// status endpoint
app.get("/status", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });

  ensureUser(userId);
  const { trialExpired, licenseActive } = evaluateAndLog(userId);

  res.json({
    success: true,
    trialExpired,
    license: licenseActive,
    trialStart: users[userId].trialStart,
    licenseActivatedAt: users[userId].licenseActivatedAt
  });
});

// activate license
app.get("/activate", (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey) return res.status(400).json({ success: false, error: "Missing params" });

  // for demo: accept TEST-1234 or any "KEY-..." string
  const valid = licenseKey === "TEST-1234" || licenseKey.startsWith("KEY-");
  if (!valid) return res.json({ success: false, error: "Invalid license key" });

  const u = ensureUser(userId);
  const now = Date.now();
  u.licenseKey = licenseKey;
  u.licenseActivatedAt = now;
  u.licenseEndedLogged = false; // reset end-log so ending will be logged later
  console.log(`🟢 [server] License activated for user ${userId} at ${new Date(now).toISOString()} with key="${licenseKey}"`);

  res.json({
    success: true,
    message: "License activated (valid for 2 minutes)",
    activatedAt: u.licenseActivatedAt
  });
});

// optionally proxy quillbot loader (unchanged)
// returns JS if trial active or license active
app.get("/quillbot.js", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send("Missing userId");
  ensureUser(userId);
  const { trialExpired, licenseActive } = evaluateAndLog(userId);

  if (!trialExpired || licenseActive) {
    try {
      const nodeFetch = (await import('node-fetch')).default;
      const upstream = await nodeFetch("https://ragug.github.io/quillbot-premium-free/quillbot.js");
      const txt = await upstream.text();
      res.setHeader("Content-Type", "application/javascript");
      return res.send(txt);
    } catch (err) {
      console.error("[server] failed proxying loader", err);
      res.setHeader("Content-Type", "application/javascript");
      return res.send(`console.error("Failed to load upstream loader: ${String(err)}");`);
    }
  } else {
    res.setHeader("Content-Type", "application/javascript");
    return res.send(`console.warn("Trial expired. Activate license.");`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${PORT}`);
});
