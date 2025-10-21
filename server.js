import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Root route — confirms your server is live
app.get("/", (req, res) => {
  res.send("🚀 Express backend is running successfully on Render or Railway!");
});

// ✅ Test route — to quickly verify deployment
app.get("/test", (req, res) => {
  res.send("✅ /test route is working perfectly!");
});

// ✅ Health check route — optional, used by hosting platforms
app.get("/healthz", (req, res) => {
  res.json({ success: true, message: "Server is healthy ✅" });
});

// ✅ Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running and listening on port ${PORT}`);
});
