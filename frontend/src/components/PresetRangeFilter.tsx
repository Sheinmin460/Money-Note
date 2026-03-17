
import React from 'react';

interface PresetRangeFilterProps {
  onSelect: (days: number | 'all') => void;
}

const PRESETS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'Last year', value: 365 },
  { label: 'All time', value: 'all' },
];

const PresetRangeFilter: React.FC<PresetRangeFilterProps> = ({ onSelect }) => {
  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onSelect(preset.value)}
          className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default PresetRangeFilter;
