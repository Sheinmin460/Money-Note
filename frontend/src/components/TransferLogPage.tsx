import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Header } from './Header';
import { WalletSubNav } from './WalletSubNav';
import { formatCurrency } from '../lib/format';
import type { TransferLog } from '../lib/types';

export default function TransferLogPage() {
    const [transfers, setTransfers] = useState<TransferLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await api.listTransfers();
            setTransfers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transfer logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchLogs();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header />

            <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Wallets & Logs</h1>
                    <p className="text-slate-500 font-medium text-sm">Review your money movements and account history.</p>
                </div>

                <WalletSubNav />

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden border border-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">From</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">To</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading && transfers.length === 0 ? (
                                    [1, 2, 3, 5].map(i => (
                                        <tr key={i}>
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : transfers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-sm text-slate-400 italic font-medium">
                                            No transfer records found.
                                        </td>
                                    </tr>
                                ) : (
                                    transfers.map((log) => (
                                        <tr key={log.transfer_id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-6 py-5 text-sm font-bold text-slate-600 whitespace-nowrap">{log.date}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-rose-400 group-hover:animate-pulse"></div>
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm">
                                                        {log.from_wallet}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-center gap-3">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm border border-emerald-100/50">
                                                            {log.to_wallet}
                                                        </span>
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right text-base font-black text-slate-900">{formatCurrency(log.amount)}</td>
                                            <td className="px-6 py-5 text-xs font-medium text-slate-400 max-w-[200px] truncate italic">{log.note || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
