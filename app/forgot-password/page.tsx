"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setResetUrl(res.resetUrl);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            {submitted ? "Check the link below" : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="maria@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 text-center">
            <div className="text-3xl">✉️</div>
            <p className="text-sm text-gray-700">
              If <span className="font-medium">{email}</span> is registered, a reset link has been sent.
            </p>

            {resetUrl && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-semibold text-amber-800">Dev mode — no email provider configured</p>
                <p className="text-xs text-amber-700">In production this would be emailed. Use the link below:</p>
                <Link
                  href={resetUrl}
                  className="block text-xs text-indigo-700 underline break-all mt-1"
                >
                  {resetUrl}
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
