const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = opts;
  const token = typeof window !== "undefined" ? localStorage.getItem("remit_token") : null;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, err.message ?? res.statusText, err);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  kycTier: string;
  monthlyLimitAudCents: number;
  createdAt: string;
}

export function register(email: string, fullName: string) {
  return request<User>("/v1/users", { method: "POST", body: { email, fullName } });
}

export function login(email: string) {
  return request<{ token: string; tokenType: string; expiresIn: number }>(
    "/auth/token",
    { method: "POST", body: { email, password: "x" } }
  );
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export interface MoneyView { amount: string; currency: string }

export interface Transfer {
  id: string;
  recipientId: string | null;
  status: string;
  sendAmount: MoneyView;
  feeAmount: MoneyView;
  receiveAmount: MoneyView;
  createdAt: string;
  updatedAt: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  transferId: string | null;
  type: string;
  channel: string;
  subject: string;
  body: string;
  read: boolean;
  sentAt: string;
}

export function listNotifications() {
  return request<Notification[]>("/v1/notifications");
}

export function markNotificationRead(id: string) {
  return request<void>(`/v1/notifications/${id}/read`, { method: "PATCH" });
}
