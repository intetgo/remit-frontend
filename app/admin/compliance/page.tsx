"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  adminListComplianceCases,
  adminApproveCase,
  adminRejectCase,
  listTransfers,
  getQuote,
  createTransfer,
  simFundingReceive,
  simKycPass,
  type ComplianceCase,
  type Transfer,
  ApiError,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN:     "bg-amber-100 text-amber-800 border border-amber-200",
    APPROVED: "bg-green-100 text-green-800 border border-green-200",
    REJECTED: "bg-red-100 text-red-800 border border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function RuleBadge({ rule }: { rule: string }) {
  const styles: Record<string, string> = {
    AUSTRAC_TTR: "bg-purple-100 text-purple-800 border border-purple-200",
    DFAT_BLOCKED: "bg-red-100 text-red-800 border border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium ${styles[rule] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}>
      {rule}
    </span>
  );
}

export default function CompliancePanel() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [transfers, setTransfers] = useState<Map<string, Transfer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ caseId: string; action: "approve" | "reject" } | null>(null);
  const [tab, setTab] = useState<"open" | "history">("open");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allCases, allTransfers] = await Promise.all([
        adminListComplianceCases(),
        listTransfers(user.id),
      ]);
      allCases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCases(allCases);
      setTransfers(new Map(allTransfers.map(t => [t.id, t])));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load", false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleDecision(caseId: string, action: "approve" | "reject") {
    setConfirm(null);
    setBusy(caseId);
    try {
      if (action === "approve") await adminApproveCase(caseId);
      else await adminRejectCase(caseId);
      showToast(action === "approve" ? "Case approved — transfer advancing to payout" : "Case rejected — refund initiated", true);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Action failed", false);
    } finally {
      setBusy(null);
    }
  }

  async function triggerTestCase() {
    if (!user) return;
    setTriggering(true);
    try {
      // Upgrade to ENHANCED so the $10k monthly limit allows the transfer
      await simKycPass(user.id, "FULL");
      const quote = await getQuote("10000.00", "PHP");
      const transfer = await createTransfer(quote.id, user.id, crypto.randomUUID());
      await simFundingReceive(transfer.id);
      showToast("Test $10,000 transfer funded — AUSTRAC_TTR case created", true);
      await load();
      setTab("open");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Could not trigger test case", false);
    } finally {
      setTriggering(false);
    }
  }

  if (authLoading || !user) return null;

  const open = cases.filter(c => c.status === "OPEN");
  const history = cases.filter(c => c.status !== "OPEN");

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-xl transition-all ${
          toast.ok ? "bg-green-700 text-white" : "bg-red-700 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">
              {confirm.action === "approve" ? "Approve this case?" : "Reject this case?"}
            </h3>
            <p className="text-sm text-gray-500">
              {confirm.action === "approve"
                ? "The transfer will advance to payout pending."
                : "The transfer will be moved to refund pending."}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handleDecision(confirm.caseId, confirm.action)}
                className={`flex-1 text-sm font-medium rounded-lg px-4 py-2 transition-colors ${
                  confirm.action === "approve"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {confirm.action === "approve" ? "Yes, approve" : "Yes, reject"}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 text-sm font-medium rounded-lg px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Compliance Review</h1>
            <p className="text-sm text-gray-500 mt-0.5">AUSTRAC / DFAT monitoring · simulated</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="text-sm text-indigo-600 hover:underline"
            >
              Refresh
            </button>
            <button
              onClick={triggerTestCase}
              disabled={triggering}
              className="text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
            >
              {triggering ? "Creating…" : "⚡ Trigger test case"}
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Open", value: open.length, color: "text-amber-600" },
              { label: "Approved", value: history.filter(c => c.status === "APPROVED").length, color: "text-green-600" },
              { label: "Rejected", value: history.filter(c => c.status === "REJECTED").length, color: "text-red-600" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
          {(["open", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "open" ? `Queue ${open.length > 0 ? `(${open.length})` : ""}` : "History"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
        ) : tab === "open" ? (
          open.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-3">✓</p>
              <p className="text-sm font-medium text-gray-600">Queue is clear</p>
              <p className="text-xs text-gray-400 mt-1">
                Use <strong>⚡ Trigger test case</strong> to create an AUSTRAC_TTR review.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {open.map(c => {
                const transfer = transfers.get(c.transferId);
                return (
                  <li key={c.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-100 flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={c.status} />
                          <RuleBadge rule={c.ruleName} />
                        </div>
                        <p className="text-sm text-gray-700 leading-snug">{c.ruleDetail}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{relativeTime(c.createdAt)}</span>
                    </div>

                    <div className="px-5 py-3 bg-amber-50/40 border-b border-amber-100">
                      {transfer ? (
                        <div className="flex items-center gap-6 flex-wrap text-sm">
                          <span className="font-semibold text-gray-900">
                            {fmt(transfer.sendAmount.amount, "AUD")} → {fmt(transfer.receiveAmount.amount, transfer.receiveAmount.currency)}
                          </span>
                          <span className="text-gray-500 text-xs">
                            Fee {fmt(transfer.feeAmount.amount, "AUD")} · Total {fmt(
                              (Number(transfer.sendAmount.amount) + Number(transfer.feeAmount.amount)).toFixed(2), "AUD"
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Transfer details unavailable</span>
                      )}
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Case {c.id} · Transfer {c.transferId}
                      </p>
                    </div>

                    <div className="px-5 py-3 flex items-center gap-3">
                      <button
                        onClick={() => setConfirm({ caseId: c.id, action: "approve" })}
                        disabled={busy === c.id}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                      >
                        {busy === c.id ? "…" : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => setConfirm({ caseId: c.id, action: "reject" })}
                        disabled={busy === c.id}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                      >
                        {busy === c.id ? "…" : "✗ Reject"}
                      </button>
                      {transfer && (
                        <Link
                          href={`/transfers/${c.transferId}`}
                          className="text-sm text-indigo-600 hover:underline ml-auto"
                        >
                          View transfer →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No reviewed cases yet.</p>
          ) : (
            <ul className="space-y-3">
              {history.map(c => {
                const transfer = transfers.get(c.transferId);
                return (
                  <li key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={c.status} />
                          <RuleBadge rule={c.ruleName} />
                        </div>
                        {transfer && (
                          <p className="text-sm font-medium text-gray-800">
                            {fmt(transfer.sendAmount.amount, "AUD")} → {fmt(transfer.receiveAmount.amount, transfer.receiveAmount.currency)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 font-mono truncate">{c.transferId}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-xs text-gray-500">{c.reviewedAt ? relativeTime(c.reviewedAt) : "—"}</p>
                        {transfer && (
                          <Link href={`/transfers/${c.transferId}`} className="text-xs text-indigo-500 hover:underline block">
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </main>
    </div>
  );
}
