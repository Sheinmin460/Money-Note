export type TransactionType = "income" | "expense";

export type PaymentMethod = "Cash" | "Bank" | "Wallet" | "Card";

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category: string | null;
  payment_method: string | null;
  note: string | null;
  date: string; // YYYY-MM-DD
  is_initial?: boolean;
  created_at: string;
};

export type TransactionCreate = {
  type: TransactionType;
  amount: number;
  category?: string | null;
  payment_method?: PaymentMethod | null;
  note?: string | null;
  date: string;
  is_initial?: boolean;
};

export type TransactionUpdate = Partial<TransactionCreate>;
