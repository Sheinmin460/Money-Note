import React from 'react';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ from, to, onFromChange, onToChange }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="relative group">
        <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-black text-slate-400 uppercase tracking-tighter transition-colors group-focus-within:text-emerald-500">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50/50 focus:border-emerald-200 transition-all cursor-pointer"
        />
      </div>
      <div className="relative group">
        <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-black text-slate-400 uppercase tracking-tighter transition-colors group-focus-within:text-emerald-500">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50/50 focus:border-emerald-200 transition-all cursor-pointer"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
