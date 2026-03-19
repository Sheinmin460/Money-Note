import { Router } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { randomUUID } from "crypto";

export const walletsRouter = Router();

const walletCreateSchema = z.object({
    name: z.string().trim().min(1).max(50)
});

const transferSchema = z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    amount: z.number().positive().finite(),
    date: z.string().min(4),
    note: z.string().optional()
});

walletsRouter.get("/", (_req, res) => {
    const wallets = db.prepare("SELECT * FROM wallets ORDER BY name").all();
    res.json(wallets);
});

walletsRouter.post("/", (req, res) => {
    const parsed = walletCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    try {
        const info = db.prepare("INSERT INTO wallets (name) VALUES (?)").run(parsed.data.name);
        const created = db.prepare("SELECT * FROM wallets WHERE id = ?").get(info.lastInsertRowid);
        res.status(201).json(created);
    } catch (err) {
        if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: "Wallet already exists" });
        }
        throw err;
    }
});

walletsRouter.delete("/:name", (req, res) => {
    const { name } = req.params;

    // Check balance before deleting
    const balanceRow = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
    FROM transactions 
    WHERE payment_method = ?
  `).get(name) as { balance: number | null };

    const balance = balanceRow.balance ?? 0;

    if (Math.abs(balance) > 0.01) {
        return res.status(400).json({ error: `Cannot delete wallet with non-zero balance (${balance})` });
    }

    const info = db.prepare("DELETE FROM wallets WHERE name = ?").run(name);
    if (info.changes === 0) return res.status(404).json({ error: "Wallet not found" });

    res.status(204).send();
});

walletsRouter.post("/transfer", (req, res) => {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { from, to, amount, date, note } = parsed.data;

    if (from === to) {
        return res.status(400).json({ error: "Source and destination wallets must be different" });
    }

    // Verify wallets exist
    const fromExists = db.prepare("SELECT 1 FROM wallets WHERE name = ?").get(from);
    const toExists = db.prepare("SELECT 1 FROM wallets WHERE name = ?").get(to);

    if (!fromExists || !toExists) {
        return res.status(400).json({ error: "One or both wallets do not exist" });
    }

    // Transaction for the transfer
    const performTransfer = db.transaction(() => {
        const transferId = randomUUID();

        // 1. Expense from source
        db.prepare(`
      INSERT INTO transactions (type, amount, category, payment_method, note, date, transfer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("expense", amount, "Transfer", from, note || `Transfer to ${to}`, date, transferId);

        // 2. Income to destination
        db.prepare(`
      INSERT INTO transactions (type, amount, category, payment_method, note, date, transfer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("income", amount, "Transfer", to, note || `Transfer from ${from}`, date, transferId);
    });

    try {
        performTransfer();
        res.status(200).json({ message: "Transfer successful" });
    } catch (err) {
        res.status(500).json({ error: "Transfer failed", details: String(err) });
    }
});
