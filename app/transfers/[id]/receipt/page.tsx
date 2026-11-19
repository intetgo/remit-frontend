"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getTransfer, listRecipients, type Transfer, type Recipient } from "@/lib/api";

function fmt(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:     "Completed",
  CANCELLED:     "Cancelled",
  FAILED:        "Failed",
  REFUND_PENDING:"Refund pending",
  REFUNDED:      "Refunded",
  FUNDED:        "Funded",
  PAYOUT_SENT:   "Payout sent",
};

const ACCT_TYPE: Record<string, string> = {
  BANK: "Bank Deposit", MOBILE_WALLET: "Mobile Wallet", CASH_PICKUP: "Cash Pickup",
};

export default function ReceiptPage() {
  const params = useParams();
  const id = params.id as string;
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [t, recipients] = await Promise.all([getTransfer(id), listRecipients()]);
        setTransfer(t);
        if (t.recipientId) {
          setRecipient(recipients.find(r => r.id === t.recipientId) ?? null);
        }
      } catch {
        setError("Could not load transfer.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading receipt…</p>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-red-500">{error || "Transfer not found."}</p>
      </div>
    );
  }

  const destCurrency = transfer.receiveAmount.currency;
  const totalCharged = (Number(transfer.sendAmount.amount) + Number(transfer.feeAmount.amount)).toFixed(2);
  const rate = (Number(transfer.receiveAmount.amount) / Number(transfer.sendAmount.amount)).toFixed(4);
  const isRefund = transfer.status === "REFUND_PENDING" || transfer.status === "REFUNDED";
  const statusLabel = STATUS_LABEL[transfer.status] ?? transfer.status.replace(/_/g, " ");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto px-8 py-12 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-indigo-600 tracking-tight">Remit</p>
              <p className="text-xs text-gray-400 mt-0.5">remit.example.com.au</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">Transfer Receipt</p>
              <p className="text-xs text-gray-400 mt-0.5">{fullDate(transfer.updatedAt)}</p>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Status banner */}
          <div className={`rounded-xl px-4 py-3 ${
            transfer.status === "COMPLETED" ? "bg-green-50 text-green-800" :
            transfer.status === "REFUNDED"  ? "bg-green-50 text-green-800" :
            transfer.status === "CANCELLED" ? "bg-gray-100 text-gray-700" :
            transfer.status === "FAILED"    ? "bg-red-50 text-red-800" :
                                              "bg-indigo-50 text-indigo-800"
          }`}>
            <p className="text-sm font-semibold">{statusLabel}</p>
          </div>

          {/* Amounts */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Transfer</p>
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl font-bold text-gray-900">{fmt(transfer.sendAmount.amount, "AUD")}</span>
              <span className="text-gray-400 text-xl">→</span>
              <span className="text-3xl font-bold text-indigo-700">{fmt(transfer.receiveAmount.amount, destCurrency)}</span>
            </div>
          </div>

          {/* Breakdown */}
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-500">Transfer fee</td>
                <td className="py-2 text-right font-medium text-gray-900">{fmt(transfer.feeAmount.amount, "AUD")}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Total charged</td>
                <td className="py-2 text-right font-semibold text-gray-900">{fmt(totalCharged, "AUD")}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Exchange rate</td>
                <td className="py-2 text-right font-medium text-gray-900">1 AUD = {rate} {destCurrency}</td>
              </tr>
              {isRefund && (
                <tr>
                  <td className="py-2 text-gray-500">{transfer.status === "REFUNDED" ? "Refunded" : "Refund amount"}</td>
                  <td className="py-2 text-right font-semibold text-green-700">{fmt(totalCharged, "AUD")}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Recipient */}
          {recipient && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recipient</p>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  {recipient.nickname ? `${recipient.nickname} (${recipient.fullName})` : recipient.fullName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ACCT_TYPE[recipient.accountType] ?? recipient.accountType}
                  {recipient.bankCode ? ` · ${recipient.bankCode}` : ""}
                  {" "}· {recipient.accountNumber} · {recipient.country}
                </p>
              </div>
            </div>
          )}

          {/* Transfer details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-500">Transfer ID</td>
                  <td className="py-2 text-right font-mono text-xs text-gray-700 break-all">{transfer.id}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500 shrink-0">Created</td>
                  <td className="py-2 text-right text-gray-700">{fullDate(transfer.createdAt)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Last updated</td>
                  <td className="py-2 text-right text-gray-700">{fullDate(transfer.updatedAt)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200" />

          {/* Footer note */}
          <p className="text-xs text-gray-400 leading-relaxed">
            This is a simulated transfer receipt for demonstration purposes only. No real money has been transferred.
          </p>

          {/* Print button — hidden when printing */}
          <div className="no-print flex gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Print / Save as PDF
            </button>
            <button
              onClick={() => window.close()}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
