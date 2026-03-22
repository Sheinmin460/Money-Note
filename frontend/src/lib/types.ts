export type TransactionType = "income" | "expense";

export type PaymentMethod = string;

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category: string | null;
  payment_method: string | null;
  note: string | null;
  date: string; // YYYY-MM-DD
  is_initial?: boolean;
  project_id?: number | null;
  transfer_id?: string | null;
  created_at?: string;
};

export type TransactionCreate = {
  type: TransactionType;
  amount: number;
  category?: string | null;
  payment_method?: PaymentMethod | null;
  note?: string | null;
  date: string;
  is_initial?: boolean;
  project_id?: number | null;
};

export type TransactionUpdate = Partial<TransactionCreate>;

export type Project = {
  id: number;
  name: string;
  created_at: string;
};

export type ProjectDetail = Project & {
  income: number;
  expense: number;
  profit: number;
  transactions: Transaction[];
};

export type Wallet = {
  id: number;
  name: string;
  is_credit: number;
  credit_limit: number;
  created_at: string;
};

export type WalletBalance = {
  payment_method: string;
  balance: number;
  is_credit: number;
  credit_limit: number;
};

export type TransferLog = {
  transfer_id: string;
  date: string;
  amount: number;
  note: string;
  from_wallet: string;
  to_wallet: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};
