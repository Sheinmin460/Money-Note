import { useEffect, useState, memo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";

export const Header = memo(function Header({
    onAddTransaction,
    backTo
}: {
    onAddTransaction?: () => void;
    backTo?: string;
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const location = useLocation();

    useEffect(() => {
        const checkApprovals = async () => {
            try {
                const data = await api.listPendingApprovals();
                setPendingCount(data.length);
            } catch (err) {
                // Ignore background errors
            }
        };
        void checkApprovals();
        // Check every minute
        const interval = setInterval(checkApprovals, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);

    const menuItems = [
        {
            label: "Home",
            path: "/",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        },
        {
            label: "Project",
            path: "/projects",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        },
        {
            label: "Dashboard",
            path: "/admin",
            icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></>
        },
        {
            label: "Profile",
            path: "/profile",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl">
            {/* Main Header */}
            <div className="border-b-2 border-slate-100">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    {/* Logo - Bold & Simple */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xl shadow-slate-200 group-hover:scale-105 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">MoneyNote</span>
                    </Link>

                    {/* Desktop Navigation - Right Aligned & Bold */}
                    <div className="flex items-center gap-6">
                        <nav className="hidden sm:flex items-center gap-1">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all relative ${location.pathname === item.path
                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        {item.icon}
                                    </svg>
                                    {item.label}
                                    {item.label === "Project" && pendingCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
                                            {pendingCount}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </nav>

                        {/* Mobile Hamburger - Bold */}
                        <button
                            onClick={toggleMenu}
                            className="flex sm:hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all border-2 border-transparent active:border-slate-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar - Slide in from right */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={toggleMenu} />
                    <div className="relative w-72 max-w-[80vw] bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xl font-black text-slate-900 tracking-tight">Menu</span>
                            <button onClick={toggleMenu} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <nav className="flex flex-col gap-3">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={toggleMenu}
                                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-black transition-all ${location.pathname === item.path
                                        ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        {item.icon}
                                    </svg>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
});
