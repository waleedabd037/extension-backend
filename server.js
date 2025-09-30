import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 Basic Express server is running on Railway!");
});

app.get("/test", (req, res) => {
  res.send("✅ Test route working!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
