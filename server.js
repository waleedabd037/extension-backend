import express from "express";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// ✅ Use Render’s port (important for Render)
const PORT = process.env.PORT || 3000;

// Test route (helps check if Render works)
app.get("/test", (req, res) => {
  res.send("✅ Render server is working!");
});

// 2 minutes trial (for testing)
const TRIAL_MS = 2 * 60 * 1000;
// 2 minutes license duration (for testing)
const LICENSE_MS = 2 * 60 * 1000;

// ✅ Middleware: find or create user
async function getUser(userId) {
  let user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) {
    const trialStart = Date.now();
    user = await prisma.user.create({
      data: {
        user_id: userId,
        trial_start: BigInt(trialStart),
        license: false,
      },
    });
    console.log(`🟢 New user created: ${userId}`);
    console.log(`🟡 Trial started at: ${new Date(trialStart).toLocaleTimeString()}`);
  }

  return user;
}

// ✅ Helper: check license validity (and reset DB if expired)
async function checkAndUpdateLicense(userId) {
  let user = await getUser(userId);

  if (user.license && user.license_activated_at) {
    const expired = Date.now() - Number(user.license_activated_at) > LICENSE_MS;
    if (expired) {
      user = await prisma.user.update({
        where: { user_id: userId },
        data: { license: false, license_activated_at: null },
      });
      console.log(`🔴 License expired for user ${userId}, reset in DB`);
    }
  }

  return user;
}

// ✅ Serve quillbot.js
app.get("/quillbot.js", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send("Missing userId");

  const user = await checkAndUpdateLicense(userId);
  const trialExpired = Date.now() - Number(user.trial_start) > TRIAL_MS;

  console.log("🟢 [/quillbot.js] user:", userId);
  console.log("Trial expired:", trialExpired, "License:", user.license);

  if (!trialExpired || user.license) {
    try {
      const response = await fetch("https://ragug.github.io/quillbot-premium-free/quillbot.js");
      const script = await response.text();
      res.type("application/javascript").send(script);
    } catch (err) {
      console.error("❌ Failed to fetch script:", err);
      res.type("application/javascript").send(`alert("Error loading script: ${err.message}")`);
    }
  } else {
    res.type("application/javascript").send(`
      alert("Your free trial or license has ended. Please purchase a new license.");
    `);
  }
});

// ✅ Status check
app.get("/status", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  const user = await checkAndUpdateLicense(userId);
  const trialExpired = Date.now() - Number(user.trial_start) > TRIAL_MS;

  res.json({
    success: true,
    trialExpired,
    license: user.license,
    trialStart: Number(user.trial_start),
    licenseActivatedAt: user.license_activated_at ? Number(user.license_activated_at) : null,
  });
});

// ✅ Activate license
app.get("/activate", async (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey) {
    return res.status(400).json({ success: false, error: "Missing params" });
  }

  if (licenseKey === "TEST-1234") {
    await getUser(userId);
    const activatedAt = Date.now();
    const user = await prisma.user.update({
      where: { user_id: userId },
      data: {
        license: true,
        license_activated_at: BigInt(activatedAt),
      },
    });

    const expiresAt = activatedAt + LICENSE_MS;

    return res.json({
      success: true,
      message: "License activated (valid for 2 minutes)",
      activatedAt,
      expiresAt,
    });
  }

  res.json({ success: false, error: "Invalid license key" });
});

// ✅ Start server on 0.0.0.0 (required for Render)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
