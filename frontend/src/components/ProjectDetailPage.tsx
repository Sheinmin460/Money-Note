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
import { CardSkeleton, Skeleton, TableRowSkeleton } from "../components/Skeleton";
import { AddCollaboratorModal } from "../components/AddCollaboratorModal";

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [editing, setEditing] = useState<Transaction | undefined>(undefined);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tx?: Transaction }>({ open: false });
    const [confirmRemoveCollab, setConfirmRemoveCollab] = useState<{ open: boolean; userId?: number }>({ open: false });

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

    const handleRemoveCollab = async () => {
        const targetUserId = confirmRemoveCollab.userId;
        if (!targetUserId || !id) return;

        setConfirmRemoveCollab({ open: false });
        setError(null);
        try {
            await api.removeCollaborator(Number(id), targetUserId);
            void refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove collaborator.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header onAddTransaction={openCreate} backTo="/projects" />

            <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
                {loading && !project ? (
                    <>
                        <section className="space-y-2">
                            <Skeleton className="h-9 w-1/3" />
                            <Skeleton className="h-4 w-24" />
                        </section>
                        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
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
                ) : project ? (
                    <>
                        <section className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                                    {!project.is_owner && (
                                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-600 uppercase tracking-tighter ring-1 ring-indigo-200">
                                            Collaborator
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {project.is_owner ? "Project Overview" : `Shared by ${project.owner_username}`}
                                </div>
                            </div>
                            {project.is_owner && (
                                <button
                                    onClick={() => setInviteOpen(true)}
                                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-indigo-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-indigo-300"
                                >
                                    Invite Collaborator
                                </button>
                            )}
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

                        {project.collaborators.length > 0 && (
                            <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                                    <div className="text-sm font-black text-slate-900 uppercase tracking-widest">Collaborators</div>
                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                                        {project.collaborators.length} Members
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    {project.collaborators.map((collab) => (
                                        <div key={collab.id} className="flex items-center gap-3 group">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 ring-2 ring-white">
                                                {collab.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{collab.username}</div>
                                                <div className="text-xs text-slate-500">{collab.email}</div>
                                            </div>
                                            {project.is_owner && (
                                                <button
                                                    onClick={() => setConfirmRemoveCollab({ open: true, userId: collab.id })}
                                                    className="ml-2 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                                                    title="Remove collaborator"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

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
                                isProjectOwner={project.is_owner}
                                busyId={busyId}
                            />
                        </section>
                    </>
                ) : null}
            </main>

            <Modal open={modalOpen} title={editing ? "Edit Transaction" : "Add Transaction"} onClose={() => setModalOpen(false)}>
                <TransactionForm
                    initial={editing ? { ...editing, project_id: Number(id) } : undefined}
                    onSubmit={submit}
                    onCancel={() => setModalOpen(false)}
                    busy={busyId !== null}
                    fixedProjectId={Number(id)}
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

            <ConfirmationModal
                open={confirmRemoveCollab.open}
                title="Remove Collaborator"
                message="Are you sure you want to remove this collaborator? They will lose access to this project."
                confirmLabel="Remove"
                cancelLabel="Keep"
                variant="danger"
                onConfirm={handleRemoveCollab}
                onCancel={() => setConfirmRemoveCollab({ open: false })}
            />

            <AddCollaboratorModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                projectId={Number(id)}
                onSuccess={refresh}
            />

            <Footer />
        </div>
    );
}
