import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware.js";
import { walletService } from "../services/walletService.js";

export const walletsRouter = Router();
walletsRouter.use(requireAuth);

const walletCreateSchema = z.object({
    name: z.string().trim().min(1).max(50),
    is_credit: z.boolean().optional(),
    credit_limit: z.coerce.number().min(0).optional()
});

const transferSchema = z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    amount: z.number().positive().finite(),
    date: z.string().min(4),
    note: z.string().optional()
});

walletsRouter.get("/", (req, res) => {
    try {
        const userId = req.user!.id;
        const wallets = walletService.listWallets(userId);
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: "Failed to list wallets" });
    }
});

walletsRouter.post("/", (req, res) => {
    try {
        const userId = req.user!.id;
        const parsed = walletCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const created = walletService.createWallet(
            userId,
            parsed.data.name,
            !!parsed.data.is_credit,
            parsed.data.credit_limit || 0
        );
        res.status(201).json(created);
    } catch (err) {
        if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: "Wallet already exists" });
        }
        res.status(500).json({ error: "Failed to create wallet" });
    }
});

walletsRouter.put("/:name", (req, res) => {
    try {
        const userId = req.user!.id;
        const { name } = req.params;
        const parsed = walletCreateSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const updated = walletService.updateWallet(userId, name, parsed.data);
        if (!updated) return res.status(400).json({ error: "No fields to update" });

        res.json(updated);
    } catch (err) {
        if (err instanceof Error && err.message === "Wallet not found") {
            return res.status(404).json({ error: "Wallet not found" });
        }
        if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: "Wallet name already taken" });
        }
        res.status(500).json({ error: "Failed to update wallet" });
    }
});

walletsRouter.delete("/:name", (req, res) => {
    try {
        const userId = req.user!.id;
        const { name } = req.params;

        walletService.deleteWallet(userId, name);
        res.status(204).send();
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.includes("non-zero balance")) {
                return res.status(400).json({ error: err.message });
            }
            if (err.message === "Wallet not found") {
                return res.status(404).json({ error: "Wallet not found" });
            }
        }
        res.status(500).json({ error: "Failed to delete wallet" });
    }
});

walletsRouter.post("/transfer", (req, res) => {
    try {
        const userId = req.user!.id;
        const parsed = transferSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const { from, to, amount, date, note } = parsed.data;

        if (from === to) {
            return res.status(400).json({ error: "Source and destination wallets must be different" });
        }

        walletService.performTransfer(userId, from, to, amount, date, note);
        res.status(200).json({ message: "Transfer successful" });
    } catch (err) {
        if (err instanceof Error && (err.message.includes("Insufficient funds") || err.message.includes("exceeds credit limit") || err.message.includes("do not exist"))) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Transfer failed", details: String(err) });
    }
});
