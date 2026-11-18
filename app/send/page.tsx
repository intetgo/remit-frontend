"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getQuote, createTransfer, CORRIDORS, type Quote, ApiError } from "@/lib/api";

type Step = "quote" | "confirm" | "done";

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

export default function SendPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("quote");
  const [sendAmount, setSendAmount] = useState("200");
  const [destCurrency, setDestCurrency] = useState("PHP");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [transfer, setTransfer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Live quote as amount / currency changes
  useEffect(() => {
    if (!sendAmount || Number(sendAmount) <= 0) { setQuote(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = await getQuote(sendAmount, destCurrency);
        setQuote(q);
        setError("");
      } catch {
        setQuote(null);
      }
    }, 500);
  }, [sendAmount, destCurrency]);

  async function handleConfirm() {
    if (!quote || !user) return;
    setLoading(true);
    setError("");
    try {
      const idempotencyKey = crypto.randomUUID();
      const t = await createTransfer(quote.id, user.id, idempotencyKey);
      setTransfer(t);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">Remit</Link>
        <span className="text-sm text-gray-500">{user.email}</span>
      </header>

      <main className="max-w-md mx-auto px-4 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {(["quote", "confirm", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-gray-200" />}
              <span className={`font-medium ${step === s ? "text-indigo-600" : step === "done" && i < 2 ? "text-green-500" : "text-gray-400"}`}>
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
          ))}
        </div>

        {step === "quote" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Send money</h2>

            {/* You send */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">You send (AUD)</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                <span className="bg-gray-50 border-r border-gray-300 px-3 flex items-center text-gray-500 text-sm font-medium">AUD</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* They receive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">They receive</label>
              <select
                value={destCurrency}
                onChange={e => setDestCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {CORRIDORS.map(c => (
                  <option key={c.to} value={c.to}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Live quote result */}
            {quote && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exchange rate</span>
                  <span className="font-medium text-gray-900">1 AUD = {quote.customerRate.toFixed(4)} {destCurrency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transfer fee</span>
                  <span className="font-medium text-gray-900">{fmt(quote.feeAmount.amount, "AUD")}</span>
                </div>
                <div className="h-px bg-indigo-100" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Recipient gets</span>
                  <span className="font-semibold text-indigo-700 text-base">{fmt(quote.receiveAmount.amount, destCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total you pay</span>
                  <span className="font-medium text-gray-900">
                    {fmt((Number(quote.sendAmount.amount) + Number(quote.feeAmount.amount)).toFixed(2), "AUD")}
                  </span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {user.kycTier === "UNVERIFIED" && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Identity verification required before sending. (In this prototype, KYC is auto-approved via the API.)
              </p>
            )}

            <button
              onClick={() => setStep("confirm")}
              disabled={!quote || user.kycTier === "UNVERIFIED"}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === "confirm" && quote && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Confirm transfer</h2>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3 text-sm">
              <Row label="You send" value={fmt(quote.sendAmount.amount, "AUD")} />
              <Row label="Fee" value={fmt(quote.feeAmount.amount, "AUD")} />
              <div className="h-px bg-gray-200" />
              <Row label="Total charged" value={fmt((Number(quote.sendAmount.amount) + Number(quote.feeAmount.amount)).toFixed(2), "AUD")} bold />
              <Row label="Recipient gets" value={fmt(quote.receiveAmount.amount, destCurrency)} bold accent />
              <Row label="Rate" value={`1 AUD = ${quote.customerRate.toFixed(4)} ${destCurrency}`} />
            </div>

            <p className="text-xs text-gray-400">
              Rate locked for 60 seconds · Quote ID: {quote.id.slice(0, 8)}…
            </p>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("quote")}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {loading ? "Sending…" : "Confirm & send"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && transfer && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Transfer created!</h2>
              <p className="text-sm text-gray-500 mt-1">
                Your transfer is awaiting funding.
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-left space-y-2 text-sm">
              <Row label="Transfer ID" value={transfer.id.slice(0, 13) + "…"} />
              <Row label="Status" value="CREATED" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep("quote"); setQuote(null); setSendAmount("200"); }}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                Send another
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors text-center"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`${bold ? "font-semibold" : "font-medium"} ${accent ? "text-indigo-700" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}
