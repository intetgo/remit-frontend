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

export function getUser(id: string) {
  return request<User>(`/v1/users/${id}`);
}

export function login(email: string) {
  return request<{ token: string; tokenType: string; expiresIn: number }>(
    "/auth/token",
    { method: "POST", body: { email, password: "x" } }
  );
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export interface MoneyView { amount: string; currency: string }

export interface Quote {
  id: string;
  sendAmount: MoneyView;
  feeAmount: MoneyView;
  receiveAmount: MoneyView;
  customerRate: number;
  expiresAt: string;
  expired: boolean;
  used: boolean;
}

export const CORRIDORS: { from: string; to: string; label: string }[] = [
  { from: "AUD", to: "PHP", label: "Philippines (PHP)" },
  { from: "AUD", to: "INR", label: "India (INR)" },
  { from: "AUD", to: "VND", label: "Vietnam (VND)" },
  { from: "AUD", to: "IDR", label: "Indonesia (IDR)" },
  { from: "AUD", to: "CNY", label: "China (CNY)" },
];

export function getQuote(sendAmount: string, destCurrency: string) {
  return request<Quote>("/v1/quotes", {
    method: "POST",
    body: { sourceCurrency: "AUD", destCurrency, sendAmount },
  });
}

// ── Transfers ─────────────────────────────────────────────────────────────────

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

export function createTransfer(quoteId: string, userId: string, idempotencyKey: string, recipientId?: string) {
  return request<Transfer>("/v1/transfers", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: { quoteId, userId, ...(recipientId ? { recipientId } : {}) },
  });
}

export function getTransfer(id: string) {
  return request<Transfer>(`/v1/transfers/${id}`);
}

export function listTransfers(userId: string) {
  return request<Transfer[]>(`/v1/transfers?userId=${userId}`);
}

// ── Recipients ────────────────────────────────────────────────────────────────

export type RecipientAccountType = "BANK" | "MOBILE_WALLET";

export interface Recipient {
  id: string;
  userId: string;
  fullName: string;
  country: string;
  accountType: RecipientAccountType;
  bankCode: string | null;
  accountNumber: string;
  nickname: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipientRequest {
  fullName: string;
  country: string;
  accountType: RecipientAccountType;
  bankCode?: string;
  accountNumber: string;
  nickname?: string;
}

export function listRecipients() {
  return request<Recipient[]>("/v1/recipients");
}

export function createRecipient(data: CreateRecipientRequest) {
  return request<Recipient>("/v1/recipients", { method: "POST", body: data });
}

export function deleteRecipient(id: string) {
  return request<void>(`/v1/recipients/${id}`, { method: "DELETE" });
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

export function markAllNotificationsRead() {
  return request<void>("/v1/notifications/read-all", { method: "PATCH" });
}

// ── Sim / prototype controls ──────────────────────────────────────────────────

async function simRequest<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token } = await request<{ token: string }>("/sim/token", { method: "POST" });
  const { body, headers, ...rest } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

export interface ComplianceCase {
  id: string;
  transferId: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export function simFundingReceive(transferId: string) {
  return simRequest<Transfer>(`/sim/transfers/${transferId}/funding/receive`, { method: "POST" });
}
export function simFundingFail(transferId: string) {
  return simRequest<Transfer>(`/sim/transfers/${transferId}/funding/fail`, { method: "POST" });
}
export function simPayoutComplete(transferId: string) {
  return simRequest<Transfer>(`/sim/transfers/${transferId}/payout/complete`, { method: "POST" });
}
export function simPayoutFail(transferId: string) {
  return simRequest<Transfer>(`/sim/transfers/${transferId}/payout/fail`, { method: "POST" });
}
export function simRefundComplete(transferId: string) {
  return simRequest<Transfer>(`/sim/transfers/${transferId}/refund/complete`, { method: "POST" });
}
export function simCancelTransfer(transferId: string) {
  return simRequest<Transfer>(`/sim/transfers/${transferId}/cancel`, { method: "POST" });
}
export function simKycPass(userId: string, tier: string) {
  return simRequest<unknown>(`/sim/users/${userId}/kyc/pass?tier=${tier}`, { method: "POST" });
}
export function simKycFail(userId: string, tier: string) {
  return simRequest<unknown>(`/sim/users/${userId}/kyc/fail?tier=${tier}`, { method: "POST" });
}
export function listComplianceCases() {
  return simRequest<ComplianceCase[]>("/admin/compliance/cases");
}
export function approveComplianceCase(caseId: string) {
  return simRequest<unknown>(`/admin/compliance/cases/${caseId}/approve`, { method: "POST" });
}
export function rejectComplianceCase(caseId: string) {
  return simRequest<unknown>(`/admin/compliance/cases/${caseId}/reject`, { method: "POST" });
}
