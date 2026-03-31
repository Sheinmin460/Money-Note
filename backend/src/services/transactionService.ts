import { db, type TransactionRow } from "../db/index.js";

export const transactionService = {
  listTransactions(userId: number): TransactionRow[] {
    return db
      .prepare(
        `SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, transfer_id, status, created_at
         FROM transactions
         WHERE user_id = ? AND is_initial = 0 AND COALESCE(category, '') != 'Transfer'
         ORDER BY date DESC, id DESC`
      )
      .all(userId) as TransactionRow[];
  },

  getTransaction(id: number, userId?: number): TransactionRow | undefined {
    let query = "SELECT * FROM transactions WHERE id = ?";
    const params: any[] = [id];
    if (userId) {
      query += " AND user_id = ?";
      params.push(userId);
    }
    return db.prepare(query).get(...params) as TransactionRow | undefined;
  },

  createTransaction(data: {
    user_id: number;
    type: "income" | "expense";
    amount: number;
    category: string;
    payment_method?: string | null;
    note?: string | null;
    date: string;
    is_initial?: boolean;
    project_id?: number | null;
    status?: "approved" | "pending";
  }): TransactionRow {
    const stmt = db.prepare(
      `INSERT INTO transactions (user_id, type, amount, category, payment_method, note, date, is_initial, project_id, status)
       VALUES (@user_id, @type, @amount, @category, @payment_method, @note, @date, @is_initial, @project_id, @status)`
    );
    const info = stmt.run({
      ...data,
      is_initial: data.is_initial ? 1 : 0,
      payment_method: data.payment_method ?? null,
      note: data.note ?? null,
      project_id: data.project_id ?? null,
      status: data.status ?? 'approved'
    });

    return this.getTransaction(Number(info.lastInsertRowid))!;
  },

  updateTransaction(id: number, userId: number, patch: any): TransactionRow {
    const fields: string[] = [];
    const params: Record<string, any> = { id, user_id: userId };

    const updatableFields = [
      "type", "amount", "category", "payment_method", "note", "date", "is_initial", "project_id"
    ];

    for (const field of updatableFields) {
      if (patch[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        params[field] = field === "is_initial" ? (patch[field] ? 1 : 0) : patch[field];
      }
    }

    if (fields.length > 0) {
      db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = @id AND user_id = @user_id`).run(params);
    }

    return this.getTransaction(id)!;
  },

  deleteTransaction(id: number, userId: number) {
    return db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(id, userId);
  },

  getBalances(userId: number) {
    return db.prepare(`
      SELECT 
        w.name as payment_method,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as balance
      FROM wallets w
      LEFT JOIN transactions t ON w.name = t.payment_method AND w.user_id = t.user_id AND t.status = 'approved'
      WHERE w.user_id = ?
      GROUP BY w.name
    `).all(userId);
  },

  getCategoryTotals(userId: number, from?: string, to?: string, wallets?: string[]) {
    let query = `
      SELECT type, category, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND is_initial = 0 AND COALESCE(category, '') != 'Transfer' AND status = 'approved'
    `;
    const params: any[] = [userId];

    if (from) {
      query += " AND date >= ?";
      params.push(from);
    }
    if (to) {
      query += " AND date <= ?";
      params.push(to);
    }
    if (wallets && wallets.length > 0) {
      query += ` AND payment_method IN (${wallets.map(() => '?').join(',')})`;
      params.push(...wallets);
    }

    query += " GROUP BY type, category ORDER BY total DESC";

    const rows = db.prepare(query).all(...params) as { type: string, category: string, total: number }[];
    
    return {
      income: rows.filter(r => r.type === 'income').map(r => ({ category: r.category, total: r.total })),
      expense: rows.filter(r => r.type === 'expense').map(r => ({ category: r.category, total: r.total }))
    };
  },

  listTransfers(userId: number) {
    return db.prepare(`
      SELECT 
        t1.transfer_id,
        t1.date,
        t1.amount,
        t1.payment_method as from_wallet,
        t2.payment_method as to_wallet,
        t1.note
      FROM transactions t1
      JOIN transactions t2 ON t1.transfer_id = t2.transfer_id AND t1.id != t2.id
      WHERE t1.user_id = ? AND t1.type = 'expense' AND t1.transfer_id IS NOT NULL
      ORDER BY t1.date DESC, t1.id DESC
    `).all(userId);
  },

  listPendingApprovals(userId: number) {
    return db.prepare(`
      SELECT t.*, p.name as project_name, u.username as requester_name
      FROM transactions t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE p.user_id = ? AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `).all(userId);
  },

  approveTransaction(id: number, userId: number) {
    const tx = db.prepare(`
      SELECT t.*, p.user_id as project_owner_id
      FROM transactions t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id) as any;

    if (!tx || tx.project_owner_id !== userId) {
      throw new Error("Not authorized to approve this transaction");
    }

    db.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(id);
  },

  rejectTransaction(id: number, userId: number) {
    const tx = db.prepare(`
      SELECT t.*, p.user_id as project_owner_id
      FROM transactions t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id) as any;

    if (!tx || tx.project_owner_id !== userId) {
      throw new Error("Not authorized to reject this transaction");
    }

    db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  }
};
