"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { adminListUsers, adminListTransfers, type AdminUser, type Transfer } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(amount));
}

function KycBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    FULL:       "bg-purple-100 text-purple-800 border border-purple-200",
    BASIC:      "bg-indigo-100 text-indigo-800 border border-indigo-200",
    UNVERIFIED: "bg-gray-100 text-gray-500 border border-gray-200",
  };
  const labels: Record<string, string> = { FULL: "Enhanced", BASIC: "Basic", UNVERIFIED: "Unverified" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${styles[tier] ?? styles.UNVERIFIED}`}>
      {labels[tier] ?? tier}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return role === "ADMIN"
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">Admin</span>
    : null;
}

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    adminListTransfers(user.id)
      .then(data => setTransfers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(() => {})
      .finally(() => setLoadingTx(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <aside
        className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{user.email}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identity</p>
            <dl className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-gray-500 shrink-0">Name</dt>
                <dd className="text-xs font-medium text-gray-900 text-right">{user.fullName ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-gray-500 shrink-0">Phone</dt>
                <dd className="text-xs font-medium text-gray-900 text-right">{user.phone ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-gray-500 shrink-0">Email verified</dt>
                <dd className="text-xs font-medium text-gray-900 text-right">
                  {user.emailVerifiedAt ? relDate(user.emailVerifiedAt) : <span className="text-amber-600">No</span>}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-gray-500 shrink-0">Joined</dt>
                <dd className="text-xs font-medium text-gray-900 text-right">{relDate(user.createdAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-gray-500 shrink-0">KYC</dt>
                <dd><KycBadge tier={user.kycTier} /></dd>
              </div>
              {user.role === "ADMIN" && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-xs text-gray-500 shrink-0">Role</dt>
                  <dd><RoleBadge role={user.role} /></dd>
                </div>
              )}
            </dl>
          </section>

          {/* Transfers */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Transfers {!loadingTx && `(${transfers.length})`}
            </p>
            {loadingTx ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : transfers.length === 0 ? (
              <p className="text-xs text-gray-400">No transfers yet</p>
            ) : (
              <ul className="space-y-2">
                {transfers.slice(0, 10).map(t => (
                  <li key={t.id} className="rounded-xl border border-gray-100 px-3 py-2 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-900">
                        {fmt(t.sendAmount.amount, t.sendAmount.currency)} → {fmt(t.receiveAmount.amount, t.receiveAmount.currency)}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        t.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        t.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{t.status}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{relDate(t.createdAt)}</p>
                  </li>
                ))}
                {transfers.length > 10 && (
                  <p className="text-[11px] text-gray-400 text-center">{transfers.length - 10} more not shown</p>
                )}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    if (!authLoading && user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListUsers(debouncedQuery || undefined, page);
      setUsers(data.users);
      setTotal(data.total);
    } catch {}
    finally { setLoading(false); }
  }, [debouncedQuery, page]);

  useEffect(() => { if (user) load(); }, [load, user]);

  if (authLoading || !user) return null;

  const pageSize = 20;
  const hasNext = (page + 1) * pageSize < total;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Users</h1>
            {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} account{total !== 1 ? "s" : ""}</p>}
          </div>
          <Link href="/admin/compliance" className="text-sm text-indigo-600 hover:underline">
            Compliance →
          </Link>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No users found</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">User</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">KYC</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Joined</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr
                      key={u.id}
                      onClick={() => setSelected(u)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{u.email}</p>
                          <RoleBadge role={u.role} />
                          {!u.emailVerifiedAt && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">unverified</span>
                          )}
                        </div>
                        {u.fullName && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{u.fullName}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <KycBadge tier={u.kycTier} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{relDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {(page > 0 || hasNext) && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="text-sm text-indigo-600 hover:underline disabled:text-gray-300 disabled:no-underline"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-gray-400">Page {page + 1}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNext}
                    className="text-sm text-indigo-600 hover:underline disabled:text-gray-300 disabled:no-underline"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
