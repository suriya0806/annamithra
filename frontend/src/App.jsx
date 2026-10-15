import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  Users,
  X,
  Utensils,
  Package,
  ShoppingCart,
  Plus,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ChefHat,
  Sun,
  Moon,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  Calendar,
  Clock,
  Printer,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  CreditCard,
  Check,
  Receipt,
  UserCheck,
  Lock,
  Bell,
  Command,
  ChevronDown,
  Zap,
  RotateCcw,
  Minus,
  Share2,
  Factory,
  ShoppingBag,
  Edit2,
  AlertOctagon,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Boxes,
  Truck,
  FileSpreadsheet,
  LayoutGrid,
  ArrowRight
} from "lucide-react";
import { api } from "./api";
import KitchenDashboard from "./KitchenDashboard";
import KitchenManagement from "./KitchenManagement";
import DailyProductionPlan from "./DailyProductionPlan";
import ProductionDashboard from "./ProductionDashboard";
import PurchaseDashboard from "./PurchaseDashboard";
import MenuManagement from "./MenuManagement";
import ReportsAndAnalytics from "./ReportsAndAnalytics";
import { getDishImage } from "./dishImages";
import ModuleSelectionPage from "./ModuleSelectionPage";
import OrganizationAdminDashboard from "./OrganizationAdminDashboard";
import BranchDetailsPage from "./BranchDetailsPage";
import BranchesPage from "./BranchesPage";
import {
  RoleDashboardHeader,
  RoleKpiCard,
  SuperAdminDashboardView,
  BranchManagerDashboardView,
  KitchenManagerDashboardView,
  ChefDashboardView,
  InventoryManagerDashboardView,
  WaiterDashboardView,
  CashierDashboardView,
  AccountantDashboardView
} from "./RoleDashboards";

const initialLogin = { email: "", password: "" };

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return (
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("samaya_theme") ||
        "light"
      );
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("samaya_theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((curr) => (curr === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}

function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("samaya_user") || "null");
  } catch {
    return null;
  }
}

export function getPageFromUrl() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const pageParam = (searchParams.get("page") || "").toLowerCase().trim();
  const rawTarget = pageParam || path;
  if (!rawTarget) return null;

  const clean = rawTarget.split("/")[0].trim();
  if (clean === "order" || clean === "orders") return "orders";
  if (clean === "billing" || clean === "bill" || clean === "cashier") return "billing";
  if (clean === "kitchen" || clean === "kms" || clean === "kitchen_mgmt" || clean === "kitchen_reports") return "kitchen";
  if (clean === "kds") return "kds";
  if (clean === "menu") return "menu";
  if (clean === "production" || clean === "production_plan" || clean === "plan" || clean === "material_issue" || clean === "material_return") return "production";
  if (clean === "purchase" || clean === "purchases" || clean === "vendors" || clean === "grn" || clean === "purchase_reports") return "purchase";
  if (clean === "inventory") return "inventory";
  if (clean === "branches" || clean === "branch" || clean === "branch_details") return "branches";
  if (clean === "users" || clean === "staff") return "users";
  if (clean === "reports" || clean === "report") return "reports";
  if (clean === "organizations" || clean === "orgs") return "organizations";
  if (clean === "dashboard" || clean === "home") return "dashboard";
  return null;
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState("login");
  const [authNotice, setAuthNotice] = useState("");
  const { theme, toggleTheme } = useTheme();

  const urlPage = getPageFromUrl();

  // Active module for eligible restaurant-level users: "pos" | "kms" | null
  const [selectedModule, setSelectedModule] = useState(() => {
    try {
      if (urlPage) {
        if (["orders", "billing", "menu", "kds"].includes(urlPage)) return "pos";
        if (["kitchen", "inventory", "purchase", "production"].includes(urlPage)) return "kms";
      }
      return sessionStorage.getItem("samaya_selected_module") || null;
    } catch {
      return null;
    }
  });

  // Target landing page within module when selected via specific tile or direct URL
  const [moduleTargetPage, setModuleTargetPage] = useState(() => {
    try {
      if (urlPage) return urlPage;
      return sessionStorage.getItem("samaya_module_target_page") || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    function handleAuthExpired(e) {
      setUser(null);
      setSelectedModule(null);
      setModuleTargetPage(null);
      setAuthNotice(e.detail?.message || "Your session has expired. Please sign in again.");
    }
    window.addEventListener("samaya_auth_expired", handleAuthExpired);
    return () => window.removeEventListener("samaya_auth_expired", handleAuthExpired);
  }, []);

  function handleAuth(data) {
    localStorage.setItem("samaya_token", data.token);
    localStorage.setItem("samaya_user", JSON.stringify(data.user));
    setAuthNotice("");
    setUser(data.user);
    const targetUrlPage = getPageFromUrl();
    if (targetUrlPage) {
      const targetMod = ["orders", "billing", "menu", "kds"].includes(targetUrlPage) ? "pos" : "kms";
      setSelectedModule(targetMod);
      setModuleTargetPage(targetUrlPage);
      try {
        sessionStorage.setItem("samaya_selected_module", targetMod);
        sessionStorage.setItem("samaya_module_target_page", targetUrlPage);
      } catch {}
    } else {
      try {
        sessionStorage.removeItem("samaya_selected_module");
        sessionStorage.removeItem("samaya_module_target_page");
      } catch {}
      setSelectedModule(null);
      setModuleTargetPage(null);
    }
  }

  function logout() {
    localStorage.removeItem("samaya_token");
    localStorage.removeItem("samaya_user");
    try {
      sessionStorage.removeItem("samaya_selected_module");
      sessionStorage.removeItem("samaya_module_target_page");
    } catch {}
    setAuthNotice("");
    setUser(null);
    setSelectedModule(null);
    setModuleTargetPage(null);
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={handleAuth}
        notice={authNotice}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Super Admin and Organization Admin bypass KMS / POS selection page completely
  const isSuperAdmin = user.role === "Super Admin";
  const isOrgAdmin = user.role === "Organization Admin";

  const branchModuleType = user.branchModuleType || "Both POS + KMS";

  // For KMS Only / POS Only branches or roles that only support one module, automatically set the selected module
  let effectiveModule = selectedModule;
  if (!isSuperAdmin && !isOrgAdmin) {
    if (urlPage) {
      if (["orders", "billing", "menu", "kds"].includes(urlPage)) effectiveModule = "pos";
      else if (["kitchen", "inventory", "purchase", "production"].includes(urlPage)) effectiveModule = "kms";
    } else if (branchModuleType === "KMS Only" || user.role === "Inventory Manager") {
      effectiveModule = "kms";
    } else if (branchModuleType === "POS Only" || user.role === "Waiter") {
      effectiveModule = "pos";
    }
  }

  // For eligible non-Super-Admin and non-Org-Admin users, display Module Selection landing page if no module selected
  if (!isSuperAdmin && !isOrgAdmin && !effectiveModule) {
    return (
      <ModuleSelectionPage
        user={user}
        onSelectModule={(mod, targetPage) => {
          setSelectedModule(mod);
          setModuleTargetPage(targetPage || null);
          try {
            sessionStorage.setItem("samaya_selected_module", mod);
            if (targetPage) {
              sessionStorage.setItem("samaya_module_target_page", targetPage);
            } else {
              sessionStorage.removeItem("samaya_module_target_page");
            }
          } catch {}
        }}
        onLogout={logout}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      activeModule={effectiveModule}
      initialPage={moduleTargetPage}
      onSwitchModule={() => {
        setSelectedModule(null);
        setModuleTargetPage(null);
        try {
          sessionStorage.removeItem("samaya_selected_module");
          sessionStorage.removeItem("samaya_module_target_page");
        } catch {}
      }}
      onLogout={logout}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}

function AuthScreen({ mode, onModeChange, onSuccess, notice, theme, toggleTheme }) {
  const [form, setForm] = useState(
    mode === "login"
      ? initialLogin
      : {
          organizationName: "",
          organizationType: "Hotel",
          city: "",
          phone: "",
          adminName: "",
          adminEmail: "",
          password: ""
        }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      mode === "login"
        ? initialLogin
        : {
            organizationName: "",
            organizationType: "Hotel",
            city: "",
            phone: "",
            adminName: "",
            adminEmail: "",
            password: ""
          }
    );
    setError("");
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        const result = await api.login(form);
        onSuccess(result);
      } else {
        await api.register(form);
        const result = await api.login({
          email: form.adminEmail,
          password: form.password
        });
        onSuccess(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const set = (key) => (e) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div className="brand-mark large">
          <ChefHat size={32} />
        </div>
        <div className="art-content">
          <span className="eyebrow" style={{ color: "var(--brand-gold)" }}>FOOD & RESTAURANT MANAGEMENT</span>
          <h1>ANNAMITHRA</h1>
          <p style={{ fontSize: "16px", color: "#d1fae5", marginTop: "8px", fontWeight: "600", letterSpacing: "0.02em" }}>
            Good Food. Better Operations. Greater Growth.
          </p>
          <div className="feature-pills">
            <span>Multi-branch</span>
            <span>Central Inventory</span>
            <span>Kitchen KDS</span>
            <span>POS Billing</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginTop: "36px",
              padding: "16px 18px",
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)"
            }}
          >
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-display)" }}>
                99.98%
              </div>
              <div style={{ fontSize: "11px", color: "#a3c9b3", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
                Kitchen Uptime
              </div>
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-display)" }}>
                Instant Sync
              </div>
              <div style={{ fontSize: "11px", color: "#a3c9b3", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
                Multi-Branch POS
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div style={{ position: "absolute", top: "24px", right: "28px", zIndex: 10 }}>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        <div className="mobile-brand">
          <div className="brand-mark">
            <ChefHat size={20} />
          </div>
          <strong>ANNAMITHRA</strong>
        </div>

        <div className="auth-card">
          <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
          <h2>{mode === "login" ? "Sign in to ANNAMITHRA" : "Create your organization"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Access your hotel and restaurant operations."
              : "Set up your organization and administrator account."}
          </p>

          {notice && (
            <div
              className="error-box"
              style={{
                background: "#fef3c7",
                borderColor: "#f59e0b",
                color: "#92400e"
              }}
            >
              {notice}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={submit} className="form-stack">
            {mode === "register" && (
              <>
                <Field label="Organization name" value={form.organizationName} onChange={set("organizationName")} placeholder="Your Hotel Group" />
                <div className="two-col">
                  <Field label="Type" value={form.organizationType} onChange={set("organizationType")} placeholder="Hotel" />
                  <Field label="City" value={form.city} onChange={set("city")} placeholder="Madurai" />
                </div>
                <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="9876543210" />
                <Field label="Admin name" value={form.adminName} onChange={set("adminName")} placeholder="Admin" />
                <Field label="Admin email" type="email" value={form.adminEmail} onChange={set("adminEmail")} placeholder="admin@example.com" />
                <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
              </>
            )}

            {mode === "login" && (
              <>
                <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="admin@example.com" />
                <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
                <div className="quick-fill-container">
                  <span>Quick Fill:</span>
                  <button
                    type="button"
                    className="quick-fill-btn"
                    onClick={() => setForm({ email: "saravana@gmail.com", password: "SuperAdmin@123" })}
                  >
                    Org Admin (saravana)
                  </button>
                  <button
                    type="button"
                    className="quick-fill-btn"
                    onClick={() => setForm({ email: "superadmin@samaya.com", password: "SuperAdmin@123" })}
                  >
                    Super Admin
                  </button>
                </div>
              </>
            )}

            <button className="primary-btn" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create organization"}
              {!loading && <ChevronRight size={18} />}
            </button>
          </form>

          <button className="switch-auth" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>
            {mode === "login"
              ? "New organization? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="field">
      <span>{label}</span>
      <div style={{ position: "relative", width: "100%" }}>
        <input type={inputType} {...props} required />
        {isPassword && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowPassword((v) => !v);
            }}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "grid",
              placeItems: "center"
            }}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}

function getPageMeta(page, isSuperAdmin = false, isOrgAdmin = false) {
  if (isSuperAdmin) {
    if (page === "organizations") {
      return { title: "Organizations", section: "Super Admin", subtitle: "Platform organization management" };
    }
    return { title: "Dashboard", section: "Super Admin", subtitle: "Platform overview & metrics" };
  }
  if (isOrgAdmin) {
    if (page === "branches") {
      return { title: "Branches", section: "Organization Admin", subtitle: "Create, list and open branch details" };
    }
    if (page === "branch_details") {
      return { title: "Branch Details", section: "Organization Admin", subtitle: "Selected branch information and reports" };
    }
    if (page === "users") {
      return { title: "Users & Access", section: "Organization Admin", subtitle: "Create users and staff credentials" };
    }
    if (page === "reports") {
      return { title: "Reports & Analytics", section: "Organization Admin", subtitle: "Branch reports, date filter & CSV export" };
    }
    return { title: "Dashboard", section: "Organization Admin", subtitle: "Organization dashboard & branch count" };
  }
  const map = {
    dashboard: { title: "Dashboard", section: "Core", subtitle: "Live operational metrics & business summary" },
    organizations: { title: "Organizations", section: "Administration", subtitle: "Multi-tenant restaurant accounts & licenses" },
    branches: { title: "Branches", section: "Administration", subtitle: "Branch directory, performance & locations" },
    branch_details: { title: "Branch Details", section: "Administration", subtitle: "Branch overview, staff, operations & dedicated reports" },
    users: { title: "Users & Access", section: "Administration", subtitle: "User accounts, role permissions & logins" },
    production: { title: "Production", section: "Kitchen & Production", subtitle: "Production Plan, Material Issue & Material Return" },
    purchase: { title: "Purchase", section: "Kitchen & Procurement", subtitle: "Vendors, Purchase Orders, Returns, GRN & Reports" },
    purchase_reports: { title: "Purchase Reports", section: "Kitchen & Procurement", subtitle: "Purchase Orders & Goods Received Notes (GRN)" },
    production_plan: { title: "Production Plan", section: "Kitchen & Production", subtitle: "Batch portion planning, scheduling & ingredient forecasting" },
    material_issue: { title: "Material Issue", section: "Kitchen & Store", subtitle: "Dispatch raw materials & items from central store to kitchen" },
    material_return: { title: "Material Return", section: "Kitchen & Store", subtitle: "Return unused products & raw materials back to central store" },
    kitchen_mgmt: { title: "Kitchen", section: "Operations & Kitchen", subtitle: "Kitchen Stock, Inventory Items & Food Spoilage" },
    kitchen: { title: "Kitchen", section: "Operations & Kitchen", subtitle: "Kitchen Stock, Inventory Items & Food Spoilage" },
    kitchen_reports: { title: "Kitchen Reports", section: "Operations & Kitchen", subtitle: "Purchase and GRN Reports" },
    kds: { title: "Kitchen KDS Queue", section: "Operations & Kitchen", subtitle: "Live chef preparation tickets & order display" },
    inventory: { title: "Central Inventory", section: "Operations & Kitchen", subtitle: "Raw materials, available stock & low-stock alerts" },
    menu: { title: "Menu", section: "Sales & POS", subtitle: "Dishes, culinary categories & customer POS pricing" },
    orders: { title: "Orders", section: "Sales & POS", subtitle: "Dine-in tables, takeaway & active kitchen tickets" },
    billing: { title: "Cashier Billing & Previous Bills", section: "Sales & POS", subtitle: "Instant checkout, payment collection & previous bills history" },
    reports: { title: "Reports & Analytics", section: "Administration", subtitle: "View and analyze restaurant performance across branches." }
  };
  return map[page] || { title: "Overview", section: "Core", subtitle: "Operations suite" };
}

function CommandPalette({ isOpen, onClose, onNavigate, navSections, quickActions }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allItems = useMemo(() => {
    const list = [];
    quickActions.forEach((qa) => {
      list.push({ type: "action", ...qa });
    });
    navSections.forEach((sec) => {
      sec.items
        .filter((it) => it.show !== false)
        .forEach((it) => {
          list.push({
            type: "nav",
            id: it.id,
            label: it.label,
            desc: it.desc || sec.title,
            icon: it.icon,
            badge: it.badge,
            section: sec.title,
            action: () => onNavigate(it.id)
          });
        });
    });
    return list;
  }, [navSections, quickActions, onNavigate]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.desc && item.desc.toLowerCase().includes(q)) ||
        (item.section && item.section.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q))
    );
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-card" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="command-palette-header">
          <Search size={18} className="command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type to search pages, modules, or actions... (e.g. 'Billing', 'Kitchen', 'Order')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="command-esc-kbd" onClick={onClose}>ESC</kbd>
        </div>

        <div className="command-palette-results">
          {filteredItems.length === 0 ? (
            <div className="command-palette-empty">
              <Search size={24} />
              <span>No pages or actions matching "{query}"</span>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon || ChevronRight;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id || idx}
                  className={`command-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="command-item-icon">
                    <Icon size={16} />
                  </div>
                  <div className="command-item-content">
                    <div className="command-item-title">
                      <strong>{item.label}</strong>
                      {item.badge && <span className="command-item-badge">{item.badge}</span>}
                      {item.tag && <span className="command-item-tag">{item.tag}</span>}
                    </div>
                    {item.desc && <span className="command-item-desc">{item.desc}</span>}
                  </div>
                  <ChevronRight size={14} className="command-item-arrow" />
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

export function getPermittedPagesForRole(role, isPosOnly = false, isKmsOnly = false) {
  const normalizedRole = (role || "").trim();

  if (normalizedRole === "Super Admin") {
    return ["dashboard", "organizations"];
  }

  if (normalizedRole === "Organization Admin") {
    return [
      "dashboard",
      "branches",
      "branch_details",
      "users",
      "reports",
      "purchase",
      "purchases",
      "vendors",
      "grn",
      "purchase_returns",
      "purchase_reports",
      "purchasereports",
      "kitchen",
      "kitchen_mgmt",
      "kitchen_reports",
      "inventory",
      "orders",
      "kds",
      "billing",
      "menu"
    ];
  }

  if (normalizedRole === "Kitchen Manager") {
    const list = ["dashboard"];
    if (!isPosOnly) {
      list.push("inventory", "material_issue", "material_return", "kitchen", "kitchen_mgmt");
    }
    list.push("production", "production_plan");
    if (!isKmsOnly) {
      list.push("kds", "menu", "orders");
    }
    list.push("reports");
    return list;
  }

  if (normalizedRole === "Chef") {
    const list = ["dashboard"];
    if (!isPosOnly) {
      list.push("kitchen", "kitchen_mgmt", "inventory", "material_issue", "material_return");
    }
    list.push("production", "production_plan");
    if (!isKmsOnly) {
      list.push("kds", "orders", "menu");
    }
    return list;
  }

  if (normalizedRole === "Inventory Manager") {
    const list = ["dashboard"];
    if (!isPosOnly) {
      list.push("material_issue", "material_return", "purchase", "purchases", "vendors", "grn", "purchase_returns", "purchase_reports", "purchasereports", "kitchen", "kitchen_mgmt", "kitchen_reports", "inventory");
    }
    list.push("production", "production_plan");
    list.push("branches", "branch_details", "reports");
    return list;
  }

  if (normalizedRole === "Waiter") {
    const list = ["dashboard"];
    if (!isKmsOnly) {
      list.push("menu", "orders", "kds");
    }
    return list;
  }

  if (normalizedRole === "Cashier" || normalizedRole === "Accountant") {
    const list = ["dashboard"];
    if (!isKmsOnly) {
      list.push("orders", "kds", "billing", "menu");
    }
    if (!isPosOnly) {
      list.push("material_issue", "material_return", "purchase", "purchases", "vendors", "grn", "purchase_returns", "purchase_reports", "purchasereports", "kitchen", "kitchen_mgmt", "kitchen_reports", "inventory");
    }
    list.push("production", "production_plan");
    list.push("reports");
    return list;
  }

  if (normalizedRole === "Branch Manager") {
    const list = ["dashboard", "branches", "branch_details", "users"];
    if (!isKmsOnly) {
      list.push("orders", "kds", "billing", "menu");
    }
    if (!isPosOnly) {
      list.push("material_issue", "material_return", "purchase", "purchases", "vendors", "grn", "purchase_returns", "purchase_reports", "purchasereports", "kitchen", "kitchen_mgmt", "kitchen_reports", "inventory");
    }
    list.push("production", "production_plan");
    list.push("reports");
    return list;
  }

  return ["dashboard"];
}

function Dashboard({
  user,
  onLogout,
  theme,
  toggleTheme,
  activeModule = null,
  initialPage = null,
  onSwitchModule = null
}) {
  const isSuperAdmin = user.role === "Super Admin";
  const isOrgAdmin = user.role === "Organization Admin";
  const isBranchManager = user.role === "Branch Manager";
  const canManageUsers = isOrgAdmin || isBranchManager;
  const canManageBranches = isOrgAdmin || isBranchManager || user.role === "Inventory Manager";
  const canViewReports = ["Organization Admin", "Branch Manager", "Kitchen Manager", "Inventory Manager", "Accountant", "Cashier"].includes(user.role);

  const branchModuleType = user.branchModuleType || "Both POS + KMS";
  const isKmsOnly = branchModuleType === "KMS Only";
  const isPosOnly = branchModuleType === "POS Only";

  const canBill = !isKmsOnly && ["Branch Manager", "Accountant", "Cashier"].includes(user.role);
  const isBillingStaff = user.role === "Accountant" || user.role === "Cashier";

  const permittedPages = useMemo(() => {
    return getPermittedPagesForRole(user.role, isPosOnly, isKmsOnly);
  }, [user.role, isPosOnly, isKmsOnly]);

  const [currentModule, setCurrentModule] = useState(() => {
    if (isKmsOnly) return "kms";
    if (isPosOnly) return "pos";
    return activeModule;
  });
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [page, setPage] = useState(() => {
    const urlTarget = getPageFromUrl();
    if (urlTarget && permittedPages.includes(urlTarget)) return urlTarget;
    if (initialPage && permittedPages.includes(initialPage)) return initialPage;
    if (isSuperAdmin) return "dashboard";
    if (isOrgAdmin) {
      if (urlTarget && permittedPages.includes(urlTarget)) return urlTarget;
      return "dashboard";
    }
    if (user.role === "Kitchen Manager") {
      return activeModule === "kms" ? "kitchen" : "orders";
    }
    if (user.role === "Chef") {
      return activeModule === "kms" ? "kitchen" : "kds";
    }
    if (user.role === "Inventory Manager") {
      return "inventory";
    }
    if (user.role === "Waiter") {
      return "orders";
    }
    if (isBillingStaff) {
      return "billing";
    }
    if (isKmsOnly) return "kitchen";
    if (isPosOnly) return canBill ? "billing" : "orders";
    if (activeModule === "pos") {
      return canBill ? "billing" : "orders";
    }
    if (activeModule === "kms") {
      return "kitchen";
    }
    return permittedPages.includes("dashboard") ? "dashboard" : (permittedPages[0] || "dashboard");
  });

  useEffect(() => {
    if (initialPage && permittedPages.includes(initialPage)) {
      setPage(initialPage);
    }
  }, [initialPage, permittedPages]);

  useEffect(() => {
    function handlePopState() {
      const urlTarget = getPageFromUrl();
      if (urlTarget && permittedPages.includes(urlTarget)) {
        setPage(urlTarget);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [permittedPages]);

  useEffect(() => {
    try {
      const currentPath = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
      const targetPath = page === "dashboard" ? "" : page;
      if (currentPath !== targetPath && !(currentPath === "" && page === "dashboard")) {
        window.history.replaceState(null, "", "/" + targetPath);
      }
    } catch {}
  }, [page]);

  useEffect(() => {
    if (!permittedPages.includes(page)) {
      const fallback = permittedPages[0] || "dashboard";
      setPage(fallback);
    }
  }, [page, permittedPages]);

  const navSections = useMemo(
    () => {
      const overviewSection = {
        title: "OVERVIEW",
        items: [
          {
            id: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            desc: "Key role-specific summary & metrics",
            show: true
          }
        ]
      };

      const kitchenSection = {
        title: "KITCHEN & PRODUCTION",
        items: [
          {
            id: "production",
            label: "Production",
            icon: Factory,
            show: !isPosOnly && !isOrgAdmin && ["Super Admin", "Branch Manager", "Kitchen Manager", "Chef", "Inventory Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Production: Plan, Issue & Return"
          },
          {
            id: "purchase",
            label: "Purchase",
            icon: ShoppingBag,
            show: !isPosOnly && ["Super Admin", "Organization Admin", "Branch Manager", "Inventory Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Purchase: Vendors, Purchase, Returns, GRN & Reports"
          },
          {
            id: "kitchen",
            label: "Kitchen",
            icon: ChefHat,
            show: !isPosOnly && ["Super Admin", "Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Inventory Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Kitchen Stock, Inventory Items & Food Spoilage"
          },
          {
            id: "inventory",
            label: "Central Inventory",
            icon: Package,
            show: !isPosOnly && ["Super Admin", "Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Inventory Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Live raw material stock, reorder levels & alerts"
          }
        ]
      };

      const posSection = {
        title: "FRONT OF HOUSE & POS",
        items: [
          {
            id: "orders",
            label: "Orders",
            icon: ShoppingCart,
            show: !isKmsOnly && ["Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Waiter", "Accountant", "Cashier"].includes(user.role),
            desc: "Customer dining tables & takeaway orders"
          },
          {
            id: "kds",
            label: "Kitchen KDS",
            icon: Utensils,
            badge: "Live",
            show: !isKmsOnly && ["Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Waiter", "Accountant", "Cashier"].includes(user.role),
            desc: "Chef ticket queue & preparation display"
          },
          {
            id: "billing",
            label: "Cashier Billing",
            icon: Receipt,
            badge: "POS",
            show: !isKmsOnly && canBill && ["Organization Admin", "Branch Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Fast settlement, GST bills & previous bills history"
          },
          {
            id: "menu",
            label: "Menu",
            icon: ClipboardList,
            show: !isKmsOnly && ["Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Waiter", "Accountant", "Cashier"].includes(user.role),
            desc: "Available food items, categories & pricing"
          },
          {
            id: "production",
            label: "Production",
            icon: Factory,
            show: !isOrgAdmin && ["Super Admin", "Branch Manager", "Kitchen Manager", "Chef", "Inventory Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Production: Plan, Issue & Return"
          }
        ]
      };

      const adminSection = {
        title: "ADMINISTRATION",
        items: [
          {
            id: "organizations",
            label: "Organizations",
            icon: Building2,
            show: isSuperAdmin,
            desc: "Multi-tenant restaurant accounts"
          },
          {
            id: "branches",
            label: "Branches",
            icon: Building2,
            show: !isSuperAdmin && ["Organization Admin", "Branch Manager", "Inventory Manager"].includes(user.role),
            desc: "Branch locations & table arrangements"
          },
          {
            id: "users",
            label: isBranchManager ? "Branch Staff" : "Users & Access",
            icon: Users,
            show: canManageUsers && ["Organization Admin", "Branch Manager"].includes(user.role),
            desc: "Staff credentials & role permissions"
          },
          {
            id: "reports",
            label: "Reports & Analytics",
            icon: BarChart3,
            show: canViewReports && ["Organization Admin", "Branch Manager", "Kitchen Manager", "Inventory Manager", "Accountant", "Cashier"].includes(user.role),
            desc: "Revenue analytics, consumption & variance logs"
          }
        ]
      };

      if (isSuperAdmin) {
        return [
          {
            title: "SUPER ADMIN",
            items: [
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Platform overview & metrics" },
              { id: "organizations", label: "Organizations", icon: Building2, desc: "Manage platform organizations" }
            ]
          }
        ];
      }

      if (isOrgAdmin) {
        return [
          {
            title: "ORGANIZATION ADMIN",
            items: [
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Organization dashboard & branch count" },
              { id: "branches", label: "Branches", icon: Building2, desc: "Create, list and open branch details" },
              { id: "users", label: "Users & Access", icon: Users, desc: "Create and manage organization staff" },
              { id: "reports", label: "Reports", icon: BarChart3, desc: "Branch reports, date filters & CSV export" }
            ]
          },
          posSection,
          kitchenSection
        ];
      }

      if (isKmsOnly) {
        return [overviewSection, kitchenSection, adminSection];
      }
      if (isPosOnly) {
        return [overviewSection, posSection, adminSection];
      }
      if (user.role === "Kitchen Manager") {
        return [overviewSection, kitchenSection, posSection, adminSection];
      }
      if (user.role === "Chef") {
        return [overviewSection, kitchenSection, posSection];
      }
      if (user.role === "Inventory Manager") {
        return [overviewSection, kitchenSection, adminSection];
      }
      if (user.role === "Waiter") {
        return [overviewSection, posSection];
      }
      if (user.role === "Cashier" || user.role === "Accountant") {
        return [overviewSection, posSection, kitchenSection, adminSection];
      }
      if (currentModule === "pos") {
        return [overviewSection, posSection, adminSection];
      }
      if (currentModule === "kms") {
        return [overviewSection, kitchenSection, adminSection];
      }
      return [overviewSection, kitchenSection, posSection, adminSection];
    },
    [canManageUsers, isSuperAdmin, isOrgAdmin, isBranchManager, canViewReports, canBill, user.role, currentModule, isKmsOnly, isPosOnly]
  );

  const quickActions = useMemo(
    () => {
      if (isSuperAdmin) {
        return [
          { id: "qa_dashboard", label: "Dashboard", icon: LayoutDashboard, tag: "Platform", action: () => navigate("dashboard") },
          { id: "qa_organizations", label: "Organizations", icon: Building2, tag: "Platform", action: () => navigate("organizations") }
        ];
      }
      if (isOrgAdmin) {
        return [
          { id: "qa_dashboard", label: "Dashboard", icon: LayoutDashboard, tag: "Overview", action: () => navigate("dashboard") },
          { id: "qa_orders", label: "Create Customer Order", icon: ShoppingCart, tag: "Sales", action: () => navigate("orders") },
          { id: "qa_billing", label: "Cashier Billing (POS)", icon: Receipt, tag: "Billing", action: () => navigate("billing") },
          { id: "qa_branches", label: "Branches", icon: Building2, tag: "Branches", action: () => navigate("branches") },
          { id: "qa_users", label: "Users & Access", icon: Users, tag: "Users", action: () => navigate("users") },
          { id: "qa_reports", label: "Reports", icon: BarChart3, tag: "Reports", action: () => navigate("reports") }
        ];
      }
      const allActions = [
        ...(canBill && !isKmsOnly ? [{ id: "qa_billing", targetPage: "billing", label: "Open Cashier Billing (POS)", icon: Receipt, tag: "Billing", action: () => navigate("billing") }] : []),
        ...(!isKmsOnly ? [{ id: "qa_orders", targetPage: "orders", label: "Create Customer Order", icon: ShoppingCart, tag: "Sales", action: () => navigate("orders") }] : []),
        ...(!isPosOnly ? [{ id: "qa_purchase", targetPage: "purchase", label: "Purchase", icon: ShoppingBag, tag: "Procurement", action: () => navigate("purchase") }] : []),
        ...(!isPosOnly ? [{ id: "qa_purchase_reports", targetPage: "purchase", label: "Purchase Reports (Purchase & GRN)", icon: FileSpreadsheet, tag: "Procurement", action: () => navigate("purchase_reports") }] : []),
        { id: "qa_production", targetPage: "production", label: "Production", icon: Factory, tag: "Kitchen", action: () => navigate("production") },
        ...(!isKmsOnly ? [{ id: "qa_production_plan", targetPage: "production", label: "Daily Production Plan", icon: Calendar, tag: "Kitchen", action: () => navigate("production_plan") }] : []),
        ...(!isPosOnly ? [{ id: "qa_material_issue", targetPage: "production", label: "Issue Materials to Kitchen", icon: Share2, tag: "Store", action: () => navigate("material_issue") }] : []),
        ...(!isPosOnly ? [{ id: "qa_material_return", targetPage: "production", label: "Return Unused Material to Store", icon: RotateCcw, tag: "Store", action: () => navigate("material_return") }] : []),
        ...(!isPosOnly ? [{ id: "qa_kitchen", targetPage: "kitchen", label: "Kitchen Dashboard", icon: ChefHat, tag: "Kitchen", action: () => navigate("kitchen") }] : []),
        ...(!isPosOnly ? [{ id: "qa_kitchen_reports", targetPage: "kitchen", label: "Kitchen Reports (Purchase & GRN)", icon: FileSpreadsheet, tag: "Kitchen", action: () => navigate("kitchen_reports") }] : []),
        ...(!isKmsOnly ? [{ id: "qa_kds", targetPage: "kds", label: "Open Kitchen Display (KDS)", icon: Utensils, tag: "Live", action: () => navigate("kds") }] : []),
        ...(!isPosOnly ? [{ id: "qa_inventory", targetPage: "inventory", label: "Inspect Central Inventory", icon: Package, tag: "Stock", action: () => navigate("inventory") }] : []),
        ...(!isKmsOnly ? [{ id: "qa_menu", targetPage: "menu", label: "Manage Menu Catalog", icon: ClipboardList, tag: "Menu", action: () => navigate("menu") }] : []),
        { id: "qa_reports", targetPage: "reports", label: "Reports & Analytics", icon: BarChart3, tag: "Reports", action: () => navigate("reports") }
      ];

      return allActions.filter((a) => permittedPages.includes(a.targetPage));
    },
    [canBill, isSuperAdmin, isOrgAdmin, isKmsOnly, isPosOnly, permittedPages]
  );

  function navigate(id, extra = null) {
    if (extra && extra.branchId) {
      setSelectedBranchId(extra.branchId);
    } else if (id !== "branch_details") {
      setSelectedBranchId(null);
    }
    setPage(id);
    setSidebarOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    try {
      const path = id === "dashboard" ? "/" : `/${id}`;
      if (typeof window !== "undefined" && window.location.pathname !== path) {
        window.history.pushState(null, "", path);
      }
    } catch (_) {}
  }

  const currentHour = currentTime.getHours();
  const shiftName = currentHour >= 6 && currentHour < 15 ? "Morning Shift" : currentHour >= 15 && currentHour < 23 ? "Evening Shift" : "Night Shift";
  const timeFormatted = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateFormatted = currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const pageMeta = getPageMeta(selectedBranchId && page === "branches" ? "branch_details" : page, isSuperAdmin, isOrgAdmin);

  return (
    <div className="app-shell">
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={navigate}
        navSections={navSections}
        quickActions={quickActions}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">
              <ChefHat size={20} />
            </div>
            <div>
              <strong>ANNAMITHRA</strong>
              <small>Food & Restaurant Management</small>
            </div>
          </div>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="workspace-card">
          <div className="workspace-icon"><Store size={18} /></div>
          <div>
            <strong>{user.role === "Super Admin" ? "ANNAMITHRA System" : (user.organizationName || "Organization")}</strong>
            <div className="workspace-subline">
              <span className="status-pulse-dot" style={{ width: "5px", height: "5px" }} />
              <span>{user.role === "Super Admin" ? "All Organizations" : (user.branchName || "Organization Scope")}</span>
            </div>
          </div>
        </div>

        {!isSuperAdmin && !isOrgAdmin && (
          <div className="sidebar-module-switch-bar">
            <span className="module-badge-tag">
              {isKmsOnly ? "KMS Mode" : isPosOnly ? "POS Mode" : currentModule === "pos" ? "POS Mode" : currentModule === "kms" ? "KMS Mode" : "All Modules"}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {currentModule === "pos" && !isPosOnly && !isKmsOnly && (
                <button
                  type="button"
                  className="switch-link-btn"
                  onClick={() => {
                    setCurrentModule("kms");
                    setPage("kitchen");
                    try { sessionStorage.setItem("samaya_selected_module", "kms"); } catch {}
                  }}
                  title="Switch directly to KMS (Kitchen Management)"
                >
                  Go KMS →
                </button>
              )}
              {currentModule === "kms" && !isKmsOnly && !isPosOnly && (
                <button
                  type="button"
                  className="switch-link-btn"
                  onClick={() => {
                    setCurrentModule("pos");
                    setPage(canBill ? "billing" : "orders");
                    try { sessionStorage.setItem("samaya_selected_module", "pos"); } catch {}
                  }}
                  title="Switch directly to POS (Point of Sale)"
                >
                  Go POS →
                </button>
              )}
              {onSwitchModule && !isKmsOnly && !isPosOnly && (
                <button
                  type="button"
                  className="switch-link-btn"
                  onClick={onSwitchModule}
                  title="Return to Module Selection Hub"
                >
                  ⊞ Modules
                </button>
              )}
            </div>
          </div>
        )}

        <nav className="sidebar-nav-scroll">
          {navSections.map((sec) => {
            const visibleItems = sec.items.filter((item) => item.show !== false);
            if (visibleItems.length === 0) return null;
            return (
              <div key={sec.title} className="nav-section">
                <span className="nav-section-title">{sec.title}</span>
                <div className="nav-section-items">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = page === item.id || 
                      (item.id === "production" && ["production", "production_plan", "material_issue", "material_return"].includes(page)) ||
                      (item.id === "purchase" && ["purchase", "purchases", "vendors", "grn", "purchase_returns", "purchase_reports", "purchasereports"].includes(page)) ||
                      (item.id === "kitchen" && ["kitchen", "kitchen_mgmt", "kitchen_reports"].includes(page));
                    return (
                      <button
                        key={item.id}
                        className={`nav-item ${isActive ? "active" : ""}`}
                        onClick={() => navigate(item.id)}
                        title={item.desc}
                      >
                        <Icon size={18} />
                        <span className="nav-item-label">{item.label}</span>
                        {item.badge && (
                          <span className={`nav-item-badge ${isActive ? "active" : ""}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Enterprise Protected</strong>
              <span>Role-governed • MySQL v8</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} title="Toggle menu" aria-label="Toggle Navigation Menu">
              <Menu size={21} />
            </button>
            <div className="topbar-page-title-wrap">
              <h1 className="topbar-page-title">{pageMeta.title}</h1>
            </div>
          </div>

          <div className="topbar-right">
            {/* System Notifications Popover */}
            <div className="topbar-popover-anchor" ref={notifRef}>
              <button 
                className={`topbar-icon-action-btn ${notificationsOpen ? "active" : ""}`}
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setProfileOpen(false);
                }}
                title="System Status & Alerts"
                aria-label="Notifications"
              >
                <Bell size={17} />
                <span className="notification-indicator-dot" />
              </button>

              {notificationsOpen && (
                <div className="topbar-dropdown-card notifications-card">
                  <div className="dropdown-head">
                    <div>
                      <strong>System Health & Notifications</strong>
                      <small>Live Operational Status</small>
                    </div>
                    <span className="live-status-chip"><Activity size={12} /> Active</span>
                  </div>
                  <div className="notification-list">
                    <div className="notification-item">
                      <div className="notif-icon success"><CheckCircle2 size={15} /></div>
                      <div className="notif-text">
                        <strong>MySQL Database Connected</strong>
                        <span>Production tables synchronized</span>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notif-icon info"><Package size={15} /></div>
                      <div className="notif-text">
                        <strong>Central Inventory Tracking</strong>
                        <span>Live stock deduction enabled</span>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notif-icon warning"><Utensils size={15} /></div>
                      <div className="notif-text">
                        <strong>Kitchen KDS Operational</strong>
                        <span>Ready for chef order tickets</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Switch Module Button for eligible users */}
            {onSwitchModule && !isSuperAdmin && !isOrgAdmin && (
              <button
                type="button"
                className="switch-module-topbar-btn"
                onClick={onSwitchModule}
                title="Return to ANNAMITHRA Module Selection (POS / KMS)"
              >
                <LayoutGrid size={14} />
                <span>Switch Module</span>
              </button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

            {/* User Profile Popover */}
            <div className="topbar-popover-anchor" ref={profileRef}>
              <button 
                className={`profile-btn-trigger ${profileOpen ? "active" : ""}`}
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotificationsOpen(false);
                }}
                title="User Profile & Quick Settings"
              >
                <div className="avatar">{initials(user.name)}</div>
                <div className="profile-text">
                  <span className="profile-name">{user.name}</span>
                  <span className="profile-role-tag">{user.role}</span>
                </div>
                <ChevronDown size={13} className={`profile-chevron ${profileOpen ? "open" : ""}`} />
              </button>

              {profileOpen && (
                <div className="topbar-dropdown-card profile-card">
                  <div className="profile-card-header">
                    <div className="avatar large">{initials(user.name)}</div>
                    <div>
                      <strong>{user.name}</strong>
                      <span className="profile-email">{user.email}</span>
                      <span className="profile-role-badge">{user.role}</span>
                    </div>
                  </div>

                  <div className="profile-card-meta">
                    <div className="meta-row">
                      <span>Organization</span>
                      <strong>{user.organizationName || "ANNAMITHRA Enterprise"}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Branch</span>
                      <strong>{user.branchName || "All Branches"}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Shift</span>
                      <strong>{shiftName}</strong>
                    </div>
                  </div>

                  <div className="profile-card-actions">
                    {onSwitchModule && !isSuperAdmin && !isOrgAdmin && user.role !== "Waiter" && user.role !== "Inventory Manager" && (
                      <button
                        type="button"
                        className="dropdown-action-btn"
                        onClick={() => {
                          onSwitchModule();
                          setProfileOpen(false);
                        }}
                      >
                        <LayoutGrid size={15} />
                        <span>Switch Module (POS / KMS)</span>
                      </button>
                    )}
                    {canBill && (
                      <button className="dropdown-action-btn" onClick={() => { navigate("billing"); setProfileOpen(false); }}>
                        <Receipt size={15} />
                        <span>Go to Cashier POS</span>
                      </button>
                    )}
                    <button className="dropdown-action-btn" onClick={() => { setCommandPaletteOpen(true); setProfileOpen(false); }}>
                      <Command size={15} />
                      <span>Command Palette (⌘K)</span>
                    </button>
                    <button className="dropdown-action-btn signout" onClick={onLogout}>
                      <LogOut size={15} />
                      <span>Sign out of ANNAMITHRA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="content">
          {!permittedPages.includes(page) ? (
            <div className="page-grid">
              <div className="panel error-box" style={{ padding: "32px", textAlign: "center" }}>
                <Lock size={36} style={{ color: "#ef4444", margin: "0 auto 12px" }} />
                <h3 style={{ color: "#ef4444", marginBottom: "8px" }}>Access Restricted</h3>
                <p style={{ color: "var(--text-secondary, #c9ded3)" }}>
                  Your role (<strong>{user.role}</strong>) is not authorized to access the <strong>{page}</strong> module.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "16px" }}
                  onClick={() => navigate(permittedPages[0] || "dashboard")}
                >
                  Return to Authorized Menu
                </button>
              </div>
            </div>
          ) : (
            <>
              {page === "dashboard" && (
                isSuperAdmin ? (
                  <SuperAdminDashboard onNavigate={navigate} />
                ) : user.role === "Organization Admin" ? (
                  <OrganizationAdminDashboard
                    user={user}
                    onNavigate={navigate}
                    onSelectBranch={(bId) => {
                      setSelectedBranchId(bId);
                      setPage("branches");
                    }}
                  />
                ) : (
                  <DashboardHome user={user} onNavigate={navigate} />
                )
              )}
              {page === "organizations" && isSuperAdmin && <SuperAdminOrganizationsPage />}
              {page === "branches" && (
                selectedBranchId ? (
                  <BranchDetailsPage
                    branchId={selectedBranchId}
                    user={user}
                    onBack={() => {
                      setSelectedBranchId(null);
                      setPage("branches");
                    }}
                    onNavigate={navigate}
                  />
                ) : (
                  <BranchesPage
                    canManage={canManageBranches}
                    onSelectBranch={(bId) => {
                      setSelectedBranchId(bId);
                    }}
                  />
                )
              )}
              {page === "branch_details" && (
                <BranchDetailsPage
                  branchId={selectedBranchId}
                  user={user}
                  onBack={() => {
                    setSelectedBranchId(null);
                    setPage("branches");
                  }}
                  onNavigate={navigate}
                />
              )}
              {page === "users" && canManageUsers && <UsersPage user={user} />}
              {(page === "production" || page === "production_plan" || page === "material_issue" || page === "material_return") && (
                <ProductionDashboard
                  user={user}
                  initialTab={page === "material_issue" ? "issue" : page === "material_return" ? "return" : "plan"}
                  onNavigate={navigate}
                />
              )}
              {(page === "purchase" || page === "purchases" || page === "vendors" || page === "grn" || page === "purchase_returns" || page === "purchase_reports" || page === "purchasereports") && (
                <PurchaseDashboard
                  user={user}
                  initialTab={page === "vendors" ? "vendors" : page === "grn" ? "grn" : page === "purchase_returns" ? "purchase_return" : (page === "purchase_reports" || page === "purchasereports") ? "reports" : "purchase"}
                  onNavigate={navigate}
                />
              )}
              {(page === "kitchen" || page === "kitchen_mgmt" || page === "kitchen_reports") && (
                <KitchenDashboard
                  user={user}
                  initialTab={page === "kitchen_reports" ? "reports" : "stock"}
                  onNavigate={navigate}
                />
              )}
              {page === "kds" && <KitchenPage user={user} />}
              {page === "inventory" && <InventoryPage user={user} />}
              {page === "menu" && <MenuPage user={user} />}
              {page === "orders" && <OrdersPage user={user} onNavigate={navigate} />}
              {page === "billing" && canBill && <CashierBillingPage user={user} onNavigate={navigate} />}
              {page === "reports" && canViewReports && <ReportsAndAnalytics user={user} />}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "S";
}

function DashboardHome({ user, onNavigate }) {
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSalesToday, setTotalSalesToday] = useState(0);
  const [counterSalesToday, setCounterSalesToday] = useState(0);
  const [tableSalesToday, setTableSalesToday] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [allOrders, setAllOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [counterActiveCount, setCounterActiveCount] = useState(0);
  const [tableActiveCount, setTableActiveCount] = useState(0);
  const [occupiedTablesCount, setOccupiedTablesCount] = useState(0);
  const [totalTablesCount, setTotalTablesCount] = useState(0);
  const [allKots, setAllKots] = useState([]);
  const [pendingKotCount, setPendingKotCount] = useState(0);
  const [preparingKotCount, setPreparingKotCount] = useState(0);
  const [readyKotCount, setReadyKotCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [topDishes, setTopDishes] = useState([]);
  const [hourlyBars, setHourlyBars] = useState([]);
  const [plannedBatchesCount, setPlannedBatchesCount] = useState(0);

  const loadOperationalData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoadingStats(true);

    try {
      const [ordersRes, tablesRes, kotsRes, invRes, plansRes, itemsRes] = await Promise.allSettled([
        api.getOrders(),
        api.getTables(user?.branchId),
        api.getKOTs({ branchId: user?.branchId }),
        api.getInventorySummary(user?.branchId),
        api.getProductionPlans(user?.branchId),
        api.getInventoryItems(user?.branchId)
      ]);

      // 1. Process Orders & Sales
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        const orders = ordersRes.value;
        setAllOrders(orders);
        setTotalOrdersCount(orders.length);

        const open = orders.filter(
          (o) => o.status !== "Closed" && o.status !== "Cancelled" && o.status !== "Paid"
        );
        setActiveOrders(open);
        setCounterActiveCount(open.filter((o) => o.saleType === "SELF_SERVICE").length);
        setTableActiveCount(open.filter((o) => o.saleType !== "SELF_SERVICE").length);

        const closedOrPaid = orders.filter((o) => o.status === "Closed" || o.status === "Paid");
        const totalRev = closedOrPaid.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        const counterRev = closedOrPaid
          .filter((o) => o.saleType === "SELF_SERVICE")
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        const tableRev = closedOrPaid
          .filter((o) => o.saleType !== "SELF_SERVICE")
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        setTotalSalesToday(Math.round(totalRev));
        setCounterSalesToday(Math.round(counterRev));
        setTableSalesToday(Math.round(tableRev));

        // Dynamically compute Top Selling Dishes
        const dishMap = {};
        orders.forEach((o) => {
          (o.items || []).forEach((it) => {
            const name = it.menuItemName || "Unnamed Dish";
            if (!dishMap[name]) dishMap[name] = { name, qty: 0, rev: 0 };
            dishMap[name].qty += Number(it.quantity || 1);
            dishMap[name].rev += Number(it.lineTotal || (it.unitPrice * (it.quantity || 1))) || 0;
          });
        });
        const ranked = Object.values(dishMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
          .map((d, i) => ({
            rank: i + 1,
            name: d.name,
            qty: d.qty,
            rev: `₹${Math.round(d.rev).toLocaleString()}`
          }));
        setTopDishes(ranked);

        // Dynamically compute hourly sales distribution
        const buckets = [
          { time: "8 AM", hour: 8, rev: 0 },
          { time: "10 AM", hour: 10, rev: 0 },
          { time: "12 PM", hour: 12, rev: 0 },
          { time: "2 PM", hour: 14, rev: 0 },
          { time: "4 PM", hour: 16, rev: 0 },
          { time: "6 PM", hour: 18, rev: 0 },
          { time: "8 PM", hour: 20, rev: 0 },
          { time: "10 PM", hour: 22, rev: 0 }
        ];
        orders.forEach((o) => {
          const h = new Date(o.createdAt).getHours();
          const target = buckets.reduce((prev, curr) =>
            Math.abs(curr.hour - h) < Math.abs(prev.hour - h) ? curr : prev
          , buckets[0]);
          target.rev += Number(o.totalAmount || 0);
        });
        const maxVal = Math.max(...buckets.map((b) => b.rev), 1);
        setHourlyBars(
          buckets.map((b) => ({
            time: b.time,
            height: b.rev > 0 ? Math.max(Math.round((b.rev / maxVal) * 100), 18) : 8,
            val: `₹${Math.round(b.rev).toLocaleString()}`
          }))
        );
      }

      // 2. Process Tables
      if (tablesRes.status === "fulfilled" && Array.isArray(tablesRes.value)) {
        const tables = tablesRes.value;
        const occupied = tables.filter((t) => t.status === "OCCUPIED" || t.activeOrder);
        setOccupiedTablesCount(occupied.length);
        setTotalTablesCount(tables.length);
      }

      // 3. Process Kitchen Tickets (KOT)
      if (kotsRes.status === "fulfilled" && Array.isArray(kotsRes.value)) {
        const kots = kotsRes.value;
        setAllKots(kots);
        setPendingKotCount(kots.filter((k) => k.status === "Pending").length);
        setPreparingKotCount(kots.filter((k) => k.status === "Preparing").length);
        setReadyKotCount(kots.filter((k) => k.status === "Ready").length);
      }

      // 4. Process Inventory
      if (invRes.status === "fulfilled" && invRes.value) {
        setLowStockCount(invRes.value.lowStockCount ?? 0);
        setOutOfStockCount(invRes.value.outOfStockCount ?? 0);
      }

      // 5. Process Production Plan
      if (plansRes.status === "fulfilled" && Array.isArray(plansRes.value)) {
        setPlannedBatchesCount(plansRes.value.length);
      }

      // 6. Process Raw Material Inventory Items
      if (itemsRes.status === "fulfilled" && Array.isArray(itemsRes.value)) {
        setInventoryItems(itemsRes.value);
      }
    } catch (err) {
      console.error("Dashboard operational data load error:", err);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOperationalData();
  }, [user]);

  const occupancyPercent = totalTablesCount > 0 ? Math.round((occupiedTablesCount / totalTablesCount) * 100) : 0;
  const liveKitchenTickets = pendingKotCount + preparingKotCount;

  if (user?.role === "Kitchen Manager") {
    return (
      <KitchenManagerDashboardView
        user={user}
        liveKitchenTickets={liveKitchenTickets}
        pendingKotCount={pendingKotCount}
        preparingKotCount={preparingKotCount}
        readyKotCount={readyKotCount}
        plannedBatchesCount={plannedBatchesCount}
        lowStockCount={lowStockCount}
        kots={allKots}
        refreshing={refreshing}
        onRefresh={() => loadOperationalData(true)}
        onNavigate={onNavigate}
      />
    );
  }

  if (user?.role === "Chef") {
    return (
      <ChefDashboardView
        user={user}
        pendingKotCount={pendingKotCount}
        preparingKotCount={preparingKotCount}
        readyKotCount={readyKotCount}
        kots={allKots}
        refreshing={refreshing}
        onRefresh={() => loadOperationalData(true)}
        onNavigate={onNavigate}
      />
    );
  }

  if (user?.role === "Inventory Manager") {
    return (
      <InventoryManagerDashboardView
        user={user}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        plannedBatchesCount={plannedBatchesCount}
        inventoryItems={inventoryItems}
        refreshing={refreshing}
        onRefresh={() => loadOperationalData(true)}
        onNavigate={onNavigate}
      />
    );
  }

  if (user?.role === "Waiter") {
    return (
      <WaiterDashboardView
        user={user}
        totalTablesCount={totalTablesCount}
        occupiedTablesCount={occupiedTablesCount}
        occupancyPercent={occupancyPercent}
        readyKotCount={readyKotCount}
        activeOrders={activeOrders}
        refreshing={refreshing}
        onRefresh={() => loadOperationalData(true)}
        onNavigate={onNavigate}
      />
    );
  }

  if (user?.role === "Cashier") {
    return (
      <CashierDashboardView
        user={user}
        totalSalesToday={totalSalesToday}
        counterSalesToday={counterSalesToday}
        tableSalesToday={tableSalesToday}
        activeOrders={activeOrders}
        orders={allOrders}
        refreshing={refreshing}
        onRefresh={() => loadOperationalData(true)}
        onNavigate={onNavigate}
      />
    );
  }

  if (user?.role === "Accountant") {
    return (
      <AccountantDashboardView
        user={user}
        totalSalesToday={totalSalesToday}
        counterSalesToday={counterSalesToday}
        tableSalesToday={tableSalesToday}
        orders={allOrders}
        refreshing={refreshing}
        onRefresh={() => loadOperationalData(true)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <BranchManagerDashboardView
      user={user}
      totalSalesToday={totalSalesToday}
      counterSalesToday={counterSalesToday}
      tableSalesToday={tableSalesToday}
      activeOrders={activeOrders}
      counterActiveCount={counterActiveCount}
      tableActiveCount={tableActiveCount}
      totalOrdersCount={totalOrdersCount}
      liveKitchenTickets={liveKitchenTickets}
      readyKotCount={readyKotCount}
      pendingKotCount={pendingKotCount}
      preparingKotCount={preparingKotCount}
      occupiedTablesCount={occupiedTablesCount}
      totalTablesCount={totalTablesCount}
      occupancyPercent={occupancyPercent}
      topDishes={topDishes}
      hourlyBars={hourlyBars}
      refreshing={refreshing}
      onRefresh={() => loadOperationalData(true)}
      onNavigate={onNavigate}
    />
  );
}

function SuperAdminDashboard({ onNavigate }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="role-dashboard-view">
        <div className="role-panel error-box" style={{ padding: "24px" }}>
          <strong>Error loading organizations:</strong> {error}
          <button
            onClick={loadData}
            className="role-action-btn primary"
            style={{ marginTop: "14px" }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminDashboardView
      organizations={organizations}
      loading={loading}
      refreshing={loading}
      onRefresh={loadData}
      onNavigate={onNavigate}
    />
  );
}

function SuperAdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "Restaurant",
    city: "",
    phone: "",
    status: "Active",
    adminName: "",
    adminEmail: "",
    password: ""
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // View Modal state
  const [viewingOrg, setViewingOrg] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Credential update in View Modal
  const [showUpdateCreds, setShowUpdateCreds] = useState(false);
  const [updateCredsEmail, setUpdateCredsEmail] = useState("");
  const [updateCredsPassword, setUpdateCredsPassword] = useState("");
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [updatingCreds, setUpdatingCreds] = useState(false);
  const [updateCredsError, setUpdateCredsError] = useState("");
  const [updateCredsSuccess, setUpdateCredsSuccess] = useState("");

  // Delete Modal state
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadOrganizations() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function handleOpenView(org) {
    setViewLoading(true);
    setViewingOrg(org);
    setShowUpdateCreds(false);
    setUpdateCredsEmail("");
    setUpdateCredsPassword("");
    setShowUpdatePassword(false);
    setUpdateCredsError("");
    setUpdateCredsSuccess("");
    try {
      const details = await api.getOrganization(org.id);
      setViewingOrg(details);
      if (details?.admin?.email) {
        setUpdateCredsEmail(details.admin.email);
      }
    } catch (e) {
      console.warn("Could not fetch detailed organization info:", e);
    } finally {
      setViewLoading(false);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError("Organization Name is required.");
      return;
    }
    if (!createForm.adminEmail.trim()) {
      setCreateError("Administrator Login Email is required.");
      return;
    }
    if (!createForm.password.trim()) {
      setCreateError("Administrator Login Password is required.");
      return;
    }
    if (createForm.password.trim().length < 4) {
      setCreateError("Password must be at least 4 characters long.");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      await api.createOrganization({
        name: createForm.name.trim(),
        type: createForm.type,
        city: createForm.city.trim(),
        phone: createForm.phone.trim(),
        adminName: createForm.adminName.trim() || `${createForm.name.trim()} Admin`,
        adminEmail: createForm.adminEmail.trim(),
        password: createForm.password.trim()
      });
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        type: "Restaurant",
        city: "",
        phone: "",
        status: "Active",
        adminName: "",
        adminEmail: "",
        password: ""
      });
      setShowCreatePassword(false);
      setSuccessMessage("Organization and Administrator login credentials created successfully.");
      await loadOrganizations();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (e) {
      setCreateError(e.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateCredentialsSubmit(e) {
    e.preventDefault();
    if (!viewingOrg) return;
    if (!updateCredsPassword.trim() && !updateCredsEmail.trim()) {
      setUpdateCredsError("Please specify a login email or new password.");
      return;
    }
    if (updateCredsPassword.trim() && updateCredsPassword.trim().length < 4) {
      setUpdateCredsError("Password must be at least 4 characters long.");
      return;
    }

    setUpdatingCreds(true);
    setUpdateCredsError("");
    setUpdateCredsSuccess("");
    try {
      const payload = {};
      if (updateCredsEmail.trim()) payload.adminEmail = updateCredsEmail.trim();
      if (updateCredsPassword.trim()) payload.password = updateCredsPassword.trim();
      const res = await api.updateAdminCredentials(viewingOrg.id, payload);
      setUpdateCredsSuccess(res.message || "Credentials updated successfully.");
      setUpdateCredsPassword("");
      // Refresh organization details
      const refreshed = await api.getOrganization(viewingOrg.id);
      setViewingOrg(refreshed);
      loadOrganizations();
    } catch (err) {
      setUpdateCredsError(err.message || "Failed to update administrator credentials.");
    } finally {
      setUpdatingCreds(false);
    }
  }

  async function handleConfirmDelete() {
    if (!orgToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteOrganization(orgToDelete.id);
      const deletedName = orgToDelete.name;
      setOrgToDelete(null);
      setSuccessMessage(`Organization "${deletedName}" deleted successfully.`);
      await loadOrganizations();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (e) {
      setDeleteError(e.message || "Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  }

  function isSystemOrg(org) {
    return (
      String(org.name || "").trim().toLowerCase() === "samaya system" ||
      String(org.type || "").trim().toLowerCase() === "system"
    );
  }

  return (
    <div className="page-grid">
      <div className="page-actions-bar" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
        <button className="secondary-btn compact" onClick={loadOrganizations} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
        </button>
        <button
          className="primary-btn compact"
          onClick={() => {
            setCreateError("");
            setShowCreatePassword(false);
            setShowCreateModal(true);
          }}
        >
          <Plus size={16} /> Create Organization
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {successMessage && <div className="success-box">{successMessage}</div>}

      <div className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">ALL TENANTS</span>
            <h3>Registered Organizations</h3>
          </div>
          <span className="count-chip">
            {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="panel-body" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading organizations...
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Admin / Login Email</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Branches</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const systemProtected = isSystemOrg(org);
                  return (
                    <tr key={org.id}>
                      <td>
                        <strong>{org.name}</strong>
                        {org.phone && (
                          <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)" }}>
                            {org.phone}
                          </span>
                        )}
                      </td>
                      <td>
                        {org.adminEmail ? (
                          <div>
                            <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>
                              {org.adminEmail}
                            </span>
                            {org.adminName && (
                              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                                {org.adminName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>
                            No admin assigned
                          </span>
                        )}
                      </td>
                      <td>{org.type || "Restaurant"}</td>
                      <td>{org.city || "—"}</td>
                      <td>
                        <span className="count-chip">
                          {org.branchCount ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">
                          {org.status || "Active"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            className="secondary-btn compact"
                            onClick={() => handleOpenView(org)}
                            title="View organization credentials and branches"
                          >
                            <Eye size={14} /> View
                          </button>
                          {systemProtected ? (
                            <span
                              className="badge"
                              style={{
                                background: "var(--bg-surface-subtle)",
                                color: "var(--text-muted)",
                                border: "1px dashed var(--border-default)",
                                padding: "4px 8px"
                              }}
                              title="System organization cannot be deleted"
                            >
                              System Protected
                            </span>
                          ) : (
                            <button
                              className="danger-btn compact"
                              onClick={() => {
                                setDeleteError("");
                                setOrgToDelete(org);
                              }}
                              title={`Delete ${org.name}`}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-row">No organizations found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ORGANIZATION & CREDENTIALS MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={20} color="var(--primary-600)" />
                <h3 style={{ margin: 0 }}>Create Organization & Login Credentials</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => !creating && setShowCreateModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {createError && <div className="error-box">{createError}</div>}

                {/* Section 1: Organization Details */}
                <div style={{ padding: "14px", background: "var(--bg-surface-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <Building2 size={15} color="var(--brand-gold)" />
                    <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Organization Information
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label className="field-label">Organization Name *</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Grand Royal Hotel"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div className="form-group">
                      <label className="field-label">Organization Type</label>
                      <select
                        className="input-select"
                        value={createForm.type}
                        onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      >
                        <option value="Restaurant">Restaurant</option>
                        <option value="Hotel">Hotel</option>
                        <option value="Cafe">Cafe</option>
                        <option value="Cloud Kitchen">Cloud Kitchen</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Fast Food">Fast Food</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="field-label">City</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="e.g. Chennai"
                        value={createForm.city}
                        onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="field-label">Phone</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. 9876543210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 2: Administrator Login Credentials */}
                <div style={{ padding: "14px", background: "var(--bg-surface-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <Lock size={15} color="var(--brand-gold)" />
                    <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Administrator Login Credentials
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label className="field-label">Admin Full Name</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Rajesh Kumar (defaults to Org Admin)"
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label className="field-label">Admin Login Email *</label>
                    <input
                      type="email"
                      className="input-text"
                      placeholder="e.g. admin@grandroyal.com"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      required
                    />
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      This email will be used to log in as the organization administrator.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="field-label">Initial Password *</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={showCreatePassword ? "text" : "password"}
                        className="input-text"
                        placeholder="e.g. RoyalAdmin@123"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        required
                        style={{ paddingRight: "40px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          padding: "4px"
                        }}
                        title={showCreatePassword ? "Hide password" : "Show password"}
                      >
                        {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={14} color="var(--primary-600)" />
                    <span>Role will be set to <strong>Organization Admin</strong> (can manage branches, menus & staff).</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={creating}
                >
                  {creating ? "Creating Organization..." : "Create Organization & Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORGANIZATION DETAILS & CREDENTIALS MODAL */}
      {viewingOrg && (
        <div className="modal-overlay" onClick={() => setViewingOrg(null)}>
          <div className="modal-card large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={20} color="var(--primary-600)" />
                <h3 style={{ margin: 0 }}>Organization Details & Credentials</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setViewingOrg(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Organization Metadata */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                  padding: "16px",
                  background: "var(--bg-surface-subtle)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-default)"
                }}
              >
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Organization Name
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "700", marginTop: "2px" }}>
                    {viewingOrg.name}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Type
                  </span>
                  <div style={{ fontSize: "15px", fontWeight: "600", marginTop: "2px" }}>
                    {viewingOrg.type || "Restaurant"}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    City
                  </span>
                  <div style={{ fontSize: "15px", fontWeight: "600", marginTop: "2px" }}>
                    {viewingOrg.city || "—"}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Phone
                  </span>
                  <div style={{ fontSize: "15px", fontWeight: "600", marginTop: "2px" }}>
                    {viewingOrg.phone || "—"}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Status
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span className="badge badge-success">
                      {viewingOrg.status || "Active"}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Total Branches
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--primary-600)", marginTop: "2px" }}>
                    {viewingOrg.branches ? viewingOrg.branches.length : (viewingOrg.branchCount ?? 0)}
                  </div>
                </div>
              </div>

              {/* Administrator & Login Credentials Section */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-default)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Lock size={16} color="var(--brand-gold)" />
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", letterSpacing: "-0.01em" }}>
                      Administrator Login Credentials
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn compact"
                    onClick={() => {
                      setShowUpdateCreds(!showUpdateCreds);
                      setUpdateCredsError("");
                      setUpdateCredsSuccess("");
                    }}
                    style={{ fontSize: "12px" }}
                  >
                    {showUpdateCreds ? "Cancel Edit" : "Reset / Update Credentials"}
                  </button>
                </div>

                {viewingOrg.admin ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                      padding: "12px",
                      background: "var(--bg-surface-subtle)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle, #e5e7eb)"
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Admin Name
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "2px" }}>
                        {viewingOrg.admin.name || "Administrator"}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Login Email
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--primary-700, #047857)", marginTop: "2px" }}>
                        {viewingOrg.admin.email}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Role
                      </span>
                      <div style={{ marginTop: "4px" }}>
                        <span className="badge badge-info" style={{ fontWeight: "600" }}>
                          {viewingOrg.admin.role || "Organization Admin"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Account Status
                      </span>
                      <div style={{ marginTop: "4px" }}>
                        <span className="badge badge-success">
                          {viewingOrg.admin.status || "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "12px", background: "var(--bg-surface-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", fontSize: "13px" }}>
                    No administrator account assigned yet to this organization.
                  </div>
                )}

                {/* Inline Credential Reset/Update Form */}
                {showUpdateCreds && (
                  <form onSubmit={handleUpdateCredentialsSubmit} style={{ marginTop: "14px", padding: "14px", border: "1px dashed var(--primary-400, #10b981)", borderRadius: "var(--radius-md)", background: "var(--bg-surface-subtle)" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", color: "var(--primary-700, #047857)" }}>
                      Update Administrator Login Credentials
                    </div>

                    {updateCredsError && <div className="error-box" style={{ marginBottom: "10px" }}>{updateCredsError}</div>}
                    {updateCredsSuccess && <div className="success-box" style={{ marginBottom: "10px" }}>{updateCredsSuccess}</div>}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div className="form-group">
                        <label className="field-label">Login Email</label>
                        <input
                          type="email"
                          className="input-text"
                          placeholder="admin@organization.com"
                          value={updateCredsEmail}
                          onChange={(e) => setUpdateCredsEmail(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="field-label">New Password</label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <input
                            type={showUpdatePassword ? "text" : "password"}
                            className="input-text"
                            placeholder="Enter new password"
                            value={updateCredsPassword}
                            onChange={(e) => setUpdateCredsPassword(e.target.value)}
                            style={{ paddingRight: "36px" }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowUpdatePassword(!showUpdatePassword)}
                            style={{
                              position: "absolute",
                              right: "8px",
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "4px"
                            }}
                            title={showUpdatePassword ? "Hide password" : "Show password"}
                          >
                            {showUpdatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={() => setShowUpdateCreds(false)}
                        disabled={updatingCreds}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="primary-btn compact"
                        disabled={updatingCreds}
                      >
                        {updatingCreds ? "Updating..." : "Save Credentials"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Branches Section (View Only) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", letterSpacing: "-0.01em" }}>
                    Branches
                  </h4>
                  <span className="count-chip">
                    {viewingOrg.branches ? viewingOrg.branches.length : (viewingOrg.branchCount ?? 0)} branch{(viewingOrg.branches ? viewingOrg.branches.length : (viewingOrg.branchCount ?? 0)) !== 1 ? "es" : ""}
                  </span>
                </div>

                {viewLoading ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                    Loading branches...
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Branch Name</th>
                          <th>Location</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingOrg.branches || []).map((b) => (
                          <tr key={b.id}>
                            <td>
                              <strong>{b.name}</strong>
                              {b.code && (
                                <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)" }}>
                                  Code: {b.code}
                                </span>
                              )}
                            </td>
                            <td>{b.location || b.city || b.address || "—"}</td>
                            <td>
                              <span className={`badge ${b.isActive !== false ? "badge-success" : "badge-neutral"}`}>
                                {b.status || (b.isActive !== false ? "Active" : "Inactive")}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!viewingOrg.branches || viewingOrg.branches.length === 0) && (
                          <tr>
                            <td colSpan={3}>
                              <div className="empty-row" style={{ padding: "20px" }}>
                                Total Branches: 0 (No branches registered for this organization)
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setViewingOrg(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ORGANIZATION CONFIRMATION MODAL */}
      {orgToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setOrgToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-head" style={{ borderBottomColor: "var(--danger-500, #dc2626)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} color="var(--brand-gold)" />
                <h3 style={{ margin: 0 }}>Delete Organization?</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => !deleting && setOrgToDelete(null)}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {deleteError && <div className="error-box">{deleteError}</div>}

              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Are you sure you want to delete:
              </p>
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-surface-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  fontSize: "16px",
                  fontWeight: "700"
                }}
              >
                "{orgToDelete.name}"
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                This action may affect data associated with this organization according to the existing database deletion policy.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setOrgToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ReportsPage({ user }) {
  return <ReportsAndAnalytics user={user} />;
  const isRestricted = ["Staff", "Waiter", "Chef"].map(r => r.toLowerCase()).includes((user.role || "").trim().toLowerCase());
  if (isRestricted) {
    return (
      <div className="page-grid">
        <div className="panel error-box" style={{ padding: "24px", fontSize: "15px" }}>
          <strong>Access Restricted:</strong> {user.role} accounts are not authorized to view the reports section.
        </div>
      </div>
    );
  }

  const [reportTab, setReportTab] = useState("daily"); // "daily" | "trends"
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [dailyReport, setDailyReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user.branchId ? String(user.branchId) : "");
  const [days, setDays] = useState(7);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const activeBranchName = useMemo(() => {
    if (user.branchName) return user.branchName;
    if (branchId) {
      const b = branches.find(x => String(x.id) === String(branchId));
      return b ? b.name : `Branch #${branchId}`;
    }
    return "All Branches";
  }, [branches, branchId, user]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      if (reportTab === "daily") {
        const [dr, b] = await Promise.all([
          api.getDailyReport(branchId || undefined, selectedDate),
          branches.length === 0 ? api.getBranches().catch(() => []) : Promise.resolve(branches)
        ]);
        setDailyReport(dr);
        if (branches.length === 0 && b) setBranches(b);
      } else {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        from.setDate(from.getDate() - (Number(days) - 1));
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        const [s, d, b] = await Promise.all([
          api.getReportSummary({ branchId: branchId || undefined, from: from.toISOString(), to: to.toISOString() }),
          api.getDailySales(branchId || undefined, Number(days)),
          branches.length === 0 ? api.getBranches().catch(() => []) : Promise.resolve(branches)
        ]);
        setSummary(s);
        setDaily(d);
        if (branches.length === 0 && b) setBranches(b);
      }
    } catch (e) {
      setError(e.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [reportTab, branchId, selectedDate, days]);

  function handleSetToday() {
    setSelectedDate(getLocalDateString());
  }

  function handleSetYesterday() {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    setSelectedDate(getLocalDateString(y));
  }

  function handleExportCSV() {
    if (!dailyReport) return;
    const lines = [];
    lines.push("==================================================");
    lines.push(`${(user.organizationName || "RESTAURANT").toUpperCase()} - DAILY Z-REPORT`);
    lines.push(`Report Date,${dailyReport.date}`);
    lines.push(`Scope / Branch,${activeBranchName}`);
    lines.push(`Exported At,${new Date().toLocaleString()}`);
    lines.push("==================================================");
    lines.push("");
    lines.push("--- FINANCIAL & OPERATIONS SUMMARY ---");
    lines.push(`Gross Sales (INR),${Number(dailyReport.sales).toFixed(2)}`);
    lines.push(`Total Orders,${dailyReport.totalOrders}`);
    lines.push(`Served Orders,${dailyReport.servedOrders}`);
    lines.push(`Active / Pending Orders,${dailyReport.activeOrders}`);
    lines.push(`Cancelled Orders,${dailyReport.cancelledOrders}`);
    lines.push(`Average Order Value (INR),${Number(dailyReport.averageOrder).toFixed(2)}`);
    lines.push(`Inventory Usage (Units),${Number(dailyReport.usage).toFixed(3)}`);
    lines.push(`Recorded Wastage (Units),${Number(dailyReport.wastage).toFixed(3)}`);
    lines.push(`Stock In / Opening (Units),${Number(dailyReport.stockIn).toFixed(3)}`);
    lines.push("");
    lines.push("--- MENU SALES BREAKDOWN ---");
    lines.push("Item Name,Quantity Sold,Sales (INR)");
    (dailyReport.topItems || []).forEach(item => {
      lines.push(`"${(item.name || "").replace(/"/g, '""')}",${item.quantity},${Number(item.sales).toFixed(2)}`);
    });
    lines.push("");
    lines.push("--- ORDERS REGISTER ---");
    lines.push("Order #,Time,Table,Waiter,Branch,Status,Total Amount (INR),Items");
    (dailyReport.orders || []).forEach(o => {
      lines.push(`"${o.orderNumber}","${o.time}","${o.tableNumber}","${o.waiterName}","${o.branchName}","${o.status}",${Number(o.totalAmount).toFixed(2)},"${(o.itemSummary || "").replace(/"/g, '""')}"`);
    });
    lines.push("");
    lines.push("--- INVENTORY TRANSACTIONS ---");
    lines.push("Time,Item,Type,Quantity,Unit,Stock After,Reference,Actioned By");
    (dailyReport.transactions || []).forEach(t => {
      lines.push(`"${t.time}","${t.itemName}","${t.type}",${t.quantity},"${t.unit}",${t.stockAfter},"${(t.reference || "").replace(/"/g, '""')}","${t.userName}"`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daily_Report_${dailyReport.date}_${activeBranchName.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Filtered orders & inventory in Daily Report
  const filteredOrders = useMemo(() => {
    if (!dailyReport?.orders) return [];
    if (!orderSearch.trim()) return dailyReport.orders;
    const q = orderSearch.toLowerCase();
    return dailyReport.orders.filter(o =>
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
      (o.waiterName && o.waiterName.toLowerCase().includes(q)) ||
      (o.status && o.status.toLowerCase().includes(q)) ||
      (o.itemSummary && o.itemSummary.toLowerCase().includes(q))
    );
  }, [dailyReport, orderSearch]);

  const filteredTransactions = useMemo(() => {
    if (!dailyReport?.transactions) return [];
    if (!stockSearch.trim()) return dailyReport.transactions;
    const q = stockSearch.toLowerCase();
    return dailyReport.transactions.filter(t =>
      (t.itemName && t.itemName.toLowerCase().includes(q)) ||
      (t.type && t.type.toLowerCase().includes(q)) ||
      (t.userName && t.userName.toLowerCase().includes(q)) ||
      (t.reference && t.reference.toLowerCase().includes(q))
    );
  }, [dailyReport, stockSearch]);

  // Hourly stats with activity
  const activeHours = useMemo(() => {
    if (!dailyReport?.hourly) return [];
    return dailyReport.hourly.filter(h => h.orders > 0 || h.sales > 0);
  }, [dailyReport]);

  const maxHourSales = useMemo(() => {
    if (!activeHours.length) return 1;
    return Math.max(...activeHours.map(h => h.sales), 1);
  }, [activeHours]);

  const todayStr = getLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  return (
    <div className="page-grid">
      {/* Print-Only Professional Statement Header */}
      <div className="print-only-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>{(user.organizationName || "RESTAURANT").toUpperCase()}</h1>
            <p style={{ margin: "2px 0 0", fontSize: "14pt", fontWeight: "700" }}>DAILY OPERATIONS & FINANCIAL Z-REPORT</p>
          </div>
          <div style={{ textAlign: "right", fontSize: "10pt" }}>
            <div><strong>Date:</strong> {dailyReport?.date || selectedDate}</div>
            <div><strong>Branch:</strong> {activeBranchName}</div>
            <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
          </div>
        </div>
        <div className="print-meta-grid">
          <div><strong>Operator:</strong> {user.name} ({user.role})</div>
          <div><strong>Total Orders:</strong> {dailyReport?.totalOrders || 0}</div>
          <div><strong>Gross Revenue:</strong> ₹{Number(dailyReport?.sales || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Screen Subnav & Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }} className="no-print">
        <div className="report-subnav" style={{ marginBottom: 0 }}>
          <button
            className={`report-tab-btn ${reportTab === "daily" ? "active" : ""}`}
            onClick={() => setReportTab("daily")}
          >
            <Calendar size={16} />
            <span>Daily Report (Z-Report)</span>
          </button>
          <button
            className={`report-tab-btn ${reportTab === "trends" ? "active" : ""}`}
            onClick={() => setReportTab("trends")}
          >
            <TrendingUp size={16} />
            <span>Multi-Day Trends & Analytics</span>
          </button>
        </div>
        <button className="secondary-btn compact" onClick={loadData}>
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {error && <div className="error-box no-print">{error}</div>}

      {/* DAILY REPORT VIEW */}
      {reportTab === "daily" && (
        <>
          {/* Controls Bar: Date Picker, Quick Buttons, Branch Scope, Export & Print */}
          <div className="report-controls-bar no-print">
            <div className="report-controls-left">
              <div className="date-input-wrap">
                <Calendar size={15} />
                <span>Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`quick-date-btn ${selectedDate === todayStr ? "active" : ""}`}
                onClick={handleSetToday}
              >
                Today
              </button>
              <button
                type="button"
                className={`quick-date-btn ${selectedDate === yesterdayStr ? "active" : ""}`}
                onClick={handleSetYesterday}
              >
                Yesterday
              </button>

              {!user.branchId && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginLeft: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)" }}>BRANCH:</span>
                  <select
                    className="compact-select"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="report-controls-right">
              <button
                className="secondary-btn compact"
                onClick={handleExportCSV}
                disabled={!dailyReport || loading}
                title="Download daily ledger and stock movements in CSV"
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                className="primary-btn compact"
                onClick={() => window.print()}
                disabled={!dailyReport || loading}
                title="Print official Daily Z-Report"
              >
                <Printer size={15} /> Print Z-Report
              </button>
            </div>
          </div>

          {loading ? (
            <div className="panel empty-row">
              <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px", display: "block" }} />
              Loading Daily Report for {selectedDate}...
            </div>
          ) : dailyReport && (
            <>
              {/* Daily KPI Stat Cards */}
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-head">
                    <span>Gross Sales</span>
                    <div className="stat-icon"><BarChart3 size={19} /></div>
                  </div>
                  <strong>₹{Number(dailyReport.sales).toFixed(2)}</strong>
                  <small>{dailyReport.servedOrders} served orders</small>
                </div>

                <div className="stat-card">
                  <div className="stat-head">
                    <span>Total Orders</span>
                    <div className="stat-icon"><ShoppingCart size={19} /></div>
                  </div>
                  <strong>{dailyReport.totalOrders}</strong>
                  <small>{dailyReport.servedOrders} served · {dailyReport.activeOrders} active · {dailyReport.cancelledOrders} cancelled</small>
                </div>

                <div className="stat-card">
                  <div className="stat-head">
                    <span>Average Ticket</span>
                    <div className="stat-icon"><Sparkles size={19} /></div>
                  </div>
                  <strong>₹{Number(dailyReport.averageOrder).toFixed(2)}</strong>
                  <small>Per served order</small>
                </div>

                <div className="stat-card">
                  <div className="stat-head">
                    <span>Kitchen Usage</span>
                    <div className="stat-icon"><Package size={19} /></div>
                  </div>
                  <strong>{Number(dailyReport.usage).toFixed(3)}</strong>
                  <small>Ingredient units consumed</small>
                </div>

                <div className="stat-card">
                  <div className="stat-head">
                    <span>Recorded Wastage</span>
                    <div className="stat-icon"><Trash2 size={19} /></div>
                  </div>
                  <strong>{Number(dailyReport.wastage).toFixed(3)}</strong>
                  <small>Loss / spoil units</small>
                </div>

                <div className="stat-card">
                  <div className="stat-head">
                    <span>Stock Received</span>
                    <div className="stat-icon"><ArrowDownToLine size={19} /></div>
                  </div>
                  <strong>{Number(dailyReport.stockIn).toFixed(3)}</strong>
                  <small>Purchases & opening units</small>
                </div>
              </div>

              {/* Section Grid: Hourly Traffic Distribution & Menu Performance */}
              <div className="section-grid">
                {/* Hourly Traffic & Sales Breakdown */}
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">HOURLY DISTRIBUTION</span>
                      <h3>Hourly Sales & Traffic</h3>
                    </div>
                    <Clock size={20} />
                  </div>

                  {activeHours.length === 0 ? (
                    <div className="empty-row">No order activity recorded for {selectedDate}.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Time Window</th>
                            <th>Total Orders</th>
                            <th>Served</th>
                            <th>Hourly Revenue</th>
                            <th>Traffic Load</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeHours.map((h) => {
                            const pct = Math.round((h.sales / maxHourSales) * 100);
                            return (
                              <tr key={h.hour}>
                                <td>
                                  <strong>{h.hour} – {String(h.hourNum + 1).padStart(2, "0")}:00</strong>
                                </td>
                                <td>{h.orders}</td>
                                <td>
                                  <span className="count-chip">{h.served}</span>
                                </td>
                                <td>
                                  <strong>₹{Number(h.sales).toFixed(2)}</strong>
                                </td>
                                <td style={{ minWidth: "120px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div className="hourly-progress-track" style={{ flex: 1 }}>
                                      <div
                                        className="hourly-progress-fill"
                                        style={{ width: `${Math.max(pct, 5)}%` }}
                                      />
                                    </div>
                                    <span style={{ fontSize: "11px", fontWeight: "700", minWidth: "32px", textAlign: "right" }}>
                                      {pct}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Menu Sales Mix */}
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">SALES MIX</span>
                      <h3>Menu Items Sold</h3>
                    </div>
                    <Utensils size={20} />
                  </div>

                  {(!dailyReport.topItems || dailyReport.topItems.length === 0) ? (
                    <div className="empty-row">No served items recorded for this date.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Food Item</th>
                            <th>Qty</th>
                            <th>Revenue</th>
                            <th>Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyReport.topItems.map((x) => {
                            const share = dailyReport.sales > 0
                              ? Math.round((Number(x.sales) / Number(dailyReport.sales)) * 100)
                              : 0;
                            return (
                              <tr key={x.name}>
                                <td><strong>{x.name}</strong></td>
                                <td>{x.quantity}</td>
                                <td><strong>₹{Number(x.sales).toFixed(2)}</strong></td>
                                <td>
                                  <span className="code-chip">{share}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Orders Register */}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">ORDER LEDGER</span>
                    <h3>Daily Orders Register</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      Showing {filteredOrders.length} of {dailyReport.orders?.length || 0} orders · Subtotal: ₹{filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="search-box no-print" style={{ maxWidth: "280px" }}>
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search order #, table, waiter..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="empty-row">
                    {orderSearch ? "No orders match your search criteria." : "No orders found for this date."}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Time</th>
                          <th>Table</th>
                          <th>Waiter</th>
                          {!user.branchId && <th>Branch</th>}
                          <th>Items Ordered</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((o) => {
                          const statusLower = (o.status || "").toLowerCase();
                          const badgeClass =
                            statusLower === "served" || statusLower === "completed"
                              ? "status-completed"
                              : statusLower === "cancelled"
                              ? "status-cancelled"
                              : "status-pending";

                          return (
                            <tr key={o.id}>
                              <td>
                                <strong>{o.orderNumber}</strong>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>{o.time}</td>
                              <td>{o.tableNumber}</td>
                              <td>{o.waiterName}</td>
                              {!user.branchId && <td>{o.branchName}</td>}
                              <td style={{ maxWidth: "340px", fontSize: "12px" }}>
                                {o.itemSummary || "—"}
                              </td>
                              <td>
                                <span className={`status-badge ${badgeClass}`}>
                                  {o.status}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <strong>₹{Number(o.totalAmount).toFixed(2)}</strong>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Daily Inventory Movement / Consumption Log */}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">INVENTORY AUDIT</span>
                    <h3>Daily Stock Movements</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      {filteredTransactions.length} movements recorded for {selectedDate}
                    </p>
                  </div>
                  <div className="search-box no-print" style={{ maxWidth: "280px" }}>
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search item, type, user..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                    />
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="empty-row">
                    {stockSearch ? "No movements match your search criteria." : "No inventory transactions logged on this date."}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Inventory Item</th>
                          <th>Movement Type</th>
                          <th>Quantity</th>
                          <th>Stock Balance</th>
                          <th>Reference / Notes</th>
                          <th>Logged By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((t) => {
                          const typeLower = (t.type || "").toLowerCase();
                          const badgeClass =
                            typeLower === "wastage"
                              ? "status-cancelled"
                              : typeLower === "usage"
                              ? "status-pending"
                              : "status-completed";

                          return (
                            <tr key={t.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{t.time}</td>
                              <td>
                                <strong>{t.itemName}</strong>
                              </td>
                              <td>
                                <span className={`status-badge ${badgeClass}`}>
                                  {t.type}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: t.type === "Wastage" || t.type === "Usage" ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                                  {t.type === "Usage" || t.type === "Wastage" ? `-${Number(t.quantity).toFixed(3)}` : `+${Number(t.quantity).toFixed(3)}`} {t.unit}
                                </strong>
                              </td>
                              <td>
                                {t.stockAfter != null ? `${Number(t.stockAfter).toFixed(3)} ${t.unit}` : "—"}
                              </td>
                              <td>{t.reference || "—"}</td>
                              <td>{t.userName || "System"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* MULTI-DAY TRENDS VIEW */}
      {reportTab === "trends" && (
        <>
          <div className="branch-filter panel no-print">
            <div>
              <span className="eyebrow">SCOPE & RANGE</span>
              <strong>Trend Analytics</strong>
            </div>
            {!user.branchId && (
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>

          {loading ? (
            <div className="panel empty-row">
              <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px", display: "block" }} />
              Loading live trend report...
            </div>
          ) : summary && (
            <>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-head">
                    <span>Sales</span>
                    <div className="stat-icon"><BarChart3 size={19} /></div>
                  </div>
                  <strong>₹{Number(summary.sales).toFixed(2)}</strong>
                  <small>Served orders in {days} days</small>
                </div>
                <div className="stat-card">
                  <div className="stat-head">
                    <span>Orders</span>
                    <div className="stat-icon"><ShoppingCart size={19} /></div>
                  </div>
                  <strong>{summary.totalOrders}</strong>
                  <small>{summary.pendingOrders} active</small>
                </div>
                <div className="stat-card">
                  <div className="stat-head">
                    <span>Inventory usage</span>
                    <div className="stat-icon"><Package size={19} /></div>
                  </div>
                  <strong>{Number(summary.usage).toFixed(3)}</strong>
                  <small>Total usage units</small>
                </div>
                <div className="stat-card">
                  <div className="stat-head">
                    <span>Wastage</span>
                    <div className="stat-icon"><Trash2 size={19} /></div>
                  </div>
                  <strong>{Number(summary.wastage).toFixed(3)}</strong>
                  <small>Recorded wastage units</small>
                </div>
              </div>

              <div className="section-grid">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">SALES TREND</span>
                      <h3>Daily sales history</h3>
                    </div>
                    <BarChart3 size={20} />
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Orders</th>
                          <th>Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daily.map((x) => (
                          <tr key={x.date}>
                            <td>{x.date}</td>
                            <td>{x.orders}</td>
                            <td>₹{Number(x.sales).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="eyebrow">TOP SELLERS</span>
                      <h3>Menu performance</h3>
                    </div>
                    <Utensils size={20} />
                  </div>
                  {summary.topItems.length === 0 ? (
                    <div className="empty-row">No served sales yet.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Food</th>
                            <th>Qty</th>
                            <th>Sales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.topItems.map((x) => (
                            <tr key={x.name}>
                              <td><strong>{x.name}</strong></td>
                              <td>{x.quantity}</td>
                              <td>₹{Number(x.sales).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">OPERATIONS</span>
                    <h3>Period summary</h3>
                  </div>
                  <ClipboardList size={20} />
                </div>
                <div className="access-box">
                  <div>
                    <span>Served orders</span>
                    <strong>{summary.servedOrders}</strong>
                  </div>
                  <div>
                    <span>Average order</span>
                    <strong>₹{Number(summary.averageOrder).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Stock received/opening</span>
                    <strong>{Number(summary.stockIn).toFixed(3)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ComingSoon({ title, description, icon: Icon }) {
  return (
    <div className="empty-module">
      <div className="empty-icon"><Icon size={30} /></div>
      <span className="eyebrow">NEXT MODULE</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="module-badge">Backend foundation connected</span>
    </div>
  );
}
// BranchesPage component is imported from ./BranchesPage.jsx

function UsersPage({ user }) {
  const isSuperAdmin = user.role === "Super Admin";
  const isBranchManager = user.role === "Branch Manager";
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState("");
  const [form, setForm] = useState({
    organizationId: "",
    name: "",
    email: "",
    password: "",
    roleId: isBranchManager ? 8 : 3,
    branchId: isBranchManager ? String(user.branchId || "") : ""
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setError("");

      const [u, r, b] = await Promise.all([
        api.getUsers(isSuperAdmin ? (organizationId || undefined) : undefined),
        api.getRoles(),
        api.getBranches()
      ]);

      // Filter users: Branch Manager only sees staff in their branch
      let displayedUsers = u;
      if (isBranchManager) {
        displayedUsers = u.filter(usr => Number(usr.branchId) === Number(user.branchId));
      }
      setUsers(displayedUsers);

      // Filter roles: Branch Manager can only assign operational roles
      let selectableRoles = r;
      if (isBranchManager) {
        selectableRoles = r.filter(role =>
          !["Super Admin", "Organization Admin", "Branch Manager", "Consumer"].includes(role.name)
        );
      }
      setRoles(selectableRoles);
      setBranches(b);

      if (isSuperAdmin) {
        const orgs = await api.getOrganizations();
        setOrganizations(orgs);

        if (!form.organizationId && orgs.length) {
          setForm(f => ({ ...f, organizationId: String(orgs[0].id) }));
        }
      }

      if (selectableRoles.length && (!form.roleId || isBranchManager)) {
        const defaultRoleId = isBranchManager
          ? (selectableRoles.find(x => x.name === "Waiter")?.id || selectableRoles[0]?.id || 8)
          : (r.find(x => x.name === "Branch Manager")?.id || r[0]?.id || 3);

        setForm(f => ({
          ...f,
          roleId: defaultRoleId,
          branchId: isBranchManager ? String(user.branchId || "") : f.branchId
        }));
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [organizationId, isSuperAdmin]);

  async function create(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const targetBranchId = isBranchManager
        ? Number(user.branchId)
        : (form.branchId ? Number(form.branchId) : null);

      await api.createUser({
        organizationId: isSuperAdmin
          ? Number(form.organizationId)
          : Number(user.organizationId),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        roleId: Number(form.roleId),
        branchId: targetBranchId
      });

      setForm(f => ({
        ...f,
        name: "",
        email: "",
        password: "",
        roleId: isBranchManager
          ? (roles.find(x => x.name === "Waiter")?.id || roles[0]?.id || 8)
          : f.roleId,
        branchId: isBranchManager ? String(user.branchId || "") : ""
      }));

      setMessage(isBranchManager ? "Branch staff account created successfully." : "User created successfully.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteUser(userToDelete) {
    if (isBranchManager) {
      if (userToDelete.id === user.id) {
        setError("You cannot delete your own login account.");
        return;
      }
      if (Number(userToDelete.branchId) !== Number(user.branchId)) {
        setError("You can only delete users from your assigned branch.");
        return;
      }
      if (["Super Admin", "Organization Admin", "Branch Manager"].includes(userToDelete.role)) {
        setError("Branch Manager cannot delete administrative or managerial accounts.");
        return;
      }
    }

    const confirmed = window.confirm(
      `Delete the login for ${userToDelete.name} (${userToDelete.email})?\n\n` +
      "If the account has historical records, ANNAMITHRA will deactivate the login and preserve those records."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const result = await api.deleteUser(userToDelete.id);
      setMessage(result.message || "User login deleted successfully.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="page-actions-bar" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "12px" }}>
        <span className="count-chip">{users.length} users</span>
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <div className="panel form-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CREATE</span>
            <h3>{isBranchManager ? "Add branch staff" : "Add user"}</h3>
          </div>
          <Users size={20} />
        </div>

        <form className="form-grid" onSubmit={create}>
          {isSuperAdmin && (
            <label className="field">
              <span>Organization</span>
              <select
                value={form.organizationId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    organizationId: e.target.value,
                    branchId: ""
                  })
                }
                required
              >
                <option value="">Select organization</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Field
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={isBranchManager ? "e.g. Rahul Waiter" : "Branch Manager"}
            required
          />

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={isBranchManager ? "staff@example.com" : "manager@example.com"}
            required
          />

          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            required
          />

          <label className="field">
            <span>Role</span>
            <select
              value={form.roleId}
              onChange={(e) =>
                setForm({ ...form, roleId: e.target.value })
              }
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {isBranchManager ? (
            <label className="field">
              <span>Assigned Branch</span>
              <input
                type="text"
                value={`${user.branchName || "Branch"} (Current branch)`}
                disabled
                style={{ background: "rgba(255,255,255,0.06)", cursor: "not-allowed", opacity: 0.85 }}
              />
            </label>
          ) : (
            <label className="field">
              <span>Branch</span>
              <select
                value={form.branchId}
                onChange={(e) =>
                  setForm({ ...form, branchId: e.target.value })
                }
              >
                <option value="">Organization level</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="form-action">
            <button className="primary-btn compact" type="submit">
              {isBranchManager ? "Create branch staff" : "Create user"} <ChevronRight size={17} />
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">DIRECTORY</span>
            <h3>
              {isSuperAdmin
                ? "All organization users"
                : isBranchManager
                ? `${user.branchName || "Branch"} Staff Directory`
                : "Organization users"}
            </h3>
          </div>

          {isSuperAdmin && (
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="compact-select"
            >
              <option value="">All organizations</option>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                {isSuperAdmin && <th>Organization</th>}
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <span>{u.email}</span>
                  </td>

                  {isSuperAdmin && (
                    <td>{u.organizationName || "—"}</td>
                  )}

                  <td>
                    <span className="role-chip">{u.role}</span>
                  </td>

                  <td>
                    {u.branchName || "Organization level"}
                  </td>

                  <td>
                    <span
                      className={`status ${
                        u.isActive ? "active" : "inactive"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    {u.id === user.id ? (
                      <span className="muted">Current account</span>
                    ) : isBranchManager && ["Super Admin", "Organization Admin", "Branch Manager"].includes(u.role) ? (
                      <span className="muted">Protected</span>
                    ) : (
                      <button
                        className="danger-btn compact"
                        onClick={() => deleteUser(u)}
                      >
                        <Trash2 size={15} />
                        Delete login
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5}>
                    <div className="empty-row">No users found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventoryPage({ user }) {
  const isOrgAdmin = ["Organization Admin", "Super Admin"].includes(user.role);
  const canManageItems = ["Organization Admin", "Super Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager"].includes(user.role);
  const canTransact = ["Organization Admin", "Super Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager", "Chef", "Staff"].includes(user.role);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user.branchId ? String(user.branchId) : "");
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, lowStock: 0, outOfStock: 0, stockValueUnits: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    branchId: user.branchId ? String(user.branchId) : "",
    itemCode: "",
    name: "",
    category: "",
    unit: "KG",
    minimumStock: "",
    reorderLevel: "",
    maximumStock: "",
    openingStock: "",
    reference: "",
    description: ""
  });


  // Edit item state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    itemCode: "",
    name: "",
    category: "",
    unit: "KG",
    minimumStock: "",
    reorderLevel: "",
    maximumStock: "",
    description: ""
  });

  // Spoil food state
  const [spoilItem, setSpoilItem] = useState(null);
  const [spoilQuantity, setSpoilQuantity] = useState("");
  const [spoilReason, setSpoilReason] = useState("Expired / Past Best-Before Date");
  const [spoilDisposal, setSpoilDisposal] = useState("Discarded in Waste / Organic Compost");
  const [spoilNotes, setSpoilNotes] = useState("");
  const [submittingSpoil, setSubmittingSpoil] = useState(false);

  // =========================================================================
  // INVENTORY TRANSFER PERMISSIONS & STATE (Requirement 1 - 15)
  // =========================================================================
  const canCreateTransfer = ["Super Admin", "Organization Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager"].includes(user.role);
  const canReceiveTransfer = ["Super Admin", "Organization Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager"].includes(user.role);

  const [inventoryTab, setInventoryTab] = useState("inventory"); // "inventory" | "transfers" | "alerts"

  // =========================================================================
  // LOW STOCK & OUT OF STOCK ALERTS & REORDER STATE
  // =========================================================================
  const [alertFilter, setAlertFilter] = useState("ALL"); // "ALL" | "LOW" | "OUT"
  const [alertSearch, setAlertSearch] = useState("");
  const [alertCategoryFilter, setAlertCategoryFilter] = useState("All");

  // Reorder Modal State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderItem, setReorderItem] = useState(null);
  const [reorderForm, setReorderForm] = useState({
    vendorId: "",
    quantity: "",
    rate: "",
    paymentMethod: "",
    invoiceNumber: "",
    notes: ""
  });
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submittingReorder, setSubmittingReorder] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [transferSubTab, setTransferSubTab] = useState("received"); // "received" | "sent" | "history"
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transferStatusFilter, setTransferStatusFilter] = useState("ALL"); // "ALL" | "Pending" | "Received" | "Cancelled"
  const [transferSearch, setTransferSearch] = useState("");

  // Create Transfer Modal State (Requirement 1)
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);
  const [newTransferForm, setNewTransferForm] = useState({
    toBranchId: "",
    itemId: "",
    quantity: "",
    unit: "",
    remarks: ""
  });
  const [senderBranchItems, setSenderBranchItems] = useState([]);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferActionError, setTransferActionError] = useState("");
  const [transferActionSuccess, setTransferActionSuccess] = useState("");

  // Transfer Details View Modal State
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Confirm Stock Receipt Modal State (Requirement 6)
  const [confirmReceiveTransfer, setConfirmReceiveTransfer] = useState(null);
  const [receivingTransferId, setReceivingTransferId] = useState(null);

  // Current active branch (locked sender branch for Create Transfer)
  const currentBranch = useMemo(() => {
    if (user.branchId) {
      return branches.find(b => b.id === user.branchId) || { id: user.branchId, name: user.branchName || "Current Branch" };
    }
    if (selectedBranch) {
      return branches.find(b => String(b.id) === String(selectedBranch)) || branches[0];
    }
    return branches.find(b => b.name?.toLowerCase().includes("main") || b.name?.toLowerCase().includes("central")) || branches[0];
  }, [branches, user.branchId, user.branchName, selectedBranch]);

  // Destination branches state for Inventory Transfer (allows branch managers to see destination branches in their organization)
  const [transferBranches, setTransferBranches] = useState([]);

  async function loadTransferBranches() {
    try {
      const bList = await api.getBranches(true);
      const list = Array.isArray(bList) ? bList : [];
      setTransferBranches(list);
      return list;
    } catch (e) {
      return [];
    }
  }

  // Load destination branches when navigating to Transfers tab
  useEffect(() => {
    if (inventoryTab === "transfers") {
      loadTransferBranches();
    }
  }, [inventoryTab]);

  // Destination branches (must be valid active branches excluding currentBranch)
  // ONLY in inventory transfer: branch managers can see other active branches in their organization
  const destinationBranches = useMemo(() => {
    const list = transferBranches.length > 0 ? transferBranches : branches;
    if (!currentBranch) return list.filter(b => b.isActive !== false);
    return list.filter(b => b.id !== currentBranch.id && b.isActive !== false);
  }, [branches, transferBranches, currentBranch]);

  // Selected item in Create Transfer modal
  const selectedTransferItem = useMemo(() => {
    if (!newTransferForm.itemId) return null;
    return senderBranchItems.find(i => String(i.id) === String(newTransferForm.itemId));
  }, [senderBranchItems, newTransferForm.itemId]);

  // Real-time transfer quantity validation error
  const transferQuantityError = useMemo(() => {
    if (!newTransferForm.quantity) return "";
    const qty = parseFloat(newTransferForm.quantity);
    if (isNaN(qty) || qty <= 0) return "Transfer quantity must be greater than 0.";
    if (selectedTransferItem) {
      const avail = Number(selectedTransferItem.currentStock || 0);
      if (qty > avail) {
        return `Transfer quantity cannot exceed available stock. (Available: ${avail.toFixed(3)} ${selectedTransferItem.unit || 'KG'})`;
      }
    }
    return "";
  }, [newTransferForm.quantity, selectedTransferItem]);

  async function loadTransfers() {
    setTransfersLoading(true);
    setTransferActionError("");
    try {
      const branchParam = currentBranch?.id;
      const data = await api.getTransfers(branchParam ? { branchId: branchParam } : {});
      setTransfers(Array.isArray(data) ? data : []);
    } catch (e) {
      setTransferActionError(e.message || "Failed to load transfers.");
    } finally {
      setTransfersLoading(false);
    }
  }

  async function openNewTransferModal() {
    setTransferActionError("");
    setTransferActionSuccess("");
    try {
      let candidateBranches = transferBranches;
      if (!candidateBranches || candidateBranches.length === 0) {
        candidateBranches = await loadTransferBranches();
      }
      const validDestinations = (candidateBranches && candidateBranches.length > 0 ? candidateBranches : branches)
        .filter(b => (!currentBranch || b.id !== currentBranch.id) && b.isActive !== false);

      const bItems = await api.getInventoryItems(currentBranch?.id);
      const activeItems = Array.isArray(bItems) ? bItems.filter(i => i.isActive !== false) : [];
      setSenderBranchItems(activeItems);

      const firstItem = activeItems[0];
      setNewTransferForm({
        toBranchId: validDestinations[0]?.id ? String(validDestinations[0].id) : "",
        itemId: firstItem ? String(firstItem.id) : "",
        quantity: "",
        unit: firstItem ? (firstItem.unit || "KG") : "KG",
        remarks: ""
      });
      setShowNewTransferModal(true);
    } catch (e) {
      setTransferActionError("Failed to fetch current branch inventory: " + e.message);
    }
  }

  async function handleTransferStock(e) {
    e.preventDefault();
    setTransferActionError("");
    setTransferActionSuccess("");

    if (!newTransferForm.toBranchId) {
      setTransferActionError("Please select a destination branch.");
      return;
    }
    if (String(newTransferForm.toBranchId) === String(currentBranch?.id)) {
      setTransferActionError("Source branch and destination branch cannot be the same.");
      return;
    }
    if (!newTransferForm.itemId) {
      setTransferActionError("Please select an inventory item to transfer.");
      return;
    }

    const qty = parseFloat(newTransferForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      setTransferActionError("Transfer quantity must be greater than 0.");
      return;
    }

    if (selectedTransferItem && qty > Number(selectedTransferItem.currentStock || 0)) {
      setTransferActionError(`Transfer quantity cannot exceed available stock. (Available: ${Number(selectedTransferItem.currentStock).toFixed(3)} ${selectedTransferItem.unit || 'KG'})`);
      return;
    }

    setSubmittingTransfer(true);
    try {
      const payload = {
        fromBranchId: currentBranch?.id,
        toBranchId: Number(newTransferForm.toBranchId),
        itemId: Number(newTransferForm.itemId),
        quantity: qty,
        unit: selectedTransferItem?.unit || newTransferForm.unit || "KG",
        remarks: newTransferForm.remarks?.trim() || null
      };

      const res = await api.createTransfer(payload);
      setShowNewTransferModal(false);
      setTransferActionSuccess(`Stock transfer ${res.transferNumber || ""} created successfully with status Pending. Sender stock has been deducted.`);
      await loadTransfers();
      await load(); // Reload sender branch inventory immediately!
    } catch (err) {
      setTransferActionError(err.message || "Failed to create inventory transfer.");
    } finally {
      setSubmittingTransfer(false);
    }
  }

  async function handleReceiveTransfer(transfer) {
    if (!transfer) return;
    const norm = (transfer.status || "").toLowerCase().replace("_", " ");
    if (norm !== "pending") {
      setTransferActionError(`Transfer ${transfer.transferNumber || transfer.id} cannot be received because status is '${transfer.status}'.`);
      return;
    }

    setReceivingTransferId(transfer.id);
    setTransferActionError("");
    setTransferActionSuccess("");
    try {
      const res = await api.receiveTransfer(transfer.id);
      setTransferActionSuccess(res.message || `Transfer ${transfer.transferNumber || transfer.id} received successfully. Stock added to ${transfer.toBranchName || 'destination branch'}.`);
      setConfirmReceiveTransfer(null);
      if (viewingTransfer && viewingTransfer.id === transfer.id) {
        const updated = await api.getTransferDetails(transfer.id);
        setViewingTransfer(updated);
      }
      await loadTransfers();
      await load(); // Reload branch inventory immediately!
    } catch (err) {
      setTransferActionError(err.message || "Failed to receive transfer.");
    } finally {
      setReceivingTransferId(null);
    }
  }

  async function handleCancelTransfer(transferId) {
    if (!window.confirm("Are you sure you want to cancel this transfer? Transferred quantity will be restored to the sender branch.")) return;
    setTransferActionError("");
    setTransferActionSuccess("");
    try {
      const res = await api.cancelTransfer(transferId);
      setTransferActionSuccess(res.message || "Transfer cancelled successfully. Stock restored to sender branch.");
      await loadTransfers();
      await load();
    } catch (err) {
      setTransferActionError(err.message || "Failed to cancel transfer.");
    }
  }

  async function handleViewDetails(transfer) {
    setLoadingDetails(true);
    setTransferActionError("");
    try {
      const full = await api.getTransferDetails(transfer.id);
      setViewingTransfer(full || transfer);
    } catch (e) {
      setViewingTransfer(transfer);
    } finally {
      setLoadingDetails(false);
    }
  }

  function formatTransferDateTime(dateStr) {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = String(d.getDate()).padStart(2, "0");
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, "0");
      return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  }

  function getStatusBadge(status) {
    const s = (status || "").trim().toUpperCase().replace("_", " ");
    let bg = "rgba(100, 116, 139, 0.12)";
    let color = "#64748b";
    let border = "rgba(100, 116, 139, 0.25)";

    if (s === "PENDING" || s === "REQUESTED") {
      bg = "rgba(245, 158, 11, 0.12)";
      color = "#b45309";
      border = "rgba(245, 158, 11, 0.35)";
    } else if (s === "RECEIVED" || s === "COMPLETED") {
      bg = "rgba(16, 185, 129, 0.12)";
      color = "#059669";
      border = "rgba(16, 185, 129, 0.35)";
    } else if (s === "CANCELLED" || s === "REJECTED") {
      bg = "rgba(239, 68, 68, 0.12)";
      color = "#dc2626";
      border = "rgba(239, 68, 68, 0.35)";
    }

    const label = (s === "PENDING" || s === "REQUESTED") ? "Pending"
      : (s === "RECEIVED" || s === "COMPLETED") ? "Received"
      : (s === "CANCELLED" || s === "REJECTED") ? "Cancelled"
      : status;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 9px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.03em",
          background: bg,
          color: color,
          border: `1px solid ${border}`
        }}
      >
        {label}
      </span>
    );
  }

  // Received Transfers: transfers where ToBranch == currentBranch
  const receivedTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (currentBranch?.id && t.toBranchId !== currentBranch.id) return false;
      if (transferSearch) {
        const q = transferSearch.toLowerCase();
        const tid = (t.transferNumber || `TRF-${t.id}`).toLowerCase();
        const from = (t.fromBranchName || "").toLowerCase();
        const item = (t.itemName || t.item || "").toLowerCase();
        if (!tid.includes(q) && !from.includes(q) && !item.includes(q)) return false;
      }
      return true;
    });
  }, [transfers, currentBranch, transferSearch]);

  const pendingReceivedCount = useMemo(() => {
    return receivedTransfers.filter(t => (t.status || "").toLowerCase() === "pending").length;
  }, [receivedTransfers]);

  // Sent Transfers: transfers where FromBranch == currentBranch
  const sentTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (currentBranch?.id && t.fromBranchId !== currentBranch.id) return false;
      if (transferSearch) {
        const q = transferSearch.toLowerCase();
        const tid = (t.transferNumber || `TRF-${t.id}`).toLowerCase();
        const to = (t.toBranchName || "").toLowerCase();
        const item = (t.itemName || t.item || "").toLowerCase();
        if (!tid.includes(q) && !to.includes(q) && !item.includes(q)) return false;
      }
      return true;
    });
  }, [transfers, currentBranch, transferSearch]);

  // Transfer History: all transfers related to current branch
  const historyTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (currentBranch?.id && t.fromBranchId !== currentBranch.id && t.toBranchId !== currentBranch.id) return false;
      if (transferStatusFilter !== "ALL") {
        const s = (t.status || "").toLowerCase();
        if (s !== transferStatusFilter.toLowerCase()) return false;
      }
      if (transferSearch) {
        const q = transferSearch.toLowerCase();
        const tid = (t.transferNumber || `TRF-${t.id}`).toLowerCase();
        const from = (t.fromBranchName || "").toLowerCase();
        const to = (t.toBranchName || "").toLowerCase();
        const item = (t.itemName || t.item || "").toLowerCase();
        if (!tid.includes(q) && !from.includes(q) && !to.includes(q) && !item.includes(q)) return false;
      }
      return true;
    });
  }, [transfers, currentBranch, transferStatusFilter, transferSearch]);

  const activeBranch = user.branchId ? String(user.branchId) : selectedBranch;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const branchParam = activeBranch ? Number(activeBranch) : undefined;
      const [i, t, s, b] = await Promise.all([
        api.getInventoryItems(branchParam),
        api.getInventoryTransactions(branchParam),
        api.getInventorySummary(branchParam),
        api.getBranches()
      ]);
      setItems(i || []);
      setTransactions(t || []);
      setSummary(s || { totalItems: 0, lowStock: 0, outOfStock: 0, stockValueUnits: 0 });
      setBranches(b || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeBranch]);

  function clearMessages() {
    setError("");
    setMessage("");
  }

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        const code = (item.itemCode || `ITM-${item.id}`).toLowerCase();
        const name = (item.name || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !cat.includes(q)) return false;
      }
      if (categoryFilter !== "All" && item.category !== categoryFilter) return false;
      if (statusFilter !== "All") {
        const current = Number(item.currentStock || 0);
        const min = Number(item.minimumStock || 0);
        const reorder = Number(item.reorderLevel || 0);
        const isOut = current <= 0;
        const isLow = !isOut && (item.lowStock || current <= (reorder > 0 ? reorder : min));
        if (statusFilter === "OUT OF STOCK" && !isOut) return false;
        if (statusFilter === "LOW STOCK" && !isLow) return false;
        if (statusFilter === "IN STOCK" && (isOut || isLow)) return false;
      }
      return true;
    });
  }, [items, search, categoryFilter, statusFilter]);

  // Critical Low Stock & Out of Stock Alert Items
  const alertItems = useMemo(() => {
    return items.map(item => {
      const current = Number(item.currentStock || 0);
      const min = Number(item.minimumStock || 0);
      const reorder = Number(item.reorderLevel || 0);
      const minThreshold = reorder > 0 ? reorder : min;
      const isOut = current <= 0;
      const isLow = !isOut && (item.lowStock || current <= minThreshold);
      return {
        ...item,
        current,
        min,
        reorder,
        minThreshold,
        isOut,
        isLow,
        isAlert: isOut || isLow
      };
    }).filter(item => item.isAlert);
  }, [items]);

  const lowStockAlertCount = useMemo(() => alertItems.filter(i => i.isLow).length, [alertItems]);
  const outOfStockAlertCount = useMemo(() => alertItems.filter(i => i.isOut).length, [alertItems]);

  const alertCategories = useMemo(() => {
    const set = new Set();
    alertItems.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ["All", ...Array.from(set)];
  }, [alertItems]);

  const displayedAlerts = useMemo(() => {
    return alertItems.filter(item => {
      if (alertFilter === "LOW" && !item.isLow) return false;
      if (alertFilter === "OUT" && !item.isOut) return false;

      if (alertSearch) {
        const q = alertSearch.toLowerCase();
        const code = (item.itemCode || `ITM-${item.id}`).toLowerCase();
        const name = (item.name || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !cat.includes(q)) return false;
      }

      if (alertCategoryFilter !== "All" && item.category !== alertCategoryFilter) {
        return false;
      }

      return true;
    });
  }, [alertItems, alertFilter, alertSearch, alertCategoryFilter]);

  async function loadVendorsList() {
    setLoadingVendors(true);
    try {
      const v = await api.getVendors();
      const list = Array.isArray(v) ? v.filter(x => x.isActive !== false) : [];
      setVendors(list);
      return list;
    } catch (e) {
      console.error("Failed to load vendors:", e);
      return [];
    } finally {
      setLoadingVendors(false);
    }
  }

  async function handleOpenReorder(item) {
    clearMessages();
    setReorderError("");
    setReorderItem(item);

    const minThreshold = Number(item.reorderLevel > 0 ? item.reorderLevel : item.minimumStock || 0);
    const curStock = Number(item.currentStock || 0);
    const suggested = Math.max(1, Math.ceil((minThreshold * 2) - curStock)) || 10;

    let vList = vendors;
    if (vList.length === 0) {
      vList = await loadVendorsList();
    }

    if (vList.length === 0) {
      try {
        const newV = await api.createVendor({
          name: "Direct Supplier / Local Market",
          contactPerson: "Procurement Desk",
          phone: "9876543210",
          category: "General Groceries",
          address: "Main Wholesale Mandi"
        });
        if (newV && newV.id) {
          vList = [newV];
          setVendors([newV]);
        }
      } catch (e) {
        // pass
      }
    }

    setReorderForm({
      vendorId: vList[0]?.id ? String(vList[0].id) : "",
      quantity: String(suggested),
      rate: item.costPrice ? String(item.costPrice) : "",
      paymentMethod: "",
      invoiceNumber: "",
      notes: `Low stock replenishment for ${item.name} (${item.itemCode || `ITM-${item.id}`})`
    });
    setShowReorderModal(true);
  }

  async function handleCreateReorder(e) {
    e.preventDefault();
    setReorderError("");
    if (!reorderForm.vendorId) {
      setReorderError("Please select a vendor / supplier.");
      return;
    }
    if (!reorderForm.paymentMethod || reorderForm.paymentMethod === "Select Payment Mode") {
      setReorderError("Please select a valid Mode of Payment.");
      return;
    }
    const qty = parseFloat(reorderForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      setReorderError("Reorder quantity must be greater than 0.");
      return;
    }

    setSubmittingReorder(true);
    try {
      const branchIdToUse = reorderItem.branchId || currentBranch?.id || (selectedBranch ? Number(selectedBranch) : user.branchId);
      const payload = {
        branchId: Number(branchIdToUse),
        vendorId: Number(reorderForm.vendorId),
        invoiceNumber: reorderForm.invoiceNumber?.trim() || `PO-${Date.now().toString().slice(-6)}`,
        purchaseDate: new Date().toISOString(),
        status: "Draft",
        notes: `[Mode: ${reorderForm.paymentMethod.trim()}] ${reorderForm.notes || ""}`.trim(),
        paymentMethod: reorderForm.paymentMethod.trim(),
        items: [
          {
            inventoryItemId: Number(reorderItem.id),
            quantity: qty,
            rate: Number(reorderForm.rate || 0),
            unit: reorderItem.unit || "KG"
          }
        ]
      };

      const res = await api.createPurchase(payload);
      setShowReorderModal(false);
      setReorderItem(null);
      setMessage(`Purchase order ${res.purchaseNumber || ""} created successfully with status 'Draft'. Stock will only increase after Goods Receipt (GRN).`);
      await load();
    } catch (err) {
      setReorderError(err.message || "Failed to create purchase reorder.");
    } finally {
      setSubmittingReorder(false);
    }
  }

  async function createItem(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.createInventoryItem({
        branchId: user.branchId ? Number(user.branchId) : Number(itemForm.branchId),
        itemCode: itemForm.itemCode?.trim() || null,
        name: itemForm.name.trim(),
        category: itemForm.category?.trim() || "General",
        unit: itemForm.unit.trim().toUpperCase(),
        minimumStock: Number(itemForm.minimumStock || 0),
        reorderLevel: Number(itemForm.reorderLevel || itemForm.minimumStock || 0),
        maximumStock: Number(itemForm.maximumStock || 0),
        description: itemForm.description?.trim() || null,
        openingStock: Number(itemForm.openingStock || 0),
        reference: itemForm.reference?.trim() || null
      });
      setItemForm({
        branchId: user.branchId ? String(user.branchId) : activeBranch,
        itemCode: "",
        name: "",
        category: "",
        unit: "KG",
        minimumStock: "",
        reorderLevel: "",
        maximumStock: "",
        openingStock: "",
        reference: "",
        description: ""
      });
      setMessage("Inventory item added successfully.");
      setShowItemForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function openEdit(item) {
    clearMessages();
    setEditingItem(item);
    setEditForm({
      itemCode: item.itemCode || "",
      name: item.name || "",
      category: item.category || "General",
      unit: item.unit || "KG",
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
      maximumStock: item.maximumStock != null ? String(item.maximumStock) : "",
      description: item.description || ""
    });
  }

  async function handleUpdateItem(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.updateInventoryItem(editingItem.id, {
        itemCode: editForm.itemCode?.trim() || null,
        name: editForm.name.trim(),
        category: editForm.category?.trim() || "General",
        unit: editForm.unit.trim().toUpperCase(),
        minimumStock: Number(editForm.minimumStock || 0),
        reorderLevel: Number(editForm.reorderLevel || editForm.minimumStock || 0),
        maximumStock: Number(editForm.maximumStock || 0),
        description: editForm.description?.trim() || null
      });
      setMessage(`Updated "${editForm.name}" successfully.`);
      setEditingItem(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteItem(item) {
    if (!window.confirm(`Deactivate inventory item "${item.name}" (${item.itemCode || `ITM-${item.id}`})?`)) return;
    clearMessages();
    try {
      await api.deactivateInventoryItem(item.id);
      setMessage(`Item "${item.name}" deactivated.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function openSpoil(item) {
    clearMessages();
    setSpoilItem(item);
    setSpoilQuantity("");
    setSpoilReason("Expired / Past Best-Before Date");
    setSpoilDisposal("Discarded in Waste / Organic Compost");
    setSpoilNotes("");
  }

  async function handleSpoilSubmit(e) {
    e.preventDefault();
    clearMessages();
    if (!spoilItem) return;
    const qty = Number(spoilQuantity);
    if (!qty || qty <= 0) {
      setError("Please enter a valid spoiled quantity greater than 0.");
      return;
    }
    if (qty > Number(spoilItem.currentStock)) {
      setError(`Spoiled quantity (${qty} ${spoilItem.unit}) exceeds available stock (${spoilItem.currentStock} ${spoilItem.unit}).`);
      return;
    }
    setSubmittingSpoil(true);
    try {
      const res = await api.recordSpoilage({
        inventoryItemId: spoilItem.id,
        quantity: qty,
        reason: spoilReason,
        disposalMethod: spoilDisposal,
        notes: spoilNotes
      });
      setMessage(res?.message || `Spoiled quantity (${qty} ${spoilItem.unit}) recorded and deducted from inventory.`);
      setSpoilItem(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingSpoil(false);
    }
  }

  return (
    <div className="page-grid">
      {/* Central Inventory Navigation Tabs */}
      <div className="panel" style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "10px 16px", alignItems: "center", marginBottom: "4px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className={inventoryTab === "inventory" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => { setInventoryTab("inventory"); clearMessages(); }}
            style={{ fontSize: "13px", fontWeight: inventoryTab === "inventory" ? "700" : "600", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Package size={16} /> Central Inventory
          </button>
          <button
            type="button"
            className={inventoryTab === "transfers" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => { setInventoryTab("transfers"); clearMessages(); loadTransfers(); }}
            style={{ fontSize: "13px", fontWeight: inventoryTab === "transfers" ? "700" : "600", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <ArrowLeftRight size={16} /> Inventory Transfer
          </button>
          <button
            type="button"
            className={inventoryTab === "alerts" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => { setInventoryTab("alerts"); clearMessages(); }}
            style={{ fontSize: "13px", fontWeight: inventoryTab === "alerts" ? "700" : "600", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <AlertTriangle size={16} /> Low Stock & Out of Stock
            {alertItems.length > 0 && (
              <span style={{
                background: inventoryTab === "alerts" ? "var(--brand-gold, #c99824)" : "var(--status-inactive-dot, #dc2626)",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "11px",
                fontWeight: 700,
                marginLeft: "4px"
              }}>
                {alertItems.length}
              </span>
            )}
          </button>
        </div>
        <button className="secondary-btn compact" onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {inventoryTab === "inventory" && (
        <>
          {isOrgAdmin && (
            <div className="branch-filter panel">
          <div>
            <span className="eyebrow">BRANCH SCOPE</span>
            <strong>Select inventory branch</strong>
          </div>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">All branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">✓ {message}</div>}

      <div className="inventory-stat-grid">
        <div className="stat-card inventory-stat">
          <span>Total items</span>
          <strong>{summary.totalItems || items.length}</strong>
          <small>Active inventory items</small>
        </div>
        <div className="stat-card inventory-stat">
          <span>Low stock</span>
          <strong style={{ color: "var(--status-warning-dot)" }}>
            {items.filter(i => Number(i.currentStock || 0) > 0 && (i.lowStock || Number(i.currentStock) <= (i.reorderLevel > 0 ? i.reorderLevel : i.minimumStock))).length}
          </strong>
          <small>At or below reorder level</small>
        </div>
        <div className="stat-card inventory-stat">
          <span>Out of stock</span>
          <strong style={{ color: "var(--status-inactive-dot)" }}>
            {items.filter(i => Number(i.currentStock || 0) <= 0).length}
          </strong>
          <small>Items with 0 quantity</small>
        </div>
        <div className="stat-card inventory-stat">
          <span>Total quantity</span>
          <strong>{Number(summary.stockValueUnits || 0).toFixed(2)}</strong>
          <small>Across selected scope</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", padding: "12px 18px" }}>
        <div className="filter-input-group" style={{ flex: "1 1 240px", minWidth: "200px" }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by Item Code, Item Name, or Category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Category:</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)" }}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Status:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)" }}>
            <option value="All">All Statuses</option>
            <option value="IN STOCK">In Stock</option>
            <option value="LOW STOCK">Low Stock</option>
            <option value="OUT OF STOCK">Out of Stock</option>
          </select>
        </div>

        {(search || categoryFilter !== "All" || statusFilter !== "All") && (
          <button
            className="secondary-btn compact"
            onClick={() => { setSearch(""); setCategoryFilter("All"); setStatusFilter("All"); }}
            style={{ fontSize: "12px" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {showItemForm && canManageItems && (
        <div className="panel form-panel">
          <div className="panel-head"><div><span className="eyebrow">CREATE</span><h3>Add inventory item</h3></div><Package size={20} /></div>
          <form className="form-grid" onSubmit={createItem}>
            {!user.branchId && (
              <label className="field">
                <span>Branch *</span>
                <select required value={itemForm.branchId} onChange={e => setItemForm({ ...itemForm, branchId: e.target.value })}>
                  <option value="">Select branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            <Field label="Item code" value={itemForm.itemCode} onChange={e => setItemForm({ ...itemForm, itemCode: e.target.value })} placeholder="e.g. ITM-1001 (auto if empty)" />
            <Field label="Item name *" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Chicken" />
            <Field label="Category" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} placeholder="Meat" />
            <label className="field">
              <span>Unit *</span>
              <select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}>
                <option>KG</option><option>G</option><option>L</option><option>ML</option><option>PCS</option><option>BOX</option><option>PACK</option>
              </select>
            </label>
            <Field label="Minimum stock" type="number" min="0" step="0.001" value={itemForm.minimumStock} onChange={e => setItemForm({ ...itemForm, minimumStock: e.target.value })} placeholder="10" />
            <Field label="Reorder level" type="number" min="0" step="0.001" value={itemForm.reorderLevel} onChange={e => setItemForm({ ...itemForm, reorderLevel: e.target.value })} placeholder="15" />
            <Field label="Maximum stock" type="number" min="0" step="0.001" value={itemForm.maximumStock} onChange={e => setItemForm({ ...itemForm, maximumStock: e.target.value })} placeholder="100" />
            <Field label="Opening stock" type="number" min="0" step="0.001" value={itemForm.openingStock} onChange={e => setItemForm({ ...itemForm, openingStock: e.target.value })} placeholder="50" />
            <Field label="Reference" value={itemForm.reference} onChange={e => setItemForm({ ...itemForm, reference: e.target.value })} placeholder="Opening count / invoice no." />
            <Field label="Description" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Optional description or notes" />
            <div className="form-action" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="secondary-btn" onClick={() => setShowItemForm(false)}>Cancel</button>
              <button className="primary-btn compact">Save item <ChevronRight size={17} /></button>
            </div>
          </form>
        </div>
      )}



      {/* Central Inventory Items Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CURRENT STOCK</span>
            <h3>Central Inventory Items ({filteredItems.length})</h3>
          </div>
          <Package size={20} />
        </div>
        {loading ? (
          <div className="loading">Loading central inventory...</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-row">
            {items.length === 0
              ? "No inventory items in this branch yet. Use Add item to create the first item."
              : "No items match your search or filter criteria."}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Unit</th>
                  <th>Minimum</th>
                  <th>Reorder Level</th>
                  <th>Maximum</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((i) => {
                  const current = Number(i.currentStock || 0);
                  const min = Number(i.minimumStock || 0);
                  const reorder = Number(i.reorderLevel || 0);
                  const max = Number(i.maximumStock || 0);
                  const isOut = current <= 0;
                  const isLow = !isOut && (i.lowStock || current <= (reorder > 0 ? reorder : min));
                  const statusClass = isOut
                    ? "status-out-of-stock"
                    : isLow
                    ? "status-low-stock"
                    : "status-in-stock";
                  const statusLabel =
                    i.stockStatus || (isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK");

                  return (
                    <tr key={i.id}>
                      <td>
                        <code className="code-chip">{i.itemCode || `ITM-${i.id}`}</code>
                      </td>
                      <td>
                        <strong>{i.name}</strong>
                        {i.branchName && !user.branchId && (
                          <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                            {i.branchName}
                          </span>
                        )}
                        {i.description && (
                          <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                            {i.description}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="role-chip">{i.category || "General"}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "14px" }}>
                          {current.toFixed(3)}
                        </strong>
                      </td>
                      <td>{i.unit}</td>
                      <td>{min.toFixed(3)}</td>
                      <td>{reorder.toFixed(3)}</td>
                      <td>{max.toFixed(3)}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        {i.updatedAt
                          ? new Date(i.updatedAt).toLocaleString()
                          : i.createdAt
                          ? new Date(i.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {canManageItems && (
                            <button
                              className="secondary-btn compact"
                              onClick={() => openEdit(i)}
                              title="Edit item"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          )}
                          {canTransact && (
                            <button
                              className="secondary-btn compact"
                              style={{
                                color: "#dc2626",
                                borderColor: "#fca5a5",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                              onClick={() => openSpoil(i)}
                              title="Record damaged or spoiled food"
                              disabled={current <= 0}
                            >
                              <AlertOctagon size={13} /> Spoil
                            </button>
                          )}
                          {canManageItems && (
                            <button
                              className="danger-btn compact"
                              onClick={() => handleDeleteItem(i)}
                              title="Deactivate item"
                              style={{ padding: "4px 7px" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">EDIT INVENTORY</span>
                <h3>Edit Item: {editingItem.name}</h3>
              </div>
              <button className="icon-btn" onClick={() => setEditingItem(null)}><X size={18} /></button>
            </div>
            <form className="form-grid" style={{ padding: "24px 28px" }} onSubmit={handleUpdateItem}>
              <Field label="Item code" value={editForm.itemCode} onChange={e => setEditForm({ ...editForm, itemCode: e.target.value })} placeholder="e.g. ITM-1001" />
              <Field label="Item name *" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Chicken" />
              <Field label="Category" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} placeholder="Meat" />
              <label className="field">
                <span>Unit</span>
                <select value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}>
                  <option>KG</option><option>G</option><option>L</option><option>ML</option><option>PCS</option><option>BOX</option><option>PACK</option>
                </select>
              </label>
              <Field label="Minimum stock" type="number" min="0" step="0.001" value={editForm.minimumStock} onChange={e => setEditForm({ ...editForm, minimumStock: e.target.value })} placeholder="10" />
              <Field label="Reorder level" type="number" min="0" step="0.001" value={editForm.reorderLevel} onChange={e => setEditForm({ ...editForm, reorderLevel: e.target.value })} placeholder="15" />
              <Field label="Maximum stock" type="number" min="0" step="0.001" value={editForm.maximumStock} onChange={e => setEditForm({ ...editForm, maximumStock: e.target.value })} placeholder="100" />
              <Field label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional description" />
              <div className="form-action" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="secondary-btn" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="primary-btn compact">Save changes <Check size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spoil Food / Wastage Modal */}
      {spoilItem && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--status-inactive-text)" }}>FOOD LOSS &amp; STOCK REDUCTION</span>
                <h3>Record Spoil Food / Wastage</h3>
              </div>
              <button className="icon-btn" onClick={() => setSpoilItem(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSpoilSubmit} className="form-stack" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--status-inactive-bg)", border: "1px solid var(--status-inactive-border)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "var(--status-inactive-text)" }}>
                <strong>Stock Reduction Notice:</strong> Recording spoiled food will immediately deduct the entered quantity from available inventory stock and record a <code>SPOILAGE</code> audit transaction.
              </div>

              <div>
                <label className="field">
                  <span>Selected Item</span>
                  <input type="text" readOnly value={`${spoilItem.name} (${spoilItem.itemCode || `ITM-${spoilItem.id}`}) — Available: ${Number(spoilItem.currentStock).toFixed(3)} ${spoilItem.unit}`} style={{ background: "var(--bg-subtle)" }} />
                </label>
              </div>

              <label className="field">
                <span>Spoiled Quantity ({spoilItem.unit}) *</span>
                <input
                  type="number"
                  min="0.001"
                  max={Number(spoilItem.currentStock)}
                  step="0.001"
                  required
                  placeholder={`Available: ${Number(spoilItem.currentStock).toFixed(3)} ${spoilItem.unit}`}
                  value={spoilQuantity}
                  onChange={(e) => setSpoilQuantity(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Spoilage Reason *</span>
                <select value={spoilReason} onChange={(e) => setSpoilReason(e.target.value)}>
                  <option value="Expired / Past Best-Before Date">Expired / Past Best-Before Date</option>
                  <option value="Physical / Quality Deterioration">Physical / Quality Deterioration</option>
                  <option value="Cold Storage / Power Breakdown">Cold Storage / Power Breakdown</option>
                  <option value="Handling / Kitchen Floor Contamination">Handling / Kitchen Floor Contamination</option>
                  <option value="Insect / Pest Infestation Damage">Insect / Pest Infestation Damage</option>
                  <option value="Overcooked / Burnt Batch Wastage">Overcooked / Burnt Batch Wastage</option>
                  <option value="Other / Supplier Packaging Defect">Other / Supplier Packaging Defect</option>
                </select>
              </label>

              <label className="field">
                <span>Disposal Method *</span>
                <select value={spoilDisposal} onChange={(e) => setSpoilDisposal(e.target.value)}>
                  <option value="Discarded in Waste / Organic Compost">Discarded in Waste / Organic Compost</option>
                  <option value="Returned to Supplier / Vendor Credit">Returned to Supplier / Vendor Credit</option>
                  <option value="Destroyed under Supervisor Oversight">Destroyed under Supervisor Oversight</option>
                  <option value="Repurposed for Animal Feed / Bio-gas">Repurposed for Animal Feed / Bio-gas</option>
                </select>
              </label>

              <Field label="Notes / Description" value={spoilNotes} onChange={e => setSpoilNotes(e.target.value)} placeholder="Supervisor explanation or batch details" />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="secondary-btn" onClick={() => setSpoilItem(null)}>Cancel</button>
                <button type="submit" className="danger-btn compact" disabled={submittingSpoil}>
                  {submittingSpoil ? "Deducting Stock..." : "Confirm & Reduce Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </>
      )}

      {inventoryTab === "transfers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Bar */}
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <span className="eyebrow">INTERNAL STOCK LOGISTICS</span>
              <h2 style={{ margin: "2px 0 4px 0", fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
                INVENTORY TRANSFER
              </h2>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Internal branch-to-branch stock transfers • Logged-in Branch: <strong style={{ color: "var(--brand-gold, #c99824)" }}>{currentBranch?.name || "Main Branch"}</strong>
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="secondary-btn compact"
                onClick={loadTransfers}
                disabled={transfersLoading}
                style={{ fontSize: "12px" }}
              >
                <RefreshCw size={15} className={transfersLoading ? "spin" : ""} /> Refresh
              </button>
              {canCreateTransfer && (
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={openNewTransferModal}
                  style={{ fontSize: "12px", fontWeight: 700 }}
                >
                  <Plus size={15} /> Create Transfer
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {transferActionError && <div className="error-box">{transferActionError}</div>}
          {transferActionSuccess && <div className="success-box">✓ {transferActionSuccess}</div>}

          {/* Navigation Sub-Tabs Bar (Received / Sent / History) */}
          <div className="panel" style={{ padding: "12px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={transferSubTab === "received" ? "primary-btn compact" : "secondary-btn compact"}
                  onClick={() => setTransferSubTab("received")}
                  style={{ fontSize: "13px", fontWeight: transferSubTab === "received" ? 700 : 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <ArrowDownLeft size={16} /> Received Transfers
                  {pendingReceivedCount > 0 && (
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 800, padding: "1px 7px", borderRadius: "10px", marginLeft: "4px" }}>
                      {pendingReceivedCount} Pending
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={transferSubTab === "sent" ? "primary-btn compact" : "secondary-btn compact"}
                  onClick={() => setTransferSubTab("sent")}
                  style={{ fontSize: "13px", fontWeight: transferSubTab === "sent" ? 700 : 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <ArrowUpRight size={16} /> Sent Transfers
                  {sentTransfers.length > 0 && (
                    <span style={{ background: "rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px", marginLeft: "4px" }}>
                      {sentTransfers.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={transferSubTab === "history" ? "primary-btn compact" : "secondary-btn compact"}
                  onClick={() => setTransferSubTab("history")}
                  style={{ fontSize: "13px", fontWeight: transferSubTab === "history" ? 700 : 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <History size={16} /> Transfer History
                  {historyTransfers.length > 0 && (
                    <span style={{ background: "rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px", marginLeft: "4px" }}>
                      {historyTransfers.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search & Filter */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div className="filter-input-group" style={{ minWidth: "220px" }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search transfer ID, item, or branch..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    style={{ fontSize: "12px", padding: "6px 8px 6px 30px" }}
                  />
                </div>
                {transferSubTab === "history" && (
                  <select
                    value={transferStatusFilter}
                    onChange={(e) => setTransferStatusFilter(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", fontSize: "12px" }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: RECEIVED TRANSFERS (Section 5 & 11)                                */}
          {/* ========================================================================= */}
          {transferSubTab === "received" && (
            <div className="panel" style={{ padding: "18px 20px" }}>
              <div className="panel-head" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="eyebrow" style={{ color: "var(--accent-emerald, #059669)" }}>INCOMING STOCK</span>
                  <h3 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "800" }}>Received Transfers</h3>
                  <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    Transfers sent to {currentBranch?.name || "this branch"}. Click <strong>Receive</strong> to add stock to your branch inventory.
                  </small>
                </div>
                <span className="role-chip" style={{ fontSize: "11px", fontWeight: 700 }}>
                  {receivedTransfers.length} Incoming Transfers
                </span>
              </div>

              {transfersLoading ? (
                <div style={{ textAlign: "center", padding: "36px", color: "var(--text-muted)" }}>
                  <RefreshCw size={20} className="spin" style={{ display: "block", margin: "0 auto 8px" }} />
                  Loading received transfers...
                </div>
              ) : receivedTransfers.length === 0 ? (
                <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  <ArrowDownLeft size={28} style={{ opacity: 0.35, display: "block", margin: "0 auto 8px" }} />
                  No received transfers found for this branch.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transfer ID</th>
                        <th>From Branch</th>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Quantity</th>
                        <th>Unit</th>
                        <th>Transferred At</th>
                        <th>Transferred By</th>
                        <th>Received At</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivedTransfers.map((trf) => {
                        const isPending = (trf.status || "").toLowerCase() === "pending";
                        const isReceived = (trf.status || "").toLowerCase() === "received";

                        return (
                          <tr key={trf.id}>
                            <td>
                              <strong style={{ color: "var(--brand-gold, #c99824)", fontSize: "13px" }}>
                                {trf.transferNumber || `TRF-${trf.id}`}
                              </strong>
                              {trf.remarks && (
                                <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                  {trf.remarks}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {trf.fromBranchName || "Sender Branch"}
                              </span>
                            </td>
                            <td>
                              <strong>{trf.itemName || trf.item || "Item"}</strong>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {Number(trf.quantity || trf.transferQuantity || 0).toFixed(2)}
                            </td>
                            <td>
                              <span className="role-chip" style={{ fontSize: "11px" }}>
                                {trf.unit || "KG"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                                {formatTransferDateTime(trf.transferredAt || trf.transferDate || trf.createdAt)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {trf.transferredBy || "Staff"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", whiteSpace: "nowrap", color: trf.receivedAt ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {trf.receivedAt ? formatTransferDateTime(trf.receivedAt) : "—"}
                              </span>
                            </td>
                            <td>
                              {getStatusBadge(trf.status)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                {isPending && canReceiveTransfer ? (
                                  <button
                                    type="button"
                                    className="primary-btn compact"
                                    onClick={() => setConfirmReceiveTransfer(trf)}
                                    disabled={receivingTransferId === trf.id}
                                    style={{
                                      background: "var(--accent-emerald, #059669)",
                                      borderColor: "var(--accent-emerald, #059669)",
                                      fontSize: "12px",
                                      padding: "5px 12px",
                                      fontWeight: 700
                                    }}
                                    title="Click to receive stock into your branch inventory"
                                  >
                                    <CheckCircle2 size={13} /> Receive
                                  </button>
                                ) : isReceived ? (
                                  <span style={{ fontSize: "12px", color: "var(--accent-emerald, #059669)", fontWeight: 700 }}>
                                    ✓ Received
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                                )}
                                <button
                                  type="button"
                                  className="secondary-btn compact"
                                  onClick={() => handleViewDetails(trf)}
                                  style={{ padding: "4px 8px" }}
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SENT TRANSFERS (Section 10)                                        */}
          {/* ========================================================================= */}
          {transferSubTab === "sent" && (
            <div className="panel" style={{ padding: "18px 20px" }}>
              <div className="panel-head" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>OUTGOING STOCK</span>
                  <h3 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "800" }}>Sent Transfers</h3>
                  <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    Transfers sent from {currentBranch?.name || "this branch"}. Stock was deducted upon transfer creation.
                  </small>
                </div>
                <span className="role-chip" style={{ fontSize: "11px", fontWeight: 700 }}>
                  {sentTransfers.length} Sent Transfers
                </span>
              </div>

              {transfersLoading ? (
                <div style={{ textAlign: "center", padding: "36px", color: "var(--text-muted)" }}>
                  <RefreshCw size={20} className="spin" style={{ display: "block", margin: "0 auto 8px" }} />
                  Loading sent transfers...
                </div>
              ) : sentTransfers.length === 0 ? (
                <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  <ArrowUpRight size={28} style={{ opacity: 0.35, display: "block", margin: "0 auto 8px" }} />
                  No sent transfers found from this branch.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transfer ID</th>
                        <th>To Branch</th>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Quantity</th>
                        <th>Unit</th>
                        <th>Transferred At</th>
                        <th>Received At</th>
                        <th>Transferred By</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentTransfers.map((trf) => {
                        const isPending = (trf.status || "").toLowerCase() === "pending";

                        return (
                          <tr key={trf.id}>
                            <td>
                              <strong style={{ color: "var(--brand-gold, #c99824)", fontSize: "13px" }}>
                                {trf.transferNumber || `TRF-${trf.id}`}
                              </strong>
                              {trf.remarks && (
                                <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                  {trf.remarks}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {trf.toBranchName || "Destination Branch"}
                              </span>
                            </td>
                            <td>
                              <strong>{trf.itemName || trf.item || "Item"}</strong>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {Number(trf.quantity || trf.transferQuantity || 0).toFixed(2)}
                            </td>
                            <td>
                              <span className="role-chip" style={{ fontSize: "11px" }}>
                                {trf.unit || "KG"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                                {formatTransferDateTime(trf.transferredAt || trf.transferDate || trf.createdAt)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", whiteSpace: "nowrap", color: trf.receivedAt ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {trf.receivedAt ? formatTransferDateTime(trf.receivedAt) : "—"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {trf.transferredBy || "Staff"}
                              </span>
                            </td>
                            <td>
                              {getStatusBadge(trf.status)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="secondary-btn compact"
                                  onClick={() => handleViewDetails(trf)}
                                  style={{ padding: "4px 8px" }}
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                </button>
                                {isPending && (
                                  <button
                                    type="button"
                                    className="danger-btn compact"
                                    onClick={() => handleCancelTransfer(trf.id)}
                                    style={{ padding: "4px 8px", fontSize: "11px" }}
                                    title="Cancel transfer and restore sender stock"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TRANSFER HISTORY (Section 9)                                       */}
          {/* ========================================================================= */}
          {transferSubTab === "history" && (
            <div className="panel" style={{ padding: "18px 20px" }}>
              <div className="panel-head" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="eyebrow">AUDIT LOG</span>
                  <h3 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "800" }}>Transfer History</h3>
                  <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    Complete audit trail of all inventory transfers for {currentBranch?.name || "this branch"}.
                  </small>
                </div>
                <span className="role-chip" style={{ fontSize: "11px", fontWeight: 700 }}>
                  {historyTransfers.length} Total Records
                </span>
              </div>

              {transfersLoading ? (
                <div style={{ textAlign: "center", padding: "36px", color: "var(--text-muted)" }}>
                  <RefreshCw size={20} className="spin" style={{ display: "block", margin: "0 auto 8px" }} />
                  Loading transfer history...
                </div>
              ) : historyTransfers.length === 0 ? (
                <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  <History size={28} style={{ opacity: 0.35, display: "block", margin: "0 auto 8px" }} />
                  No transfer history found matching your filters.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transfer ID</th>
                        <th>From Branch</th>
                        <th>To Branch</th>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Qty</th>
                        <th>Unit</th>
                        <th>Transferred At</th>
                        <th>Received At</th>
                        <th>Transferred By</th>
                        <th>Received By</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyTransfers.map((trf) => {
                        const isPending = (trf.status || "").toLowerCase() === "pending";
                        const isDest = currentBranch?.id && trf.toBranchId === currentBranch.id;

                        return (
                          <tr key={trf.id}>
                            <td>
                              <strong style={{ color: "var(--brand-gold, #c99824)", fontSize: "13px" }}>
                                {trf.transferNumber || `TRF-${trf.id}`}
                              </strong>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{trf.fromBranchName || "Sender"}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{trf.toBranchName || "Destination"}</span>
                            </td>
                            <td>
                              <strong>{trf.itemName || trf.item || "Item"}</strong>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {Number(trf.quantity || trf.transferQuantity || 0).toFixed(2)}
                            </td>
                            <td>
                              <span className="role-chip" style={{ fontSize: "11px" }}>
                                {trf.unit || "KG"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                                {formatTransferDateTime(trf.transferredAt || trf.transferDate || trf.createdAt)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", whiteSpace: "nowrap", color: trf.receivedAt ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {trf.receivedAt ? formatTransferDateTime(trf.receivedAt) : "—"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {trf.transferredBy || "Staff"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: trf.receivedBy ? "var(--text-secondary)" : "var(--text-muted)" }}>
                                {trf.receivedBy || "—"}
                              </span>
                            </td>
                            <td>
                              {getStatusBadge(trf.status)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                {isPending && isDest && canReceiveTransfer && (
                                  <button
                                    type="button"
                                    className="primary-btn compact"
                                    onClick={() => setConfirmReceiveTransfer(trf)}
                                    style={{ background: "var(--accent-emerald, #059669)", borderColor: "var(--accent-emerald, #059669)", fontSize: "11px", padding: "4px 8px", fontWeight: 700 }}
                                    title="Receive stock"
                                  >
                                    <CheckCircle2 size={12} /> Receive
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="secondary-btn compact"
                                  onClick={() => handleViewDetails(trf)}
                                  style={{ padding: "4px 8px" }}
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LOW STOCK & OUT OF STOCK DEDICATED ALERTS VIEW                    */}
      {/* ========================================================================= */}
      {inventoryTab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Bar */}
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>CRITICAL STOCK MONITOR</span>
              <h2 style={{ margin: "2px 0 4px 0", fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
                LOW STOCK & OUT OF STOCK
              </h2>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Real-time stock alerts automatically computed against minimum stock thresholds & zero balances
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="secondary-btn compact"
                onClick={load}
                disabled={loading}
                style={{ fontSize: "12px" }}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* Branch Filter for Multi-Branch (Org Admin / Super Admin) */}
          {isOrgAdmin && (
            <div className="branch-filter panel">
              <div>
                <span className="eyebrow">BRANCH SCOPE</span>
                <strong>Select inventory branch</strong>
              </div>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                <option value="">All branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
          {message && <div className="success-box">✓ {message}</div>}

          {/* Compact Summary Cards for Alerts */}
          <div className="inventory-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div
              className={`stat-card inventory-stat ${alertFilter === "ALL" ? "active-stat-card" : ""}`}
              style={{ borderLeft: "3px solid var(--brand-gold, #c99824)", cursor: "pointer" }}
              onClick={() => setAlertFilter("ALL")}
              title="Filter by All Alerts"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Total Alerts</span>
                <AlertTriangle size={17} style={{ color: "var(--brand-gold, #c99824)" }} />
              </div>
              <strong style={{ color: "var(--text-primary)" }}>{alertItems.length}</strong>
              <small>Items requiring replenishment</small>
            </div>

            <div
              className={`stat-card inventory-stat ${alertFilter === "LOW" ? "active-stat-card" : ""}`}
              style={{ borderLeft: "3px solid var(--status-warning-dot, #d97706)", cursor: "pointer" }}
              onClick={() => setAlertFilter("LOW")}
              title="Filter by Low Stock"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Low Stock</span>
                <AlertCircle size={17} style={{ color: "var(--status-warning-dot, #d97706)" }} />
              </div>
              <strong style={{ color: "var(--status-warning-dot, #d97706)" }}>{lowStockAlertCount}</strong>
              <small>At or below minimum stock level</small>
            </div>

            <div
              className={`stat-card inventory-stat ${alertFilter === "OUT" ? "active-stat-card" : ""}`}
              style={{ borderLeft: "3px solid var(--status-inactive-dot, #dc2626)", cursor: "pointer" }}
              onClick={() => setAlertFilter("OUT")}
              title="Filter by Out of Stock"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Out of Stock</span>
                <XCircle size={17} style={{ color: "var(--status-inactive-dot, #dc2626)" }} />
              </div>
              <strong style={{ color: "var(--status-inactive-dot, #dc2626)" }}>{outOfStockAlertCount}</strong>
              <small>Depleted or zero stock</small>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="panel" style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
            {/* Status Filter Pills: All Alerts, Low Stock, Out of Stock */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span className="eyebrow" style={{ margin: 0 }}>ALERT FILTER:</span>
              <button
                type="button"
                className={`secondary-btn compact ${alertFilter === "ALL" ? "active" : ""}`}
                onClick={() => setAlertFilter("ALL")}
                style={{ fontWeight: alertFilter === "ALL" ? 700 : 500 }}
              >
                All Alerts ({alertItems.length})
              </button>
              <button
                type="button"
                className={`secondary-btn compact ${alertFilter === "LOW" ? "active" : ""}`}
                onClick={() => setAlertFilter("LOW")}
                style={{
                  fontWeight: alertFilter === "LOW" ? 700 : 500,
                  borderColor: alertFilter === "LOW" ? "var(--status-warning-dot, #d97706)" : undefined,
                  color: alertFilter === "LOW" ? "var(--status-warning-dot, #d97706)" : undefined
                }}
              >
                ⚠️ Low Stock ({lowStockAlertCount})
              </button>
              <button
                type="button"
                className={`secondary-btn compact ${alertFilter === "OUT" ? "active" : ""}`}
                onClick={() => setAlertFilter("OUT")}
                style={{
                  fontWeight: alertFilter === "OUT" ? 700 : 500,
                  borderColor: alertFilter === "OUT" ? "var(--status-inactive-dot, #dc2626)" : undefined,
                  color: alertFilter === "OUT" ? "var(--status-inactive-dot, #dc2626)" : undefined
                }}
              >
                🛑 Out of Stock ({outOfStockAlertCount})
              </button>
            </div>

            {/* Category Filter & Search Box */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              {alertCategories.length > 2 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="eyebrow" style={{ margin: 0 }}>CATEGORY:</span>
                  <select
                    value={alertCategoryFilter}
                    onChange={(e) => setAlertCategoryFilter(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      fontWeight: 600
                    }}
                  >
                    {alertCategories.map((c) => (
                      <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ position: "relative", minWidth: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search code, item, category..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 32px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: "12.5px"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="table-wrap panel" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>Item Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Current Stock</th>
                  <th style={{ textAlign: "center" }}>Unit</th>
                  <th style={{ textAlign: "right" }}>Minimum Stock Level</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center", width: "130px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedAlerts.map((item) => (
                  <tr key={item.id} style={{ background: item.isOut ? "rgba(239, 68, 68, 0.04)" : "rgba(245, 158, 11, 0.03)" }}>
                    <td>
                      <code>{item.itemCode || `ITM-${item.id}`}</code>
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                      {item.branchName && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.branchName}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: "var(--bg-surface-subtle)", border: "1px solid var(--border-default)", padding: "2px 8px", borderRadius: "4px", fontSize: "11.5px" }}>
                        {item.category || "General"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong style={{
                        fontSize: "14px",
                        color: item.isOut ? "var(--status-inactive-dot, #dc2626)" : "var(--status-warning-dot, #d97706)"
                      }}>
                        {item.current.toFixed(2)}
                      </strong>
                    </td>
                    <td style={{ textAlign: "center", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {item.unit || "KG"}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-primary)", fontWeight: 600 }}>
                      {Number(item.minimumStock || item.minThreshold || 0).toFixed(2)} {item.unit || "KG"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.isOut ? (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 9px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#dc2626",
                          border: "1px solid rgba(239, 68, 68, 0.25)"
                        }}>
                          <XCircle size={12} /> Out of Stock
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 9px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "rgba(245, 158, 11, 0.12)",
                          color: "#b45309",
                          border: "1px solid rgba(245, 158, 11, 0.25)"
                        }}>
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="primary-btn compact"
                        onClick={() => handleOpenReorder(item)}
                        style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px" }}
                        title="Create Purchase Order (Reorder)"
                      >
                        <ShoppingCart size={13} /> Reorder
                      </button>
                    </td>
                  </tr>
                ))}

                {displayedAlerts.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-row" style={{ padding: "36px 20px", textAlign: "center" }}>
                        {alertItems.length === 0 ? (
                          <div style={{ color: "var(--accent-emerald, #15803d)" }}>
                            <CheckCircle2 size={34} style={{ margin: "0 auto 8px auto", display: "block" }} />
                            <strong style={{ fontSize: "15px" }}>All inventory items are currently at healthy stock levels!</strong>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                              No items are below minimum stock or depleted in this scope.
                            </div>
                          </div>
                        ) : (
                          <div>
                            <AlertCircle size={28} style={{ margin: "0 auto 8px auto", display: "block", color: "var(--text-muted)" }} />
                            No inventory items match the "{alertFilter === "LOW" ? "Low Stock" : alertFilter === "OUT" ? "Out of Stock" : "All Alerts"}" filter.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE INVENTORY TRANSFER (Requirements 1, 2, 3)                 */}
      {/* ========================================================================= */}
      {showNewTransferModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-card" style={{ maxWidth: "560px", width: "95vw" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>INTERNAL INVENTORY TRANSFER</span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "18px" }}>Create Inventory Transfer</h3>
                <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  Internal branch-to-branch stock movement. Not a sale or purchase.
                </small>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowNewTransferModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferStock} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {transferActionError && <div className="error-box">{transferActionError}</div>}

              {/* From Branch (Locked to logged-in branch) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  From Branch:
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentBranch?.name ? `${currentBranch.name} (${currentBranch.code || "Branch"})` : "Main Branch"}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-default)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    cursor: "not-allowed",
                    fontSize: "13px"
                  }}
                />
                <small style={{ color: "var(--text-muted)", fontSize: "11px", display: "block", marginTop: "3px" }}>
                  Stock will be transferred from your currently logged-in branch.
                </small>
              </div>

              {/* To Branch (Dropdown of all other active branches) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  To Branch: <span style={{ color: "var(--accent-rose, #dc2626)" }}>*</span>
                </label>
                <select
                  required
                  value={newTransferForm.toBranchId}
                  onChange={(e) => setNewTransferForm({ ...newTransferForm, toBranchId: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "13px" }}
                >
                  <option value="">Select Destination Branch ▼</option>
                  {destinationBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code || b.city || "Branch"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Inventory Item (Available in current branch) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Inventory Item: <span style={{ color: "var(--accent-rose, #dc2626)" }}>*</span>
                </label>
                <select
                  required
                  value={newTransferForm.itemId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const itm = senderBranchItems.find(x => String(x.id) === String(selId));
                    setNewTransferForm(prev => ({
                      ...prev,
                      itemId: selId,
                      unit: itm?.unit || "KG"
                    }));
                  }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "13px" }}
                >
                  <option value="">Select Inventory Item ▼</option>
                  {senderBranchItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} {it.itemCode ? `[${it.itemCode}]` : ""} — Stock: {Number(it.currentStock || 0).toFixed(2)} {it.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Stock Prominent Display */}
              {selectedTransferItem && (
                <div
                  style={{
                    background: Number(selectedTransferItem.currentStock || 0) > 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    border: `1px solid ${Number(selectedTransferItem.currentStock || 0) > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Package size={18} style={{ color: Number(selectedTransferItem.currentStock || 0) > 0 ? "var(--accent-emerald, #059669)" : "var(--accent-rose, #dc2626)" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      Available Stock in {currentBranch?.name || "Sender Branch"}:
                    </span>
                  </div>
                  <strong style={{ fontSize: "15px", color: Number(selectedTransferItem.currentStock || 0) > 0 ? "var(--accent-emerald, #059669)" : "var(--accent-rose, #dc2626)" }}>
                    {Number(selectedTransferItem.currentStock || 0).toFixed(2)} {selectedTransferItem.unit}
                  </strong>
                </div>
              )}

              {/* Transfer Quantity and Unit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Transfer Quantity: <span style={{ color: "var(--accent-rose, #dc2626)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    placeholder={selectedTransferItem ? `e.g. 25 (Max: ${Number(selectedTransferItem.currentStock || 0).toFixed(2)})` : "Enter quantity"}
                    value={newTransferForm.quantity}
                    onChange={(e) => setNewTransferForm({ ...newTransferForm, quantity: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${transferQuantityError ? "var(--accent-rose, #dc2626)" : "var(--border-default)"}`,
                      fontSize: "13px"
                    }}
                  />
                  {transferQuantityError && (
                    <span style={{ display: "block", fontSize: "11.5px", color: "var(--accent-rose, #dc2626)", marginTop: "4px", fontWeight: 600 }}>
                      ⚠️ {transferQuantityError}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Unit:
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={selectedTransferItem?.unit || newTransferForm.unit || "KG"}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface-subtle)",
                      border: "1px solid var(--border-default)",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      cursor: "not-allowed"
                    }}
                  />
                </div>
              </div>

              {/* Remarks (Optional) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Remarks (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Internal stock transfer for weekly demand"
                  value={newTransferForm.remarks}
                  onChange={(e) => setNewTransferForm({ ...newTransferForm, remarks: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "13px" }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowNewTransferModal(false)}
                  disabled={submittingTransfer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn compact"
                  disabled={
                    submittingTransfer ||
                    !!transferQuantityError ||
                    !newTransferForm.toBranchId ||
                    !newTransferForm.itemId ||
                    !newTransferForm.quantity
                  }
                  style={{ padding: "9px 22px", fontWeight: 700, fontSize: "13px" }}
                >
                  {submittingTransfer ? "Transferring..." : "Transfer Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM STOCK RECEIPT (Requirements 6, 7, 14)                    */}
      {/* ========================================================================= */}
      {confirmReceiveTransfer && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div className="modal-card" style={{ maxWidth: "520px", width: "92vw" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={20} style={{ color: "var(--accent-emerald, #059669)" }} />
                <h3 style={{ margin: 0, fontSize: "17px" }}>Receive Inventory Transfer</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmReceiveTransfer(null)}
                disabled={receivingTransferId !== null}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                Confirming receipt will add the transferred stock to <strong>{confirmReceiveTransfer.toBranchName || "your branch"}</strong> inventory and mark the transfer as <strong>Received</strong>.
              </p>

              <div style={{ background: "var(--bg-surface-subtle)", padding: "14px", borderRadius: "var(--radius-md)", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div><strong>Transfer ID:</strong> <span style={{ color: "var(--brand-gold, #c99824)", fontWeight: 700 }}>{confirmReceiveTransfer.transferNumber || `TRF-${confirmReceiveTransfer.id}`}</span></div>
                <div><strong>From Branch:</strong> {confirmReceiveTransfer.fromBranchName || "Main Branch"}</div>
                <div><strong>To Branch:</strong> <span style={{ fontWeight: 700 }}>{confirmReceiveTransfer.toBranchName || "Your Branch"}</span></div>
                <div><strong>Transferred At:</strong> {formatTransferDateTime(confirmReceiveTransfer.transferredAt || confirmReceiveTransfer.transferDate || confirmReceiveTransfer.createdAt)}</div>
                <div><strong>Transferred By:</strong> {confirmReceiveTransfer.transferredBy || "Staff"}</div>
              </div>

              {/* Item Details */}
              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <div style={{ background: "var(--bg-surface-subtle)", padding: "8px 12px", fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  ITEM & QUANTITY TO BE ADDED:
                </div>
                <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "14px" }}>
                    {confirmReceiveTransfer.itemName || confirmReceiveTransfer.item || "Item"}
                  </strong>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--accent-emerald, #059669)" }}>
                    +{Number(confirmReceiveTransfer.quantity || confirmReceiveTransfer.transferQuantity || 0).toFixed(2)} {confirmReceiveTransfer.unit || "KG"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setConfirmReceiveTransfer(null)}
                  disabled={receivingTransferId !== null}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={() => handleReceiveTransfer(confirmReceiveTransfer)}
                  disabled={receivingTransferId !== null}
                  style={{
                    background: "var(--accent-emerald, #059669)",
                    borderColor: "var(--accent-emerald, #059669)",
                    padding: "9px 20px",
                    fontWeight: 700
                  }}
                >
                  {receivingTransferId === confirmReceiveTransfer.id ? "Receiving..." : "Confirm & Receive Stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW TRANSFER DETAILS (Requirement 9, 13)                        */}
      {/* ========================================================================= */}
      {viewingTransfer && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-card" style={{ maxWidth: "600px", width: "95vw" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div>
                  <span className="eyebrow">TRANSFER DETAILS</span>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>{viewingTransfer.transferNumber || `TRF-${viewingTransfer.id}`}</h3>
                </div>
                {getStatusBadge(viewingTransfer.status)}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingTransfer(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Meta Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", background: "var(--bg-surface-subtle)", padding: "14px", borderRadius: "var(--radius-md)", fontSize: "13px" }}>
                <div><strong>Transfer ID:</strong> <span style={{ color: "var(--brand-gold, #c99824)" }}>{viewingTransfer.transferNumber || `TRF-${viewingTransfer.id}`}</span></div>
                <div><strong>Status:</strong> {getStatusBadge(viewingTransfer.status)}</div>
                <div><strong>From Branch:</strong> {viewingTransfer.fromBranchName || "Sender Branch"}</div>
                <div><strong>To Branch:</strong> <span style={{ fontWeight: 700 }}>{viewingTransfer.toBranchName || "Destination Branch"}</span></div>
                <div><strong>Transferred At:</strong> {formatTransferDateTime(viewingTransfer.transferredAt || viewingTransfer.transferDate || viewingTransfer.createdAt)}</div>
                <div><strong>Received At:</strong> {viewingTransfer.receivedAt ? formatTransferDateTime(viewingTransfer.receivedAt) : "—"}</div>
                <div><strong>Transferred By:</strong> {viewingTransfer.transferredBy || "Staff"}</div>
                <div><strong>Received By:</strong> {viewingTransfer.receivedBy || "—"}</div>
              </div>

              {viewingTransfer.remarks && (
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
                  <strong>Remarks:</strong> {viewingTransfer.remarks}
                </div>
              )}

              {/* Items Table */}
              <div>
                <strong style={{ display: "block", fontSize: "13px", marginBottom: "8px" }}>Transferred Item:</strong>
                <div className="table-wrap" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)" }}>
                  <table style={{ width: "100%", margin: 0 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-surface-subtle)" }}>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Quantity</th>
                        <th>Unit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>{viewingTransfer.itemName || viewingTransfer.item || "Item"}</strong></td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{Number(viewingTransfer.quantity || viewingTransfer.transferQuantity || 0).toFixed(2)}</td>
                        <td>{viewingTransfer.unit || "KG"}</td>
                        <td>{getStatusBadge(viewingTransfer.status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                {(viewingTransfer.status || "").toLowerCase() === "pending" &&
                  currentBranch?.id && viewingTransfer.toBranchId === currentBranch.id &&
                  canReceiveTransfer && (
                    <button
                      type="button"
                      className="primary-btn compact"
                      onClick={() => {
                        const trf = viewingTransfer;
                        setViewingTransfer(null);
                        setConfirmReceiveTransfer(trf);
                      }}
                      style={{ background: "var(--accent-emerald, #059669)", borderColor: "var(--accent-emerald, #059669)", fontWeight: 700 }}
                    >
                      <CheckCircle2 size={13} /> Receive Stock
                    </button>
                  )}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setViewingTransfer(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE PURCHASE REORDER (Requirement: Low Stock Reorder)          */}
      {/* ========================================================================= */}
      {showReorderModal && reorderItem && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-card" style={{ maxWidth: "560px", width: "95vw" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>PURCHASE PROCUREMENT</span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "18px" }}>Create Purchase Reorder</h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Replenish stock via Purchase workflow • Status: Draft (Pending GRN Receipt)
                </span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowReorderModal(false)}><X size={18} /></button>
            </div>

            {reorderError && <div className="error-box" style={{ margin: "16px 20px 0 20px" }}>{reorderError}</div>}

            <form onSubmit={handleCreateReorder} style={{ padding: "16px 20px" }}>
              {/* Target Item Summary Box */}
              <div style={{
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px"
              }}>
                <div>
                  <span className="eyebrow" style={{ margin: 0 }}>ITEM</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "var(--text-primary)" }}>{reorderItem.name}</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Code: {reorderItem.itemCode || `ITM-${reorderItem.id}`} • {reorderItem.category || "General"}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="eyebrow" style={{ margin: 0 }}>CURRENT / MIN LEVEL</span>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>
                    <span style={{ color: reorderItem.isOut ? "var(--status-inactive-dot, #dc2626)" : "var(--status-warning-dot, #d97706)" }}>
                      {reorderItem.current.toFixed(2)} {reorderItem.unit}
                    </span>
                    <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>/</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {Number(reorderItem.minimumStock || reorderItem.minThreshold || 0).toFixed(2)} {reorderItem.unit}
                    </span>
                  </div>
                  <span className={`status-badge ${reorderItem.isOut ? "status-out-of-stock" : "status-low-stock"}`} style={{ display: "inline-block", marginTop: "3px", fontSize: "10.5px" }}>
                    {reorderItem.isOut ? "Out of Stock" : "Low Stock"}
                  </span>
                </div>
              </div>

              <div className="form-stack">
                <label>
                  <span>Select Vendor / Supplier *</span>
                  {vendors.length > 0 ? (
                    <select
                      value={reorderForm.vendorId}
                      onChange={(e) => setReorderForm({ ...reorderForm, vendorId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.contactPerson ? `(${v.contactPerson})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {loadingVendors ? "Loading vendors..." : "No active vendors found. A default supplier will be assigned."}
                    </div>
                  )}
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    <span>Reorder Quantity ({reorderItem.unit || "KG"}) *</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={reorderForm.quantity}
                      onChange={(e) => setReorderForm({ ...reorderForm, quantity: e.target.value })}
                      required
                    />
                  </label>

                  <label>
                    <span>Estimated Unit Rate (₹)</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={reorderForm.rate}
                      onChange={(e) => setReorderForm({ ...reorderForm, rate: e.target.value })}
                      placeholder="0.00"
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    <span>Payment Mode *</span>
                    <select
                      value={reorderForm.paymentMethod}
                      onChange={(e) => setReorderForm({ ...reorderForm, paymentMethod: e.target.value })}
                      required
                    >
                      <option value="">Select Payment Mode</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit">Credit / Account</option>
                    </select>
                  </label>

                  <label>
                    <span>PO Invoice / Ref #</span>
                    <input
                      type="text"
                      value={reorderForm.invoiceNumber}
                      onChange={(e) => setReorderForm({ ...reorderForm, invoiceNumber: e.target.value })}
                      placeholder="Auto-generated if blank"
                    />
                  </label>
                </div>

                <label>
                  <span>Reorder Notes</span>
                  <input
                    type="text"
                    value={reorderForm.notes}
                    onChange={(e) => setReorderForm({ ...reorderForm, notes: e.target.value })}
                    placeholder="e.g. Urgent stock replenishment"
                  />
                </label>
              </div>

              {/* Informational Policy Box */}
              <div style={{
                marginTop: "14px",
                padding: "10px 12px",
                background: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                fontSize: "11.5px",
                color: "var(--text-muted)",
                lineHeight: "1.4"
              }}>
                ℹ️ <strong>Stock Governance Note:</strong> Submitting this reorder creates a Purchase Order in <strong>Draft</strong> status. Stock levels will <strong>NOT</strong> increase immediately; stock will only be updated when items are physically received through the <strong>Goods Receipt (GRN)</strong> workflow.
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button type="button" className="secondary-btn" onClick={() => setShowReorderModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingReorder || (!reorderForm.vendorId && vendors.length > 0)}
                  style={{ fontWeight: 700 }}
                >
                  {submittingReorder ? "Creating Purchase..." : "Confirm & Create Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



function MenuPage({ user }) {
  return <MenuManagement user={user} />;
}

function getReceiptDocumentHtml(bill, organizationName) {
  if (!bill) return "";

  const orgName = bill.organizationName && bill.organizationName !== "—"
    ? bill.organizationName
    : organizationName || (() => {
        try {
          const stored = JSON.parse(localStorage.getItem("samaya_user") || "{}");
          return stored?.organizationName || null;
        } catch {
          return null;
        }
      })() || bill.branchName || "RESTAURANT";

  const subtotal = Number(bill.subtotal || 0);
  const cgst = Number(bill.cgst || (bill.tax ? bill.tax / 2 : 0));
  const sgst = Number(bill.sgst || (bill.tax ? bill.tax / 2 : 0));
  const discount = Number(bill.discount || 0);
  const total = Number(bill.grandTotal || (subtotal + cgst + sgst - discount));
  const dateStr = bill.generatedAt ? new Date(bill.generatedAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  const timeStr = bill.generatedAt ? new Date(bill.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const branchAddressFormatted = bill.branchAddress && bill.branchAddress !== "—"
    ? `${bill.branchAddress}${bill.branchCity && bill.branchCity !== "—" && !bill.branchAddress.includes(bill.branchCity) ? `, ${bill.branchCity}` : ""}`
    : "";

  const itemsHtml = (bill.items || []).map((it) => `
    <tr>
      <td style="padding: 4px 0; text-align: left; font-weight: 600;">${it.menuItemName}</td>
      <td style="padding: 4px 0; text-align: center;">${it.quantity}</td>
      <td style="padding: 4px 0; text-align: right;">₹${Number(it.unitPrice).toFixed(0)}</td>
      <td style="padding: 4px 0; text-align: right; font-weight: 700;">₹${Number(it.lineTotal || (it.unitPrice * it.quantity)).toFixed(0)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Bill_${bill.billNumber || "Receipt"}</title>
    <meta charset="utf-8" />
    <style>
      @page {
        size: 80mm auto;
        margin: 4mm;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      body {
        background: #ffffff;
        color: #000000;
        padding: 4mm;
        display: flex;
        justify-content: center;
      }
      .receipt {
        width: 72mm;
        max-width: 100%;
        font-size: 11px;
        line-height: 1.35;
      }
      .header {
        text-align: center;
        margin-bottom: 8px;
      }
      .header h2 {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
        text-transform: uppercase;
      }
      .header p {
        font-size: 10px;
        color: #333333;
        margin: 1px 0;
      }
      .divider {
        border-top: 1px dashed #000000;
        margin: 6px 0;
      }
      .double-divider {
        border-top: 2px dashed #000000;
        margin: 6px 0;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin: 2px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin: 4px 0;
      }
      th {
        border-bottom: 1px dashed #000000;
        padding: 4px 0;
        text-align: left;
        font-weight: 700;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin: 2px 0;
      }
      .grand-total {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        font-weight: 900;
        padding: 4px 0;
      }
      .footer {
        text-align: center;
        margin-top: 10px;
        font-size: 11px;
      }
      @media screen {
        body {
          background: #f1f5f9;
          padding: 16px;
        }
        .receipt {
          background: #ffffff;
          padding: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          border-radius: 6px;
        }
      }
      @media print {
        body {
          background: #ffffff !important;
          padding: 0 !important;
        }
        .receipt {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          width: 72mm !important;
          margin: 0 auto !important;
        }
        .no-print-toolbar {
          display: none !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="header">
        <h2>${orgName}</h2>
        ${bill.branchName && bill.branchName !== orgName && bill.branchName !== "—" ? `<p><strong>${bill.branchName}</strong></p>` : ""}
        ${branchAddressFormatted ? `<p>${branchAddressFormatted}</p>` : ""}
        ${bill.branchPhone && bill.branchPhone !== "—" ? `<p>Ph: ${bill.branchPhone}</p>` : ""}
      </div>

      <div class="double-divider"></div>

      <div class="meta-row"><span>Bill No:</span><strong>${bill.billNumber}</strong></div>
      <div class="meta-row"><span>Order No:</span><span>${bill.orderNumber || "—"}</span></div>
      <div class="meta-row"><span>Sale Type:</span><strong>${bill.saleType === "SELF_SERVICE" ? "SELF-SERVICE / COUNTER" : "TABLE SERVICE"}</strong></div>
      ${bill.saleType === "SELF_SERVICE" || !bill.tableNumber
        ? `<div class="meta-row"><span>Counter:</span><strong>Quick Counter Service</strong></div>`
        : `<div class="meta-row"><span>Table:</span><strong>${bill.tableNumber}</strong></div>`}
      <div class="meta-row"><span>Customer:</span><span>${bill.customerName || "Counter Guest"}</span></div>
      <div class="meta-row"><span>${bill.saleType === "SELF_SERVICE" ? "Cashier:" : "Waiter / Staff:"}</span><span>${bill.cashierName || bill.waiterName || "Counter Cashier"}</span></div>
      <div class="meta-row"><span>Date:</span><span>${dateStr}</span></div>
      <div class="meta-row"><span>Time:</span><span>${timeStr}</span></div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="width: 48%;">ITEM</th>
            <th style="width: 14%; text-align: center;">QTY</th>
            <th style="width: 18%; text-align: right;">PRICE</th>
            <th style="width: 20%; text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="total-row"><span>Subtotal:</span><strong>₹${subtotal.toFixed(2)}</strong></div>
      <div class="total-row"><span>CGST 2.5%:</span><span>₹${cgst.toFixed(2)}</span></div>
      <div class="total-row"><span>SGST 2.5%:</span><span>₹${sgst.toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="total-row" style="color: #b91c1c;"><span>Discount:</span><span>-₹${discount.toFixed(2)}</span></div>` : ""}

      <div class="double-divider"></div>

      <div class="grand-total">
        <span>TOTAL:</span>
        <span>₹${total.toFixed(2)}</span>
      </div>

      ${bill.paymentMethod === "Cash" && bill.amountTendered ? `
      <div class="total-row"><span>Cash Received:</span><strong>₹${Number(bill.amountTendered).toFixed(2)}</strong></div>
      <div class="total-row"><span>Change Returned:</span><strong style="color: #16a34a;">₹${Number(bill.changeGiven || 0).toFixed(2)}</strong></div>
      ` : ""}

      <div class="double-divider"></div>

      <div style="text-align: center; margin: 4px 0; font-size: 11px;">
        Payment: <strong>${bill.paymentMethod || "Cash"}</strong> (${bill.paymentStatus || "PAID"})
      </div>

      <div class="footer">
        <p><strong>Thank You! Visit Again</strong></p>
      </div>
    </div>
  </body>
</html>`;
}

function printBillDocument(bill, organizationName) {
  if (!bill) return;
  const html = getReceiptDocumentHtml(bill, organizationName);

  // Hidden iframe technique ensures no popup blockers and isolates print styling completely
  let iframe = document.getElementById("samaya-bill-print-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "samaya-bill-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);
  }

  try {
    const frameDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = frameDoc.document || frameDoc;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.warn("Iframe print error, falling back to popup:", err);
        fallbackPopupPrint(html);
      }
    }, 250);
  } catch (err) {
    console.warn("Writing to iframe failed, falling back to popup:", err);
    fallbackPopupPrint(html);
  }
}

function fallbackPopupPrint(html) {
  const win = window.open("", "_blank", "width=480,height=750");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {}
    }, 300);
  }
}

function downloadReceiptFile(bill, organizationName) {
  if (!bill) return;
  // 1. Trigger print / Save as PDF
  printBillDocument(bill, organizationName);

  // 2. Also download self-contained .html file for archiving
  try {
    const html = getReceiptDocumentHtml(bill, organizationName);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bill_${bill.billNumber || "Receipt"}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch {}
}

function ThermalReceiptView({ bill, organizationName }) {
  if (!bill) return null;
  const orgName = bill.organizationName && bill.organizationName !== "—"
    ? bill.organizationName
    : organizationName || (() => {
        try {
          const stored = JSON.parse(localStorage.getItem("samaya_user") || "{}");
          return stored?.organizationName || null;
        } catch {
          return null;
        }
      })() || bill.branchName || "RESTAURANT";

  const subtotal = Number(bill.subtotal || 0);
  const cgst = Number(bill.cgst || (bill.tax ? bill.tax / 2 : 0));
  const sgst = Number(bill.sgst || (bill.tax ? bill.tax / 2 : 0));
  const total = Number(bill.grandTotal || (subtotal + cgst + sgst));
  const dateStr = bill.generatedAt ? new Date(bill.generatedAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  const timeStr = bill.generatedAt ? new Date(bill.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="thermal-receipt">
      <div className="receipt-header">
        <h3>{orgName}</h3>
        {bill.branchName && bill.branchName !== orgName && bill.branchName !== "—" && (
          <p style={{ fontWeight: 700 }}>{bill.branchName}</p>
        )}
        {bill.branchAddress && bill.branchAddress !== "—" && (
          <p>{bill.branchAddress}{bill.branchCity && bill.branchCity !== "—" && !bill.branchAddress.includes(bill.branchCity) ? `, ${bill.branchCity}` : ""}</p>
        )}
        {bill.branchPhone && bill.branchPhone !== "—" && <p>Ph: {bill.branchPhone}</p>}
      </div>
      <div className="receipt-divider" />
      <div className="receipt-meta-row"><span>Bill No</span><strong>{bill.billNumber}</strong></div>
      <div className="receipt-meta-row"><span>Order No</span><strong>{bill.orderNumber || "—"}</strong></div>
      <div className="receipt-meta-row"><span>Sale Type</span><strong style={{ color: bill.saleType === "SELF_SERVICE" ? "#d97706" : "inherit" }}>{bill.saleType === "SELF_SERVICE" ? "SELF-SERVICE / COUNTER" : "TABLE SERVICE"}</strong></div>
      {bill.saleType === "SELF_SERVICE" || !bill.tableNumber ? (
        <div className="receipt-meta-row"><span>Counter</span><strong>Quick Counter Service</strong></div>
      ) : (
        <div className="receipt-meta-row"><span>Table</span><strong>{bill.tableNumber}</strong></div>
      )}
      <div className="receipt-meta-row"><span>Customer</span><strong>{bill.customerName || "Walk-in Guest"}</strong></div>
      <div className="receipt-meta-row"><span>{bill.saleType === "SELF_SERVICE" ? "Cashier" : "Waiter"}</span><strong>{bill.cashierName || bill.waiterName || "Counter Cashier"}</strong></div>
      <div className="receipt-meta-row"><span>Date</span><span>{dateStr}</span></div>
      <div className="receipt-meta-row"><span>Time</span><span>{timeStr}</span></div>
      <div className="receipt-divider" />
      <table className="receipt-items-table">
        <thead>
          <tr>
            <th>ITEM</th>
            <th style={{ textAlign: "center" }}>QTY</th>
            <th style={{ textAlign: "right" }}>PRICE</th>
            <th style={{ textAlign: "right" }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {(bill.items || []).map((it, idx) => (
            <tr key={it.id || idx}>
              <td><strong>{it.menuItemName}</strong></td>
              <td style={{ textAlign: "center" }}>{it.quantity}</td>
              <td style={{ textAlign: "right" }}>₹{Number(it.unitPrice).toFixed(0)}</td>
              <td style={{ textAlign: "right" }}>₹{Number(it.lineTotal).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-divider" />
      <div className="receipt-totals">
        <div className="receipt-total-row"><span>Subtotal</span><strong>₹{subtotal.toFixed(2)}</strong></div>
        <div className="receipt-total-row"><span>CGST 2.5%</span><span>₹{cgst.toFixed(2)}</span></div>
        <div className="receipt-total-row"><span>SGST 2.5%</span><span>₹{sgst.toFixed(2)}</span></div>
        {Number(bill.discount || 0) > 0 && (
          <div className="receipt-total-row"><span>Discount</span><span style={{ color: "var(--accent-rose)" }}>-₹{Number(bill.discount).toFixed(2)}</span></div>
        )}
        <div className="receipt-grand-total">
          <span>TOTAL</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        {bill.paymentMethod === "Cash" && bill.amountTendered && (
          <>
            <div className="receipt-total-row"><span>Cash Received</span><strong>₹{Number(bill.amountTendered).toFixed(2)}</strong></div>
            <div className="receipt-total-row"><span>Change Returned</span><strong style={{ color: "#16a34a" }}>₹{Number(bill.changeGiven || 0).toFixed(2)}</strong></div>
          </>
        )}
      </div>
      <div className="receipt-divider" />
      <div style={{ textAlign: "center", margin: "6px 0", fontSize: "11px" }}>
        Payment: <strong>{bill.paymentMethod || "Cash"}</strong> ({bill.paymentStatus || "PAID"})
      </div>
      <div className="receipt-footer">
        <p style={{ margin: "2px 0", fontWeight: 700 }}>Thank You!</p>
        <p style={{ margin: "2px 0" }}>Visit Again</p>
      </div>
    </div>
  );
}

function KOTTicketView({ kot }) {
  if (!kot) return null;
  const timeStr = kot.createdAt ? new Date(kot.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="thermal-receipt" style={{ borderTop: "3px solid var(--accent-emerald)" }}>
      <div className="receipt-header">
        <h3>KITCHEN ORDER TICKET</h3>
        <p style={{ fontWeight: 800 }}>KITCHEN DESK</p>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-meta-row"><span>KOT No</span><strong>{kot.kotNumber}</strong></div>
      <div className="receipt-meta-row"><span>Order No</span><strong>{kot.orderNumber || "—"}</strong></div>
      <div className="receipt-meta-row"><span>Sale Type</span><strong style={{ color: kot.saleType === "SELF_SERVICE" ? "#d97706" : "inherit" }}>{kot.saleType === "SELF_SERVICE" ? "COUNTER SALE (SELF-SERVICE)" : "TABLE SERVICE"}</strong></div>
      {kot.saleType === "SELF_SERVICE" || !kot.tableNumber ? (
        <div className="receipt-meta-row"><span>Counter</span><strong style={{ fontSize: "14px", color: "#d97706" }}>FAST COUNTER PICKUP</strong></div>
      ) : (
        <div className="receipt-meta-row"><span>Table</span><strong style={{ fontSize: "14px" }}>{kot.tableNumber}</strong></div>
      )}
      <div className="receipt-meta-row"><span>Customer</span><strong>{kot.customerName || "—"}</strong></div>
      <div className="receipt-meta-row"><span>Waiter</span><strong>{kot.waiterName || "—"}</strong></div>
      <div className="receipt-meta-row"><span>Time</span><span>{timeStr}</span></div>
      <div className="receipt-divider" />
      <div style={{ fontWeight: 700, margin: "4px 0", textTransform: "uppercase", fontSize: "10.5px" }}>NEW ITEMS FOR THIS TICKET:</div>
      <table className="receipt-items-table">
        <thead>
          <tr>
            <th>ITEM</th>
            <th style={{ textAlign: "right" }}>QTY</th>
          </tr>
        </thead>
        <tbody>
          {(kot.items || []).map((it, idx) => (
            <tr key={it.id || idx}>
              <td><strong style={{ fontSize: "12px" }}>{it.menuItemName}</strong></td>
              <td style={{ textAlign: "right", fontSize: "14px", fontWeight: 800 }}>× {it.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-divider" />
      <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 700 }}>
        STATUS: {kot.status}
      </div>
    </div>
  );
}

function OrdersPage({ user = {}, onNavigate }) {
  const canBill = ["Super Admin", "Organization Admin", "Branch Manager", "Accountant", "Cashier"].includes(user?.role);
  return <WaiterOrderPage user={user} onNavigate={onNavigate} canBill={canBill} />;
}

function WaiterOrderPage({ user = {}, onNavigate, canBill: canBillProp }) {
  const [activeTab, setActiveTab] = useState("floor"); // "floor" | "register" | "ready"
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [readyKOTs, setReadyKOTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Multi-branch support
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return user?.branchId ? Number(user.branchId) : null;
  });

  const effectiveBranchId = useMemo(() => {
    if (user?.branchId) return Number(user.branchId);
    if (selectedBranchId) return Number(selectedBranchId);
    if (branches.length > 0) return Number(branches[0].id);
    return null;
  }, [user?.branchId, selectedBranchId, branches]);

  useEffect(() => {
    api.getBranches()
      .then((res) => {
        const list = res || [];
        setBranches(list);
        if (!user?.branchId && list.length > 0 && !selectedBranchId) {
          setSelectedBranchId(Number(list[0].id));
        }
      })
      .catch((err) => console.warn("Could not load branches:", err));
  }, [user?.branchId]);

  // Waiter & Table Allocation state (Requirement: Branch Manager assigns waiter for particular tables)
  const branchKey = effectiveBranchId || user?.branchId || "all";
  const [waiters, setWaiters] = useState([]);
  const [tableAssignments, setTableAssignments] = useState(() => {
    try {
      const key = `samaya_table_waiters_${branchKey}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Synchronize table assignments when branch changes or on custom storage updates
  useEffect(() => {
    try {
      const key = `samaya_table_waiters_${branchKey}`;
      const saved = localStorage.getItem(key);
      setTableAssignments(saved ? JSON.parse(saved) : {});
    } catch {}
  }, [branchKey]);

  // Waiter view mode ("my" station vs "all" tables)
  const [waiterViewMode, setWaiterViewMode] = useState("auto");

  // Robust Table Assignment Resolution Helper
  function getTableAssignment(tableNum, assignments) {
    if (!tableNum || !assignments) return null;
    if (assignments[tableNum]) return assignments[tableNum];
    const upper = String(tableNum).trim().toUpperCase();
    for (const [k, val] of Object.entries(assignments)) {
      if (String(k).trim().toUpperCase() === upper) return val;
    }
    return null;
  }

  // Scoping helper: True only if table or active order belongs to current user
  function isTableAssignedToCurrentUser(tableNumOrObj, userObj, assignments) {
    if (!userObj) return false;
    const tableNum = typeof tableNumOrObj === "string" ? tableNumOrObj : (tableNumOrObj?.tableNumber || "");
    const activeOrder = typeof tableNumOrObj === "object" ? tableNumOrObj?.activeOrder : null;

    // 1. Check branch table allocation mapping
    const assigned = getTableAssignment(tableNum, assignments);
    if (assigned) {
      if (assigned.id != null && String(assigned.id) === String(userObj.id)) {
        return true;
      }
      const myName = (userObj.fullName || userObj.username || userObj.name || "").toLowerCase().trim();
      if (assigned.name && myName && assigned.name.toLowerCase().trim() === myName) {
        return true;
      }
    }

    // 2. Check active order waiter attribution
    if (activeOrder) {
      if (activeOrder.waiterId != null && String(activeOrder.waiterId) === String(userObj.id)) {
        return true;
      }
      const myName = (userObj.fullName || userObj.username || userObj.name || "").toLowerCase().trim();
      if (activeOrder.waiterName && myName && activeOrder.waiterName.toLowerCase().trim() === myName) {
        return true;
      }
    }

    return false;
  }

  const [assignModal, setAssignModal] = useState(false);
  const [selectedTableForAssign, setSelectedTableForAssign] = useState("");
  const [assignWaiterId, setAssignWaiterId] = useState("");
  const [readyFilterWaiter, setReadyFilterWaiter] = useState("my"); // "my" | "all"

  const isWaiter = user?.role === "Waiter";
  const isBranchManager = user?.role === "Branch Manager" || user?.role === "Organization Admin" || user?.role === "Super Admin";
  const isOrgAdmin = user?.role === "Organization Admin" || user?.role === "Super Admin";
  const canBill = canBillProp !== undefined
    ? canBillProp
    : ["Super Admin", "Organization Admin", "Branch Manager", "Accountant", "Cashier"].includes(user?.role);

  // Modals & Panels state
  const [startOrderModal, setStartOrderModal] = useState(false);
  const [extendOrderModal, setExtendOrderModal] = useState(false);
  const [orderDetailsModal, setOrderDetailsModal] = useState(false);
  const [closeTableModal, setCloseTableModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [printKOTModal, setPrintKOTModal] = useState(false);
  const [addTableModal, setAddTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [manageTablesModal, setManageTablesModal] = useState(false);
  const [dishAvailability, setDishAvailability] = useState({ hasPlan: false, items: [] });

  // Active working targets
  const [selectedTable, setSelectedTable] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedKOTs, setSelectedKOTs] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedKOTToPrint, setSelectedKOTToPrint] = useState(null);

  // Carts
  const [cart, setCart] = useState([]); // for start order
  const [extendCart, setExtendCart] = useState([]); // for extend order
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [tableFilter, setTableFilter] = useState("All"); // All | Available | Occupied
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [lastReadyIds, setLastReadyIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("samaya_ready_kots") || "[]");
    } catch {
      return [];
    }
  });

  // Load waiters in the branch
  useEffect(() => {
    if (!user?.organizationId) return;
    const targetBranchId = effectiveBranchId || user.branchId;
    api.getUsers(user.organizationId)
      .then((res) => {
        const list = (res || []).filter((u) => {
          const r = (u.role || u.roleName || "").toLowerCase();
          const isRoleWaiter = r === "waiter" || u.roleId === 10;
          const matchBranch = !targetBranchId || !u.branchId || Number(u.branchId) === Number(targetBranchId);
          return isRoleWaiter && matchBranch;
        });
        setWaiters(list);
      })
      .catch(() => {});
  }, [user?.organizationId, user?.branchId, effectiveBranchId]);

  function handleSaveAssignment(tableNum, waiterId) {
    const w = waiters.find((x) => String(x.id) === String(waiterId));
    const wName = w ? (w.fullName || w.username || w.email || "Waiter") : null;
    const cleanNum = String(tableNum).trim().toUpperCase();
    const bKey = effectiveBranchId || user?.branchId || "all";
    setTableAssignments((prev) => {
      const updated = {
        ...prev,
        [cleanNum]: w ? { id: w.id, name: wName } : null
      };
      localStorage.setItem(`samaya_table_waiters_${bKey}`, JSON.stringify(updated));
      return updated;
    });
    setMessage(`Table ${cleanNum} assigned to ${wName || "Unassigned"}.`);
    setAssignModal(false);
  }

  function getEffectiveTables(rawTables, targetBranchId) {
    const bKey = targetBranchId || effectiveBranchId || user?.branchId || "default";
    let custom = [];
    let removed = [];
    try {
      custom = JSON.parse(localStorage.getItem(`samaya_custom_tables_${bKey}`) || "[]");
      removed = JSON.parse(localStorage.getItem(`samaya_removed_tables_${bKey}`) || "[]");
    } catch {}

    // Exclude removed tables (unless table is currently occupied by an active order)
    let list = (rawTables || []).filter((t) => {
      if (t.status === "OCCUPIED" || t.status === "READY_FOR_BILLING" || t.isReadyForBilling || Boolean(t.activeOrder)) return true;
      return !removed.map((x) => x.toUpperCase()).includes((t.tableNumber || "").toUpperCase());
    });

    // Merge custom added tables
    for (const c of custom) {
      const exists = list.some((t) => (t.tableNumber || "").toUpperCase() === c.toUpperCase());
      if (!exists) {
        list.push({
          tableNumber: c,
          status: "AVAILABLE",
          activeOrder: null
        });
      }
    }

    list.sort((a, b) =>
      String(a?.tableNumber || "").localeCompare(String(b?.tableNumber || ""), undefined, { numeric: true, sensitivity: "base" })
    );
    return list;
  }

  async function loadData() {
    const bId = effectiveBranchId;
    try {
      const [tRes, oRes, mRes, kRes] = await Promise.all([
        api.getTables(bId),
        api.getOrders(null, bId),
        api.getMenu(bId),
        api.getKOTs({ branchId: bId, status: "Ready" })
      ]);
      const effective = getEffectiveTables(tRes || [], bId);
      setTables(effective);
      setOrders(oRes || []);
      setMenu(mRes || []);
      setReadyKOTs(kRes || []);

      // Check new ready items (Requirement: Waiter only notified for their particular tables)
      const readyIds = (kRes || []).map((x) => x.id);
      const newItems = (kRes || []).filter((x) => !lastReadyIds.includes(x.id));
      if (newItems.length > 0) {
        const relevantNewItems = isWaiter
          ? newItems.filter((k) => isTableAssignedToCurrentUser(k.tableNumber, user, tableAssignments) || (k.waiterId != null && String(k.waiterId) === String(user?.id)))
          : newItems;

        if (relevantNewItems.length > 0) {
          setMessage(`🔔 Food READY for your Table: ${relevantNewItems.map((k) => `${k.kotNumber} (Table ${k.tableNumber})`).join(", ")}`);
        }
        setLastReadyIds(readyIds);
        localStorage.setItem("samaya_ready_kots", JSON.stringify(readyIds));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [effectiveBranchId]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set(["All"]);
    menu.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [menu]);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return menu.filter((m) => {
      const matchCat = selectedCategory === "All" || m.category === selectedCategory;
      const matchSearch =
        !menuSearch ||
        m.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(menuSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [menu, selectedCategory, menuSearch]);

  // Number of tables assigned to current waiter
  const assignedCountForUser = useMemo(() => {
    return tables.filter((t) => isTableAssignedToCurrentUser(t, user, tableAssignments)).length;
  }, [tables, user, tableAssignments]);

  // Visible tables (Requirement: Waiter views assigned tables, or all tables if no station assigned yet or toggled)
  const visibleTables = useMemo(() => {
    if (!isWaiter) return tables;
    if (waiterViewMode === "all" || assignedCountForUser === 0) return tables;
    return tables.filter((t) => isTableAssignedToCurrentUser(t, user, tableAssignments));
  }, [tables, isWaiter, waiterViewMode, assignedCountForUser, user, tableAssignments]);

  // Filtered tables based on floor plan status filter
  const filteredTables = useMemo(() => {
    return visibleTables.filter((t) => {
      const isOcc = t.status === "OCCUPIED" || t.status === "READY_FOR_BILLING" || t.isReadyForBilling || Boolean(t.activeOrder);
      const isReady = t.isReadyForBilling || t.status === "READY_FOR_BILLING" || t.activeOrder?.status === "Ready for Billing";
      if (tableFilter === "Available") return !isOcc;
      if (tableFilter === "Occupied") return isOcc && !isReady;
      if (tableFilter === "Ready for Billing" || tableFilter === "ReadyBilling") return isReady;
      return true;
    });
  }, [visibleTables, tableFilter]);

  // Visible orders (Requirement: Waiter only views orders for their assigned tables or their own created orders)
  const visibleOrders = useMemo(() => {
    if (!isWaiter) return orders;
    if (waiterViewMode === "all" || assignedCountForUser === 0) return orders;
    return (orders || []).filter((o) => {
      if (o.waiterId != null && String(o.waiterId) === String(user?.id)) return true;
      const myName = (user?.fullName || user?.username || user?.name || "").toLowerCase().trim();
      if (o.waiterName && myName && o.waiterName.toLowerCase().trim() === myName) return true;
      if (o.tableNumber && isTableAssignedToCurrentUser(o.tableNumber, user, tableAssignments)) return true;
      return false;
    });
  }, [orders, isWaiter, waiterViewMode, assignedCountForUser, user, tableAssignments]);

  // Food tickets ready for current user/station (Fixes myReadyKOTs reference error)
  const myReadyKOTs = useMemo(() => {
    if (!isWaiter) return readyKOTs;
    if (waiterViewMode === "all" || assignedCountForUser === 0) return readyKOTs;
    return (readyKOTs || []).filter((k) =>
      isTableAssignedToCurrentUser(k.tableNumber, user, tableAssignments) ||
      (k.waiterId != null && String(k.waiterId) === String(user?.id))
    );
  }, [readyKOTs, isWaiter, waiterViewMode, assignedCountForUser, user, tableAssignments]);

  async function loadDishAvailability() {
    try {
      const bId = effectiveBranchId || (user?.branchId ? Number(user.branchId) : 1);
      const res = await api.getDishAvailability(bId);
      setDishAvailability(res || { hasPlan: false, items: [] });
    } catch {
      setDishAvailability({ hasPlan: false, items: [] });
    }
  }

  // Cart operations for Start Order
  function addToCart(item) {
    if (dishAvailability.hasPlan) {
      const avail = dishAvailability.items.find((x) => x.menuItemId === item.id);
      if (avail) {
        const inCart = (cart.find((x) => x.menuItemId === item.id)?.quantity || 0);
        if (inCart + 1 > avail.remainingQuantity) {
          setError("Insufficient production quantity available for this item.");
          return;
        }
      }
    }
    setCart((prev) => {
      const existing = prev.find((x) => x.menuItemId === item.id);
      if (existing) {
        return prev.map((x) => (x.menuItemId === item.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  }

  function removeFromCart(menuItemId) {
    setCart((prev) =>
      prev
        .map((x) => (x.menuItemId === menuItemId ? { ...x, quantity: x.quantity - 1 } : x))
        .filter((x) => x.quantity > 0)
    );
  }

  // Cart operations for Extend Order
  function addToExtendCart(item) {
    if (dishAvailability.hasPlan) {
      const avail = dishAvailability.items.find((x) => x.menuItemId === item.id);
      if (avail) {
        const inCart = (extendCart.find((x) => x.menuItemId === item.id)?.quantity || 0);
        if (inCart + 1 > avail.remainingQuantity) {
          setError("Insufficient production quantity available for this item.");
          return;
        }
      }
    }
    setExtendCart((prev) => {
      const existing = prev.find((x) => x.menuItemId === item.id);
      if (existing) {
        return prev.map((x) => (x.menuItemId === item.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  }

  function removeFromExtendCart(menuItemId) {
    setExtendCart((prev) =>
      prev
        .map((x) => (x.menuItemId === menuItemId ? { ...x, quantity: x.quantity - 1 } : x))
        .filter((x) => x.quantity > 0)
    );
  }

  // Cart calculations
  const cartSubtotal = useMemo(() => cart.reduce((sum, x) => sum + x.price * x.quantity, 0), [cart]);
  const cartTax = useMemo(() => Math.round(cartSubtotal * 0.05 * 100) / 100, [cartSubtotal]);
  const cartTotal = useMemo(() => cartSubtotal + cartTax, [cartSubtotal, cartTax]);

  const extendSubtotal = useMemo(() => extendCart.reduce((sum, x) => sum + x.price * x.quantity, 0), [extendCart]);
  const extendTax = useMemo(() => Math.round(extendSubtotal * 0.05 * 100) / 100, [extendSubtotal]);
  const extendTotal = useMemo(() => extendSubtotal + extendTax, [extendSubtotal, extendTax]);

  // Handlers
  function openStartOrder(table) {
    setError("");
    setMessage("");
    if (isWaiter && assignedCountForUser > 0 && waiterViewMode !== "all" && !isTableAssignedToCurrentUser(table, user, tableAssignments)) {
      setError(`Table ${table?.tableNumber || ""} is not assigned to your station.`);
      return;
    }
    setSelectedTable(table.tableNumber);
    setCustomerName("");
    setCart([]);
    loadDishAvailability();
    setStartOrderModal(true);
  }

  async function handleCreateOrder(e) {
    if (e) e.preventDefault();
    setError("");
    setMessage("");
    if (!selectedTable.trim()) {
      setError("Table number is required.");
      return;
    }
    if (isWaiter && assignedCountForUser > 0 && waiterViewMode !== "all" && !isTableAssignedToCurrentUser(selectedTable.trim().toUpperCase(), user, tableAssignments)) {
      setError(`Table ${selectedTable.trim().toUpperCase()} is not assigned to your station.`);
      return;
    }
    if (!cart.length) {
      setError("Select at least one food item.");
      return;
    }

    try {
      const bId = effectiveBranchId || (user.branchId ? Number(user.branchId) : 1);
      const payload = {
        branchId: bId,
        tableNumber: selectedTable.trim().toUpperCase(),
        customerName: customerName.trim() || "Walk-in Guest",
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity
        }))
      };

      const result = await api.createOrder(payload);
      setMessage(`Order ${result.orderNumber} created for Table ${selectedTable.trim().toUpperCase()}. KOT-001 sent to kitchen.`);
      setStartOrderModal(false);
      setCart([]);
      setSelectedTable("");
      setCustomerName("");
      await loadData();

      // Open the new order details
      openOrderDetails(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openOrderDetails(orderSummary) {
    setError("");
    setMessage("");
    try {
      const fullOrder = await api.getOrder(orderSummary.id);
      setSelectedOrder(fullOrder);
      const kots = await api.getKOTsByOrder(fullOrder.id);
      setSelectedKOTs(kots);

      if (fullOrder.billId || fullOrder.status === "Closed") {
        try {
          const b = await api.getBillByOrder(fullOrder.id);
          setSelectedBill(b);
        } catch {
          setSelectedBill(null);
        }
      } else {
        setSelectedBill(null);
      }

      setOrderDetailsModal(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function openExtendOrder(order) {
    setError("");
    setMessage("");
    setSelectedOrder(order);
    setExtendCart([]);
    loadDishAvailability();
    setExtendOrderModal(true);
  }

  async function handleSendExtension(e) {
    if (e) e.preventDefault();
    setError("");
    setMessage("");
    if (!extendCart.length) {
      setError("Please add at least one item to extend the order.");
      return;
    }
    if (!selectedOrder) return;

    try {
      const itemsPayload = extendCart.map((c) => ({
        menuItemId: c.menuItemId,
        quantity: c.quantity
      }));

      const result = await api.extendOrder(selectedOrder.id, itemsPayload);
      setMessage(`KOT sent to kitchen for ${result.orderNumber}. Running total updated to ₹${Number(result.totalAmount).toFixed(2)}.`);
      setExtendOrderModal(false);
      setExtendCart([]);
      await loadData();

      // Refresh order details modal if open
      const updatedOrder = await api.getOrder(selectedOrder.id);
      setSelectedOrder(updatedOrder);
      const kots = await api.getKOTsByOrder(selectedOrder.id);
      setSelectedKOTs(kots);
      setOrderDetailsModal(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function openCloseTableConfirmation(order) {
    setError("");
    setMessage("");
    if (order.status !== "Served") {
      setError(`⚠️ Cannot complete Table ${order.tableNumber}: Order ${order.orderNumber} is "${order.status}". It must be marked as "Served" first before completing.`);
      return;
    }
    if (!isWaiter && !isBranchManager && !isOrgAdmin && !canBill) {
      setError("⚠️ Only authorized staff (waiter, manager, cashier) can complete the served order.");
      return;
    }
    setSelectedOrder(order);
    setCloseTableModal(true);
  }

  async function handleQuickServeOrder(order) {
    setError("");
    setMessage("");
    try {
      await api.updateOrderStatus(order.id, "Served");
      try {
        const kots = await api.getKOTsByOrder(order.id);
        for (const k of kots) {
          if (k.status !== "Served") {
            await api.updateKOTStatus(k.id, "Served");
          }
        }
      } catch {}
      setMessage(`✓ Order ${order.orderNumber} (Table ${order.tableNumber}) marked as SERVED! Waiter can now complete the table for billing.`);
      await loadData();
      if (selectedOrder && selectedOrder.id === order.id) {
        const updated = await api.getOrder(order.id);
        setSelectedOrder(updated);
        try {
          const updatedKots = await api.getKOTsByOrder(order.id);
          setSelectedKOTs(updatedKots);
        } catch {}
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExecuteCloseTable() {
    setError("");
    setMessage("");
    if (!selectedOrder) return;

    if (selectedOrder.status !== "Served") {
      setError(`⚠️ Cannot complete table: Order ${selectedOrder.orderNumber} must be marked as 'Served' first.`);
      setCloseTableModal(false);
      return;
    }

    if (!isWaiter && !isBranchManager && !isOrgAdmin && !canBill) {
      setError("⚠️ Only authorized staff (waiter, manager, cashier) can complete the served order.");
      setCloseTableModal(false);
      return;
    }

    try {
      // Waiter completes table -> status becomes "Ready for Billing"
      // Waiter does NOT generate bill and does NOT trigger print
      await api.closeTable(selectedOrder.id);
      setMessage(`✓ Table ${selectedOrder.tableNumber} completed! Order is now "Ready for Billing" for the Cashier/Accountant.`);
      setCloseTableModal(false);
      setOrderDetailsModal(false);
      setSelectedOrder(null);

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePayBill() {
    setError("");
    setMessage("");
    if (!selectedBill) return;

    try {
      const updatedBill = await api.payBill(selectedBill.id, paymentMethod);
      const fullBill = await api.getBill(selectedBill.id);
      setSelectedBill(fullBill);
      setMessage(`Payment recorded! Bill ${fullBill.billNumber} is PAID. Table ${fullBill.tableNumber} is now AVAILABLE.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleServeKOT(kotId, orderId) {
    try {
      await api.updateKOTStatus(kotId, "Served");
      if (orderId) {
        try {
          await api.updateOrderStatus(orderId, "Served");
        } catch {}
      }
      setMessage("KOT marked as served to customer.");
      await loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await api.getOrder(orderId);
        setSelectedOrder(updated);
        try {
          const kots = await api.getKOTsByOrder(orderId);
          setSelectedKOTs(kots);
        } catch {}
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function printKOT(kot) {
    setSelectedKOTToPrint(kot);
    setPrintKOTModal(true);
  }

  function handleAddTable(e) {
    if (e) e.preventDefault();
    setError("");
    setMessage("");
    const name = (newTableName || "").trim().toUpperCase();
    if (!name) {
      setError("Please enter a table number or name (e.g. T17, Outdoor 1).");
      return;
    }
    const branchKey = effectiveBranchId || user?.branchId || "default";
    let custom = [];
    let removed = [];
    try {
      custom = JSON.parse(localStorage.getItem(`samaya_custom_tables_${branchKey}`) || "[]");
      removed = JSON.parse(localStorage.getItem(`samaya_removed_tables_${branchKey}`) || "[]");
    } catch {}

    if (tables.some((t) => (t.tableNumber || "").toUpperCase() === name)) {
      setError(`Table "${name}" already exists on the floor plan.`);
      return;
    }

    // Un-remove if previously marked removed
    removed = removed.filter((x) => x.toUpperCase() !== name);
    localStorage.setItem(`samaya_removed_tables_${branchKey}`, JSON.stringify(removed));

    if (!custom.map((x) => x.toUpperCase()).includes(name)) {
      custom.push(name);
      localStorage.setItem(`samaya_custom_tables_${branchKey}`, JSON.stringify(custom));
    }

    setMessage(`✓ Table ${name} has been added to the floor plan.`);
    setNewTableName("");
    setAddTableModal(false);
    loadData();
  }

  function handleRemoveTable(tableNumber) {
    setError("");
    setMessage("");
    const tName = (tableNumber || "").trim().toUpperCase();
    if (!tName) return;

    const target = tables.find((t) => (t.tableNumber || "").toUpperCase() === tName);
    if (target && target.status === "OCCUPIED") {
      setError(`⚠️ Cannot remove Table ${tName} because it currently has an active order. Please close or cancel the order first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to remove Table ${tName} from the floor plan?`)) {
      return;
    }

    const branchKey = effectiveBranchId || user?.branchId || "default";
    let custom = [];
    let removed = [];
    try {
      custom = JSON.parse(localStorage.getItem(`samaya_custom_tables_${branchKey}`) || "[]");
      removed = JSON.parse(localStorage.getItem(`samaya_removed_tables_${branchKey}`) || "[]");
    } catch {}

    custom = custom.filter((x) => x.toUpperCase() !== tName);
    localStorage.setItem(`samaya_custom_tables_${branchKey}`, JSON.stringify(custom));

    if (!removed.map((x) => x.toUpperCase()).includes(tName)) {
      removed.push(tName);
      localStorage.setItem(`samaya_removed_tables_${branchKey}`, JSON.stringify(removed));
    }

    setTableAssignments((prev) => {
      const next = { ...prev };
      delete next[tName];
      delete next[tableNumber];
      localStorage.setItem(`samaya_table_waiters_${branchKey}`, JSON.stringify(next));
      return next;
    });

    setMessage(`✓ Table ${tName} removed from floor plan.`);
    loadData();
  }

  function handleResetTables() {
    if (!window.confirm("Reset all dining tables to default system layout? Custom table additions and removals will be reset.")) return;
    const branchKey = effectiveBranchId || user?.branchId || "default";
    localStorage.removeItem(`samaya_custom_tables_${branchKey}`);
    localStorage.removeItem(`samaya_removed_tables_${branchKey}`);
    setMessage("✓ Dining tables reset to default floor plan layout.");
    setManageTablesModal(false);
    loadData();
  }

  async function handleCancelOrder(order) {
    if (!order) return;
    const targetOrder = typeof order === "object" ? order : orders.find((o) => o.id === order);
    const orderNo = targetOrder?.orderNumber || (typeof order === "object" ? order.id : order);
    const tableNo = targetOrder?.tableNumber || "";

    setError("");
    setMessage("");
    const confirmMsg = `Are you sure you want to CANCEL Order ${orderNo}${tableNo ? ` for Table ${tableNo}` : ""}? (Customer requested cancellation)\n\nThis will cancel the order and its kitchen tickets, freeing up the table immediately.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const orderId = typeof order === "object" ? order.id : order;
      await api.cancelOrder(orderId, "Customer requested cancellation");
      setMessage(`✓ Order ${orderNo}${tableNo ? ` (Table ${tableNo})` : ""} was CANCELLED by request. Table is now AVAILABLE.`);
      setOrderDetailsModal(false);
      setCloseTableModal(false);
      await loadData();
    } catch (err) {
      setError(`Failed to cancel order: ${err.message}`);
    }
  }

  return (
    <div className="page-grid orders-page-grid">
      {/* Top Actions Bar */}
      <div className="page-actions-bar no-print" style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", marginBottom: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {branches.length > 0 && (!user?.branchId || isOrgAdmin || isSuperAdmin) && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Building2 size={15} style={{ color: "var(--text-muted)" }} />
              <select
                className="form-control"
                style={{ padding: "4px 10px", fontSize: "12px", height: "32px", width: "auto", minWidth: "180px", borderRadius: "6px" }}
                value={effectiveBranchId || ""}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city || b.branchCode || `#${b.id}`})
                  </option>
                ))}
              </select>
            </div>
          )}
          {isWaiter && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-card)", padding: "2px 4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                className={`compact-pill ${waiterViewMode !== "all" && assignedCountForUser > 0 ? "active" : ""}`}
                onClick={() => setWaiterViewMode("my")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: (waiterViewMode !== "all" && assignedCountForUser > 0) ? "var(--primary-color)" : "transparent",
                  color: (waiterViewMode !== "all" && assignedCountForUser > 0) ? "#fff" : "var(--text-muted)"
                }}
              >
                My Station ({assignedCountForUser})
              </button>
              <button
                type="button"
                className={`compact-pill ${waiterViewMode === "all" || assignedCountForUser === 0 ? "active" : ""}`}
                onClick={() => setWaiterViewMode("all")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: (waiterViewMode === "all" || assignedCountForUser === 0) ? "var(--primary-color)" : "transparent",
                  color: (waiterViewMode === "all" || assignedCountForUser === 0) ? "#fff" : "var(--text-muted)"
                }}
              >
                All Tables ({tables.length})
              </button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {myReadyKOTs.length > 0 && (
            <button
              className="primary-btn compact"
              onClick={() => setActiveTab("ready")}
              style={{ background: "var(--accent-emerald)" }}
            >
              <Utensils size={15} /> {myReadyKOTs.length} Food Ready
            </button>
          )}
          {!isWaiter && (
            <button
              className="secondary-btn compact"
              onClick={() => setAddTableModal(true)}
              style={{ fontWeight: 600 }}
              title="Add a new dining table to floor plan"
            >
              <Plus size={15} /> Add Table
            </button>
          )}
          <button
            className="primary-btn compact"
            onClick={() => {
              if (visibleTables.length === 0) {
                setError("No tables currently available in floor plan.");
                return;
              }
              const defaultTable =
                (visibleTables.find((t) => t.status === "AVAILABLE" && !t.activeOrder)?.tableNumber || visibleTables[0].tableNumber);
              setSelectedTable(defaultTable);
              setCustomerName("");
              setCart([]);
              setStartOrderModal(true);
            }}
            disabled={visibleTables.length === 0}
            title={visibleTables.length === 0 ? "No tables available" : "Create new table order"}
          >
            <Plus size={16} /> New Table Order
          </button>
        </div>
      </div>

      {error && <div className="error-box no-print" style={{ margin: 0 }}>{error}</div>}
      {message && <div className="success-box no-print" style={{ margin: 0 }}>🔔 {message}</div>}

      {/* Tab Switcher */}
      <div className="pos-subnav no-print" style={{ margin: 0 }}>
        <button
          type="button"
          className={activeTab === "floor" ? "active" : ""}
          onClick={() => setActiveTab("floor")}
        >
          <Store size={15} />
          <span>Table Floor Plan</span>
          <span className="pos-subnav-badge">{visibleTables.length}</span>
        </button>
        <button
          type="button"
          className={activeTab === "register" ? "active" : ""}
          onClick={() => setActiveTab("register")}
        >
          <ClipboardList size={15} />
          <span>Active Orders Register</span>
          <span className="pos-subnav-badge">{visibleOrders.filter((o) => o.status !== "Closed" && o.status !== "Cancelled").length}</span>
        </button>
        <button
          type="button"
          className={activeTab === "ready" ? "active" : ""}
          onClick={() => setActiveTab("ready")}
        >
          <CheckCircle2 size={15} />
          <span>Ready for Service</span>
          <span className="pos-subnav-badge">{isWaiter ? myReadyKOTs.length : readyKOTs.length}</span>
        </button>
      </div>

      {/* TAB 1: TABLE FLOOR PLAN */}
      {activeTab === "floor" && (
        <>
          <div className="panel no-print" style={{ padding: "10px 18px", margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="eyebrow" style={{ margin: 0 }}>FILTER TABLES:</span>
                {["All", "Available", "Occupied", "Ready for Billing"].map((filt) => (
                  <button
                    key={filt}
                    className={`secondary-btn compact ${tableFilter === filt ? "active" : ""}`}
                    onClick={() => setTableFilter(filt)}
                    style={{
                      fontWeight: tableFilter === filt ? 700 : 500,
                      borderColor: filt === "Ready for Billing" && tableFilter === filt ? "#f59e0b" : undefined,
                      color: filt === "Ready for Billing" && tableFilter === filt ? "#b45309" : undefined
                    }}
                  >
                    {filt === "Ready for Billing" ? `🛎️ Ready for Billing (${visibleTables.filter(t => t.isReadyForBilling || t.status === "READY_FOR_BILLING" || t.activeOrder?.status === "Ready for Billing").length})` : filt}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>🟢 <strong>{visibleTables.filter((t) => t.status === "AVAILABLE" && !t.activeOrder).length}</strong> Available</span>
                <span>🟠 <strong>{visibleTables.filter((t) => (t.status === "OCCUPIED" || t.activeOrder) && !t.isReadyForBilling && t.activeOrder?.status !== "Ready for Billing").length}</strong> Occupied</span>
                <span>🛎️ <strong>{visibleTables.filter((t) => t.isReadyForBilling || t.status === "READY_FOR_BILLING" || t.activeOrder?.status === "Ready for Billing").length}</strong> Ready for Billing</span>
                {!isWaiter && (
                  <>
                    <button
                      className="secondary-btn compact"
                      onClick={() => setAddTableModal(true)}
                      style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px", marginLeft: "6px" }}
                      title="Add a new dining table"
                    >
                      <Plus size={14} /> Add Table
                    </button>
                    <button
                      className="secondary-btn compact"
                      onClick={() => setManageTablesModal(true)}
                      style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px" }}
                      title="Manage or remove floor plan tables"
                    >
                      <Store size={14} /> Manage Tables
                    </button>
                  </>
                )}
                {(isBranchManager || isOrgAdmin) && (
                  <button
                    className="secondary-btn compact"
                    onClick={() => { setSelectedTableForAssign(""); setAssignModal(true); }}
                    style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <UserCheck size={14} /> Assign Waiters
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pos-tables-grid no-print" style={{ marginTop: 0 }}>
            {filteredTables.length === 0 ? (
              isWaiter && visibleTables.length === 0 ? (
                <div
                  className="panel"
                  style={{
                    gridColumn: "1 / -1",
                    padding: "48px 24px",
                    textAlign: "center",
                    background: "var(--bg-surface)",
                    border: "1px dashed var(--border-default)",
                    borderRadius: "var(--radius-md)"
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "rgba(15, 118, 110, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      color: "var(--accent-teal)"
                    }}
                  >
                    <Store size={26} />
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700 }}>
                    No Tables Assigned to Your Station
                  </h3>
                  <p style={{ margin: "0 auto 18px", color: "var(--text-muted)", fontSize: "13px", maxWidth: "460px", lineHeight: "1.5" }}>
                    You are logged in as <strong>{user?.fullName || user?.username || "Waiter"}</strong>. You can only view and take orders for dining tables assigned to your station. Please contact your Branch Manager to allocate tables.
                  </p>
                  <button
                    type="button"
                    className="secondary-btn compact"
                    onClick={loadData}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <RefreshCw size={13} /> Refresh Allocation
                  </button>
                </div>
              ) : (
                <div
                  className="empty-row"
                  style={{
                    gridColumn: "1 / -1",
                    padding: "36px 16px",
                    textAlign: "center",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)"
                  }}
                >
                  No assigned tables match filter "{tableFilter}".
                </div>
              )
            ) : (
              filteredTables.map((t) => {
                const isOccupied = t.status === "OCCUPIED" || t.status === "READY_FOR_BILLING" || t.isReadyForBilling || Boolean(t.activeOrder);
                const isReadyForBilling = isOccupied && (t.isReadyForBilling || t.status === "READY_FOR_BILLING" || t.activeOrder?.status === "Ready for Billing");
                const assignedWaiter = getTableAssignment(t.tableNumber, tableAssignments);
                const isServed = isOccupied && t.activeOrder?.status === "Served";

                return (
                  <div
                    key={t.tableNumber}
                    className={`pos-table-card ${isOccupied ? "occupied" : "available"} ${isReadyForBilling ? "ready-for-billing" : ""}`}
                    style={isReadyForBilling ? { borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" } : undefined}
                  >
                    <div className="pos-table-card-head">
                      <span className="pos-table-number">{t.tableNumber}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isReadyForBilling ? (
                          <span className="ready-billing-chip" style={{ fontSize: "10.5px", padding: "2px 7px" }}>
                            <span className="pulse-dot" /> READY FOR BILLING
                          </span>
                        ) : (
                          <span className={`pos-table-badge ${isOccupied ? "occupied" : "available"}`}>
                            {t.status}
                          </span>
                        )}
                        {!isOccupied && !isWaiter && (
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTable(t.tableNumber);
                            }}
                            style={{
                              padding: "2px 5px",
                              fontSize: "11px",
                              color: "var(--accent-rose)",
                              borderColor: "rgba(239, 68, 68, 0.3)"
                            }}
                            title={`Remove Table ${t.tableNumber} from floor plan`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: "8px", background: "rgba(0,0,0,0.03)", padding: "4px 8px", borderRadius: "var(--radius-sm)" }}>
                      <span>
                        🤵 {assignedWaiter ? (
                          <>
                            <strong style={{ color: "var(--text-primary)" }}>{assignedWaiter.name}</strong>
                            {isWaiter && (
                              <span style={{ color: "var(--accent-teal)", fontWeight: 700, marginLeft: "4px" }}>
                                (Your Station)
                              </span>
                            )}
                          </>
                        ) : (
                          <em style={{ color: "var(--text-muted)" }}>Unassigned</em>
                        )}
                      </span>
                      {(isBranchManager || isOrgAdmin) && (
                        <button
                          type="button"
                          className="secondary-btn compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTableForAssign(t.tableNumber);
                            const current = getTableAssignment(t.tableNumber, tableAssignments);
                            setAssignWaiterId(current?.id ? String(current.id) : "");
                            setAssignModal(true);
                          }}
                          style={{ padding: "1px 6px", fontSize: "10.5px" }}
                          title="Assign waiter to table"
                        >
                          Assign
                        </button>
                      )}
                    </div>

                  {isOccupied && t.activeOrder ? (
                    <div className="pos-table-info">
                      <div>
                        <strong>{t.activeOrder.customerName || "Customer"}</strong>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {t.activeOrder.orderNumber} · <span className={`status ${isServed ? "active" : isReadyForBilling ? "inactive" : "inactive"}`} style={isReadyForBilling ? { fontSize: "10px", padding: "1px 5px", background: "#fef3c7", color: "#b45309" } : { fontSize: "10px", padding: "1px 5px" }}>{isReadyForBilling ? "READY FOR BILLING" : t.activeOrder.status}</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span>{t.activeOrder.itemCount || (t.activeOrder.items || []).reduce((s, it) => s + it.quantity, 0) || 0} items</span>
                        <strong style={{ color: "var(--accent-warm-gold)", fontSize: "14px" }}>
                          ₹{Number(t.activeOrder.totalAmount || 0).toFixed(0)}
                        </strong>
                      </div>

                      <div className="pos-table-actions" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                          <button
                            className="secondary-btn compact"
                            onClick={() => openOrderDetails(t.activeOrder)}
                            title="View Order Details"
                          >
                            View Order
                          </button>
                          <button
                            className="secondary-btn compact"
                            onClick={() => openExtendOrder(t.activeOrder)}
                            title="Extend order with new items"
                            disabled={isReadyForBilling}
                          >
                            + Extend
                          </button>
                        </div>

                        {isReadyForBilling ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "var(--radius-sm)", padding: "5px 8px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#b45309" }}>
                              🛎️ Ready for Billing (Awaiting Cashier)
                            </div>
                            {canBill && (
                              <>
                                <button
                                  type="button"
                                  className="primary-btn compact"
                                  onClick={async () => {
                                    try {
                                      const res = await api.generateBill(t.activeOrder.id);
                                      const b = res.bill || res;
                                      printBillDocument(b, user?.organizationName);
                                      setMessage(`✓ Bill ${b.billNumber} generated for Table ${t.tableNumber}!`);
                                      await loadData();
                                    } catch (e) {
                                      setError(e.message);
                                    }
                                  }}
                                  style={{ width: "100%", justifyContent: "center", fontWeight: 700, background: "var(--accent-emerald)" }}
                                  title="Generate final bill and print PDF receipt"
                                >
                                  <Printer size={13} /> Bill Table (PDF)
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn compact"
                                  onClick={() => onNavigate ? onNavigate("billing") : null}
                                  style={{ width: "100%", justifyContent: "center", fontWeight: 600, fontSize: "11px" }}
                                >
                                  Cashier Desk ➔
                                </button>
                              </>
                            )}
                          </div>
                        ) : !isServed ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "6px" }}>
                            <button
                              className="secondary-btn compact"
                              onClick={() => handleQuickServeOrder(t.activeOrder)}
                              title="Mark food as served to guests"
                              style={{ color: "var(--accent-emerald)", borderColor: "var(--accent-emerald)", fontWeight: 700 }}
                            >
                              <Check size={13} /> Serve Food
                            </button>
                            <button
                              className="secondary-btn compact"
                              onClick={() => openCloseTableConfirmation(t.activeOrder)}
                              style={{ opacity: 0.65, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "3px" }}
                              title="Order must be served before completing"
                            >
                              <Lock size={12} /> Complete
                            </button>
                          </div>
                        ) : (
                          <button
                            className="primary-btn compact"
                            onClick={() => openCloseTableConfirmation(t.activeOrder)}
                            style={{ background: "#d97706", width: "100%", justifyContent: "center", fontWeight: 700 }}
                            title="Complete table order and mark Ready for Billing"
                          >
                            Complete Table (Ready for Billing)
                          </button>
                        )}

                        {!isReadyForBilling && (
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => handleCancelOrder(t.activeOrder)}
                            style={{
                              color: "var(--accent-rose)",
                              borderColor: "rgba(239, 68, 68, 0.35)",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                              padding: "3px 8px",
                              fontSize: "11px"
                            }}
                            title="Customer cancelled order - Free up table"
                          >
                            <XCircle size={13} /> Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pos-table-info">
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        Ready for guests
                      </span>
                      <div className="pos-table-actions" style={{ marginTop: "12px" }}>
                        <button
                          className="primary-btn compact"
                          onClick={() => openStartOrder(t)}
                          style={{ width: "100%" }}
                        >
                          <Plus size={14} /> Start Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </>
      )}

      {/* TAB 2: WAITER ORDER LIST / REGISTER */}
      {activeTab === "register" && (
        <div className="panel no-print">
          <div className="panel-head">
            <div>
              <span className="eyebrow">ORDER LIST</span>
              <h3>Continuous Table Orders</h3>
            </div>
            <RefreshCw size={18} style={{ cursor: "pointer" }} onClick={loadData} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Customer</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-row">
                        {isWaiter ? "No orders recorded for your assigned tables yet." : "No orders recorded yet."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleOrders.map((o) => {
                    const isClosed = o.status === "Closed" || o.status === "Cancelled" || o.status === "Paid";
                    const isReadyForBilling = o.status === "Ready for Billing";
                    const isServed = o.status === "Served";
                    const isOpen = !isClosed && !isReadyForBilling;
                    const itemCount = (o.items || []).reduce((sum, it) => sum + it.quantity, 0);

                    return (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.orderNumber}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td>
                          <strong>{o.customerName || "Walk-in Guest"}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                            Waiter: {o.waiterName || "Staff"}
                          </span>
                        </td>
                        <td>
                          <span className="pos-table-badge occupied" style={{ fontSize: "11px", padding: "2px 8px" }}>
                            {o.tableNumber || "—"}
                          </span>
                        </td>
                        <td>
                          <strong>{itemCount}</strong> items
                        </td>
                        <td>
                          <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                            ₹{Number(o.totalAmount || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`status ${isServed ? "active" : isReadyForBilling ? "inactive" : isOpen ? "active" : "inactive"}`}
                            style={isReadyForBilling ? { background: "#fef3c7", color: "#b45309", borderColor: "#fcd34d", fontWeight: 700 } : undefined}
                          >
                            {isReadyForBilling ? "READY FOR BILLING" : isServed ? "SERVED" : isOpen ? "OPEN" : o.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                            <button
                              className="secondary-btn compact"
                              onClick={() => openOrderDetails(o)}
                            >
                              View
                            </button>
                            {isReadyForBilling ? (
                              <>
                                <span className="ready-billing-chip" style={{ fontSize: "11px", padding: "3px 8px" }}>
                                  🛎️ Ready for Billing
                                </span>
                                {canBill && (
                                  <button
                                    className="primary-btn compact"
                                    onClick={async () => {
                                      try {
                                        const res = await api.generateBill(o.id);
                                        const b = res.bill || res;
                                        printBillDocument(b, user?.organizationName);
                                        setMessage(`✓ Bill ${b.billNumber} generated for Table ${o.tableNumber}!`);
                                        await loadData();
                                      } catch (e) {
                                        setError(e.message);
                                      }
                                    }}
                                    style={{ background: "var(--accent-emerald)", fontWeight: 700 }}
                                    title="Generate bill and print PDF receipt"
                                  >
                                    <Printer size={13} /> Bill (PDF)
                                  </button>
                                )}
                              </>
                            ) : isOpen ? (
                              <>
                                <button
                                  className="secondary-btn compact"
                                  onClick={() => openExtendOrder(o)}
                                >
                                  Extend
                                </button>
                                {!isServed && (
                                  <button
                                    className="secondary-btn compact"
                                    onClick={() => handleQuickServeOrder(o)}
                                    style={{ color: "var(--accent-emerald)", borderColor: "var(--accent-emerald)", fontWeight: 600 }}
                                    title="Mark food as served to customer"
                                  >
                                    <Check size={13} /> Serve
                                  </button>
                                )}
                                <button
                                  className={isServed ? "primary-btn compact" : "secondary-btn compact"}
                                  onClick={() => openCloseTableConfirmation(o)}
                                  style={isServed ? { background: "#d97706", fontWeight: 700 } : { opacity: 0.65, display: "inline-flex", alignItems: "center", gap: "4px" }}
                                  title={isServed ? "Complete table order and mark Ready for Billing" : "Order must be served first before completing"}
                                >
                                  {!isServed && <Lock size={12} />} Complete Table
                                </button>
                                <button
                                  className="secondary-btn compact"
                                  onClick={() => handleCancelOrder(o)}
                                  style={{ color: "var(--accent-rose)", borderColor: "rgba(239, 68, 68, 0.35)", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px" }}
                                  title="Customer cancelled order"
                                >
                                  <XCircle size={12} /> Cancel
                                </button>
                              </>
                            ) : (
                              (o.billId || o.status === "Closed" || o.status === "Paid") && (
                                <div style={{ display: "inline-flex", gap: "4px" }}>
                                  <button
                                    className="secondary-btn compact"
                                    onClick={async () => {
                                      try {
                                        const b = await api.getBillByOrder(o.id);
                                        if (b) {
                                          setSelectedBill(b);
                                          setPaymentModal(true);
                                        }
                                      } catch (e) {
                                        setError(e.message);
                                      }
                                    }}
                                    title="View Final Bill"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
                                  >
                                    <Eye size={12} /> View Bill
                                  </button>
                                  <button
                                    className="secondary-btn compact"
                                    onClick={async () => {
                                      try {
                                        const b = await api.getBillByOrder(o.id);
                                        if (b) {
                                          printBillDocument(b, user?.organizationName);
                                        }
                                      } catch (e) {
                                        setError(e.message);
                                      }
                                    }}
                                    title="Print PDF Receipt"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
                                  >
                                    <Printer size={12} /> Receipt
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: READY KOT QUEUE */}
      {activeTab === "ready" && (
        <div className="panel no-print">
          <div className="panel-head" style={{ flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span className="eyebrow">{isWaiter ? "YOUR STATION NOTIFICATIONS" : "KITCHEN NOTIFICATIONS"}</span>
              <h3>{isWaiter ? "Food Ready for Your Tables" : "Food Ready for Service"}</h3>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span className="count-chip">{isWaiter ? myReadyKOTs.length : readyKOTs.length} ready</span>
            </div>
          </div>

          {(isWaiter ? myReadyKOTs : readyKOTs).length === 0 ? (
            <div className="empty-row">
              {isWaiter
                ? "No food tickets ready for your assigned tables."
                : "No food tickets currently waiting to be served."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", padding: "16px" }}>
              {(isWaiter ? myReadyKOTs : readyKOTs).map((k) => {
                const assigned = getTableAssignment(k.tableNumber, tableAssignments);
                const isMyTable = (assigned?.id != null && String(assigned.id) === String(user.id)) || (k.waiterId != null && String(k.waiterId) === String(user.id));

                return (
                  <div key={k.id} className="kot-ticket" style={{ borderLeft: `4px solid ${isMyTable ? "var(--accent-teal)" : "var(--border-default)"}` }}>
                    <div className="kot-ticket-head">
                      <div>
                        <strong>{k.kotNumber}</strong> · <span>Order {k.orderNumber}</span>
                      </div>
                      <span className="status active">READY</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", background: "var(--bg-surface-subtle)", padding: "4px 8px", borderRadius: "var(--radius-sm)", marginBottom: "8px" }}>
                      <span>Table: <strong style={{ fontSize: "13px" }}>{k.tableNumber}</strong></span>
                      <span>
                        🤵 Assigned: <strong>{assigned?.name || "Staff"}</strong>
                        {isMyTable && <span style={{ color: "var(--accent-emerald)", fontWeight: 700, marginLeft: "4px" }}>(You)</span>}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", marginBottom: "6px" }}>
                      Customer: <strong>{k.customerName || "Walk-in Guest"}</strong>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
                      {(k.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button className="secondary-btn compact" onClick={() => printKOT(k)}>
                        <Printer size={14} /> Print KOT
                      </button>
                      <button className="primary-btn compact" onClick={() => handleServeKOT(k.id, k.orderId)} style={{ background: "var(--accent-emerald)" }}>
                        <Check size={14} /> Mark Served
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: START ORDER (Requirement 1) */}
      {/* ========================================================================= */}
      {startOrderModal && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <div>
                <span className="eyebrow">NEW TABLE ORDER</span>
                <h3>Create Order for {selectedTable || "Table"}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setStartOrderModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px", padding: "20px" }}>
              {/* Left Column: Table/Customer input & Menu Picker */}
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  {isWaiter ? (
                    <label className="field">
                      <span>Assigned Table *</span>
                      <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        required
                      >
                        <option value="">-- Select Assigned Table --</option>
                        {visibleTables.map((t) => {
                          const isOcc = t.status === "OCCUPIED" || Boolean(t.activeOrder);
                          return (
                            <option key={t.tableNumber} value={t.tableNumber}>
                              Table {t.tableNumber} {isOcc ? `(${t.activeOrder?.orderNumber || "Occupied"})` : "(Available)"}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ) : (
                    <Field
                      label="Table Number"
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      placeholder="T12"
                      required
                    />
                  )}
                  <Field
                    label="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Arjun"
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Search food item..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      style={{ paddingLeft: "32px", width: "100%" }}
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "12px" }}>
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`secondary-btn compact ${selectedCategory === c ? "active" : ""}`}
                      onClick={() => setSelectedCategory(c)}
                      style={{ fontSize: "11px", whiteSpace: "nowrap" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Food Cards Grid */}
                <div className="food-grid" style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                  {filteredMenu.map((m) => {
                    const avail = dishAvailability.hasPlan ? dishAvailability.items.find((x) => x.menuItemId === m.id) : null;
                    const isOutOfStock = avail && avail.remainingQuantity <= 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className="food-card"
                        onClick={() => {
                          if (isOutOfStock) {
                            setError("Insufficient production quantity available for this item.");
                            return;
                          }
                          addToCart(m);
                        }}
                        style={isOutOfStock ? { opacity: 0.6, cursor: "not-allowed", border: "1px dashed #ef4444" } : {}}
                      >
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="food-card-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div
                            style={{
                              height: "48px",
                              background: "var(--bg-surface-subtle)",
                              borderBottom: "1px solid var(--border-subtle)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)"
                            }}
                          >
                            <Utensils size={18} opacity={0.4} />
                          </div>
                        )}
                        <div className="food-card-body">
                          <strong>{m.name}</strong>
                          <span>{m.category}</span>
                          {avail && (
                            <div style={{ marginTop: "4px" }}>
                              {avail.remainingQuantity > 0 ? (
                                <span className="k-pill green" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                  Avail: {avail.remainingQuantity}
                                </span>
                              ) : (
                                <span className="k-pill red" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                  Sold Out
                                </span>
                              )}
                            </div>
                          )}
                          <div className="food-card-footer">
                            <b>₹{Number(m.price).toFixed(2)}</b>
                            <span className="food-card-add-btn" style={isOutOfStock ? { background: "#9ca3af" } : {}}>
                              {isOutOfStock ? "✕" : "+"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Order Summary / Cart */}
              <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-surface-subtle)", borderRadius: "var(--radius-md)", padding: "16px", border: "1px solid var(--border-default)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <strong style={{ fontSize: "15px" }}>Table {selectedTable || "—"}</strong>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                      Customer: {customerName || "Walk-in Guest"}
                    </span>
                  </div>
                  <span className="pos-table-badge available" style={{ fontSize: "11px" }}>Initial KOT-001</span>
                </div>

                {/* Cart items list */}
                <div style={{ flex: 1, overflowY: "auto", maxHeight: "300px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {cart.length === 0 ? (
                    <div className="empty-row" style={{ padding: "40px 10px" }}>
                      No items added yet. Click any food card on the left to add items.
                    </div>
                  ) : (
                    cart.map((c) => (
                      <div key={c.menuItemId} className="operation" style={{ padding: "8px 10px" }}>
                        <div>
                          <strong>{c.name}</strong>
                          <span style={{ fontSize: "11px" }}>₹{c.price.toFixed(2)} × {c.quantity}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => removeFromCart(c.menuItemId)}
                            style={{ padding: "2px 8px" }}
                          >
                            −
                          </button>
                          <strong style={{ minWidth: "18px", textAlign: "center" }}>{c.quantity}</strong>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => addToCart({ id: c.menuItemId, name: c.name, price: c.price })}
                            style={{ padding: "2px 8px" }}
                          >
                            +
                          </button>
                          <span style={{ minWidth: "55px", textAlign: "right", fontWeight: 700 }}>
                            ₹{(c.price * c.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Running Totals */}
                <div style={{ borderTop: "1.5px solid var(--border-default)", paddingTop: "12px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div className="running-line"><span>Subtotal:</span><strong>₹{cartSubtotal.toFixed(2)}</strong></div>
                  <div className="running-line"><span>Tax (5% GST):</span><strong>₹{cartTax.toFixed(2)}</strong></div>
                  <div className="running-total-line"><span>Total:</span><strong>₹{cartTotal.toFixed(2)}</strong></div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <button
                    className="primary-btn"
                    onClick={handleCreateOrder}
                    disabled={!cart.length || !selectedTable.trim()}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Send to Kitchen (KOT-001) <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ORDER DETAILS SCREEN (Requirement 4) */}
      {/* ========================================================================= */}
      {orderDetailsModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <div>
                <span className="eyebrow">ORDER DETAILS</span>
                <h3>{selectedOrder.orderNumber} · TABLE {selectedOrder.tableNumber}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setOrderDetailsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Header Banner */}
              <div className="order-banner">
                <div className="order-banner-left">
                  <h2>{selectedOrder.orderNumber}</h2>
                  <div className="order-banner-meta">
                    <span>Customer: <strong>{selectedOrder.customerName || "Walk-in Guest"}</strong></span>
                    <span>Table: <strong>{selectedOrder.tableNumber}</strong></span>
                    <span>Waiter: <strong>{selectedOrder.waiterName || "Staff"}</strong></span>
                    <span>Status: <strong className="status active">{selectedOrder.status}</strong></span>
                    <span>Time: <strong>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></span>
                  </div>
                </div>

                <div className="order-running-box">
                  <div className="running-line"><span>Subtotal:</span><strong>₹{Number(selectedOrder.subtotal || selectedOrder.totalAmount * 0.9524 || 0).toFixed(2)}</strong></div>
                  <div className="running-line"><span>CGST 2.5%:</span><span>₹{(Number(selectedOrder.tax || selectedOrder.totalAmount * 0.0476 || 0) / 2).toFixed(2)}</span></div>
                  <div className="running-line"><span>SGST 2.5%:</span><span>₹{(Number(selectedOrder.tax || selectedOrder.totalAmount * 0.0476 || 0) / 2).toFixed(2)}</span></div>
                  <div className="running-line"><span>Tax (5%):</span><span>₹{Number(selectedOrder.tax || 0).toFixed(2)}</span></div>
                  <div className="running-total-line"><span>TOTAL:</span><strong>₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong></div>
                </div>
              </div>

              {/* Cumulative Items Table */}
              <div className="panel" style={{ marginBottom: "20px" }}>
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">CUMULATIVE ORDER ITEMS</span>
                    <h3>Items Ordered</h3>
                  </div>
                  <span className="count-chip">{(selectedOrder.items || []).length} items</span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th style={{ textAlign: "center" }}>QTY</th>
                        <th style={{ textAlign: "right" }}>PRICE</th>
                        <th style={{ textAlign: "right" }}>TOTAL</th>
                        <th style={{ textAlign: "center" }}>KOT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it) => (
                        <tr key={it.id}>
                          <td><strong>{it.menuItemName}</strong></td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{it.quantity}</td>
                          <td style={{ textAlign: "right" }}>₹{Number(it.unitPrice).toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>₹{Number(it.lineTotal).toFixed(2)}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className="count-chip" style={{ fontSize: "10.5px" }}>
                              {it.kotNumber || "KOT-001"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KOT Breakdown Section (Requirement 5) */}
              <div className="panel" style={{ marginBottom: "20px" }}>
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">KITCHEN TICKETS</span>
                    <h3>KOT Ticket History ({selectedKOTs.length})</h3>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", padding: "14px" }}>
                  {selectedKOTs.length === 0 ? (
                    <div className="empty-row">No KOT tickets loaded.</div>
                  ) : (
                    selectedKOTs.map((k) => (
                      <div key={k.id} className="kot-ticket">
                        <div className="kot-ticket-head">
                          <strong>{k.kotNumber}</strong>
                          <span className={`status ${k.status === "Ready" || k.status === "Served" ? "active" : "inactive"}`}>
                            {k.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
                          Generated: {new Date(k.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: "12px" }}>
                          {(k.items || []).map((it, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                              <span>{it.menuItemName}</span>
                              <strong>× {it.quantity}</strong>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: "8px", textAlign: "right" }}>
                          <button className="secondary-btn compact" onClick={() => printKOT(k)}>
                            <Printer size={13} /> Print KOT
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1.5px solid var(--border-default)", paddingTop: "16px" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {selectedOrder.status !== "Closed" && selectedOrder.status !== "Cancelled" && selectedOrder.status !== "Ready for Billing" && (
                    <>
                      <button
                        className="secondary-btn"
                        onClick={() => {
                          setOrderDetailsModal(false);
                          openExtendOrder(selectedOrder);
                        }}
                        style={{ fontWeight: 700 }}
                      >
                        <Plus size={16} /> + EXTEND ORDER
                      </button>
                      <button
                        className="secondary-btn"
                        onClick={() => handleCancelOrder(selectedOrder)}
                        style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "var(--accent-rose)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
                        title="Cancel order on customer request"
                      >
                        <XCircle size={16} /> CANCEL ORDER
                      </button>
                    </>
                  )}
                  {selectedKOTs.length > 0 && (
                    <button
                      className="secondary-btn"
                      onClick={() => printKOT(selectedKOTs[selectedKOTs.length - 1])}
                    >
                      <Printer size={16} /> PRINT LATEST KOT
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  {selectedOrder.status === "Ready for Billing" ? (
                    <>
                      <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "var(--radius-sm)", padding: "6px 12px", fontSize: "12px", fontWeight: 700, color: "#b45309" }}>
                        🛎️ Table {selectedOrder.tableNumber} is Ready for Billing
                      </div>
                      {canBill ? (
                        <button
                          className="primary-btn"
                          onClick={async () => {
                            try {
                              const res = await api.generateBill(selectedOrder.id);
                              const b = res.bill || res;
                              setSelectedBill(b);
                              printBillDocument(b, user?.organizationName);
                              setMessage(`✓ Bill ${b.billNumber} generated for Table ${selectedOrder.tableNumber}!`);
                              setOrderDetailsModal(false);
                              await loadData();
                            } catch (e) {
                              setError(e.message);
                            }
                          }}
                          style={{ background: "var(--accent-emerald)", fontWeight: 800 }}
                        >
                          <Printer size={16} /> Generate & Print Bill (PDF)
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          (Awaiting Cashier to generate bill)
                        </span>
                      )}
                    </>
                  ) : selectedOrder.status !== "Closed" && selectedOrder.status !== "Cancelled" ? (
                    <>
                      {selectedOrder.status !== "Served" && (
                        <button
                          className="primary-btn"
                          onClick={() => handleQuickServeOrder(selectedOrder)}
                          style={{ background: "var(--accent-emerald)", fontWeight: 700 }}
                          title="Mark order as served to guests"
                        >
                          <Check size={16} /> MARK AS SERVED
                        </button>
                      )}
                      {selectedOrder.status !== "Served" ? (
                        <button
                          className="secondary-btn"
                          onClick={() => openCloseTableConfirmation(selectedOrder)}
                          style={{ opacity: 0.65, borderColor: "var(--accent-rose)", color: "var(--accent-rose)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                          title="All food must be served before closing the order"
                        >
                          <Lock size={15} /> CLOSE TABLE (SERVE FIRST)
                        </button>
                      ) : (
                        <button
                          className="primary-btn"
                          onClick={() => {
                            setOrderDetailsModal(false);
                            openCloseTableConfirmation(selectedOrder);
                          }}
                          style={{ background: "#d97706", fontWeight: 700 }}
                        >
                          <CheckCircle2 size={17} /> COMPLETE TABLE (READY FOR BILLING)
                        </button>
                      )}
                    </>
                  ) : (
                    selectedBill && (
                      <button
                        className="primary-btn"
                        onClick={() => {
                          setOrderDetailsModal(false);
                          setPaymentModal(true);
                        }}
                      >
                        <Receipt size={16} /> View Final Bill & Print PDF
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXTEND ORDER (Requirement 2 & 5) */}
      {/* ========================================================================= */}
      {extendOrderModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-warm-gold)" }}>ORDER EXTENSION</span>
                <h3>Extend Order {selectedOrder.orderNumber} · Table {selectedOrder.tableNumber}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setExtendOrderModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "14px 20px 0" }}>
              <div className="notice-box" style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid var(--accent-warm-gold)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                <span>
                  Adding new food items to existing <strong>{selectedOrder.orderNumber}</strong> for Customer <strong>{selectedOrder.customerName || "Customer"}</strong>.
                </span>
                <span style={{ fontWeight: 700 }}>
                  Kitchen will receive ONLY the newly added items in a new KOT.
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px", padding: "20px" }}>
              {/* Left Column: Menu Picker */}
              <div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Search food to add..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      style={{ paddingLeft: "32px", width: "100%" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "12px" }}>
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`secondary-btn compact ${selectedCategory === c ? "active" : ""}`}
                      onClick={() => setSelectedCategory(c)}
                      style={{ fontSize: "11px", whiteSpace: "nowrap" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="food-grid" style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                  {filteredMenu.map((m) => {
                    const avail = dishAvailability.hasPlan ? dishAvailability.items.find((x) => x.menuItemId === m.id) : null;
                    const isOutOfStock = avail && avail.remainingQuantity <= 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className="food-card"
                        onClick={() => {
                          if (isOutOfStock) {
                            setError("Insufficient production quantity available for this item.");
                            return;
                          }
                          addToExtendCart(m);
                        }}
                        style={isOutOfStock ? { opacity: 0.6, cursor: "not-allowed", border: "1px dashed #ef4444" } : {}}
                      >
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="food-card-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div
                            style={{
                              height: "48px",
                              background: "var(--bg-surface-subtle)",
                              borderBottom: "1px solid var(--border-subtle)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)"
                            }}
                          >
                            <Utensils size={18} opacity={0.4} />
                          </div>
                        )}
                        <div className="food-card-body">
                          <strong>{m.name}</strong>
                          <span>{m.category}</span>
                          {avail && (
                            <div style={{ marginTop: "4px" }}>
                              {avail.remainingQuantity > 0 ? (
                                <span className="k-pill green" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                  Avail: {avail.remainingQuantity}
                                </span>
                              ) : (
                                <span className="k-pill red" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                  Sold Out
                                </span>
                              )}
                            </div>
                          )}
                          <div className="food-card-footer">
                            <b>₹{Number(m.price).toFixed(2)}</b>
                            <span className="food-card-add-btn" style={isOutOfStock ? { background: "#9ca3af" } : {}}>
                              {isOutOfStock ? "✕" : "+"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: New Items Cart & Running Total Preview */}
              <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-surface-subtle)", borderRadius: "var(--radius-md)", padding: "16px", border: "1px solid var(--border-default)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <strong style={{ fontSize: "15px" }}>New Items to Add</strong>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                      Will generate KOT-{String(selectedKOTs.length + 1).padStart(3, "0")}
                    </span>
                  </div>
                  <span className="count-chip">{extendCart.length} new</span>
                </div>

                <div style={{ flex: 1, overflowY: "auto", maxHeight: "250px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {extendCart.length === 0 ? (
                    <div className="empty-row" style={{ padding: "40px 10px" }}>
                      No new items selected. Choose food from the left to extend this order.
                    </div>
                  ) : (
                    extendCart.map((c) => (
                      <div key={c.menuItemId} className="operation" style={{ padding: "8px 10px" }}>
                        <div>
                          <strong>{c.name}</strong>
                          <span style={{ fontSize: "11px" }}>₹{c.price.toFixed(2)} × {c.quantity}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => removeFromExtendCart(c.menuItemId)}
                            style={{ padding: "2px 8px" }}
                          >
                            −
                          </button>
                          <strong style={{ minWidth: "18px", textAlign: "center" }}>{c.quantity}</strong>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => addToExtendCart({ id: c.menuItemId, name: c.name, price: c.price })}
                            style={{ padding: "2px 8px" }}
                          >
                            +
                          </button>
                          <span style={{ minWidth: "55px", textAlign: "right", fontWeight: 700 }}>
                            ₹{(c.price * c.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Running Totals Calculation */}
                <div style={{ borderTop: "1.5px solid var(--border-default)", paddingTop: "12px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div className="running-line"><span>Current Order Total:</span><span>₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</span></div>
                  <div className="running-line"><span>+ New Items Subtotal:</span><strong>₹{extendSubtotal.toFixed(2)}</strong></div>
                  <div className="running-line"><span>+ Tax on Extension (5%):</span><span>₹{extendTax.toFixed(2)}</span></div>
                  <div className="running-total-line" style={{ color: "var(--accent-warm-gold)" }}>
                    <span>New Combined Total:</span>
                    <strong>₹{(Number(selectedOrder.totalAmount || 0) + extendTotal).toFixed(2)}</strong>
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <button
                    className="primary-btn"
                    onClick={handleSendExtension}
                    disabled={!extendCart.length}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Send to Kitchen (New KOT) <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CLOSE TABLE CONFIRMATION (Requirement 7) */}
      {/* ========================================================================= */}
      {closeTableModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "480px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#d97706" }}>TABLE DINING COMPLETE</span>
                <h3>Complete Table {selectedOrder.tableNumber}?</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setCloseTableModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                This will complete dining on <strong>Table {selectedOrder.tableNumber}</strong> for order <strong>{selectedOrder.orderNumber}</strong>. The table will immediately become <strong>"Ready for Billing"</strong> on the Cashier & Accountant desk.
                <span style={{ display: "block", marginTop: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                  💡 <em>Note: As per restaurant policy, waiters do not generate or print final bills. The Cashier will generate and print the bill.</em>
                </span>
              </p>

              <div style={{ background: "var(--bg-surface-subtle)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "14px" }}>
                <div className="running-line"><span>Total Items:</span><strong>{(selectedOrder.items || []).reduce((sum, it) => sum + it.quantity, 0)}</strong></div>
                <div className="running-line"><span>Subtotal:</span><strong>₹{Number(selectedOrder.subtotal || selectedOrder.totalAmount * 0.9524 || 0).toFixed(2)}</strong></div>
                <div className="running-line"><span>GST (5%):</span><strong>₹{Number(selectedOrder.tax || selectedOrder.totalAmount * 0.0476 || 0).toFixed(2)}</strong></div>
                <div className="running-total-line"><span>Final Grand Total:</span><strong>₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong></div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="secondary-btn" onClick={() => setCloseTableModal(false)}>
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  onClick={handleExecuteCloseTable}
                  style={{ background: "#d97706", fontWeight: 700 }}
                >
                  <CheckCircle2 size={16} /> Complete Table (Ready for Billing)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PAYMENT SCREEN & FINAL BILL (Requirements 8, 9, 10) */}
      {/* ========================================================================= */}
      {paymentModal && selectedBill && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head no-print">
              <div>
                <span className="eyebrow">FINAL BILL & PAYMENT</span>
                <h3>Bill {selectedBill.billNumber} · Table {selectedBill.tableNumber}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", padding: "20px" }}>
              {/* Left Column: Professional Thermal Paper Receipt View */}
              <div className="thermal-bill-container">
                <ThermalReceiptView bill={selectedBill} organizationName={user?.organizationName} />
              </div>

              {/* Right Column: Payment Methods & Actions */}
              <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="panel" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span className="eyebrow" style={{ margin: 0 }}>PAYMENT STATUS</span>
                    <span className={`status ${selectedBill.paymentStatus === "Paid" ? "active" : "inactive"}`} style={{ fontSize: "12px" }}>
                      {selectedBill.paymentStatus || "UNPAID"}
                    </span>
                  </div>

                  <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px" }}>
                    ₹{Number(selectedBill.grandTotal || 0).toFixed(2)}
                  </div>

                  {selectedBill.paymentStatus !== "Paid" ? (
                    <>
                      <label className="field" style={{ marginBottom: "16px" }}>
                        <span>Select Payment Method</span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "6px" }}>
                          {["Cash", "Card", "UPI"].map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={`secondary-btn ${paymentMethod === m ? "active" : ""}`}
                              onClick={() => setPaymentMethod(m)}
                              style={{ justifyContent: "center", fontWeight: paymentMethod === m ? 700 : 500 }}
                            >
                              {m === "Card" ? <CreditCard size={15} /> : m === "UPI" ? <Store size={15} /> : <Receipt size={15} />}
                              {m}
                            </button>
                          ))}
                        </div>
                      </label>

                      <button
                        className="primary-btn"
                        onClick={handlePayBill}
                        style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "15px", background: "var(--accent-emerald)" }}
                      >
                        <Check size={18} /> PAY & CLOSE TABLE
                      </button>
                    </>
                  ) : (
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--accent-emerald)", padding: "12px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <strong style={{ color: "var(--accent-emerald)", display: "block", fontSize: "14px" }}>
                        ✓ Payment Complete via {selectedBill.paymentMethod}
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Table {selectedBill.tableNumber} is now AVAILABLE for new guests.
                      </span>
                    </div>
                  )}
                </div>

                {/* Print & Download Options */}
                <div className="panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span className="eyebrow">PRINTING & EXPORTS</span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="primary-btn"
                      onClick={() => printBillDocument(selectedBill, user?.organizationName)}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <Printer size={16} /> PRINT BILL (PDF)
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => downloadReceiptFile(selectedBill, user?.organizationName)}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <Download size={16} /> DOWNLOAD RECEIPT
                    </button>
                  </div>
                  <small style={{ color: "var(--text-muted)", fontSize: "11px", textAlign: "center" }}>
                    Compatible with 58mm / 80mm POS thermal printers and standard printers.
                  </small>
                </div>

                <div style={{ marginTop: "auto", textAlign: "right" }}>
                  <button className="secondary-btn" onClick={() => setPaymentModal(false)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PRINT KOT TICKET VIEW */}
      {/* ========================================================================= */}
      {printKOTModal && selectedKOTToPrint && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "420px" }}>
            <div className="modal-head no-print">
              <div>
                <span className="eyebrow">KITCHEN TICKET</span>
                <h3>Print {selectedKOTToPrint.kotNumber}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setPrintKOTModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <KOTTicketView kot={selectedKOTToPrint} />

              <div className="no-print" style={{ display: "flex", gap: "10px", marginTop: "16px", width: "100%" }}>
                <button
                  className="primary-btn"
                  onClick={() => window.print()}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Printer size={16} /> Print KOT Ticket
                </button>
                <button className="secondary-btn" onClick={() => setPrintKOTModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: ASSIGN WAITER TO TABLE (Requirement: Branch Manager assigns waiter) */}
      {/* ========================================================================= */}
      {assignModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "480px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-warm-gold)" }}>TABLE ALLOCATION</span>
                <h3>Assign Waiter to Dining Table</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAssignModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <label className="field">
                <span>Select Dining Table</span>
                <select
                  value={selectedTableForAssign}
                  onChange={(e) => {
                    setSelectedTableForAssign(e.target.value);
                    const current = getTableAssignment(e.target.value, tableAssignments);
                    setAssignWaiterId(current?.id ? String(current.id) : "");
                  }}
                >
                  <option value="">-- Choose Table to Assign --</option>
                  {tables.map((t) => {
                    const current = getTableAssignment(t.tableNumber, tableAssignments);
                    return (
                      <option key={t.tableNumber} value={t.tableNumber}>
                        Table {t.tableNumber} ({t.status}) {current ? `→ Assigned to ${current.name}` : "→ [Unassigned]"}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="field">
                <span>Assign Dedicated Waiter</span>
                <select
                  value={assignWaiterId}
                  onChange={(e) => setAssignWaiterId(e.target.value)}
                >
                  <option value="">-- None (Unassigned / Any Waiter) --</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      🤵 {w.fullName || w.username || w.email} ({w.email})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "12px 14px", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                🔔 <strong>Smart Waiter Notification:</strong> When the kitchen marks food ready for this table, ONLY this assigned waiter will receive the audio chime and ready ticket notification.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button className="secondary-btn" onClick={() => setAssignModal(false)}>
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  disabled={!selectedTableForAssign}
                  onClick={() => handleSaveAssignment(selectedTableForAssign, assignWaiterId)}
                  style={{ fontWeight: 700 }}
                >
                  Save Table Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: ADD DINING TABLE */}
      {/* ========================================================================= */}
      {addTableModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "440px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-emerald)" }}>FLOOR PLAN</span>
                <h3>Add New Dining Table</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAddTableModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTable} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <label className="field">
                <span>Table Name / Number</span>
                <input
                  type="text"
                  placeholder="e.g. T17, Outdoor 1, VIP 2..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  autoFocus
                  required
                />
              </label>

              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Quick Suggestions:
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[
                    `T${tables.length + 1}`,
                    `T${tables.length + 2}`,
                    "VIP 1",
                    "Outdoor 1",
                    "Patio 1",
                    "Terrace 1"
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="secondary-btn compact"
                      onClick={() => setNewTableName(sug)}
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setAddTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={!newTableName.trim()}
                  style={{ fontWeight: 700 }}
                >
                  <Plus size={16} /> Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: MANAGE & REMOVE TABLES */}
      {/* ========================================================================= */}
      {manageTablesModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "560px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-warm-gold)" }}>FLOOR PLAN</span>
                <h3>Manage Dining Tables</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setManageTablesModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Total: <strong>{tables.length}</strong> tables (<strong>{tables.filter((t) => t.status === "AVAILABLE").length}</strong> available, <strong>{tables.filter((t) => t.status === "OCCUPIED").length}</strong> occupied)
                </span>
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={() => {
                    setManageTablesModal(false);
                    setAddTableModal(true);
                  }}
                  style={{ fontSize: "12px" }}
                >
                  <Plus size={14} /> Add Table
                </button>
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", padding: "10px" }}>
                {tables.map((t) => {
                  const isOcc = t.status === "OCCUPIED";
                  return (
                    <div
                      key={t.tableNumber}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--bg-surface-subtle)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <strong style={{ fontSize: "14px" }}>Table {t.tableNumber}</strong>
                        <span className={`pos-table-badge ${isOcc ? "occupied" : "available"}`} style={{ fontSize: "10.5px", padding: "1px 6px" }}>
                          {t.status}
                        </span>
                        {isOcc && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            ({t.activeOrder?.orderNumber})
                          </span>
                        )}
                      </div>

                      <div>
                        {isOcc ? (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                            In service (active order)
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => handleRemoveTable(t.tableNumber)}
                            style={{ color: "var(--accent-rose)", borderColor: "rgba(239,68,68,0.3)", padding: "3px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            title={`Remove Table ${t.tableNumber}`}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-default)", paddingTop: "12px", marginTop: "4px" }}>
                <button
                  type="button"
                  className="secondary-btn compact"
                  onClick={handleResetTables}
                  style={{ color: "var(--text-muted)", fontSize: "11px" }}
                  title="Reset to default floor plan layout"
                >
                  <RefreshCw size={12} style={{ marginRight: "4px" }} /> Reset Default Layout
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setManageTablesModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KitchenPage({ user }) {
  const [kots, setKots] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [shortageModalKOT, setShortageModalKOT] = useState(null);
  const [pickupLoading, setPickupLoading] = useState({});

  const isPosOnly = user?.branchModuleType === "POS Only";
  const isKotPosOnly = (k) => isPosOnly || k?.branchModuleType === "POS Only";

  async function loadKOTs() {
    try {
      const data = await api.getKOTs();
      setKots(data);
      // Keep selected shortage modal data synced if open
      if (shortageModalKOT) {
        const updated = data.find((k) => k.id === shortageModalKOT.id);
        if (updated) {
          setShortageModalKOT(updated);
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadKOTs();
    const timer = setInterval(loadKOTs, 3000);
    return () => clearInterval(timer);
  }, [shortageModalKOT?.id]);

  async function handleStatus(kotId, status) {
    setError("");
    setMessage("");
    const targetKOT = kots.find((k) => k.id === kotId);
    if (!isKotPosOnly(targetKOT) && (status === "Preparing" || status === "Ready") && targetKOT?.hasInsufficientStock) {
      setError(`⚠️ Cannot mark ${targetKOT.kotNumber} as ${status}: Order has insufficient kitchen stock. Unresolved ingredients must be replenished before preparation.`);
      setShortageModalKOT(targetKOT);
      return;
    }

    try {
      await api.updateKOTStatus(kotId, status);
      setMessage(`KOT ticket ${targetKOT?.kotNumber || ""} marked as ${status}.`);
      await loadKOTs();
    } catch (e) {
      setError(e.message);
      if (!isKotPosOnly(targetKOT) && (targetKOT?.hasInsufficientStock || e.insufficientStock)) {
        setShortageModalKOT(targetKOT);
      }
    }
  }

  async function handlePickup(kotId) {
    if (pickupLoading[kotId]) return;
    setError("");
    setMessage("");
    const targetKOT = kots.find((k) => k.id === kotId);
    if (!targetKOT) return;
    if (targetKOT.status !== "Ready") {
      setError(`⚠️ Order ${targetKOT.kotNumber} must be marked 'Ready' before customer pickup.`);
      return;
    }

    setPickupLoading((prev) => ({ ...prev, [kotId]: true }));
    try {
      const res = await api.pickupKOT(kotId);
      setMessage(
        res.message ||
          `✓ Counter Order ${targetKOT.orderNumber} (${targetKOT.kotNumber}) confirmed as Picked Up / Completed!`
      );
      await loadKOTs();
    } catch (e) {
      setError(e.message || "Failed to confirm pickup.");
    } finally {
      setPickupLoading((prev) => ({ ...prev, [kotId]: false }));
    }
  }

  // Include Ready Counter Pickup orders in active queue so kitchen staff can confirm pickup on the same card
  const activeKOTs = kots.filter(
    (k) => k.status === "Pending" || k.status === "Preparing" || (k.saleType === "SELF_SERVICE" && k.status === "Ready")
  );
  const readyKOTs = kots.filter((k) => k.status === "Ready");

  return (
    <div className="page-grid">
      <div className="page-actions-row no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)" }}>
          Incoming tickets appear automatically. Extended orders generate new KOT tickets for newly added items.
        </p>
        <span className="count-chip">{activeKOTs.length} Active Tickets</span>
      </div>

      {error && <div className="error-box no-print">{error}</div>}
      {message && <div className="success-box no-print">🔔 {message}</div>}

      <div className="kitchen-grid no-print">
        {activeKOTs.length === 0 ? (
          <div className="panel empty-row" style={{ gridColumn: "1 / -1" }}>
            No active kitchen tickets. Waiting for orders...
          </div>
        ) : (
          activeKOTs.map((k) => (
            <div className="panel kitchen-card" key={k.id} style={{ borderLeft: k.saleType === "SELF_SERVICE" ? "4px solid #d97706" : undefined }}>
              <div className="kitchen-card-head">
                <div>
                  <span className="eyebrow">
                    {k.kotNumber} · ORDER {k.orderNumber}
                    {k.saleType === "SELF_SERVICE" && " · 🛍️ COUNTER"}
                  </span>
                  <h3>
                    {k.saleType === "SELF_SERVICE" || !k.tableNumber ? "🛍️ Counter Order" : `Table ${k.tableNumber}`}
                  </h3>
                  <small style={{ color: "var(--text-muted)", display: "block" }}>
                    Guest: {k.customerName || "Customer"} · {k.saleType === "SELF_SERVICE" ? "Cashier" : "Waiter"}: {k.waiterName || "Staff"}
                  </small>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  {k.status === "Ready" && k.saleType === "SELF_SERVICE" ? (
                    <span className="kds-status-ready-pickup">
                      <CheckCircle2 size={12} />
                      <span>Ready for Pickup</span>
                    </span>
                  ) : (
                    <span className={`status ${k.status === "Preparing" ? "active" : "inactive"}`}>
                      {k.status}
                    </span>
                  )}
                  {!isKotPosOnly(k) && k.hasInsufficientStock && (
                    <button
                      type="button"
                      className="kds-insufficient-stock-btn"
                      onClick={() => setShortageModalKOT(k)}
                      title="Click to view insufficient ingredient shortages"
                    >
                      <AlertTriangle size={13} />
                      <span>Insufficient Stock</span>
                    </button>
                  )}
                  {!isKotPosOnly(k) && k.stockResolved && (
                    <span className="kds-stock-resolved-tag" title="Stock is now available in kitchen">
                      <CheckCircle2 size={13} />
                      <span>Stock Ready</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="order-lines">
                {(k.items || []).map((i, idx) => (
                  <div className="order-line" key={i.id || idx}>
                    <strong>{i.menuItemName}</strong>
                    <b>× {i.quantity}</b>
                  </div>
                ))}
              </div>

              <div className="kitchen-actions">
                {k.status === "Pending" && (
                  <button
                    className="secondary-btn"
                    onClick={() => handleStatus(k.id, "Preparing")}
                    style={!isKotPosOnly(k) && k.hasInsufficientStock ? { borderColor: "var(--status-inactive-border)", color: "var(--status-inactive-text)" } : undefined}
                  >
                    Start Preparing
                  </button>
                )}
                {k.status !== "Ready" && (
                  <button
                    className="primary-btn compact"
                    onClick={() => handleStatus(k.id, "Ready")}
                    style={{ background: (!isKotPosOnly(k) && k.hasInsufficientStock) ? "rgba(180, 83, 9, 0.85)" : "var(--accent-emerald)" }}
                  >
                    Food Ready
                  </button>
                )}
                {k.status === "Ready" && k.saleType === "SELF_SERVICE" && (
                  <button
                    className="kds-picked-up-btn"
                    onClick={() => handlePickup(k.id)}
                    disabled={pickupLoading[k.id]}
                    title="Confirm customer counter pickup"
                  >
                    <CheckCircle2 size={16} />
                    <span>{pickupLoading[k.id] ? "Confirming..." : "Picked Up"}</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {readyKOTs.length > 0 && (
        <div className="panel no-print" style={{ marginTop: "24px" }}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">FOOD READY FOR PICKUP</span>
              <h3>Waiting for Pickup / Service ({readyKOTs.length})</h3>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", padding: "14px" }}>
            {readyKOTs.map((k) => (
              <div key={k.id} className="kot-ticket" style={{ borderLeft: "4px solid var(--accent-emerald)" }}>
                <div className="kot-ticket-head">
                  <strong>
                    {k.kotNumber} · {k.saleType === "SELF_SERVICE" || !k.tableNumber ? "🛍️ Counter Pickup" : `Table ${k.tableNumber}`}
                  </strong>
                  <span className="status active">READY</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {(k.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ")}
                </div>
                {k.saleType === "SELF_SERVICE" && (
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="primary-btn compact"
                      onClick={() => handlePickup(k.id)}
                      disabled={pickupLoading[k.id]}
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "5px" }}
                      title="Confirm customer counter pickup"
                    >
                      <CheckCircle2 size={14} />
                      <span>{pickupLoading[k.id] ? "Confirming..." : "Picked Up"}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSUFFICIENT INGREDIENTS MODAL (KDS SHORTAGE BREAKDOWN)                   */}
      {/* ========================================================================= */}
      {shortageModalKOT && !isKotPosOnly(shortageModalKOT) && (
        <div className="kds-shortage-modal-overlay" onClick={() => setShortageModalKOT(null)}>
          <div
            className="kds-shortage-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortage-modal-title"
          >
            <div className="modal-head" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="shortage-modal-icon-badge">
                  <AlertTriangle size={22} color="#f87171" />
                </div>
                <div>
                  <h2 id="shortage-modal-title" style={{ margin: 0, fontSize: "19px", color: "#fca5a5" }}>
                    Insufficient Ingredients
                  </h2>
                  <small style={{ color: "rgba(246, 243, 235, 0.75)" }}>
                    Ticket: <strong style={{ color: "#f6f3eb" }}>{shortageModalKOT.kotNumber}</strong> · Order: <strong style={{ color: "#f6f3eb" }}>{shortageModalKOT.orderNumber}</strong> · {shortageModalKOT.branchName || "Main Branch"}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShortageModalKOT(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px" }}>
              {/* Order Context Metadata Banner */}
              <div className="kds-shortage-meta-banner">
                <div className="meta-box">
                  <span className="meta-label">ORDER NUMBER</span>
                  <strong className="meta-val">{shortageModalKOT.orderNumber}</strong>
                </div>
                <div className="meta-box">
                  <span className="meta-label">TICKET</span>
                  <strong className="meta-val">{shortageModalKOT.kotNumber}</strong>
                </div>
                <div className="meta-box">
                  <span className="meta-label">TABLE / SERVICE</span>
                  <strong className="meta-val">
                    {shortageModalKOT.saleType === "SELF_SERVICE" || !shortageModalKOT.tableNumber
                      ? "🛍️ Counter Sale"
                      : `Table ${shortageModalKOT.tableNumber}`}
                  </strong>
                </div>
                <div className="meta-box">
                  <span className="meta-label">LOCATION</span>
                  <strong className="meta-val">
                    {shortageModalKOT.kitchenLocation || "Main Kitchen"}
                  </strong>
                </div>
              </div>

              {/* Order Items Chips */}
              <div style={{ margin: "16px 0 12px" }}>
                <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)", fontSize: "11px", fontWeight: "700" }}>ORDER ITEMS</span>
                <div className="kds-order-items-chip-row">
                  {(shortageModalKOT.items || []).map((it, idx) => (
                    <span key={it.id || idx} className="kds-item-chip">
                      <strong>{it.menuItemName}</strong> × {it.quantity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Insufficient Ingredients Breakdown Table */}
              <div style={{ margin: "16px 0 8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="eyebrow" style={{ color: "#fca5a5", fontSize: "11px", fontWeight: "700" }}>
                    INSUFFICIENT INGREDIENTS BREAKDOWN ({shortageModalKOT.shortages?.length || 0})
                  </span>
                  <span className="kds-status-awaiting-badge">
                    {shortageModalKOT.hasInsufficientStock ? "Awaiting Stock Resolution" : "Stock Resolved"}
                  </span>
                </div>

                {(!shortageModalKOT.shortages || shortageModalKOT.shortages.length === 0) ? (
                  <div className="empty-row" style={{ padding: "16px", color: "var(--accent-emerald)" }}>
                    ✓ All recipe ingredients are currently available in Kitchen Stock!
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="kds-shortage-table">
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th style={{ textAlign: "right" }}>Required</th>
                          <th style={{ textAlign: "right" }}>Available</th>
                          <th style={{ textAlign: "right", color: "#fca5a5" }}>Shortage</th>
                          <th style={{ textAlign: "center" }}>Unit</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortageModalKOT.shortages.map((s, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong style={{ color: "#ffffff" }}>{s.itemName || s.ingredientName}</strong>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "600", color: "#f6f3eb" }}>
                              {s.formattedRequired || `${s.required} ${s.unit}`}
                            </td>
                            <td style={{ textAlign: "right", color: s.available <= 0 ? "#f87171" : "#fde047", fontWeight: "600" }}>
                              {s.formattedAvailable || `${s.available} ${s.unit}`}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700", color: "#f87171" }}>
                              {s.formattedShortage || `${s.shortage} ${s.unit}`}
                            </td>
                            <td style={{ textAlign: "center", color: "#e2e8f0" }}>
                              {s.unit}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="shortage-danger-tag">
                                Deficit: -{s.formattedShortage || `${s.shortage} ${s.unit}`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Resolution Guidance Box */}
              <div className="kds-resolution-guidance">
                <AlertCircle size={18} color="#e5be53" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.85)", lineHeight: "1.45" }}>
                  <strong>How to resolve:</strong> Kitchen staff or Store Manager should replenish these ingredients via <strong>Purchase / GRN</strong>, <strong>Central Inventory Transfer</strong>, or <strong>Kitchen Stock Issue</strong>. Once stock is updated, KDS will automatically clear this alert and allow preparation.
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShortageModalKOT(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersMonitor({ user }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setOrders(await api.getOrders());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page-grid">

      {error && <div className="error-box no-print">{error}</div>}

      <div className="panel no-print">
        <div className="panel-head">
          <div>
            <span className="eyebrow">LIVE DATA</span>
            <h3>All Branch Orders</h3>
          </div>
          <RefreshCw size={18} style={{ cursor: "pointer" }} onClick={load} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order No</th>
                <th>Channel / Table</th>
                <th>Customer</th>
                <th>Waiter / Cashier</th>
                <th>Items</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-row">No orders found.</div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.orderNumber}</strong>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td>
                      {o.saleType === "SELF_SERVICE" ? (
                        <span style={{
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "var(--accent-emerald)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11.5px",
                          fontWeight: 700
                        }}>
                          🛍️ Counter
                        </span>
                      ) : (
                        <span style={{ fontWeight: 600 }}>
                          🍽️ Table {o.tableNumber || "—"}
                        </span>
                      )}
                    </td>
                    <td>{o.customerName || "—"}</td>
                    <td>{o.waiterName || "Staff"}</td>
                    <td>{(o.items || []).map((i) => `${i.menuItemName} × ${i.quantity}`).join(", ")}</td>
                    <td>
                      <span className={`status ${o.status === "Closed" || o.status === "Paid" ? "inactive" : "active"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <strong>₹{Number(o.totalAmount).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashierBillingPage({ user = {}, onNavigate }) {
  const [activeViewTab, setActiveViewTab] = useState("counter"); // "counter" | "ready" | "history"
  const [billingModeDropdownOpen, setBillingModeDropdownOpen] = useState(false);
  const [selectedBillingMode, setSelectedBillingMode] = useState("counter");
  const billingDropdownRef = useRef(null);

  const currentBillingMode = activeViewTab === "ready" ? "ready" : (activeViewTab === "counter" ? "counter" : selectedBillingMode);

  useEffect(() => {
    function handleClickOutside(e) {
      if (billingDropdownRef.current && !billingDropdownRef.current.contains(e.target)) {
        setBillingModeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectBillingMode(mode) {
    setSelectedBillingMode(mode);
    setActiveViewTab(mode);
    setBillingModeDropdownOpen(false);
  }

  // =========================================================================
  // 1. SELF-SERVICE / COUNTER SALE POS STATE
  // =========================================================================
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [posSearch, setPosSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState(null);
  const [counterCustomerName, setCounterCustomerName] = useState("");
  const [counterPaymentMethod, setCounterPaymentMethod] = useState("Cash");
  const [counterDiscount, setCounterDiscount] = useState("");
  const [counterCashTendered, setCounterCashTendered] = useState("");
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [heldCarts, setHeldCarts] = useState([]);

  const searchRef = useRef(null);
  const cashInputRef = useRef(null);

  // =========================================================================
  // 2. ACTIVE TABLE SERVICE BILLING DESK STATE (Mode 1)
  // =========================================================================
  const [tables, setTables] = useState([]);
  const [selectedTableNumber, setSelectedTableNumber] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [autoMarkPaid, setAutoMarkPaid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [billingInProgress, setBillingInProgress] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [printedBill, setPrintedBill] = useState(null);
  const [recentBills, setRecentBills] = useState([]);

  // =========================================================================
  // 3. CASHIER SHIFT & REGISTER STATE
  // =========================================================================
  const [openingCash, setOpeningCash] = useState(() => {
    return Number(localStorage.getItem(`samaya_opening_cash_${user.id || 0}`)) || 0;
  });
  const [actualCash, setActualCash] = useState("");
  const [shiftData, setShiftData] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // =========================================================================
  // 4. PREVIOUS BILLS & VOID STATE
  // =========================================================================
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("All");
  const [billSaleTypeFilter, setBillSaleTypeFilter] = useState("All");
  const [billBranchId, setBillBranchId] = useState(user.branchId ? String(user.branchId) : "");
  const [billDatePreset, setBillDatePreset] = useState("all");
  const [billDateFrom, setBillDateFrom] = useState("");
  const [billDateTo, setBillDateTo] = useState("");
  const [viewingBill, setViewingBill] = useState(null);
  const [branches, setBranches] = useState([]);

  // Void Bill Modal State
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [billToVoid, setBillToVoid] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const canVoid = ["Super Admin", "Organization Admin", "Branch Manager", "Accountant"].includes(user.role);

  // Use synchronous ref lock to guarantee idempotency and prevent double-billing on rapid Enter/Spacebar presses
  const isGeneratingRef = useRef(false);

  // Load available branches for multi-branch users (Organization Admin / Super Admin)
  useEffect(() => {
    if (!user.branchId || user.role === "Organization Admin" || user.role === "Super Admin") {
      api.getBranches().then((b) => setBranches(Array.isArray(b) ? b : [])).catch(() => {});
    }
  }, [user.branchId, user.role]);

  // Load Menu for Counter Sales
  async function loadMenu() {
    setMenuLoading(true);
    try {
      const data = await api.getMenu(user.branchId);
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading menu:", e);
    } finally {
      setMenuLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, [user.branchId]);

  // Load Tables for Table Service Billing
  async function loadTables() {
    try {
      const data = await api.getTables(user.branchId);
      setTables(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading tables:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 4000);
    return () => clearInterval(interval);
  }, [user.branchId]);

  // Load Previous Bills from backend
  async function loadBills() {
    setBillsLoading(true);
    try {
      const params = {};
      if (billBranchId) params.branchId = billBranchId;
      else if (user.branchId) params.branchId = user.branchId;
      if (billSearch.trim()) params.search = billSearch.trim();
      if (billStatusFilter !== "All") params.paymentStatus = billStatusFilter;
      if (billSaleTypeFilter !== "All") params.saleType = billSaleTypeFilter;
      if (billDateFrom) params.from = billDateFrom;
      if (billDateTo) params.to = billDateTo;

      const data = await api.getBills(params);
      setBills(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading bills:", e);
    } finally {
      setBillsLoading(false);
    }
  }

  useEffect(() => {
    loadBills();
  }, [user.branchId, billBranchId, billStatusFilter, billSaleTypeFilter, billDateFrom, billDateTo]);

  // Load Cashier Shift Data
  async function loadShift() {
    setShiftLoading(true);
    try {
      const data = await api.getCashierShift({
        branchId: user.branchId,
        openingCash: Number(openingCash) || 0,
        actualCash: actualCash !== "" ? Number(actualCash) : null
      });
      setShiftData(data);
    } catch (err) {
      console.error("Error loading shift:", err);
    } finally {
      setShiftLoading(false);
    }
  }

  useEffect(() => {
    if (activeViewTab === "shift") {
      loadShift();
    }
  }, [activeViewTab, openingCash, actualCash, user.branchId]);

  function applyDatePreset(preset) {
    setBillDatePreset(preset);
    const now = new Date();
    if (preset === "today") {
      const todayStr = getLocalDateString(now);
      setBillDateFrom(todayStr);
      setBillDateTo(todayStr);
    } else if (preset === "week") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setBillDateFrom(getLocalDateString(past));
      setBillDateTo(getLocalDateString(now));
    } else if (preset === "month") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setBillDateFrom(getLocalDateString(past));
      setBillDateTo(getLocalDateString(now));
    } else {
      setBillDateFrom("");
      setBillDateTo("");
    }
  }

  // Categories extraction for POS
  const categories = useMemo(() => {
    const defaultOrder = ["All", "Breakfast", "Lunch", "Dinner", "Snacks", "Beverages", "Rice", "Biryani", "Tiffin"];
    const found = new Set();
    (menuItems || []).forEach((m) => {
      if (m.category && m.category.trim()) found.add(m.category.trim());
    });
    const result = ["All"];
    defaultOrder.slice(1).forEach((cat) => {
      if (found.has(cat)) {
        result.push(cat);
        found.delete(cat);
      }
    });
    Array.from(found).sort().forEach((cat) => result.push(cat));
    return result;
  }, [menuItems]);

  // Filtered menu items for POS
  const filteredMenuItems = useMemo(() => {
    let list = menuItems || [];
    if (selectedCategory !== "All") {
      list = list.filter((m) => (m.category || "").toLowerCase() === selectedCategory.toLowerCase());
    }
    if (posSearch.trim()) {
      const q = posSearch.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.name || "").toLowerCase().includes(q) ||
          (m.category || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [menuItems, selectedCategory, posSearch]);

  // Counter Cart Operations
  function addToCart(menuItem) {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.menuItemId === menuItem.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        const updatedQty = copy[existingIndex].quantity + 1;
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: updatedQty,
          lineTotal: updatedQty * copy[existingIndex].unitPrice
        };
        setSelectedCartItemIndex(existingIndex);
        return copy;
      } else {
        const newIt = {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          unitPrice: Number(menuItem.price || 0),
          quantity: 1,
          lineTotal: Number(menuItem.price || 0)
        };
        setSelectedCartItemIndex(prev.length);
        return [...prev, newIt];
      }
    });
  }

  function updateCartQty(index, delta) {
    setCart((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
        setSelectedCartItemIndex(copy.length > 0 ? Math.min(index, copy.length - 1) : null);
        return copy;
      }
      copy[index] = {
        ...copy[index],
        quantity: newQty,
        lineTotal: newQty * copy[index].unitPrice
      };
      return copy;
    });
  }

  function removeFromCart(index) {
    setCart((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      setSelectedCartItemIndex(copy.length > 0 ? Math.min(index, copy.length - 1) : null);
      return copy;
    });
  }

  function clearCart() {
    setCart([]);
    setSelectedCartItemIndex(null);
    setCounterCustomerName("");
    setCounterDiscount("");
    setCounterCashTendered("");
    setPosSearch("");
  }

  function handleHoldOrder() {
    if (cart.length === 0) return;
    const newHeld = {
      id: Date.now(),
      customerName: counterCustomerName || `Hold #${heldCarts.length + 1}`,
      items: [...cart],
      discount: counterDiscount,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setHeldCarts((prev) => [newHeld, ...prev]);
    clearCart();
    setSuccess(`✓ Order held for ${newHeld.customerName}`);
  }

  function handleResumeHeldOrder(held) {
    setCart(held.items);
    setCounterCustomerName(held.customerName.startsWith("Hold #") ? "" : held.customerName);
    setCounterDiscount(held.discount || "");
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setSelectedCartItemIndex(0);
  }

  // Counter Financial calculations
  const counterSubtotal = useMemo(() => {
    return cart.reduce((s, it) => s + (it.unitPrice * it.quantity), 0);
  }, [cart]);

  const counterDiscountNum = useMemo(() => {
    const d = Number(counterDiscount) || 0;
    return Math.min(counterSubtotal, Math.max(0, d));
  }, [counterDiscount, counterSubtotal]);

  const counterTaxable = Math.max(0, counterSubtotal - counterDiscountNum);
  const counterTax = Math.round(counterTaxable * 0.05 * 100) / 100;
  const counterCgst = Math.round((counterTax / 2) * 100) / 100;
  const counterSgst = Math.round((counterTax - counterCgst) * 100) / 100;
  const counterGrandTotal = Math.round((counterTaxable + counterTax) * 100) / 100;
  const counterCashTenderedNum = Number(counterCashTendered) || 0;
  const counterChange = Math.max(0, counterCashTenderedNum - counterGrandTotal);

  // Complete Self-Service Counter Sale
  async function handleCompleteCounterSale() {
    if (cart.length === 0) {
      setError("Please add at least one menu item to the order.");
      return;
    }
    if (counterSubmitting) return;

    setCounterSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        branchId: user.branchId || null,
        customerName: counterCustomerName.trim() || "Counter Guest",
        paymentMethod: counterPaymentMethod,
        amountTendered: counterPaymentMethod === "Cash" && counterCashTenderedNum > 0 ? counterCashTenderedNum : (counterPaymentMethod === "Cash" ? counterGrandTotal : null),
        discount: counterDiscountNum > 0 ? counterDiscountNum : null,
        items: cart.map((it) => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }))
      };

      const res = await api.createCounterSale(payload);
      const billData = res.bill || res;

      // Automatically print thermal bill
      setPrintedBill(billData);
      setRecentBills((prev) => [billData, ...prev.filter((b) => b.id !== billData.id).slice(0, 9)]);
      printBillDocument(billData, user.organizationName);

      const changeNote = billData.changeGiven > 0 ? ` | Change: ₹${Number(billData.changeGiven).toFixed(2)}` : "";
      setSuccess(`✓ Counter Sale ${billData.billNumber} completed & sent to print! Total: ₹${Number(billData.grandTotal).toFixed(2)}${changeNote}`);

      // Auto-reset POS for next customer
      clearCart();
      loadBills();
      if (activeViewTab === "shift") loadShift();
    } catch (err) {
      setError(err.message || "Failed to process counter sale.");
    } finally {
      setCounterSubmitting(false);
    }
  }

  // Keyboard Shortcuts for Fast Counter POS Billing (Requirement 3)
  useEffect(() => {
    if (activeViewTab !== "counter") return;

    function handlePOSKeyDown(e) {
      const tag = e.target?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      // F2: Focus item search
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // F4: Trigger / jump to payment
      if (e.key === "F4") {
        e.preventDefault();
        if (counterPaymentMethod === "Cash") {
          cashInputRef.current?.focus();
          cashInputRef.current?.select();
        } else if (cart.length > 0) {
          handleCompleteCounterSale();
        }
        return;
      }

      // F8: Hold current order
      if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0) handleHoldOrder();
        return;
      }

      // ESC: Clear / cancel
      if (e.key === "Escape") {
        if (isInput) {
          e.target.blur();
        } else if (posSearch) {
          setPosSearch("");
        }
        return;
      }

      // ENTER:
      if (e.key === "Enter" && !e.shiftKey) {
        if (document.activeElement === searchRef.current && filteredMenuItems.length > 0) {
          e.preventDefault();
          addToCart(filteredMenuItems[0]);
          setPosSearch("");
          return;
        }
        if (document.activeElement === cashInputRef.current && cart.length > 0) {
          e.preventDefault();
          handleCompleteCounterSale();
          return;
        }
        if (!isInput && cart.length > 0) {
          e.preventDefault();
          handleCompleteCounterSale();
          return;
        }
      }

      // Shortcuts below only active when NOT typing in an input
      if (isInput) return;

      // + or = to increase qty
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        if (selectedCartItemIndex !== null && cart.length > 0) {
          updateCartQty(selectedCartItemIndex, 1);
        } else if (cart.length > 0) {
          updateCartQty(cart.length - 1, 1);
        }
      }
      // - or _ to decrease qty
      else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        if (selectedCartItemIndex !== null && cart.length > 0) {
          updateCartQty(selectedCartItemIndex, -1);
        } else if (cart.length > 0) {
          updateCartQty(cart.length - 1, -1);
        }
      }
      // DELETE or BACKSPACE to remove item
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedCartItemIndex !== null && cart.length > 0) {
          removeFromCart(selectedCartItemIndex);
        } else if (cart.length > 0) {
          removeFromCart(cart.length - 1);
        }
      }
    }

    window.addEventListener("keydown", handlePOSKeyDown);
    return () => window.removeEventListener("keydown", handlePOSKeyDown);
  }, [activeViewTab, cart, selectedCartItemIndex, posSearch, filteredMenuItems, counterPaymentMethod, counterCashTenderedNum, counterGrandTotal, counterSubmitting]);

  // Filter bills in-memory by search term & sale type
  const filteredBills = useMemo(() => {
    let list = bills;
    if (billSaleTypeFilter !== "All") {
      list = list.filter((b) => (b.saleType || "TABLE_SERVICE") === billSaleTypeFilter);
    }
    if (!billSearch.trim()) return list;
    const q = billSearch.trim().toLowerCase();
    return list.filter(
      (b) =>
        (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
        (b.tableNumber && b.tableNumber.toLowerCase().includes(q)) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.orderNumber && b.orderNumber.toLowerCase().includes(q)) ||
        (b.waiterName && b.waiterName.toLowerCase().includes(q))
    );
  }, [bills, billSearch, billSaleTypeFilter]);

  // Tables ready for billing queue (Table Service)
  const readyTables = useMemo(() => {
    return (tables || []).filter(
      (t) => t.isReadyForBilling || t.status === "READY_FOR_BILLING" || t.activeOrder?.status === "Ready for Billing"
    );
  }, [tables]);

  // Keep selected table in sync
  useEffect(() => {
    if (readyTables.length > 0) {
      if (!selectedTableNumber || !readyTables.some((t) => t.tableNumber === selectedTableNumber)) {
        setSelectedTableNumber(readyTables[0].tableNumber);
      }
    } else {
      setSelectedTableNumber(null);
    }
  }, [readyTables, selectedTableNumber]);

  // Active selected table & order
  const currentTable = useMemo(() => {
    return readyTables.find((t) => t.tableNumber === selectedTableNumber) || null;
  }, [readyTables, selectedTableNumber]);

  const order = currentTable?.activeOrder || null;
  const items = order?.items || [];

  // Financial calculations for Table Service
  const subtotal = useMemo(() => {
    if (!order) return 0;
    if (Number(order.subtotal) > 0) return Number(order.subtotal);
    return items.reduce((sum, it) => sum + Number(it.lineTotal || (it.unitPrice * it.quantity)), 0);
  }, [order, items]);

  const discountNum = useMemo(() => {
    const d = Number(discount) || 0;
    return Math.min(subtotal, Math.max(0, d));
  }, [discount, subtotal]);

  const taxableAmount = Math.max(0, subtotal - discountNum);
  const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
  const cgst = Math.round((tax / 2) * 100) / 100;
  const sgst = Math.round((tax - cgst) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + tax) * 100) / 100;

  // Generate & Print Bill execution (Table Service)
  async function handleGenerateAndPrintBill() {
    if (isGeneratingRef.current) {
      console.log("Bill generation already in progress. Ignoring duplicate trigger.");
      return;
    }

    if (!currentTable || !order) {
      setError("Please select a table ready for billing.");
      return;
    }

    isGeneratingRef.current = true;
    setBillingInProgress(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.generateBill(order.id, discountNum > 0 ? discountNum : null);
      let billData = res.bill || res;

      if (autoMarkPaid && billData.id) {
        try {
          await api.payBill(billData.id, paymentMethod);
          billData = { ...billData, paymentStatus: "PAID", paymentMethod };
        } catch (payErr) {
          console.warn("Auto payment note:", payErr);
        }
      }

      setPrintedBill(billData);
      setRecentBills((prev) => [billData, ...prev.filter((b) => b.id !== billData.id).slice(0, 9)]);

      printBillDocument(billData, user.organizationName);

      setSuccess(`✓ Bill ${billData.billNumber} generated & sent to print for Table ${currentTable.tableNumber}! Total: ₹${Number(billData.grandTotal).toFixed(2)}`);
      setDiscount(0);

      await loadTables();
      loadBills();
    } catch (err) {
      setError(err.message || "Failed to generate bill.");
    } finally {
      isGeneratingRef.current = false;
      setBillingInProgress(false);
    }
  }

  // Keyboard shortcut listener for ENTER and SPACEBAR (Table Service desk)
  useEffect(() => {
    function handleKeyDown(e) {
      if (activeViewTab !== "ready") return;
      const isEnter = e.key === "Enter" || e.code === "Enter";
      const isSpace = e.key === " " || e.code === "Space";
      if (!isEnter && !isSpace) return;

      const tag = e.target?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      if (isInput && isSpace) return;

      e.preventDefault();

      if (!currentTable || isGeneratingRef.current) return;

      handleGenerateAndPrintBill();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeViewTab, currentTable, order, discountNum, autoMarkPaid, paymentMethod]);

  function handleReprintBill(bill) {
    setPrintedBill(bill);
    printBillDocument(bill, user.organizationName);
  }

  // Settle a pending bill
  async function handleSettleBill(billId, method = "Cash") {
    try {
      await api.payBill(billId, method);
      setSuccess(`✓ Bill payment recorded successfully via ${method}!`);
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, paymentStatus: "Paid", paymentMethod: method } : b))
      );
      if (viewingBill && viewingBill.id === billId) {
        setViewingBill((prev) => ({ ...prev, paymentStatus: "Paid", paymentMethod: method }));
      }
      loadTables();
    } catch (err) {
      setError(err.message || "Failed to record payment.");
    }
  }

  // Void Bill Execution
  async function handleExecuteVoidBill() {
    if (!billToVoid) return;
    if (!voidReason.trim()) {
      setError("Please enter a reason for voiding this bill.");
      return;
    }
    setVoidSubmitting(true);
    setError("");
    try {
      await api.voidBill(billToVoid.id, voidReason.trim());
      setSuccess(`✓ Bill ${billToVoid.billNumber} has been voided.`);
      setVoidModalOpen(false);
      setBillToVoid(null);
      setVoidReason("");
      loadBills();
      if (viewingBill && viewingBill.id === billToVoid.id) {
        setViewingBill((prev) => ({
          ...prev,
          paymentStatus: "Voided",
          voidReason: voidReason.trim(),
          voidedAt: new Date().toISOString()
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to void bill.");
    } finally {
      setVoidSubmitting(false);
    }
  }

  return (
    <div className="page-grid">
      {/* Printable Area - Rendered only during print */}
      <div className="thermal-receipt-print-area">
        <ThermalReceiptView bill={printedBill} organizationName={user.organizationName} />
      </div>

      {error && <div className="error-box no-print" style={{ margin: 0 }}>{error}</div>}
      {success && (
        <div className="error-box no-print" style={{ background: "rgba(16, 185, 129, 0.12)", borderColor: "var(--accent-emerald)", color: "var(--accent-emerald)", margin: 0 }}>
          {success}
        </div>
      )}

      {/* Main Tab Navigation & Actions Header Bar */}
      <div className="billing-actions-bar no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        {/* Main Tab Navigation: Billing Mode Dropdown & Previous Bills Archive */}
        <div className="billing-subtabs-nav no-print" style={{ margin: 0, flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        {/* Billing Mode Dropdown Selector */}
        <div className="billing-mode-dropdown-wrapper" ref={billingDropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            id="billing-mode-dropdown-btn"
            className={`billing-subtab-btn billing-mode-dropdown-trigger ${
              (activeViewTab === "counter" || activeViewTab === "ready") ? "active" : ""
            }`}
            onClick={() => setBillingModeDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={billingModeDropdownOpen}
            aria-label="Billing Mode"
            title="Select Billing Mode"
            style={{ fontWeight: 700 }}
          >
            {currentBillingMode === "ready" ? (
              <Zap size={16} style={{ color: (activeViewTab === "ready" || activeViewTab === "counter") ? "var(--accent-emerald)" : undefined }} />
            ) : (
              <ShoppingCart size={16} style={{ color: (activeViewTab === "ready" || activeViewTab === "counter") ? "var(--accent-emerald)" : undefined }} />
            )}
            <span className="billing-mode-prefix" style={{ color: "var(--text-muted)", fontWeight: 600 }}>Billing Mode:</span>
            <span className="billing-mode-selected-text">
              {currentBillingMode === "ready" ? "Table Service Billing" : "Self-Service / Counter Sale (POS)"}
            </span>
            {currentBillingMode === "counter" && cart.length > 0 && (
              <span className="billing-subtab-badge" style={{ background: "var(--accent-emerald)", color: "#fff" }}>
                {cart.length}
              </span>
            )}
            {currentBillingMode === "ready" && readyTables.length > 0 && (
              <span className="billing-subtab-badge">
                {readyTables.length}
              </span>
            )}
            <ChevronDown
              size={14}
              style={{
                marginLeft: "2px",
                transition: "transform 0.2s ease",
                transform: billingModeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)"
              }}
            />
          </button>

          {/* Accessible Select for Form / Automation Support */}
          <select
            name="billingMode"
            aria-label="Billing Mode"
            value={currentBillingMode}
            onChange={(e) => handleSelectBillingMode(e.target.value)}
            tabIndex={-1}
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              border: 0,
              opacity: 0,
              pointerEvents: "none"
            }}
          >
            <option value="counter">Self-Service / Counter Sale (POS)</option>
            <option value="ready">Table Service Billing</option>
          </select>

          {/* Custom Dropdown Menu */}
          {billingModeDropdownOpen && (
            <div
              className="billing-mode-dropdown-menu"
              role="listbox"
              aria-label="Billing Mode Options"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: "290px",
                background: "var(--bg-surface)",
                border: "1.5px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.18)",
                padding: "6px",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              {/* Option 1: Self-Service / Counter Sale (POS) */}
              <button
                type="button"
                role="option"
                aria-selected={activeViewTab === "counter"}
                className={`billing-dropdown-option ${
                  (activeViewTab === "counter" || (activeViewTab !== "ready" && currentBillingMode === "counter")) ? "selected" : ""
                }`}
                onClick={() => handleSelectBillingMode("counter")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid transparent",
                  background: activeViewTab === "counter" ? "var(--bg-surface-subtle)" : "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.15s ease",
                  borderColor: activeViewTab === "counter" ? "var(--brand-gold, #c99824)" : "transparent"
                }}
              >
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: activeViewTab === "counter" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-surface-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <ShoppingCart size={16} style={{ color: "var(--accent-emerald)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                    Self-Service / Counter Sale (POS)
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                    Fast counter ordering, cart & instant payment
                  </div>
                </div>
                {cart.length > 0 && (
                  <span className="billing-subtab-badge" style={{ background: "var(--accent-emerald)", color: "#fff" }}>
                    {cart.length}
                  </span>
                )}
                {activeViewTab === "counter" && (
                  <Check size={16} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
                )}
              </button>

              {/* Option 2: Table Service Billing */}
              <button
                type="button"
                role="option"
                aria-selected={activeViewTab === "ready"}
                className={`billing-dropdown-option ${
                  (activeViewTab === "ready" || (activeViewTab !== "counter" && currentBillingMode === "ready")) ? "selected" : ""
                }`}
                onClick={() => handleSelectBillingMode("ready")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid transparent",
                  background: activeViewTab === "ready" ? "var(--bg-surface-subtle)" : "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.15s ease",
                  borderColor: activeViewTab === "ready" ? "var(--brand-gold, #c99824)" : "transparent"
                }}
              >
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: activeViewTab === "ready" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-surface-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Zap size={16} style={{ color: "var(--accent-emerald)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                    Table Service Billing
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                    Dine-in tables ready for final invoicing
                  </div>
                </div>
                {readyTables.length > 0 && (
                  <span className="billing-subtab-badge">
                    {readyTables.length}
                  </span>
                )}
                {activeViewTab === "ready" && (
                  <Check size={16} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Separate Option: Previous Bills & Invoices Archive */}
        <button
          type="button"
          id="previous-bills-archive-btn"
          className={`billing-subtab-btn ${activeViewTab === "history" ? "active" : ""}`}
          onClick={() => {
            setActiveViewTab("history");
            setBillingModeDropdownOpen(false);
            loadBills();
          }}
        >
          <Receipt size={16} style={{ color: activeViewTab === "history" ? "var(--accent-emerald)" : undefined }} />
          <span>Previous Bills & Invoices Archive</span>
          <span className="billing-subtab-badge">{bills.length}</span>
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {activeViewTab === "ready" ? (
          <div className="ready-billing-chip" style={{ fontSize: "13px", padding: "6px 12px" }}>
            <span className="pulse-dot" /> {readyTables.length} Table{readyTables.length === 1 ? "" : "s"} Ready for Billing
          </div>
        ) : (
          <div className="ready-billing-chip" style={{ fontSize: "13px", padding: "6px 12px", background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <FileText size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            {bills.length} Total Historical Bill{bills.length === 1 ? "" : "s"}
          </div>
        )}
        <button className="secondary-btn" onClick={() => { loadTables(); loadBills(); }} title="Refresh data">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
    </div>

      {/* ========================================================================= */}
      {/* TAB: SELF-SERVICE / COUNTER SALE FAST POS (Mode 2)                        */}
      {/* ========================================================================= */}
      {activeViewTab === "counter" && (
        <>
          {/* Keyboard Shortcut Guidance Banner */}
          <div className="keyboard-shortcut-banner no-print">
            <Sparkles size={18} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: "12px", lineHeight: 1.5 }}>
              <strong>⚡ FAST COUNTER BILLING SHORTCUTS:</strong>{" "}
              <kbd>F2</kbd> Search Menu &nbsp;|&nbsp;
              <kbd>F4</kbd> Pay / Tender &nbsp;|&nbsp;
              <kbd>ENTER</kbd> Confirm &amp; Print &nbsp;|&nbsp;
              <kbd>+</kbd> / <kbd>-</kbd> Qty &nbsp;|&nbsp;
              <kbd>DEL</kbd> Remove &nbsp;|&nbsp;
              <kbd>F8</kbd> Hold Order &nbsp;|&nbsp;
              <kbd>ESC</kbd> Cancel
            </div>
            {heldCarts.length > 0 && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-amber)" }}>Held Orders:</span>
                {heldCarts.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="secondary-btn compact"
                    onClick={() => handleResumeHeldOrder(h)}
                    style={{ fontSize: "11px", borderColor: "var(--accent-amber)", color: "var(--accent-amber)" }}
                    title={`Resume ${h.customerName} (${h.items.length} items)`}
                  >
                    Resume {h.customerName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pos-layout no-print">
            {/* Left Area: Search, Categories & Menu Grid */}
            <div className="pos-main-section">
              <div className="pos-toolbar-card">
                {/* Search Bar */}
                <div className="pos-search-wrapper">
                  <Search size={18} />
                  <input
                    ref={searchRef}
                    type="text"
                    className="pos-search-input"
                    placeholder="Search menu items (e.g., Biryani, Dosa, Tea)... (Press F2)"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                  />
                  <span className="pos-search-kbd">F2</span>
                </div>

                {/* Categories Bar */}
                <div className="pos-categories-nav">
                  {categories.map((cat) => {
                    const count = cat === "All"
                      ? (menuItems || []).length
                      : (menuItems || []).filter((m) => (m.category || "").toLowerCase() === cat.toLowerCase()).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`pos-category-btn ${selectedCategory === cat ? "active" : ""}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <span>{cat}</span>
                        <span className="pos-category-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="pos-menu-grid">
                {menuLoading ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    <RefreshCw size={24} className="spin" style={{ display: "block", margin: "0 auto 8px" }} />
                    Loading menu items...
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border-default)" }}>
                    <Utensils size={36} style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                    <strong>No menu items match your search.</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "13px" }}>Try selecting another category or clear the search filter.</p>
                  </div>
                ) : (
                  filteredMenuItems.map((m) => {
                    const inCartCount = cart.find((i) => i.menuItemId === m.id)?.quantity || 0;
                    return (
                      <div
                        key={m.id}
                        className="pos-item-card"
                        onClick={() => addToCart(m)}
                        title={`Click to add ${m.name} to order`}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                            <div className="pos-item-name">{m.name}</div>
                            {inCartCount > 0 && (
                              <span style={{
                                background: "var(--accent-emerald)",
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: 800,
                                borderRadius: "10px",
                                padding: "1px 6px"
                              }}>
                                {inCartCount}
                              </span>
                            )}
                          </div>
                          <span className="pos-item-category">{m.category || "General"}</span>
                        </div>
                        <div className="pos-item-footer">
                          <span className="pos-item-price">₹{Number(m.price || 0).toFixed(0)}</span>
                          <span className="pos-item-add-badge">+</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Area: Fast POS Order Panel */}
            <div className="pos-order-panel">
              {/* Order Header */}
              <div className="pos-order-header">
                <div>
                  <div className="pos-order-title">
                    <span>Current Order</span>
                    <span className="pos-sale-tag">COUNTER SALE</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                    Cashier: <strong>{user.name || "Cashier"}</strong> ({cart.length} item{cart.length === 1 ? "" : "s"})
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {cart.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={handleHoldOrder}
                        title="Hold current order (F8)"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                      >
                        Hold (F8)
                      </button>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={clearCart}
                        title="Clear cart (Esc)"
                        style={{ fontSize: "11px", padding: "4px 8px", color: "var(--accent-rose)" }}
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Optional Customer Name / Token */}
              <div style={{ padding: "8px 16px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <input
                  type="text"
                  placeholder="Customer Name / Token # (Optional)"
                  value={counterCustomerName}
                  onChange={(e) => setCounterCustomerName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-surface-subtle)"
                  }}
                />
              </div>

              {/* Cart Items List */}
              <div className="pos-cart-items-wrap">
                {cart.length === 0 ? (
                  <div className="pos-cart-empty">
                    <ShoppingCart size={36} style={{ opacity: 0.3 }} />
                    <strong>Order is currently empty</strong>
                    <span>Click any item on the left or press Enter to add.</span>
                  </div>
                ) : (
                  <table className="pos-cart-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: "center", width: "95px" }}>Qty</th>
                        <th style={{ textAlign: "right", width: "55px" }}>Price</th>
                        <th style={{ textAlign: "right", width: "65px" }}>Total</th>
                        <th style={{ width: "24px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((it, idx) => (
                        <tr
                          key={it.menuItemId || idx}
                          className={`pos-cart-row ${selectedCartItemIndex === idx ? "selected" : ""}`}
                          onClick={() => setSelectedCartItemIndex(idx)}
                        >
                          <td>
                            <strong>{it.menuItemName}</strong>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="pos-qty-btn-group">
                              <button
                                type="button"
                                className="pos-qty-btn"
                                onClick={(e) => { e.stopPropagation(); updateCartQty(idx, -1); }}
                              >
                                -
                              </button>
                              <span className="pos-qty-text">{it.quantity}</span>
                              <button
                                type="button"
                                className="pos-qty-btn"
                                onClick={(e) => { e.stopPropagation(); updateCartQty(idx, 1); }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "12px" }}>
                            ₹{it.unitPrice.toFixed(0)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            ₹{it.lineTotal.toFixed(0)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="pos-del-btn"
                              onClick={(e) => { e.stopPropagation(); removeFromCart(idx); }}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals Section */}
              <div className="pos-totals-section">
                <div className="pos-totals-row">
                  <span>Subtotal:</span>
                  <strong>₹{counterSubtotal.toFixed(2)}</strong>
                </div>
                <div className="pos-totals-row" style={{ display: "flex", alignItems: "center" }}>
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    max={counterSubtotal}
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(e.target.value)}
                    placeholder="0"
                    style={{
                      width: "80px",
                      padding: "2px 6px",
                      fontSize: "12px",
                      textAlign: "right",
                      borderRadius: "4px",
                      border: "1px solid var(--border-default)"
                    }}
                  />
                </div>
                <div className="pos-totals-row">
                  <span>CGST (2.5%):</span>
                  <span>₹{counterCgst.toFixed(2)}</span>
                </div>
                <div className="pos-totals-row">
                  <span>SGST (2.5%):</span>
                  <span>₹{counterSgst.toFixed(2)}</span>
                </div>
                <div className="pos-grand-total-box">
                  <span className="pos-grand-total-label">Grand Total:</span>
                  <span className="pos-grand-total-val">₹{counterGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="pos-payment-section">
                <div className="pos-payment-methods">
                  {["Cash", "UPI", "Card"].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      className={`pos-pm-btn ${counterPaymentMethod === pm ? "active" : ""}`}
                      onClick={() => setCounterPaymentMethod(pm)}
                    >
                      {pm === "Cash" && <CreditCard size={14} />}
                      {pm === "UPI" && <Zap size={14} />}
                      {pm === "Card" && <CreditCard size={14} />}
                      <span>{pm}</span>
                    </button>
                  ))}
                </div>

                {/* Cash Tendered & Change Calculator */}
                {counterPaymentMethod === "Cash" && (
                  <div className="pos-cash-calculator">
                    <div className="pos-cash-input-row">
                      <label>Cash Received (₹):</label>
                      <input
                        ref={cashInputRef}
                        type="number"
                        min="0"
                        step="1"
                        className="pos-cash-input"
                        placeholder={String(counterGrandTotal)}
                        value={counterCashTendered}
                        onChange={(e) => setCounterCashTendered(e.target.value)}
                      />
                    </div>
                    {/* Quick Cash Buttons */}
                    <div className="pos-quick-cash-row">
                      <button
                        type="button"
                        className="pos-quick-cash-btn"
                        onClick={() => setCounterCashTendered(counterGrandTotal)}
                      >
                        Exact
                      </button>
                      {[50, 100, 200, 500, 2000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className="pos-quick-cash-btn"
                          onClick={() => setCounterCashTendered(amt)}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                    <div className="pos-change-row">
                      <span>Change to Return:</span>
                      <span className="pos-change-val">₹{counterChange.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pay & Print Button */}
              <div className="pos-action-btn-row">
                <button
                  type="button"
                  className="pos-pay-btn"
                  onClick={handleCompleteCounterSale}
                  disabled={cart.length === 0 || counterSubmitting}
                >
                  <Printer size={18} />
                  <span>
                    {counterSubmitting ? "Processing..." : `PAY & PRINT (₹${counterGrandTotal.toFixed(2)})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE TABLE SERVICE BILLING DESK (Mode 1)                         */}
      {/* ========================================================================= */}
      {activeViewTab === "ready" && (
        <>
          {/* Keyboard Shortcut Guidance Banner */}
          <div className="keyboard-shortcut-banner no-print">
            <Sparkles size={18} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
            <div>
              <strong>⚡ FAST KEYBOARD BILLING:</strong> Select any table below and press <kbd>ENTER</kbd> or <kbd>SPACEBAR</kbd> to confirm, generate the bill, and immediately open the system print dialog.
            </div>
          </div>

          <div className="cashier-billing-layout no-print">
            {/* Left Side: Tables Ready for Billing Queue */}
            <div className="cashier-queue-sidebar">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Tables Ready for Billing</h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {readyTables.length} pending
                </span>
              </div>

              <div className="cashier-queue-list">
                {readyTables.length === 0 ? (
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px dashed var(--border-default)",
                      borderRadius: "var(--radius-lg)",
                      padding: "36px 20px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px"
                    }}
                  >
                    <Store size={36} style={{ opacity: 0.35 }} />
                    <strong style={{ color: "var(--text-primary)" }}>No tables awaiting billing</strong>
                    <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.5" }}>
                      When a waiter finishes serving and marks a table as completed, it will appear here automatically as <em>"Ready for Billing"</em>.
                    </p>
                    <button
                      type="button"
                      className="secondary-btn compact"
                      onClick={() => setActiveViewTab("history")}
                      style={{ marginTop: "6px", fontWeight: 600, color: "var(--accent-emerald)" }}
                    >
                      <Receipt size={14} /> View Previous Bills Archive ({bills.length})
                    </button>
                  </div>
                ) : (
                  readyTables.map((t) => {
                    const isSelected = t.tableNumber === selectedTableNumber;
                    const ord = t.activeOrder;
                    const itCount = ord?.itemsCount || (ord?.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
                    const amt = Number(ord?.totalAmount || ord?.total || 0);

                    return (
                      <div
                        key={t.tableNumber}
                        className={`cashier-table-card ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedTableNumber(t.tableNumber)}
                      >
                        <div className="cashier-table-card-head">
                          <div className="cashier-table-title">
                            <Receipt size={17} style={{ color: isSelected ? "var(--accent-emerald)" : "var(--accent-warm-gold)" }} />
                            <span>{t.tableNumber} — Ready for Billing</span>
                          </div>
                          <span className="ready-billing-chip">
                            <span className="pulse-dot" /> Ready
                          </span>
                        </div>

                        <div className="cashier-table-meta">
                          <span>Order: <strong>{ord?.orderNumber || "—"}</strong></span>
                          <span>Waiter: <strong>{ord?.waiterName || "Staff"}</strong></span>
                        </div>

                        <div className="cashier-table-meta">
                          <span>Customer: {ord?.customerName || "Walk-in Guest"}</span>
                          {ord?.createdAt && (
                            <span>
                              <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                              {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>

                        <div className="cashier-table-footer">
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {itCount} item{itCount === 1 ? "" : "s"}
                          </span>
                          <strong style={{ color: "var(--accent-emerald)", fontSize: "15px" }}>
                            ₹{amt.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Session & Recent Billed List */}
              {(recentBills.length > 0 || bills.length > 0) && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Recent Bills
                    </span>
                    <button
                      type="button"
                      className="secondary-btn compact"
                      onClick={() => setActiveViewTab("history")}
                      style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-emerald)" }}
                    >
                      View All ({bills.length}) →
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(recentBills.length > 0 ? recentBills : bills.slice(0, 5)).map((b) => (
                      <div
                        key={b.id || b.billNumber}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "12px"
                        }}
                      >
                        <div>
                          <strong>{b.billNumber}</strong> ({b.tableNumber || "Table"})
                          <span style={{ display: "block", color: "var(--text-muted)", fontSize: "11px" }}>
                            ₹{Number(b.grandTotal).toFixed(2)} • {b.paymentStatus || "PAID"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            className="secondary-btn compact"
                            onClick={() => setViewingBill(b)}
                            title="View Bill Details"
                            style={{ padding: "4px 8px" }}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className="secondary-btn compact"
                            onClick={() => handleReprintBill(b)}
                            title="Re-print Bill Receipt"
                            style={{ padding: "4px 8px" }}
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Selected Table Order Details & Billing Action */}
            <div className="cashier-details-panel">
              {!currentTable ? (
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-lg)",
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "var(--text-muted)"
                  }}
                >
                  <Store size={44} style={{ opacity: 0.3, marginBottom: "12px" }} />
                  <h3>Select a Table to Review & Bill</h3>
                  <p style={{ maxWidth: "420px", margin: "0 auto", fontSize: "14px" }}>
                    Select a table from the list on the left to preview the customer's complete order, review 5% GST taxes, apply discounts, and generate the final bill.
                  </p>
                </div>
              ) : (
                <>
                  {/* Order Info Header Card */}
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-lg)",
                      padding: "18px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px"
                    }}
                  >
                    <div>
                      <span className="eyebrow" style={{ color: "var(--accent-emerald)" }}>READY FOR BILLING</span>
                      <h2 style={{ margin: "2px 0 0 0", fontSize: "22px" }}>
                        {currentTable.tableNumber}
                      </h2>
                      <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <span>Order: <strong>{order?.orderNumber}</strong></span>
                        <span>Customer: <strong>{order?.customerName || "Walk-in Guest"}</strong></span>
                        <span>Waiter: <strong>{order?.waiterName || "Staff"}</strong></span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="ready-billing-chip" style={{ fontSize: "12px", padding: "4px 10px" }}>
                        <span className="pulse-dot" /> Awaiting Final Bill
                      </span>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                        Status: <strong style={{ color: "var(--text-primary)" }}>{order?.status}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Complete Items Ordered Table */}
                  <div className="cashier-items-card">
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>Complete Order Items ({items.length})</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        All items prepared & served
                      </span>
                    </div>

                    <div className="table-wrap">
                      <table className="cashier-items-table">
                        <thead>
                          <tr>
                            <th style={{ width: "40px" }}>#</th>
                            <th>Item Name</th>
                            <th style={{ textAlign: "center", width: "90px" }}>Quantity</th>
                            <th style={{ textAlign: "right", width: "120px" }}>Unit Price</th>
                            <th style={{ textAlign: "right", width: "130px" }}>Item Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                                No items found in this order.
                              </td>
                            </tr>
                          ) : (
                            items.map((it, idx) => (
                              <tr key={it.id || idx}>
                                <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                                <td>
                                  <strong style={{ fontSize: "14px" }}>{it.menuItemName}</strong>
                                </td>
                                <td style={{ textAlign: "center", fontWeight: 700 }}>
                                  <span style={{ background: "var(--bg-surface-subtle)", padding: "2px 8px", borderRadius: "4px" }}>
                                    {it.quantity}
                                  </span>
                                </td>
                                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                                  ₹{Number(it.unitPrice).toFixed(2)}
                                </td>
                                <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                                  ₹{Number(it.lineTotal || (it.unitPrice * it.quantity)).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Calculation & Bill Totals */}
                  <div className="cashier-summary-grid">
                    {/* Billing Adjustments (Discount & Payment) */}
                    <div className="cashier-totals-box">
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Bill Adjustments & Payment
                      </span>

                      <div style={{ marginTop: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                          Discount Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={subtotal}
                          step="1"
                          value={discount}
                          onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                          placeholder="0.00"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-default)",
                            background: "var(--bg-surface)",
                            fontSize: "14px",
                            color: "var(--text-primary)"
                          }}
                        />
                      </div>

                      <div style={{ marginTop: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                          Payment Method
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                          {["Cash", "UPI", "Card"].map((pm) => (
                            <button
                              key={pm}
                              type="button"
                              className={`secondary-btn ${paymentMethod === pm ? "active" : ""}`}
                              onClick={() => setPaymentMethod(pm)}
                              style={{
                                justifyContent: "center",
                                padding: "6px 8px",
                                fontSize: "12px",
                                fontWeight: paymentMethod === pm ? 700 : 500,
                                borderColor: paymentMethod === pm ? "var(--accent-emerald)" : "var(--border-default)"
                              }}
                            >
                              {pm}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          id="autoMarkPaid"
                          checked={autoMarkPaid}
                          onChange={(e) => setAutoMarkPaid(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <label htmlFor="autoMarkPaid" style={{ fontSize: "12px", cursor: "pointer", color: "var(--text-secondary)" }}>
                          Mark bill as <strong>PAID</strong> upon printing
                        </label>
                      </div>
                    </div>

                    {/* Totals & GST Taxes */}
                    <div className="cashier-totals-box">
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Invoice Summary
                      </span>

                      <div className="cashier-totals-row">
                        <span>Subtotal:</span>
                        <strong>₹{subtotal.toFixed(2)}</strong>
                      </div>

                      {discountNum > 0 && (
                        <div className="cashier-totals-row" style={{ color: "var(--accent-rose)" }}>
                          <span>Discount:</span>
                          <strong>-₹{discountNum.toFixed(2)}</strong>
                        </div>
                      )}

                      <div className="cashier-totals-row">
                        <span>CGST (2.5%):</span>
                        <span>₹{cgst.toFixed(2)}</span>
                      </div>

                      <div className="cashier-totals-row">
                        <span>SGST (2.5%):</span>
                        <span>₹{sgst.toFixed(2)}</span>
                      </div>

                      <div className="cashier-totals-row" style={{ borderTop: "1px dashed var(--border-default)", paddingTop: "6px" }}>
                        <span>Total Tax (5% GST):</span>
                        <span>₹{tax.toFixed(2)}</span>
                      </div>

                      <div className="cashier-grand-total-row">
                        <span>Grand Total:</span>
                        <span className="big-grand-total">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar with Keyboard Confirmation Trigger */}
                  <div className="cashier-action-bar">
                    <button
                      type="button"
                      className="big-billing-btn"
                      onClick={handleGenerateAndPrintBill}
                      disabled={billingInProgress}
                      title="Generate final bill and open print dialog"
                    >
                      <Printer size={22} />
                      <span>
                        {billingInProgress ? "Generating & Printing Bill..." : "GENERATE & PRINT BILL (ENTER / SPACE)"}
                      </span>
                      <ChevronRight size={20} />
                    </button>

                    <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                      💡 Press <kbd style={{ padding: "2px 6px", background: "var(--bg-surface-subtle)", borderRadius: "3px", border: "1px solid var(--border-default)" }}>ENTER</kbd> or <kbd style={{ padding: "2px 6px", background: "var(--bg-surface-subtle)", borderRadius: "3px", border: "1px solid var(--border-default)" }}>SPACEBAR</kbd> on your keyboard to instantly execute billing.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CASHIER SHIFT & DRAWER RECONCILIATION SUMMARY (Requirement 13)     */}
      {/* ========================================================================= */}
      {activeViewTab === "shift" && (
        <div className="pos-shift-container no-print">
          {/* Shift Header & Float Management */}
          <div className="pos-shift-drawer-box" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Clock size={18} style={{ color: "var(--accent-emerald)" }} />
                <h3 style={{ margin: 0, fontSize: "16px" }}>Cash Drawer Opening Float</h3>
              </div>
              <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "var(--text-secondary)" }}>
                Specify starting cash placed into the till at the beginning of the shift.
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "var(--text-muted)" }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={openingCash}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setOpeningCash(val);
                      localStorage.setItem(`samaya_opening_cash_${user.id || 0}`, String(val));
                    }}
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 24px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-default)",
                      fontSize: "15px",
                      fontWeight: 700
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={loadShift}
                  title="Recalculate shift register"
                >
                  <RefreshCw size={14} className={shiftLoading ? "spin" : ""} /> Recalculate
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <CheckCircle2 size={18} style={{ color: "var(--accent-emerald)" }} />
                <h3 style={{ margin: 0, fontSize: "16px" }}>Physical Cash Count (Closing)</h3>
              </div>
              <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "var(--text-secondary)" }}>
                Count physical currency in the till to verify drawer balance against sales.
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "var(--text-muted)" }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="Enter counted cash in drawer..."
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 24px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-default)",
                      fontSize: "15px",
                      fontWeight: 700
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shift Primary Cards */}
          <div className="pos-shift-cards-grid">
            <div className="pos-shift-card">
              <span className="pos-shift-card-label">Opening Cash Float</span>
              <span className="pos-shift-card-value">₹{Number(shiftData?.openingCash ?? openingCash).toFixed(2)}</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Starting till balance</span>
            </div>

            <div className="pos-shift-card">
              <span className="pos-shift-card-label" style={{ color: "var(--accent-emerald)" }}>Cash Sales Collected</span>
              <span className="pos-shift-card-value" style={{ color: "var(--accent-emerald)" }}>+₹{Number(shiftData?.cashSales || 0).toFixed(2)}</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>From cash orders</span>
            </div>

            <div className="pos-shift-card">
              <span className="pos-shift-card-label" style={{ color: "var(--forest-800, #0e3826)" }}>UPI Digital Sales</span>
              <span className="pos-shift-card-value" style={{ color: "var(--forest-800, #0e3826)" }}>+₹{Number(shiftData?.upiSales || 0).toFixed(2)}</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Instant QR payments</span>
            </div>

            <div className="pos-shift-card">
              <span className="pos-shift-card-label" style={{ color: "var(--brand-gold-active, #966e12)" }}>Card Sales (POS EDC)</span>
              <span className="pos-shift-card-value" style={{ color: "var(--brand-gold-active, #966e12)" }}>+₹{Number(shiftData?.cardSales || 0).toFixed(2)}</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Card swipes</span>
            </div>

            {Number(shiftData?.otherSales || 0) > 0 && (
              <div className="pos-shift-card">
                <span className="pos-shift-card-label">Other Payment Modes</span>
                <span className="pos-shift-card-value">+₹{Number(shiftData?.otherSales || 0).toFixed(2)}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Other settlements</span>
              </div>
            )}
          </div>

          {/* Reconciliation Drawer Math (Requirement 13) */}
          <div className="pos-shift-drawer-box" style={{ background: "var(--bg-surface-subtle)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Expected Till Math Formula
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Opening Cash:</span>
                  <strong>₹{Number(shiftData?.openingCash ?? openingCash).toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-emerald)" }}>
                  <span>+ Cash Sales:</span>
                  <strong>+₹{Number(shiftData?.cashSales || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-rose)" }}>
                  <span>- Refunds / Voids ({shiftData?.voidedCount || 0}):</span>
                  <strong>-₹{Number(shiftData?.refunds || 0).toFixed(2)}</strong>
                </div>
                <div style={{ borderTop: "2px solid var(--border-default)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                  <strong>= Expected Closing Cash:</strong>
                  <strong style={{ color: "var(--accent-emerald)" }}>₹{Number(shiftData?.expectedCash || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Shift Cashier Closing Status
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Actual Counted Cash:</span>
                  <strong>{actualCash !== "" ? `₹${Number(actualCash).toFixed(2)}` : "— Not counted yet"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Expected Till Cash:</span>
                  <strong>₹{Number(shiftData?.expectedCash || 0).toFixed(2)}</strong>
                </div>
                <div style={{ borderTop: "2px solid var(--border-default)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                  <strong>Till Cash Difference:</strong>
                  {actualCash === "" ? (
                    <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>Enter counted cash above</span>
                  ) : Number(shiftData?.difference || 0) === 0 ? (
                    <strong style={{ color: "var(--accent-emerald)" }}>✓ Balanced (₹0.00)</strong>
                  ) : Number(shiftData?.difference || 0) > 0 ? (
                    <strong style={{ color: "var(--accent-emerald)" }}>+₹{Number(shiftData?.difference).toFixed(2)} (Surplus)</strong>
                  ) : (
                    <strong style={{ color: "var(--accent-rose)" }}>-₹{Math.abs(Number(shiftData?.difference || 0)).toFixed(2)} (Shortage)</strong>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sales Channels Breakdown (Requirement 10: Distinguish Table Service vs Counter Sales) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="pos-shift-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="pos-shift-card-label">🍽️ Table Service Sales</span>
                <span style={{ fontSize: "11px", background: "var(--bg-surface-subtle)", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                  {shiftData?.tableServiceBills || 0} Bills
                </span>
              </div>
              <span className="pos-shift-card-value" style={{ fontSize: "22px" }}>
                ₹{Number(shiftData?.tableServiceSales || 0).toFixed(2)}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Waiter → Kitchen → Table dining</span>
            </div>

            <div className="pos-shift-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="pos-shift-card-label" style={{ color: "var(--accent-emerald)" }}>🛍️ Self-Service / Counter Sales</span>
                <span style={{ fontSize: "11px", background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                  {shiftData?.counterServiceBills || 0} Bills
                </span>
              </div>
              <span className="pos-shift-card-value" style={{ fontSize: "22px", color: "var(--accent-emerald)" }}>
                ₹{Number(shiftData?.counterServiceSales || 0).toFixed(2)}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Fast Cashier POS checkout</span>
            </div>
          </div>

          {/* Grand Summary Banner */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "var(--shadow-xs)"
          }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-emerald)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Gross Revenue Settled
              </span>
              <div style={{ fontSize: "26px", fontWeight: 900, color: "var(--text-primary)" }}>
                ₹{Number(shiftData?.totalSales || 0).toFixed(2)}
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Across {shiftData?.totalBills || 0} settled bill{shiftData?.totalBills === 1 ? "" : "s"}
              </span>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={() => window.print()}
              style={{ background: "var(--accent-emerald)" }}
            >
              <Printer size={16} /> Print Shift Register Report
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PREVIOUS BILLS & INVOICES HISTORY ARCHIVE                          */}
      {/* ========================================================================= */}
      {activeViewTab === "history" && (
        <div className="bills-history-container no-print">
          {/* KPI Summary Cards */}
          <div className="pos-kpi-grid">
            <div className="pos-kpi-card kpi-total-bills">
              <div className="pos-kpi-header">
                <span className="pos-kpi-title">TOTAL BILLS</span>
                <div className="pos-kpi-icon-wrap">
                  <Receipt size={15} />
                </div>
              </div>
              <div className="pos-kpi-value">{bills.length}</div>
              <div className="pos-kpi-subtitle">Generated in selected period</div>
            </div>

            <div className="pos-kpi-card kpi-revenue">
              <div className="pos-kpi-header">
                <span className="pos-kpi-title">TOTAL BILLED REVENUE</span>
                <div className="pos-kpi-icon-wrap">
                  <TrendingUp size={15} />
                </div>
              </div>
              <div className="pos-kpi-value">
                ₹{bills.reduce((s, b) => s + Number(b.grandTotal || 0), 0).toFixed(2)}
              </div>
              <div className="pos-kpi-subtitle">Gross settlement value</div>
            </div>

            <div className="pos-kpi-card kpi-paid">
              <div className="pos-kpi-header">
                <span className="pos-kpi-title">PAID BILLS</span>
                <div className="pos-kpi-icon-wrap">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <div className="pos-kpi-value">
                {bills.filter((b) => (b.paymentStatus || "").toLowerCase() === "paid").length}
              </div>
              <div className="pos-kpi-subtitle">Fully settled & closed</div>
            </div>

            <div className="pos-kpi-card kpi-pending">
              <div className="pos-kpi-header">
                <span className="pos-kpi-title">PENDING SETTLEMENT</span>
                <div className="pos-kpi-icon-wrap">
                  <Clock size={15} />
                </div>
              </div>
              <div className="pos-kpi-value">
                {bills.filter((b) => (b.paymentStatus || "").toLowerCase() !== "paid" && (b.paymentStatus || "").toLowerCase() !== "voided").length}
              </div>
              <div className="pos-kpi-subtitle">Awaiting final payment</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bills-filter-bar">
            {/* Search Input */}
            <div className="bills-search-box">
              <Search size={15} className="bills-search-icon" />
              <input
                type="text"
                placeholder="Search by Bill #, Table, Customer, Waiter, or Order #..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
              />
            </div>

            {/* Sale Type Filter (Requirement 10) */}
            <div className="bills-filter-group">
              <span className="eyebrow" style={{ margin: 0 }}>SALE TYPE:</span>
              {[
                { id: "All", label: "All Sales" },
                { id: "SELF_SERVICE", label: "🛍️ Counter" },
                { id: "TABLE_SERVICE", label: "🍽️ Table" }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`secondary-btn compact ${billSaleTypeFilter === st.id ? "active" : ""}`}
                  onClick={() => setBillSaleTypeFilter(st.id)}
                  style={{
                    fontWeight: billSaleTypeFilter === st.id ? 700 : 500,
                    borderColor: billSaleTypeFilter === st.id ? "var(--accent-emerald)" : undefined,
                    color: billSaleTypeFilter === st.id ? "var(--accent-emerald)" : undefined
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Status Pills Filter */}
            <div className="bills-filter-group">
              <span className="eyebrow" style={{ margin: 0 }}>STATUS:</span>
              {["All", "Paid", "Pending"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`secondary-btn compact ${billStatusFilter === st ? "active" : ""}`}
                  onClick={() => setBillStatusFilter(st)}
                  style={{
                    fontWeight: billStatusFilter === st ? 700 : 500,
                    borderColor: billStatusFilter === st ? "var(--accent-emerald)" : undefined,
                    color: billStatusFilter === st ? "var(--accent-emerald)" : undefined
                  }}
                >
                  {st === "Paid" ? "✓ Paid" : st === "Pending" ? "⏳ Pending" : "All Statuses"}
                </button>
              ))}
            </div>

            {/* Branch Selector for Multi-branch users */}
            {branches.length > 1 && (user.role === "Organization Admin" || user.role === "Super Admin") && (
              <div className="bills-filter-group">
                <span className="eyebrow" style={{ margin: 0 }}>BRANCH:</span>
                <select
                  value={billBranchId}
                  onChange={(e) => setBillBranchId(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-surface)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--text-primary)"
                  }}
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Presets & Pickers */}
            <div className="bills-filter-group">
              <span className="eyebrow" style={{ margin: 0 }}>DATE:</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "Last 7D" },
                  { id: "month", label: "Last 30D" }
                ].map((dp) => (
                  <button
                    key={dp.id}
                    type="button"
                    className={`secondary-btn compact ${billDatePreset === dp.id ? "active" : ""}`}
                    onClick={() => applyDatePreset(dp.id)}
                    style={{ fontSize: "11px", fontWeight: billDatePreset === dp.id ? 700 : 500 }}
                  >
                    {dp.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", marginLeft: "4px" }}>
                <input
                  type="date"
                  value={billDateFrom}
                  onChange={(e) => { setBillDateFrom(e.target.value); setBillDatePreset("custom"); }}
                  style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)" }}
                  title="From Date"
                />
                <span>to</span>
                <input
                  type="date"
                  value={billDateTo}
                  onChange={(e) => { setBillDateTo(e.target.value); setBillDatePreset("custom"); }}
                  style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)" }}
                  title="To Date"
                />
              </div>

              <button
                type="button"
                className="secondary-btn compact"
                onClick={loadBills}
                title="Refresh bills history"
                style={{ marginLeft: "4px" }}
              >
                <RefreshCw size={13} className={billsLoading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* Historical Bills Table */}
          <div className="bills-table-card">
            <div className="table-wrap">
              <table className="bills-history-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Date & Time</th>
                    <th>Table</th>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Waiter</th>
                    <th>Items</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                    <th style={{ textAlign: "right" }}>Tax (5%)</th>
                    <th style={{ textAlign: "right" }}>Grand Total</th>
                    <th style={{ textAlign: "center" }}>Payment Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billsLoading ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        <RefreshCw size={24} className="spin" style={{ display: "block", margin: "0 auto 8px" }} />
                        Loading previous bills...
                      </td>
                    </tr>
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                        <Receipt size={40} style={{ opacity: 0.35, display: "block", margin: "0 auto 12px" }} />
                        <strong style={{ display: "block", fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px" }}>
                          No previous bills found
                        </strong>
                        <span style={{ fontSize: "13px" }}>
                          {billSearch || billStatusFilter !== "All" || billDateFrom || billDateTo
                            ? "Try adjusting your search terms or date filters."
                            : "Bills generated from customer table orders will appear here automatically."}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const isPaid = (b.paymentStatus || "").toLowerCase() === "paid";
                      const itCount = (b.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
                      const itemsPreview = (b.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ");
                      const sub = Number(b.subtotal || 0);
                      const taxAmt = Number(b.tax || 0);
                      const total = Number(b.grandTotal || (sub + taxAmt));

                      return (
                        <tr key={b.id || b.billNumber}>
                          {/* Bill # */}
                          <td>
                            <div className="bill-number-cell" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Receipt size={14} style={{ color: "var(--accent-emerald)" }} />
                              <span>{b.billNumber}</span>
                            </div>
                            {b.branchName && (
                              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                {b.branchName}
                              </span>
                            )}
                          </td>

                          {/* Date & Time */}
                          <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                            <strong>{b.generatedAt ? new Date(b.generatedAt).toLocaleDateString("en-GB") : "—"}</strong>
                            <span style={{ display: "block", color: "var(--text-muted)", fontSize: "11px" }}>
                              {b.generatedAt ? new Date(b.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                          </td>

                          {/* Table / Channel (Requirement 10) */}
                          <td>
                            {b.saleType === "SELF_SERVICE" ? (
                              <span style={{
                                background: "rgba(16, 185, 129, 0.12)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                color: "var(--accent-emerald)",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontWeight: 700,
                                fontSize: "11.5px"
                              }}>
                                🛍️ Counter
                              </span>
                            ) : (
                              <span style={{
                                background: "var(--bg-surface-subtle)",
                                border: "1px solid var(--border-default)",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontWeight: 700,
                                fontSize: "12px"
                              }}>
                                🍽️ {b.tableNumber ? `Table ${b.tableNumber}` : "Takeaway"}
                              </span>
                            )}
                          </td>

                          {/* Order # */}
                          <td style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                            {b.orderNumber || "—"}
                          </td>

                          {/* Customer */}
                          <td>
                            <strong style={{ fontSize: "13px" }}>{b.customerName || "Walk-in Guest"}</strong>
                          </td>

                          {/* Waiter */}
                          <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            {b.waiterName || "Staff"}
                          </td>

                          {/* Items */}
                          <td>
                            <span
                              className="bill-items-badge"
                              title={itemsPreview || "No item breakdown"}
                              style={{ cursor: "help" }}
                            >
                              <Utensils size={11} /> {itCount} item{itCount === 1 ? "" : "s"}
                            </span>
                          </td>

                          {/* Subtotal */}
                          <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                            ₹{sub.toFixed(2)}
                          </td>

                          {/* 5% GST Tax */}
                          <td style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "12px" }}>
                            ₹{taxAmt.toFixed(2)}
                          </td>

                          {/* Grand Total */}
                          <td style={{ textAlign: "right" }}>
                            <strong style={{ color: "var(--accent-emerald)", fontSize: "14.5px" }}>
                              ₹{total.toFixed(2)}
                            </strong>
                          </td>

                          {/* Payment Status */}
                          <td style={{ textAlign: "center" }}>
                            {b.paymentStatus === "Voided" ? (
                              <span className="bill-status-pill pending" style={{ background: "rgba(225, 29, 72, 0.12)", color: "var(--accent-rose)", borderColor: "rgba(225, 29, 72, 0.3)" }}>
                                ✕ VOIDED
                              </span>
                            ) : (
                              <span className={`bill-status-pill ${isPaid ? "paid" : "pending"}`}>
                                {isPaid ? (
                                  <>
                                    <Check size={11} /> PAID ({b.paymentMethod || "Cash"})
                                  </>
                                ) : (
                                  <>
                                    <Clock size={11} /> PENDING
                                  </>
                                )}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: "center" }}>
                            <div className="bill-action-btn-group" style={{ justifyContent: "center" }}>
                              <button
                                className="primary-btn compact"
                                onClick={() => setViewingBill(b)}
                                title="View Complete Bill & Thermal Receipt"
                                style={{ background: "var(--accent-emerald)", padding: "5px 9px", fontSize: "11.5px", fontWeight: 700 }}
                              >
                                <Eye size={12} /> View Bill
                              </button>
                              <button
                                className="secondary-btn compact"
                                onClick={() => handleReprintBill(b)}
                                title="Re-print PDF Receipt"
                                style={{ padding: "5px 9px", fontSize: "11.5px" }}
                              >
                                <Printer size={12} /> Print
                              </button>
                              {!isPaid && b.paymentStatus !== "Voided" && (
                                <button
                                  className="secondary-btn compact"
                                  onClick={() => handleSettleBill(b.id, "Cash")}
                                  title="Mark Bill as Paid"
                                  style={{ padding: "5px 9px", fontSize: "11.5px", borderColor: "rgba(16, 185, 129, 0.35)", color: "var(--accent-emerald)" }}
                                >
                                  <CreditCard size={12} /> Pay
                                </button>
                              )}
                              {canVoid && b.paymentStatus !== "Voided" && (
                                <button
                                  className="secondary-btn compact"
                                  onClick={() => {
                                    setBillToVoid(b);
                                    setVoidReason("");
                                    setVoidModalOpen(true);
                                  }}
                                  title="Void this bill (Admin / Manager)"
                                  style={{ padding: "5px 9px", fontSize: "11.5px", color: "var(--accent-rose)", borderColor: "rgba(225, 29, 72, 0.3)" }}
                                >
                                  <RotateCcw size={12} /> Void
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PREVIOUS BILL DETAILS & THERMAL RECEIPT (All Roles)           */}
      {/* ========================================================================= */}
      {viewingBill && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: "980px", width: "95vw" }}>
            {/* Modal Header */}
            <div className="modal-head no-print">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--accent-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Receipt size={22} />
                </div>
                <div>
                  <span className="eyebrow" style={{ color: "var(--accent-emerald)" }}>HISTORICAL INVOICE</span>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    Bill {viewingBill.billNumber}
                    {viewingBill.tableNumber && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: "8px" }}>
                        ({viewingBill.tableNumber})
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`bill-status-pill ${(viewingBill.paymentStatus || "").toLowerCase() === "paid" ? "paid" : "pending"}`}>
                  {(viewingBill.paymentStatus || "").toLowerCase() === "paid"
                    ? `✓ PAID (${viewingBill.paymentMethod || "Cash"})`
                    : "⏳ PENDING"}
                </span>
                <button className="modal-close-btn" onClick={() => setViewingBill(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split into Thermal Receipt preview (Left) & Complete Bill Inspector (Right) */}
            <div className="bill-view-modal-body" style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: "20px",
              padding: "20px",
              maxHeight: "calc(85vh - 120px)",
              overflowY: "auto"
            }}>
              {/* Left Column: Authentic Thermal Paper Receipt */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Thermal Paper Receipt Preview
                </div>
                <div className="thermal-bill-container" style={{ maxHeight: "560px", overflowY: "auto" }}>
                  <ThermalReceiptView bill={viewingBill} organizationName={user.organizationName} />
                </div>
              </div>

              {/* Right Column: Full Details & Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Metadata Cards */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px"
                }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Bill Number</span>
                    <strong style={{ display: "block", fontSize: "14px", fontFamily: "monospace" }}>{viewingBill.billNumber}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Order Number</span>
                    <strong style={{ display: "block", fontSize: "14px" }}>{viewingBill.orderNumber || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Dining Table</span>
                    <strong style={{ display: "block", fontSize: "14px" }}>{viewingBill.tableNumber || "Takeaway"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Customer</span>
                    <strong style={{ display: "block", fontSize: "14px" }}>{viewingBill.customerName || "Walk-in Guest"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Waiter / Staff</span>
                    <strong style={{ display: "block", fontSize: "14px" }}>{viewingBill.waiterName || "Staff"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Branch</span>
                    <strong style={{ display: "block", fontSize: "14px" }}>{viewingBill.branchName || user.branchName || "Main Branch"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Date & Time</span>
                    <span style={{ display: "block", fontSize: "13px" }}>
                      {viewingBill.generatedAt ? new Date(viewingBill.generatedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Payment Mode</span>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>
                      {viewingBill.paymentMethod || "Cash"} ({viewingBill.paymentStatus || "PAID"})
                    </span>
                  </div>
                </div>

                {/* Itemized Order Lines */}
                <div className="cashier-items-card" style={{ margin: 0 }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px" }}>Itemized Food Items ({(viewingBill.items || []).length})</strong>
                  </div>
                  <div className="table-wrap" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <table className="cashier-items-table" style={{ fontSize: "13px" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "30px" }}>#</th>
                          <th>Item</th>
                          <th style={{ textAlign: "center", width: "70px" }}>Qty</th>
                          <th style={{ textAlign: "right", width: "100px" }}>Price</th>
                          <th style={{ textAlign: "right", width: "110px" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingBill.items || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)" }}>
                              No items recorded for this order.
                            </td>
                          </tr>
                        ) : (
                          (viewingBill.items || []).map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td style={{ color: "var(--text-muted)", fontSize: "11px" }}>{idx + 1}</td>
                              <td><strong>{it.menuItemName}</strong></td>
                              <td style={{ textAlign: "center", fontWeight: 700 }}>{it.quantity}</td>
                              <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>₹{Number(it.unitPrice).toFixed(2)}</td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>₹{Number(it.lineTotal || (it.unitPrice * it.quantity)).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Totals Breakdown */}
                <div style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div className="cashier-totals-row">
                    <span>Subtotal:</span>
                    <strong>₹{Number(viewingBill.subtotal || 0).toFixed(2)}</strong>
                  </div>
                  {Number(viewingBill.discount) > 0 && (
                    <div className="cashier-totals-row" style={{ color: "var(--accent-rose)" }}>
                      <span>Discount:</span>
                      <strong>-₹{Number(viewingBill.discount).toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="cashier-totals-row">
                    <span>CGST (2.5%):</span>
                    <span>₹{Number(viewingBill.cgst || (viewingBill.tax ? viewingBill.tax / 2 : 0)).toFixed(2)}</span>
                  </div>
                  <div className="cashier-totals-row">
                    <span>SGST (2.5%):</span>
                    <span>₹{Number(viewingBill.sgst || (viewingBill.tax ? viewingBill.tax / 2 : 0)).toFixed(2)}</span>
                  </div>
                  <div className="cashier-grand-total-row" style={{ borderTop: "1.5px solid var(--border-default)", paddingTop: "8px" }}>
                    <span>Grand Total:</span>
                    <span className="big-grand-total" style={{ fontSize: "20px" }}>₹{Number(viewingBill.grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Quick Pay Action if Pending */}
                {(viewingBill.paymentStatus || "").toLowerCase() !== "paid" && (
                  <div style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <strong style={{ color: "#b45309", fontSize: "13px" }}>Payment is currently Pending</strong>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>Record payment to settle this bill</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {["Cash", "UPI", "Card"].map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          className="secondary-btn compact"
                          onClick={() => handleSettleBill(viewingBill.id, pm)}
                          style={{ fontSize: "11px", fontWeight: 700 }}
                        >
                          Pay via {pm}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => printBillDocument(viewingBill, user.organizationName)}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    <Printer size={16} /> Print Receipt (PDF)
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => downloadReceiptFile(viewingBill, user.organizationName)}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    <Download size={16} /> Download (.html)
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setViewingBill(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VOID BILL CONFIRMATION (Admin / Manager only - Requirement 15)      */}
      {/* ========================================================================= */}
      {voidModalOpen && billToVoid && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-card" style={{ maxWidth: "480px", width: "90vw" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={20} style={{ color: "var(--accent-rose)" }} />
                <h3 style={{ margin: 0, fontSize: "17px" }}>Void Bill {billToVoid.billNumber}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setVoidModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                Are you sure you want to void this bill? Voiding marks this transaction as cancelled in financial and sales reports and records an audit log.
              </p>
              <div style={{ background: "var(--bg-surface-subtle)", padding: "12px", borderRadius: "var(--radius-md)", fontSize: "13px" }}>
                <div><strong>Bill Total:</strong> ₹{Number(billToVoid.grandTotal || 0).toFixed(2)}</div>
                <div><strong>Sale Type:</strong> {billToVoid.saleType === "SELF_SERVICE" ? "🛍️ Counter Sale" : `🍽️ Table ${billToVoid.tableNumber || "Service"}`}</div>
                <div><strong>Payment Method:</strong> {billToVoid.paymentMethod || "Cash"}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Reason for Voiding <span style={{ color: "var(--accent-rose)" }}>*</span>:
                </label>
                <textarea
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Customer cancelled order, wrong item entered, payment reversal..."
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", fontSize: "13px", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setVoidModalOpen(false)}
                  disabled={voidSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ background: "var(--accent-rose)", borderColor: "var(--accent-rose)" }}
                  onClick={handleExecuteVoidBill}
                  disabled={voidSubmitting || !voidReason.trim()}
                >
                  {voidSubmitting ? "Voiding Bill..." : "Confirm Void Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
