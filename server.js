const express = require("express");
const bcrypt = require("bcryptjs");
const fileUpload = require("express-fileupload");
const productsRouter = require("./routes/products");
const productImagesRouter = require("./routes/productImages");
const categoryRouter = require("./routes/category");
const searchRouter = require("./routes/search");
const mainImageRouter = require("./routes/mainImages");
const userRouter = require("./routes/users");
const orderRouter = require("./routes/customer_orders");
const slugRouter = require("./routes/slugs");
const orderProductRouter = require("./routes/customer_order_product");
const wishlistRouter = require("./routes/wishlist");
// const predictRouter = require("./routes/model");

const cron = require("node-cron");
const { fetchTrendingProduct } = require("./controllers/trendingController");

const cors = require("cors");
const session = require("express-session");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

// Sessions
app.use(
  session({
    secret: "your_secret_key", // ⚠️ Replace with a secure key in production
    resave: false,
    saveUninitialized: true,
  })
);

// Middlewares
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(fileUpload());
app.use((req, res, next) => {
  console.log(`Request made to: ${req.url}`);
  next();
});

// Routers
app.use("/api/products", productsRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/images", productImagesRouter);
app.use("/api/main-image", mainImageRouter);
app.use("/api/users", userRouter);
app.use("/api/search", searchRouter);
app.use("/api/orders", orderRouter);
app.use("/api/order-product", orderProductRouter);
app.use("/api/slugs", slugRouter);
app.use("/api/wishlist", wishlistRouter);
// app.use("/api/model", predictRouter);

// Health check endpoint
app.get("/healthz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // DB connection check
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("❌ DB health check failed:", err);
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
