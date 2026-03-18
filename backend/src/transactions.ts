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
  date: z.string().trim().min(4),
  is_initial: z.boolean().optional(),
  project_id: z.number().optional().nullable()
});

const transactionUpdateSchema = transactionCreateSchema.partial().extend({
  type: z.enum(["income", "expense"]).optional(),
  amount: z.number().finite().positive().optional(),
  is_initial: z.boolean().optional(),
  project_id: z.number().optional().nullable()
});

transactionsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, created_at
       FROM transactions
       WHERE is_initial = 0
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

  const { type, amount, category, payment_method, note, date, is_initial, project_id } = parsed.data;
  const stmt = db.prepare(
    `INSERT INTO transactions (type, amount, category, payment_method, note, date, is_initial, project_id)
     VALUES (@type, @amount, @category, @payment_method, @note, @date, @is_initial, @project_id)`
  );
  const info = stmt.run({
    type,
    amount,
    category: category ?? null,
    payment_method: payment_method ?? null,
    note: note ?? null,
    date,
    is_initial: is_initial ? 1 : 0,
    project_id: project_id ?? null
  });

  const created = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, created_at
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
  if (patch.is_initial !== undefined) {
    fields.push("is_initial = @is_initial");
    params.is_initial = patch.is_initial ? 1 : 0;
  }
  if (patch.project_id !== undefined) {
    fields.push("project_id = @project_id");
    params.project_id = patch.project_id;
  }

  if (fields.length > 0) {
    const update = db.prepare(
      `UPDATE transactions SET ${fields.join(", ")} WHERE id = @id`
    );
    update.run(params);
  }

  const updated = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, created_at
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

transactionsRouter.get("/balances", (_req, res) => {
  const defaultMethods = ["Cash", "Bank", "Wallet", "Card"];

  const rows = db
    .prepare(
      `SELECT
        payment_method,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      GROUP BY payment_method`
    )
    .all() as { payment_method: string | null; income: number; expense: number }[];

  const methodBalances = new Map<string, number>(
    defaultMethods.map((m) => [m, 0])
  );

  for (const row of rows) {
    if (row.payment_method && methodBalances.has(row.payment_method)) {
      methodBalances.set(row.payment_method, row.income - row.expense);
    }
  }

  const balances = Array.from(methodBalances.entries()).map(([method, balance]) => ({
    payment_method: method,
    balance: balance,
  }));

  res.json(balances);
});

transactionsRouter.get("/category-totals", (req, res) => {
  const { from, to } = req.query;

  let whereClause = '';
  const params: any[] = [];

  if (from && typeof from === 'string') {
    whereClause += ` AND date >= ?`;
    params.push(from);
  }

  if (to && typeof to === 'string') {
    whereClause += ` AND date <= ?`;
    params.push(to);
  }

  const income = db
    .prepare(
      `SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type = 'income' AND is_initial = 0${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  const expense = db
    .prepare(
      `SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type = 'expense' AND is_initial = 0${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  res.json({ income, expense });
});
