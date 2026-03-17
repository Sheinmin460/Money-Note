
import React from 'react';

interface DateRangeFilterProps {
  onApply: (from: string, to: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onApply }) => {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const handleApply = () => {
    onApply(from, to);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />
      <span>to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />
      <button
        onClick={handleApply}
        className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Apply
      </button>
    </div>
  );
};

export default DateRangeFilter;
