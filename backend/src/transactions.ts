import { Router } from "express";
import { z } from "zod";
import { db, type TransactionRow } from "./db.js";
import { requireAuth } from "./middleware.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

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

transactionsRouter.get("/", (req, res) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, created_at
       FROM transactions
       WHERE user_id = ? AND is_initial = 0 AND COALESCE(category, '') != 'Transfer'
       ORDER BY date DESC, id DESC`
    )
    .all(userId) as TransactionRow[];
  res.json(rows);
});

transactionsRouter.post("/", (req, res) => {
  const userId = req.user!.id;
  const parsed = transactionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { type, amount, category, payment_method, note, date, is_initial, project_id } = parsed.data;

  // Balance check for wallets
  if (type === "expense" && payment_method) {
    const wallet = db.prepare("SELECT is_credit, credit_limit FROM wallets WHERE user_id = ? AND name = ?").get(userId, payment_method) as { is_credit: number, credit_limit: number } | undefined;
    if (wallet) {
      const balanceRow = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
        FROM transactions 
        WHERE user_id = ? AND payment_method = ?
      `).get(userId, payment_method) as { balance: number | null };
      const currentBalance = balanceRow.balance ?? 0;

      if (wallet.is_credit === 0) {
        if (currentBalance < amount) {
          return res.status(400).json({ error: `Insufficient funds in ${payment_method}. Current balance: ${currentBalance}` });
        }
      } else {
        if (currentBalance - amount < -wallet.credit_limit) {
          return res.status(400).json({ error: `Transaction exceeds credit limit for ${payment_method}. Current balance: ${currentBalance}, Credit limit: ${wallet.credit_limit}` });
        }
      }
    }
  }

  const stmt = db.prepare(
    `INSERT INTO transactions (user_id, type, amount, category, payment_method, note, date, is_initial, project_id)
     VALUES (@user_id, @type, @amount, @category, @payment_method, @note, @date, @is_initial, @project_id)`
  );
  const info = stmt.run({
    user_id: userId,
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
       FROM transactions WHERE id = ?`
    )
    .get(info.lastInsertRowid) as TransactionRow;

  res.status(201).json(created);
});

transactionsRouter.put("/:id", (req, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = transactionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existingTx = db.prepare(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`).get(id, userId) as TransactionRow | undefined;
  if (!existingTx) return res.status(404).json({ error: "Not found" });

  const patch = parsed.data;
  const newType = patch.type ?? existingTx.type;
  const newAmount = patch.amount ?? existingTx.amount;
  const newMethod = patch.payment_method ?? existingTx.payment_method;

  if (newType === "expense" && newMethod) {
    const wallet = db.prepare("SELECT is_credit, credit_limit FROM wallets WHERE user_id = ? AND name = ?").get(userId, newMethod) as { is_credit: number, credit_limit: number } | undefined;
    if (wallet) {
      const balanceRow = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
        FROM transactions 
        WHERE user_id = ? AND payment_method = ? AND id != ?
      `).get(userId, newMethod, id) as { balance: number | null };
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

  const fields: string[] = [];
  const params: Record<string, any> = { id, user_id: userId };

  if (patch.type !== undefined) { fields.push("type = @type"); params.type = patch.type; }
  if (patch.amount !== undefined) { fields.push("amount = @amount"); params.amount = patch.amount; }
  if (patch.category !== undefined) { fields.push("category = @category"); params.category = patch.category; }
  if (patch.payment_method !== undefined) { fields.push("payment_method = @payment_method"); params.payment_method = patch.payment_method; }
  if (patch.note !== undefined) { fields.push("note = @note"); params.note = patch.note; }
  if (patch.date !== undefined) { fields.push("date = @date"); params.date = patch.date; }
  if (patch.is_initial !== undefined) { fields.push("is_initial = @is_initial"); params.is_initial = patch.is_initial ? 1 : 0; }
  if (patch.project_id !== undefined) { fields.push("project_id = @project_id"); params.project_id = patch.project_id; }

  if (fields.length > 0) {
    db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = @id AND user_id = @user_id`).run(params);
  }

  const updated = db
    .prepare(`SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, created_at FROM transactions WHERE id = ?`)
    .get(id) as TransactionRow;

  res.json(updated);
});

transactionsRouter.delete("/:id", (req, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const info = db.prepare(`DELETE FROM transactions WHERE id = ? AND user_id = ?`).run(id, userId);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

transactionsRouter.get("/balances", (req, res) => {
  const userId = req.user!.id;

  const rows = db
    .prepare(
      `SELECT
        payment_method,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ?
      GROUP BY payment_method`
    )
    .all(userId) as { payment_method: string | null; income: number; expense: number }[];

  const allWallets = db.prepare("SELECT name, is_credit, credit_limit FROM wallets WHERE user_id = ?").all(userId) as { name: string, is_credit: number, credit_limit: number }[];
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
  const userId = req.user!.id;
  const { from, to } = req.query;

  let whereClause = '';
  const params: any[] = [userId];

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
      WHERE user_id = ? AND type = 'income' AND is_initial = 0 AND COALESCE(category, '') != 'Transfer'${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  const expense = db
    .prepare(
      `SELECT category, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND is_initial = 0 AND COALESCE(category, '') != 'Transfer'${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  res.json({ income, expense });
});

transactionsRouter.get("/transfers", (req, res) => {
  const userId = req.user!.id;
  const rows = db.prepare(`
    SELECT 
      transfer_id,
      date,
      amount,
      note,
      MAX(CASE WHEN type = 'expense' THEN payment_method END) as from_wallet,
      MAX(CASE WHEN type = 'income' THEN payment_method END) as to_wallet
    FROM transactions
    WHERE user_id = ? AND category = 'Transfer' AND transfer_id IS NOT NULL
    GROUP BY transfer_id
    ORDER BY date DESC, created_at DESC
  `).all(userId) as { transfer_id: string; date: string; amount: number; note: string; from_wallet: string; to_wallet: string }[];

  res.json(rows);
});
