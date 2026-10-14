import React from "react";
import {
  Building2,
  Store,
  TrendingUp,
  ShoppingCart,
  Clock,
  Utensils,
  ChefHat,
  Package,
  AlertTriangle,
  Calendar,
  Zap,
  CheckCircle2,
  RefreshCw,
  Receipt,
  Share2,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Check,
  DollarSign
} from "lucide-react";

/* ====================================================================
   SHARED ROLE DASHBOARD HEADER
   ==================================================================== */
export function RoleDashboardHeader({
  eyebrow,
  title,
  subtitle,
  refreshing,
  onRefresh,
  statusText = "Live Operations"
}) {
  return (
    <div className="role-dashboard-header">
      <div className="role-dashboard-title-wrap">
        {eyebrow && <span className="role-dashboard-eyebrow">{eyebrow}</span>}
        <h1 className="role-dashboard-title">{title}</h1>
        {subtitle && <p className="role-dashboard-subtitle">{subtitle}</p>}
      </div>

      <div className="role-dashboard-actions">
        <div className="role-dashboard-live-badge">
          <span className="live-pulse-dot" />
          <span className="live-badge-text">{statusText}</span>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="role-refresh-btn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh Real-time Metrics"
          >
            <RefreshCw size={13} className={refreshing ? "spin-icon" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        )}

        <div className="role-date-badge">
          <Calendar size={13} />
          <span>Today, {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   SHARED COMPACT KPI METRIC CARD
   ==================================================================== */
export function RoleKpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "forest", // forest | gold | amber | rose | neutral
  onClick,
  badgeText
}) {
  return (
    <div
      className={`role-kpi-card variant-${variant} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="role-kpi-top">
        <span className="role-kpi-label">{label}</span>
        <div className="role-kpi-icon-wrap">
          <Icon size={17} />
        </div>
      </div>
      <div className="role-kpi-body">
        <div className="role-kpi-val-row">
          <span className="role-kpi-value">{value}</span>
          {badgeText && <span className="role-kpi-badge">{badgeText}</span>}
        </div>
        {subtext && <div className="role-kpi-subtext">{subtext}</div>}
      </div>
    </div>
  );
}

/* ====================================================================
   1. SUPER ADMIN DASHBOARD VIEW
   ==================================================================== */
export function SuperAdminDashboardView({ organizations = [], loading, refreshing, onRefresh, onNavigate }) {
  const totalOrgs = organizations.length;

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="SYSTEM OVERVIEW"
        title="Platform System Overview"
        subtitle="Registered enterprise organizations and tenant accounts"
        refreshing={refreshing || loading}
        onRefresh={onRefresh}
        statusText="System Online"
      />

      <div className="role-kpi-grid grid-2">
        <RoleKpiCard
          label="Registered Organizations"
          value={loading ? "..." : totalOrgs}
          subtext="Hospitality enterprise tenant accounts"
          icon={Building2}
          variant="forest"
          onClick={() => onNavigate("organizations")}
          badgeText="Tenants"
        />
        <RoleKpiCard
          label="Active Organizations"
          value={loading ? "..." : organizations.filter((o) => o.status === "Active" || !o.status).length}
          subtext="Live operational tenant accounts"
          icon={CheckCircle2}
          variant="gold"
          onClick={() => onNavigate("organizations")}
          badgeText="Operational"
        />
      </div>

      <div className="role-panel">
        <div className="role-panel-head">
          <div>
            <span className="panel-eyebrow">TENANT DIRECTORY</span>
            <h3 className="panel-title">Registered Organizations</h3>
          </div>
          <button
            type="button"
            className="role-action-btn secondary"
            onClick={() => onNavigate("organizations")}
          >
            <span>Manage Organizations</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="role-empty-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Loading organizations directory...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="role-empty-state">
            <Building2 size={32} />
            <h4>No Organizations Registered</h4>
            <p>Add your first hospitality organization to begin onboarding.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>ID</th>
                  <th>Organization Name</th>
                  <th style={{ width: "140px" }}>Code / Identifier</th>
                  <th style={{ width: "120px" }}>Status</th>
                  <th style={{ width: "140px", textAlign: "right" }}>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {organizations.slice(0, 8).map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => onNavigate("organizations")}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className="role-code-badge">#{org.id}</span>
                    </td>
                    <td>
                      <strong style={{ color: "var(--text-primary)" }}>{org.name}</strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
                        {org.code || `ORG-${org.id}`}
                      </span>
                    </td>
                    <td>
                      <span className="role-status-chip active">
                        <Check size={11} /> Active
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                      {org.createdAt ? new Date(org.createdAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================
   2. BRANCH MANAGER DASHBOARD VIEW
   ==================================================================== */
export function BranchManagerDashboardView({
  user,
  totalSalesToday,
  counterSalesToday,
  tableSalesToday,
  activeOrders,
  counterActiveCount,
  tableActiveCount,
  totalOrdersCount,
  liveKitchenTickets,
  readyKotCount,
  pendingKotCount,
  preparingKotCount,
  occupiedTablesCount,
  totalTablesCount,
  occupancyPercent,
  topDishes,
  hourlyBars,
  refreshing,
  onRefresh,
  onNavigate
}) {
  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="BRANCH OPERATIONS"
        title={`${user?.branchName || "Branch"} Operational Overview`}
        subtitle="Real-time sales, open customer orders, and kitchen queue"
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 4 Compact Summary Cards */}
      <div className="role-kpi-grid grid-4">
        <RoleKpiCard
          label="Today's Gross Sales"
          value={`₹${totalSalesToday.toLocaleString()}`}
          subtext={`₹${tableSalesToday.toLocaleString()} Dine-In • ₹${counterSalesToday.toLocaleString()} Counter`}
          icon={TrendingUp}
          variant="forest"
          onClick={() => onNavigate("billing")}
        />
        <RoleKpiCard
          label="Active Orders"
          value={activeOrders.length}
          subtext={`${counterActiveCount} Counter • ${tableActiveCount} Table Service`}
          icon={ShoppingCart}
          variant="gold"
          onClick={() => onNavigate("orders")}
          badgeText={activeOrders.length > 0 ? "In Progress" : undefined}
        />
        <RoleKpiCard
          label="Kitchen Queue"
          value={liveKitchenTickets}
          subtext={`${pendingKotCount} pending • ${preparingKotCount} cooking • ${readyKotCount} ready`}
          icon={Clock}
          variant="amber"
          onClick={() => onNavigate("kds")}
          badgeText={readyKotCount > 0 ? `${readyKotCount} Ready` : undefined}
        />
        <RoleKpiCard
          label="Table Occupancy"
          value={`${occupiedTablesCount} / ${totalTablesCount || "—"}`}
          subtext={`${Math.max(totalTablesCount - occupiedTablesCount, 0)} dining tables available`}
          icon={Store}
          variant="neutral"
          onClick={() => onNavigate("orders")}
          badgeText={`${occupancyPercent}%`}
        />
      </div>

      <div className="role-content-split">
        {/* Left: Live Floor Activity */}
        <div className="role-panel" style={{ flex: "1.4" }}>
          <div className="role-panel-head">
            <div>
              <span className="panel-eyebrow">LIVE FLOOR STREAM</span>
              <h3 className="panel-title">Active Customer Orders ({activeOrders.length})</h3>
            </div>
            <button
              type="button"
              className="role-action-btn secondary"
              onClick={() => onNavigate("orders")}
            >
              <span>View All Orders</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="role-empty-state">
              <CheckCircle2 size={32} style={{ color: "var(--success-600)" }} />
              <h4>All Orders Fulfilled</h4>
              <p>No active orders currently awaiting cooking or cashier settlement.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="role-table">
                <thead>
                  <tr>
                    <th style={{ width: "95px" }}>Order</th>
                    <th style={{ width: "120px" }}>Channel</th>
                    <th>Items</th>
                    <th style={{ width: "95px" }}>Status</th>
                    <th style={{ width: "95px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.slice(0, 6).map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => onNavigate("orders")}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <strong>{ord.orderNumber}</strong>
                        <span className="role-row-subtext">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </td>
                      <td>
                        {ord.saleType === "SELF_SERVICE" ? (
                          <span className="role-channel-tag counter">Counter POS</span>
                        ) : (
                          <span className="role-channel-tag table">Table {ord.tableNumber || "Service"}</span>
                        )}
                      </td>
                      <td>
                        <span className="role-items-text">
                          {(ord.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ") || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`role-status-chip ${ord.status === "Ready" || ord.status === "Served" ? "active" : "pending"}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong>₹{Number(ord.totalAmount || 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Top Selling Menu Dishes + Quick Actions */}
        <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="role-panel">
            <div className="role-panel-head">
              <div>
                <span className="panel-eyebrow">MENU VELOCITY</span>
                <h3 className="panel-title">Top Selling Dishes</h3>
              </div>
              <button
                type="button"
                className="role-link-btn"
                onClick={() => onNavigate("menu")}
              >
                Menu Catalog
              </button>
            </div>

            {topDishes.length === 0 ? (
              <div className="role-empty-state compact">
                <p>No dishes sold yet today. New orders will appear here automatically.</p>
              </div>
            ) : (
              <table className="role-compact-table">
                <thead>
                  <tr>
                    <th style={{ width: "28px" }}>#</th>
                    <th>Dish</th>
                    <th style={{ textAlign: "center", width: "45px" }}>Qty</th>
                    <th style={{ textAlign: "right", width: "75px" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topDishes.map((d) => (
                    <tr key={d.rank}>
                      <td><span className="role-rank-badge">{d.rank}</span></td>
                      <td><strong>{d.name}</strong></td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{d.qty}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--forest-900)" }}>{d.rev}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Actions */}
          <div className="role-panel" style={{ padding: "16px" }}>
            <span className="panel-eyebrow" style={{ marginBottom: "10px", display: "block" }}>QUICK ACTIONS</span>
            <div className="role-actions-grid">
              <button
                type="button"
                className="role-quick-btn primary"
                onClick={() => onNavigate("billing")}
              >
                <Zap size={14} /> Cashier POS
              </button>
              <button
                type="button"
                className="role-quick-btn"
                onClick={() => onNavigate("orders")}
              >
                <ShoppingCart size={14} /> New Order
              </button>
              <button
                type="button"
                className="role-quick-btn"
                onClick={() => onNavigate("kds")}
              >
                <Utensils size={14} /> Kitchen KDS
              </button>
              <button
                type="button"
                className="role-quick-btn"
                onClick={() => onNavigate("production_plan")}
              >
                <Calendar size={14} /> Production Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   3. KITCHEN MANAGER DASHBOARD VIEW
   ==================================================================== */
export function KitchenManagerDashboardView({
  user,
  liveKitchenTickets,
  pendingKotCount,
  preparingKotCount,
  readyKotCount,
  plannedBatchesCount,
  lowStockCount,
  kots = [],
  refreshing,
  onRefresh,
  onNavigate
}) {
  const activeKots = kots.filter(
    (k) =>
      k.status !== "Closed" &&
      k.status !== "Completed" &&
      k.status !== "Served" &&
      k.status !== "Cancelled"
  );

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="KITCHEN OPERATIONS"
        title="Kitchen & Production Summary"
        subtitle={`${user?.branchName || "Branch"} • Culinary orders, daily batches & stock control`}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 4 Compact Summary Cards */}
      <div className="role-kpi-grid grid-4">
        <RoleKpiCard
          label="Active Kitchen Tickets"
          value={liveKitchenTickets}
          subtext={`${pendingKotCount} pending queue • ${preparingKotCount} in preparation`}
          icon={Clock}
          variant="amber"
          onClick={() => onNavigate("kds")}
          badgeText={liveKitchenTickets > 0 ? "Active Load" : "Clear"}
        />
        <RoleKpiCard
          label="Ready for Service"
          value={readyKotCount}
          subtext="Plated tickets awaiting pickup by dining staff"
          icon={Utensils}
          variant="forest"
          onClick={() => onNavigate("kds")}
          badgeText={readyKotCount > 0 ? "Pickup" : undefined}
        />
        <RoleKpiCard
          label="Daily Production Batches"
          value={`${plannedBatchesCount} Batches`}
          subtext="Planned portion batches scheduled for today"
          icon={Calendar}
          variant="gold"
          onClick={() => onNavigate("production_plan")}
        />
        <RoleKpiCard
          label="Low Stock Ingredients"
          value={lowStockCount}
          subtext="Raw materials below minimum reorder threshold"
          icon={AlertTriangle}
          variant={lowStockCount > 0 ? "rose" : "neutral"}
          onClick={() => onNavigate("inventory")}
          badgeText={lowStockCount > 0 ? "Action Req" : "OK"}
        />
      </div>

      <div className="role-content-split">
        {/* Active KOTs Queue */}
        <div className="role-panel" style={{ flex: "1.4" }}>
          <div className="role-panel-head">
            <div>
              <span className="panel-eyebrow">LIVE KDS QUEUE</span>
              <h3 className="panel-title">Active Kitchen Tickets ({activeKots.length})</h3>
            </div>
            <button
              type="button"
              className="role-action-btn secondary"
              onClick={() => onNavigate("kds")}
            >
              <span>Open KDS</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {activeKots.length === 0 ? (
            <div className="role-empty-state">
              <CheckCircle2 size={32} style={{ color: "var(--success-600)" }} />
              <h4>Kitchen Queue is Clear</h4>
              <p>No active kitchen order tickets currently in preparation.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="role-table">
                <thead>
                  <tr>
                    <th style={{ width: "95px" }}>Ticket #</th>
                    <th style={{ width: "110px" }}>Table / Destination</th>
                    <th>Ordered Dishes</th>
                    <th style={{ width: "100px" }}>Prep Status</th>
                    <th style={{ width: "85px", textAlign: "right" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activeKots.slice(0, 7).map((kot) => (
                    <tr
                      key={kot.id}
                      onClick={() => onNavigate("kds")}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <strong>{kot.kotNumber || `KOT-${kot.id}`}</strong>
                      </td>
                      <td>
                        {kot.tableNumber ? (
                          <span className="role-channel-tag table">Table {kot.tableNumber}</span>
                        ) : (
                          <span className="role-channel-tag counter">Takeaway / POS</span>
                        )}
                      </td>
                      <td>
                        <span className="role-items-text">
                          {(kot.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ") || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`role-status-chip ${kot.status === "Ready" ? "active" : kot.status === "Preparing" ? "cooking" : "pending"}`}>
                          {kot.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                        {kot.createdAt ? new Date(kot.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Quick Production Actions */}
        <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="role-panel" style={{ padding: "20px" }}>
            <span className="panel-eyebrow" style={{ marginBottom: "12px", display: "block" }}>KITCHEN SHORTCUTS</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="role-wide-action-btn primary"
                onClick={() => onNavigate("kds")}
              >
                <Utensils size={16} />
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong>Kitchen Display System (KDS)</strong>
                  <small>Full-screen interactive cook ticket view</small>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="role-wide-action-btn secondary"
                onClick={() => onNavigate("production_plan")}
              >
                <Calendar size={16} />
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong>Daily Production Plan</strong>
                  <small>Target batch quantities & portion scheduling</small>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="role-wide-action-btn secondary"
                onClick={() => onNavigate("material_issue")}
              >
                <Share2 size={16} />
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong>Material Issue to Kitchen</strong>
                  <small>Receive bulk ingredients from store</small>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="role-wide-action-btn secondary"
                onClick={() => onNavigate("inventory")}
              >
                <Package size={16} />
                <div style={{ textAlign: "left", flex: 1 }}>
                  <strong>Central Inventory</strong>
                  <small>Stock register and ingredient availability</small>
                </div>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   4. CHEF DASHBOARD VIEW
   ==================================================================== */
export function ChefDashboardView({
  user,
  pendingKotCount,
  preparingKotCount,
  readyKotCount,
  kots = [],
  refreshing,
  onRefresh,
  onNavigate
}) {
  const activeKots = kots.filter(
    (k) =>
      k.status !== "Closed" &&
      k.status !== "Completed" &&
      k.status !== "Served" &&
      k.status !== "Cancelled"
  );

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="CHEF STATION"
        title="Active Orders & Preparation Status"
        subtitle={`${user?.branchName || "Branch"} • Active cooking tickets and preparation queue`}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 3 Compact Summary Cards */}
      <div className="role-kpi-grid grid-3">
        <RoleKpiCard
          label="Pending Tickets"
          value={pendingKotCount}
          subtext="Awaiting cooking start"
          icon={Clock}
          variant="amber"
          onClick={() => onNavigate("kds")}
          badgeText="Queue"
        />
        <RoleKpiCard
          label="In Preparation"
          value={preparingKotCount}
          subtext="Currently on cooktops / ovens"
          icon={ChefHat}
          variant="gold"
          onClick={() => onNavigate("kds")}
          badgeText="Cooking"
        />
        <RoleKpiCard
          label="Ready for Service"
          value={readyKotCount}
          subtext="Plated dishes awaiting waiter delivery"
          icon={CheckCircle2}
          variant="forest"
          onClick={() => onNavigate("kds")}
          badgeText="Plated"
        />
      </div>

      <div className="role-panel">
        <div className="role-panel-head">
          <div>
            <span className="panel-eyebrow">PREPARATION QUEUE</span>
            <h3 className="panel-title">Active Orders ({activeKots.length})</h3>
          </div>
          <button
            type="button"
            className="role-action-btn primary"
            onClick={() => onNavigate("kds")}
          >
            <Utensils size={14} />
            <span>Launch Fullscreen KDS</span>
          </button>
        </div>

        {activeKots.length === 0 ? (
          <div className="role-empty-state">
            <CheckCircle2 size={36} style={{ color: "var(--success-600)" }} />
            <h4>No Active Tickets in Kitchen</h4>
            <p>All customer orders have been prepared and plated. Great work, Chef!</p>
          </div>
        ) : (
          <div className="chef-tickets-grid">
            {activeKots.map((kot) => (
              <div
                key={kot.id}
                className={`chef-ticket-card status-${(kot.status || "").toLowerCase()}`}
                onClick={() => onNavigate("kds")}
              >
                <div className="chef-ticket-head">
                  <div>
                    <strong className="chef-ticket-number">{kot.kotNumber || `KOT #${kot.id}`}</strong>
                    <span className="chef-ticket-dest">
                      {kot.tableNumber ? `Table ${kot.tableNumber}` : "Counter POS"}
                    </span>
                  </div>
                  <span className={`role-status-chip ${kot.status === "Ready" ? "active" : kot.status === "Preparing" ? "cooking" : "pending"}`}>
                    {kot.status}
                  </span>
                </div>

                <div className="chef-ticket-items">
                  {(kot.items || []).map((it, idx) => (
                    <div key={idx} className="chef-ticket-item-row">
                      <span className="item-qty">{it.quantity}×</span>
                      <span className="item-name">{it.menuItemName}</span>
                      {it.notes && <span className="item-notes">({it.notes})</span>}
                    </div>
                  ))}
                </div>

                <div className="chef-ticket-foot">
                  <span className="chef-ticket-time">
                    <Clock size={12} />
                    {kot.createdAt ? new Date(kot.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <span className="chef-ticket-link">View in KDS →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================
   5. INVENTORY MANAGER DASHBOARD VIEW
   ==================================================================== */
export function InventoryManagerDashboardView({
  user,
  lowStockCount,
  outOfStockCount,
  plannedBatchesCount,
  inventoryItems = [],
  refreshing,
  onRefresh,
  onNavigate
}) {
  const lowStockItems = inventoryItems.filter(
    (it) => it.currentStock <= (it.minStockLevel || 10)
  );

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="CENTRAL STORES"
        title="Inventory & Stock Summary"
        subtitle={`${user?.branchName || "Branch"} • Raw material stock levels, depletion alerts & replenishment`}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 3 Compact Summary Cards */}
      <div className="role-kpi-grid grid-3">
        <RoleKpiCard
          label="Low Stock Materials"
          value={lowStockCount}
          subtext="Items below minimum reorder point"
          icon={AlertTriangle}
          variant={lowStockCount > 0 ? "amber" : "neutral"}
          onClick={() => onNavigate("inventory")}
          badgeText={lowStockCount > 0 ? "Reorder" : "Adequate"}
        />
        <RoleKpiCard
          label="Out of Stock"
          value={outOfStockCount}
          subtext="Critical raw materials completely depleted"
          icon={Package}
          variant={outOfStockCount > 0 ? "rose" : "neutral"}
          onClick={() => onNavigate("inventory")}
          badgeText={outOfStockCount > 0 ? "Depleted" : "Zero"}
        />
        <RoleKpiCard
          label="Production Batches Today"
          value={`${plannedBatchesCount} Batches`}
          subtext="Ingredient allocations required by kitchen"
          icon={Calendar}
          variant="forest"
          onClick={() => onNavigate("production_plan")}
        />
      </div>

      <div className="role-panel">
        <div className="role-panel-head">
          <div>
            <span className="panel-eyebrow">REORDER ALERTS</span>
            <h3 className="panel-title">Critical & Low Stock Raw Materials ({lowStockItems.length})</h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="role-action-btn secondary"
              onClick={() => onNavigate("material_issue")}
            >
              <Share2 size={14} />
              <span>Issue Material</span>
            </button>
            <button
              type="button"
              className="role-action-btn primary"
              onClick={() => onNavigate("inventory")}
            >
              <Package size={14} />
              <span>Full Inventory</span>
            </button>
          </div>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="role-empty-state">
            <CheckCircle2 size={36} style={{ color: "var(--success-600)" }} />
            <h4>Stock Levels Healthy</h4>
            <p>All monitored raw materials are currently above their reorder thresholds.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Raw Material</th>
                  <th style={{ width: "130px" }}>Category</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Current Stock</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Reorder Level</th>
                  <th style={{ width: "90px" }}>Unit</th>
                  <th style={{ width: "110px" }}>Alert</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.slice(0, 8).map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => onNavigate("inventory")}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <strong>{it.name}</strong>
                      <span className="role-row-subtext">{it.itemCode || `ITM-${it.id}`}</span>
                    </td>
                    <td>
                      <span className="role-category-tag">{it.category || "General"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong style={{ color: it.currentStock <= 0 ? "var(--danger-600)" : "var(--warning-700)" }}>
                        {Number(it.currentStock || 0).toLocaleString()}
                      </strong>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {Number(it.minStockLevel || 0).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{it.unit || "units"}</span>
                    </td>
                    <td>
                      <span className={`role-status-chip ${it.currentStock <= 0 ? "danger" : "warning"}`}>
                        {it.currentStock <= 0 ? "Depleted" : "Low Stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================
   6. WAITER DASHBOARD VIEW
   ==================================================================== */
export function WaiterDashboardView({
  user,
  totalTablesCount,
  occupiedTablesCount,
  occupancyPercent,
  readyKotCount,
  activeOrders = [],
  refreshing,
  onRefresh,
  onNavigate
}) {
  const tableOrders = activeOrders.filter((o) => o.saleType !== "SELF_SERVICE");

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="DINING ROOM SERVICE"
        title="Assigned Tables & Active Orders"
        subtitle={`${user?.branchName || "Branch"} • Floor plan occupancy, active table orders & ready pickups`}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 3 Compact Summary Cards */}
      <div className="role-kpi-grid grid-3">
        <RoleKpiCard
          label="Dining Tables"
          value={totalTablesCount || "—"}
          subtext="Total tables on restaurant dining floor"
          icon={Store}
          variant="forest"
          onClick={() => onNavigate("orders")}
        />
        <RoleKpiCard
          label="Occupied Tables"
          value={occupiedTablesCount}
          subtext={`${occupancyPercent}% floor capacity in service`}
          icon={Users}
          variant="gold"
          onClick={() => onNavigate("orders")}
          badgeText={`${occupancyPercent}%`}
        />
        <RoleKpiCard
          label="Food Ready for Pickup"
          value={readyKotCount}
          subtext="Dishes plated in kitchen ready for guest delivery"
          icon={Utensils}
          variant={readyKotCount > 0 ? "amber" : "neutral"}
          onClick={() => onNavigate("orders")}
          badgeText={readyKotCount > 0 ? "Pickup" : "Clear"}
        />
      </div>

      <div className="role-panel">
        <div className="role-panel-head">
          <div>
            <span className="panel-eyebrow">FLOOR ORDERS</span>
            <h3 className="panel-title">Active Table Service Orders ({tableOrders.length})</h3>
          </div>
          <button
            type="button"
            className="role-action-btn primary"
            onClick={() => onNavigate("orders")}
          >
            <ShoppingCart size={14} />
            <span>New Table Order</span>
          </button>
        </div>

        {tableOrders.length === 0 ? (
          <div className="role-empty-state">
            <CheckCircle2 size={36} style={{ color: "var(--success-600)" }} />
            <h4>No Active Table Orders</h4>
            <p>All dining tables are currently free or orders have been served.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th style={{ width: "95px" }}>Table</th>
                  <th style={{ width: "110px" }}>Order #</th>
                  <th>Dishes Ordered</th>
                  <th style={{ width: "100px" }}>Status</th>
                  <th style={{ width: "95px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {tableOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => onNavigate("orders")}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className="role-channel-tag table">
                        Table {ord.tableNumber || "Service"}
                      </span>
                    </td>
                    <td>
                      <strong>{ord.orderNumber}</strong>
                    </td>
                    <td>
                      <span className="role-items-text">
                        {(ord.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ") || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`role-status-chip ${ord.status === "Ready" || ord.status === "Served" ? "active" : "pending"}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>₹{Number(ord.totalAmount || 0).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================
   7. CASHIER DASHBOARD VIEW
   ==================================================================== */
export function CashierDashboardView({
  user,
  totalSalesToday,
  counterSalesToday,
  tableSalesToday,
  activeOrders = [],
  orders = [],
  refreshing,
  onRefresh,
  onNavigate
}) {
  const settledOrders = orders.filter((o) => o.status === "Closed" || o.status === "Paid");

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="FRONT DESK & POS"
        title="Billing & Sales Summary"
        subtitle={`${user?.branchName || "Branch"} • Daily sales, counter billing, and settled receipts`}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 4 Compact Summary Cards */}
      <div className="role-kpi-grid grid-4">
        <RoleKpiCard
          label="Today's Gross Sales"
          value={`₹${totalSalesToday.toLocaleString()}`}
          subtext="Total revenue billed & settled today"
          icon={TrendingUp}
          variant="forest"
          onClick={() => onNavigate("billing")}
        />
        <RoleKpiCard
          label="Counter Sales"
          value={`₹${counterSalesToday.toLocaleString()}`}
          subtext="Quick counter takeaway settlements"
          icon={Zap}
          variant="gold"
          onClick={() => onNavigate("billing")}
        />
        <RoleKpiCard
          label="Table Service Sales"
          value={`₹${tableSalesToday.toLocaleString()}`}
          subtext="Dine-in floor table billing settlements"
          icon={Store}
          variant="amber"
          onClick={() => onNavigate("billing")}
        />
        <RoleKpiCard
          label="Awaiting Payment"
          value={activeOrders.length}
          subtext="Active orders currently open on the floor"
          icon={Receipt}
          variant={activeOrders.length > 0 ? "rose" : "neutral"}
          onClick={() => onNavigate("billing")}
          badgeText={activeOrders.length > 0 ? "Pending" : "All Clear"}
        />
      </div>

      <div className="role-panel">
        <div className="role-panel-head">
          <div>
            <span className="panel-eyebrow">TRANSACTION REGISTER</span>
            <h3 className="panel-title">Recent Settled Bills ({settledOrders.length})</h3>
          </div>
          <button
            type="button"
            className="role-action-btn primary"
            onClick={() => onNavigate("billing")}
          >
            <Receipt size={14} />
            <span>Open Cashier POS</span>
          </button>
        </div>

        {settledOrders.length === 0 ? (
          <div className="role-empty-state">
            <Receipt size={36} />
            <h4>No Settled Bills Recorded Yet</h4>
            <p>Completed POS checkouts and invoice collections will appear here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>Invoice / Order</th>
                  <th style={{ width: "120px" }}>Channel</th>
                  <th>Items Billed</th>
                  <th style={{ width: "100px" }}>Payment</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Amount</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {settledOrders.slice(0, 8).map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => onNavigate("billing")}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <strong>{ord.orderNumber}</strong>
                    </td>
                    <td>
                      {ord.saleType === "SELF_SERVICE" ? (
                        <span className="role-channel-tag counter">Counter POS</span>
                      ) : (
                        <span className="role-channel-tag table">Table {ord.tableNumber || "Service"}</span>
                      )}
                    </td>
                    <td>
                      <span className="role-items-text">
                        {(ord.items || []).map((it) => `${it.menuItemName} × ${it.quantity}`).join(", ") || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="role-status-chip active">
                        <Check size={11} /> Paid
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong style={{ color: "var(--forest-900)" }}>
                        ₹{Number(ord.totalAmount || 0).toFixed(2)}
                      </strong>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================
   8. ACCOUNTANT DASHBOARD VIEW
   ==================================================================== */
export function AccountantDashboardView({
  user,
  totalSalesToday,
  counterSalesToday,
  tableSalesToday,
  orders = [],
  refreshing,
  onRefresh,
  onNavigate
}) {
  const closedOrPaidOrders = orders.filter((o) => o.status === "Closed" || o.status === "Paid");
  const counterCount = closedOrPaidOrders.filter((o) => o.saleType === "SELF_SERVICE").length;
  const tableCount = closedOrPaidOrders.filter((o) => o.saleType !== "SELF_SERVICE").length;

  const counterPct = totalSalesToday > 0 ? Math.round((counterSalesToday / totalSalesToday) * 100) : 0;
  const tablePct = totalSalesToday > 0 ? Math.round((tableSalesToday / totalSalesToday) * 100) : 0;

  return (
    <div className="role-dashboard-view">
      <RoleDashboardHeader
        eyebrow="FINANCIAL CONTROL"
        title="Financial & Revenue Summary"
        subtitle={`${user?.branchName || "Branch"} • Real-time daily revenue, payment reconciliation & channel breakdown`}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 4 Compact Summary Cards */}
      <div className="role-kpi-grid grid-4">
        <RoleKpiCard
          label="Total Gross Revenue"
          value={`₹${totalSalesToday.toLocaleString()}`}
          subtext="Net sales settled across all channels"
          icon={TrendingUp}
          variant="forest"
          onClick={() => onNavigate("reports")}
        />
        <RoleKpiCard
          label="Dine-in Revenue"
          value={`₹${tableSalesToday.toLocaleString()}`}
          subtext={`${tablePct}% of today's total revenue`}
          icon={Store}
          variant="gold"
          onClick={() => onNavigate("reports")}
          badgeText={`${tablePct}%`}
        />
        <RoleKpiCard
          label="Counter POS Revenue"
          value={`₹${counterSalesToday.toLocaleString()}`}
          subtext={`${counterPct}% of today's total revenue`}
          icon={Zap}
          variant="amber"
          onClick={() => onNavigate("reports")}
          badgeText={`${counterPct}%`}
        />
        <RoleKpiCard
          label="Settled Invoices"
          value={closedOrPaidOrders.length}
          subtext={`${tableCount} Dine-in • ${counterCount} Counter`}
          icon={Receipt}
          variant="neutral"
          onClick={() => onNavigate("billing")}
        />
      </div>

      <div className="role-panel">
        <div className="role-panel-head">
          <div>
            <span className="panel-eyebrow">CHANNEL RECONCILIATION</span>
            <h3 className="panel-title">Daily Revenue by Service Channel</h3>
          </div>
          <button
            type="button"
            className="role-action-btn secondary"
            onClick={() => onNavigate("reports")}
          >
            <FileSpreadsheet size={14} />
            <span>Full Financial Reports</span>
          </button>
        </div>

        <div className="table-wrap">
          <table className="role-table">
            <thead>
              <tr>
                <th>Service Channel</th>
                <th style={{ width: "140px", textAlign: "center" }}>Settled Orders</th>
                <th style={{ width: "150px", textAlign: "right" }}>Total Revenue</th>
                <th style={{ width: "130px", textAlign: "right" }}>Revenue Share</th>
                <th style={{ width: "130px", textAlign: "right" }}>Avg Ticket Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style={{ color: "var(--text-primary)" }}>🍽️ Dining Table Service</strong>
                  <span className="role-row-subtext">Seated restaurant floor dining</span>
                </td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{tableCount}</td>
                <td style={{ textAlign: "right" }}>
                  <strong>₹{tableSalesToday.toLocaleString()}</strong>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="role-status-chip active">{tablePct}%</span>
                </td>
                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  ₹{tableCount > 0 ? Math.round(tableSalesToday / tableCount).toLocaleString() : "0"}
                </td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: "var(--text-primary)" }}>🛍️ Counter POS & Takeaway</strong>
                  <span className="role-row-subtext">Express self-service collections</span>
                </td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{counterCount}</td>
                <td style={{ textAlign: "right" }}>
                  <strong>₹{counterSalesToday.toLocaleString()}</strong>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="role-status-chip active">{counterPct}%</span>
                </td>
                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  ₹{counterCount > 0 ? Math.round(counterSalesToday / counterCount).toLocaleString() : "0"}
                </td>
              </tr>
              <tr style={{ background: "var(--bg-surface-subtle)", fontWeight: 700 }}>
                <td>
                  <span>Total Daily Reconciliation</span>
                </td>
                <td style={{ textAlign: "center" }}>{closedOrPaidOrders.length}</td>
                <td style={{ textAlign: "right", color: "var(--forest-900)" }}>
                  ₹{totalSalesToday.toLocaleString()}
                </td>
                <td style={{ textAlign: "right" }}>100%</td>
                <td style={{ textAlign: "right" }}>
                  ₹{closedOrPaidOrders.length > 0 ? Math.round(totalSalesToday / closedOrPaidOrders.length).toLocaleString() : "0"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
