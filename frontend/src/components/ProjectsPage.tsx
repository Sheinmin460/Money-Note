import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Project } from "../lib/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Link } from "react-router-dom";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Skeleton } from "../components/Skeleton";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; project?: Project }>({ open: false });

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await api.listProjects();
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load projects.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || busy) return;

        setBusy(true);
        setError(null);
        try {
            const created = await api.createProject(newName.trim());
            setProjects((prev) => [created, ...prev]);
            setNewName("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create project.");
        } finally {
            setBusy(true);
            // Small timeout to prevent double click
            setTimeout(() => setBusy(false), 500);
        }
    };

    const handleDelete = async () => {
        const p = confirmDelete.project;
        if (!p) return;

        setConfirmDelete({ open: false });
        setError(null);
        try {
            await api.deleteProject(p.id);
            setProjects((prev) => prev.filter((item) => item.id !== p.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header />

            <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
                <section className="space-y-4 text-center">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h1>
                    <p className="text-slate-500 font-medium">Manage your projects and track their performance.</p>
                </section>

                {error && (
                    <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200 animate-shake">
                        {error}
                    </div>
                )}

                <Card className="p-6">
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Project name..."
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition-all font-medium"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={busy}
                        />
                        <Button type="submit" disabled={!newName.trim() || busy} className="bg-slate-900 px-6 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                            {busy ? "Creating..." : "Create Project"}
                        </Button>
                    </form>
                </Card>

                <section className="grid grid-cols-1 gap-4">
                    {loading && projects.length === 0 ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-white rounded-2xl ring-1 ring-slate-100 p-5 flex items-center justify-between">
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        ))
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold">No projects yet. Create your first one above!</div>
                    ) : (
                        projects.map((p) => (
                            <div key={p.id} className="group relative">
                                <Link
                                    to={`/projects/${p.id}`}
                                    className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.99] duration-300"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-lg font-black text-slate-900">{p.name}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setConfirmDelete({ open: true, project: p });
                                                }}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))
                    )}
                </section>
            </main>

            <Footer />

            <ConfirmationModal
                open={confirmDelete.open}
                title="Delete Project"
                message={`Are you sure you want to delete "${confirmDelete.project?.name}"? Transactions assigned to this project will be kept but set to "No Project".`}
                confirmLabel="Delete Project"
                cancelLabel="Keep it"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ open: false })}
            />
        </div>
    );
}
