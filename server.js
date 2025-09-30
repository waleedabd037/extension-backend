import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Root route
app.get("/", (req, res) => {
  res.send("✅ Backend root is alive and running on Railway");
});

// Simple test route
app.get("/test", (req, res) => {
  res.send(`
    <h1>🚀 Backend is alive!</h1>
    <p>Current server time: ${new Date().toLocaleTimeString()}</p>
  `);
});

// JSON health check (useful for debugging)
app.get("/healthz", (req, res) => {
  res.json({ success: true, message: "Service is healthy ✅", time: new Date().toISOString() });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
