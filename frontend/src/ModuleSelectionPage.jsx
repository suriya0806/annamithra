import React, { useState, useRef, useEffect } from "react";
import {
  Utensils,
  ChefHat,
  ClipboardList,
  Receipt,
  Store,
  Users,
  BarChart3,
  Factory,
  ShoppingBag,
  Package,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  LogOut,
  Lock,
  Monitor,
  Building2,
  Clock,
  Sparkles
} from "lucide-react";

/**
 * Premium Annamithra Brand Insignia (Chef hat + Royal "A" + Wheat/Leaf wreath)
 */
export function AnnamithraBrandInsignia({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 8px rgba(212, 175, 55, 0.45))" }}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A7" />
          <stop offset="35%" stopColor="#E5BE53" />
          <stop offset="70%" stopColor="#C99824" />
          <stop offset="100%" stopColor="#8C630D" />
        </linearGradient>
      </defs>

      {/* Chef Hat Crest */}
      <path
        d="M40 28 C34 28 31 22 34 17 C37 12 45 12 47 16 C50 10 58 10 60 15 C65 12 72 14 70 20 C73 24 68 28 64 28 Z"
        fill="url(#goldGrad)"
      />
      <rect x="41" y="28" width="22" height="4" rx="1.5" fill="url(#goldGrad)" />
      <line x1="44" y1="30" x2="60" y2="30" stroke="#523904" strokeWidth="1" strokeLinecap="round" />

      {/* Stylized Majestic "A" */}
      <path
        d="M52 35 L33 76 H43 L47 66 H57 L61 76 H71 L52 35 Z M52 46 L55 60 H49 L52 46 Z"
        fill="url(#goldGrad)"
      />

      {/* Botanical / Wheat Wreath Flourishes - Left Branch */}
      <path
        d="M24 78 C26 65 30 55 38 45 C35 53 33 63 32 78 Z"
        fill="url(#goldGrad)"
        opacity="0.95"
      />
      <path
        d="M20 67 C24 63 29 61 32 63 C28 66 24 70 20 67 Z"
        fill="url(#goldGrad)"
      />
      <path
        d="M26 55 C30 51 36 50 39 53 C35 55 30 59 26 55 Z"
        fill="url(#goldGrad)"
      />
      <path
        d="M34 44 C37 41 42 41 44 44 C41 46 37 48 34 44 Z"
        fill="url(#goldGrad)"
      />

      {/* Botanical / Wheat Wreath Flourishes - Right Branch */}
      <path
        d="M80 78 C78 65 74 55 66 45 C69 53 71 63 72 78 Z"
        fill="url(#goldGrad)"
        opacity="0.95"
      />
      <path
        d="M84 67 C80 63 75 61 72 63 C76 66 80 70 84 67 Z"
        fill="url(#goldGrad)"
      />
      <path
        d="M78 55 C74 51 68 50 65 53 C69 55 74 59 78 55 Z"
        fill="url(#goldGrad)"
      />
      <path
        d="M70 44 C67 41 62 41 60 44 C63 46 67 48 70 44 Z"
        fill="url(#goldGrad)"
      />
    </svg>
  );
}

/**
 * Returns module permission flags based on authenticated user's role
 */
