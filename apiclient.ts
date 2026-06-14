// Typed client for the FitRoom NestJS API. Mirrors the backend contract.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const TOKEN_KEY = 'fitroom_token';
const REFRESH_KEY = 'fitroom_refresh';

export type Role = 'CUSTOMER' | 'DESIGNER' | 'ADMIN';
export type GarmentStretch = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type FitPreference = 'tight' | 'regular' | 'relaxed' | 'oversized';
export type OrderStatus =
  | 'REQUESTED' | 'QUOTED' | 'PAID' | 'CUTTING' | 'SEWING'
  | 'QUALITY_CHECK' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface AuthUser {
  id: string; name: string; email: string; role: Role; consentBodyData: boolean; emailVerified: boolean;
}
export interface AuthResult { accessToken: string; refreshToken: string; user: AuthUser; }

export interface SizeChart { sizes: string[]; chest: number[]; waist: number[]; }
export interface Product {
  id: string; designerId: string; title: string; category: string;
  fabric: string; stretch: GarmentStretch; priceKobo: number;
  images: string[]; sizeChart: SizeChart;
}
export interface Designer {
  id: string; brand: string; location: string; leadTime: string;
  specialties: string[]; verificationStatus: string; products?: Product[];
}
export type Measurements = Record<string, { val: number; conf: number }>;
export interface FitProfile {
  id: string; label: string; version: number; fitPref: FitPreference; measurements: Measurements;
}
export interface Quote {
  id: string; orderId: string; amountKobo: number; leadTime?: string; status: string;
}
export interface OrderEvent { id: string; stage: string; note?: string; createdAt: string; }
export interface Order {
  id: string; customerId: string; designerId: string; productId?: string;
  garment: string; fabric: string; style: Record<string, string>;
  addons: string[]; notes?: string; recommendedSize?: string; fitConfidence?: number;
  basePriceKobo: number; status: OrderStatus; createdAt: string;
  quotes?: Quote[]; events?: OrderEvent[];
}
export interface FitCheckResult {
  recommendedSize: string; fitConfidence: number; warnings: string[]; alternativeSize: string | null;
}
export interface DesignerDashboard {
  designerId: string; brand: string; openRequests: number; activeOrders: number;
  paidOrders: number; paidRevenueKobo: number; productCount: number;
}
export interface B2BPartner {
  id: string; company: string; domain: string; webhookUrl?: string | null;
  webhookSecret?: string; plan: string; status: string;
}
export type ScanStatus = 'PENDING' | 'UPLOADED' | 'PROCESSED' | 'FAILED' | 'EXPIRED';
export interface ScanSession {
  id: string; status: ScanStatus; declaredHeightCm?: number; modelVersion?: string;
  measurements?: Measurements; expiresAt?: string; assetUrls?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
}
export function getRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}
export function setRefresh(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) window.localStorage.setItem(REFRESH_KEY, t);
  else window.localStorage.removeItem(REFRESH_KEY);
}
export function setSession(r: AuthResult) { setToken(r.accessToken); setRefresh(r.refreshToken); }
export function clearSession() { setToken(null); setRefresh(null); }

// Single-flight refresh: many 401s share one refresh round-trip.
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  const rt = getRefresh();
  if (!rt) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) { clearSession(); return false; }
        const data = (await res.json()) as AuthResult;
        setSession(data);
        return true;
      } catch { return false; }
      finally { refreshing = null; }
    })();
  }
  return refreshing;
}

async function request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as Record<string, string>) } });

  // Transparent access-token refresh on 401 (once, never for /auth/* calls).
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(path, opts, false);
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const body = await res.json(); msg = (body.message ?? msg) as string; if (Array.isArray(msg)) msg = msg.join(', '); } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
const get = <T>(p: string) => request<T>(p);
const post = <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del = <T>(p: string) => request<T>(p, { method: 'DELETE' });

