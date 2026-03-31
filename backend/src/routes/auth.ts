import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware.js";
import { userService } from "../services/userService.js";
import { db } from "../db/index.js";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "moneynote-secret-change-in-production";
const JWT_EXPIRES = "7d";

const registerSchema = z.object({
    username: z.string().trim().min(2).max(40),
    email: z.string().trim().email().max(100),
    password: z.string().min(6).max(100),
    confirm_password: z.string().min(6).max(100),
});

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

const changeEmailSchema = z.object({
    old_password: z.string().min(1),
    new_email: z.string().trim().email().max(100),
});

const changePasswordSchema = z.object({
    old_password: z.string().min(1),
    new_password: z.string().min(6).max(100),
    confirm_password: z.string().min(6).max(100),
});

function makeToken(userId: number): string {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Public routes
authRouter.post("/register", async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }
        const { username, email, password, confirm_password } = parsed.data;

        if (password !== confirm_password) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const existing = userService.getUserByEmail(email);
        if (existing) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const user = userService.createUser(username, email, password_hash);

        const { password_hash: _, ...userWithoutPassword } = user;
        const token = makeToken(user.id);
        res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
});

authRouter.post("/login", async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload" });
        }
        const { email, password } = parsed.data;

        const row = userService.getUserByEmail(email);
        if (!row) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const match = await bcrypt.compare(password, row.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const { password_hash: _, ...userWithoutPassword } = row;
        const token = makeToken(row.id);
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Protect all following routes
authRouter.use(requireAuth);

authRouter.get("/me", (req, res) => {
    res.json(req.user);
});

// PUT /auth/change-email
authRouter.put("/change-email", async (req, res) => {
    try {
        const user = req.user!;
        const parsed = changeEmailSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }
        const { old_password, new_email } = parsed.data;

        const row = userService.getUserById(user.id);
        if (!row) return res.status(404).json({ error: "User not found" });

        const match = await bcrypt.compare(old_password, row.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        const emailExists = userService.getUserByEmail(new_email);
        if (emailExists && emailExists.id !== user.id) {
            return res.status(400).json({ error: "Email already in use" });
        }

        db.prepare("UPDATE users SET email = ? WHERE id = ?").run(new_email, user.id);
        const updated = userService.getUserById(user.id);
        const { password_hash: _, ...userWithoutPassword } = updated!;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: "Failed to change email" });
    }
});

// PUT /auth/change-password
authRouter.put("/change-password", async (req, res) => {
    try {
        const user = req.user!;
        const parsed = changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }
        const { old_password, new_password, confirm_password } = parsed.data;

        if (new_password !== confirm_password) {
            return res.status(400).json({ error: "New passwords do not match" });
        }

        const row = userService.getUserById(user.id);
        if (!row) return res.status(404).json({ error: "User not found" });

        const match = await bcrypt.compare(old_password, row.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Incorrect old password" });
        }

        const new_hash = await bcrypt.hash(new_password, 10);
        db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(new_hash, user.id);
        res.json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to change password" });
    }
});

export { JWT_SECRET };
