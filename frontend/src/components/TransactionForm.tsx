import { useMemo, useState } from "react";
import type { PaymentMethod, Transaction, TransactionCreate, TransactionType } from "../lib/types";
import { todayISO } from "../lib/format";
import { Button } from "./Button";

const paymentMethods: PaymentMethod[] = ["Cash", "Bank", "Wallet", "Card"];

type FormValues = {
  type: TransactionType;
  amount: string;
  category: string;
  payment_method: PaymentMethod;
  note: string;
  date: string;
};

function toFormValues(tx?: Transaction): FormValues {
  return {
    type: tx?.type ?? "expense",
    amount: tx ? String(tx.amount) : "",
    category: tx?.category ?? "",
    payment_method: (tx?.payment_method as PaymentMethod) ?? "Cash",
    note: tx?.note ?? "",
    date: tx?.date ?? todayISO()
  };
}

export function TransactionForm({
  initial,
  onSubmit,
  onCancel,
  busy
}: {
  initial?: Transaction;
  onSubmit: (payload: TransactionCreate) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const amount = Number(values.amount);
    return values.date.trim().length > 0 && Number.isFinite(amount) && amount > 0;
  }, [values.amount, values.date]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Please provide a valid amount and date.");
      return;
    }

    const amount = Number(values.amount);
    const payload: TransactionCreate = {
      type: values.type,
      amount,
      category: values.category.trim() ? values.category.trim() : null,
      payment_method: values.payment_method,
      note: values.note.trim() ? values.note.trim() : null,
      date: values.date
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      {error ? (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium text-slate-700">Type</div>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={values.type}
            onChange={(e) => setValues((v) => ({ ...v, type: e.target.value as TransactionType }))}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium text-slate-700">Amount</div>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium text-slate-700">Category</div>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            type="text"
            placeholder="e.g. Salary, Food, Rent"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium text-slate-700">Payment Method</div>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={values.payment_method}
            onChange={(e) =>
              setValues((v) => ({ ...v, payment_method: e.target.value as PaymentMethod }))
            }
          >
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 sm:col-span-2">
          <div className="text-sm font-medium text-slate-700">Note (optional)</div>
          <textarea
            className="min-h-[84px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="Add details..."
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium text-slate-700">Date</div>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            type="date"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit || !!busy}>
          {isEdit ? "Save Changes" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}

