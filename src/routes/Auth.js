import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginLimiter } from "../middlewares/rateLimit.js";
import User from "../models/User.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /auth/register  (optionnel, en dev)
router.post("/register", async (req, res) => {
  try {
    if (process.env.ALLOW_SIGNUP !== "true") {
      return res.status(403).json({ error: "Signup is disabled" });
    }
    const { username, password, role = "admin" } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    const exists = await User.findOne({ where: { username } });
    if (exists) return res.status(409).json({ error: "Username already exists" });

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({ username, passwordHash, role });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to register" });
  }
});

// POST /auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to login" });
  }
});

// GET /auth/me
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(200).json({ authenticated: false });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, user: { id: payload.id, username: payload.username, role: payload.role } });
  } catch {
    res.status(200).json({ authenticated: false });
  }
});

// POST /auth/change-password (auth requis)
router.post("/change-password", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword are required" });

    const user = await User.findByPk(payload.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (e) {
    console.error(e);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
