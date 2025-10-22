// server.js — Persistent QuillBot backend using your PostgreSQL schema
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// durations
const TRIAL_MS = 2 * 60 * 1000;   // 2 minutes trial
const LICENSE_MS = 2 * 60 * 1000; // 2 minutes license

// 🟢 Ensure user exists (and start trial if first time)
async function ensureUser(userId) {
  let user = await prisma.user.findUnique({ where: { user_id: userId } });

  if (!user) {
    const now = Date.now();
    user = await prisma.user.create({
      data: {
        user_id: userId,
        trial_start: BigInt(now),
        license: false,
      },
    });
    console.log(`🟢 Trial started for user ${userId} at ${new Date(Number(user.trial_start)).toISOString()}`);
  }

  return user;
}

// 🔍 Evaluate and log trial/license status
async function evaluateAndLog(userId) {
  const user = await prisma.user.findUnique({ where: { user_id: userId } });
  if (!user) return { trialExpired: false, licenseActive: false };

  const now = Date.now();
  const trialExpired = now - Number(user.trial_start) > TRIAL_MS;

  if (trialExpired && !user.license) {
    console.log(`🔴 Trial expired for user ${userId} at ${new Date(now).toISOString()}`);
  }

  let licenseActive = false;
  if (user.license && user.license_activated_at) {
    licenseActive = now - Number(user.license_activated_at) <= LICENSE_MS;
    if (!licenseActive) {
      await prisma.user.update({
        where: { user_id: userId },
        data: { license: false },
      });
      console.log(`🔴 License expired for user ${userId} at ${new Date(now).toISOString()}`);
    }
  }

  return { trialExpired, licenseActive };
}

// 🧠 API: status
app.get("/status", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });

  const user = await ensureUser(userId);
  const { trialExpired, licenseActive } = await evaluateAndLog(userId);

  res.json({
    success: true,
    trialExpired,
    license: licenseActive,
    trialStart: Number(user.trial_start),
    licenseActivatedAt: user.license_activated_at ? Number(user.license_activated_at) : null,
  });
});

// 🧠 API: activate license
app.get("/activate", async (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey) return res.status(400).json({ success: false, error: "Missing params" });

  // accept only valid-looking license keys
  const valid = licenseKey === "TEST-1234" || licenseKey.startsWith("KEY-");
  if (!valid) return res.json({ success: false, error: "Invalid license key" });

  await ensureUser(userId);

  const now = Date.now();
  await prisma.user.update({
    where: { user_id: userId },
    data: {
      license: true,
      license_activated_at: BigInt(now),
    },
  });

  console.log(`🟢 License activated for user ${userId} at ${new Date(now).toISOString()} with key="${licenseKey}"`);

  res.json({
    success: true,
    message: "License activated (valid for 2 minutes)",
    activatedAt: now,
  });
});

// 🧠 API: test endpoint
app.get("/test", (_, res) => res.send("✅ backend running"));

// 🧠 Optional: Proxy quillbot loader
app.get("/quillbot.js", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send("Missing userId");

  await ensureUser(userId);
  const { trialExpired, licenseActive } = await evaluateAndLog(userId);

  if (!trialExpired || licenseActive) {
    try {
      const nodeFetch = (await import("node-fetch")).default;
      const upstream = await nodeFetch("https://ragug.github.io/quillbot-premium-free/quillbot.js");
      const txt = await upstream.text();
      res.setHeader("Content-Type", "application/javascript");
      return res.send(txt);
    } catch (err) {
      console.error("[server] Failed to load upstream script:", err);
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