export const api = {
  // auth
  register: (b: { name: string; email: string; password: string; role?: Role; consentBodyData?: boolean }) =>
    post<AuthResult>('/auth/register', b),
  login: (b: { email: string; password: string }) => post<AuthResult>('/auth/login', b),
  logout: () => { const rt = getRefresh(); return post<{ ok: boolean }>('/auth/logout', { refreshToken: rt ?? '' }); },
  verifyEmail: (token: string) => post<{ verified: boolean }>('/auth/verify-email', { token }),
  resendVerification: () => post<{ ok: boolean }>('/auth/resend-verification'),
  forgotPassword: (email: string) => post<{ ok: boolean }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => post<{ ok: boolean }>('/auth/reset-password', { token, password }),
  me: () => get<AuthUser>('/users/me'),
  setConsent: (consent: boolean) => patch<{ id: string; consentBodyData: boolean }>('/users/me/consent', { consent }),

  // fit profiles + engine
  createFitProfile: (b: { measurements: Measurements; label?: string; fitPref?: FitPreference }) => post<FitProfile>('/fit-profiles', b),
  listFitProfiles: () => get<FitProfile[]>('/fit-profiles'),
  latestFitProfile: () => get<FitProfile>('/fit-profiles/latest'),
  getFitProfile: (id: string) => get<FitProfile>(`/fit-profiles/${id}`),
  deleteFitProfile: (id: string) => del<{ deleted: number }>(`/fit-profiles/${id}`),
  deleteFitProfiles: () => del<{ deleted: number }>('/fit-profiles'),
  fitCheck: (b: {
    productId?: string; category?: string; stretch?: GarmentStretch; sizeChart?: SizeChart;
    chest: number; waist: number; chestConfidence?: number; waistConfidence?: number; fitPreference: FitPreference;
  }) => post<FitCheckResult>('/garments/fit-check', b),

  // scan / measurement capture
  createScan: (b: { declaredHeightCm?: number }) => post<ScanSession>('/scan-sessions', b),
  uploadScanAssets: (id: string, b: { front?: string; side?: string; qualityScore?: number }) =>
    post<ScanSession>(`/scan-sessions/${id}/assets`, b),
  generateScan: (id: string, b: { declaredHeightCm?: number } = {}) =>
    post<ScanSession>(`/scan-sessions/${id}/generate`, b),
  getScan: (id: string) => get<ScanSession>(`/scan-sessions/${id}`),
  deleteScan: (id: string) => del<{ deleted: boolean }>(`/scan-sessions/${id}`),

  // designers
  createDesigner: (b: { brand: string; location: string; leadTime?: string; specialties?: string[] }) =>
    post<Designer>('/designers', b),
  getDesigner: (id: string) => get<Designer>(`/designers/${id}`),
  designerDashboard: () => get<DesignerDashboard>('/designers/me/dashboard'),

  // analytics (Batch 5)
  designerAnalytics: () => get<{
    brand: string; ordersRequested: number; ordersPaid: number; conversionPct: number;
    commonSizes: { key: string; count: number }[]; commonGarments: { key: string; count: number }[];
    alterationRequests: number; alterationRatePct: number;
  }>('/analytics/designer'),
  platformAnalytics: () => get<unknown>('/analytics/platform'),

  // admin (Batch: admin dashboard)
  adminOverview: () => get<{
    acquisition: { customers: number; designers: number };
    activation: { usersWithProfile: number; profileRatePct: number; scansTotal: number; scanCompletionPct: number };
    commerce: { ordersRequested: number; ordersPaid: number; conversionPct: number; gmvKobo: number; avgOrderValueKobo: number };
    fitQuality: { alterationRequests: number; alterationRatePct: number };
    pendingDesigners: number; partners: number; openDisputes: number;
  }>('/admin/overview'),
  adminDesigners: () => get<{
    id: string; brand: string; location: string; specialties: string[]; verificationStatus: string;
    createdAt: string; user: { name: string; email: string }; _count: { orders: number; products: number };
  }[]>('/admin/designers'),
  adminSetDesignerStatus: (id: string, status: 'PENDING' | 'VERIFIED' | 'SUSPENDED') =>
    post<{ id: string; brand: string; verificationStatus: string }>(`/admin/designers/${id}/status`, { status }),
  adminOrders: () => get<{
    id: string; garment: string; fabric: string; status: string; createdAt: string;
    customer: { name: string }; designer: { brand: string };
  }[]>('/admin/orders'),
  adminFitIssues: () => get<{
    id: string; orderId: string; note: string | null; createdAt: string; garment: string; customer: string; brand: string;
  }[]>('/admin/fit-issues'),

  // B2B partner portal (Batch 6)
  createPartner: (b: { company: string; domain: string; webhookUrl?: string }) =>
    post<B2BPartner>('/b2b/partners', b),
  getPartner: () => get<B2BPartner>('/b2b/partners/me'),
  updatePartner: (b: { company?: string; domain?: string; webhookUrl?: string }) =>
    patch<B2BPartner>('/b2b/partners/me', b),
  createApiKey: (type: 'PUBLISHABLE' | 'SECRET') =>
    post<{ type: string; key: string; prefix: string }>('/b2b/api-keys', { type }),
  listApiKeys: () => get<{ id: string; type: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }[]>('/b2b/api-keys'),
  revokeApiKey: (id: string) => del<{ revoked: boolean }>(`/b2b/api-keys/${id}`),
  b2bUsage: () => get<{ totalEvents: number; last30Days: number; recent: { type: string; productRef: string | null; sizeRecommended: string | null; fitConfidence: number | null; createdAt: string }[] }>('/b2b/usage'),

  // products
  listProducts: (q?: { designerId?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (q?.designerId) params.set('designerId', q.designerId);
    if (q?.category) params.set('category', q.category);
    const s = params.toString();
    return get<Product[]>(`/products${s ? `?${s}` : ''}`);
  },
  getProduct: (id: string) => get<Product>(`/products/${id}`),
  createProduct: (b: Omit<Product, 'id' | 'designerId' | 'images'> & { images?: string[] }) =>
    post<Product>('/products', b),

  // orders
  createOrder: (b: {
    designerId: string; productId?: string; garment: string; fabric: string;
    style: Record<string, string>; addons?: string[]; notes?: string;
    fitPreference: FitPreference; measurements?: Measurements;
  }) => post<Order>('/orders', b),
  listOrders: () => get<Order[]>('/orders'),
  getOrder: (id: string) => get<Order>(`/orders/${id}`),
  sendQuote: (id: string, b: { amountKobo: number; leadTime?: string }) =>
    post<{ order: Order; quote: Quote }>(`/orders/${id}/quotes`, b),
  acceptQuote: (id: string, quoteId: string) => post<{ accepted: boolean; quoteId: string }>(`/orders/${id}/quotes/${quoteId}/accept`),
  confirmPayment: (id: string) => post<Order>(`/orders/${id}/confirm-payment`),
  // payments (Batch 4)
  initializePayment: (orderId: string) =>
    post<{ paymentId: string; provider: string; authorizationUrl: string | null; amountKobo: number }>('/payments/initialize', { orderId }),
  completeMockPayment: (paymentId: string) => post<Order>(`/payments/${paymentId}/complete-mock`),
  designerPayouts: () => get<{
    commissionBps: number; grossKobo: number; netKobo: number;
    items: { paymentId: string; orderId: string; garment: string; grossKobo: number; commissionKobo: number; netKobo: number; paidAt: string }[];
  }>('/payments/me/payouts'),
  advance: (id: string, note?: string) => post<Order>(`/orders/${id}/advance`, { note }),
  clarification: (id: string, note: string) => post<OrderEvent>(`/orders/${id}/clarification`, { note }),
  alteration: (id: string, note: string) => post<OrderEvent>(`/orders/${id}/alteration`, { note }),
  cancelOrder: (id: string) => post<Order>(`/orders/${id}/cancel`),
  measurementSheet: (id: string) => get<{ orderId: string; customer: string; garment: string; fabric: string; recommendedSize?: string; measurements: Record<string, string> }>(`/orders/${id}/measurement-sheet`),
};

export const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString();
export const PRODUCTION_STAGES: OrderStatus[] = ['PAID', 'CUTTING', 'SEWING', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED'];
