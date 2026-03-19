import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const WalletSubNav: React.FC = () => {
    const location = useLocation();
    const isLogs = location.pathname === '/wallets/logs';

    return (
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-8 shadow-inner border border-slate-200/50">
            <Link
                to="/wallets"
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${!isLogs
                    ? 'bg-white text-slate-900 shadow-sm scale-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Wallets
            </Link>
            <Link
                to="/wallets/logs"
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${isLogs
                    ? 'bg-white text-slate-900 shadow-sm scale-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Transfer Logs
            </Link>
        </div>
    );
};
