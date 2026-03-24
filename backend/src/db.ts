// @ts-ignore
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Delete old DB to start fresh with new schema (user_id support)
// NOTE: Comment this out after first run if you want to preserve data
/*
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}
*/

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_limit REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_credit INTEGER DEFAULT 0,
  credit_limit REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('income','expense')) NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  payment_method TEXT,
  note TEXT,
  date TEXT NOT NULL,
  is_initial INTEGER DEFAULT 0,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  transfer_id TEXT,
  status TEXT DEFAULT 'approved',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_collaborators (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_limit REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);
`);

// Schema updates for existing databases
try { db.exec("ALTER TABLE projects ADD COLUMN budget_limit REAL DEFAULT 0"); } catch (e) { }
try { db.exec("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'approved'"); } catch (e) { }
try { db.exec("ALTER TABLE project_collaborators ADD COLUMN transaction_limit REAL DEFAULT 0"); } catch (e) { }

export type UserRow = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type TransactionRow = {
  id: number;
  user_id: number;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  payment_method: string | null;
  note: string | null;
  date: string;
  is_initial: number;
  project_id: number | null;
  transfer_id: string | null;
  status: "approved" | "pending";
  created_at: string;
};

export type ProjectRow = {
  id: number;
  user_id: number;
  name: string;
  budget_limit: number;
  created_at: string;
  owner_username?: string;
  owner_email?: string;
};

export type WalletRow = {
  id: number;
  user_id: number;
  name: string;
  is_credit: number;
  credit_limit: number;
  created_at: string;
};

export function getWalletBalance(userId: number, name: string): number {
  const row = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
    FROM transactions 
    WHERE user_id = ? AND payment_method = ?
  `).get(userId, name) as { balance: number | null };
  return row.balance ?? 0;
}

export function isCreditWallet(userId: number, name: string): boolean {
  const row = db.prepare("SELECT is_credit FROM wallets WHERE user_id = ? AND name = ?").get(userId, name) as { is_credit: number } | undefined;
  return row?.is_credit === 1;
}

export function getWalletCreditLimit(userId: number, name: string): number {
  const row = db.prepare("SELECT credit_limit FROM wallets WHERE user_id = ? AND name = ?").get(userId, name) as { credit_limit: number } | undefined;
  return row?.credit_limit || 0;
}
