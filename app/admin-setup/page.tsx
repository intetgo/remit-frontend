"use client";

import { useState } from "react";
import Link from "next/link";
import { adminBootstrap, ApiError } from "@/lib/api";

export default function AdminSetupPage() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminBootstrap(email, secret);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError("Incorrect bootstrap secret.");
        else if (err.status === 409) setError("An admin account already exists.");
        else setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Admin setup</h1>
          <p className="mt-1 text-sm text-gray-500">
            Promote an existing account to admin. Only works once.
          </p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4 text-center">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-medium text-gray-900">Admin account created.</p>
            <p className="text-xs text-gray-500">
              Sign out and back in with <span className="font-medium">{email}</span> to get the ADMIN role.
            </p>
            <Link href="/login" className="block text-sm text-indigo-600 hover:underline">
              Go to sign in →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Account email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="secret">
                Bootstrap secret
              </label>
              <input
                id="secret"
                type="password"
                required
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="From ADMIN_BOOTSTRAP_SECRET env var"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-400">
                Dev default: <code>dev-bootstrap-secret</code>
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? "Promoting…" : "Promote to admin"}
            </button>
          </form>
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
