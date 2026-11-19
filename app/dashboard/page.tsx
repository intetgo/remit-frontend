"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { listTransfers, type Transfer } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED", "REFUNDED"]);

const STATUS_DOT: Record<string, string> = {
  CREATED: "bg-gray-400", QUOTE_LOCKED: "bg-blue-400", FUNDING_PENDING: "bg-yellow-400",
  FUNDED: "bg-blue-500", COMPLIANCE_REVIEW: "bg-purple-400", PAYOUT_PENDING: "bg-indigo-400",
  PAYOUT_SENT: "bg-indigo-500", COMPLETED: "bg-green-500", FAILED: "bg-red-500",
  CANCELLED: "bg-gray-400", REFUND_PENDING: "bg-orange-400", REFUNDED: "bg-orange-500",
};

const STATUS_LABEL: Record<string, string> = {
  CREATED: "Created", QUOTE_LOCKED: "Quote locked", FUNDING_PENDING: "Awaiting funding",
  FUNDED: "Funded", COMPLIANCE_REVIEW: "Compliance review", PAYOUT_PENDING: "Payout pending",
  PAYOUT_SENT: "Payout sent", COMPLETED: "Completed", FAILED: "Failed",
  CANCELLED: "Cancelled", REFUND_PENDING: "Refund pending", REFUNDED: "Refunded",
};

function fmt(amount: string | number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const { user, authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Refresh user once on mount to get latest limits/tier (not in load() to avoid re-render loop)
  useEffect(() => { if (user) refreshUser().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listTransfers(user.id);
      setTransfers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (authLoading || !user) return null;

  const kycOk = user.kycTier !== "UNVERIFIED";
  const limitAud = user.monthlyLimitAudCents
    ? user.monthlyLimitAudCents / 100
    : user.kycTier === "FULL" ? 50000 : user.kycTier === "BASIC" ? 5000 : 0;

  // Monthly spend from funded/completed/payout transfers this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTransfers = transfers.filter(t =>
    new Date(t.createdAt) >= monthStart &&
    !["CANCELLED", "FAILED"].includes(t.status)
  );
  const monthlySpend = monthlyTransfers.reduce((sum, t) => sum + Number(t.sendAmount.amount), 0);
  const spendPct = limitAud > 0 ? Math.min(100, (monthlySpend / limitAud) * 100) : 0;

  const active = transfers.filter(t => !TERMINAL.has(t.status));
  const completedThisMonth = monthlyTransfers.filter(t => t.status === "COMPLETED").length;
  const recent = transfers.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8">

        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {greeting()}{user.firstName || user.fullName ? `, ${user.firstName ?? user.fullName}` : ""}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* KYC banner */}
        {!kycOk && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-4">
            <span>Identity not verified — KYC is required before you can send money.</span>
            <Link href="/kyc" className="shrink-0 font-semibold hover:text-amber-900">
              Verify →
            </Link>
          </div>
        )}

        {/* Stats row */}
        {!loading && kycOk && (
          <div className="grid grid-cols-3 gap-3">
            {/* Monthly spend */}
            <div className="col-span-3 sm:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Monthly spend</p>
              <div>
                <p className="text-xl font-bold text-gray-900">{fmt(monthlySpend)}</p>
                <p className="text-xs text-gray-400 mt-0.5">of {fmt(limitAud)} limit</p>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${spendPct > 85 ? "bg-red-400" : spendPct > 60 ? "bg-amber-400" : "bg-indigo-500"}`}
                  style={{ width: `${spendPct}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active</p>
              <div>
                <p className="text-3xl font-bold text-gray-900">{active.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">in progress</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed</p>
              <div>
                <p className="text-3xl font-bold text-gray-900">{completedThisMonth}</p>
                <p className="text-xs text-gray-400 mt-0.5">this month</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/send"
            className={`col-span-2 sm:col-span-1 flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-4 transition-colors ${!kycOk ? "opacity-40 pointer-events-none" : ""}`}
          >
            <span className="text-2xl leading-none">↗</span>
            <div>
              <p className="font-semibold text-sm">Send money</p>
              <p className="text-xs text-indigo-200 mt-0.5">Live rates</p>
            </div>
          </Link>

          <Link
            href="/payment-methods"
            className="flex items-center gap-3 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-4 transition-all"
          >
            <span className="text-xl leading-none">💳</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Cards</p>
              <p className="text-xs text-gray-400 mt-0.5">Payment methods</p>
            </div>
          </Link>

          <Link
            href="/recipients"
            className="flex items-center gap-3 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-4 transition-all"
          >
            <span className="text-xl leading-none">👤</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Recipients</p>
              <p className="text-xs text-gray-400 mt-0.5">Saved accounts</p>
            </div>
          </Link>
        </div>

        {/* Recent transfers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Recent transfers</h3>
            <Link href="/transfers" className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 text-center">
              Loading…
            </div>
          ) : recent.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-2xl mb-2">↗</p>
              <p className="text-sm font-medium text-gray-600">No transfers yet</p>
              <p className="text-xs text-gray-400 mt-1">Send money to get started</p>
            </div>
          ) : (
            <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {recent.map(t => (
                <li key={t.id}>
                  <Link
                    href={`/transfers/${t.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status] ?? "bg-gray-300"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fmt(t.sendAmount.amount)} → {fmt(t.receiveAmount.amount, t.receiveAmount.currency)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{STATUS_LABEL[t.status] ?? t.status} · {relDate(t.createdAt)}</p>
                      </div>
                    </div>
                    <span className="text-gray-300 text-sm shrink-0">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer links */}
        <div className="flex gap-4 text-xs text-gray-400 pt-2">
          <Link href="/profile" className="hover:text-gray-600">Profile</Link>
          <Link href="/kyc" className="hover:text-gray-600">KYC</Link>
          <Link href="/sim" className="hover:text-gray-600">Sim controls</Link>
          <Link href="/admin/compliance" className="hover:text-gray-600">Admin</Link>
        </div>

      </main>
    </div>
  );
}
