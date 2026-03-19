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
    <Card className="flex flex-col items-start gap-2 p-5">
      <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1 ${tones[tone].badge}`}>
        {label}
      </div>
      <div className={`text-2xl font-black tracking-tight ${tones[tone].value}`}>
        {value}
      </div>
    </Card>
  );
}

