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
  user_id: number;
  status: "approved" | "pending";
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
  user_id: number;
  budget_limit: number;
  created_at: string;
  owner_username?: string;
  owner_email?: string;
  is_owner?: boolean;
};

export type ProjectCollaborator = { id: number; username: string; email: string; transaction_limit: number };

export type ProjectDetail = Project & {
  income: number;
  expense: number;
  profit: number;
  transactions: (Transaction & { user_id: number })[];
  collaborators: ProjectCollaborator[];
};

export type ApprovalRequest = Transaction & {
  creator_name: string;
  project_name: string;
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
