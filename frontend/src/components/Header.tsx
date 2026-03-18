import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./Button";

export function Header({ onAddTransaction, backTo }: { onAddTransaction?: () => void; backTo?: string }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === "/";
    const isProjects = location.pathname.startsWith("/projects");

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">MoneyNote</div>
                            <div className="hidden sm:block text-xs font-bold text-slate-400 uppercase tracking-widest">FinTracker</div>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {!isProjects && (
                        <Link to="/projects">
                            <Button
                                variant="ghost"
                                className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold"
                            >
                                Projects
                            </Button>
                        </Link>
                    )}
                    <Link to="/admin">
                        <Button
                            variant="outline"
                            className={`h-10 sm:h-11 px-3 sm:px-5 rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all ${location.pathname === "/admin" ? "bg-slate-100" : ""
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                            </svg>
                            <span className="hidden sm:inline">Dashboard</span>
                        </Button>
                    </Link>
                    {onAddTransaction && (
                        <Button onClick={onAddTransaction} className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl bg-slate-900 shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span className="hidden sm:inline">Add Transaction</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    )}
                    {!isHome && (
                        <button
                            onClick={() => {
                                if (backTo) navigate(backTo);
                                else navigate(-1);
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-90 shadow-sm border border-slate-200"
                            title="Go Back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
