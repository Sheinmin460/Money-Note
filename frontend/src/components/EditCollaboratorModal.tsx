import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { api } from "../lib/api";
import type { ProjectCollaborator } from "../lib/types";

interface EditCollaboratorModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    collaborator?: ProjectCollaborator;
    onSuccess: () => void;
}

export function EditCollaboratorModal({ open, onClose, projectId, collaborator, onSuccess }: EditCollaboratorModalProps) {
    const [limit, setLimit] = useState<number>(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (collaborator) {
            setLimit(collaborator.transaction_limit || 0);
        }
        setError(null);
    }, [collaborator, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collaborator || busy) return;

        setBusy(true);
        setError(null);
        try {
            await api.updateCollaboratorLimit(projectId, collaborator.id, limit);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Update failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Edit Member Limit"
        >
            <form onSubmit={handleSubmit} className="space-y-6 py-2">
                {error && (
                    <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-slate-600 ring-1 ring-slate-200 shadow-sm">
                            {collaborator?.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-black text-slate-900">{collaborator?.username}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Collaborator</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Limit</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-sm font-bold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all"
                                placeholder="0 (Unlimited)"
                                value={limit || ""}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                min="0"
                                disabled={busy}
                            />
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 italic mt-1 px-1">
                            Transactions exceeding this will require your approval.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 rounded-xl font-bold"
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-[2] rounded-xl font-black bg-slate-900 shadow-lg shadow-slate-200"
                        disabled={busy}
                    >
                        {busy ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
