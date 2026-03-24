import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import DateRangeFilter from './DateRangeFilter';
import PresetRangeFilter from './PresetRangeFilter';
import CategoryPieChart from './CategoryPieChart';
import { Header } from './Header';
import { formatCurrency } from '../lib/format';
import { CardSkeleton, Skeleton } from './Skeleton';

interface WalletBalance {
  payment_method: string;
  balance: number;
}

const AdminDashboard: React.FC = () => {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryTotals, setCategoryTotals] = useState<{ income: { name: string; value: number }[], expense: { name: string; value: number }[] }>({ income: [], expense: [] });
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: string, to?: string }>({});

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Draft states for the filter dropdown
  const [draftDateRange, setDraftDateRange] = useState<{ from?: string, to?: string }>({});
  const [draftSelectedCategories, setDraftSelectedCategories] = useState<string[]>([]);

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

  const fetchCategoryTotals = async () => {
    try {
      const data = await api.getCategoryTotals(dateRange.from, dateRange.to, selectedCategories);
      const income = data.income.map(item => ({ name: item.category, value: item.total }));
      const expense = data.expense.map(item => ({ name: item.category, value: item.total }));

      setCategoryTotals({ income, expense });

      // Only populate allCategories once if empty
      if (allCategories.length === 0 && selectedCategories.length === 0) {
        const uniqueCats = Array.from(new Set([...income.map(i => i.name), ...expense.map(e => e.name)]));
        setAllCategories(uniqueCats.filter(Boolean));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category totals.');
    }
  };


  useEffect(() => {
    void fetchBalances();
  }, []);

  useEffect(() => {
    void fetchCategoryTotals();
  }, [dateRange, selectedCategories]);

  // Sync draft states when filter opens
  useEffect(() => {
    if (isFilterOpen) {
      setDraftDateRange(dateRange);
      setDraftSelectedCategories(selectedCategories);
    }
  }, [isFilterOpen, dateRange, selectedCategories]);

  const handlePresetSelect = (days: number | 'all') => {
    if (days === 'all') {
      setDraftDateRange({});
      return;
    }

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    setDraftDateRange({ from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] });
  };

  const toggleCategory = (cat: string) => {
    setDraftSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };


  return (
    <div className="bg-slate-50 min-h-screen">
      <Header />
      <div className="p-4 sm:p-6">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">Visualize your finances and balances.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${isFilterOpen
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Filters
                {(dateRange.from || dateRange.to || selectedCategories.length > 0) && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-10 z-20 overflow-hidden">
                  <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Advanced Filters</h3>
                    <button
                      onClick={() => {
                        setDateRange({});
                        setSelectedCategories([]);
                        setDraftDateRange({});
                        setDraftSelectedCategories([]);
                      }}
                      className="text-xs text-emerald-600 font-bold uppercase tracking-wider hover:text-emerald-700"
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                    <section>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Time Range</p>
                      <PresetRangeFilter onSelect={(d) => { handlePresetSelect(d); }} />
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <DateRangeFilter
                          from={draftDateRange.from || ''}
                          to={draftDateRange.to || ''}
                          onFromChange={(f) => setDraftDateRange(prev => ({ ...prev, from: f }))}
                          onToChange={(t) => setDraftDateRange(prev => ({ ...prev, to: t }))}
                        />
                      </div>
                    </section>

                    {allCategories.length > 0 && (
                      <section className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</p>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{draftSelectedCategories.length} Selected</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => toggleCategory(cat)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${draftSelectedCategories.includes(cat)
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setDateRange(draftDateRange);
                        setSelectedCategories(draftSelectedCategories);
                        setIsFilterOpen(false);
                      }}
                      className="w-full py-4 bg-emerald-600 text-white text-base font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Apply All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              Wallet Balances
            </h2>
            <Link
              to="/wallets"
              className="px-4 py-2 text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200/50 shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Manage Wallets
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              [1, 2, 3, 4].map(i => <CardSkeleton key={i} />)
            ) : error ? (
              <div className="col-span-full rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                {error}
              </div>
            ) : (
              balances.map((balance) => (
                <div key={balance.payment_method} className="relative group rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-all">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{balance.payment_method}</div>
                  <div className="text-2xl font-black text-slate-900">{formatCurrency(balance.balance)}</div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
          <section>
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  Income Analysis
                </h2>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-8 w-1/3" />
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    <CategoryPieChart data={categoryTotals.income} title="Income Composition" />
                    <div className="mt-6 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category Totals</p>
                      {categoryTotals.income.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No income in this period.</p>
                      ) : (
                        categoryTotals.income.map(c => (
                          <div key={c.name} className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 shadow-sm hover:bg-emerald-50 transition-colors">
                            <span className="text-sm font-bold text-slate-700">{c.name}</span>
                            <span className="text-base font-black text-emerald-700">{formatCurrency(c.value)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-rose-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 13a1 1 0 110 2H7a1 1 0 01-1-1V9a1 1 0 112 0v2.586l4.293-4.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0L4.586 11H7v2z" clipRule="evenodd" />
                  </svg>
                  Expense Analysis
                </h2>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-8 w-1/3" />
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    <CategoryPieChart data={categoryTotals.expense} title="Expense Composition" />
                    <div className="mt-6 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category Totals</p>
                      {categoryTotals.expense.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No expenses in this period.</p>
                      ) : (
                        categoryTotals.expense.map(c => (
                          <div key={c.name} className="flex items-center justify-between p-4 rounded-xl bg-rose-50/50 border border-rose-100 shadow-sm hover:bg-rose-50 transition-colors">
                            <span className="text-sm font-bold text-slate-700">{c.name}</span>
                            <span className="text-base font-black text-rose-700">{formatCurrency(c.value)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
