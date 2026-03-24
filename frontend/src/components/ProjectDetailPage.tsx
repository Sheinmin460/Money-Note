import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { ProjectDetail, Transaction, TransactionCreate, ProjectCollaborator } from "../lib/types";
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
import { ProjectModal } from "../components/ProjectModal";
import { EditCollaboratorModal } from "../components/EditCollaboratorModal";

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
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [editCollab, setEditCollab] = useState<{ open: boolean; collaborator?: ProjectCollaborator }>({ open: false });
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tx?: Transaction }>({ open: false });
    const [confirmRemoveCollab, setConfirmRemoveCollab] = useState<{ open: boolean; userId?: number }>({ open: false });
    const [approvingId, setApprovingId] = useState<number | null>(null);

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
                const created = await api.createTransaction({ ...payload, project_id: Number(id) });
                if (created.status === 'pending') {
                    setError("Transaction exceeds limit and is pending admin approval.");
                }
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

    const handleUpdateBudget = async () => {
        void refresh();
    };

    const handleRefresh = () => {
        void refresh();
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

    const handleApprove = async (txId: number) => {
        setApprovingId(txId);
        try {
            await api.approveTransaction(txId);
            void refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Approval failed");
        } finally {
            setApprovingId(null);
        }
    };

    const handleReject = async (txId: number) => {
        setApprovingId(txId);
        try {
            await api.rejectTransaction(txId);
            void refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Rejection failed");
        } finally {
            setApprovingId(null);
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
                            <div className="flex items-center gap-3">
                                {project.is_owner && (
                                    <>
                                        <button
                                            onClick={() => setProjectModalOpen(true)}
                                            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Settings
                                        </button>
                                        <button
                                            onClick={() => setInviteOpen(true)}
                                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
                                        >
                                            Invite
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>

                        {error && (
                            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200 animate-shake">
                                {error}
                            </div>
                        )}

                        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
                            <SummaryCard label="Project Income" value={formatCurrency(project.income)} tone="green" />
                            <SummaryCard label="Project Expense" value={formatCurrency(project.expense)} tone="red" />
                            <SummaryCard label="Project Profit" value={formatCurrency(project.profit)} tone="blue" />
                            <SummaryCard
                                label="Budget"
                                value={project.budget_limit > 0 ? formatCurrency(project.budget_limit - project.expense) : "Unlimited"}
                                tone="indigo"
                            />
                        </section>

                        {project.is_owner && project.transactions.some(t => t.status === 'pending') && (
                            <section className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm ring-1 ring-amber-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-amber-900 leading-tight">Approvals Needed</h3>
                                        <p className="text-amber-700 text-sm font-bold">These transactions exceed set limits and require your review.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {project.transactions.filter(t => t.status === 'pending').map(tx => (
                                        <div key={tx.id} className="bg-white/90 backdrop-blur-sm rounded-xl p-4 ring-1 ring-amber-200 flex flex-col justify-between gap-4 shadow-sm group hover:bg-white transition-all">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                                        {tx.category || "Uncategorized"}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">{tx.date}</span>
                                                </div>
                                                <div className="text-sm font-bold text-slate-800 leading-tight">
                                                    <span className="text-lg font-black text-slate-900">{formatCurrency(tx.amount)}</span> requested {tx.note && `for "${tx.note}"`}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full ring-1 ring-rose-100 uppercase tracking-tighter">
                                                        Exceeds Project limit
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleApprove(tx.id)}
                                                    disabled={approvingId === tx.id}
                                                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-slate-200"
                                                >
                                                    {approvingId === tx.id ? "..." : "Approve"}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(tx.id)}
                                                    disabled={approvingId === tx.id}
                                                    className="flex-1 rounded-xl bg-white py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 active:scale-95"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

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
                                        <div key={collab.id} className="flex items-center justify-between w-full md:w-auto md:min-w-[200px] p-3 rounded-2xl ring-1 ring-slate-100 hover:bg-slate-50 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 ring-2 ring-white">
                                                    {collab.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{collab.username}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        Limit: <span className="text-slate-900">{collab.transaction_limit > 0 ? formatCurrency(collab.transaction_limit) : "Unlimited"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {project.is_owner && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditCollab({ open: true, collaborator: collab })}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                                        title="Edit Limit"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRemoveCollab({ open: true, userId: collab.id })}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                                        title="Remove collaborator"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
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

            {project && (
                <ProjectModal
                    open={projectModalOpen}
                    onClose={() => setProjectModalOpen(false)}
                    project={project}
                    onSuccess={handleUpdateBudget}
                />
            )}

            {project && (
                <EditCollaboratorModal
                    open={editCollab.open}
                    onClose={() => setEditCollab({ open: false })}
                    projectId={project.id}
                    collaborator={editCollab.collaborator}
                    onSuccess={handleRefresh}
                />
            )}

            <Footer />
        </div>
    );
}
