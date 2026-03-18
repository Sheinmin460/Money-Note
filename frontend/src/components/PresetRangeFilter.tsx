
import React from 'react';

interface PresetRangeFilterProps {
  onSelect: (days: number | 'all') => void;
}

const PRESETS: { label: string; value: number | 'all' }[] = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '6M', value: 180 },
  { label: '1Y', value: 365 },
  { label: 'AT', value: 'all' },
];

const PresetRangeFilter: React.FC<PresetRangeFilterProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onSelect(preset.value)}
          className="flex-1 min-w-[50px] rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-200 transition-all shadow-sm"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default PresetRangeFilter;