export function getRoleModuleAccess(user) {
  if (!user) {
    return {
      canAccessPos: false,
      canAccessKms: false,
      isSuperAdmin: false,
      posFeatures: {},
      kmsFeatures: {}
    };
  }

  const role = (user.role || "").trim();
  const isSuperAdmin = role === "Super Admin";
  const isOrgAdmin = role === "Organization Admin";
  const isBranchManager = role === "Branch Manager";

  // Check branch module configuration
  const branchModuleType = user.branchModuleType || "Both POS + KMS";
  const isKmsOnlyBranch = branchModuleType === "KMS Only";
  const isPosOnlyBranch = branchModuleType === "POS Only";

  // Common management checks
  const canManageUsers = isOrgAdmin || isBranchManager;
  const canManageBranches = isOrgAdmin || isBranchManager || role === "Inventory Manager";
  const canViewReports = ["Organization Admin", "Branch Manager", "Kitchen Manager", "Inventory Manager", "Accountant", "Cashier"].includes(role);
  const canBill = !isKmsOnlyBranch && ["Organization Admin", "Branch Manager", "Accountant", "Cashier"].includes(role);

  // POS permissions
  const hasOrders = !isKmsOnlyBranch && [
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Waiter",
    "Accountant",
    "Cashier"
  ].includes(role);

  const hasKds = !isKmsOnlyBranch && [
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Waiter",
    "Accountant",
    "Cashier"
  ].includes(role);

  const hasMenu = !isKmsOnlyBranch && [
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Waiter",
    "Accountant",
    "Cashier"
  ].includes(role);

  const hasCashier = canBill;
  const hasBranches = canManageBranches;
  const hasUsers = canManageUsers;
  const hasReports = canViewReports;

  // KMS permissions
  const hasProduction = [
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Inventory Manager",
    "Accountant",
    "Cashier"
  ].includes(role);

  const hasPurchase = !isPosOnlyBranch && [
    "Organization Admin",
    "Branch Manager",
    "Inventory Manager",
    "Accountant",
    "Cashier"
  ].includes(role);

  const hasKitchen = !isPosOnlyBranch && [
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Inventory Manager",
    "Accountant",
    "Cashier"
  ].includes(role);

  const hasInventory = !isPosOnlyBranch && [
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Inventory Manager",
    "Accountant",
    "Cashier"
  ].includes(role);

  // Role-level module eligibility:
  // Waiter can only access POS; Inventory Manager can only access KMS
  const roleCanAccessPos = role !== "Inventory Manager";
  const roleCanAccessKms = role !== "Waiter";

  const canAccessPos = !isKmsOnlyBranch && roleCanAccessPos && (hasOrders || hasKds || hasMenu || hasCashier);
  const canAccessKms = !isPosOnlyBranch && roleCanAccessKms && (hasProduction || hasPurchase || hasKitchen || hasInventory);

  return {
    isSuperAdmin,
    canAccessPos,
    canAccessKms,
    posFeatures: {
      orders: !isKmsOnlyBranch && hasOrders,
      kds: !isKmsOnlyBranch && hasKds,
      menu: !isKmsOnlyBranch && hasMenu,
      cashier: !isKmsOnlyBranch && hasCashier,
      production: hasProduction,
      branches: hasBranches,
      users: hasUsers,
      reports: hasReports
    },
    kmsFeatures: {
      production: !isPosOnlyBranch && hasProduction,
      purchase: !isPosOnlyBranch && hasPurchase,
      kitchen: !isPosOnlyBranch && hasKitchen,
      inventory: !isPosOnlyBranch && hasInventory,
      branches: hasBranches,
      users: hasUsers,
      reports: hasReports
    }
  };
}

