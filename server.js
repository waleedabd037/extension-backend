// server.js - simple demo backend (in-memory) with CORS enabled
import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // allow all origins (ok for quick testing; tighten in prod)
app.use(express.json());

const PORT = process.env.PORT || 3000;

// time windows (adjust as needed)
const TRIAL_MS = 2 * 60 * 1000; // 2 minutes for testing
const LICENSE_MS = 60 * 60 * 1000; // 1 hour license (example)

const users = {}; // in-memory: { userId: { trialStart, licenseActivatedAt, licenseKey } }

function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      trialStart: Date.now(),
      licenseActivatedAt: null,
      licenseKey: null
    };
  }
  return users[userId];
}

app.get("/test", (req, res) => res.send("✅ backend running"));

app.get("/status", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });

  const u = ensureUser(userId);
  const trialExpired = Date.now() - u.trialStart > TRIAL_MS;
  const licenseActive = !!u.licenseKey && (Date.now() - (u.licenseActivatedAt || 0) <= LICENSE_MS);

  res.json({
    success: true,
    trialExpired,
    license: licenseActive,
    trialStart: u.trialStart,
    licenseKey: u.licenseKey || null
  });
});

app.get("/activate", (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey) return res.status(400).json({ success: false, error: "Missing params" });

  // Accept TEST-1234 or any key for demo (customize validation in prod)
  if (licenseKey === "TEST-1234" || licenseKey.startsWith("KEY-")) {
    const u = ensureUser(userId);
    u.licenseKey = licenseKey;
    u.licenseActivatedAt = Date.now();
    return res.json({ success: true, message: "License activated" });
  }

  return res.json({ success: false, error: "Invalid license key" });
});

app.get("/quillbot.js", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send("Missing userId");

  const u = ensureUser(userId);
  const trialExpired = Date.now() - u.trialStart > TRIAL_MS;
  const licenseActive = !!u.licenseKey && (Date.now() - (u.licenseActivatedAt || 0) <= LICENSE_MS);

  if (!trialExpired || licenseActive) {
    // Proxy the ragug loader and return JS
    try {
      const nodeFetch = (await import('node-fetch')).default;
      const upstream = await nodeFetch("https://ragug.github.io/quillbot-premium-free/quillbot.js");
      const scriptText = await upstream.text();
      res.setHeader("Content-Type", "application/javascript");
      // optional: you can inject server-side instrumentation here (be careful with licensing)
      return res.send(scriptText);
    } catch (err) {
      console.error("Failed to fetch upstream loader:", err);
      res.setHeader("Content-Type", "application/javascript");
      return res.send(`console.error("Failed to load loader: ${String(err)}");`);
    }
  } else {
    res.setHeader("Content-Type", "application/javascript");
    return res.send(`console.warn("Trial expired. Activate license.");`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend started on port ${PORT}`);
});
