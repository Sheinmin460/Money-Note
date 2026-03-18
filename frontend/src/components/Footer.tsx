export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400">
        Copyright &copy; {new Date().getFullYear()} MoneyNote. All rights reserved.
      </div>
    </footer>
  );
}

