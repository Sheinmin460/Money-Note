import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('income','expense')) NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  payment_method TEXT,
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

export type TransactionRow = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  payment_method: string | null;
  note: string | null;
  date: string;
  created_at: string;
};

