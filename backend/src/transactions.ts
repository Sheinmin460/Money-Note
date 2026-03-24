import { Router } from "express";
import { z } from "zod";
import { db, type TransactionRow, type ProjectRow } from "./db.js";
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
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, status, created_at
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
  let status: 'approved' | 'pending' = 'approved';

  // Verify project access and check limits if provided
  if (project_id) {
    const project = db.prepare(`
        SELECT p.*, pc.transaction_limit as member_limit
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = ?
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    `).get(userId, project_id, userId, userId) as (ProjectRow & { member_limit: number | null }) | undefined;

    if (!project) return res.status(403).json({ error: "Access denied to this project" });

    const isOwner = project.user_id === userId;

    if (!isOwner) {
      // Check member transaction limit
      if (project.member_limit !== null && project.member_limit > 0 && amount > project.member_limit) {
        status = 'pending';
      }

      // Check project budget limit
      if (project.budget_limit > 0) {
        const expenseRow = db.prepare(`
          SELECT SUM(amount) as total_expense
          FROM transactions
          WHERE project_id = ? AND type = 'expense' AND status = 'approved'
        `).get(project_id) as { total_expense: number | null };
        const currentExpense = expenseRow.total_expense ?? 0;

        if (type === 'expense' && currentExpense + amount > project.budget_limit) {
          status = 'pending';
        }
      }
    }
  }

  // Balance check for wallets (only if approved)
  if (status === 'approved' && type === "expense" && payment_method) {
    const wallet = db.prepare("SELECT is_credit, credit_limit FROM wallets WHERE user_id = ? AND name = ?").get(userId, payment_method) as { is_credit: number, credit_limit: number } | undefined;
    if (wallet) {
      const balanceRow = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
        FROM transactions 
        WHERE user_id = ? AND payment_method = ? AND status = 'approved'
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
    `INSERT INTO transactions (user_id, type, amount, category, payment_method, note, date, is_initial, project_id, status)
     VALUES (@user_id, @type, @amount, @category, @payment_method, @note, @date, @is_initial, @project_id, @status)`
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
    project_id: project_id ?? null,
    status
  });

  const created = db
    .prepare(
      `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, status, created_at
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
    .prepare(`SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, status, created_at FROM transactions WHERE id = ?`)
    .get(id) as TransactionRow;

  res.json(updated);
});

transactionsRouter.delete("/:id", (req, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as TransactionRow | undefined;
  if (!tx) return res.status(404).json({ error: "Not found" });

  let canDelete = false;

  // 1. Creator can always delete their own
  if (tx.user_id === userId) {
    canDelete = true;
  } else if (tx.project_id) {
    // 2. Project owner can delete any transaction in the project
    const project = db.prepare("SELECT user_id FROM projects WHERE id = ?").get(tx.project_id) as { user_id: number } | undefined;
    if (project && project.user_id === userId) {
      canDelete = true;
    }
  }

  if (!canDelete) {
    return res.status(403).json({ error: "Permission denied. You can only delete your own transactions unless you are the project owner." });
  }

  db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
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
      WHERE user_id = ? AND status = 'approved'
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
      WHERE user_id = ? AND type = 'income' AND is_initial = 0 AND status = 'approved' AND COALESCE(category, '') != 'Transfer'${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  const expense = db
    .prepare(
      `SELECT category, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND is_initial = 0 AND status = 'approved' AND COALESCE(category, '') != 'Transfer'${whereClause}
      GROUP BY category`
    )
    .all(...params) as { category: string; total: number }[];

  res.json({ income, expense });
});

// Approvals System
transactionsRouter.get("/approvals/pending", (req, res) => {
  const userId = req.user!.id;
  // Get pending transactions for projects owned by the user
  const rows = db.prepare(`
    SELECT t.*, u.username as creator_name, p.name as project_name
    FROM transactions t
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON t.user_id = u.id
    WHERE p.user_id = ? AND t.status = 'pending'
    ORDER BY t.created_at DESC
  `).all(userId) as (TransactionRow & { creator_name: string, project_name: string })[];

  res.json(rows);
});

transactionsRouter.patch("/:id/approve", (req, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);

  const tx = db.prepare(`
    SELECT t.*, p.user_id as owner_id
    FROM transactions t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(id) as (TransactionRow & { owner_id: number }) | undefined;

  if (!tx || tx.owner_id !== userId) {
    return res.status(403).json({ error: "Only project owner can approve" });
  }

  db.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(id);
  res.json({ message: "Transaction approved" });
});

transactionsRouter.patch("/:id/reject", (req, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);

  const tx = db.prepare(`
    SELECT t.*, p.user_id as owner_id
    FROM transactions t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(id) as (TransactionRow & { owner_id: number }) | undefined;

  if (!tx || tx.owner_id !== userId) {
    return res.status(403).json({ error: "Only project owner can reject" });
  }

  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  res.json({ message: "Transaction rejected" });
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
