import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// Health check route
app.get("/healthz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // DB check
    res.json({ status: "ok" });
  } catch (err) {
    console.error("DB connection failed:", err);
    res.status(500).json({ status: "error", message: "DB connection failed" });
  }
});

// Example route
app.get("/", (req, res) => {
  res.send("🚀 Extension backend is running!");
});

// Railway provides the port via env var
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
