import express from "express";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";
import cors from "cors";

const app = express();
const prisma = new PrismaClient();

app.use(
  cors({
    origin: ["https://quillbot.com", "chrome-extension://*"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());
const PORT = process.env.PORT || 3000;

// 🧩 Time limits
const TRIAL_MS = 2 * 60 * 1000;
const LICENSE_MS = 2 * 60 * 1000;

// 🧩 Get or create user
async function getUser(userId) {
  let user = await prisma.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    const trialStart = Date.now();
    user = await prisma.user.create({
      data: {
        user_id: userId,
        trial_start: BigInt(trialStart),
        license: false,
      },
    });
    console.log("🟢 Created user:", userId);
  }
  return user;
}

// 🧩 Check expiry
async function checkLicense(userId) {
  let user = await getUser(userId);
  if (user.license && user.license_activated_at) {
    const expired = Date.now() - Number(user.license_activated_at) > LICENSE_MS;
    if (expired) {
      user = await prisma.user.update({
        where: { user_id: userId },
        data: { license: false, license_activated_at: null },
      });
      console.log("🔴 License expired:", userId);
    }
  }
  return user;
}

// 🧩 Serve main script
app.get("/quillbot.js", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send("Missing userId");

  const user = await checkLicense(userId);
  const trialExpired = Date.now() - Number(user.trial_start) > TRIAL_MS;

  if (!trialExpired || user.license) {
    try {
      const response = await fetch(
        "https://ragug.github.io/quillbot-premium-free/quillbot.js"
      );
      const script = await response.text();
      res.setHeader("Content-Type", "application/javascript");
      res.send(script);
    } catch (err) {
      res.type("application/javascript").send(
        `alert("Error loading script: ${err.message}")`
      );
    }
  } else {
    res.type("application/javascript").send(
      `alert("Trial or license expired. Please renew.")`
    );
  }
});

// 🧩 Status check
app.get("/status", async (req, res) => {
  const { userId } = req.query;
  if (!userId)
    return res.status(400).json({ success: false, error: "Missing userId" });

  const user = await checkLicense(userId);
  const trialExpired = Date.now() - Number(user.trial_start) > TRIAL_MS;

  res.json({
    success: true,
    trialExpired,
    license: user.license,
  });
});

// 🧩 Activate license
app.get("/activate", async (req, res) => {
  const { userId, licenseKey } = req.query;
  if (!userId || !licenseKey)
    return res.status(400).json({ success: false, error: "Missing params" });

  if (licenseKey === "TEST-1234") {
    const activatedAt = Date.now();
    await getUser(userId);
    await prisma.user.update({
      where: { user_id: userId },
      data: {
        license: true,
        license_activated_at: BigInt(activatedAt),
      },
    });
    return res.json({
      success: true,
      message: "License activated (valid for 2 minutes)",
    });
  }
  res.json({ success: false, error: "Invalid license key" });
});

app.get("/test", (_, res) => res.send("✅ Render backend active!"));
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Running on port ${PORT}`)
);
