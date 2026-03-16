import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "ghost" | "danger";

export function Button(
  props: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
  >
) {
  const { className = "", variant = "primary", ...rest } = props;

  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const styles: Record<Variant, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-500"
  };

  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}

