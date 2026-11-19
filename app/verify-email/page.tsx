"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail, ApiError } from "@/lib/api";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found in the link.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(err => {
        setStatus("error");
        setErrorMsg(
          err instanceof ApiError && err.status === 401
            ? "This verification link has expired or already been used."
            : "Something went wrong. Please try again."
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === "loading" && (
          <p className="text-sm text-gray-500">Verifying your email…</p>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
            <div className="text-3xl">✅</div>
            <h1 className="text-xl font-semibold text-gray-900">Email verified!</h1>
            <p className="text-sm text-gray-500">Your email address has been confirmed.</p>
            <Link
              href="/dashboard"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
            <div className="text-3xl">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900">Verification failed</h1>
            <p className="text-sm text-red-600">{errorMsg}</p>
            <Link href="/login" className="text-sm text-indigo-600 hover:underline">
              ← Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