export default function ModuleSelectionPage({ user, onSelectModule, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const access = getRoleModuleAccess(user);

  // Shift calculation
  const currentHour = new Date().getHours();
  const shiftName =
    currentHour >= 6 && currentHour < 15
      ? "Morning Shift"
      : currentHour >= 15 && currentHour < 23
      ? "Evening Shift"
      : "Night Shift";

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = (user?.name || "User").charAt(0).toUpperCase();

  // POS feature items definition
  const posTiles = [
    { id: "orders", label: "Orders", icon: Utensils, page: "orders", allowed: access.posFeatures.orders },
    { id: "kds", label: "Kitchen KDS", icon: Monitor, page: "kds", allowed: access.posFeatures.kds },
    { id: "menu", label: "Menu", icon: ClipboardList, page: "menu", allowed: access.posFeatures.menu },
    { id: "cashier", label: "Cashier", icon: Receipt, page: "billing", allowed: access.posFeatures.cashier },
    { id: "production", label: "Production", icon: Factory, page: "production", allowed: access.posFeatures.production },
    { id: "branches", label: "Branches", icon: Store, page: "branches", allowed: access.posFeatures.branches },
    { id: "users", label: "Users & Access", icon: Users, page: "users", allowed: access.posFeatures.users },
    { id: "reports", label: "Reports", icon: BarChart3, page: "reports", allowed: access.posFeatures.reports }
  ];

  // KMS feature items definition
  const kmsTiles = [
    { id: "production", label: "Production", icon: Factory, page: "production", allowed: access.kmsFeatures.production },
    { id: "purchase", label: "Purchase", icon: ShoppingBag, page: "purchase", allowed: access.kmsFeatures.purchase },
    { id: "kitchen", label: "Kitchen", icon: ChefHat, page: "kitchen", allowed: access.kmsFeatures.kitchen },
    { id: "inventory", label: "Central Inventory", icon: Package, page: "inventory", allowed: access.kmsFeatures.inventory },
    { id: "branches", label: "Branches", icon: Store, page: "branches", allowed: access.kmsFeatures.branches },
    { id: "users", label: "Users & Access", icon: Users, page: "users", allowed: access.kmsFeatures.users },
    { id: "reports", label: "Reports", icon: BarChart3, page: "reports", allowed: access.kmsFeatures.reports }
  ];

  const visiblePosTiles = posTiles.filter((t) => t.allowed);
  const visibleKmsTiles = kmsTiles.filter((t) => t.allowed);

  return (
    <div className="module-selection-container">
      {/* Dynamic Ambient Background Overlay */}
      <div className="module-selection-bg" />

      {/* ========================================================================= */}
      {/* TOP HEADER: BRANDING & LOGGED-IN USER PROFILE                             */}
      {/* ========================================================================= */}
      <header className="module-selection-header">
        {/* Empty left spacer to center brand on desktop */}
        <div className="module-header-spacer" />

        {/* Center Brand Identity */}
        <div className="module-brand-identity">
          <div className="brand-insignia-wrapper">
            <AnnamithraBrandInsignia size={54} />
          </div>
          <h1 className="brand-title-gold">ANNAMITHRA</h1>
          <span className="brand-subtitle-gold">FOOD & RESTAURANT MANAGEMENT</span>
        </div>

        {/* Top-Right Authenticated User Profile */}
        <div className="module-header-user-zone" ref={profileRef}>
          <button
            type="button"
            className={`module-user-pill ${profileOpen ? "active" : ""}`}
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            title={`${user?.name || "User"} (${user?.role || "Staff"})`}
          >
            <div className="module-user-avatar">
              <span>{userInitial}</span>
            </div>
            <div className="module-user-info">
              <span className="module-user-name">{user?.name || "Authorized User"}</span>
              <span className="module-user-role">{(user?.role || "STAFF").toUpperCase()}</span>
            </div>
            <ChevronDown size={14} className={`module-user-chevron ${profileOpen ? "open" : ""}`} />
          </button>

          {/* User Profile Popover Dropdown */}
          {profileOpen && (
            <div className="module-profile-dropdown">
              <div className="profile-dropdown-head">
                <div className="dropdown-avatar">{userInitial}</div>
                <div className="dropdown-user-meta">
                  <strong>{user?.name}</strong>
                  <span className="dropdown-user-email">{user?.email}</span>
                  <span className="dropdown-user-badge">{user?.role}</span>
                </div>
              </div>

              <div className="profile-dropdown-context">
                <div className="context-item">
                  <span className="context-label">Organization</span>
                  <strong className="context-value">{user?.organizationName || "ANNAMITHRA Enterprise"}</strong>
                </div>
                <div className="context-item">
                  <span className="context-label">Branch</span>
                  <strong className="context-value">{user?.branchName || "Organization Scope"}</strong>
                </div>
                <div className="context-item">
                  <span className="context-label">Shift</span>
                  <strong className="context-value">{shiftName}</strong>
                </div>
              </div>

              <div className="profile-dropdown-foot">
                <button
                  type="button"
                  className="dropdown-logout-btn"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign out of ANNAMITHRA</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN MODULE SELECTION CARDS: POS & KMS                                    */}
      {/* ========================================================================= */}
      <main className="module-selection-content">
        <div className="module-cards-grid">
          {/* --------------------------------------------------------------------- */}
          {/* 1. POS MODULE CARD                                                    */}
          {/* --------------------------------------------------------------------- */}
          <section
            className={`module-card pos-card ${!access.canAccessPos ? "card-restricted" : ""}`}
            aria-label="Point of Sale Module"
          >
            {/* Ambient Card Glow */}
            <div className="card-glow-pos" />

            {/* Top Card Hero Header */}
            <div className="module-card-head">
              <div className="illustration-wrapper">
                <img
                  src="/assets/pos_terminal_illustration.jpg"
                  alt="POS Terminal & Billing"
                  className="card-illustration-img"
                  onError={(e) => {
                    // Graceful fallback if image loading encounters network issue
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div className="card-title-group">
                <div className="card-heading-row">
                  <div>
                    <h2 className="module-title">POS</h2>
                    <span className="module-subtitle">Point of Sale</span>
                  </div>
                  <button
                    type="button"
                    className="module-circular-arrow-btn"
                    disabled={!access.canAccessPos}
                    onClick={() => onSelectModule("pos")}
                    title={access.canAccessPos ? "Open Point of Sale" : "Access Restricted"}
                  >
                    {access.canAccessPos ? <ArrowRight size={20} /> : <Lock size={16} />}
                  </button>
                </div>
                <p className="module-desc">
                  Manage daily restaurant operations, orders, billing and service in real time.
                </p>
              </div>
            </div>

            {/* Feature Label Tiles */}
            <div className="module-tiles-container">
              {visiblePosTiles.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "13px" }}>
                  No POS features permitted for your role
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visiblePosTiles.length, 4)}, 1fr)`, gap: "10px" }}>
                  {visiblePosTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        className={`module-tile-btn ${access.canAccessPos ? "" : "tile-disabled"}`}
                        disabled={!access.canAccessPos}
                        onClick={() => onSelectModule("pos", tile.page)}
                        title={`Go to ${tile.label}`}
                      >
                        <div className="tile-icon-box">
                          <Icon size={22} />
                        </div>
                        <span className="tile-title">{tile.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Primary Action */}
            <div className="module-card-footer">
              <button
                type="button"
                className="module-open-primary-btn pos-btn"
                disabled={!access.canAccessPos}
                onClick={() => onSelectModule("pos")}
              >
                <div className="open-btn-icon-box">
                  <ChevronRight size={18} />
                </div>
                <div className="open-btn-labels">
                  <strong className="open-btn-title">Open POS</strong>
                  <span className="open-btn-subtitle">
                    {access.canAccessPos
                      ? "Start taking orders and serve your customers"
                      : "Access restricted for your current role"}
                  </span>
                </div>
                <div className="open-btn-arrow-box">
                  {access.canAccessPos ? <ArrowRight size={18} /> : <Lock size={15} />}
                </div>
              </button>
            </div>
          </section>

          {/* --------------------------------------------------------------------- */}
          {/* 2. KMS MODULE CARD                                                    */}
          {/* --------------------------------------------------------------------- */}
          <section
            className={`module-card kms-card ${!access.canAccessKms ? "card-restricted" : ""}`}
            aria-label="Kitchen Management System Module"
          >
            {/* Ambient Card Glow */}
            <div className="card-glow-kms" />

            {/* Top Card Hero Header */}
            <div className="module-card-head">
              <div className="illustration-wrapper">
                <img
                  src="/assets/kms_kitchen_illustration.jpg"
                  alt="Kitchen Operations & Inventory"
                  className="card-illustration-img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div className="card-title-group">
                <div className="card-heading-row">
                  <div>
                    <h2 className="module-title">KMS</h2>
                    <span className="module-subtitle">Kitchen Management System</span>
                  </div>
                  <button
                    type="button"
                    className="module-circular-arrow-btn"
                    disabled={!access.canAccessKms}
                    onClick={() => onSelectModule("kms")}
                    title={access.canAccessKms ? "Open Kitchen Management System" : "Access Restricted"}
                  >
                    {access.canAccessKms ? <ArrowRight size={20} /> : <Lock size={16} />}
                  </button>
                </div>
                <p className="module-desc">
                  Manage production, purchase, inventory and overall kitchen operations.
                </p>
              </div>
            </div>

            {/* Feature Label Tiles */}
            <div className="module-tiles-container">
              {visibleKmsTiles.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "13px" }}>
                  No KMS features permitted for your role
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visibleKmsTiles.length, 4)}, 1fr)`, gap: "10px" }}>
                  {visibleKmsTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        className={`module-tile-btn ${access.canAccessKms ? "" : "tile-disabled"}`}
                        disabled={!access.canAccessKms}
                        onClick={() => onSelectModule("kms", tile.page)}
                        title={`Go to ${tile.label}`}
                      >
                        <div className="tile-icon-box">
                          <Icon size={22} />
                        </div>
                        <span className="tile-title">{tile.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Primary Action */}
            <div className="module-card-footer">
              <button
                type="button"
                className="module-open-primary-btn kms-btn"
                disabled={!access.canAccessKms}
                onClick={() => onSelectModule("kms")}
              >
                <div className="open-btn-icon-box">
                  <ChevronRight size={18} />
                </div>
                <div className="open-btn-labels">
                  <strong className="open-btn-title">Open KMS</strong>
                  <span className="open-btn-subtitle">
                    {access.canAccessKms
                      ? "Manage your kitchen and inventory operations"
                      : "Access restricted for your current role"}
                  </span>
                </div>
                <div className="open-btn-arrow-box">
                  {access.canAccessKms ? <ArrowRight size={18} /> : <Lock size={15} />}
                </div>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
