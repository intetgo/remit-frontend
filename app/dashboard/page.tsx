"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  const kycOk = user.kycTier !== "UNVERIFIED";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-indigo-600">Remit</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          KYC tier: <span className="font-medium text-gray-700">{user.kycTier}</span>
        </p>

        {!kycOk && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Your identity hasn&apos;t been verified yet. KYC is required before you can send money.
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/send"
            className={`flex flex-col gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-5 transition-colors ${!kycOk ? "opacity-40 pointer-events-none" : ""}`}
          >
            <span className="text-2xl">↗</span>
            <span className="font-semibold">Send money</span>
            <span className="text-xs text-indigo-200">Get a live rate and send</span>
          </Link>

          <div className="flex flex-col gap-1 bg-white border border-gray-100 rounded-2xl p-5 text-gray-400">
            <span className="text-2xl">📋</span>
            <span className="font-semibold text-gray-700">Transfers</span>
            <span className="text-xs">Coming soon</span>
          </div>
        </div>
      </main>
    </div>
  );
}
