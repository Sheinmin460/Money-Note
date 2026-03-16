import { Card } from "./Card";

export function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "blue";
}) {
  const tones: Record<typeof tone, { badge: string; value: string }> = {
    green: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", value: "text-emerald-700" },
    red: { badge: "bg-rose-50 text-rose-700 ring-rose-200", value: "text-rose-700" },
    blue: { badge: "bg-sky-50 text-sky-700 ring-sky-200", value: "text-sky-700" }
  };

  return (
    <Card className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-slate-600">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${tones[tone].value}`}>{value}</div>
      </div>
      <div className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tones[tone].badge}`}>
        {label}
      </div>
    </Card>
  );
}

