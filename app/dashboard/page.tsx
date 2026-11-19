"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";

export default function DashboardPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  const kycOk = user.kycTier !== "UNVERIFIED";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          KYC tier: <span className="font-medium text-gray-700">{user.kycTier}</span>
        </p>

        {!kycOk && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-4">
            <span>Your identity hasn&apos;t been verified yet. KYC is required before you can send money.</span>
            <Link
              href="/kyc"
              className="shrink-0 font-medium underline underline-offset-2 hover:text-amber-900"
            >
              Verify identity →
            </Link>
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

          <Link
            href="/transfers"
            className="flex flex-col gap-1 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-5 transition-all"
          >
            <span className="text-2xl">📋</span>
            <span className="font-semibold text-gray-700">Transfers</span>
            <span className="text-xs text-gray-400">View history</span>
          </Link>
        </div>

        <div className="flex gap-4 text-sm">
          <Link href="/recipients" className="text-indigo-600 hover:underline">Manage recipients</Link>
          <Link href="/sim" className="text-gray-400 hover:text-gray-600">Sim controls</Link>
        </div>
      </main>
    </div>
  );
}
