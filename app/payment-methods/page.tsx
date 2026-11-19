"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/lib/auth";
import {
  getSetupIntent,
  saveCard,
  listSavedCards,
  deleteSavedCard,
  type SavedCard,
  ApiError,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1f2937",
      fontFamily: "'Inter', system-ui, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

function AddCardForm({ onAdded }: { onAdded: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError("");
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    try {
      const clientSecret = (window as Window & { __setupSecret?: string }).__setupSecret;
      if (!clientSecret) throw new Error("Missing setup intent");
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });
      if (result.error) {
        setError(result.error.message ?? "Card setup failed");
        return;
      }
      const pmId = result.setupIntent?.payment_method;
      if (typeof pmId !== "string") throw new Error("No payment method returned");
      await saveCard(pmId);
      cardEl.clear();
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-gray-300 px-3 py-3 bg-white">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={saving || !stripe}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
      >
        {saving ? "Saving…" : "Save card"}
      </button>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [setupError, setSetupError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    try {
      setCards(await listSavedCards());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function openAddForm() {
    setSetupError("");
    setShowForm(true);
    try {
      const { clientSecret: cs } = await getSetupIntent();
      setClientSecret(cs);
      (window as Window & { __setupSecret?: string }).__setupSecret = cs;
    } catch {
      setSetupError("Could not start card setup. Please try again.");
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteSavedCard(id);
      setCards(c => c.filter(x => x.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function brandIcon(brand: string) {
    const b = brand.toLowerCase();
    if (b === "visa") return "💳";
    if (b === "mastercard") return "💳";
    if (b === "amex") return "💳";
    return "💳";
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
            <span className="text-gray-200">/</span>
            <h1 className="text-lg font-semibold text-gray-900">Payment methods</h1>
          </div>
          {!showForm && (
            <button
              onClick={openAddForm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              + Add card
            </button>
          )}
        </div>

        {setupError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{setupError}</p>
        )}

        {showForm && clientSecret && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Add a new card</h2>
              <button
                onClick={() => { setShowForm(false); setClientSecret(null); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Card details are handled securely by Stripe — we never see your card number.
            </p>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <AddCardForm onAdded={() => { setShowForm(false); setClientSecret(null); load(); }} />
            </Elements>
          </div>
        )}

        {showForm && !clientSecret && !setupError && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-center text-sm text-gray-400">
            Loading card form…
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        ) : cards.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-sm">No saved cards yet.</p>
            <button
              onClick={openAddForm}
              className="mt-4 text-sm text-indigo-600 hover:underline font-medium"
            >
              Add your first card
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {cards.map(card => (
              <li
                key={card.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{brandIcon(card.brand)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {card.brand} •••• {card.last4}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(card.id)}
                  disabled={deletingId === card.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium"
                >
                  {deletingId === card.id ? "…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
