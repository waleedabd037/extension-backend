import express from "express";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

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
    console.log(
      `🟡 Trial started at: ${new Date(trialStart).toLocaleTimeString()}`
    );
  }

  return user;
}

// ✅ Helper: check license validity (and reset DB if expired)
async function checkAndUpdateLicense(userId) {
  let user = await getUser(userId);

  if (user.license && user.license_activated_at) {
    const expired =
      Date.now() - Number(user.license_activated_at) > LICENSE_MS;
    if (expired) {
      // Auto reset in DB
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
      const response = await fetch(
        "https://ragug.github.io/quillbot-premium-free/quillbot.js"
      );
      const script = await response.text();

      console.log("✅ Served REAL script");
      res.type("application/javascript").send(script);
    } catch (err) {
      console.error("❌ Failed to fetch script:", err);
      res
        .type("application/javascript")
        .send(`alert("Error loading script: ${err.message}")`);
    }
  } else {
    console.log("⛔ Trial expired and no valid license");
    res.type("application/javascript").send(`
      alert("Your free trial or license has ended. Please purchase a new license.");
    `);
  }
});

// ✅ Status check
app.get("/status", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing userId" });
  }

  const user = await checkAndUpdateLicense(userId);
  const trialExpired = Date.now() - Number(user.trial_start) > TRIAL_MS;

  console.log(`🟡 [/status] user: ${userId}`);
  console.log(
    "Trial started:",
    new Date(Number(user.trial_start)).toLocaleTimeString()
  );
  console.log("Trial expired:", trialExpired);
  console.log("License active:", user.license);
  if (user.license && user.license_activated_at) {
    console.log(
      "License activated at:",
      new Date(Number(user.license_activated_at)).toLocaleTimeString()
    );
  }

  res.json({
    success: true,
    trialExpired,
    license: user.license,
    trialStart: Number(user.trial_start),
    licenseActivatedAt: user.license_activated_at
      ? Number(user.license_activated_at)
      : null,
  });
});

// ✅ Activate license
app.get("/activate", async (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey) {
    return res
      .status(400)
      .json({ success: false, error: "Missing params" });
  }

  if (licenseKey === "TEST-1234") {
    await getUser(userId); // auto-create if not exist
    const activatedAt = Date.now();
    const user = await prisma.user.update({
      where: { user_id: userId },
      data: {
        license: true,
        license_activated_at: BigInt(activatedAt),
      },
    });

    const expiresAt = activatedAt + LICENSE_MS;

    console.log(`🟢 License ACTIVATED for user: ${userId}`);
    console.log("Activated at:", new Date(activatedAt).toLocaleTimeString());
    console.log("Expires at:", new Date(expiresAt).toLocaleTimeString());

    return res.json({
      success: true,
      message: "License activated (valid for 2 minutes)",
      activatedAt,
      expiresAt,
    });
  }

  res.json({ success: false, error: "Invalid license key" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
