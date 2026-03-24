import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { api } from "../lib/api";
import type { Project } from "../lib/types";

interface ProjectModalProps {
    open: boolean;
    onClose: () => void;
    project?: Project; // If provided, we are editing
    onSuccess: (project: Project) => void;
}

export function ProjectModal({ open, onClose, project, onSuccess }: ProjectModalProps) {
    const [name, setName] = useState("");
    const [budgetLimit, setBudgetLimit] = useState<number>(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setBudgetLimit(project.budget_limit || 0);
        } else {
            setName("");
            setBudgetLimit(0);
        }
        setError(null);
    }, [project, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || busy) return;

        setBusy(true);
        setError(null);
        try {
            let result: Project;
            if (project) {
                await api.updateProjectSettings(project.id, {
                    name: name.trim(),
                    budget_limit: budgetLimit
                });
                result = { ...project, name: name.trim(), budget_limit: budgetLimit };
            } else {
                result = await api.createProject(name.trim(), budgetLimit);
            }
            onSuccess(result);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Action failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={project ? "Edit Project" : "New Project"}
        >
            <form onSubmit={handleSubmit} className="space-y-6 py-2">
                {error && (
                    <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Name</label>
                    <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all"
                        placeholder="e.g. Home Renovation"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={busy}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget Limit (Optional)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-sm font-bold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all"
                            placeholder="0 (Unlimited)"
                            value={budgetLimit || ""}
                            onChange={(e) => setBudgetLimit(Number(e.target.value))}
                            min="0"
                            disabled={busy}
                        />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 italic mt-1 px-1">
                        Transactions exceeding this will require admin approval.
                    </p>
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
                        {busy ? "Saving..." : project ? "Save Changes" : "Create Project"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
