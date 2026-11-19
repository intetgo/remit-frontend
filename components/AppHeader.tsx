"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/api";

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function AppHeader({ title = "Remit" }: { title?: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listNotifications();
      setNotifications(data.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));
    } catch {}
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  async function handleOpen() {
    setOpen(v => !v);
    if (!open) await load();
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch {}
    }
    if (n.transferId) {
      setOpen(false);
      router.push(`/transfers/${n.transferId}`);
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setNotifications(ns => ns.map(x => ({ ...x, read: true })));
    } catch {}
  }

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">{title}</Link>

      <div className="flex items-center gap-4">
        {/* Bell */}
        {user && (
          <div className="relative" ref={ref}>
            <button
              onClick={handleOpen}
              className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAll}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                ) : (
                  <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map(n => (
                      <li
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`px-4 py-3 transition-colors ${n.transferId ? "cursor-pointer hover:bg-gray-50" : "cursor-default"} ${!n.read ? "bg-indigo-50/40" : ""}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-indigo-500" : "bg-transparent"}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                              {n.subject}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{relativeDate(n.sentAt)}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {user && (
          <Link href="/payment-methods" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            💳 Cards
          </Link>
        )}
        {user && (
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-900 transition-colors truncate max-w-[160px]">
            {user.email}
          </Link>
        )}
        {user && (
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
