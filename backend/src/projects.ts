import { Router } from "express";
import { z } from "zod";
import { db, type ProjectRow, type TransactionRow } from "./db.js";

export const projectsRouter = Router();

const projectCreateSchema = z.object({
    name: z.string().trim().min(1).max(100)
});

projectsRouter.get("/", (_req, res) => {
    const rows = db
        .prepare("SELECT id, name, created_at FROM projects ORDER BY created_at DESC")
        .all() as ProjectRow[];
    res.json(rows);
});

projectsRouter.post("/", (req, res) => {
    const parsed = projectCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { name } = parsed.data;
    const stmt = db.prepare("INSERT INTO projects (name) VALUES (?)");
    const info = stmt.run(name);

    const created = db
        .prepare("SELECT id, name, created_at FROM projects WHERE id = ?")
        .get(info.lastInsertRowid) as ProjectRow;

    res.status(201).json(created);
});

projectsRouter.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    // Better-sqlite3 handles foreign key constraints if PRAGMA foreign_keys = ON;
    // But here we want to manual set project_id = NULL in transactions if not handled by DB.
    // The schema has ON DELETE SET NULL, so sqlite should handle it.

    const info = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    if (info.changes === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
});

projectsRouter.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const project = db.prepare("SELECT id, name, created_at FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
    if (!project) return res.status(404).json({ error: "Project not found" });

    const transactions = db.prepare(`
    SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, created_at
    FROM transactions
    WHERE project_id = ?
    ORDER BY date DESC, id DESC
  `).all(id) as TransactionRow[];

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    res.json({
        ...project,
        income,
        expense,
        profit: income - expense,
        transactions
    });
});
