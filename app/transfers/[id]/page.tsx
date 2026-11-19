"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getTransfer, listRecipients, type Transfer, type Recipient } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

// Happy path in order
const HAPPY_PATH: { status: string; label: string }[] = [
  { status: "CREATED",          label: "Created" },
  { status: "QUOTE_LOCKED",     label: "Quote locked" },
  { status: "FUNDING_PENDING",  label: "Awaiting funding" },
  { status: "FUNDED",           label: "Funded" },
  { status: "COMPLIANCE_REVIEW",label: "Compliance review" },
  { status: "PAYOUT_PENDING",   label: "Payout pending" },
  { status: "PAYOUT_SENT",      label: "Payout sent" },
  { status: "COMPLETED",        label: "Completed" },
];

const TERMINAL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  FAILED:        { bg: "bg-red-100",    text: "text-red-700",    label: "Failed" },
  CANCELLED:     { bg: "bg-gray-100",   text: "text-gray-600",   label: "Cancelled" },
  REFUND_PENDING:{ bg: "bg-orange-100", text: "text-orange-700", label: "Refund pending" },
  REFUNDED:      { bg: "bg-orange-100", text: "text-orange-700", label: "Refunded" },
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

function absDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function TransferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, authLoading } = useAuth();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    async function load() {
      try {
        const [t, recipients] = await Promise.all([
          getTransfer(id),
          listRecipients(),
        ]);
        setTransfer(t);
        if (t.recipientId) {
          setRecipient(recipients.find(r => r.id === t.recipientId) ?? null);
        }
      } catch {
        setError("Transfer not found.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, id]);

  if (authLoading || !user) return null;

  const happyIndex = transfer ? HAPPY_PATH.findIndex(s => s.status === transfer.status) : -1;
  const isTerminal = transfer ? transfer.status in TERMINAL_STYLES : false;
  const terminalStyle = transfer ? TERMINAL_STYLES[transfer.status] : null;
  const destCurrency = transfer?.receiveAmount.currency ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/transfers" className="text-sm text-gray-400 hover:text-gray-600">← Transfers</Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-500 font-mono truncate">{id.slice(0, 13)}…</span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-16">{error}</p>
        ) : transfer ? (
          <div className="space-y-5">

            {/* Status badge + amounts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[transfer.status] ?? "bg-gray-300"}`} />
                <span className="text-sm font-semibold text-gray-700">
                  {HAPPY_PATH.find(s => s.status === transfer.status)?.label
                    ?? terminalStyle?.label
                    ?? transfer.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-gray-900">
                  {fmt(transfer.sendAmount.amount, "AUD")}
                </span>
                <span className="text-gray-400 text-lg">→</span>
                <span className="text-2xl font-bold text-indigo-700">
                  {fmt(transfer.receiveAmount.amount, destCurrency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-4">
                <span className="text-gray-500">Transfer fee</span>
                <span className="text-gray-900 font-medium text-right">{fmt(transfer.feeAmount.amount, "AUD")}</span>
                <span className="text-gray-500">Total charged</span>
                <span className="text-gray-900 font-medium text-right">
                  {fmt((Number(transfer.sendAmount.amount) + Number(transfer.feeAmount.amount)).toFixed(2), "AUD")}
                </span>
                <span className="text-gray-500">Exchange rate</span>
                <span className="text-gray-900 font-medium text-right">
                  1 AUD = {(Number(transfer.receiveAmount.amount) / Number(transfer.sendAmount.amount)).toFixed(4)} {destCurrency}
                </span>
              </div>
            </div>

            {/* Recipient */}
            {recipient && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recipient</p>
                <p className="text-sm font-semibold text-gray-900">
                  {recipient.nickname ? `${recipient.nickname} (${recipient.fullName})` : recipient.fullName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {recipient.accountType === "BANK" ? "Bank" : "Mobile wallet"} · {recipient.bankCode ? `${recipient.bankCode} · ` : ""}{recipient.accountNumber} · {recipient.country}
                </p>
              </div>
            )}

            {/* Status timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Progress</p>

              {isTerminal && terminalStyle ? (
                <div className={`rounded-xl ${terminalStyle.bg} px-4 py-3 text-sm font-medium ${terminalStyle.text}`}>
                  {terminalStyle.label}
                </div>
              ) : (
                <ol className="space-y-0">
                  {HAPPY_PATH.map((s, i) => {
                    const done = happyIndex > i;
                    const current = happyIndex === i;
                    const future = happyIndex < i;
                    return (
                      <li key={s.status} className="flex items-start gap-3">
                        {/* Spine */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${
                            current ? "bg-indigo-600 ring-4 ring-indigo-100" :
                            done    ? "bg-green-500" :
                                      "bg-gray-200"
                          }`} />
                          {i < HAPPY_PATH.length - 1 && (
                            <div className={`w-0.5 h-6 ${done ? "bg-green-300" : "bg-gray-200"}`} />
                          )}
                        </div>
                        <span className={`text-sm pb-1 ${
                          current ? "font-semibold text-indigo-700" :
                          done    ? "text-gray-500" :
                                    "text-gray-300"
                        }`}>
                          {s.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Meta */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</p>
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Transfer ID</span>
                  <span className="text-gray-900 font-mono text-xs break-all text-right">{transfer.id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Created</span>
                  <span className="text-gray-700 text-right">{absDate(transfer.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Last updated</span>
                  <span className="text-gray-700 text-right">{absDate(transfer.updatedAt)}</span>
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </main>
    </div>
  );
}
