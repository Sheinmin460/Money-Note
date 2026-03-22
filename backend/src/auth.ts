import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, type UserRow } from "./db.js";

import { requireAuth } from "./middleware.js";

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
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { username, email, password, confirm_password } = parsed.data;

    if (password !== confirm_password) {
        return res.status(400).json({ error: "Passwords do not match" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
        return res.status(400).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const info = db.prepare(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
    ).run(username, email, password_hash);

    const user = db.prepare("SELECT id, username, email, created_at FROM users WHERE id = ?")
        .get(info.lastInsertRowid) as Omit<UserRow, "password_hash">;

    const token = makeToken(user.id);
    res.status(201).json({ user, token });
});

authRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    const { email, password } = parsed.data;

    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
    if (!row) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = { id: row.id, username: row.username, email: row.email, created_at: row.created_at };
    const token = makeToken(row.id);
    res.json({ user, token });
});

// Protect all following routes
authRouter.use(requireAuth);

authRouter.get("/me", (req, res) => {
    res.json(req.user);
});

// PUT /auth/change-email
authRouter.put("/change-email", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const parsed = changeEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { old_password, new_email } = parsed.data;

    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as UserRow;
    const match = await bcrypt.compare(old_password, row.password_hash);
    if (!match) {
        return res.status(401).json({ error: "Incorrect password" });
    }

    const emailExists = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(new_email, user.id);
    if (emailExists) {
        return res.status(400).json({ error: "Email already in use" });
    }

    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(new_email, user.id);
    const updated = db.prepare("SELECT id, username, email, created_at FROM users WHERE id = ?").get(user.id);
    res.json(updated);
});

// PUT /auth/change-password
authRouter.put("/change-password", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { old_password, new_password, confirm_password } = parsed.data;

    if (new_password !== confirm_password) {
        return res.status(400).json({ error: "New passwords do not match" });
    }

    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as UserRow;
    const match = await bcrypt.compare(old_password, row.password_hash);
    if (!match) {
        return res.status(401).json({ error: "Incorrect old password" });
    }

    const new_hash = await bcrypt.hash(new_password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(new_hash, user.id);
    res.json({ message: "Password updated successfully" });
});

export { JWT_SECRET };
