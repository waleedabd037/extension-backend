// server.js
import express from "express";

const app = express();

// Root route
app.get("/", (req, res) => {
  res.send("🚀 Extension backend is running!");
});

// Health check (Railway probe)
app.get("/healthz", (req, res) => {
  res.json({ success: true, message: "Service is healthy ✅" });
});

// Start server on Railway-assigned port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
});
