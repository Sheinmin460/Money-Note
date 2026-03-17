import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { Transaction, TransactionCreate } from "./lib/types";
import { formatCurrency } from "./lib/format";
import { Link } from "react-router-dom";
import { Button } from "./components/Button";
import { Modal } from "./components/Modal";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionTable } from "./components/TransactionTable";
import { Footer } from "./components/Footer";

export default function App() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [busyId, setBusyId] = useState<number | null>(null);

  const totals = useMemo(() => {
    const income = items
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = items
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [items]);

  const refresh = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.listTransactions();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const submit = async (payload: TransactionCreate) => {
    setError(null);
    try {
      if (editing) {
        setBusyId(editing.id);
        const updated = await api.updateTransaction(editing.id, payload);
        setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await api.createTransaction(payload);
        setItems((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (tx: Transaction) => {
    const ok = window.confirm("Delete this transaction?");
    if (!ok) return;

    setError(null);
    setBusyId(tx.id);
    try {
      await api.deleteTransaction(tx.id);
      setItems((prev) => prev.filter((t) => t.id !== tx.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Income Expense Tracker</div>
            <div className="text-sm text-slate-500">Track cash flow with clarity.</div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Button onClick={openCreate}>Add Transaction</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {error ? (
          <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard label="Total Income" value={formatCurrency(totals.income)} tone="green" />
          <SummaryCard label="Total Expense" value={formatCurrency(totals.expense)} tone="red" />
          <SummaryCard label="Balance" value={formatCurrency(totals.balance)} tone="blue" />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Transactions</div>
            <div className="text-sm text-slate-500">
              {loading ? "Loading…" : `${items.length} total`}
            </div>
          </div>
          <TransactionTable items={items} onEdit={openEdit} onDelete={onDelete} busyId={busyId} />
        </section>
      </main>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Transaction" : "Add Transaction"}
        onClose={closeModal}
      >
        <TransactionForm
          initial={editing}
          onSubmit={submit}
          onCancel={closeModal}
          busy={busyId !== null}
        />
      </Modal>

      <Footer />
    </div>
  );
}
