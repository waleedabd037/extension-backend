import express from "express";
//import cors from "cors";

const app = express();

app.get("/", (req, res) => {
  res.send("🚀 Extension backend is running!");
});

app.get("/healthz", (req, res) => {
  res.json({ success: true, message: "Service is healthy ✅" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
