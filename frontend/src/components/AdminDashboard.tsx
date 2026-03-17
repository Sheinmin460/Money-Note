
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import DateRangeFilter from './DateRangeFilter';
import PresetRangeFilter from './PresetRangeFilter';
import CategoryPieChart from './CategoryPieChart';
import { formatCurrency } from '../lib/format';

interface WalletBalance {
  payment_method: string;
  balance: number;
}

const AdminDashboard: React.FC = () => {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryTotals, setCategoryTotals] = useState<{ income: { name: string; value: number }[], expense: { name: string; value: number }[] }>({ income: [], expense: [] });
  const [dateRange, setDateRange] = useState<{ from?: string, to?: string }>({});

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const data = await api.getBalances();
        setBalances(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load balances.');
      } finally {
        setLoading(false);
      }
    };

    void fetchBalances();
  }, []);

  useEffect(() => {
    const fetchCategoryTotals = async () => {
      try {
        const data = await api.getCategoryTotals(dateRange.from, dateRange.to);
        setCategoryTotals({
          income: data.income.map(item => ({ name: item.category, value: item.total })),
          expense: data.expense.map(item => ({ name: item.category, value: item.total }))
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load category totals.');
      }
    };

    void fetchCategoryTotals();
  }, [dateRange]);

  const handleDateRangeApply = (from: string, to: string) => {
    setDateRange({ from, to });
  };

  const handlePresetSelect = (days: number | 'all') => {
    if (days === 'all') {
      setDateRange({});
      return;
    }

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    setDateRange({ from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link to="/">
          <button className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-100 transition-colors">Back to Home</button>
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Wallet Balances</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            <p>Loading balances...</p>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
              {error}
            </div>
          ) : (
            balances.map((balance) => (
              <div key={balance.payment_method} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="text-sm text-slate-500">{balance.payment_method}</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(balance.balance)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Category Breakdown</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CategoryPieChart data={categoryTotals.income} title="Income by Category" />
          <CategoryPieChart data={categoryTotals.expense} title="Expense by Category" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Filters</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DateRangeFilter onApply={handleDateRangeApply} />
          <PresetRangeFilter onSelect={handlePresetSelect} />
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
