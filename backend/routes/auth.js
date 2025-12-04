const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Authentication routes for user registration and login

// Route to handle user registration
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });

  // Check if the user already exists
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: "user exists" });

  // Hash the password before saving to the database
  const hash = await bcrypt.hash(password, 10);

  // Allow optional tenant field for multi-tenant support
  const tenant = req.body.tenant || null;
  const u = new User({ username, passwordHash: hash, tenant });
  await u.save();
  res.json({ message: "registered" });
});

// Route to handle user login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Find the user by username
  const u = await User.findOne({ username });
  if (!u) return res.status(401).json({ error: "invalid" });

  // Compare the provided password with the stored hash
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid" });

  // Generate a JWT token for the user
  const token = jwt.sign(
    { id: u._id, role: u.role },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );

  // Respond with the token and user details
  res.json({ token, user: { id: u._id, username: u.username, role: u.role } });
});

module.exports = router;
