const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRouter = require("./routes/auth");
const videosRouter = require("./routes/videos");

const app = express();
const server = http.createServer(app);

// ---------- CORS ----------
app.use(
  cors({
    origin: "https://streamit-inky.vercel.app",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- Routes ----------
app.use("/api/auth", authRouter);
app.use("/api/videos", videosRouter);

// ---------- MongoDB ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

// ---------- Server ----------
const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
