import { db, type WalletRow } from "../db/index.js";
import { randomUUID } from "crypto";

export const walletService = {
  getWallet(userId: number, name: string) {
    return db.prepare("SELECT * FROM wallets WHERE user_id = ? AND name = ?").get(userId, name) as WalletRow | undefined;
  },

  listWallets(userId: number) {
    return db.prepare("SELECT * FROM wallets WHERE user_id = ? ORDER BY name").all(userId) as WalletRow[];
  },

  createWallet(userId: number, name: string, isCredit: boolean, creditLimit: number) {
    const info = db.prepare("INSERT INTO wallets (user_id, name, is_credit, credit_limit) VALUES (?, ?, ?, ?)").run(
        userId,
        name,
        isCredit ? 1 : 0,
        creditLimit || 0
    );
    return db.prepare("SELECT * FROM wallets WHERE id = ?").get(info.lastInsertRowid) as WalletRow;
  },

  updateWallet(userId: number, oldName: string, updates: { name?: string, is_credit?: boolean, credit_limit?: number }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) { fields.push("name = ?"); params.push(updates.name); }
    if (updates.is_credit !== undefined) { fields.push("is_credit = ?"); params.push(updates.is_credit ? 1 : 0); }
    if (updates.credit_limit !== undefined) { fields.push("credit_limit = ?"); params.push(updates.credit_limit); }

    if (fields.length === 0) return null;

    params.push(oldName, userId);
    
    return db.transaction(() => {
        const info = db.prepare(`UPDATE wallets SET ${fields.join(", ")} WHERE name = ? AND user_id = ?`).run(...params);
        if (info.changes === 0) throw new Error("Wallet not found");

        if (updates.name && updates.name !== oldName) {
            db.prepare("UPDATE transactions SET payment_method = ? WHERE payment_method = ? AND user_id = ?").run(updates.name, oldName, userId);
        }
        return db.prepare("SELECT * FROM wallets WHERE name = ? AND user_id = ?").get(updates.name || oldName, userId) as WalletRow;
    })();
  },

  deleteWallet(userId: number, name: string) {
    const balance = this.getWalletBalance(userId, name);
    if (Math.abs(balance) > 0.01) {
        throw new Error(`Cannot delete wallet with non-zero balance (${balance.toFixed(2)})`);
    }

    const info = db.prepare("DELETE FROM wallets WHERE name = ? AND user_id = ?").run(name, userId);
    if (info.changes === 0) throw new Error("Wallet not found");
  },

  performTransfer(userId: number, from: string, to: string, amount: number, date: string, note?: string) {
    const fromWallet = this.getWallet(userId, from);
    const toWallet = this.getWallet(userId, to);

    if (!fromWallet || !toWallet) {
        throw new Error("One or both wallets do not exist");
    }

    const balanceCheck = this.checkBalance(userId, amount, from);
    if (!balanceCheck.success) {
        throw new Error(balanceCheck.error);
    }

    return db.transaction(() => {
        const transferId = randomUUID();
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, category, payment_method, note, date, transfer_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, "expense", amount, "Transfer", from, note || `Transfer to ${to}`, date, transferId);

        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, category, payment_method, note, date, transfer_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, "income", amount, "Transfer", to, note || `Transfer from ${from}`, date, transferId);
    })();
  },

  getWalletBalance(userId: number, name: string, excludeTransactionId?: number): number {
    let query = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
      FROM transactions 
      WHERE user_id = ? AND payment_method = ? AND status = 'approved'
    `;
    
    const params: any[] = [userId, name];
    if (excludeTransactionId) {
      query += " AND id != ?";
      params.push(excludeTransactionId);
    }

    const row = db.prepare(query).get(...params) as { balance: number | null };
    return row.balance ?? 0;
  },

  checkBalance(userId: number, amount: number, paymentMethod: string, excludeTransactionId?: number) {
    const wallet = this.getWallet(userId, paymentMethod);
    if (!wallet) return { success: true };

    const currentBalance = this.getWalletBalance(userId, paymentMethod, excludeTransactionId);

    if (wallet.is_credit === 0) {
      if (currentBalance < amount) {
        return { 
          success: false, 
          error: `Insufficient funds in ${paymentMethod}. Current balance: ${currentBalance.toFixed(2)}` 
        };
      }
    } else {
      if (currentBalance - amount < -wallet.credit_limit) {
        return { 
          success: false, 
          error: `Transaction exceeds credit limit for ${paymentMethod}. Current balance: ${currentBalance.toFixed(2)}, Credit limit: ${wallet.credit_limit.toFixed(2)}` 
        };
      }
    }

    return { success: true };
  }
};
