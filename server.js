import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const TRIAL_MS = 2 * 60 * 1000;   // 2 minutes
const LICENSE_MS = 2 * 60 * 1000; // 2 minutes

// ensure user exists in DB
async function ensureUser(userId) {
  let user = await prisma.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        user_id: userId,
        trial_start: BigInt(Date.now()),
      },
    });
    console.log(`🟢 [server] Trial started for user ${userId} at ${new Date(Number(user.trial_start)).toISOString()}`);
  }
  return user;
}

async function evaluateAndLog(user) {
  const now = Date.now();
  let updates = {};

  // Trial check
  const trialExpired = now - Number(user.trial_start) > TRIAL_MS;
  if (trialExpired && !user.trial_ended_logged) {
    updates.trial_ended_logged = true;
    console.log(`🔴 [server] Trial ended for user ${user.user_id} at ${new Date(now).toISOString()}`);
  }

  // License check
  let licenseActive = false;
  if (user.license && user.license_activated_at) {
    licenseActive = now - Number(user.license_activated_at) <= LICENSE_MS;
    if (!licenseActive && !user.license_ended_logged) {
      updates.license_ended_logged = true;
      console.log(`🔴 [server] License ended for user ${user.user_id} at ${new Date(now).toISOString()}`);
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { user_id: user.user_id }, data: updates });
  }

  return { trialExpired, licenseActive };
}

// endpoints
app.get("/status", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });

  const user = await ensureUser(userId);
  const { trialExpired, licenseActive } = await evaluateAndLog(user);

  res.json({
    success: true,
    trialExpired,
    license: licenseActive,
  });
});

app.get("/activate", async (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey) return res.status(400).json({ success: false, error: "Missing params" });

  const valid = licenseKey === "TEST-1234" || licenseKey.startsWith("KEY-");
  if (!valid) return res.json({ success: false, error: "Invalid license key" });

  const now = Date.now();
  const user = await ensureUser(userId);

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      license: true,
      license_activated_at: BigInt(now),
      license_ended_logged: false,
    },
  });

  console.log(`🟢 [server] License activated for user ${userId} at ${new Date(now).toISOString()} with key="${licenseKey}"`);

  res.json({ success: true, message: "License activated (valid for 2 minutes)" });
});

app.get("/test", (_, res) => res.send("✅ backend running"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server started on port ${PORT}`);
});
