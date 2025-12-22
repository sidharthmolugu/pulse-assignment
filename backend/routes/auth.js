const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ---------- REGISTER ----------
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  const exists = await User.findOne({ username });
  if (exists) {
    return res.status(400).json({ error: "user exists" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash: hash });
  await user.save();

  res.json({ message: "registered" });
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // ✅ SET COOKIE (THIS WAS MISSING BEFORE)
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,        // REQUIRED (HTTPS)
    sameSite: "none",    // REQUIRED (cross-site)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
    },
  });
});

// ---------- LOGOUT ----------
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ message: "logged out" });
});

module.exports = router;
