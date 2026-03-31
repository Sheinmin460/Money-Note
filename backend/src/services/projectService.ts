import { db, type ProjectRow, type TransactionRow, type UserRow } from "../db/index.js";

export const projectService = {
  getProjectWithAccess(userId: number, projectId: number) {
    return db.prepare(`
        SELECT p.*, u.username as owner_username, u.email as owner_email, pc.transaction_limit as member_limit
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = ?
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    `).get(userId, projectId, userId, userId) as (ProjectRow & { member_limit: number | null }) | undefined;
  },

  listProjects(userId: number) {
    return db.prepare(`
        SELECT p.*, u.username as owner_username, u.email as owner_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.user_id = ? OR pc.user_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `).all(userId, userId) as ProjectRow[];
  },

  getProjectComparison(userId: number) {
    const rows = db.prepare(`
        SELECT 
            p.id, 
            p.name,
            COALESCE(SUM(CASE WHEN t.type = 'income' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as expense
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        LEFT JOIN transactions t ON p.id = t.project_id
        WHERE p.user_id = ? OR pc.user_id = ?
        GROUP BY p.id
        ORDER BY p.name ASC
    `).all(userId, userId) as { id: number, name: string, income: number, expense: number }[];

    return rows.map(r => ({
        ...r,
        profit: r.income - r.expense
    }));
  },

  getProjectDetails(userId: number, projectId: number) {
    const project = this.getProjectWithAccess(userId, projectId);
    if (!project) return null;

    const transactions = db.prepare(`
        SELECT id, type, amount, category, payment_method, note, date, is_initial, project_id, user_id, status, created_at
        FROM transactions
        WHERE project_id = ?
        ORDER BY date DESC, id DESC
    `).all(projectId) as (TransactionRow & { user_id: number })[];

    const activeTransactions = transactions.filter(t => t.status === 'approved');
    const income = activeTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = activeTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const collaborators = db.prepare(`
        SELECT u.id, u.username, u.email, pc.transaction_limit
        FROM users u
        JOIN project_collaborators pc ON u.id = pc.user_id
        WHERE pc.project_id = ?
    `).all(projectId) as (Omit<UserRow, "password_hash"> & { transaction_limit: number })[];

    return {
        ...project,
        is_owner: project.user_id === userId,
        income,
        expense,
        profit: income - expense,
        transactions,
        collaborators
    };
  },

  createProject(userId: number, name: string, budgetLimit: number) {
    const info = db.prepare("INSERT INTO projects (user_id, name, budget_limit) VALUES (?, ?, ?)").run(userId, name, budgetLimit);
    return db.prepare("SELECT id, name, budget_limit, created_at FROM projects WHERE id = ?").get(info.lastInsertRowid) as ProjectRow;
  },

  updateProject(id: number, userId: number, updates: { name?: string, budget_limit?: number }) {
    if (updates.name) {
        db.prepare("UPDATE projects SET name = ? WHERE id = ? AND user_id = ?").run(updates.name, id, userId);
    }
    if (updates.budget_limit !== undefined) {
        db.prepare("UPDATE projects SET budget_limit = ? WHERE id = ? AND user_id = ?").run(updates.budget_limit, id, userId);
    }
  },

  deleteProject(id: number, userId: number) {
    return db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId);
  },

  addCollaborator(projectId: number, targetUserId: number, transactionLimit: number) {
    return db.prepare("INSERT INTO project_collaborators (project_id, user_id, transaction_limit) VALUES (?, ?, ?)").run(projectId, targetUserId, transactionLimit);
  },

  updateCollaboratorLimit(projectId: number, targetUserId: number, transactionLimit: number) {
    return db.prepare("UPDATE project_collaborators SET transaction_limit = ? WHERE project_id = ? AND user_id = ?")
        .run(transactionLimit, projectId, targetUserId);
  },

  removeCollaborator(projectId: number, targetUserId: number) {
    return db.prepare("DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?").run(projectId, targetUserId);
  },

  getProjectExpense(projectId: number): number {
    const row = db.prepare(`
      SELECT SUM(amount) as total_expense
      FROM transactions
      WHERE project_id = ? AND type = 'expense' AND status = 'approved'
    `).get(projectId) as { total_expense: number | null };
    return row.total_expense ?? 0;
  },

  checkProjectStatus(userId: number, projectId: number, amount: number, type: "income" | "expense"): "approved" | "pending" | { error: string } {
    const project = this.getProjectWithAccess(userId, projectId);
    if (!project) return { error: "Access denied to this project" };

    const isOwner = project.user_id === userId;
    if (isOwner) return "approved";

    // Check member transaction limit
    if (project.member_limit !== null && project.member_limit > 0 && amount > project.member_limit) {
      return "pending";
    }

    // Check project budget limit
    if (project.budget_limit > 0 && type === 'expense') {
      const currentExpense = this.getProjectExpense(projectId);
      if (currentExpense + amount > project.budget_limit) {
        return "pending";
      }
    }

    return "approved";
  }
};
