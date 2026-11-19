"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { listTransfers, type Transfer } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  CREATED:          { dot: "bg-gray-400",   label: "Created" },
  QUOTE_LOCKED:     { dot: "bg-blue-400",   label: "Quote locked" },
  FUNDING_PENDING:  { dot: "bg-yellow-400", label: "Awaiting funding" },
  FUNDED:           { dot: "bg-blue-500",   label: "Funded" },
  COMPLIANCE_REVIEW:{ dot: "bg-purple-400", label: "Compliance review" },
  PAYOUT_PENDING:   { dot: "bg-indigo-400", label: "Payout pending" },
  PAYOUT_SENT:      { dot: "bg-indigo-500", label: "Payout sent" },
  COMPLETED:        { dot: "bg-green-500",  label: "Completed" },
  FAILED:           { dot: "bg-red-500",    label: "Failed" },
  CANCELLED:        { dot: "bg-gray-500",   label: "Cancelled" },
  REFUND_PENDING:   { dot: "bg-orange-400", label: "Refund pending" },
  REFUNDED:         { dot: "bg-orange-500", label: "Refunded" },
};

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function TransfersPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listTransfers(user.id);
      setTransfers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Transfers</h1>
          <Link
            href="/send"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + Send money
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16 space-y-3 text-gray-400">
            <div className="text-4xl">↗</div>
            <p className="text-sm">No transfers yet.</p>
            <Link href="/send" className="text-sm font-medium text-indigo-600 hover:underline">
              Send your first transfer →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {transfers.map(t => {
              const style = STATUS_STYLES[t.status] ?? { dot: "bg-gray-300", label: t.status };
              const destCurrency = t.receiveAmount.currency;
              return (
                <li key={t.id}>
                <Link href={`/transfers/${t.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <span className="text-xs font-medium text-gray-500">{style.label}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{relativeDate(t.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {fmt(t.sendAmount.amount, "AUD")}
                        <span className="text-gray-400 font-normal mx-1">→</span>
                        {fmt(t.receiveAmount.amount, destCurrency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                        {t.id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">Fee {fmt(t.feeAmount.amount, "AUD")}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        1 AUD = {(Number(t.receiveAmount.amount) / Number(t.sendAmount.amount)).toFixed(4)} {destCurrency}
                      </p>
                    </div>
                  </div>
                </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
