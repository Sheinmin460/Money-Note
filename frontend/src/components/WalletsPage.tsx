import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Header } from './Header';
import { formatCurrency, todayISO } from '../lib/format';
import { Modal } from './Modal';
import { Button } from './Button';
import { WalletSubNav } from './WalletSubNav';
import { ConfirmModal } from './ConfirmModal';
import type { WalletBalance } from '../lib/types';

export default function WalletsPage() {
    const [balances, setBalances] = useState<WalletBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWalletName, setNewWalletName] = useState('');

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedWalletForAdjustment, setSelectedWalletForAdjustment] = useState<string | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<'income' | 'expense'>('income');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

    const [transferData, setTransferData] = useState({
        from: '',
        to: '',
        amount: '',
        date: todayISO(),
        note: ''
    });

    const [submitting, setSubmitting] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            const balanceData = await api.getBalances();
            setBalances(balanceData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load balances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    const handleAddWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWalletName.trim()) return;
        setSubmitting(true);
        setModalError(null);
        try {
            await api.createWallet(newWalletName.trim());
            setNewWalletName('');
            setIsAddModalOpen(false);
            void refresh();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to create wallet');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteWallet = async () => {
        if (!walletToDelete) return;
        setSubmitting(true);
        setModalError(null);
        try {
            await api.deleteWallet(walletToDelete);
            setIsDeleteConfirmOpen(false);
            setWalletToDelete(null);
            void refresh();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to delete wallet');
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = (name: string) => {
        setWalletToDelete(name);
        setModalError(null);
        setIsDeleteConfirmOpen(true);
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const { from, to, amount, date, note } = transferData;
        if (!from || !to || !amount || from === to) return;

        setSubmitting(true);
        setModalError(null);
        try {
            await api.transferMoney({
                from,
                to,
                amount: parseFloat(amount),
                date,
                note: note.trim() || undefined
            });
            setIsTransferModalOpen(false);
            setTransferData({ from: '', to: '', amount: '', date: todayISO(), note: '' });
            void refresh();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Transfer failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdjustBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWalletForAdjustment || !adjustmentAmount) return;

        setSubmitting(true);
        setModalError(null);
        try {
            await api.createTransaction({
                type: adjustmentType,
                amount: parseFloat(adjustmentAmount),
                category: 'Initial Balance',
                payment_method: selectedWalletForAdjustment,
                date: todayISO(),
                is_initial: true,
                note: `Balance adjustment (${adjustmentType === 'income' ? 'Increase' : 'Reduce'})`
            });
            setIsAdjustModalOpen(false);
            setAdjustmentAmount('');
            void refresh();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to adjust balance');
        } finally {
            setSubmitting(false);
        }
    };

    const openAdjustmentModal = (name: string) => {
        setSelectedWalletForAdjustment(name);
        setAdjustmentAmount('');
        setAdjustmentType('income');
        setModalError(null);
        setIsAdjustModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header />

            <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Wallets & Logs</h1>
                        <p className="text-slate-500 font-medium text-sm">Manage your accounts and transfer funds.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIsTransferModalOpen(true)}
                            variant="ghost"
                            className="bg-white border-slate-200 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 101.414-1.414L6.414 15H12z" />
                            </svg>
                            Transfer Funds
                        </Button>
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            New Wallet
                        </Button>
                    </div>
                </div>

                <WalletSubNav />

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading && balances.length === 0 ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-white rounded-2xl ring-1 ring-slate-100 animate-pulse"></div>
                        ))
                    ) : (
                        balances.map(wallet => (
                            <div key={wallet.payment_method} className="group relative bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200 hover:shadow-md hover:ring-slate-300 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{wallet.payment_method}</div>
                                        <div className={`text-3xl font-black tracking-tight ${wallet.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {formatCurrency(wallet.balance)}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openAdjustmentModal(wallet.payment_method)}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                            title="Adjust Balance"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(wallet.payment_method)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Delete Wallet"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1-1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${wallet.balance > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                        Active
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modals */}
                <Modal
                    open={isAddModalOpen}
                    title="Create New Wallet"
                    onClose={() => { setIsAddModalOpen(false); setModalError(null); }}
                >
                    <form onSubmit={handleAddWallet} className="space-y-4">
                        {modalError && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 animate-shake">
                                {modalError}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Wallet Name</label>
                            <input
                                autoFocus
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-50 focus:border-slate-400 outline-none text-lg font-bold transition-all"
                                placeholder="e.g. PayPal, Savings, Crypto"
                                value={newWalletName}
                                onChange={(e) => setNewWalletName(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting || !newWalletName.trim()}>
                                {submitting ? 'Creating...' : 'Create Wallet'}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    open={isTransferModalOpen}
                    title="Transfer Money"
                    onClose={() => { setIsTransferModalOpen(false); setModalError(null); }}
                >
                    <form onSubmit={handleTransfer} className="space-y-6">
                        {modalError && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 animate-shake">
                                {modalError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">From</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 bg-white font-bold"
                                    value={transferData.from}
                                    onChange={(e) => setTransferData(d => ({ ...d, from: e.target.value }))}
                                >
                                    <option value="">Select Wallet</option>
                                    {balances.map(w => (
                                        <option key={w.payment_method} value={w.payment_method}>{w.payment_method} ({formatCurrency(w.balance)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">To</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 bg-white font-bold"
                                    value={transferData.to}
                                    onChange={(e) => setTransferData(d => ({ ...d, to: e.target.value }))}
                                >
                                    <option value="">Select Wallet</option>
                                    {balances.map(w => (
                                        <option key={w.payment_method} value={w.payment_method} disabled={w.payment_method === transferData.from}>{w.payment_method}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="w-full pl-8 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-50 focus:border-slate-400 outline-none text-2xl font-black transition-all"
                                    placeholder="0.00"
                                    value={transferData.amount}
                                    onChange={(e) => setTransferData(d => ({ ...d, amount: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 font-medium"
                                value={transferData.date}
                                onChange={(e) => setTransferData(d => ({ ...d, date: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Note (Optional)</label>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-400 outline-none font-medium"
                                placeholder="What's this transfer for?"
                                value={transferData.note}
                                onChange={(e) => setTransferData(d => ({ ...d, note: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting || !transferData.from || !transferData.to || !transferData.amount || transferData.from === transferData.to}>
                                {submitting ? 'Processing...' : 'Complete Transfer'}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    open={isAdjustModalOpen}
                    title={`Adjust ${selectedWalletForAdjustment} Balance`}
                    onClose={() => { setIsAdjustModalOpen(false); setModalError(null); }}
                >
                    <form onSubmit={handleAdjustBalance} className="space-y-6">
                        {modalError && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 animate-shake">
                                {modalError}
                            </div>
                        )}
                        <div className="bg-slate-50 p-1 rounded-xl flex gap-1 shadow-inner border border-slate-100">
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('income')}
                                className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all ${adjustmentType === 'income'
                                    ? 'bg-white text-emerald-600 shadow-lg scale-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                Increase (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('expense')}
                                className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all ${adjustmentType === 'expense'
                                    ? 'bg-white text-rose-600 shadow-lg scale-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                Reduce (-)
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Adjustment Amount</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold">$</div>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    className={`w-full pl-8 pr-4 py-4 border rounded-2xl focus:ring-4 outline-none text-2xl font-black transition-all ${adjustmentType === 'income'
                                        ? 'border-emerald-100 focus:ring-emerald-50/50 text-emerald-600'
                                        : 'border-rose-100 focus:ring-rose-50/50 text-rose-600'
                                        }`}
                                    placeholder="0.00"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                />
                            </div>
                            <p className="mt-3 text-sm text-slate-500 bg-slate-100 p-3 rounded-xl border border-dashed border-slate-200">
                                Note: This adjustment will be recorded as an <span className="font-bold underline">Initial Balance</span> correction and hidden from regular lists.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAdjustModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || !adjustmentAmount}
                                className={adjustmentType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                            >
                                {submitting ? 'Processing...' : 'Complete Adjustment'}
                            </Button>
                        </div>
                    </form>
                </Modal>
                <ConfirmModal
                    open={isDeleteConfirmOpen}
                    title="Delete Wallet"
                    message={`Are you sure you want to delete the "${walletToDelete}" wallet? This action is permanent and only possible if the balance is zero.`}
                    confirmText="Delete Wallet"
                    onClose={() => { setIsDeleteConfirmOpen(false); setModalError(null); }}
                    onConfirm={handleDeleteWallet}
                    loading={submitting}
                />
                {modalError && isDeleteConfirmOpen && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] p-4 bg-rose-600 text-white rounded-2xl shadow-2xl font-black text-sm animate-bounce">
                        {modalError}
                    </div>
                )}
            </main>
        </div>
    );
}
