import { Router } from "express";
import { z } from "zod";
import { db, type TransactionRow } from "./db.js";

export const transactionsRouter = Router();

const transactionCreateSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().positive(),
  category: z.string().trim().min(1).max(80),
  payment_method: z.string().trim().max(50).optional().nullable(),
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
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, created_at
       FROM transactions
       WHERE is_initial = 0 AND COALESCE(category, '') != 'Transfer'
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

  // Balance check for wallets
  if (type === "expense" && payment_method) {
    const wallet = db.prepare("SELECT is_credit, credit_limit FROM wallets WHERE name = ?").get(payment_method) as { is_credit: number, credit_limit: number } | undefined;
    if (wallet) {
      const balanceRow = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
        FROM transactions 
        WHERE payment_method = ?
      `).get(payment_method) as { balance: number | null };
      const currentBalance = balanceRow.balance ?? 0;

      if (wallet.is_credit === 0) {
        if (currentBalance < amount) {
          return res.status(400).json({ error: `Insufficient funds in ${payment_method}. Current balance: ${currentBalance}` });
        }
      } else {
        // Credit wallet limit check
        if (currentBalance - amount < -wallet.credit_limit) {
          return res.status(400).json({ error: `Transaction exceeds credit limit for ${payment_method}. Current balance: ${currentBalance}, Credit limit: ${wallet.credit_limit}` });
        }
      }
    }
  }

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
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, created_at
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

  const existingTx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(id) as TransactionRow | undefined;
  if (!existingTx) return res.status(404).json({ error: "Not found" });

  const patch = parsed.data;

  // Balance Check if amount, type, or payment_method changes
  const newType = patch.type ?? existingTx.type;
  const newAmount = patch.amount ?? existingTx.amount;
  const newMethod = patch.payment_method ?? existingTx.payment_method;

  if (newType === "expense" && newMethod) {
    const wallet = db.prepare("SELECT is_credit, credit_limit FROM wallets WHERE name = ?").get(newMethod) as { is_credit: number, credit_limit: number } | undefined;
    if (wallet) {
      // Calculate balance EXCLUDING this transaction
      const balanceRow = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
        FROM transactions 
        WHERE payment_method = ? AND id != ?
      `).get(newMethod, id) as { balance: number | null };
      const otherBalance = balanceRow.balance ?? 0;

      if (wallet.is_credit === 0) {
        if (otherBalance < newAmount) {
          return res.status(400).json({ error: `Insufficient funds in ${newMethod}. Available balance: ${otherBalance}` });
        }
      } else {
        if (otherBalance - newAmount < -wallet.credit_limit) {
          return res.status(400).json({ error: `Transaction exceeds credit limit for ${newMethod}. Available: ${otherBalance + wallet.credit_limit}` });
        }
      }
    }
  }

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
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, created_at
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

  const allWallets = db.prepare("SELECT name, is_credit, credit_limit FROM wallets").all() as { name: string, is_credit: number, credit_limit: number }[];
  const walletMap = new Map<string, { balance: number, is_credit: number, credit_limit: number }>(
    allWallets.map(w => [w.name, { balance: 0, is_credit: w.is_credit, credit_limit: w.credit_limit }])
  );

  for (const row of rows) {
    if (row.payment_method && walletMap.has(row.payment_method)) {
      const wallet = walletMap.get(row.payment_method)!;
      wallet.balance = row.income - row.expense;
    }
  }

  const balances = Array.from(walletMap.entries()).map(([method, data]) => ({
    payment_method: method,
    balance: data.balance,
    is_credit: data.is_credit,
    credit_limit: data.credit_limit
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
      WHERE type = 'income' AND is_initial = 0 AND COALESCE(category, '') != 'Transfer'${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  const expense = db
    .prepare(
      `SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type = 'expense' AND is_initial = 0 AND COALESCE(category, '') != 'Transfer'${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  res.json({ income, expense });
});

transactionsRouter.get("/transfers", (_req, res) => {
  const rows = db.prepare(`
    SELECT 
      transfer_id,
      date,
      amount,
      note,
      MAX(CASE WHEN type = 'expense' THEN payment_method END) as from_wallet,
      MAX(CASE WHEN type = 'income' THEN payment_method END) as to_wallet
    FROM transactions
    WHERE category = 'Transfer' AND transfer_id IS NOT NULL
    GROUP BY transfer_id
    ORDER BY date DESC, created_at DESC
  `).all() as { transfer_id: string; date: string; amount: number; note: string; from_wallet: string; to_wallet: string }[];

  res.json(rows);
});
