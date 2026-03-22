import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AuthLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Simple Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">MoneyNote</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Simple Finance Tracking</p>
                </div>

                {/* Flat White Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <Outlet />
                </div>

                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    &copy; {new Date().getFullYear()} MoneyNote. All rights reserved.
                </p>
            </div>
        </div>
    );
}
