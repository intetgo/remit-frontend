"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  listTransfers,
  listComplianceCases,
  simFundingReceive,
  simFundingFail,
  simPayoutComplete,
  simPayoutFail,
  simRefundComplete,
  simCancelTransfer,
  simKycPass,
  simKycFail,
  approveComplianceCase,
  rejectComplianceCase,
  type Transfer,
  type ComplianceCase,
  ApiError,
} from "@/lib/api";

// Which sim actions are valid per status
const TRANSFER_ACTIONS: Record<string, { label: string; action: string; variant: "primary" | "danger" | "warn" }[]> = {
  CREATED:          [
    { label: "Receive funding",  action: "funding/receive", variant: "primary" },
    { label: "Fail funding",     action: "funding/fail",    variant: "danger" },
    { label: "Cancel",           action: "cancel",          variant: "warn" },
  ],
  QUOTE_LOCKED:     [
    { label: "Receive funding",  action: "funding/receive", variant: "primary" },
    { label: "Fail funding",     action: "funding/fail",    variant: "danger" },
    { label: "Cancel",           action: "cancel",          variant: "warn" },
  ],
  FUNDING_PENDING:  [
    { label: "Receive funding",  action: "funding/receive", variant: "primary" },
    { label: "Fail funding",     action: "funding/fail",    variant: "danger" },
    { label: "Cancel",           action: "cancel",          variant: "warn" },
  ],
  FUNDED:           [
    { label: "Complete payout",  action: "payout/complete", variant: "primary" },
    { label: "Fail payout",      action: "payout/fail",     variant: "danger" },
  ],
  PAYOUT_PENDING:   [
    { label: "Complete payout",  action: "payout/complete", variant: "primary" },
    { label: "Fail payout",      action: "payout/fail",     variant: "danger" },
  ],
  REFUND_PENDING:   [{ label: "Complete refund", action: "refund/complete", variant: "primary" }],
};

const STATUS_DOT: Record<string, string> = {
  CREATED: "bg-gray-400", QUOTE_LOCKED: "bg-blue-400", FUNDING_PENDING: "bg-yellow-400",
  FUNDED: "bg-blue-500", COMPLIANCE_REVIEW: "bg-purple-400", PAYOUT_PENDING: "bg-indigo-400",
  PAYOUT_SENT: "bg-indigo-500", COMPLETED: "bg-green-500", FAILED: "bg-red-500",
  CANCELLED: "bg-gray-500", REFUND_PENDING: "bg-orange-400", REFUNDED: "bg-orange-500",
};

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

export default function SimPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [kycTier, setKycTier] = useState("BASIC");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        listTransfers(user.id),
        listComplianceCases(),
      ]);
      setTransfers(t.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setCases(c.filter(x => x.status === "OPEN"));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Load failed", false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      showToast("Done", true);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Error", false);
    } finally {
      setBusy(null);
    }
  }

  async function doTransferAction(t: Transfer, action: string) {
    const key = `${t.id}:${action}`;
    if (action === "funding/receive") return run(key, () => simFundingReceive(t.id));
    if (action === "funding/fail")    return run(key, () => simFundingFail(t.id));
    if (action === "payout/complete") return run(key, () => simPayoutComplete(t.id));
    if (action === "payout/fail")     return run(key, () => simPayoutFail(t.id));
    if (action === "refund/complete") return run(key, () => simRefundComplete(t.id));
    if (action === "cancel")          return run(key, () => simCancelTransfer(t.id));
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">Remit</Link>
        <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
          ⚠ Prototype controls
        </span>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-10">

        {/* KYC */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">KYC — {user.email}</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={kycTier}
                onChange={e => setKycTier(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BASIC">BASIC</option>
                <option value="ENHANCED">ENHANCED</option>
              </select>
              <Btn
                label="Pass KYC"
                variant="primary"
                busy={busy === "kyc-pass"}
                onClick={() => run("kyc-pass", () => simKycPass(user.id, kycTier))}
              />
              <Btn
                label="Fail KYC"
                variant="danger"
                busy={busy === "kyc-fail"}
                onClick={() => run("kyc-fail", () => simKycFail(user.id, kycTier))}
              />
            </div>
          </div>
        </section>

        {/* Compliance cases */}
        {cases.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Compliance cases <span className="text-xs font-normal text-gray-400">({cases.length} open)</span>
            </h2>
            <ul className="space-y-2">
              {cases.map(c => (
                <li key={c.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm px-5 py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-medium text-amber-700 mb-0.5">COMPLIANCE_REVIEW</p>
                      <p className="text-xs text-gray-500 font-mono">Transfer: {c.transferId.slice(0, 13)}…</p>
                    </div>
                    <div className="flex gap-2">
                      <Btn
                        label="Approve"
                        variant="primary"
                        busy={busy === `case-approve-${c.id}`}
                        onClick={() => run(`case-approve-${c.id}`, () => approveComplianceCase(c.id))}
                      />
                      <Btn
                        label="Reject"
                        variant="danger"
                        busy={busy === `case-reject-${c.id}`}
                        onClick={() => run(`case-reject-${c.id}`, () => rejectComplianceCase(c.id))}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Transfers */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Transfers</h2>
            <button onClick={load} className="text-xs text-indigo-600 hover:underline">Refresh</button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No transfers yet.</p>
          ) : (
            <ul className="space-y-3">
              {transfers.map(t => {
                const actions = TRANSFER_ACTIONS[t.status] ?? [];
                return (
                  <li key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status] ?? "bg-gray-300"}`} />
                          <span className="text-xs font-semibold text-gray-700">{t.status.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {fmt(t.sendAmount.amount, "AUD")} → {fmt(t.receiveAmount.amount, t.receiveAmount.currency)}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{t.id}</p>
                      </div>
                    </div>
                    {actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                        {actions.map(a => (
                          <Btn
                            key={a.action}
                            label={a.label}
                            variant={a.variant}
                            busy={busy === `${t.id}:${a.action}`}
                            onClick={() => doTransferAction(t, a.action)}
                          />
                        ))}
                      </div>
                    )}
                    {actions.length === 0 && (
                      <p className="text-xs text-gray-400 italic pt-2 border-t border-gray-100">No actions available</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Btn({ label, variant, busy, onClick }: {
  label: string;
  variant: "primary" | "danger" | "warn";
  busy: boolean;
  onClick: () => void;
}) {
  const cls = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    danger:  "bg-red-600 hover:bg-red-700 text-white",
    warn:    "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`${cls} disabled:opacity-50 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors`}
    >
      {busy ? "…" : label}
    </button>
  );
}
