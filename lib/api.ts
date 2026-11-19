const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("remit_refresh_token") : null;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem("remit_token", data.token);
    localStorage.setItem("remit_refresh_token", data.refreshToken);
    return data.token as string;
  } catch {
    return null;
  }
}

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
    const isAuthPath = path === "/auth/token" || path === "/auth/refresh";
    if (res.status === 401 && !isAuthPath && typeof window !== "undefined") {
      // Try refreshing once
      let newToken: string | null = null;
      if (isRefreshing) {
        newToken = await new Promise<string | null>(resolve => refreshQueue.push(resolve));
      } else {
        isRefreshing = true;
        newToken = await attemptRefresh();
        refreshQueue.forEach(resolve => resolve(newToken));
        refreshQueue = [];
        isRefreshing = false;
      }

      if (newToken) {
        // Retry original request with new token
        const retry = await fetch(`${BASE}${path}`, {
          ...rest,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newToken}`,
            ...headers,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (retry.ok) {
          if (retry.status === 204) return undefined as T;
          return retry.json() as Promise<T>;
        }
      }

      // Refresh failed — clear session and redirect
      localStorage.removeItem("remit_token");
      localStorage.removeItem("remit_refresh_token");
      localStorage.removeItem("remit_user");
      window.location.href = "/login?expired=1";
      throw new ApiError(401, "Session expired");
    }
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
  phone: string | null;
  fullName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  addressState: string | null;
  postcode: string | null;
  country: string | null;
  kycTier: string;
  monthlyLimitAudCents: number;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  addressState?: string;
  postcode?: string;
  country?: string;
}

export function updateProfile(id: string, data: UpdateProfileRequest) {
  return request<User>(`/v1/users/${id}`, { method: "PATCH", body: data });
}

export function register(email: string, fullName: string, password: string) {
  return request<User>("/v1/users", { method: "POST", body: { email, fullName, password } });
}

export function getUser(id: string) {
  return request<User>(`/v1/users/${id}`);
}

export function changePassword(userId: string, currentPassword: string, newPassword: string) {
  return request<void>(`/v1/users/${userId}/password`, {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export function submitKyc(userId: string, tier: "BASIC" | "FULL") {
  return request<{ id: string; userId: string; tier: string; status: string; checkedAt: string }>(
    `/v1/users/${userId}/kyc`,
    { method: "POST", body: { tier } }
  );
}

export function adminBootstrap(email: string, secret: string) {
  return request<void>("/auth/admin-bootstrap", { method: "POST", body: { email, secret } });
}

export function verifyEmail(token: string) {
  return request<void>(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: "POST" });
}

export function resendVerification(email: string) {
  return request<void>("/auth/resend-verification", { method: "POST", body: { email } });
}

export function forgotPassword(email: string) {
  return request<{ message: string }>(
    "/auth/forgot-password",
    { method: "POST", body: { email } }
  );
}

export function resetPassword(token: string, password: string) {
  return request<void>("/auth/reset-password", { method: "POST", body: { token, password } });
}

export function login(email: string, password: string) {
  return request<{ token: string; tokenType: string; expiresIn: number; refreshToken: string }>(
    "/auth/token",
    { method: "POST", body: { email, password } }
  );
}

export function logoutApi(refreshToken: string) {
  return request<void>("/auth/logout", { method: "POST", body: { refreshToken } });
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

export function cancelTransfer(id: string) {
  return request<Transfer>(`/v1/transfers/${id}/cancel`, { method: "POST" });
}

export function listTransfers(userId: string) {
  return request<Transfer[]>(`/v1/transfers?userId=${userId}`);
}

// ── Recipients ────────────────────────────────────────────────────────────────

export type RecipientAccountType = "BANK" | "MOBILE_WALLET" | "CASH_PICKUP";

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

// ── Payment Methods ───────────────────────────────────────────────────────────

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  createdAt: string;
}

export function getSetupIntent() {
  return request<{ clientSecret: string }>("/v1/payment-methods/setup-intent", { method: "POST" });
}

export function saveCard(stripePaymentMethodId: string) {
  return request<SavedCard>("/v1/payment-methods", {
    method: "POST",
    body: { stripePaymentMethodId },
  });
}

export function listSavedCards() {
  return request<SavedCard[]>("/v1/payment-methods");
}

export function deleteSavedCard(id: string) {
  return request<void>(`/v1/payment-methods/${id}`, { method: "DELETE" });
}

export function fundTransferByCard(transferId: string, savedCardId: string) {
  return request<{ status: string; paymentIntentId: string }>(
    `/v1/transfers/${transferId}/fund/card`,
    { method: "POST", body: { savedCardId } }
  );
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

// Admin compliance panel — uses sim token (required for /admin/** ADMIN role)
export function adminListComplianceCases(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return simRequest<ComplianceCase[]>(`/admin/compliance/cases${qs}`);
}
export function adminApproveCase(caseId: string) {
  return simRequest<ComplianceCase>(`/admin/compliance/cases/${caseId}/approve`, { method: "POST" });
}
export function adminRejectCase(caseId: string) {
  return simRequest<ComplianceCase>(`/admin/compliance/cases/${caseId}/reject`, { method: "POST" });
}
