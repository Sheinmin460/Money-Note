import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware.js";
import { transactionService } from "../services/transactionService.js";
import { walletService } from "../services/walletService.js";
import { projectService } from "../services/projectService.js";

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
  try {
    const userId = req.user!.id;
    const rows = transactionService.listTransactions(userId);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to list transactions" });
  }
});

transactionsRouter.get("/balances", (req, res) => {
  try {
    const userId = req.user!.id;
    const balances = transactionService.getBalances(userId);
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: "Failed to get balances" });
  }
});

transactionsRouter.get("/category-totals", (req, res) => {
  try {
    const userId = req.user!.id;
    const { from, to, wallets } = req.query;
    const walletList = typeof wallets === 'string' ? wallets.split(',') : undefined;
    
    const totals = transactionService.getCategoryTotals(
      userId, 
      from as string | undefined, 
      to as string | undefined, 
      walletList
    );
    res.json(totals);
  } catch (error) {
    res.status(500).json({ error: "Failed to get category totals" });
  }
});

transactionsRouter.get("/transfers", (req, res) => {
  try {
    const userId = req.user!.id;
    const transfers = transactionService.listTransfers(userId);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: "Failed to list transfers" });
  }
});

transactionsRouter.get("/approvals/pending", (req, res) => {
  try {
    const userId = req.user!.id;
    const pending = transactionService.listPendingApprovals(userId);
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: "Failed to list pending approvals" });
  }
});

transactionsRouter.patch("/:id/approve", (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    transactionService.approveTransaction(id, userId);
    res.json({ message: "Transaction approved" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not authorized")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to approve transaction" });
  }
});

transactionsRouter.patch("/:id/reject", (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    transactionService.rejectTransaction(id, userId);
    res.json({ message: "Transaction rejected" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not authorized")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to reject transaction" });
  }
});

transactionsRouter.post("/", (req, res) => {
  try {
    const userId = req.user!.id;
    const parsed = transactionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { type, amount, category, payment_method, note, date, is_initial, project_id } = parsed.data;
    let status: 'approved' | 'pending' = 'approved';

    // Verify project access and check limits if provided
    if (project_id) {
      const result = projectService.checkProjectStatus(userId, project_id, amount, type);
      if (typeof result === 'object' && 'error' in result) {
        return res.status(403).json({ error: result.error });
      }
      status = result;
    }

    // Balance check for wallets (only if approved)
    if (status === 'approved' && type === "expense" && payment_method) {
      const balanceCheck = walletService.checkBalance(userId, amount, payment_method);
      if (!balanceCheck.success) {
        return res.status(400).json({ error: balanceCheck.error });
      }
    }

    const created = transactionService.createTransaction({
      user_id: userId,
      type,
      amount,
      category,
      payment_method,
      note,
      date,
      is_initial,
      project_id,
      status
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

transactionsRouter.put("/:id", (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const parsed = transactionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const existingTx = transactionService.getTransaction(id, userId);
    if (!existingTx) return res.status(404).json({ error: "Not found" });

    const patch = parsed.data;
    const newType = patch.type ?? existingTx.type;
    const newAmount = patch.amount ?? existingTx.amount;
    const newMethod = patch.payment_method ?? existingTx.payment_method;

    if (newType === "expense" && newMethod) {
      const balanceCheck = walletService.checkBalance(userId, newAmount, newMethod, id);
      if (!balanceCheck.success) {
        return res.status(400).json({ error: balanceCheck.error });
      }
    }

    const updated = transactionService.updateTransaction(id, userId, patch);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

transactionsRouter.delete("/:id", (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const result = transactionService.deleteTransaction(id, userId);
    if (result.changes === 0) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});
