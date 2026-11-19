"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { submitKyc } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

type Step = "status" | "tier" | "digital_id" | "digital_id_redirect" | "id" | "selfie" | "review" | "done";
type Tier = "BASIC" | "FULL";

const DIGITAL_ID_PROVIDERS = [
  { id: "service_nsw", name: "Service NSW",                   desc: "NSW government digital identity",           logo: "🏛️" },
  { id: "myid",        name: "myID (myGovID)",                desc: "Australian federal government digital identity", logo: "🇦🇺" },
  { id: "auspost",     name: "Australia Post Digital iD",      desc: "Verify with Australia Post",                logo: "📮" },
];

const TIER_INFO = {
  BASIC: { label: "Basic",    limit: "A$5,000 / month",  color: "indigo" },
  FULL:  { label: "Enhanced", limit: "A$50,000 / month", color: "purple" },
};

function TierBadge({ tier }: { tier: string }) {
  if (tier === "FULL")  return <span className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Enhanced KYC</span>;
  if (tier === "BASIC") return <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Basic KYC</span>;
  return <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Not verified</span>;
}

export default function KycPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [tier, setTier] = useState<Tier>("BASIC");
  const [idType, setIdType] = useState("passport");
  const [digitalIdProvider, setDigitalIdProvider] = useState<typeof DIGITAL_ID_PROVIDERS[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentTier = user?.kycTier ?? "UNVERIFIED";
  const isVerified = currentTier !== "UNVERIFIED";
  const canUpgrade = currentTier === "BASIC";

  // Initial step depends on verification status
  const [step, setStep] = useState<Step>(isVerified ? "status" : "tier");

  async function handleSubmit() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      await submitKyc(user.id, tier);
      await refreshUser();
      setStep("done");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Back to dashboard</Link>
        </div>

        {/* Current status */}
        {step === "status" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h1 className="text-xl font-semibold text-gray-900">Identity verification</h1>

              <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {currentTier === "FULL" ? "Enhanced KYC — up to A$50,000 / month" : "Basic KYC — up to A$5,000 / month"}
                  </p>
                </div>
                <TierBadge tier={currentTier} />
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Monthly limit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentTier === "FULL" ? "A$50,000" : "A$5,000"}
                </p>
                <p className="text-xs text-gray-400">Resets on the 1st of each month</p>
              </div>

              {canUpgrade && (
                <button
                  onClick={() => { setTier("FULL"); setStep("tier"); }}
                  className="w-full text-left rounded-xl border-2 border-purple-200 bg-purple-50/40 hover:border-purple-400 hover:bg-purple-50 px-5 py-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Upgrade to Enhanced KYC</p>
                      <p className="text-xs text-gray-500 mt-0.5">Increase your limit to A$50,000 / month</p>
                    </div>
                    <span className="text-gray-300 text-sm shrink-0 mt-0.5">›</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tier selection */}
        {step === "tier" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              {isVerified && (
                <button onClick={() => setStep("status")} className="text-xs text-gray-400 hover:text-gray-600 mb-1">← Back</button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">Choose verification level</h1>
              <p className="text-sm text-gray-500">Select the level that fits your sending needs.</p>
            </div>

            <div className="space-y-3">
              {(["BASIC", "FULL"] as Tier[]).map(t => {
                const info = TIER_INFO[t];
                const isCurrent = currentTier === t;
                const isSelected = tier === t;
                return (
                  <button
                    key={t}
                    disabled={isCurrent}
                    onClick={() => setTier(t)}
                    className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-colors
                      ${isCurrent ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50" :
                        isSelected ? "border-indigo-400 bg-indigo-50/40" :
                        "border-gray-200 hover:border-gray-300 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{info.label}</p>
                          {isCurrent && <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{info.limit} sending limit</p>
                        {t === "FULL" && (
                          <p className="text-xs text-gray-400 mt-1">Requires proof of income / source of funds</p>
                        )}
                      </div>
                      {isSelected && !isCurrent && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setStep("digital_id")}
                className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/40 hover:border-indigo-400 hover:bg-indigo-50 px-5 py-4 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🏛️</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">Verify with Australian digital identity</p>
                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Service NSW, myID, or Australia Post Digital iD</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStep("id")}
                className="w-full rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 px-5 py-4 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🪪</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Upload ID document</p>
                    <p className="text-xs text-gray-500 mt-0.5">Passport, driver's licence, or national ID + a selfie</p>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">Your information is encrypted and used only for verification.</p>
          </div>
        )}

        {/* Digital identity — provider selection */}
        {step === "digital_id" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <button onClick={() => setStep("tier")} className="text-xs text-gray-400 hover:text-gray-600 mb-1">← Back</button>
              <h1 className="text-xl font-semibold text-gray-900">Choose your digital identity</h1>
              <p className="text-sm text-gray-500">Select one of the supported Australian digital identity services.</p>
            </div>
            <div className="space-y-3">
              {DIGITAL_ID_PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setDigitalIdProvider(p); setStep("digital_id_redirect"); }}
                  className="w-full text-left rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 px-5 py-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.logo}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Digital identity — simulated redirect */}
        {step === "digital_id_redirect" && digitalIdProvider && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-3xl">
              {digitalIdProvider.logo}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Redirecting to {digitalIdProvider.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                You&apos;ll be taken to {digitalIdProvider.name} to verify your identity.
                Once done, you&apos;ll be returned here automatically.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 text-left">
              <span className="font-semibold">Prototype:</span> In production this redirects to {digitalIdProvider.name}.
              Click below to simulate a successful verification.
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? "Verifying…" : `Simulate ${digitalIdProvider.name} verification`}
            </button>
            <button onClick={() => setStep("digital_id")} className="block w-full text-sm text-gray-400 hover:text-gray-600">
              Choose a different provider
            </button>
          </div>
        )}

        {/* ID document upload */}
        {step === "id" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <button onClick={() => setStep("tier")} className="text-xs text-gray-400 hover:text-gray-600 mb-1">← Back</button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Step 1 of 2</p>
              <h1 className="text-xl font-semibold text-gray-900">Upload your ID</h1>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Document type</label>
              <select
                value={idType}
                onChange={e => setIdType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="passport">Passport</option>
                <option value="licence">Driver&apos;s licence</option>
                <option value="national_id">National ID card</option>
              </select>
            </div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              onClick={() => setStep("selfie")}
            >
              <span className="text-4xl">📄</span>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Tap to upload front of document</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF · max 10 MB</p>
              </div>
              <span className="text-xs text-indigo-600 font-medium border border-indigo-200 rounded-full px-3 py-1 bg-indigo-50">Choose file</span>
            </div>
            <p className="text-xs text-gray-400 text-center">Your document is encrypted and never stored beyond verification.</p>
          </div>
        )}

        {/* Selfie */}
        {step === "selfie" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <button onClick={() => setStep("id")} className="text-xs text-gray-400 hover:text-gray-600 mb-1">← Back</button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Step 2 of 2</p>
              <h1 className="text-xl font-semibold text-gray-900">Take a selfie</h1>
              <p className="text-sm text-gray-500">Hold your ID next to your face so both are clearly visible.</p>
            </div>
            <div className="space-y-2">
              {["Face clearly visible", "ID document readable", "Good lighting", "No sunglasses or hats"].map(tip => (
                <div key={tip} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500 font-bold">✓</span> {tip}
                </div>
              ))}
            </div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              onClick={() => setStep("review")}
            >
              <span className="text-4xl">🤳</span>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Tap to open camera or upload photo</p>
                <p className="text-xs text-gray-400 mt-1">JPG or PNG · max 10 MB</p>
              </div>
              <span className="text-xs text-indigo-600 font-medium border border-indigo-200 rounded-full px-3 py-1 bg-indigo-50">Choose file</span>
            </div>
          </div>
        )}

        {/* Review & submit */}
        {step === "review" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <button onClick={() => setStep("selfie")} className="text-xs text-gray-400 hover:text-gray-600 mb-1">← Back</button>
              <h1 className="text-xl font-semibold text-gray-900">Ready to submit</h1>
              <p className="text-sm text-gray-500">Review your documents before submitting for verification.</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">Verification level</p>
              <TierBadge tier={tier} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                <span className="text-xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {idType === "passport" ? "Passport" : idType === "licence" ? "Driver's licence" : "National ID"} uploaded
                  </p>
                  <p className="text-xs text-gray-500">Front · Looks good</p>
                </div>
                <span className="text-green-500 font-bold text-lg">✓</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                <span className="text-xl">🤳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Selfie uploaded</p>
                  <p className="text-xs text-gray-500">Face and ID visible · Looks good</p>
                </div>
                <span className="text-green-500 font-bold text-lg">✓</span>
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              By submitting you confirm these are genuine documents and the selfie is of you.
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Identity verified!</h1>
              <p className="text-sm text-gray-500 mt-1">
                {tier === "FULL"
                  ? "Your account is now enhanced-verified. You can send up to A$50,000 / month."
                  : "Your account is verified. You can send up to A$5,000 / month."}
              </p>
            </div>
            <TierBadge tier={tier} />
            <button
              onClick={() => router.push("/send")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Send money now
            </button>
            <Link href="/dashboard" className="block text-sm text-gray-400 hover:text-gray-600">
              Back to dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
