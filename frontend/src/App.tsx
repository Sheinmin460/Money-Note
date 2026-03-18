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
import { ConfirmationModal } from "./components/ConfirmationModal";

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

    return { income, expense, balance: overallBalance };
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
      setError(err instanceof Error ? err.message : "Save failed.");
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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">MoneyNote</div>
              <div className="hidden sm:block text-xs font-bold text-slate-400 uppercase tracking-widest">FinTracker</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/admin">
              <Button variant="outline" className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <Button onClick={openCreate} className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl bg-slate-900 shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {error ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200 animate-shake">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <SummaryCard label="Total Income" value={formatCurrency(totals.income)} tone="green" />
          <SummaryCard label="Total Expense" value={formatCurrency(totals.expense)} tone="red" />
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
              {loading ? "Syncing..." : "All Clear"}
            </div>
          </div>
          <TransactionTable
            items={items}
            onEdit={openEdit}
            onDelete={(tx) => setConfirmDelete({ open: true, tx })}
            busyId={busyId}
          />
        </section>
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
