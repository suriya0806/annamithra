import React, { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  Package,
  AlertOctagon,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Clock,
  ArrowDownToLine,
  Boxes,
  SlidersHorizontal,
  FileSpreadsheet
} from "lucide-react";
import { api } from "./api";
import { KitchenReportsView } from "./KitchenManagement";

/**
 * KitchenDashboard
 *
 * Dedicated Kitchen Dashboard featuring exactly 3 sections:
 * 1. Kitchen Stock (Real-time kitchen inventory + Material Received History)
 * 2. Inventory Items (Materials & ingredients catalog for kitchen operations)
 * 3. Food Spoilage (Kitchen food waste/spoilage tracking and stock reduction)
 */
export default function KitchenDashboard({ user, initialTab = "stock", onNavigate }) {
  const normalizeTab = (tab) => {
    if (tab === "items" || tab === "inventory_items") return "items";
    if (tab === "spoilage" || tab === "food_spoilage") return "spoilage";
    if (tab === "reports" || tab === "kitchen_reports") return "reports";
    return "stock";
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId ? String(user.branchId) : "");
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState("");

  // Sync tab if parent changes initialTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  // Load branches for scope selector
  useEffect(() => {
    api.getBranches()
      .then((data) => {
        setBranches(data || []);
        if (!user?.branchId && data?.length > 0 && !selectedBranch) {
          setSelectedBranch(String(data[0].id));
        }
      })
      .catch(() => {});
  }, [user?.branchId]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  const activeBranchId = user?.branchId ? String(user.branchId) : selectedBranch;
  const canManage = [
    "Super Admin",
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Inventory Manager"
  ].includes(user?.role);

  const canViewReports = !["Staff", "Waiter", "Chef"].map(r => r.toLowerCase()).includes((user?.role || "").trim().toLowerCase());

  // Core sections under Kitchen Dashboard
  const tabOptions = [
    {
      id: "stock",
      label: "Kitchen Stock",
      icon: ChefHat,
      desc: "Live kitchen stock & Material Received History"
    },
    {
      id: "items",
      label: "Inventory Items",
      icon: Package,
      desc: "Kitchen raw materials, units & minimum levels"
    },
    {
      id: "spoilage",
      label: "Food Spoilage",
      icon: AlertOctagon,
      desc: "Record and review food spoilage & waste"
    },
    ...(canViewReports ? [
      {
        id: "reports",
        label: "Reports",
        icon: FileSpreadsheet,
        desc: "Purchase and GRN Reports"
      }
    ] : [])
  ];

  return (
    <div className="kitchen-dashboard-wrapper page-grid">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="production-toast success" role="alert">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toastMessage}</span>
          <button className="toast-close" onClick={() => setToastMessage("")} aria-label="Close">
            <X size={15} />
          </button>
        </div>
      )}
      {toastError && (
        <div className="production-toast error" role="alert">
          <AlertCircle size={18} className="toast-icon" />
          <span>{toastError}</span>
          <button className="toast-close" onClick={() => setToastError("")} aria-label="Close">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Segmented Navigation Tabs */}
      <div className="production-segmented-tabs-bar">
        <div className="segmented-tabs-track" role="tablist" aria-label="Kitchen Sections">
          {tabOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeTab === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`segmented-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(opt.id)}
              >
                <Icon size={16} />
                <span>{opt.label}</span>
                {isActive && <span className="tab-active-dot" />}
              </button>
            );
          })}
        </div>

        {!user?.branchId && branches.length > 1 && (
          <div className="production-branch-select-wrap">
            <Building2 size={15} className="branch-select-icon" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="production-branch-select"
              aria-label="Select Branch Scope"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Tab Content */}
      <div className="kitchen-tab-body">
        {activeTab === "stock" && (
          <KitchenStockSection
            user={user}
            branchId={activeBranchId}
            onSuccess={setToastMessage}
            onError={setToastError}
          />
        )}

        {activeTab === "items" && (
          <InventoryItemsSection
            user={user}
            branchId={activeBranchId}
            branches={branches}
            canManage={canManage}
            onSuccess={setToastMessage}
            onError={setToastError}
          />
        )}

        {activeTab === "spoilage" && (
          <FoodSpoilageSection
            user={user}
            branchId={activeBranchId}
            canManage={canManage}
            onSuccess={setToastMessage}
            onError={setToastError}
          />
        )}

        {activeTab === "reports" && (
          <KitchenReportsView
            user={user}
            branchId={activeBranchId}
            branches={branches}
            onSuccess={setToastMessage}
            onError={setToastError}
          />
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   SECTION 1: KITCHEN STOCK + MATERIAL RECEIVED HISTORY
   ========================================================================== */
function KitchenStockSection({ user, branchId, onSuccess, onError }) {
  const [stocks, setStocks] = useState([]);
  const [receivedHistory, setReceivedHistory] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  async function loadStock() {
    setLoadingStocks(true);
    try {
      const data = await api.getKitchenStock(branchId || undefined);
      setStocks(Array.isArray(data) ? data : []);
    } catch (err) {
      onError?.(err.message || "Failed to load kitchen stock");
    } finally {
      setLoadingStocks(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const issues = await api.getMaterialIssues(branchId || undefined);
      // Flatten issues into material receipt rows
      const flattened = [];
      (issues || []).forEach((iss) => {
        const base = {
          issueId: iss.id,
          issueNumber: iss.issueNumber || iss.reference || `MI-${iss.id}`,
          date: iss.date || iss.createdAt,
          source: "Central Inventory",
          receivedBy: iss.receivedBy || "Kitchen",
          status: iss.status || "Received by Kitchen",
          branchName: iss.branchName || ""
        };

        if (Array.isArray(iss.items) && iss.items.length > 0) {
          iss.items.forEach((it) => {
            flattened.push({
              id: `${iss.id}-${it.id || it.inventoryItemId}`,
              ...base,
              itemName: it.itemName || "Ingredient",
              quantity: it.quantity,
              unit: it.unit || "KG"
            });
          });
        } else {
          flattened.push({
            id: `iss-${iss.id}`,
            ...base,
            itemName: iss.remarks || "Bulk Kitchen Dispatch",
            quantity: iss.quantity || 1,
            unit: "Items"
          });
        }
      });
      setReceivedHistory(flattened);
    } catch (err) {
      onError?.(err.message || "Failed to load material received history");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadStock();
    loadHistory();
  }, [branchId]);

  // Categories from stock items
  const categories = useMemo(() => {
    const set = new Set(stocks.map((s) => s.category).filter(Boolean));
    return Array.from(set);
  }, [stocks]);

  // Filtered Kitchen Stock
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchesSearch =
        !stockSearch ||
        (s.itemName && s.itemName.toLowerCase().includes(stockSearch.toLowerCase())) ||
        (s.itemCode && s.itemCode.toLowerCase().includes(stockSearch.toLowerCase()));
      const matchesCat = !stockCategoryFilter || s.category === stockCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [stocks, stockSearch, stockCategoryFilter]);

  // Filtered Material Received History
  const filteredHistory = useMemo(() => {
    return receivedHistory.filter((h) => {
      if (!historySearch) return true;
      const q = historySearch.toLowerCase();
      return (
        (h.itemName && h.itemName.toLowerCase().includes(q)) ||
        (h.issueNumber && h.issueNumber.toLowerCase().includes(q)) ||
        (h.receivedBy && h.receivedBy.toLowerCase().includes(q)) ||
        (h.source && h.source.toLowerCase().includes(q))
      );
    });
  }, [receivedHistory, historySearch]);

  const totalKitchenUnits = useMemo(
    () => stocks.reduce((sum, s) => sum + (Number(s.currentStock) || 0), 0),
    [stocks]
  );
  const lowStockCount = useMemo(
    () => stocks.filter((s) => Number(s.currentStock) <= Number(s.reorderLevel)).length,
    [stocks]
  );
  const outOfStockCount = useMemo(
    () => stocks.filter((s) => Number(s.currentStock) <= 0).length,
    [stocks]
  );

  return (
    <div className="kitchen-stock-section" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Metrics Row */}
      <div
        className="kitchen-metrics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px"
        }}
      >
        <div className="stat-card">
          <span className="eyebrow">TOTAL KITCHEN ITEMS</span>
          <strong style={{ fontSize: "24px" }}>{stocks.length}</strong>
          <small>Active ingredients in kitchen</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">KITCHEN STOCK (QTY)</span>
          <strong style={{ fontSize: "24px", color: "var(--forest-900, #072518)" }}>
            {totalKitchenUnits.toFixed(2)}
          </strong>
          <small>Current available volume</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">LOW / OUT OF STOCK</span>
          <strong
            style={{
              fontSize: "24px",
              color: lowStockCount > 0 ? "#dc2626" : "#059669"
            }}
          >
            {lowStockCount}
          </strong>
          <small>{outOfStockCount} items at zero stock</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">MATERIAL RECEIVED</span>
          <strong style={{ fontSize: "24px", color: "#059669" }}>
            {receivedHistory.length}
          </strong>
          <small>Dispatches inwarded from Store</small>
        </div>
      </div>

      {/* Part 1: Current Kitchen Stock Table */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="eyebrow">REAL-TIME INGREDIENT INVENTORY</span>
            <h3>Kitchen Stock ({filteredStocks.length})</h3>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="secondary-btn compact"
              onClick={loadStock}
              title="Refresh Kitchen Stock"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar for Stock Table */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div className="filter-input-group" style={{ flex: "1 1 240px", minWidth: "200px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search ingredient or item code..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
          </div>
          <select
            value={stockCategoryFilter}
            onChange={(e) => setStockCategoryFilter(e.target.value)}
            style={{ minWidth: "150px" }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {(stockSearch || stockCategoryFilter) && (
            <button
              className="secondary-btn compact"
              onClick={() => {
                setStockSearch("");
                setStockCategoryFilter("");
              }}
              style={{ fontSize: "12px" }}
            >
              Clear
            </button>
          )}
        </div>

        {loadingStocks ? (
          <div className="loading" style={{ padding: "32px", textAlign: "center" }}>
            Fetching current kitchen stock from MySQL...
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center" }}>
            <ChefHat size={32} style={{ opacity: 0.35, marginBottom: "8px" }} />
            <div>
              {stocks.length === 0
                ? "No stock records inside the kitchen yet. Items will appear once materials are issued from Central Inventory."
                : "No ingredients match your filter criteria."}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item / Ingredient</th>
                  <th>Current Quantity</th>
                  <th>Unit</th>
                  <th>Available Stock</th>
                  <th>Low Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => {
                  const current = Number(s.currentStock) || 0;
                  const reorder = Number(s.reorderLevel) || 0;
                  const central = Number(s.centralStock) || 0;
                  const isOut = current <= 0;
                  const isLow = !isOut && current <= reorder;

                  const statusClass = isOut
                    ? "status-out-of-stock"
                    : isLow
                    ? "status-low-stock"
                    : "status-in-stock";
                  const statusLabel = isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK";

                  return (
                    <tr key={s.id || s.inventoryItemId}>
                      <td>
                        <strong>{s.itemName}</strong>
                        {s.itemCode && (
                          <span style={{ display: "block" }}>
                            <code className="code-chip">{s.itemCode}</code>
                          </span>
                        )}
                        {s.category && (
                          <span className="role-chip" style={{ marginLeft: s.itemCode ? "6px" : 0 }}>
                            {s.category}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong
                          style={{
                            fontSize: "15px",
                            color: isOut ? "#dc2626" : isLow ? "#d97706" : "inherit"
                          }}
                        >
                          {current.toFixed(3)}
                        </strong>
                      </td>
                      <td>{s.unit || "KG"}</td>
                      <td>
                        <strong style={{ fontSize: "14px", color: central <= 0 ? "#dc2626" : "#059669" }}>
                          {central.toFixed(3)} {s.unit || "KG"}
                        </strong>
                        <small style={{ display: "block", color: "var(--text-muted)", fontSize: "11px" }}>
                          In Central Inventory
                        </small>
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Part 2: Material Received History Table (Below current stock table) */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="eyebrow" style={{ color: "#059669" }}>
              INWARD & DISPATCH HISTORY
            </span>
            <h3>Material Received History ({filteredHistory.length})</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Materials and ingredients received by kitchen from Central Inventory via Store Material Issues.
            </p>
          </div>
          <button
            className="secondary-btn compact"
            onClick={loadHistory}
            title="Refresh Received History"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <RefreshCw size={14} /> Refresh History
          </button>
        </div>

        {/* Filter Bar for Received History */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "10px",
            alignItems: "center"
          }}
        >
          <div className="filter-input-group" style={{ flex: 1, minWidth: "240px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by material, issue number, or recipient..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
          {historySearch && (
            <button
              className="secondary-btn compact"
              onClick={() => setHistorySearch("")}
              style={{ fontSize: "12px" }}
            >
              Clear
            </button>
          )}
        </div>

        {loadingHistory ? (
          <div className="loading" style={{ padding: "32px", textAlign: "center" }}>
            Loading material receipt history...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center" }}>
            <ArrowDownToLine size={32} style={{ opacity: 0.35, marginBottom: "8px", color: "#059669" }} />
            <div>
              {receivedHistory.length === 0
                ? "No material received records yet. When raw materials are issued from Central Inventory to Kitchen, the receipt history will appear here."
                : "No material receipts match your search filter."}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Material / Item</th>
                  <th>Quantity Received</th>
                  <th>Unit</th>
                  <th>Source</th>
                  <th>Issue / Reference Number</th>
                  <th>Received By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const dateObj = new Date(item.date);
                  const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString() : "—";
                  const timeStr = !isNaN(dateObj)
                    ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—";

                  return (
                    <tr key={item.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{dateStr}</span>
                      </td>
                      <td>
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{timeStr}</span>
                      </td>
                      <td>
                        <strong>{item.itemName}</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#059669", fontSize: "14px" }}>
                          +{Number(item.quantity || 0).toFixed(3)}
                        </strong>
                      </td>
                      <td>{item.unit || "KG"}</td>
                      <td>
                        <span className="role-chip" style={{ background: "var(--brand-gold-light, #fbf6e8)", color: "var(--brand-gold-active, #966e12)", borderColor: "var(--brand-gold-border, #e6cb7e)" }}>
                          {item.source || "Central Inventory"}
                        </span>
                      </td>
                      <td>
                        <code className="code-chip">{item.issueNumber}</code>
                      </td>
                      <td>
                        <span>{item.receivedBy || "Received by Kitchen"}</span>
                      </td>
                      <td>
                        <span className="status-badge status-in-stock">
                          {item.status || "Received"}
                        </span>
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
  );
}

/* ==========================================================================
   SECTION 2: INVENTORY ITEMS
   ========================================================================== */
function InventoryItemsSection({ user, branchId, branches, canManage, onSuccess, onError }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const initialForm = {
    branchId: branchId || (branches?.[0]?.id ? String(branches[0].id) : ""),
    itemCode: "",
    name: "",
    category: "General",
    unit: "KG",
    minimumStock: "5",
    reorderLevel: "10",
    maximumStock: "50",
    openingStock: "0",
    description: "",
    reference: ""
  };
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [itemList, catList] = await Promise.all([
        api.getInventoryItems({
          branchId: branchId || undefined,
          includeInactive: true
        }),
        api.getCategories()
      ]);
      setItems(Array.isArray(itemList) ? itemList : []);
      setCategories(Array.isArray(catList) ? catList : []);
    } catch (err) {
      onError?.(err.message || "Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

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

  function handleOpenCreate() {
    setEditingItem(null);
    setForm({
      ...initialForm,
      branchId: branchId || (branches?.[0]?.id ? String(branches[0].id) : "")
    });
    setShowModal(true);
  }

  function handleOpenEdit(item) {
    setEditingItem(item);
    setForm({
      branchId: item.branchId ? String(item.branchId) : "",
      itemCode: item.itemCode || "",
      name: item.name || "",
      category: item.category || "General",
      unit: item.unit || "KG",
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : "0",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "0",
      maximumStock: item.maximumStock != null ? String(item.maximumStock) : "0",
      openingStock: "0",
      description: item.description || "",
      reference: ""
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, {
          itemCode: form.itemCode?.trim() || null,
          name: form.name.trim(),
          category: form.category?.trim() || "General",
          unit: form.unit.trim().toUpperCase(),
          minimumStock: Number(form.minimumStock || 0),
          reorderLevel: Number(form.reorderLevel || form.minimumStock || 0),
          maximumStock: Number(form.maximumStock || 0),
          description: form.description?.trim() || null
        });
        onSuccess?.(`Item "${form.name}" updated successfully.`);
      } else {
        await api.createInventoryItem({
          branchId: user.branchId ? Number(user.branchId) : Number(form.branchId),
          itemCode: form.itemCode?.trim() || null,
          name: form.name.trim(),
          category: form.category?.trim() || "General",
          unit: form.unit.trim().toUpperCase(),
          minimumStock: Number(form.minimumStock || 0),
          reorderLevel: Number(form.reorderLevel || form.minimumStock || 0),
          maximumStock: Number(form.maximumStock || 0),
          openingStock: Number(form.openingStock || 0),
          description: form.description?.trim() || null,
          reference: form.reference?.trim() || null
        });
        onSuccess?.(`Item "${form.name}" created successfully.`);
      }
      setShowModal(false);
      setEditingItem(null);
      await load();
    } catch (err) {
      onError?.(err.message || "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(item) {
    if (!window.confirm(`Deactivate inventory item "${item.name}" (${item.itemCode || `ITM-${item.id}`})?`)) return;
    try {
      await api.deactivateInventoryItem(item.id);
      onSuccess?.(`Item "${item.name}" deactivated.`);
      await load();
    } catch (err) {
      onError?.(err.message || "Failed to deactivate item");
    }
  }

  // Categories list
  const categoryOptions = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  return (
    <div className="inventory-items-section" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Metrics Row */}
      <div
        className="kitchen-metrics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px"
        }}
      >
        <div className="stat-card">
          <span className="eyebrow">TOTAL CATALOG ITEMS</span>
          <strong style={{ fontSize: "24px" }}>{items.length}</strong>
          <small>Registered ingredients & raw materials</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">IN STOCK</span>
          <strong style={{ fontSize: "24px", color: "#059669" }}>
            {items.filter((i) => Number(i.currentStock || 0) > Number(i.minimumStock || 0)).length}
          </strong>
          <small>Healthy stock levels</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">LOW STOCK</span>
          <strong style={{ fontSize: "24px", color: "#d97706" }}>
            {items.filter((i) => Number(i.currentStock || 0) > 0 && Number(i.currentStock || 0) <= Number(i.minimumStock || 0)).length}
          </strong>
          <small>At or below minimum threshold</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">OUT OF STOCK</span>
          <strong style={{ fontSize: "24px", color: "#dc2626" }}>
            {items.filter((i) => Number(i.currentStock || 0) <= 0).length}
          </strong>
          <small>Depleted inventory items</small>
        </div>
      </div>

      {/* Main Inventory Items Panel */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="eyebrow">KITCHEN RAW MATERIALS</span>
            <h3>Inventory Items ({filteredItems.length})</h3>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="secondary-btn compact" onClick={load} title="Refresh items">
              <RefreshCw size={14} /> Refresh
            </button>
            {canManage && (
              <button
                className="primary-btn compact"
                onClick={handleOpenCreate}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <Plus size={15} /> Add Item
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div className="filter-input-group" style={{ flex: "1 1 240px", minWidth: "200px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by Item Name, Code, or Category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Category:</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Status:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="IN STOCK">In Stock</option>
              <option value="LOW STOCK">Low Stock</option>
              <option value="OUT OF STOCK">Out of Stock</option>
            </select>
          </div>

          {(search || categoryFilter !== "All" || statusFilter !== "All") && (
            <button
              className="secondary-btn compact"
              onClick={() => {
                setSearch("");
                setCategoryFilter("All");
                setStatusFilter("All");
              }}
              style={{ fontSize: "12px" }}
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading" style={{ padding: "32px", textAlign: "center" }}>
            Loading inventory items from MySQL...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center" }}>
            <Package size={32} style={{ opacity: 0.35, marginBottom: "8px" }} />
            <div>No inventory items match your search or filter.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const current = Number(item.currentStock || 0);
                  const min = Number(item.minimumStock || 0);
                  const reorder = Number(item.reorderLevel || 0);
                  const isOut = current <= 0;
                  const isLow = !isOut && (item.lowStock || current <= (reorder > 0 ? reorder : min));

                  const statusClass = isOut
                    ? "status-out-of-stock"
                    : isLow
                    ? "status-low-stock"
                    : "status-in-stock";
                  const statusLabel = item.stockStatus || (isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK");

                  return (
                    <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.6 }}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.itemCode && (
                          <span style={{ display: "block" }}>
                            <code className="code-chip">{item.itemCode}</code>
                          </span>
                        )}
                        {item.description && (
                          <small style={{ display: "block", color: "var(--text-muted)", fontSize: "11px" }}>
                            {item.description}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="role-chip">{item.category || "General"}</span>
                      </td>
                      <td>{item.unit}</td>
                      <td>
                        <strong
                          style={{
                            fontSize: "14px",
                            color: isOut ? "#dc2626" : isLow ? "#d97706" : "inherit"
                          }}
                        >
                          {current.toFixed(3)}
                        </strong>
                      </td>
                      <td>{min.toFixed(3)}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            className="secondary-btn compact"
                            onClick={() => setViewingItem(item)}
                            title="View Item Details"
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Eye size={13} /> View
                          </button>
                          {canManage && (
                            <button
                              className="secondary-btn compact"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Item"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          )}
                          {canManage && (
                            <button
                              className="danger-btn compact"
                              onClick={() => handleDeactivate(item)}
                              title="Deactivate Item"
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

      {/* View Item Details Modal */}
      {viewingItem && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">INVENTORY ITEM SPECIFICATION</span>
                <h3>{viewingItem.name}</h3>
              </div>
              <button className="icon-btn" onClick={() => setViewingItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Item Code</span>
                <p><code>{viewingItem.itemCode || `ITM-${viewingItem.id}`}</code></p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Category</span>
                <p><span className="role-chip">{viewingItem.category || "General"}</span></p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Unit of Measure</span>
                <p><strong>{viewingItem.unit}</strong></p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Current Stock</span>
                <p><strong style={{ fontSize: "16px", color: "var(--forest-900, #072518)" }}>{Number(viewingItem.currentStock || 0).toFixed(3)} {viewingItem.unit}</strong></p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Minimum Threshold</span>
                <p>{Number(viewingItem.minimumStock || 0).toFixed(3)} {viewingItem.unit}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Reorder Level</span>
                <p>{Number(viewingItem.reorderLevel || 0).toFixed(3)} {viewingItem.unit}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Maximum Warehouse Capacity</span>
                <p>{Number(viewingItem.maximumStock || 0).toFixed(3)} {viewingItem.unit}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Last Updated</span>
                <p>{viewingItem.updatedAt ? new Date(viewingItem.updatedAt).toLocaleString() : new Date(viewingItem.createdAt).toLocaleString()}</p>
              </div>
              {viewingItem.description && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Description & Kitchen Notes</span>
                  <p style={{ margin: "4px 0 0 0", background: "var(--bg-subtle)", padding: "10px", borderRadius: "6px" }}>
                    {viewingItem.description}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
              <button className="secondary-btn" onClick={() => setViewingItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{editingItem ? "EDIT INVENTORY ITEM" : "NEW INVENTORY ITEM"}</span>
                <h3>{editingItem ? `Edit: ${editingItem.name}` : "Add Inventory Item"}</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-grid" style={{ padding: "24px 28px" }}>
              {!user?.branchId && !editingItem && (
                <label className="field">
                  <span>Branch *</span>
                  <select
                    required
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Item Code</span>
                <input
                  type="text"
                  placeholder="e.g. ITM-1001 (auto if blank)"
                  value={form.itemCode}
                  onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Item Name *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rice, Chicken, Tomato"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Category</span>
                <input
                  type="text"
                  placeholder="e.g. Grain, Meat, Vegetable"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Unit of Measure *</span>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option>KG</option>
                  <option>G</option>
                  <option>L</option>
                  <option>ML</option>
                  <option>PCS</option>
                  <option>BOX</option>
                  <option>PACK</option>
                </select>
              </label>
              <label className="field">
                <span>Minimum Stock</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.minimumStock}
                  onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Reorder Level</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Maximum Stock</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.maximumStock}
                  onChange={(e) => setForm({ ...form, maximumStock: e.target.value })}
                />
              </label>
              {!editingItem && (
                <label className="field">
                  <span>Opening Stock (Optional)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.openingStock}
                    onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                  />
                </label>
              )}
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Description / Notes</span>
                <input
                  type="text"
                  placeholder="Optional ingredient specifications or storage notes"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <div
                className="form-action"
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "12px"
                }}
              >
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn compact" disabled={submitting}>
                  {submitting ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
                  <Check size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SECTION 3: FOOD SPOILAGE
   ========================================================================== */
function FoodSpoilageSection({ user, branchId, canManage, onSuccess, onError }) {
  const [spoilageLogs, setSpoilageLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  // Record Spoilage Modal
  const [showModal, setShowModal] = useState(false);
  const [viewingLog, setViewingLog] = useState(null);
  const [spoilForm, setSpoilForm] = useState({
    inventoryItemId: "",
    quantity: "",
    reason: "Expired / Past Best-Before Date",
    disposalMethod: "Discarded in Waste / Organic Compost",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [txs, itms] = await Promise.all([
        api.getInventoryTransactions(branchId || undefined, undefined, "SPOILAGE"),
        api.getInventoryItems({ branchId: branchId || undefined })
      ]);
      setSpoilageLogs(Array.isArray(txs) ? txs : []);
      setItems(Array.isArray(itms) ? itms : []);
    } catch (err) {
      onError?.(err.message || "Failed to load food spoilage records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  const filteredLogs = useMemo(() => {
    return spoilageLogs.filter((l) => {
      const matchesSearch =
        !search ||
        (l.itemName && l.itemName.toLowerCase().includes(search.toLowerCase())) ||
        (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())) ||
        (l.createdBy && l.createdBy.toLowerCase().includes(search.toLowerCase()));
      const matchesReason =
        !reasonFilter || (l.notes && l.notes.toLowerCase().includes(reasonFilter.toLowerCase()));
      return matchesSearch && matchesReason;
    });
  }, [spoilageLogs, search, reasonFilter]);

  const totalUnitsSpoiled = useMemo(
    () => spoilageLogs.reduce((acc, l) => acc + Number(l.quantity || 0), 0),
    [spoilageLogs]
  );
  const distinctItemsCount = useMemo(
    () => new Set(spoilageLogs.map((l) => l.inventoryItemId)).size,
    [spoilageLogs]
  );

  function handleOpenSpoilModal() {
    const defaultId = items[0]?.id ? String(items[0].id) : "";
    setSpoilForm({
      inventoryItemId: defaultId,
      quantity: "",
      reason: "Expired / Past Best-Before Date",
      disposalMethod: "Discarded in Waste / Organic Compost",
      notes: ""
    });
    setShowModal(true);
  }

  async function handleSpoilSubmit(e) {
    e.preventDefault();
    if (!spoilForm.inventoryItemId) {
      onError?.("Please select an inventory item.");
      return;
    }
    const qty = Number(spoilForm.quantity);
    if (!qty || qty <= 0) {
      onError?.("Please enter a valid spoiled quantity greater than 0.");
      return;
    }
    const targetItem = items.find((i) => i.id === Number(spoilForm.inventoryItemId));
    if (targetItem && qty > Number(targetItem.currentStock)) {
      onError?.(
        `Spoiled quantity (${qty} ${targetItem.unit}) cannot exceed available stock (${targetItem.currentStock} ${targetItem.unit}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.recordSpoilage({
        inventoryItemId: Number(spoilForm.inventoryItemId),
        quantity: qty,
        reason: spoilForm.reason,
        disposalMethod: spoilForm.disposalMethod,
        notes: spoilForm.notes
      });
      onSuccess?.(res?.message || "Food spoilage recorded and inventory stock reduced.");
      setShowModal(false);
      await load();
    } catch (err) {
      onError?.(err.message || "Failed to record spoilage");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSpoilItem = items.find((i) => i.id === Number(spoilForm.inventoryItemId));

  return (
    <div className="food-spoilage-section" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Metrics Row */}
      <div
        className="kitchen-metrics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px"
        }}
      >
        <div className="stat-card">
          <span className="eyebrow">SPOILAGE INCIDENTS</span>
          <strong style={{ fontSize: "24px", color: "#dc2626" }}>{spoilageLogs.length}</strong>
          <small>Logged reduction events</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">TOTAL QUANTITY SPOILED</span>
          <strong style={{ fontSize: "24px", color: "#dc2626" }}>
            {totalUnitsSpoiled.toFixed(2)}
          </strong>
          <small>Cumulative units deducted</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">AFFECTED INGREDIENTS</span>
          <strong style={{ fontSize: "24px" }}>{distinctItemsCount}</strong>
          <small>Distinct products with spoilage</small>
        </div>
        <div className="stat-card">
          <span className="eyebrow">CATALOG ITEMS AVAILABLE</span>
          <strong style={{ fontSize: "24px", color: "#059669" }}>{items.length}</strong>
          <small>Monitored inventory materials</small>
        </div>
      </div>

      {/* Main Spoilage Log Panel */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="eyebrow" style={{ color: "#dc2626" }}>
              FOOD LOSS & WASTE CONTROL
            </span>
            <h3>Food Spoilage ({filteredLogs.length})</h3>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="secondary-btn compact" onClick={load} title="Refresh spoilage logs">
              <RefreshCw size={14} /> Refresh
            </button>
            {canManage && (
              <button
                className="danger-btn compact"
                onClick={handleOpenSpoilModal}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <AlertOctagon size={15} /> Record Food Spoilage
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div className="filter-input-group" style={{ flex: "1 1 240px", minWidth: "200px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by ingredient, reason, or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Reason:</span>
            <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
              <option value="">All Spoilage Reasons</option>
              <option value="Expired">Expired / Past Date</option>
              <option value="Deterioration">Physical / Quality Deterioration</option>
              <option value="Cold Storage">Cold Storage / Breakdown</option>
              <option value="Floor Contamination">Kitchen Floor Contamination</option>
              <option value="Pest">Insect / Pest Damage</option>
              <option value="Burnt">Overcooked / Burnt Batch</option>
              <option value="Defect">Packaging Defect</option>
            </select>
          </div>

          {(search || reasonFilter) && (
            <button
              className="secondary-btn compact"
              onClick={() => {
                setSearch("");
                setReasonFilter("");
              }}
              style={{ fontSize: "12px" }}
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading" style={{ padding: "32px", textAlign: "center" }}>
            Loading food spoilage records from MySQL...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center" }}>
            <AlertOctagon size={32} style={{ opacity: 0.35, marginBottom: "8px", color: "#dc2626" }} />
            <div>
              {spoilageLogs.length === 0
                ? "No food spoilage records logged yet. Use 'Record Food Spoilage' to document damaged, spoiled, or expired ingredients."
                : "No food spoilage records match your filter."}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item / Food</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Recorded By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const dateStr = log.createdAt
                    ? new Date(log.createdAt).toLocaleString()
                    : "—";

                  return (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.itemName}</strong>
                        {log.inventoryItemId && (
                          <span style={{ display: "block" }}>
                            <code className="code-chip">ITM-{log.inventoryItemId}</code>
                          </span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: "#dc2626", fontSize: "15px" }}>
                          -{Number(log.quantity || 0).toFixed(3)}
                        </strong>
                      </td>
                      <td>{log.unit || "KG"}</td>
                      <td>
                        <span
                          className="role-chip"
                          style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            borderColor: "#fca5a5"
                          }}
                        >
                          {log.notes || log.reference || "Food Spoilage"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px" }}>{dateStr}</span>
                      </td>
                      <td>
                        <span>{log.createdBy || "Chef / Kitchen Staff"}</span>
                      </td>
                      <td>
                        <span className="status-badge status-out-of-stock">
                          Spoiled / Deducted
                        </span>
                      </td>
                      <td>
                        <button
                          className="secondary-btn compact"
                          onClick={() => setViewingLog(log)}
                          title="View Spoilage Record"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Spoilage Audit Details Modal */}
      {viewingLog && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#dc2626" }}>SPOILAGE AUDIT DETAILS</span>
                <h3>{viewingLog.itemName}</h3>
              </div>
              <button className="icon-btn" onClick={() => setViewingLog(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Ingredient / Material</span>
                <p><strong>{viewingLog.itemName}</strong></p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Quantity Deducted</span>
                <p><strong style={{ color: "#dc2626", fontSize: "16px" }}>-{Number(viewingLog.quantity).toFixed(3)} {viewingLog.unit}</strong></p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Stock Before Spoilage</span>
                <p>{Number(viewingLog.stockBefore || 0).toFixed(3)} {viewingLog.unit}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Stock After Spoilage</span>
                <p>{Number(viewingLog.stockAfter || 0).toFixed(3)} {viewingLog.unit}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Recorded Date & Time</span>
                <p>{new Date(viewingLog.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Recorded By</span>
                <p>{viewingLog.createdBy || "Chef / Kitchen Staff"}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Reason & Cause Notes</span>
                <p style={{ margin: "4px 0 0 0", background: "rgba(239, 68, 68, 0.08)", padding: "10px", borderRadius: "6px", color: "#991b1b" }}>
                  {viewingLog.notes || viewingLog.reference || "Damaged or expired product"}
                </p>
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
              <button className="secondary-btn" onClick={() => setViewingLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Spoil Food Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#dc2626" }}>FOOD LOSS ENTRY</span>
                <h3>Record Spoil Food / Wastage</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSpoilSubmit} className="form-stack" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "13px",
                  color: "#991b1b"
                }}
              >
                <strong>Stock Reduction Notice:</strong> Recording spoiled food will immediately deduct the entered quantity from available inventory in MySQL and log a formal <code>SPOILAGE</code> audit transaction.
              </div>

              <label className="field">
                <span>Select Ingredient / Material *</span>
                <select
                  required
                  value={spoilForm.inventoryItemId}
                  onChange={(e) => setSpoilForm({ ...spoilForm, inventoryItemId: e.target.value })}
                >
                  <option value="">Select item...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} — Current: {Number(i.currentStock).toFixed(3)} {i.unit}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>
                  Spoiled Quantity {selectedSpoilItem ? `(${selectedSpoilItem.unit})` : ""} *
                </span>
                <input
                  type="number"
                  min="0.001"
                  max={selectedSpoilItem ? Number(selectedSpoilItem.currentStock) : undefined}
                  step="0.001"
                  required
                  placeholder={
                    selectedSpoilItem
                      ? `Max: ${Number(selectedSpoilItem.currentStock).toFixed(3)} ${selectedSpoilItem.unit}`
                      : "Enter spoiled quantity"
                  }
                  value={spoilForm.quantity}
                  onChange={(e) => setSpoilForm({ ...spoilForm, quantity: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Spoilage Reason *</span>
                <select
                  value={spoilForm.reason}
                  onChange={(e) => setSpoilForm({ ...spoilForm, reason: e.target.value })}
                >
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
                <select
                  value={spoilForm.disposalMethod}
                  onChange={(e) => setSpoilForm({ ...spoilForm, disposalMethod: e.target.value })}
                >
                  <option value="Discarded in Waste / Organic Compost">Discarded in Waste / Organic Compost</option>
                  <option value="Returned to Supplier / Vendor Credit">Returned to Supplier / Vendor Credit</option>
                  <option value="Destroyed under Supervisor Oversight">Destroyed under Supervisor Oversight</option>
                  <option value="Repurposed for Animal Feed / Bio-gas">Repurposed for Animal Feed / Bio-gas</option>
                </select>
              </label>

              <label className="field">
                <span>Remarks / Notes</span>
                <input
                  type="text"
                  placeholder="Additional supervisor explanation or batch details"
                  value={spoilForm.notes}
                  onChange={(e) => setSpoilForm({ ...spoilForm, notes: e.target.value })}
                />
              </label>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="danger-btn compact" disabled={submitting}>
                  {submitting ? "Reducing Stock..." : "Confirm & Reduce Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
