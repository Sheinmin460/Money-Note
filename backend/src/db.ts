// @ts-ignore
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('income','expense')) NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  payment_method TEXT,
  note TEXT,
  date TEXT NOT NULL,
  is_initial INTEGER DEFAULT 0,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  transfer_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Migration: Add is_initial column if it doesn't exist
try {
  db.prepare("SELECT is_initial FROM transactions LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE transactions ADD COLUMN is_initial INTEGER DEFAULT 0");
}

// Migration: Add project_id column if it doesn't exist
try {
  db.prepare("SELECT project_id FROM transactions LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE transactions ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL");
}

// Migration: Add transfer_id column if it doesn't exist
try {
  db.prepare("SELECT transfer_id FROM transactions LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE transactions ADD COLUMN transfer_id TEXT");
}

// Migration: Populate wallets table if empty
const walletCount = (db.prepare("SELECT COUNT(*) as count FROM wallets").get() as { count: number }).count;
if (walletCount === 0) {
  const defaultWallets = ["Cash", "Bank", "Wallet", "Card"];

  // Also get any existing payment methods used in transactions
  const existingMethods = db.prepare("SELECT DISTINCT payment_method FROM transactions WHERE payment_method IS NOT NULL").all() as { payment_method: string }[];

  const allWallets = new Set([...defaultWallets, ...existingMethods.map(m => m.payment_method)]);

  const insertWallet = db.prepare("INSERT INTO wallets (name) VALUES (?)");
  for (const name of allWallets) {
    try {
      insertWallet.run(name);
    } catch (e) {
      // Ignore duplicates
    }
  }
}

export type TransactionRow = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  payment_method: string | null;
  note: string | null;
  date: string;
  is_initial: number;
  project_id: number | null;
  transfer_id: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: number;
  name: string;
  created_at: string;
};

