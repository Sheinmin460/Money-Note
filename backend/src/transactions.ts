import { Router } from "express";
import { z } from "zod";
import { db, type TransactionRow } from "./db.js";

export const transactionsRouter = Router();

const transactionCreateSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().positive(),
  category: z.string().trim().max(80).optional().nullable(),
  payment_method: z.enum(["Cash", "Bank", "Wallet", "Card"]).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  date: z.string().trim().min(4)
});

const transactionUpdateSchema = transactionCreateSchema.partial().extend({
  type: z.enum(["income", "expense"]).optional(),
  amount: z.number().finite().positive().optional()
});

transactionsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, created_at
       FROM transactions
       ORDER BY date DESC, id DESC`
    )
    .all() as TransactionRow[];
  res.json(rows);
});

transactionsRouter.post("/", (req, res) => {
  const parsed = transactionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { type, amount, category, payment_method, note, date } = parsed.data;
  const stmt = db.prepare(
    `INSERT INTO transactions (type, amount, category, payment_method, note, date)
     VALUES (@type, @amount, @category, @payment_method, @note, @date)`
  );
  const info = stmt.run({
    type,
    amount,
    category: category ?? null,
    payment_method: payment_method ?? null,
    note: note ?? null,
    date
  });

  const created = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, created_at
       FROM transactions
       WHERE id = ?`
    )
    .get(info.lastInsertRowid) as TransactionRow;

  res.status(201).json(created);
});

transactionsRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = transactionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = db.prepare(`SELECT id FROM transactions WHERE id = ?`).get(id) as
    | { id: number }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });

  const patch = parsed.data;

  // Build dynamic UPDATE query and parameters
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  if (patch.type !== undefined) {
    fields.push("type = @type");
    params.type = patch.type;
  }
  if (patch.amount !== undefined) {
    fields.push("amount = @amount");
    params.amount = patch.amount;
  }
  if (patch.category !== undefined) {
    fields.push("category = @category");
    params.category = patch.category;
  }
  if (patch.payment_method !== undefined) {
    fields.push("payment_method = @payment_method");
    params.payment_method = patch.payment_method;
  }
  if (patch.note !== undefined) {
    fields.push("note = @note");
    params.note = patch.note;
  }
  if (patch.date !== undefined) {
    fields.push("date = @date");
    params.date = patch.date;
  }

  if (fields.length > 0) {
    const update = db.prepare(
      `UPDATE transactions SET ${fields.join(", ")} WHERE id = @id`
    );
    update.run(params);
  }

  const updated = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, created_at
       FROM transactions
       WHERE id = ?`
    )
    .get(id) as TransactionRow;

  res.json(updated);
});

transactionsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const info = db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

