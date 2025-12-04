const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Video = require("../models/Video");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { spawn } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");

// Directory to store uploaded video files
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR), // Save files to UPLOAD_DIR
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext; // Generate unique filename
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB cap

module.exports = (io) => {
  const router = express.Router();

  // Middleware to parse JWT from Authorization header
  router.use(async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
      req.user = null; // No token, treat as anonymous
      return next();
    }
    const parts = auth.split(" ");
    if (parts.length !== 2) {
      req.user = null; // Invalid token format
      return next();
    }
    const token = parts[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
      // Attach user info to request
      req.user = { id: payload.id, role: payload.role };
      return next();
    } catch (err) {
      // Invalid token — treat as anonymous
      req.user = null;
      return next();
    }
  });

  router.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "no file" });
    // role check: require authenticated uploader/editor or allow anonymous for demo
    if (req.user && req.user.role === "viewer")
      return res.status(403).json({ error: "insufficient role to upload" });

    // Upload validation: enforce video mimetype and extension
    const allowedExt = [".mp4", ".mov", ".webm", ".mkv", ".avi", ".ogg"];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!req.file.mimetype.startsWith("video/") || !allowedExt.includes(ext)) {
      // remove uploaded file
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, req.file.filename));
      } catch (e) {}
      return res
        .status(400)
        .json({
          error: "invalid file type. allowed: " + allowedExt.join(", "),
        });
    }

    // create metadata, attach tenant if present
    const visibility =
      req.body && req.body.visibility ? req.body.visibility : "public";
    const tenant =
      req.user && req.user.tenant
        ? req.user.tenant
        : req.body && req.body.tenant
        ? req.body.tenant
        : null;
    const v = new Video({
      user: req.user ? req.user.id : null,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: "uploaded",
      visibility: ["public", "private"].includes(visibility)
        ? visibility
        : "public",
      tenant: tenant,
    });
    await v.save();

    // emit initial progress
    io.emit("processing", { videoId: v._id, progress: 0, status: "uploaded" });

    // Simulate processing pipeline asynchronously
    setImmediate(async () => {
      try {
        v.status = "processing";
        await v.save();
        io.emit("processing", {
          videoId: v._id,
          progress: 5,
          status: "processing",
        });

        // Example: use ffmpeg to probe duration (best-effort, not required)
        try {
          await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(
              path.join(UPLOAD_DIR, v.filename),
              (err, metadata) => {
                if (err) return resolve();
                if (metadata && metadata.format && metadata.format.duration)
                  v.durationSec = Math.floor(metadata.format.duration);
                resolve();
              }
            );
          });
        } catch (e) {}

        // Simulate work with progress updates
        for (let p = 10; p <= 90; p += 20) {
          await new Promise((r) => setTimeout(r, 700));
          io.emit("processing", {
            videoId: v._id,
            progress: p,
            status: "processing",
          });
        }

        // Sensitivity detection stub: random safe/flagged (replace with ML in prod)
        v.sensitivity = Math.random() < 0.85 ? "safe" : "flagged";
        v.status = "done";
        await v.save();
        io.emit("processing", {
          videoId: v._id,
          progress: 100,
          status: "done",
          sensitivity: v.sensitivity,
        });
      } catch (err) {
        console.error("processing error", err);
        v.status = "failed";
        await v.save();
        io.emit("processing", {
          videoId: v._id,
          progress: 0,
          status: "failed",
        });
      }
    });

    res.json({ video: v });
  });

  // List videos with optional filtering: ?status=done&sensitivity=safe&q=text&user=<id>&limit=20&page=0
  // Visibility rules: anonymous users see only public; authenticated users see public + their own; admin sees all
  router.get("/", async (req, res) => {
    try {
      const { status, sensitivity, q, user, limit = 50, page = 0 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (sensitivity) filter.sensitivity = sensitivity;
      if (user) filter.user = user;
      if (q)
        filter.originalName = {
          $regex: q.replace(/[.*+?^${}()|[\]\\]/g, ""),
          $options: "i",
        };

      const l = Math.min(200, parseInt(limit, 10) || 50);
      const p = Math.max(0, parseInt(page, 10) || 0);
      // Apply visibility rules
      if (!req.user) {
        filter.visibility = "public";
      } else if (req.user.role !== "admin") {
        // show public OR owned by current user
        filter.$or = [{ visibility: "public" }, { user: req.user.id }];
      }

      const list = await Video.find(filter)
        .sort({ createdAt: -1 })
        .skip(p * l)
        .limit(l)
        .populate("user", "username");
      res.json({
        videos: list,
        meta: { count: list.length, page: p, limit: l },
      });
    } catch (err) {
      console.error("list videos error", err);
      res.status(500).json({ error: "internal" });
    }
  });

  // streaming with range support
  router.get("/stream/:filename", async (req, res) => {
    // find video metadata by filename to enforce visibility/tenant rules
    const v = await Video.findOne({ filename: req.params.filename }).populate(
      "user",
      "username"
    );
    if (!v) return res.status(404).end("Not found");

    // enforce visibility and tenant
    if (v.visibility === "private") {
      if (!req.user) return res.status(401).json({ error: "unauthenticated" });
      const isOwner = v.user && String(v.user._id) === String(req.user.id);
      if (!isOwner && req.user.role !== "admin")
        return res.status(403).json({ error: "forbidden" });
    }
    if (
      v.tenant &&
      req.user &&
      req.user.role !== "admin" &&
      req.user.tenant !== v.tenant
    ) {
      return res.status(403).json({ error: "forbidden - tenant mismatch" });
    }

    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).end("Not found");
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // get video details with visibility/tenant enforcement
  router.get("/:id", async (req, res) => {
    try {
      const v = await Video.findById(req.params.id).populate(
        "user",
        "username"
      );
      if (!v) return res.status(404).json({ error: "not found" });
      if (v.visibility === "private") {
        if (!req.user)
          return res.status(401).json({ error: "unauthenticated" });
        const isOwner = v.user && String(v.user._id) === String(req.user.id);
        if (!isOwner && req.user.role !== "admin")
          return res.status(403).json({ error: "forbidden" });
      }
      if (
        v.tenant &&
        req.user &&
        req.user.role !== "admin" &&
        req.user.tenant !== v.tenant
      ) {
        return res.status(403).json({ error: "forbidden - tenant mismatch" });
      }
      res.json({ video: v });
    } catch (err) {
      console.error("get video error", err);
      res.status(500).json({ error: "internal" });
    }
  });

  // Delete video (file + record) - only owner or admin
  router.delete("/:id", async (req, res) => {
    try {
      const v = await Video.findById(req.params.id);
      if (!v) return res.status(404).json({ error: "not found" });
      if (!req.user) return res.status(401).json({ error: "unauthenticated" });
      const isAdmin = req.user.role === "admin";
      const isOwner = v.user && String(v.user) === String(req.user.id);
      if (!isAdmin && !isOwner)
        return res.status(403).json({ error: "forbidden" });

      // remove file
      const p = path.join(UPLOAD_DIR, v.filename);
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {
        console.warn("unlink failed", e);
      }
      await Video.deleteOne({ _id: v._id });
      io.emit("processing", { videoId: v._id, status: "deleted" });
      res.json({ ok: true });
    } catch (err) {
      console.error("delete video error", err);
      res.status(500).json({ error: "internal" });
    }
  });

  // Patch video metadata (e.g., manual sensitivity override) - editors and admins only
  router.patch("/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "unauthenticated" });
      if (!["editor", "admin"].includes(req.user.role))
        return res.status(403).json({ error: "insufficient role" });
      const v = await Video.findById(req.params.id);
      if (!v) return res.status(404).json({ error: "not found" });
      const { sensitivity, status, visibility } = req.body;
      if (sensitivity && ["unknown", "safe", "flagged"].includes(sensitivity))
        v.sensitivity = sensitivity;
      if (
        status &&
        ["uploaded", "processing", "done", "failed"].includes(status)
      )
        v.status = status;
      if (visibility && ["public", "private"].includes(visibility))
        v.visibility = visibility;
      await v.save();
      io.emit("processing", {
        videoId: v._id,
        status: v.status,
        sensitivity: v.sensitivity,
        progress: v.status === "done" ? 100 : 0,
      });
      res.json({ video: v });
    } catch (err) {
      console.error("patch video error", err);
      res.status(500).json({ error: "internal" });
    }
  });

  return router;
};
