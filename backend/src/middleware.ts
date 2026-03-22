import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { JWT_SECRET } from "./auth.js";

export interface AuthUser {
    id: number;
    username: string;
    email: string;
    created_at: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: number };
        const user = db.prepare(
            "SELECT id, username, email, created_at FROM users WHERE id = ?"
        ).get(payload.sub) as AuthUser | undefined;

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
