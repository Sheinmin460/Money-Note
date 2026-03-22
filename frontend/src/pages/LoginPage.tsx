import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await login(email, password);
            navigate("/", { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status >= 400 && err.status < 500) {
                    setError(err.message);
                } else {
                    setError("Something went wrong. Please try again later.");
                    console.error("[System Error] Login failed:", err.message, err.payload);
                }
            } else {
                setError("Network error. Please check your connection.");
                console.error("[Network Error] Login failed:", err);
            }
        } finally {
            setBusy(false);
        }
    };

    const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all";

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-xl font-black text-slate-800">Welcome Back</h2>
                <p className="text-sm text-slate-500 mt-1">Please enter your details to sign in.</p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-semibold text-rose-600">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={inputCls}
                        placeholder="name@example.com"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={inputCls}
                        placeholder="••••••••"
                    />
                </div>

                <div className="pt-2">
                    <button
                        id="login-submit"
                        type="submit"
                        disabled={busy}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {busy ? "Signing in..." : "Sign In"}
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500 font-medium">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-emerald-600 font-bold hover:underline">
                        Register now
                    </Link>
                </p>
            </div>
        </div>
    );
}
