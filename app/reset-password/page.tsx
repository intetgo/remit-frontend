"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
        <p className="text-sm text-red-600">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-sm text-indigo-600 hover:underline">
          Request a new link →
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "This reset link has expired or already been used."
          : err instanceof ApiError ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-3">
        <div className="text-3xl">✓</div>
        <p className="text-sm font-medium text-gray-800">Password updated!</p>
        <p className="text-xs text-gray-400">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
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
        {loading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Set new password</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account</p>
        </div>

        <Suspense>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
