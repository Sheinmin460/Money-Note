import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Project, Transaction, TransactionCreate, ApprovalRequest } from "../lib/types";
import { formatCurrency } from "../lib/format";
import { Link } from "react-router-dom";
import { Modal } from "../components/Modal";
import { SummaryCard } from "../components/SummaryCard";
import { TransactionForm } from "../components/TransactionForm";
import { TransactionTable } from "../components/TransactionTable";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { CardSkeleton, Skeleton, TableRowSkeleton } from "../components/Skeleton";

export default function HomePage() {
    const [items, setItems] = useState<Transaction[]>([]);
    const [balances, setBalances] = useState<{ payment_method: string; balance: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Transaction | undefined>(undefined);
    const [busyId, setBusyId] = useState<number | null>(null);

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tx?: Transaction }>({ open: false });
    const [invitations, setInvitations] = useState<Project[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

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

    const refresh = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const [txData, balanceData, projects, approvals] = await Promise.all([
                api.listTransactions(),
                api.getBalances(),
                api.listProjects(),
                api.listPendingApprovals()
            ]);
            setItems(txData);
            setBalances(balanceData);
            setPendingApprovals(approvals);

            const acknowledged = JSON.parse(localStorage.getItem('mn_ack_invites') || '[]');
            const newInvites = projects.filter(p => !p.is_owner && !acknowledged.includes(p.id));
            setInvitations(newInvites);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, []);

    const ackInvite = useCallback((id: number) => {
        const acknowledged = JSON.parse(localStorage.getItem('mn_ack_invites') || '[]');
        localStorage.setItem('mn_ack_invites', JSON.stringify([...acknowledged, id]));
        setInvitations(prev => prev.filter(p => p.id !== id));
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const openCreate = useCallback(() => {
        setEditing(undefined);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((tx: Transaction) => {
        setEditing(tx);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => setModalOpen(false), []);

    const submit = useCallback(async (payload: TransactionCreate) => {
        setError(null);
        try {
            if (editing) {
                setBusyId(editing.id);
                const updated = await api.updateTransaction(editing.id, payload);
                setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            } else {
                const created = await api.createTransaction(payload);
                if (created.status === 'pending') {
                    setError("Transaction exceeds limit and is pending admin approval.");
                }
                setItems((prev) => [created, ...prev]);
            }
            setModalOpen(false);
            void refresh();
        } finally {
            setBusyId(null);
        }
    }, [editing, refresh]);

    const handleDeleteConfirm = useCallback(async () => {
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
    }, [confirmDelete.tx, refresh]);

    const initiateDelete = useCallback((tx: Transaction) => {
        setConfirmDelete({ open: true, tx });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header onAddTransaction={openCreate} />

            <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
                {error ? (
                    <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200 animate-shake">
                        {error}
                    </div>
                ) : null}

                {pendingApprovals.length > 0 && (
                    <div className="rounded-2xl bg-amber-600 p-4 text-white shadow-lg animate-in slide-in-from-top duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-white/20 p-2 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-amber-50">Admin Approval Required</p>
                                    <p className="text-xs text-amber-100 font-medium">You have {pendingApprovals.length} transaction{pendingApprovals.length > 1 ? 's' : ''} waiting for your approval.</p>
                                </div>
                            </div>
                            <Link
                                to="/projects"
                                className="rounded-xl bg-white px-4 py-2 text-xs font-black text-amber-600 hover:bg-amber-50 transition-all shadow-md active:scale-95"
                            >
                                View Projects
                            </Link>
                        </div>
                    </div>
                )}

                {invitations.length > 0 && (
                    <div className="space-y-3">
                        {invitations.map(p => (
                            <div key={p.id} className="flex items-center justify-between rounded-2xl bg-indigo-600 p-4 text-white shadow-lg animate-in slide-in-from-top duration-500">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-white/20 p-2 text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-50">New Project Invitation!</p>
                                        <p className="text-xs text-indigo-100 italic">You've been invited to collab on <span className="font-bold underline">"{p.name}"</span> by {p.owner_username}.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => ackInvite(p.id)}
                                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20 transition-all text-white"
                                    >
                                        Later
                                    </button>
                                    <Link
                                        to={`/projects/${p.id}`}
                                        onClick={() => ackInvite(p.id)}
                                        className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                                    >
                                        View Project
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
                            <SummaryCard label="Profit" value={formatCurrency(totals.profit)} tone="blue" />
                            <SummaryCard label="Balance" value={formatCurrency(totals.balance)} tone="indigo" />
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
                                onDelete={initiateDelete}
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
