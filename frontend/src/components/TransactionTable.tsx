import { memo } from "react";
import type { Transaction } from "../lib/types";
import { formatCurrency, formatDate } from "../lib/format";
import { Button } from "./Button";
import { Card } from "./Card";
import { useAuth } from "../context/AuthContext";

export const TransactionTable = memo(function TransactionTable({
  items,
  onEdit,
  onDelete,
  isProjectOwner,
  busyId
}: {
  items: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  isProjectOwner?: boolean;
  busyId?: number | null;
}) {
  const { user } = useAuth();
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Payment Method</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 py-3 font-semibold">Note</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No transactions yet. Add your first one.
                </td>
              </tr>
            ) : null}

            {items.map((tx) => {
              const isIncome = tx.type === "income";
              const isPending = tx.status === "pending";
              const tone = isIncome ? "text-emerald-700" : "text-rose-700";
              const badge = isIncome
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-rose-200";

              return (
                <tr key={tx.id} className={`hover:bg-slate-50/60 ${isPending ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3 text-slate-700">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter ring-1 ${badge}`}>
                        {isIncome ? "Income" : "Expense"}
                      </span>
                      {isPending && (
                        <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 uppercase tracking-tighter ring-1 ring-amber-200">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{tx.category ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{tx.payment_method ?? "—"}</td>
                  <td className={`px-4 py-3 text-right font-black ${tone}`}>
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 italic text-xs">{tx.note ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!isPending && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-1.5 text-xs font-bold"
                          onClick={() => onEdit(tx)}
                          disabled={busyId === tx.id}
                        >
                          Edit
                        </Button>
                      )}
                      {(isProjectOwner || tx.user_id === user?.id) && (
                        <Button
                          type="button"
                          variant="danger"
                          className="px-3 py-1.5 text-xs font-bold"
                          onClick={() => onDelete(tx)}
                          disabled={busyId === tx.id}
                        >
                          {isPending ? "Cancel" : "Delete"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
