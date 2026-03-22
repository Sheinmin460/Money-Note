import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";

export function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setBusy(true);
        try {
            await register(username, email, password, confirmPassword);
            navigate("/", { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status >= 400 && err.status < 500) {
                    setError(err.message);
                } else {
                    setError("Something went wrong. Please try again later.");
                    console.error("[System Error] Registration failed:", err.message, err.payload);
                }
            } else {
                setError("Network error. Please check your connection.");
                console.error("[Network Error] Registration failed:", err);
            }
        } finally {
            setBusy(false);
        }
    };

    const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all";

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-xl font-black text-slate-800">Create Account</h2>
                <p className="text-sm text-slate-500 mt-1">Join MoneyNote to track your finances.</p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-semibold text-rose-600">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                    <input
                        id="register-username"
                        type="text"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className={inputCls}
                        placeholder="JohnDoe"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                        id="register-email"
                        type="email"
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
                        id="register-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={inputCls}
                        placeholder="Min. 6 characters"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                    <input
                        id="register-confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`${inputCls} ${confirmPassword && password !== confirmPassword ? "border-rose-300 ring-rose-300" : ""}`}
                        placeholder="Re-enter password"
                    />
                </div>

                <div className="pt-2">
                    <button
                        id="register-submit"
                        type="submit"
                        disabled={busy}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {busy ? "Registering..." : "Create Account"}
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500 font-medium">
                    Already have an account?{" "}
                    <Link to="/login" className="text-emerald-600 font-bold hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
