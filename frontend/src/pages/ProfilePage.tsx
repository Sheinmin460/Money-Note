import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ApiError } from "../lib/api";
import { Skeleton } from "../components/Skeleton";

type Panel = "none" | "changeEmail" | "changePassword";

export function ProfilePage() {
    const { user, logout, changeEmail, changePassword } = useAuth();
    const navigate = useNavigate();
    const [activePanel, setActivePanel] = useState<Panel>("none");

    // Change Email state
    const [ceOldPw, setCeOldPw] = useState("");
    const [ceNewEmail, setCeNewEmail] = useState("");
    const [ceError, setCeError] = useState<string | null>(null);
    const [ceSuccess, setCeSuccess] = useState<string | null>(null);
    const [ceBusy, setCeBusy] = useState(false);

    // Change Password state
    const [cpOldPw, setCpOldPw] = useState("");
    const [cpNewPw, setCpNewPw] = useState("");
    const [cpConfirm, setCpConfirm] = useState("");
    const [cpError, setCpError] = useState<string | null>(null);
    const [cpSuccess, setCpSuccess] = useState<string | null>(null);
    const [cpBusy, setCpBusy] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setCeError(null); setCeSuccess(null);
        setCeBusy(true);
        try {
            await changeEmail(ceOldPw, ceNewEmail);
            setCeSuccess("Email updated successfully!");
            setCeOldPw(""); setCeNewEmail("");
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status >= 400 && err.status < 500) {
                    setCeError(err.message);
                } else {
                    setCeError("Something went wrong. Please try again later.");
                    console.error("[System Error] Change email failed:", err.message, err.payload);
                }
            } else {
                setCeError("Network error. Please check your connection.");
                console.error("[Network Error] Change email failed:", err);
            }
        } finally {
            setCeBusy(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpError(null); setCpSuccess(null);
        if (cpNewPw !== cpConfirm) { setCpError("New passwords do not match"); return; }
        setCpBusy(true);
        try {
            const result = await changePassword(cpOldPw, cpNewPw, cpConfirm);
            setCpSuccess(result.message);
            setCpOldPw(""); setCpNewPw(""); setCpConfirm("");
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status >= 400 && err.status < 500) {
                    setCpError(err.message);
                } else {
                    setCpError("Something went wrong. Please try again later.");
                    console.error("[System Error] Change password failed:", err.message, err.payload);
                }
            } else {
                setCpError("Network error. Please check your connection.");
                console.error("[Network Error] Change password failed:", err);
            }
        } finally {
            setCpBusy(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50/50">
                <Header />
                <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
                    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 shadow-2xl">
                        <div className="flex items-center gap-5">
                            <Skeleton className="h-20 w-20 rounded-2xl bg-white/10" />
                            <div className="flex-1 space-y-3">
                                <Skeleton className="h-7 w-1/3 bg-white/10" />
                                <Skeleton className="h-4 w-1/2 bg-white/10" />
                            </div>
                        </div>
                    </div>
                    <section className="space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                        </div>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    const initials = user.username.slice(0, 2).toUpperCase();

    const navCards = [
        {
            label: "Dashboard",
            desc: "Analytics & charts",
            path: "/admin",
            color: "from-indigo-500 to-purple-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
            )
        },
        {
            label: "Wallets",
            desc: "Manage your accounts",
            path: "/wallets",
            color: "from-emerald-500 to-teal-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            label: "Projects",
            desc: "Budget tracking",
            path: "/projects",
            color: "from-amber-500 to-orange-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
            )
        },
    ];

    const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all";

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header />

            <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">

                {/* Profile Hero Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 shadow-2xl">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
                        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
                    </div>
                    <div className="relative flex items-center gap-5">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white text-2xl font-black shadow-xl shadow-emerald-500/30">
                            {initials}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">{user.username}</h1>
                            <p className="text-sm text-white/60 mt-0.5">{user.email}</p>
                            <p className="text-xs text-white/30 mt-1 uppercase tracking-widest">
                                Member since {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation Cards */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Navigation</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {navCards.map(card => (
                            <Link
                                key={card.path}
                                to={card.path}
                                className="group flex flex-col items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
                                    {card.icon}
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-black text-slate-800">{card.label}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">{card.desc}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Privacy Settings */}
                <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800">Privacy & Security</h2>
                            <p className="text-xs text-slate-400">Manage your credentials</p>
                        </div>
                    </div>

                    {/* Change Email button */}
                    <div className="px-6 py-4 border-b border-slate-100">
                        <button
                            id="toggle-change-email"
                            onClick={() => setActivePanel(activePanel === "changeEmail" ? "none" : "changeEmail")}
                            className="w-full flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-slate-700">Change Email</div>
                                    <div className="text-xs text-slate-400">{user.email}</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-400 transition-transform ${activePanel === "changeEmail" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {activePanel === "changeEmail" && (
                            <form onSubmit={handleChangeEmail} className="mt-4 space-y-3">
                                {ceError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-semibold">{ceError}</div>}
                                {ceSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold">{ceSuccess}</div>}
                                <input id="ce-old-password" type="password" required placeholder="Current password" value={ceOldPw} onChange={e => setCeOldPw(e.target.value)} className={inputCls} />
                                <input id="ce-new-email" type="email" required placeholder="New email address" value={ceNewEmail} onChange={e => setCeNewEmail(e.target.value)} className={inputCls} />
                                <button id="ce-submit" type="submit" disabled={ceBusy} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-black transition-all disabled:opacity-50 active:scale-[.98]">
                                    {ceBusy ? "Updating…" : "Update Email"}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Change Password button */}
                    <div className="px-6 py-4">
                        <button
                            id="toggle-change-password"
                            onClick={() => setActivePanel(activePanel === "changePassword" ? "none" : "changePassword")}
                            className="w-full flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-slate-700">Change Password</div>
                                    <div className="text-xs text-slate-400">Update your password</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-400 transition-transform ${activePanel === "changePassword" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {activePanel === "changePassword" && (
                            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                                {cpError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-semibold">{cpError}</div>}
                                {cpSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold">{cpSuccess}</div>}
                                <input id="cp-old-password" type="password" required placeholder="Current password" value={cpOldPw} onChange={e => setCpOldPw(e.target.value)} className={inputCls} />
                                <input id="cp-new-password" type="password" required minLength={6} placeholder="New password (min. 6 chars)" value={cpNewPw} onChange={e => setCpNewPw(e.target.value)} className={inputCls} />
                                <input id="cp-confirm-password" type="password" required minLength={6} placeholder="Confirm new password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} className={inputCls} />
                                <button id="cp-submit" type="submit" disabled={cpBusy} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black transition-all disabled:opacity-50 active:scale-[.98]">
                                    {cpBusy ? "Updating…" : "Update Password"}
                                </button>
                            </form>
                        )}
                    </div>
                </section>

                {/* Logout */}
                <section>
                    <button
                        id="profile-logout"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-black text-sm transition-all active:scale-[.98]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </section>
            </main>
            <Footer />
        </div>
    );
}
