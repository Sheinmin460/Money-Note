import { useState } from "react";
import { Modal } from "./Modal";
import { api } from "../lib/api";

interface AddCollaboratorModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId: number;
}

export function AddCollaboratorModal({ open, onClose, onSuccess, projectId }: AddCollaboratorModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [limit, setLimit] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.addCollaborator(projectId, { email, password, transaction_limit: limit });
            setEmail("");
            setPassword("");
            setLimit(0);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add collaborator");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} title="Invite Collaborator" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Collaborator Email</label>
                    <input
                        autoFocus
                        type="email"
                        required
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="collab@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Transaction Limit</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                            type="number"
                            className="w-full rounded-xl border-slate-200 bg-slate-50 pl-7 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="0 (Unlimited)"
                            value={limit || ""}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            min="0"
                        />
                    </div>
                    <p className="text-xs text-slate-500">Optional: maximum amount this member can spend per transaction without approval.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Your Password (for confirmation)</label>
                    <input
                        type="password"
                        required
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Security check: please confirm your password to add a collaborator.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Inviting..." : "Invite"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
