"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  listRecipients,
  createRecipient,
  deleteRecipient,
  type Recipient,
  type RecipientAccountType,
  ApiError,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const COUNTRY_OPTIONS = [
  { code: "PH", label: "Philippines" },
  { code: "IN", label: "India" },
  { code: "VN", label: "Vietnam" },
  { code: "ID", label: "Indonesia" },
  { code: "CN", label: "China" },
];

const ACCOUNT_TYPES: Record<string, { value: RecipientAccountType; label: string }[]> = {
  PH: [
    { value: "BANK", label: "Bank Deposit" },
    { value: "MOBILE_WALLET", label: "Mobile Wallet" },
    { value: "CASH_PICKUP", label: "Cash Pickup" },
  ],
};
const DEFAULT_ACCOUNT_TYPES: { value: RecipientAccountType; label: string }[] = [
  { value: "BANK", label: "Bank Deposit" },
];

const PH_MOBILE_WALLETS = [
  { code: "GCASH",      label: "GCash" },
  { code: "MAYA",       label: "Maya (PayMaya)" },
  { code: "SHOPEEPAY",  label: "ShopeePay" },
  { code: "GRABPAY",    label: "GrabPay" },
  { code: "COINS",      label: "Coins.ph" },
  { code: "OMNIPAY",    label: "OmniPay" },
  { code: "BDOPAY",     label: "BDO Pay" },
  { code: "BPIPAY",     label: "BPI Mobile / BPI Pay" },
  { code: "TRUEMONEY",  label: "TrueMoney Wallet" },
  { code: "BAYAD",      label: "Bayad" },
  { code: "CLIQQ",      label: "7-Eleven CLiQQ Pay" },
];

const PH_BANKS = [
  { code: "BDO",        label: "BDO Unibank" },
  { code: "BPI",        label: "Bank of the Philippine Islands (BPI)" },
  { code: "METROBANK",  label: "Metrobank" },
  { code: "PNB",        label: "Philippine National Bank (PNB)" },
  { code: "SECURITYBANK", label: "Security Bank" },
  { code: "UNIONBANK",  label: "UnionBank of the Philippines" },
  { code: "RCBC",       label: "Rizal Commercial Banking Corp (RCBC)" },
  { code: "CHINABANK",  label: "China Banking Corporation" },
  { code: "EASTWEST",   label: "EastWest Bank" },
  { code: "LANDBANK",   label: "Land Bank of the Philippines" },
  { code: "DBP",        label: "Development Bank of the Philippines (DBP)" },
  { code: "PSB",        label: "Philippine Savings Bank (PSBank)" },
  { code: "CIMB",       label: "CIMB Bank Philippines" },
  { code: "MAYA",       label: "Maya Bank" },
  { code: "TONIK",      label: "Tonik Digital Bank" },
  { code: "SEABANK",    label: "SeaBank Philippines" },
  { code: "GOTULONG",   label: "GoTyme Bank" },
];

const BLANK = {
  fullName: "",
  country: "PH",
  accountType: "BANK" as RecipientAccountType,
  bankCode: "",
  accountNumber: "",
  nickname: "",
};

export default function RecipientsPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    try {
      setRecipients(await listRecipients());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRecipient({
        fullName: form.fullName,
        country: form.country,
        accountType: form.accountType,
        bankCode: form.bankCode || undefined,
        accountNumber: form.accountNumber,
        nickname: form.nickname || undefined,
      });
      setForm(BLANK);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add recipient");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteRecipient(id);
      setRecipients(r => r.filter(x => x.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Recipients</h1>
          <button
            onClick={() => { setShowForm(v => !v); setError(""); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {showForm ? "Cancel" : "+ Add recipient"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-800">New recipient</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <input
                  required
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Maria Santos"
                  className={inputCls}
                />
              </Field>
              <Field label="Nickname (optional)">
                <input
                  value={form.nickname}
                  onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                  placeholder="Mum"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Country" required>
                <select
                  value={form.country}
                  onChange={e => {
                    const country = e.target.value;
                    const types = ACCOUNT_TYPES[country] ?? DEFAULT_ACCOUNT_TYPES;
                    const accountType = types.some(t => t.value === form.accountType)
                      ? form.accountType
                      : types[0].value;
                    setForm(f => ({ ...f, country, accountType, bankCode: "" }));
                  }}
                  className={inputCls}
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Account type" required>
                <select
                  value={form.accountType}
                  onChange={e => setForm(f => ({ ...f, accountType: e.target.value as RecipientAccountType, bankCode: "" }))}
                  className={inputCls}
                >
                  {(ACCOUNT_TYPES[form.country] ?? DEFAULT_ACCOUNT_TYPES).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.country === "PH" && form.accountType === "BANK" ? (
                <Field label="Bank" required>
                  <select
                    required
                    value={form.bankCode}
                    onChange={e => setForm(f => ({ ...f, bankCode: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select bank</option>
                    {PH_BANKS.map(b => (
                      <option key={b.code} value={b.code}>{b.label}</option>
                    ))}
                  </select>
                </Field>
              ) : form.country === "PH" && form.accountType === "MOBILE_WALLET" ? (
                <Field label="Mobile wallet" required>
                  <select
                    required
                    value={form.bankCode}
                    onChange={e => setForm(f => ({ ...f, bankCode: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select wallet</option>
                    {PH_MOBILE_WALLETS.map(w => (
                      <option key={w.code} value={w.code}>{w.label}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Bank / wallet code">
                  <input
                    value={form.bankCode}
                    onChange={e => setForm(f => ({ ...f, bankCode: e.target.value }))}
                    placeholder="BDO"
                    className={inputCls}
                  />
                </Field>
              )}
              <Field label="Account number" required>
                <input
                  required
                  value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="1234567890"
                  className={inputCls}
                />
              </Field>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {saving ? "Saving…" : "Save recipient"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        ) : recipients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-sm">No recipients yet. Add one to get started.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recipients.map(r => (
              <li key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {r.nickname ? `${r.nickname} (${r.fullName})` : r.fullName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {{ BANK: "Bank Deposit", MOBILE_WALLET: "Mobile Wallet", CASH_PICKUP: "Cash Pickup" }[r.accountType]} · {r.bankCode ? `${r.bankCode} · ` : ""}{r.accountNumber} · {r.country}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <Link
                    href={`/send?recipientId=${r.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Send
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium"
                  >
                    {deletingId === r.id ? "…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
