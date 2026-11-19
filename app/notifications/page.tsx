"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const ICON_MAP: Record<string, { icon: string; bg: string; text: string }> = {
  TRANSFER_CREATED:          { icon: "✦", bg: "bg-blue-100",   text: "text-blue-600" },
  TRANSFER_FUNDED:           { icon: "↓", bg: "bg-green-100",  text: "text-green-700" },
  TRANSFER_PAYOUT_PENDING:   { icon: "⟳", bg: "bg-indigo-100", text: "text-indigo-600" },
  TRANSFER_PAYOUT_SENT:      { icon: "↑", bg: "bg-indigo-100", text: "text-indigo-700" },
  TRANSFER_COMPLETED:        { icon: "✓", bg: "bg-green-100",  text: "text-green-700" },
  TRANSFER_FAILED:           { icon: "✕", bg: "bg-red-100",    text: "text-red-600" },
  TRANSFER_CANCELLED:        { icon: "✕", bg: "bg-gray-100",   text: "text-gray-500" },
  COMPLIANCE_REVIEW_STARTED: { icon: "⚑", bg: "bg-amber-100",  text: "text-amber-700" },
  COMPLIANCE_APPROVED:       { icon: "✓", bg: "bg-green-100",  text: "text-green-700" },
  COMPLIANCE_REJECTED:       { icon: "✕", bg: "bg-red-100",    text: "text-red-600" },
  TRANSFER_REFUNDED:         { icon: "↩", bg: "bg-orange-100", text: "text-orange-700" },
};

function NotifIcon({ type }: { type: string }) {
  const s = ICON_MAP[type] ?? { icon: "•", bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${s.bg} ${s.text}`}>
      {s.icon}
    </span>
  );
}

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [];
  const buckets: Record<string, Notification[]> = {};

  for (const n of notifications) {
    const d = new Date(n.sentAt);
    d.setHours(0, 0, 0, 0);
    let key: string;
    if (d.getTime() === today.getTime()) key = "Today";
    else if (d.getTime() === yesterday.getTime()) key = "Yesterday";
    else key = d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    if (!buckets[key]) { buckets[key] = []; groups.push({ label: key, items: buckets[key] }); }
    buckets[key].push(n);
  }
  return groups;
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listNotifications();
      setNotifications(data.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleClick(n: Notification) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch {}
    }
    if (n.transferId) router.push(`/transfers/${n.transferId}`);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setNotifications(ns => ns.map(x => ({ ...x, read: true })));
    } catch {}
  }

  if (authLoading || !user) return null;

  const unread = notifications.filter(n => !n.read).length;
  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
            {unread > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">{unread} unread</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-sm font-medium text-gray-700">You&apos;re all caught up</p>
            <p className="text-xs text-gray-400 mt-1">Transfer updates will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ label, items }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                  {label}
                </p>
                <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                  {items.map(n => (
                    <li
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`px-5 py-4 flex items-start gap-4 transition-colors
                        ${n.transferId ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}
                        ${!n.read ? "bg-indigo-50/30" : ""}`}
                    >
                      <NotifIcon type={n.type} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {n.subject}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">{relDate(n.sentAt)}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{n.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
