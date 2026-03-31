import { useEffect, useState, useCallback, memo } from "react";
import { api } from "../lib/api";
import type { Project } from "../lib/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/Button";
import { Link } from "react-router-dom";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { ProjectModal } from "../components/ProjectModal";

const ProjectItem = memo(({ project, user, onEdit, onDelete }: { 
    project: Project; 
    user: any; 
    onEdit: (p: Project) => void; 
    onDelete: (p: Project) => void 
}) => (
    <div className="group relative">
        <Link
            to={`/projects/${project.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.99] duration-300"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-lg font-black text-slate-900">{project.name}</div>
                    {(project.user_id !== user?.id) && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 uppercase tracking-tight ring-1 ring-slate-200">
                            Shared by {project.owner_username}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {(project.user_id === user?.id) && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEdit(project);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Edit Project"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete(project);
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Project"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </>
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    </div>
));

export default function ProjectsPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; project?: Project }>({ open: false });
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.listProjects();
            setProjects(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const openCreate = useCallback(() => {
        setEditingProject(undefined);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((p: Project) => {
        setEditingProject(p);
        setModalOpen(true);
    }, []);

    const handleSuccess = useCallback(() => {
        void refresh();
    }, [refresh]);

    const handleDelete = useCallback(async () => {
        const p = confirmDelete.project;
        if (!p) return;

        setConfirmDelete({ open: false });
        try {
            await api.deleteProject(p.id);
            setProjects((prev) => prev.filter((item) => item.id !== p.id));
        } catch (err) {
            console.error(err);
        }
    }, [confirmDelete.project]);

    const initiateDelete = useCallback((p: Project) => {
        setConfirmDelete({ open: true, project: p });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header />

            <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h1>
                        <p className="text-slate-500 font-medium">Manage your projects and track performance.</p>
                    </div>
                    <Button
                        onClick={openCreate}
                        className="rounded-2xl bg-slate-900 px-6 py-3 font-black text-white shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        New Project
                    </Button>
                </div>

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
                            <ProjectItem 
                                key={p.id} 
                                project={p} 
                                user={user} 
                                onEdit={openEdit} 
                                onDelete={initiateDelete} 
                            />
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
            <ProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                project={editingProject}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
