import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { ProjectDetail, Transaction, TransactionCreate } from "../lib/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SummaryCard } from "../components/SummaryCard";
import { TransactionTable } from "../components/TransactionTable";
import { formatCurrency } from "../lib/format";
import { Modal } from "../components/Modal";
import { TransactionForm } from "../components/TransactionForm";
import { ConfirmationModal } from "../components/ConfirmationModal";

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Transaction | undefined>(undefined);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tx?: Transaction }>({ open: false });

    const refresh = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await api.getProjectDetail(Number(id));
            setProject(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load project details.");
            if (err instanceof Error && err.message.includes("not found")) {
                navigate("/projects");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, [id]);

    const openCreate = () => {
        setEditing(undefined);
        setModalOpen(true);
    };

    const openEdit = (tx: Transaction) => {
        setEditing(tx);
        setModalOpen(true);
    };

    const submit = async (payload: TransactionCreate) => {
        setError(null);
        try {
            if (editing) {
                setBusyId(editing.id);
                await api.updateTransaction(editing.id, { ...payload, project_id: Number(id) });
            } else {
                await api.createTransaction({ ...payload, project_id: Number(id) });
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
            void refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed.");
        } finally {
            setBusyId(null);
        }
    };

    if (loading && !project) {
        return (
            <div className="min-h-screen bg-slate-50/50">
                <Header />
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Project...</div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header onAddTransaction={openCreate} backTo="/projects" />

            <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
                <section className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Overview</div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200 animate-shake">
                        {error}
                    </div>
                )}

                <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <SummaryCard label="Project Income" value={formatCurrency(project.income)} tone="green" />
                    <SummaryCard label="Project Expense" value={formatCurrency(project.expense)} tone="red" />
                    <SummaryCard label="Project Profit" value={formatCurrency(project.profit)} tone="blue" />
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Project Transactions</h2>
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                                {project.transactions.length}
                            </span>
                        </div>
                    </div>
                    <TransactionTable
                        items={project.transactions}
                        onEdit={openEdit}
                        onDelete={(tx) => setConfirmDelete({ open: true, tx })}
                        busyId={busyId}
                    />
                </section>
            </main>

            <Modal open={modalOpen} title={editing ? "Edit Transaction" : "Add Transaction"} onClose={() => setModalOpen(false)}>
                <TransactionForm
                    initial={editing ? { ...editing, project_id: Number(id) } : undefined}
                    onSubmit={submit}
                    onCancel={() => setModalOpen(false)}
                    busy={busyId !== null}
                />
            </Modal>

            <ConfirmationModal
                open={confirmDelete.open}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction from this project?"
                confirmLabel="Delete"
                cancelLabel="Keep it"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete({ open: false })}
            />

            <Footer />
        </div>
    );
}
