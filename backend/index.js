const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const socketio = require("socket.io");
const path = require("path");
require("dotenv").config();

const videosRouter = require("./routes/videos");
const authRouter = require("./routes/auth");

// ---------------------
// App & Server
// ---------------------
const app = express();
const server = http.createServer(app);

// ---------------------
// Allowed origins
// ---------------------
const allowedOrigins = [
  "http://localhost:5173",
  "https://streamit-livid.vercel.app",
];

// ---------------------
// Express CORS
// ---------------------
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------
// Socket.io
// ---------------------
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// ---------------------
// Routes
// ---------------------
app.use("/api/auth", authRouter);
app.use("/api/videos", videosRouter(io));

// ---------------------
// MongoDB
// ---------------------
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not defined");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ---------------------
// Start server (Render-safe)
// ---------------------
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
