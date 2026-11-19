"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getQuote,
  createTransfer,
  listRecipients,
  CORRIDORS,
  type Quote,
  type Recipient,
  ApiError,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";

type Step = "recipient" | "quote" | "confirm" | "done";

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

const STEPS: { key: Step; label: string }[] = [
  { key: "recipient", label: "Recipient" },
  { key: "quote", label: "Amount" },
  { key: "confirm", label: "Confirm" },
  { key: "done", label: "Done" },
];

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authLoading } = useAuth();

  const [step, setStep] = useState<Step>("recipient");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [sendAmount, setSendAmount] = useState("200");
  const [destCurrency, setDestCurrency] = useState("PHP");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [transfer, setTransfer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const loadRecipients = useCallback(async () => {
    try {
      setRecipients(await listRecipients());
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  useEffect(() => { if (user) loadRecipients(); }, [user, loadRecipients]);

  // Pre-select recipient and skip to quote step when ?recipientId= is in the URL
  useEffect(() => {
    const id = searchParams.get("recipientId");
    if (!id || recipients.length === 0) return;
    const match = recipients.find(r => r.id === id);
    if (match) {
      setSelectedRecipient(match);
      setStep("quote");
    }
  }, [recipients, searchParams]);

  // Live quote as amount / currency changes
  useEffect(() => {
    if (step !== "quote") return;
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
  }, [sendAmount, destCurrency, step]);

  // Countdown while on confirm step
  useEffect(() => {
    if (step !== "confirm" || !quote) { setSecsLeft(null); return; }
    function tick() {
      const left = Math.max(0, Math.round((new Date(quote!.expiresAt).getTime() - Date.now()) / 1000));
      setSecsLeft(left);
      return left;
    }
    tick();
    const id = setInterval(() => { if (tick() <= 0) clearInterval(id); }, 1000);
    return () => clearInterval(id);
  }, [step, quote]);

  async function handleConfirm() {
    if (!quote || !user) return;
    setLoading(true);
    setError("");
    try {
      const t = await createTransfer(
        quote.id,
        user.id,
        crypto.randomUUID(),
        selectedRecipient?.id,
      );
      setTransfer(t);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !user) return null;

  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-gray-200" />}
              <span className={`font-medium ${
                step === s.key ? "text-indigo-600" :
                i < stepIndex ? "text-green-500" : "text-gray-400"
              }`}>
                {i + 1}. {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Recipient ── */}
        {step === "recipient" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Who are you sending to?</h2>

            {user.kycTier === "UNVERIFIED" && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Identity verification required before sending.
              </p>
            )}

            {recipientsLoading ? (
              <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-gray-500">You haven&apos;t added any recipients yet.</p>
                <Link
                  href="/recipients"
                  className="inline-block text-sm font-medium text-indigo-600 hover:underline"
                >
                  Add a recipient →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {recipients.map(r => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedRecipient(r)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                        selectedRecipient?.id === r.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">
                        {r.nickname ? `${r.nickname} (${r.fullName})` : r.fullName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.accountType === "BANK" ? "Bank" : "Mobile wallet"} · {r.accountNumber} · {r.country}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {recipients.length > 0 && (
              <Link
                href="/recipients"
                className="block text-center text-xs text-indigo-600 hover:underline"
              >
                Manage recipients
              </Link>
            )}

            <button
              onClick={() => setStep("quote")}
              disabled={!selectedRecipient || user.kycTier === "UNVERIFIED"}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Quote ── */}
        {step === "quote" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Send money</h2>
              {selectedRecipient && (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                  → {selectedRecipient.nickname ?? selectedRecipient.fullName}
                </span>
              )}
            </div>

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

            <div className="flex gap-3">
              <button
                onClick={() => setStep("recipient")}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!quote}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === "confirm" && quote && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Confirm transfer</h2>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3 text-sm">
              {selectedRecipient && (
                <>
                  <Row label="Recipient" value={selectedRecipient.nickname ?? selectedRecipient.fullName} />
                  <Row label="Account" value={selectedRecipient.accountNumber} />
                  <div className="h-px bg-gray-200" />
                </>
              )}
              <Row label="You send" value={fmt(quote.sendAmount.amount, "AUD")} />
              <Row label="Fee" value={fmt(quote.feeAmount.amount, "AUD")} />
              <div className="h-px bg-gray-200" />
              <Row label="Total charged" value={fmt((Number(quote.sendAmount.amount) + Number(quote.feeAmount.amount)).toFixed(2), "AUD")} bold />
              <Row label="Recipient gets" value={fmt(quote.receiveAmount.amount, destCurrency)} bold accent />
              <Row label="Rate" value={`1 AUD = ${quote.customerRate.toFixed(4)} ${destCurrency}`} />
            </div>

            {/* Countdown / expiry banner */}
            {secsLeft !== null && secsLeft > 0 && secsLeft <= 15 ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <span className="text-amber-600 text-sm font-semibold tabular-nums w-6 text-right">{secsLeft}s</span>
                <span className="text-xs text-amber-700">Rate expiring — confirm now</span>
              </div>
            ) : secsLeft === 0 ? (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                Rate expired. Go back and get a fresh quote.
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Rate locked · {secsLeft !== null ? `${secsLeft}s remaining` : "60s"} · Quote ID: {quote.id.slice(0, 8)}…
              </p>
            )}

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
                disabled={loading || secsLeft === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {loading ? "Sending…" : "Confirm & send"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && transfer && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Transfer created!</h2>
              <p className="text-sm text-gray-500 mt-1">Your transfer is awaiting funding.</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-left space-y-2 text-sm">
              {selectedRecipient && (
                <Row label="Recipient" value={selectedRecipient.nickname ?? selectedRecipient.fullName} />
              )}
              <Row label="Transfer ID" value={transfer.id.slice(0, 13) + "…"} />
              <Row label="Status" value="CREATED" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep("recipient"); setQuote(null); setSelectedRecipient(null); setSendAmount("200"); }}
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
      <span className={`${bold ? "font-semibold" : "font-medium"} ${accent ? "text-indigo-700" : "text-gray-900"} text-right ml-4`}>
        {value}
      </span>
    </div>
  );
}
