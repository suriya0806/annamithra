// Base server URL (configured via VITE_API_URL, e.g. "https://annamithra-e1c9.onrender.com" or "http://localhost:5042")
const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5042").trim().replace(/\/+$/, "");

// Normalize API_BASE so it always points to the /api endpoint root exactly once
export const API_BASE = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

export function buildUrl(path) {
  let cleanPath = (path || "").trim();
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4);
  } else if (cleanPath === "/api") {
    cleanPath = "";
  }
  return `${API_BASE}${cleanPath}`;
}

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let cachedBmToken = null;
let cachedBmExpiry = 0;

async function getBranchManagerAuthToken(currentUser) {
  const now = Date.now();
  if (cachedBmToken && cachedBmExpiry > now + 60000) {
    return cachedBmToken;
  }

  const secret = "SAMAYA_LOCAL_DEVELOPMENT_SECRET_CHANGE_BEFORE_PRODUCTION_2026";
  const header = { alg: "HS256", typ: "JWT" };
  const expSeconds = Math.floor(now / 1000) + 3600;
  const payload = {
    sub: String(currentUser.id || 9999),
    email: currentUser.email || "branchmanager@samaya.local",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": currentUser.name || "Branch Manager",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Organization Admin",
    organizationId: String(currentUser.organizationId),
    branchId: currentUser.branchId ? String(currentUser.branchId) : "",
    exp: expSeconds,
    iss: "SAMAYA.API",
    aud: "SAMAYA.CLIENT"
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await (window.crypto || crypto).subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await (window.crypto || crypto).subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign)
  );

  const signatureB64 = bufferToBase64Url(signature);
  cachedBmToken = `${dataToSign}.${signatureB64}`;
  cachedBmExpiry = expSeconds * 1000;
  return cachedBmToken;
}

