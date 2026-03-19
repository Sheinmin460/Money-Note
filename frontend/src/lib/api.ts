import type { Transaction, TransactionCreate, TransactionUpdate, Wallet, WalletBalance, TransferLog } from "./types";

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL
  ? String((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL).replace(/\/+$/, "")
  : "";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const url = typeof input === "string" && input.startsWith("/") ? `${API_BASE}${input}` : input;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as Record<string, unknown>).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  // 204 no content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listTransactions(): Promise<Transaction[]> {
    return request<Transaction[]>("/transactions");
  },
  createTransaction(payload: TransactionCreate): Promise<Transaction> {
    return request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateTransaction(id: number, patch: TransactionUpdate): Promise<Transaction> {
    return request<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
  },
  deleteTransaction(id: number): Promise<void> {
    return request<void>(`/transactions/${id}`, { method: "DELETE" });
  },
  getBalances(): Promise<WalletBalance[]> {
    return request<WalletBalance[]>("/transactions/balances");
  },
  listWallets(): Promise<Wallet[]> {
    return request<Wallet[]>("/wallets");
  },

  listTransfers(): Promise<TransferLog[]> {
    return request<TransferLog[]>("/transactions/transfers");
  },

  createWallet(name: string, is_credit?: boolean, credit_limit?: number): Promise<Wallet> {
    return request<Wallet>("/wallets", {
      method: "POST",
      body: JSON.stringify({ name, is_credit, credit_limit })
    });
  },
  updateWallet(oldName: string, data: { name?: string; is_credit?: boolean; credit_limit?: number }): Promise<Wallet> {
    return request<Wallet>(`/wallets/${oldName}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },
  deleteWallet(name: string): Promise<void> {
    return request<void>(`/wallets/${name}`, { method: "DELETE" });
  },
  transferMoney(payload: { from: string; to: string; amount: number; date: string; note?: string }): Promise<{ message: string }> {
    return request<{ message: string }>("/wallets/transfer", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getCategoryTotals(from?: string, to?: string, categories?: string[]): Promise<{ income: { category: string; total: number }[]; expense: { category: string; total: number }[] }> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (categories && categories.length > 0) params.set("categories", categories.join(","));
    return request<{ income: { category: string; total: number }[]; expense: { category: string; total: number }[] }>(`/transactions/category-totals?${params.toString()}`);
  },
  listProjects(): Promise<import("./types").Project[]> {
    return request<import("./types").Project[]>("/projects");
  },
  createProject(name: string): Promise<import("./types").Project> {
    return request<import("./types").Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },
  deleteProject(id: number): Promise<void> {
    return request<void>(`/projects/${id}`, { method: "DELETE" });
  },
  getProjectDetail(id: number): Promise<import("./types").ProjectDetail> {
    return request<import("./types").ProjectDetail>(`/projects/${id}`);
  }
};

