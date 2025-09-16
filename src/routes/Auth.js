import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * POST /auth/login
 * Body: { username, password }
 * Public → retourne { token, user }
 */
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Header: Authorization: Bearer <token>
 * Protégé → retourne { authenticated, user }
 */
router.get("/me", requireAuth, async (req, res) => {
  // requireAuth a déjà validé le token et mis req.user
  const { id, username, role } = req.user;
  res.json({ authenticated: true, user: { id, username, role } });
});

/**
 * POST /auth/change-password
 * Body: { currentPassword, newPassword }
 * Protégé → met à jour le mot de passe
 */
router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "newPassword must be at least 8 characters" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    user.passwordHash = await bcrypt.hash(newPassword, rounds);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
});

export default router;
