import { Router } from "express";
import { z } from "zod";
import { db, type ProjectRow, type TransactionRow, type UserRow } from "./db.js";
import { requireAuth } from "./middleware.js";
import bcrypt from "bcryptjs";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const projectCreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    budget_limit: z.number().min(0).default(0)
});

const inviteCollaboratorSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
    transaction_limit: z.number().min(0).default(0)
});

projectsRouter.get("/", (req, res) => {
    const userId = req.user!.id;
    const rows = db.prepare(`
        SELECT p.*, u.username as owner_username, u.email as owner_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.user_id = ? OR pc.user_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `).all(userId, userId) as ProjectRow[];
    res.json(rows);
});

projectsRouter.post("/", (req, res) => {
    const userId = req.user!.id;
    const parsed = projectCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { name, budget_limit } = parsed.data;
    const info = db.prepare("INSERT INTO projects (user_id, name, budget_limit) VALUES (?, ?, ?)").run(userId, name, budget_limit);

    const created = db
        .prepare("SELECT id, name, budget_limit, created_at FROM projects WHERE id = ?")
        .get(info.lastInsertRowid) as ProjectRow;

    res.status(201).json(created);
});

projectsRouter.delete("/:id", (req, res) => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const info = db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId);
    if (info.changes === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
});

projectsRouter.get("/:id", (req, res) => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const project = db.prepare(`
        SELECT p.*, u.username as owner_username, u.email as owner_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    `).get(id, userId, userId) as ProjectRow | undefined;

    if (!project) return res.status(404).json({ error: "Project not found or access denied" });

    const transactions = db.prepare(`
    SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, user_id, status, created_at
    FROM transactions
    WHERE project_id = ?
    ORDER BY date DESC, id DESC
  `).all(id) as (TransactionRow & { user_id: number })[];

    const activeTransactions = transactions.filter(t => t.status === 'approved');

    const income = activeTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = activeTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const collaborators = db.prepare(`
        SELECT u.id, u.username, u.email, pc.transaction_limit
        FROM users u
        JOIN project_collaborators pc ON u.id = pc.user_id
        WHERE pc.project_id = ?
    `).all(id) as (Omit<UserRow, "password_hash"> & { transaction_limit: number })[];

    res.json({
        ...project,
        is_owner: project.user_id === userId,
        income,
        expense,
        profit: income - expense,
        transactions,
        collaborators
    });
});

// Invite collaborator
projectsRouter.post("/:id/collaborators", async (req, res) => {
    const userId = req.user!.id;
    const projectId = Number(req.params.id);
    const parsed = inviteCollaboratorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const { email, password } = parsed.data;

    // 1. Verify project ownership
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as ProjectRow | undefined;
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.user_id !== userId) return res.status(403).json({ error: "Only the owner can invite collaborators" });

    // 2. Verify owner password
    const owner = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string };
    const match = await bcrypt.compare(password, owner.password_hash);
    if (!match) return res.status(401).json({ error: "Incorrect password confirmation" });

    // 3. Find user by email
    const targetUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
    if (!targetUser) return res.status(404).json({ error: "User with this email not found" });
    if (targetUser.id === userId) return res.status(400).json({ error: "You cannot invite yourself" });

    // 4. Check if already collaborator
    const existing = db.prepare("SELECT 1 FROM project_collaborators WHERE project_id = ? AND user_id = ?").get(projectId, targetUser.id);
    if (existing) return res.status(400).json({ error: "User is already a collaborator" });

    // 5. Add collaborator
    db.prepare("INSERT INTO project_collaborators (project_id, user_id, transaction_limit) VALUES (?, ?, ?)").run(projectId, targetUser.id, parsed.data.transaction_limit);

    res.status(201).json({ message: "Collaborator invited successfully" });
});

// Update project settings
projectsRouter.patch("/:id", (req, res) => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const parsed = projectCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const project = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const updates = parsed.data;
    if (updates.name) {
        db.prepare("UPDATE projects SET name = ? WHERE id = ?").run(updates.name, id);
    }
    if (updates.budget_limit !== undefined) {
        db.prepare("UPDATE projects SET budget_limit = ? WHERE id = ?").run(updates.budget_limit, id);
    }

    res.json({ message: "Settings updated" });
});

// Update collaborator limit
projectsRouter.patch("/:id/collaborators/:targetUserId", (req, res) => {
    const userId = req.user!.id;
    const projectId = Number(req.params.id);
    const targetUserId = Number(req.params.targetUserId);
    const schema = z.object({ transaction_limit: z.number().min(0) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const project = db.prepare("SELECT user_id FROM projects WHERE id = ?").get(projectId) as { user_id: number } | undefined;
    if (!project || project.user_id !== userId) {
        return res.status(403).json({ error: "Only the owner can update collaborator limits" });
    }

    db.prepare("UPDATE project_collaborators SET transaction_limit = ? WHERE project_id = ? AND user_id = ?")
        .run(parsed.data.transaction_limit, projectId, targetUserId);

    res.json({ message: "Limit updated" });
});

// Remove collaborator
projectsRouter.delete("/:id/collaborators/:targetUserId", (req, res) => {
    const userId = req.user!.id;
    const projectId = Number(req.params.id);
    const targetUserId = Number(req.params.targetUserId);

    const project = db.prepare("SELECT user_id FROM projects WHERE id = ?").get(projectId) as { user_id: number } | undefined;
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Only owner can remove collaborators, OR collaborator can remove themselves
    if (project.user_id !== userId && userId !== targetUserId) {
        return res.status(403).json({ error: "Permission denied" });
    }

    db.prepare("DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?").run(projectId, targetUserId);
    res.status(204).send();
});
