import { memo, type PropsWithChildren } from "react";

export const Card = memo(function Card({
  children,
  className = ""
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </div>
  );
});
