"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { simKycPass } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

type Step = "intro" | "id" | "selfie" | "review" | "done";

export default function KycPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [idType, setIdType] = useState("passport");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      await simKycPass(user.id, "BASIC");
      await refreshUser();
      setStep("done");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Back to dashboard</Link>
        </div>

        {/* Step: intro */}
        {step === "intro" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">Verify your identity</h1>
              <p className="text-sm text-gray-500">Required before you can send money. Takes about 2 minutes.</p>
            </div>

            <div className="space-y-3">
              {[
                { icon: "🪪", title: "Government-issued ID", desc: "Passport, driver's licence, or national ID" },
                { icon: "🤳", title: "Selfie", desc: "A photo of you holding your ID" },
                { icon: "✅", title: "Instant decision", desc: "Most verifications are approved immediately" },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("id")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Start verification
            </button>
          </div>
        )}

        {/* Step: ID document */}
        {step === "id" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
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
                <option value="licence">Driver's licence</option>
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
              <span className="text-xs text-indigo-600 font-medium border border-indigo-200 rounded-full px-3 py-1 bg-indigo-50">
                Choose file
              </span>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Your document is encrypted and never stored beyond verification.
            </p>
          </div>
        )}

        {/* Step: selfie */}
        {step === "selfie" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Step 2 of 2</p>
              <h1 className="text-xl font-semibold text-gray-900">Take a selfie</h1>
              <p className="text-sm text-gray-500">Hold your ID next to your face so both are clearly visible.</p>
            </div>

            <div className="space-y-2">
              {["Face clearly visible", "ID document readable", "Good lighting", "No sunglasses or hats"].map(tip => (
                <div key={tip} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500 font-bold">✓</span>
                  {tip}
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
              <span className="text-xs text-indigo-600 font-medium border border-indigo-200 rounded-full px-3 py-1 bg-indigo-50">
                Choose file
              </span>
            </div>
          </div>
        )}

        {/* Step: review & submit */}
        {step === "review" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">Ready to submit</h1>
              <p className="text-sm text-gray-500">Review your documents before submitting for verification.</p>
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

        {/* Step: done */}
        {step === "done" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Identity verified!</h1>
              <p className="text-sm text-gray-500 mt-1">Your account is now verified. You can send money.</p>
            </div>
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
