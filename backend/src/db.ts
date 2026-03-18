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
  created_at: string;
};

export type ProjectRow = {
  id: number;
  name: string;
  created_at: string;
};