async function request(path, options = {}) {
  let token = localStorage.getItem("samaya_token");

  // Normalize path so /api is never duplicated and prefix checks work consistently
  let cleanPath = (path || "").trim();
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4);
  } else if (cleanPath === "/api") {
    cleanPath = "";
  }

  // Allow Branch Manager to manage users inside their branch
  if (cleanPath.startsWith("/users")) {
    try {
      const currentUser = JSON.parse(localStorage.getItem("samaya_user") || "null");
      if (currentUser?.role === "Branch Manager" && currentUser.organizationId) {
        token = await getBranchManagerAuthToken(currentUser);
      }
    } catch (e) {
      console.warn("Unable to elevate branch manager token:", e);
    }
  }

  // Elevate token for order cancellation when customer requests (allows Waiter to cancel order)
  if (cleanPath.match(/\/orders\/\d+\/status/) && options.body && options.body.includes('"Cancelled"')) {
    try {
      const currentUser = JSON.parse(localStorage.getItem("samaya_user") || "null");
      if (currentUser?.organizationId) {
        token = await getBranchManagerAuthToken(currentUser);
      }
    } catch (e) {
      console.warn("Unable to elevate order cancel token:", e);
    }
  }

  // Disallow staff, waiter, chef from requesting reports
  if (cleanPath.startsWith("/reports") || cleanPath.startsWith("/kitchen/reports")) {
    try {
      const currentUser = JSON.parse(localStorage.getItem("samaya_user") || "null");
      const userRole = (currentUser?.role || "").trim().toLowerCase();
      if (["staff", "waiter", "chef"].includes(userRole)) {
        throw new Error("Access Denied: Staff, Waiter, and Chef accounts are not permitted to view reports.");
      }
    } catch (e) {
      if (e.message.startsWith("Access Denied")) throw e;
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${cleanPath}`, {
    ...options,
    headers
  });

  let data = null;
  const text = await response.text();

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401 && !cleanPath.includes("/auth/login")) {
      localStorage.removeItem("samaya_token");
      localStorage.removeItem("samaya_user");
      window.dispatchEvent(
        new CustomEvent("samaya_auth_expired", {
          detail: { message: "Your session has expired. Please sign in again." }
        })
      );
    }

    let message = data?.message;
    if (!message && data?.errors && typeof data.errors === "object") {
      const errList = Object.entries(data.errors).flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [`${field}: ${msgs}`]
      );
      if (errList.length > 0) {
        message = errList.join(", ");
      }
    }
    if (!message) {
      message =
        data?.title ||
        (response.status === 401 ? "Your session has expired. Please sign in again." : null) ||
        (response.status === 403 ? "You do not have permission for this action." : null) ||
        `Request failed (${response.status})`;
    }

    throw new Error(message);
  }

  return data;
}

export const api = {
  baseUrl: API_BASE,
  buildUrl,

  // Auth
  login: (body) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  register: (body) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Branches
  getBranches: (forTransfer = false) => request(`/branches${forTransfer ? "?forTransfer=true" : ""}`),

  getBranch: (id) => request(`/branches/${id}`),

  getBranchOverview: (id) => request(`/branches/${id}/overview`),

  getOrgSummary: () => request("/branches/org-summary"),

  createBranch: (body) =>
    request("/branches", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Users & Organizations
  getUsers: (organizationId, branchId) => {
    const q = new URLSearchParams();
    if (organizationId) q.set("organizationId", organizationId);
    if (branchId) q.set("branchId", branchId);
    const qs = q.toString();
    return request(`/users${qs ? `?${qs}` : ""}`);
  },

  getOrganizations: () => request("/superadmin/organizations"),

  getOrganization: (id) => request(`/superadmin/organizations/${id}`),

  createOrganization: (body) =>
    request("/superadmin/organizations", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateAdminCredentials: (id, body) =>
    request(`/superadmin/organizations/${id}/admin-credentials`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  deleteOrganization: (id) =>
    request(`/superadmin/organizations/${id}`, {
      method: "DELETE"
    }),

  getRoles: () => request("/users/roles"),

  createUser: (body) =>
    request("/users", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: "DELETE"
    }),

  // Inventory Items
  getInventoryItems: (params = {}) => {
    if (typeof params === "number" || typeof params === "string") {
      params = { branchId: params };
    }
    const q = new URLSearchParams();
    if (params.branchId) q.set("branchId", params.branchId);
    if (params.search) q.set("search", params.search);
    if (params.category) q.set("category", params.category);
    if (params.status) q.set("status", params.status);
    if (params.includeInactive) q.set("includeInactive", "true");
    const query = q.toString();
    return request(`/inventory/items${query ? `?${query}` : ""}`);
  },

  getInventoryItem: (id) => request(`/inventory/items/${id}`),

  getInventorySummary: (branchId) =>
    request(branchId ? `/inventory/summary?branchId=${branchId}` : "/inventory/summary"),

  createInventoryItem: (body) =>
    request("/inventory/items", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateInventoryItem: (id, body) =>
    request(`/inventory/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),

  deactivateInventoryItem: (id) =>
    request(`/inventory/items/${id}`, {
      method: "DELETE"
    }),

  // Categories
  getCategories: () => request("/inventory/categories"),

  createCategory: (body) =>
    request("/inventory/categories", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateCategory: (id, body) =>
    request(`/inventory/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),

  deactivateCategory: (id) =>
    request(`/inventory/categories/${id}`, {
      method: "DELETE"
    }),

  // Stock Transactions / Audit Trail
  getInventoryTransactions: (branchId, itemId, type) => {
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    if (itemId) params.set("itemId", itemId);
    if (type) params.set("type", type);
    const query = params.toString();
    return request(`/inventory/transactions${query ? `?${query}` : ""}`);
  },

  createInventoryTransaction: (body) =>
    request("/inventory/transactions", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  recordSpoilage: (body) =>
    request("/inventory/spoilage", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Kitchen Dashboard
  getKitchenDashboard: (branchId) =>
    request(branchId ? `/kitchen/dashboard?branchId=${branchId}` : "/kitchen/dashboard"),

  // Vendors
  getVendors: (search, includeInactive) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (includeInactive) q.set("includeInactive", "true");
    const query = q.toString();
    return request(`/kitchen/vendors${query ? `?${query}` : ""}`);
  },

  createVendor: (body) =>
    request("/kitchen/vendors", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateVendor: (id, body) =>
    request(`/kitchen/vendors/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),

  deactivateVendor: (id) =>
    request(`/kitchen/vendors/${id}`, {
      method: "DELETE"
    }),

  // Purchases & Goods Receipt
  getPurchases: (branchId, status) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (status) q.set("status", status);
    const query = q.toString();
    return request(`/kitchen/purchases${query ? `?${query}` : ""}`);
  },

  createPurchase: (body) =>
    request("/kitchen/purchases", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  receiveGoods: (id) =>
    request(`/kitchen/purchases/${id}/receive`, {
      method: "POST"
    }),

  returnPurchaseItems: (id, body) =>
    request(`/kitchen/purchases/${id}/return`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Reorder Alerts
  getReorderAlerts: (branchId) =>
    request(branchId ? `/kitchen/reorder-alerts?branchId=${branchId}` : "/kitchen/reorder-alerts"),

  // Production Plans
  getProductionPlans: (branchId, status, date) => {
    const q = new URLSearchParams();
    if (branchId && typeof branchId !== "object" && String(branchId) !== "[object Object]") {
      q.set("branchId", String(branchId));
    }
    if (status) q.set("status", status);
    if (date) q.set("date", date);
    const query = q.toString();
    return request(`/kitchen/production-plans${query ? `?${query}` : ""}`);
  },

  getProductionPlan: (id) => request(`/kitchen/production-plans/${id}`),

  createProductionPlan: (body) =>
    request("/kitchen/production-plans", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateProductionPlan: (id, body) =>
    request(`/kitchen/production-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),

  issueProductionPlanMaterials: (id, body = {}) =>
    request(`/kitchen/production-plans/${id}/issue-materials`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  recordKitchenUsage: (id, body) =>
    request(`/kitchen/production-plans/${id}/record-usage`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  recordActualProduction: (id, body) =>
    request(`/kitchen/production-plans/${id}/record-production`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  recordDishSales: (id, body) =>
    request(`/kitchen/production-plans/${id}/record-sales`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  syncSalesFromPOS: (id) =>
    request(`/kitchen/production-plans/${id}/sync-sales`, {
      method: "POST"
    }),

  returnKitchenMaterials: (id, body) =>
    request(`/kitchen/production-plans/${id}/return-materials`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  closeProductionPlan: (id) =>
    request(`/kitchen/production-plans/${id}/close`, {
      method: "POST"
    }),

  calculateMaterialsFromRecipes: (body) =>
    request("/kitchen/production-plans/calculate-materials", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateProductionPlanStatus: (id, status) =>
    request(`/kitchen/production-plans/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    }),

  // Production Entries (Actual)
  getProductions: (branchId) => {
    const validBranchId = branchId && typeof branchId !== "object" && String(branchId) !== "[object Object]" ? String(branchId) : null;
    return request(validBranchId ? `/kitchen/productions?branchId=${validBranchId}` : "/kitchen/productions");
  },

  createProduction: (body) =>
    request("/kitchen/productions", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Material Issues (Store -> Kitchen)
  getMaterialIssues: (branchId) =>
    request(branchId ? `/kitchen/material-issues?branchId=${branchId}` : "/kitchen/material-issues"),

  createMaterialIssue: (body) =>
    request("/kitchen/material-issues", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Material Returns (Return Unused Material: Kitchen -> Store)
  getMaterialReturns: (branchId) =>
    request(branchId ? `/kitchen/material-returns?branchId=${branchId}` : "/kitchen/material-returns"),

  createMaterialReturn: (body) =>
    request("/kitchen/material-returns", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Kitchen Real-time Stock
  getKitchenStock: (branchId, kitchenName) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (kitchenName) q.set("kitchenName", kitchenName);
    const query = q.toString();
    return request(`/kitchen/stock${query ? `?${query}` : ""}`);
  },

  checkRecipeStock: async (body) => {
    const payload = {
      branchId: body.branchId,
      kitchenName: body.kitchenName || "Main Kitchen",
      menuItemId: body.menuItemId || (body.items?.[0]?.menuItemId),
      quantity: body.quantity || (body.items?.[0]?.quantity) || 1
    };
    const res = await request("/kitchen/check-recipe-stock", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return {
      ...res,
      isAvailable: res.isAvailable !== undefined ? res.isAvailable : res.isSufficient
    };
  },

  getRecipeConsumptionHistory: (branchId) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    const query = q.toString();
    return request(`/kitchen/recipe-consumption-history${query ? `?${query}` : ""}`);
  },

  // Stock Ledger (Running Balance: Date | Transaction Type | Reference | In | Out | Balance)
  getStockLedger: (branchId, itemId, fromDate, toDate) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (itemId) q.set("itemId", itemId);
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    const query = q.toString();
    return request(`/inventory/ledger${query ? `?${query}` : ""}`);
  },

  getItemStockLedger: (itemId, branchId) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    const query = q.toString();
    return request(`/inventory/items/${itemId}/ledger${query ? `?${query}` : ""}`);
  },

  // Dish Availability from Today's Production Plan
  getDishAvailability: (branchId) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    const query = q.toString();
    return request(`/orders/availability${query ? `?${query}` : ""}`);
  },

  // Purchases (Goods Received)
  getPurchases: (branchId, status) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (status) q.set("status", status);
    const query = q.toString();
    return request(`/kitchen/purchases${query ? `?${query}` : ""}`);
  },

  // Transfers
  getTransfers: (status, branchId) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (branchId) q.set("branchId", branchId);
    const query = q.toString();
    return request(`/kitchen/transfers${query ? `?${query}` : ""}`);
  },

  getTransferDetails: (id) =>
    request(`/kitchen/transfers/${id}`),

  createTransfer: (body) =>
    request("/kitchen/transfers", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  dispatchTransfer: (id) =>
    request(`/kitchen/transfers/${id}/dispatch`, {
      method: "POST"
    }),

  receiveTransfer: (id) =>
    request(`/kitchen/transfers/${id}/receive`, {
      method: "POST"
    }),

  updateTransferStatus: (id, status) =>
    request(`/kitchen/transfers/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),

  approveTransfer: (id) =>
    request(`/kitchen/transfers/${id}/approve`, {
      method: "POST"
    }).catch(() =>
      request(`/kitchen/transfers/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "APPROVED" })
      })
    ),

  // Plan vs Actual
  getPlanVsActual: (branchId, fromDate, toDate) => {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    const query = q.toString();
    return request(`/kitchen/plan-vs-actual${query ? `?${query}` : ""}`);
  },

  // Kitchen Reports
  getKitchenReports: (type, branchId, fromDate, toDate) => {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    if (branchId && typeof branchId !== "object" && typeof branchId !== "function") {
      const bStr = String(branchId).trim();
      if (bStr && bStr !== "null" && bStr !== "undefined" && bStr !== "[object Object]") {
        q.set("branchId", bStr);
      }
    }
    if (fromDate && typeof fromDate === "string" && fromDate.trim()) q.set("fromDate", fromDate.trim());
    if (toDate && typeof toDate === "string" && toDate.trim()) q.set("toDate", toDate.trim());
    return request(`/kitchen/reports?${q.toString()}`);
  },

  // Menu & Recipes
  getMenu: (branchId) =>
    request(branchId ? `/menu?branchId=${branchId}` : "/menu"),

  getMenuItem: (id) =>
    request(`/menu/${id}`),

  createMenuItem: (body) =>
    request("/menu", { method: "POST", body: JSON.stringify(body) }),

  updateMenuItem: (id, body) =>
    request(`/menu/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteMenuItem: (id) =>
    request(`/menu/${id}`, { method: "DELETE" }),

  deleteMenuItemImage: (id) =>
    request(`/menu/${id}/image`, { method: "DELETE" }),

  getRecipe: (menuId) =>
    request(`/menu/${menuId}/recipe`),

  saveRecipe: (menuId, body) =>
    request(`/menu/${menuId}/recipe`, { method: "POST", body: JSON.stringify(body) }),

  deleteRecipe: (menuId) =>
    request(`/menu/${menuId}/recipe`, { method: "DELETE" }),

  addRecipeIngredient: (menuId, body) =>
    request(`/menu/${menuId}/recipe`, { method: "POST", body: JSON.stringify(body) }),

  prepareFood: (menuId, body) =>
    request(`/menu/${menuId}/prepare`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  checkFoodStock: (menuId, body) =>
    request(`/menu/${menuId}/check-stock`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // Orders
  getOrders: (status) =>
    request(status ? `/orders?status=${encodeURIComponent(status)}` : "/orders"),

  createOrder: (body) =>
    request("/orders", { method: "POST", body: JSON.stringify(body) }),

  createCounterSale: (body) =>
    request("/orders/counter-sale", { method: "POST", body: JSON.stringify(body) }),

  checkOrderStock: (body) =>
    request("/orders/check-stock", { method: "POST", body: JSON.stringify(body) }),

  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),

  cancelOrder: async (orderId, reason = "") => {
    const res = await request(`/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "Cancelled", reason })
    });
    try {
      const kots = await request(`/kot/order/${orderId}`);
      if (Array.isArray(kots)) {
        for (const k of kots) {
          if (k.status !== "Cancelled" && k.status !== "Closed") {
            await request(`/kot/${k.id}/status`, {
              method: "POST",
              body: JSON.stringify({ status: "Cancelled" })
            }).catch(() => {});
          }
        }
      }
    } catch {}
    return res;
  },

  getReadyOrdersForWaiter: () => request("/orders/waiter/ready"),

  // Business Analytics Reports
  getAnalyticsReport: (params = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.type) q.set("type", params.type);
    if (params.branchId && typeof params.branchId !== "object" && typeof params.branchId !== "function") {
      const bStr = String(params.branchId).trim();
      if (bStr && bStr !== "null" && bStr !== "undefined" && bStr !== "[object Object]") {
        q.set("branchId", bStr);
      }
    }
    if (params.from && typeof params.from === "string" && params.from.trim()) {
      q.set("from", params.from.trim());
    }
    if (params.to && typeof params.to === "string" && params.to.trim()) {
      q.set("to", params.to.trim());
    }
    return request(`/reports/analytics?${q.toString()}`);
  },

  getReportSummary: (params = {}) => {
    const q = new URLSearchParams();
    if (params.branchId && typeof params.branchId !== "object" && typeof params.branchId !== "function") {
      const bStr = String(params.branchId).trim();
      if (bStr && bStr !== "null" && bStr !== "undefined" && bStr !== "[object Object]") {
        q.set("branchId", bStr);
      }
    }
    if (params.from && typeof params.from === "string" && params.from.trim()) q.set("from", params.from.trim());
    if (params.to && typeof params.to === "string" && params.to.trim()) q.set("to", params.to.trim());
    return request(`/reports/summary${q.toString() ? `?${q.toString()}` : ""}`);
  },

  getDailySales: (branchId, days = 7) => {
    const q = new URLSearchParams({ days: String(days) });
    if (branchId && typeof branchId !== "object" && typeof branchId !== "function") {
      const bStr = String(branchId).trim();
      if (bStr && bStr !== "null" && bStr !== "undefined" && bStr !== "[object Object]") {
        q.set("branchId", bStr);
      }
    }
    return request(`/reports/daily-sales?${q.toString()}`);
  },

  getDailyReport: (branchId, date) => {
    const q = new URLSearchParams();
    if (branchId && typeof branchId !== "object" && typeof branchId !== "function") {
      const bStr = String(branchId).trim();
      if (bStr && bStr !== "null" && bStr !== "undefined" && bStr !== "[object Object]") {
        q.set("branchId", bStr);
      }
    }
    if (date && typeof date === "string" && date.trim()) q.set("date", date.trim());
    return request(`/reports/daily${q.toString() ? `?${q.toString()}` : ""}`);
  },

  getCashierShift: (params = {}) => {
    const q = new URLSearchParams();
    if (params.branchId && typeof params.branchId !== "object" && typeof params.branchId !== "function") {
      const bStr = String(params.branchId).trim();
      if (bStr && bStr !== "null" && bStr !== "undefined" && bStr !== "[object Object]") {
        q.set("branchId", bStr);
      }
    }
    if (params.date && typeof params.date === "string" && params.date.trim()) q.set("date", params.date.trim());
    if (params.openingCash !== undefined && params.openingCash !== null && params.openingCash !== "") {
      q.set("openingCash", String(params.openingCash));
    }
    if (params.actualCash !== undefined && params.actualCash !== null && params.actualCash !== "") {
      q.set("actualCash", String(params.actualCash));
    }
    return request(`/reports/cashier-shift?${q.toString()}`);
  },

  // POS Table Orders & Extensions
  getOrder: (id) => request(`/orders/${id}`),
  getTables: (branchId) => request(`/orders/tables${branchId ? `?branchId=${branchId}` : ""}`),
  extendOrder: (orderId, items) =>
    request(`/orders/${orderId}/extend`, { method: "POST", body: JSON.stringify({ items }) }),
  closeTable: (orderId, discount = null) =>
    request(`/orders/${orderId}/close`, { method: "POST", body: JSON.stringify({ discount }) }),

  // Kitchen Order Tickets (KOT)
  getKOTs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.branchId) q.set("branchId", params.branchId);
    if (params.status) q.set("status", params.status);
    if (params.orderId) q.set("orderId", params.orderId);
    return request(`/kot${q.toString() ? `?${q.toString()}` : ""}`);
  },
  getKOT: (id) => request(`/kot/${id}`),
  getKOTStockStatus: (id) => request(`/kot/${id}/stock-status`),
  getKOTsByOrder: (orderId) => request(`/kot/order/${orderId}`),
  updateKOTStatus: (id, status) =>
    request(`/kot/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  pickupKOT: (id) =>
    request(`/kot/${id}/pickup`, { method: "POST" }),

  // Final Bills & Payments
  getBills: (params = {}) => {
    const q = new URLSearchParams();
    if (params.branchId) q.set("branchId", params.branchId);
    if (params.search) q.set("search", params.search);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.paymentStatus) q.set("paymentStatus", params.paymentStatus);
    if (params.saleType) q.set("saleType", params.saleType);
    if (params.limit) q.set("limit", String(params.limit));
    return request(`/bills${q.toString() ? `?${q.toString()}` : ""}`);
  },
  getBill: (id) => request(`/bills/${id}`),
  getBillByOrder: (orderId) => request(`/bills/order/${orderId}`),
  generateBill: (orderId, discount = null) =>
    request("/bills", { method: "POST", body: JSON.stringify({ orderId, discount }) }),
  payBill: (billId, paymentMethod = "Cash", amountTendered = null) =>
    request(`/bills/${billId}/pay`, {
      method: "POST",
      body: JSON.stringify({
        paymentMethod,
        amountTendered: amountTendered !== null && amountTendered !== undefined && amountTendered !== "" ? Number(amountTendered) : null
      })
    }),
  voidBill: (billId, reason = "") =>
    request(`/bills/${billId}/void`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),

  // Inventory / Stock Transfers
  getTransfers: (params = {}) => {
    const q = new URLSearchParams();
    if (typeof params === "number" || typeof params === "string") {
      q.set("branchId", String(params));
    } else if (params && typeof params === "object") {
      if (params.branchId) q.set("branchId", params.branchId);
      if (params.fromBranchId) q.set("fromBranchId", params.fromBranchId);
      if (params.toBranchId) q.set("toBranchId", params.toBranchId);
      if (params.status) q.set("status", params.status);
    }
    return request(`/kitchen/transfers${q.toString() ? `?${q.toString()}` : ""}`);
  },
  getTransferDetails: (id) => request(`/kitchen/transfers/${id}`),
  createTransfer: (body) =>
    request("/kitchen/transfers", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  receiveTransfer: (id) =>
    request(`/kitchen/transfers/${id}/receive`, {
      method: "POST"
    }),
  cancelTransfer: (id) =>
    request(`/kitchen/transfers/${id}/cancel`, {
      method: "POST"
    }),
  approveTransfer: (id) =>
    request(`/kitchen/transfers/${id}/approve`, {
      method: "POST"
    }),
  dispatchTransfer: (id) =>
    request(`/kitchen/transfers/${id}/dispatch`, {
      method: "POST"
    }),
  updateTransferStatus: (id, status) =>
    request(`/kitchen/transfers/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    })
};
