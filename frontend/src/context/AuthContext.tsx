import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { User } from "../lib/types";

interface AuthContextValue {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, confirm_password: string) => Promise<void>;
    logout: () => void;
    changeEmail: (old_password: string, new_email: string) => Promise<void>;
    changePassword: (old_password: string, new_password: string, confirm_password: string) => Promise<{ message: string }>;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("mn_token"));
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const tk = localStorage.getItem("mn_token");
        if (!tk) { setLoading(false); return; }
        try {
            const me = await api.me();
            setUser(me);
        } catch {
            localStorage.removeItem("mn_token");
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    const login = async (email: string, password: string) => {
        const res = await api.login({ email, password });
        localStorage.setItem("mn_token", res.token);
        setToken(res.token);
        setUser(res.user);
    };

    const register = async (username: string, email: string, password: string, confirm_password: string) => {
        const res = await api.register({ username, email, password, confirm_password });
        localStorage.setItem("mn_token", res.token);
        setToken(res.token);
        setUser(res.user);
    };

    const logout = () => {
        localStorage.removeItem("mn_token");
        setToken(null);
        setUser(null);
    };

    const changeEmail = async (old_password: string, new_email: string) => {
        const updated = await api.changeEmail({ old_password, new_email });
        setUser(updated);
    };

    const changePassword = async (old_password: string, new_password: string, confirm_password: string) => {
        return api.changePassword({ old_password, new_password, confirm_password });
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, changeEmail, changePassword, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
