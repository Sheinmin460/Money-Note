import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { Transaction, TransactionCreate } from "./lib/types";
import { formatCurrency } from "./lib/format";
import { Modal } from "./components/Modal";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionTable } from "./components/TransactionTable";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { CardSkeleton, Skeleton, TableRowSkeleton } from "./components/Skeleton";

export default function App() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<{ payment_method: string; balance: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tx?: Transaction }>({ open: false });

  const totals = useMemo(() => {
    const income = items
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = items
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Overall balance is the sum of all wallet balances
    const overallBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    const profit = income - expense;

    return { income, expense, profit, balance: overallBalance };
  }, [items, balances]);

  const refresh = async () => {
    setError(null);
    setLoading(true);
    try {
      const [txData, balanceData] = await Promise.all([
        api.listTransactions(),
        api.getBalances()
      ]);
      setItems(txData);
      setBalances(balanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
      void refresh();
    } catch (err) {
      // Submission errors are handled by TransactionForm, so we don't setError(err.message) here
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    const tx = confirmDelete.tx;
    if (!tx) return;

    setConfirmDelete({ open: false });
    setError(null);
    setBusyId(tx.id);
    try {
      await api.deleteTransaction(tx.id);
      setItems((prev) => prev.filter((t) => t.id !== tx.id));
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header onAddTransaction={openCreate} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {error ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200 animate-shake">
            {error}
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <>
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
            </section>
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                {[1, 2, 3, 4, 5].map((i) => <TableRowSkeleton key={i} />)}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Income" value={formatCurrency(totals.income)} tone="green" />
              <SummaryCard label="Expense" value={formatCurrency(totals.expense)} tone="red" />
              <SummaryCard label="Profit" value={formatCurrency(totals.profit)} tone={totals.profit >= 0 ? "green" : "red"} />
              <SummaryCard label="Balance" value={formatCurrency(totals.balance)} tone="blue" />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                    {items.length}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {loading ? "Syncing..." : "All Up to Date"}
                </div>
              </div>
              <TransactionTable
                items={items}
                onEdit={openEdit}
                onDelete={(tx) => setConfirmDelete({ open: true, tx })}
                busyId={busyId}
              />
            </section>
          </>
        )}
      </main>

      <ConfirmationModal
        open={confirmDelete.open}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete({ open: false })}
      />

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
