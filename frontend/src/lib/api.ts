import type { Transaction, TransactionCreate, TransactionUpdate } from "./types";

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
  getBalances(): Promise<{ payment_method: string; balance: number }[]> {
    return request<{ payment_method: string; balance: number }[]>("/transactions/balances");
  },
  getCategoryTotals(from?: string, to?: string): Promise<{ income: { category: string; total: number }[]; expense: { category: string; total: number }[] }> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request<{ income: { category: string; total: number }[]; expense: { category: string; total: number }[] }>(`/transactions/category-totals?${params.toString()}`);
  }
};

