"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, getUser, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const { setAuth, user, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  if (authLoading || user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setRateLimited(false);
    setRetryAfter(0);
    setLoading(true);
    try {
      const { token, refreshToken } = await login(email, password);
      const payload = JSON.parse(atob(token.split(".")[1]));
      localStorage.setItem("remit_token", token);
      const userProfile = await getUser(payload.sub);
      setAuth(userProfile, token, refreshToken);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const secs = (err.body as { retryAfterSeconds?: number })?.retryAfterSeconds ?? 60;
        setRateLimited(true);
        setRetryAfter(secs);
        const timer = setInterval(() => {
          setRetryAfter(prev => {
            if (prev <= 1) { clearInterval(timer); setRateLimited(false); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(err instanceof ApiError ? err.message : "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your Remit account</p>
        </div>

        {expired && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Your session expired. Please sign in again.
          </div>
        )}

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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {rateLimited && (
            <div className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              Too many sign-in attempts.{" "}
              {retryAfter > 0
                ? <>Try again in <span className="font-medium tabular-nums">{retryAfter}s</span>.</>
                : "Please try again."}
            </div>
          )}

          {error && !rateLimited && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || rateLimited}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
