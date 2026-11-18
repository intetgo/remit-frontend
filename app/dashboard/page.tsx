"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          KYC tier: <span className="font-medium text-gray-700">{user.kycTier}</span>
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
          More screens coming soon — send money, view transfers, manage recipients.
        </div>
      </main>
    </div>
  );
}
