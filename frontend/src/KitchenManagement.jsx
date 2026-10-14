import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  ShoppingCart,
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  Calendar,
  ChefHat,
  Share2,
  GitCompare,
  UtensilsCrossed,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Download,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  Filter,
  RotateCcw,
  AlertOctagon,
  CheckSquare,
  Square,
  PackageCheck,
  DollarSign,
  Layers,
  Printer
} from "lucide-react";
import { api } from "./api";
import DailyProductionPlan from "./DailyProductionPlan";
import MenuManagement from "./MenuManagement";
import { getDishImage } from "./dishImages";
import KitchenReportsView from "./KitchenReportsView";
import AddInventoryItemModal from "./AddInventoryItemModal";

export default function KitchenManagement({ user, initialSubTab }) {
  const [subTab, setSubTab] = useState(initialSubTab || "dashboard");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user.branchId ? String(user.branchId) : "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const activeBranch = user.branchId ? String(user.branchId) : selectedBranch;
  const isOrgAdmin = user.role === "Organization Admin";
  const canManage = ["Organization Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager"].includes(user.role);

  useEffect(() => {
    api.getBranches().then(setBranches).catch(() => {});
  }, []);

  function clearMessages() {
    setMessage("");
    setError("");
  }

  const canViewReports = !["Staff", "Waiter", "Chef"].map(r => r.toLowerCase()).includes((user?.role || "").trim().toLowerCase());

  useEffect(() => {
    if (subTab === "reports" && !canViewReports) {
      setSubTab("dashboard");
    }
  }, [subTab, canViewReports]);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "items", label: "Items", icon: Package },
    { id: "categories", label: "Categories", icon: Tags },
    { id: "vendors", label: "Vendors", icon: Truck },
    { id: "purchases", label: "Purchases", icon: ShoppingCart },
    { id: "purchase_returns", label: "Damaged Returns", icon: RotateCcw },
    { id: "inventory", label: "Central Inventory", icon: Boxes },
    { id: "kitchen_stock", label: "Kitchen Stock", icon: ChefHat },
    { id: "stock_ledger", label: "Stock Ledger", icon: FileSpreadsheet },
    { id: "spoilage", label: "Food Spoilage", icon: AlertOctagon },
    { id: "stock_entries", label: "Stock Entries", icon: ArrowLeftRight },
    { id: "reorder_alerts", label: "Reorder Alerts", icon: AlertTriangle },
    { id: "production_plan", label: "Production Plan", icon: Calendar },
    { id: "production_entry", label: "Production Entry", icon: ChefHat },
    { id: "material_issue", label: "Material Issue", icon: Share2 },
    { id: "material_return", label: "Material Return", icon: RotateCcw },
    { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
    { id: "menus", label: "Menus", icon: UtensilsCrossed },
    { id: "plan_vs_actual", label: "Plan vs Actual", icon: GitCompare },
    { id: "reports", label: "Reports", icon: FileSpreadsheet, show: canViewReports }
  ].filter(t => t.show !== false);

  return (
    <div className="kitchen-module-container">
      {/* Branch Scope for Organization Admin */}
      {isOrgAdmin && (
        <div className="kitchen-branch-scope-bar" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "12px" }}>
          <div className="kitchen-branch-selector">
            <span className="eyebrow" style={{ marginRight: "8px" }}>BRANCH SCOPE:</span>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                clearMessages();
              }}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Secondary Navigation Pills */}
      <div className="kitchen-subnav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`kitchen-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => {
                setSubTab(tab.id);
                clearMessages();
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Notifications */}
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">✓ {message}</div>}

      {/* Tab Views */}
      <div className="kitchen-view-content">
        {subTab === "dashboard" && (
          <KitchenDashboard
            user={user}
            branchId={activeBranch}
            onNavigate={(tab) => {
              setSubTab(tab);
              clearMessages();
            }}
          />
        )}

        {subTab === "items" && (
          <ItemsManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "categories" && (
          <CategoriesManagement
            user={user}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "vendors" && (
          <VendorsManagement
            user={user}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "purchases" && (
          <PurchasesManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
            onNavigate={setSubTab}
          />
        )}

        {subTab === "purchase_returns" && (
          <PurchaseReturnsManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
            onNavigate={setSubTab}
          />
        )}

        {subTab === "inventory" && (
          <LiveInventoryView
            user={user}
            branchId={activeBranch}
            onError={setError}
            onSuccess={setMessage}
            onNavigate={setSubTab}
          />
        )}

        {subTab === "kitchen_stock" && (
          <KitchenStockView
            user={user}
            branchId={activeBranch}
            onError={setError}
            onSuccess={setMessage}
            onNavigate={setSubTab}
          />
        )}

        {subTab === "stock_ledger" && (
          <StockLedgerView
            user={user}
            branchId={activeBranch}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "spoilage" && (
          <FoodSpoilageManagement
            user={user}
            branchId={activeBranch}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
            onNavigate={setSubTab}
          />
        )}

        {subTab === "stock_entries" && (
          <StockEntriesView
            user={user}
            branchId={activeBranch}
            onError={setError}
          />
        )}

        {subTab === "reorder_alerts" && (
          <ReorderAlertsView
            user={user}
            branchId={activeBranch}
            onError={setError}
            onSuccess={setMessage}
            onCreatePurchase={() => setSubTab("purchases")}
          />
        )}

        {subTab === "production_plan" && (
          <DailyProductionPlan
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "production_entry" && (
          <ProductionEntryManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "material_issue" && (
          <MaterialIssueManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "material_return" && (
          <MaterialReturnManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "transfers" && (
          <TransfersManagement
            user={user}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "menus" && (
          <MenusManagement
            user={user}
            branchId={activeBranch}
            branches={branches}
            canManage={canManage}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {subTab === "plan_vs_actual" && (
          <PlanVsActualView
            user={user}
            branchId={activeBranch}
            onError={setError}
          />
        )}

        {subTab === "reports" && canViewReports && (
          <KitchenReportsView
            user={user}
            branchId={activeBranch}
            branches={branches}
            onError={setError}
          />
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   1. DASHBOARD COMPONENT
   ========================================================================== */
function KitchenDashboard({ user, branchId, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getKitchenDashboard(branchId || undefined);
      setData(res);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  if (loading) return <div className="panel empty-row">Loading Kitchen Overview from MySQL...</div>;
  if (!data) return <div className="panel empty-row">Could not load dashboard data.</div>;

  const m = data.metrics || {};

  return (
    <div className="kitchen-dashboard-grid">
      {/* Culinary Hero Hub Showcase (from Reference Image Board 2) */}
      <div className="kitchen-hub-hero">
        <div className="stat-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card clickable" onClick={() => onNavigate("inventory")}>
            <div className="stat-head">
              <span>CURRENT STOCK</span>
              <div className="stat-icon" style={{ background: "#16a34a", color: "#ffffff", border: "none" }}><Package size={18} /></div>
            </div>
            <strong style={{ color: "var(--metric-green-text, #0f5c2f)" }}>{m.inStock ?? m.totalItems}</strong>
            <small>{Number(m.totalStockQuantity || 0).toFixed(1)} stock units</small>
          </div>

          <div className="stat-card clickable" onClick={() => onNavigate("reorder_alerts")}>
            <div className="stat-head">
              <span>LOW STOCK ITEMS</span>
              <div className="stat-icon" style={{ background: "#ef4444", color: "#ffffff", border: "none" }}><AlertTriangle size={18} /></div>
            </div>
            <strong style={{ color: "var(--metric-rose-text, #b91c1c)" }}>{m.lowStock}</strong>
            <small>At or below threshold</small>
          </div>

          <div className="stat-card clickable" onClick={() => onNavigate("purchases")}>
            <div className="stat-head">
              <span>TODAY'S GRN</span>
              <div className="stat-icon" style={{ background: "var(--forest-800, #0e3826)", color: "#ffffff", border: "1px solid var(--brand-gold, #c99824)" }}><ShoppingCart size={18} /></div>
            </div>
            <strong style={{ color: "var(--text-primary)" }}>{m.pendingPurchases ?? 0}</strong>
            <small>Goods receipt notes</small>
          </div>

          <div className="stat-card clickable" onClick={() => onNavigate("material_issue")}>
            <div className="stat-head">
              <span>MATERIAL ISSUES</span>
              <div className="stat-icon" style={{ background: "#ea580c", color: "#ffffff", border: "none" }}><Share2 size={18} /></div>
            </div>
            <strong style={{ color: "var(--metric-orange-text, #966008)" }}>{m.todayIssuesCount ?? 0}</strong>
            <small>{Number(m.todayIssuesQty || 0).toFixed(1)} units issued</small>
          </div>
        </div>

        <div className="kitchen-banner-card">
          <h4>Fresh Ingredients<br />Better Food<br />Happier Customers</h4>
          <p>Kitchen & Central Inventory Operations</p>
        </div>
      </div>

      {/* Operational Module Summary Cards */}
      <div className="stat-grid">
        <div className="stat-card clickable" onClick={() => onNavigate("items")}>
          <div className="stat-head">
            <span>TOTAL ITEMS</span>
            <div className="stat-icon"><Package size={18} /></div>
          </div>
          <strong>{m.totalItems}</strong>
          <small>{Number(m.totalStockQuantity || 0).toFixed(2)} total stock units</small>
        </div>

        <div className="stat-card clickable" onClick={() => onNavigate("production_entry")}>
          <div className="stat-head">
            <span>TODAY'S PRODUCTION</span>
            <div className="stat-icon"><ChefHat size={18} /></div>
          </div>
          <strong>{m.todayProductionCount}</strong>
          <small>{Number(m.todayProductionQty || 0).toFixed(1)} portions produced</small>
        </div>

        <div className="stat-card clickable" onClick={() => onNavigate("transfers")}>
          <div className="stat-head">
            <span>PENDING TRANSFERS</span>
            <div className="stat-icon"><ArrowLeftRight size={18} /></div>
          </div>
          <strong>{m.pendingTransfers}</strong>
          <small>Awaiting transit/approval</small>
        </div>

        <div className="stat-card clickable" onClick={() => onNavigate("purchases")}>
          <div className="stat-head">
            <span>PENDING PURCHASES</span>
            <div className="stat-icon"><ShoppingCart size={18} /></div>
          </div>
          <strong>{m.pendingPurchases}</strong>
          <small>Draft or Ordered POs</small>
        </div>

        <div className="stat-card clickable" onClick={() => onNavigate("purchase_returns")}>
          <div className="stat-head">
            <span>DAMAGED RETURNS</span>
            <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><RotateCcw size={18} /></div>
          </div>
          <strong style={{ color: "#d97706" }}>Product Returns</strong>
          <small>Vendor return & debit records</small>
        </div>

        <div className="stat-card clickable" onClick={() => onNavigate("spoilage")}>
          <div className="stat-head">
            <span>FOOD SPOILAGE</span>
            <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertOctagon size={18} /></div>
          </div>
          <strong style={{ color: "#dc2626" }}>Spoiled Food</strong>
          <small>Track loss & reduce inventory</small>
        </div>
      </div>

      {/* Two Column Breakdown */}
      <div className="section-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">INVENTORY BREAKDOWN</span>
              <h3>Stock Overview by Category</h3>
            </div>
            <Tags size={20} />
          </div>
          {data.categoryStock?.length === 0 ? (
            <div className="empty-row">No category data recorded yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Items Count</th>
                    <th>Current Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryStock.map((c) => (
                    <tr key={c.category}>
                      <td><strong>{c.category}</strong></td>
                      <td>{c.count} items</td>
                      <td><strong>{Number(c.totalQuantity).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">AUDIT TRAIL</span>
              <h3>Live Stock Movements</h3>
            </div>
            <button className="secondary-btn compact" onClick={load}>
              <RefreshCw size={15} />
            </button>
          </div>
          {data.recentMovements?.length === 0 ? (
            <div className="empty-row">No stock transactions yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMovements.slice(0, 7).map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><strong>{tx.itemName}</strong></td>
                      <td><span className="role-chip">{tx.type}</span></td>
                      <td>{Number(tx.quantity).toFixed(2)} {tx.unit}</td>
                      <td><strong>{Number(tx.stockAfter).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. ITEMS MANAGEMENT
   ========================================================================== */
function ItemsManagement({ user, branchId, branches, canManage, onError, onSuccess }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialForm = {
    branchId: branchId || (branches[0]?.id ? String(branches[0].id) : ""),
    itemCode: "",
    name: "",
    category: "General",
    categoryId: null,
    unit: "KG",
    minimumStock: "5",
    reorderLevel: "10",
    maximumStock: "50",
    openingStock: "0",
    description: "",
    reference: ""
  };
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const [itemList, catList] = await Promise.all([
        api.getInventoryItems({
          branchId: branchId || undefined,
          search: search || undefined,
          category: selectedCat === "All" ? undefined : selectedCat,
          status: statusFilter,
          includeInactive: true
        }),
        api.getCategories()
      ]);
      setItems(itemList);
      setCategories(catList);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId, search, selectedCat, statusFilter]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, {
          itemCode: form.itemCode,
          name: form.name,
          category: form.category,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          unit: form.unit,
          minimumStock: Number(form.minimumStock || 0),
          reorderLevel: Number(form.reorderLevel || 0),
          maximumStock: Number(form.maximumStock || 0),
          description: form.description
        });
        onSuccess(`Item "${form.name}" updated successfully in MySQL.`);
      } else {
        await api.createInventoryItem({
          branchId: user.branchId ? Number(user.branchId) : Number(form.branchId),
          itemCode: form.itemCode,
          name: form.name,
          category: form.category,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          unit: form.unit,
          minimumStock: Number(form.minimumStock || 0),
          reorderLevel: Number(form.reorderLevel || 0),
          maximumStock: Number(form.maximumStock || 0),
          openingStock: Number(form.openingStock || 0),
          description: form.description,
          reference: form.reference
        });
        onSuccess(`Item "${form.name}" created and saved to MySQL.`);
      }
      setShowModal(false);
      setEditingItem(null);
      setForm(initialForm);
      await load();
    } catch (err) {
      onError(err.message);
    }
  }

  async function handleDeactivate(item) {
    const action = item.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} item "${item.name}"?\n(Historical transactions will be preserved in MySQL.)`)) {
      return;
    }
    try {
      const res = await api.deactivateInventoryItem(item.id);
      onSuccess(res.message);
      await load();
    } catch (err) {
      onError(err.message);
    }
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      branchId: String(item.branchId),
      itemCode: item.itemCode || "",
      name: item.name,
      category: item.category || "General",
      categoryId: item.categoryId ? String(item.categoryId) : "",
      unit: item.unit,
      minimumStock: String(item.minimumStock),
      reorderLevel: String(item.reorderLevel),
      maximumStock: String(item.maximumStock),
      openingStock: "0",
      description: item.description || "",
      reference: ""
    });
    setShowModal(true);
  }

  return (
    <div className="page-grid">
      {/* Top Filter Bar */}
      <div className="kitchen-filter-bar panel">
        <div className="filter-input-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search items by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        <div className="filter-actions">
          <button className="secondary-btn compact" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          {canManage && (
            <button
              className="primary-btn compact"
              onClick={() => {
                setEditingItem(null);
                setForm(initialForm);
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CATALOG</span>
            <h3>Inventory Items ({items.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading items from MySQL...</div>
        ) : items.length === 0 ? (
          <div className="empty-row">No items found matching the selected filters.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Branch</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Unit</th>
                  <th>Min / Reorder / Max</th>
                  <th>Stock Status</th>
                  <th>Record Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const statusClass =
                    i.stockStatus === "OUT OF STOCK"
                      ? "status-out-of-stock"
                      : i.stockStatus === "LOW STOCK"
                      ? "status-low-stock"
                      : "status-in-stock";

                  return (
                    <tr key={i.id} style={{ opacity: i.isActive ? 1 : 0.6 }}>
                      <td><code className="code-chip">{i.itemCode}</code></td>
                      <td>
                        <strong>{i.name}</strong>
                        {i.description && <span>{i.description}</span>}
                      </td>
                      <td>{i.branchName}</td>
                      <td><span className="role-chip">{i.category}</span></td>
                      <td>
                        <strong style={{ fontSize: "14px" }}>
                          {Number(i.currentStock).toFixed(2)}
                        </strong>
                      </td>
                      <td>{i.unit}</td>
                      <td>
                        <small>
                          Min: {Number(i.minimumStock).toFixed(1)} | Reorder: {Number(i.reorderLevel).toFixed(1)} | Max: {Number(i.maximumStock).toFixed(1)}
                        </small>
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {i.stockStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${i.isActive ? "active" : "inactive"}`}>
                          {i.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td>
                        {canManage && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="secondary-btn compact"
                              onClick={() => openEdit(i)}
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className={`compact ${i.isActive ? "danger-btn" : "secondary-btn"}`}
                              onClick={() => handleDeactivate(i)}
                              title={i.isActive ? "Deactivate" : "Activate"}
                            >
                              {i.isActive ? <Trash2 size={13} /> : <Check size={13} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingItem ? "Edit Inventory Item" : "Add Inventory Item"}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              {!user.branchId && !editingItem && (
                <label className="field">
                  <span>Branch</span>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="two-col">
                <label className="field">
                  <span>Item Name *</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Basmati Rice"
                  />
                </label>

                <label className="field">
                  <span>Item Code</span>
                  <input
                    type="text"
                    value={form.itemCode}
                    onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                    placeholder="e.g. RIC-001 (auto if empty)"
                  />
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Category</span>
                  <input
                    type="text"
                    list="cat-options"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Grains, Vegetables, Spices"
                  />
                  <datalist id="cat-options">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </label>

                <label className="field">
                  <span>Unit *</span>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="KG">KG</option>
                    <option value="G">G (Grams)</option>
                    <option value="L">L (Litre)</option>
                    <option value="ML">ML (Millilitre)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="BOX">BOX</option>
                    <option value="PACK">PACK</option>
                    <option value="TIN">TIN</option>
                    <option value="BOTTLE">BOTTLE</option>
                  </select>
                </label>
              </div>

              <div className="three-col">
                <label className="field">
                  <span>Minimum Stock</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minimumStock}
                    onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Reorder Level</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Maximum Stock</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maximumStock}
                    onChange={(e) => setForm({ ...form, maximumStock: e.target.value })}
                  />
                </label>
              </div>

              {!editingItem && (
                <div className="two-col">
                  <label className="field">
                    <span>Opening Stock Quantity</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.openingStock}
                      onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                      placeholder="Initial balance (optional)"
                    />
                  </label>

                  <label className="field">
                    <span>Opening Reference</span>
                    <input
                      type="text"
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder="e.g. Audit Count / Invoice"
                    />
                  </label>
                </div>
              )}

              <label className="field">
                <span>Description / Notes</span>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional item description"
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingItem ? "Save Changes" : "Save Item to MySQL"}
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
   3. CATEGORIES MANAGEMENT
   ========================================================================== */
function CategoriesManagement({ canManage, onError, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getCategories();
      setCategories(res);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, form);
        onSuccess(`Category "${form.name}" updated successfully.`);
      } else {
        await api.createCategory(form);
        onSuccess(`Category "${form.name}" created and saved to MySQL.`);
      }
      setShowModal(false);
      setEditingCat(null);
      setForm({ name: "", description: "" });
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function handleToggle(cat) {
    try {
      const res = await api.deactivateCategory(cat.id);
      onSuccess(res.message);
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <div className="filter-input-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /></button>
        {canManage && (
          <button
            className="primary-btn compact"
            onClick={() => {
              setEditingCat(null);
              setForm({ name: "", description: "" });
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">TAXONOMY</span>
            <h3>Item Categories ({filtered.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading categories from MySQL...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-row">No categories found. Click "Add Category" to create one.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td><code>CAT-{c.id}</code></td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.description || "—"}</td>
                    <td>
                      <span className={`status ${c.isActive ? "active" : "inactive"}`}>
                        {c.status || (c.isActive ? "Active" : "Inactive")}
                      </span>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      {canManage && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="secondary-btn compact"
                            onClick={() => {
                              setEditingCat(c);
                              setForm({ name: c.name, description: c.description || "" });
                              setShowModal(true);
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="secondary-btn compact"
                            onClick={() => handleToggle(c)}
                            title={c.isActive ? "Deactivate" : "Activate"}
                          >
                            {c.isActive ? <Trash2 size={13} /> : <Check size={13} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingCat ? "Edit Category" : "Add Item Category"}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <label className="field">
                <span>Category Name *</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dairy, Poultry, Vegetables"
                />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows="3"
                  className="kitchen-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Category description"
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingCat ? "Save Changes" : "Save Category to MySQL"}
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
   4. VENDORS MANAGEMENT
   ========================================================================== */
export function VendorsManagement({ canManage, onError, onSuccess }) {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialForm = {
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: ""
  };
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getVendors(search, true);
      setVendors(res);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingVendor) {
        await api.updateVendor(editingVendor.id, form);
        onSuccess(`Vendor "${form.name}" updated successfully.`);
      } else {
        await api.createVendor(form);
        onSuccess(`Vendor "${form.name}" created and saved to MySQL.`);
      }
      setShowModal(false);
      setEditingVendor(null);
      setForm(initialForm);
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function handleToggle(v) {
    const action = v.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} vendor "${v.name}"?`)) return;
    try {
      const res = await api.deactivateVendor(v.id);
      onSuccess(res.message);
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <div className="filter-controls-group">
          <div className="filter-input-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search vendors by name, contact, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="secondary-btn compact" onClick={load} title="Refresh Vendors"><RefreshCw size={16} /></button>
        </div>
        {canManage && (
          <div className="filter-actions-group">
            <button
              className="primary-btn compact"
              onClick={() => {
                setEditingVendor(null);
                setForm(initialForm);
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Add Vendor
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">SUPPLIERS</span>
            <h3>Vendor Directory ({vendors.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading vendors from MySQL...</div>
        ) : vendors.length === 0 ? (
          <div className="empty-row">No vendors found. Click "Add Vendor" to register a supplier.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Vendor Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>GST / Tax No.</th>
                  <th>Purchases</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} style={{ opacity: v.isActive ? 1 : 0.6 }}>
                    <td><code>VEN-{v.id}</code></td>
                    <td><strong>{v.name}</strong></td>
                    <td>{v.contactPerson || "—"}</td>
                    <td>{v.phone}</td>
                    <td>{v.email || "—"}</td>
                    <td>{v.address || "—"}</td>
                    <td><code>{v.gstNumber || "—"}</code></td>
                    <td><strong>{v.purchaseCount}</strong> orders</td>
                    <td>
                      <span className={`status ${v.isActive ? "active" : "inactive"}`}>
                        {v.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td>
                      {canManage && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="secondary-btn compact"
                            onClick={() => {
                              setEditingVendor(v);
                              setForm({
                                name: v.name,
                                contactPerson: v.contactPerson || "",
                                phone: v.phone,
                                email: v.email || "",
                                address: v.address || "",
                                gstNumber: v.gstNumber || ""
                              });
                              setShowModal(true);
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="secondary-btn compact"
                            onClick={() => handleToggle(v)}
                            title={v.isActive ? "Deactivate" : "Activate"}
                          >
                            {v.isActive ? <Trash2 size={13} /> : <Check size={13} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingVendor ? "Edit Vendor" : "Add Vendor"}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="two-col">
                <label className="field">
                  <span>Vendor / Company Name *</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Metro Food Supplies"
                  />
                </label>

                <label className="field">
                  <span>Contact Person</span>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                  />
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Phone Number *</span>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="vendor@example.com"
                  />
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Address</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Street, City, State"
                  />
                </label>

                <label className="field">
                  <span>GST / Tax Identification Number</span>
                  <input
                    type="text"
                    value={form.gstNumber}
                    onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingVendor ? "Save Changes" : "Save Vendor to MySQL"}
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
   5. PURCHASES & GOODS RECEIPT (WITH MYSQL DATABASE TRANSACTIONS)
   ========================================================================== */
export function PurchasesManagement({ user, branchId, branches = [], canManage, onError, onSuccess }) {
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Damaged / Spoiled Return State
  const [returnPurchase, setReturnPurchase] = useState(null);
  const [returnForm, setReturnForm] = useState({ items: [], notes: "" });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const initialForm = {
    branchId: branchId || (branches[0]?.id ? String(branches[0].id) : ""),
    vendorId: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    status: "Draft",
    notes: "",
    items: [{ inventoryItemId: "", quantity: 1, rate: 0, unit: "KG", batchNumber: "", expiryDate: "" }]
  };
  const [form, setForm] = useState(initialForm);

  function getPaymentMethod(p) {
    if (p.paymentMethod) return p.paymentMethod;
    const match = p.notes?.match(/\[Mode:\s*([^\]]+)\]/i);
    if (match) return match[1];
    return "";
  }

  function getCleanNotes(notes) {
    return notes ? notes.replace(/\[Mode:\s*[^\]]+\]/gi, "").trim() : "";
  }

  function handleEditPurchase(p) {
    setEditingPurchase(p);
    setForm({
      id: p.id,
      branchId: p.branchId ? String(p.branchId) : "",
      vendorId: p.supplierId || p.vendorId ? String(p.supplierId || p.vendorId) : "",
      invoiceNumber: p.invoiceNumber || "",
      purchaseDate: p.purchaseDate ? p.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0],
      paymentMethod: getPaymentMethod(p) || "",
      status: p.status || "Draft",
      notes: getCleanNotes(p.notes),
      items: p.items?.length
        ? p.items.map((it) => ({
            inventoryItemId: String(it.inventoryItemId),
            quantity: it.quantity,
            rate: it.rate || 0,
            unit: it.unit,
            batchNumber: it.batchNumber || "",
            expiryDate: it.expiryDate ? it.expiryDate.split("T")[0] : ""
          }))
        : [{ inventoryItemId: "", quantity: 1, rate: 0, unit: "KG", batchNumber: "", expiryDate: "" }]
    });
    setShowModal(true);
  }

  async function load() {
    setLoading(true);
    try {
      const [pList, vList, iList] = await Promise.all([
        api.getPurchases(branchId || undefined, statusFilter || undefined),
        api.getVendors(),
        api.getInventoryItems(branchId || undefined)
      ]);
      setPurchases(pList);
      setVendors(vList);
      setItems(iList);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId, statusFilter]);

  function addItemLine() {
    setForm({
      ...form,
      items: [
        ...form.items,
        { inventoryItemId: "", quantity: 1, rate: 0, unit: "KG", batchNumber: "", expiryDate: "" }
      ]
    });
  }

  function removeItemLine(index) {
    if (form.items.length <= 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index)
    });
  }

  function updateItemLine(index, field, value) {
    const next = [...form.items];
    next[index][field] = value;
    if (field === "inventoryItemId") {
      const selected = items.find((i) => i.id === Number(value));
      if (selected) {
        next[index].unit = selected.unit;
      }
    }
    setForm({ ...form, items: next });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.vendorId) {
      onError("Please select a vendor.");
      return;
    }
    if (!form.paymentMethod || form.paymentMethod === "Select Payment Mode") {
      onError("Please select a valid Mode of Payment.");
      return;
    }
    if (form.items.some((i) => !i.inventoryItemId || Number(i.quantity) <= 0)) {
      onError("All line items must have a valid item and quantity > 0.");
      return;
    }

    try {
      const payload = {
        branchId: user.branchId ? Number(user.branchId) : Number(form.branchId),
        vendorId: Number(form.vendorId),
        invoiceNumber: form.invoiceNumber,
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : new Date().toISOString(),
        status: form.status,
        notes: `[Mode: ${form.paymentMethod.trim()}] ${form.notes ? form.notes.trim() : ""}`.trim(),
        paymentMethod: form.paymentMethod.trim(),
        items: form.items.map((i) => ({
          inventoryItemId: Number(i.inventoryItemId),
          quantity: Number(i.quantity),
          rate: Number(i.rate || 0),
          unit: i.unit,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : null
        }))
      };

      const res = await api.createPurchase(payload);
      onSuccess(res.message);
      setShowModal(false);
      setEditingPurchase(null);
      setForm(initialForm);
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function handleReceive(id) {
    if (!window.confirm("Confirm Goods Receipt for this Purchase?\n\nThis will execute a MySQL database transaction:\n1. Update Purchase status to Received\n2. Increase inventory stock\n3. Record Stock Movement audit records")) {
      return;
    }
    setReceivingId(id);
    try {
      const res = await api.receiveGoods(id);
      onSuccess(res.message);
      await load();
    } catch (e) {
      onError(e.message);
    } finally {
      setReceivingId(null);
    }
  }

  // Handle Opening Damaged/Spoiled Return Modal
  function handleOpenReturn(p) {
    setReturnPurchase(p);
    const purchaseLines = (p.items || []).map((it) => {
      const alreadyReturned = Number(it.returnedQuantity || 0);
      const originalQty = Number(it.quantity || 0);
      const returnableQty = Math.max(0, originalQty - alreadyReturned);
      return {
        purchaseItemId: it.id,
        inventoryItemId: it.inventoryItemId,
        itemName: it.itemName,
        unit: it.unit,
        originalQuantity: originalQty,
        alreadyReturned: alreadyReturned,
        returnableQuantity: returnableQty,
        returnQuantity: returnableQty > 0 ? 0 : 0,
        reason: "Damaged in transit / shipment"
      };
    });
    setReturnForm({
      items: purchaseLines,
      notes: ""
    });
  }

  function updateReturnLine(idx, field, val) {
    const next = [...returnForm.items];
    next[idx][field] = val;
    setReturnForm({ ...returnForm, items: next });
  }

  async function handleReturnSubmit(e) {
    e.preventDefault();
    const itemsToReturn = returnForm.items
      .filter((i) => Number(i.returnQuantity) > 0)
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        quantity: Number(i.returnQuantity),
        reason: i.reason
      }));

    if (itemsToReturn.length === 0) {
      onError("Please specify a return quantity greater than 0 for at least one item.");
      return;
    }

    // Validate quantities against returnable
    for (const item of returnForm.items) {
      const qty = Number(item.returnQuantity || 0);
      if (qty > item.returnableQuantity) {
        onError(`Return quantity for ${item.itemName} (${qty}) cannot exceed remaining returnable quantity (${item.returnableQuantity}).`);
        return;
      }
    }

    setSubmittingReturn(true);
    try {
      const res = await api.returnPurchaseItems(returnPurchase.id, {
        items: itemsToReturn,
        notes: returnForm.notes
      });
      onSuccess(res.message || "Purchase return processed successfully. Inventory stock reduced.");
      setReturnPurchase(null);
      await load();
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmittingReturn(false);
    }
  }

  const grandTotal = form.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
  const displayPurchases = purchases.filter((p) => !paymentFilter || getPaymentMethod(p).toLowerCase().includes(paymentFilter.toLowerCase()));

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <div className="filter-controls-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="">All PO Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Ordered">Ordered</option>
            <option value="Received">Received</option>
            <option value="Partially Returned">Partially Returned</option>
            <option value="Returned">Returned</option>
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="filter-select">
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI / Online">UPI / QR Pay</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
            <option value="Credit">Credit</option>
            <option value="Cheque">Cheque</option>
          </select>
          <button className="secondary-btn compact" onClick={load} title="Refresh Purchases"><RefreshCw size={16} /></button>
        </div>
        <div className="filter-actions-group" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="primary-btn compact"
            onClick={() => setShowAddItemModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} /> Add Item
          </button>
          {canManage && (
            <button
              className="primary-btn compact"
              onClick={() => {
                setEditingPurchase(null);
                setForm(initialForm);
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Create Purchase Order
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">PROCUREMENT & RETURNS</span>
            <h3>Purchases & Goods Receipts ({displayPurchases.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading purchases from MySQL...</div>
        ) : displayPurchases.length === 0 ? (
          <div className="empty-row">No purchase records found. Click "Create Purchase Order" to make one.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ whiteSpace: "nowrap" }}>PO Number</th>
                  <th style={{ whiteSpace: "nowrap" }}>Vendor</th>
                  <th style={{ whiteSpace: "nowrap" }}>Branch</th>
                  <th style={{ whiteSpace: "nowrap" }}>Purchase Date</th>
                  <th style={{ whiteSpace: "nowrap" }}>Mode of Payment</th>
                  <th style={{ whiteSpace: "nowrap" }}>Total Amount</th>
                  <th style={{ minWidth: "160px" }}>Items Summary</th>
                  <th style={{ whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ minWidth: "120px" }}>Created By</th>
                  <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayPurchases.map((p) => {
                  const hasReturns = p.items?.some((it) => Number(it.returnedQuantity || 0) > 0);
                  const canReturn = (p.status === "Received" || p.status === "Partially Returned") && canManage;
                  return (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <code>{p.purchaseNumber}</code>
                        {p.invoiceNumber && p.invoiceNumber !== p.purchaseNumber && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Inv: {p.invoiceNumber}</div>
                        )}
                      </td>
                      <td style={{ maxWidth: "180px", wordBreak: "break-word" }}><strong>{p.vendorName}</strong></td>
                      <td style={{ whiteSpace: "nowrap" }}>{p.branchName}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="role-chip" style={{ background: "rgba(201, 152, 36, 0.12)", color: "var(--brand-gold-active, #966e12)", border: "1px solid rgba(201, 152, 36, 0.3)", fontWeight: 700, fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap" }}>
                          💳 {getPaymentMethod(p) || "Not Specified"}
                        </span>
                      </td>
                      <td className="amount" style={{ whiteSpace: "nowrap" }}><strong>₹{Number(p.totalAmount).toFixed(2)}</strong></td>
                      <td style={{ maxWidth: "260px", minWidth: "160px" }}>
                        <small style={{ display: "block", wordBreak: "break-word" }}>
                          {p.items?.map((it) => `${it.itemName} (${it.quantity} ${it.unit})`).join(", ") || `${p.itemCount} item(s)`}
                        </small>
                        {hasReturns && (
                          <div style={{ marginTop: "4px" }}>
                            <span className="role-chip" style={{ color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", fontSize: "11px", padding: "2px 6px", display: "inline-block", wordBreak: "break-word" }}>
                              ↩ {p.items?.filter((it) => Number(it.returnedQuantity || 0) > 0).map((it) => `${it.itemName}: ${it.returnedQuantity} ${it.unit} returned`).join(", ")}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={`status ${p.status === "Received" ? "active" : p.status === "Partially Returned" ? "warning" : p.status === "Returned" ? "inactive" : "draft"}`}
                          style={
                            p.status === "Partially Returned"
                              ? { background: "#fef3c7", color: "#d97706", borderColor: "#fde68a" }
                              : p.status === "Returned"
                              ? { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" }
                              : undefined
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: "160px", wordBreak: "break-word", fontSize: "12px" }}>{p.createdBy}</td>
                      <td style={{ minWidth: "140px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {p.status !== "Received" && p.status !== "Partially Returned" && p.status !== "Returned" && canManage && (
                            <>
                              <button
                                type="button"
                                className="secondary-btn compact"
                                onClick={() => handleEditPurchase(p)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                                title="Edit purchase order and payment mode"
                              >
                                <Edit2 size={13} /> Edit PO
                              </button>
                              <button
                                className="primary-btn compact"
                                onClick={() => handleReceive(p.id)}
                                disabled={receivingId === p.id}
                                style={{ whiteSpace: "nowrap" }}
                              >
                                <ArrowDownToLine size={13} />
                                {receivingId === p.id ? "Receiving..." : "Receive Goods"}
                              </button>
                            </>
                          )}
                          {canReturn && (
                            <button
                              className="secondary-btn compact"
                              onClick={() => handleOpenReturn(p)}
                              style={{ color: "#d97706", borderColor: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                              title="Return damaged or spoiled products to vendor"
                            >
                              <RotateCcw size={13} /> Return Damaged / Spoiled
                            </button>
                          )}
                          {p.status === "Received" && !hasReturns && (
                            <span className="role-chip" style={{ color: "#217844", background: "#eaf8ef", fontSize: "11px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                              ✓ Fully Received
                            </span>
                          )}
                          {p.status === "Returned" && (
                            <span className="role-chip" style={{ color: "#b91c1c", background: "#fee2e2", fontSize: "11px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                              ✓ Fully Returned
                            </span>
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

      {/* Create PO Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card purchase-modal-card">
            <div className="modal-head purchase-modal-head">
              <h3>{editingPurchase ? `Edit Purchase Order #${editingPurchase.id}` : "Create Purchase / Goods Receipt"}</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setShowModal(false);
                  setEditingPurchase(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="purchase-modal-form">
              <div className="purchase-modal-body">
                <div className="purchase-meta-grid">
                  {!user.branchId && (
                    <label className="field">
                      <span>Branch *</span>
                      <select
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="field">
                    <span>Vendor *</span>
                    <select
                      value={form.vendorId}
                      onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Status *</span>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Draft">Draft PO</option>
                      <option value="Ordered">Ordered (Awaiting Goods)</option>
                      <option value="Received">Received (Instant Stock Increase)</option>
                    </select>
                  </label>
                </div>

                <div className="purchase-meta-grid">
                  <label className="field">
                    <span>Invoice / Ref Number</span>
                    <input
                      type="text"
                      value={form.invoiceNumber}
                      onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                      placeholder="Vendor Invoice / Bill No."
                    />
                  </label>

                  <label className="field">
                    <span>Purchase Date</span>
                    <input
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Mode of Payment *</span>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      required
                    >
                      <option value="">Select Payment Mode</option>
                      <option value="Cash">💵 Cash</option>
                      <option value="UPI / Online">📱 UPI / QR Pay / Online</option>
                      <option value="Bank Transfer">🏦 Bank Transfer / NEFT</option>
                      <option value="Card">💳 Debit / Credit Card</option>
                      <option value="Credit">📋 Credit (Pay Later)</option>
                      <option value="Cheque">📜 Cheque</option>
                    </select>
                  </label>
                </div>

                {/* Dynamic Line Items */}
                <div className="purchase-line-items">
                  <div className="purchase-items-header">
                    <strong>Purchase Items</strong>
                    <div className="purchase-items-btns">
                      <button type="button" className="secondary-btn compact" onClick={() => setShowAddItemModal(true)}>
                        <Plus size={14} /> Add Item
                      </button>
                      <button type="button" className="secondary-btn compact" onClick={addItemLine}>
                        <Plus size={14} /> Add Line Item
                      </button>
                    </div>
                  </div>

                  <div className="purchase-table-scroll-container">
                    <table className="purchase-form-table">
                      <thead>
                        <tr>
                          <th style={{ width: "30%" }}>Item</th>
                          <th style={{ width: "12%" }}>Quantity</th>
                          <th style={{ width: "10%" }}>Unit</th>
                          <th style={{ width: "15%" }}>Rate (₹)</th>
                          <th style={{ width: "15%" }}>Amount (₹)</th>
                          <th style={{ width: "14%" }}>Batch / Expiry</th>
                          <th style={{ width: "4%" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((line, idx) => {
                          const lineTotal = Number(line.quantity || 0) * Number(line.rate || 0);
                          return (
                            <tr key={idx}>
                              <td>
                                <select
                                  required
                                  value={line.inventoryItemId}
                                  onChange={(e) => updateItemLine(idx, "inventoryItemId", e.target.value)}
                                >
                                  <option value="">Select Item</option>
                                  {items.map((it) => (
                                    <option key={it.id} value={it.id}>
                                      {it.name} ({it.unit})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  required
                                  value={line.quantity}
                                  onChange={(e) => updateItemLine(idx, "quantity", e.target.value)}
                                />
                              </td>
                              <td>
                                <span>{line.unit}</span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.rate}
                                  onChange={(e) => updateItemLine(idx, "rate", e.target.value)}
                                  placeholder="0.00"
                                />
                              </td>
                              <td>
                                <strong>₹{lineTotal.toFixed(2)}</strong>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={line.batchNumber}
                                  onChange={(e) => updateItemLine(idx, "batchNumber", e.target.value)}
                                  placeholder="Batch no."
                                  style={{ marginBottom: "4px" }}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="danger-btn compact"
                                  onClick={() => removeItemLine(idx)}
                                  disabled={form.items.length <= 1}
                                >
                                  <X size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="purchase-total-row">
                    <span>Total Amount: </span>
                    <strong className="purchase-grand-total">₹{grandTotal.toFixed(2)}</strong>
                  </div>
                </div>

                <label className="field">
                  <span>Notes / Remarks</span>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional delivery or vendor notes"
                  />
                </label>
              </div>

              <div className="purchase-modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPurchase(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {form.status === "Received" ? "Confirm Goods Receipt in MySQL" : (editingPurchase ? "Update Purchase Order" : "Save Purchase Order")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Damaged / Spoiled Items Modal */}
      {returnPurchase && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#d97706" }}>PURCHASE RETURN & STOCK DEDUCTION</span>
                <h3>Return Damaged / Spoiled Items ({returnPurchase.purchaseNumber})</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                  Vendor: <strong>{returnPurchase.vendorName}</strong> | Branch: <strong>{returnPurchase.branchName}</strong>
                </p>
              </div>
              <button className="icon-btn" onClick={() => setReturnPurchase(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReturnSubmit} className="form-stack">
              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#92400e" }}>
                <strong>Return & Inventory Reduction Policy:</strong> Returning damaged or spoiled products will immediately reduce the branch's active inventory stock in MySQL and log a formal <code>PURCHASE_RETURN</code> audit transaction.
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Product</th>
                      <th style={{ width: "12%" }}>Received Qty</th>
                      <th style={{ width: "12%" }}>Already Returned</th>
                      <th style={{ width: "12%" }}>Returnable</th>
                      <th style={{ width: "15%" }}>Qty to Return *</th>
                      <th style={{ width: "24%" }}>Return Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnForm.items.map((line, idx) => (
                      <tr key={line.purchaseItemId}>
                        <td>
                          <strong>{line.itemName}</strong>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Unit: {line.unit}</span>
                        </td>
                        <td>{line.originalQuantity} {line.unit}</td>
                        <td>{line.alreadyReturned} {line.unit}</td>
                        <td>
                          <strong style={{ color: line.returnableQuantity > 0 ? "var(--forest-800, #0e3826)" : "var(--text-muted)" }}>
                            {line.returnableQuantity} {line.unit}
                          </strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={line.returnableQuantity}
                            value={line.returnQuantity}
                            disabled={line.returnableQuantity <= 0}
                            onChange={(e) => updateReturnLine(idx, "returnQuantity", e.target.value)}
                            style={{
                              width: "100%",
                              borderColor: Number(line.returnQuantity) > 0 ? "#d97706" : undefined,
                              background: Number(line.returnQuantity) > 0 ? "#fffbeb" : undefined
                            }}
                          />
                        </td>
                        <td>
                          <select
                            value={line.reason}
                            disabled={line.returnableQuantity <= 0}
                            onChange={(e) => updateReturnLine(idx, "reason", e.target.value)}
                          >
                            <option value="Damaged in transit / shipment">Damaged in transit / shipment</option>
                            <option value="Spoiled / Expired food product">Spoiled / Expired food product</option>
                            <option value="Quality defect / substandard goods">Quality defect / substandard</option>
                            <option value="Rotten / Mold / Pest contamination">Rotten / Mold / Contaminated</option>
                            <option value="Wrong product variant delivered">Wrong product delivered</option>
                            <option value="Packaging torn or unsealed">Packaging torn or unsealed</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="field">
                <span>General Return Notes / Vendor Remarks</span>
                <input
                  type="text"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="e.g. Returned with driver; credit note or refund requested"
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setReturnPurchase(null)} disabled={submittingReturn}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingReturn}
                  style={{ background: "#d97706", borderColor: "#b45309" }}
                >
                  <RotateCcw size={15} />
                  {submittingReturn ? "Processing Return & Reducing Stock..." : "Confirm Return & Reduce Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centered Add Inventory Item Modal */}
      <AddInventoryItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        user={user}
        branches={branches}
        defaultBranchId={branchId}
        onSuccess={(createdItem, successMsg) => {
          onSuccess?.(successMsg || "Inventory item created successfully.");
          load();
        }}
        onError={(err) => {
          onError?.(err);
        }}
      />
    </div>
  );
}

/* ==========================================================================
   5B. PURCHASE RETURNS MANAGEMENT (DAMAGED / SPOILED VENDOR RETURNS)
   ========================================================================== */
export function PurchaseReturnsManagement({ user, branchId, branches = [], canManage, onError, onSuccess, onNavigate }) {
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [filterMode, setFilterMode] = useState("all_returns"); // "all_returns" | "all_eligible"

  // Return Processing State
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [returnForm, setReturnForm] = useState({ items: [], notes: "" });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [showInitiateModal, setShowInitiateModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [pList, vList] = await Promise.all([
        api.getPurchases(branchId || undefined),
        api.getVendors()
      ]);
      setPurchases(pList);
      setVendors(vList);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  // Purchases that have recorded returns
  const purchasesWithReturns = purchases.filter((p) =>
    p.status === "Partially Returned" ||
    p.status === "Returned" ||
    p.items?.some((it) => Number(it.returnedQuantity || 0) > 0)
  );

  // Purchases eligible to be returned (Received or Partially Returned)
  const eligiblePurchases = purchases.filter((p) =>
    p.status === "Received" || p.status === "Partially Returned"
  );

  // Compute stats
  const totalReturnRecords = purchasesWithReturns.length;
  let totalReturnedQty = 0;
  let totalReturnValue = 0;

  purchasesWithReturns.forEach((p) => {
    (p.items || []).forEach((it) => {
      const retQty = Number(it.returnedQuantity || 0);
      if (retQty > 0) {
        totalReturnedQty += retQty;
        totalReturnValue += retQty * Number(it.rate || 0);
      }
    });
  });

  // Filter list to display
  const baseList = filterMode === "all_returns" ? purchasesWithReturns : eligiblePurchases;
  const filteredList = baseList.filter((p) => {
    const matchesSearch =
      !search ||
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (p.vendorName && p.vendorName.toLowerCase().includes(search.toLowerCase()));
    const matchesVendor = !vendorFilter || String(p.vendorId) === vendorFilter;
    return matchesSearch && matchesVendor;
  });

  function startReturnProcess(purchase) {
    setSelectedPurchase(purchase);
    const lines = (purchase.items || []).map((it) => {
      const alreadyReturned = Number(it.returnedQuantity || 0);
      const originalQty = Number(it.quantity || 0);
      const returnableQty = Math.max(0, originalQty - alreadyReturned);
      return {
        purchaseItemId: it.id,
        inventoryItemId: it.inventoryItemId,
        itemName: it.itemName,
        unit: it.unit,
        rate: it.rate,
        originalQuantity: originalQty,
        alreadyReturned: alreadyReturned,
        returnableQuantity: returnableQty,
        returnQuantity: returnableQty > 0 ? 0 : 0,
        reason: "Damaged in transit / shipment"
      };
    });
    setReturnForm({
      items: lines,
      notes: ""
    });
    setShowInitiateModal(false);
  }

  function updateReturnLine(idx, field, val) {
    const next = [...returnForm.items];
    next[idx][field] = val;
    setReturnForm({ ...returnForm, items: next });
  }

  async function handleReturnSubmit(e) {
    e.preventDefault();
    const itemsToReturn = returnForm.items
      .filter((i) => Number(i.returnQuantity) > 0)
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        quantity: Number(i.returnQuantity),
        reason: i.reason
      }));

    if (itemsToReturn.length === 0) {
      onError("Please specify a return quantity greater than 0 for at least one item.");
      return;
    }

    for (const item of returnForm.items) {
      const qty = Number(item.returnQuantity || 0);
      if (qty > item.returnableQuantity) {
        onError(`Return quantity for ${item.itemName} (${qty}) cannot exceed remaining returnable quantity (${item.returnableQuantity}).`);
        return;
      }
    }

    setSubmittingReturn(true);
    try {
      const res = await api.returnPurchaseItems(selectedPurchase.id, {
        items: itemsToReturn,
        notes: returnForm.notes
      });
      onSuccess(res.message || "Damaged/spoiled product return processed. Inventory stock reduced.");
      setSelectedPurchase(null);
      await load();
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmittingReturn(false);
    }
  }

  return (
    <div className="page-grid">
      {/* Stat Cards for Product Returns */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-head">
            <span>RETURN TRANSACTIONS</span>
            <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><RotateCcw size={18} /></div>
          </div>
          <strong style={{ color: "#d97706" }}>{totalReturnRecords}</strong>
          <small>Purchases with damaged returns</small>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>RETURNED QUANTITY</span>
            <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertOctagon size={18} /></div>
          </div>
          <strong style={{ color: "#dc2626" }}>{Number(totalReturnedQty).toFixed(2)}</strong>
          <small>Total units returned to vendors</small>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>ESTIMATED CREDIT VALUE</span>
            <div className="stat-icon" style={{ background: "#eaf8ef", color: "#217844" }}><CheckCircle2 size={18} /></div>
          </div>
          <strong style={{ color: "#217844" }}>₹{Number(totalReturnValue).toFixed(2)}</strong>
          <small>Value of returned damaged stock</small>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>ELIGIBLE PURCHASES</span>
            <div className="stat-icon"><ShoppingCart size={18} /></div>
          </div>
          <strong>{eligiblePurchases.length}</strong>
          <small>Received POs available to return</small>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="kitchen-filter-bar panel">
        <div className="filter-controls-group">
          <div className="filter-input-group" style={{ flex: "1 1 220px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search return by PO #, Invoice #, or vendor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="filter-select">
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="filter-select">
            <option value="all_returns">Show Damaged Returns ({purchasesWithReturns.length})</option>
            <option value="all_eligible">Show All Returnable Purchases ({eligiblePurchases.length})</option>
          </select>

          <button className="secondary-btn compact" onClick={load} title="Refresh Returns"><RefreshCw size={16} /></button>
        </div>

        {canManage && (
          <div className="filter-actions-group">
            <button
              className="primary-btn compact"
              onClick={() => setShowInitiateModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#d97706", borderColor: "#b45309" }}
            >
              <RotateCcw size={15} /> Return Damaged Product
            </button>
          </div>
        )}
      </div>

      {/* Returns Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow" style={{ color: "#d97706" }}>VENDOR RETURNS & CREDITS</span>
            <h3>
              {filterMode === "all_returns"
                ? `Damaged & Spoiled Product Returns (${filteredList.length})`
                : `Received Purchases Eligible for Return (${filteredList.length})`}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading returns data from MySQL...</div>
        ) : filteredList.length === 0 ? (
          <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center" }}>
            <div style={{ color: "var(--text-muted)", marginBottom: "8px" }}>
              <RotateCcw size={32} style={{ opacity: 0.5, marginBottom: "8px" }} />
              <div>
                {filterMode === "all_returns"
                  ? "No damaged or spoiled product returns recorded yet."
                  : "No eligible purchases found for return."}
              </div>
            </div>
            {canManage && (
              <button
                className="secondary-btn compact"
                onClick={() => setShowInitiateModal(true)}
                style={{ marginTop: "12px", color: "#d97706", borderColor: "#f59e0b" }}
              >
                <Plus size={14} /> Process a Product Return Now
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Vendor</th>
                  <th>Branch</th>
                  <th>Purchase Date</th>
                  <th>Status</th>
                  <th>Returned Products</th>
                  <th>Return Reason</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((p) => {
                  const returnedItems = (p.items || []).filter((it) => Number(it.returnedQuantity || 0) > 0);
                  const isFullyReturned = p.status === "Returned";
                  const canReturnMore = (p.status === "Received" || p.status === "Partially Returned") && canManage;

                  return (
                    <tr key={p.id}>
                      <td>
                        <code>{p.purchaseNumber}</code>
                        {p.invoiceNumber && p.invoiceNumber !== p.purchaseNumber && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Inv: {p.invoiceNumber}</div>
                        )}
                      </td>
                      <td><strong>{p.vendorName}</strong></td>
                      <td>{p.branchName}</td>
                      <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`status ${p.status === "Received" ? "active" : p.status === "Partially Returned" ? "warning" : "inactive"}`}
                          style={
                            p.status === "Partially Returned"
                              ? { background: "#fef3c7", color: "#d97706", borderColor: "#fde68a" }
                              : p.status === "Returned"
                              ? { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" }
                              : undefined
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {returnedItems.length > 0 ? (
                          <div>
                            {returnedItems.map((it) => (
                              <div key={it.id} style={{ marginBottom: "3px" }}>
                                <strong style={{ color: "#b45309" }}>{it.itemName}:</strong>{" "}
                                <span>{it.returnedQuantity} {it.unit}</span>
                                {it.rate > 0 && (
                                  <small style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                                    (₹{(Number(it.returnedQuantity) * Number(it.rate)).toFixed(2)})
                                  </small>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>No items returned yet</span>
                        )}
                      </td>
                      <td>
                        {returnedItems.length > 0 ? (
                          <small style={{ color: "#78350f" }}>
                            {returnedItems.map((it) => it.returnReason || "Damaged/Spoiled").join(", ")}
                          </small>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>{p.createdBy}</td>
                      <td>
                        {canReturnMore && (
                          <button
                            className="secondary-btn compact"
                            onClick={() => startReturnProcess(p)}
                            style={{
                              color: "#d97706",
                              borderColor: "#f59e0b",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              padding: "4px 8px"
                            }}
                          >
                            <RotateCcw size={13} />
                            {returnedItems.length > 0 ? "Return More" : "Return Damaged"}
                          </button>
                        )}
                        {isFullyReturned && (
                          <span className="role-chip" style={{ color: "#b91c1c", background: "#fee2e2", fontSize: "11px" }}>
                            ✓ Fully Returned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Select PO to Initiate Return Modal */}
      {showInitiateModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#d97706" }}>RETURN DAMAGED PRODUCT</span>
                <h3>Select Purchase Order to Return</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowInitiateModal(false)}><X size={18} /></button>
            </div>

            <div className="form-stack">
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                Choose any received purchase order containing damaged, defective, or spoiled items:
              </p>

              <div className="field">
                <span>Select Purchase Order *</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const p = purchases.find((x) => x.id === Number(e.target.value));
                      if (p) startReturnProcess(p);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Select a Received Purchase Order --</option>
                  {eligiblePurchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.purchaseNumber} — {p.vendorName} ({p.branchName}) | {new Date(p.purchaseDate).toLocaleDateString()} — {p.status}
                    </option>
                  ))}
                </select>
              </div>

              {eligiblePurchases.length === 0 && (
                <div style={{ padding: "12px", background: "#fef3c7", borderRadius: "6px", fontSize: "13px", color: "#92400e" }}>
                  No Received purchases currently found. Create and receive goods in the <strong>Purchases</strong> tab first.
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowInitiateModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Damaged Items Modal */}
      {selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#d97706" }}>DAMAGED / SPOILED RETURN</span>
                <h3>Return Items for PO: {selectedPurchase.purchaseNumber}</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                  Vendor: <strong>{selectedPurchase.vendorName}</strong> | Branch: <strong>{selectedPurchase.branchName}</strong>
                </p>
              </div>
              <button className="icon-btn" onClick={() => setSelectedPurchase(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReturnSubmit} className="form-stack">
              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#92400e" }}>
                <strong>Stock Deduction Notice:</strong> Confirming this return will automatically reduce your branch inventory in MySQL and record a <code>PURCHASE_RETURN</code> audit log entry.
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Product</th>
                      <th style={{ width: "12%" }}>Received Qty</th>
                      <th style={{ width: "12%" }}>Already Returned</th>
                      <th style={{ width: "12%" }}>Returnable</th>
                      <th style={{ width: "15%" }}>Qty to Return *</th>
                      <th style={{ width: "24%" }}>Return Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnForm.items.map((line, idx) => (
                      <tr key={line.purchaseItemId}>
                        <td>
                          <strong>{line.itemName}</strong>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Unit: {line.unit}</span>
                        </td>
                        <td>{line.originalQuantity} {line.unit}</td>
                        <td>{line.alreadyReturned} {line.unit}</td>
                        <td>
                          <strong style={{ color: line.returnableQuantity > 0 ? "var(--forest-800, #0e3826)" : "var(--text-muted)" }}>
                            {line.returnableQuantity} {line.unit}
                          </strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={line.returnableQuantity}
                            value={line.returnQuantity}
                            disabled={line.returnableQuantity <= 0}
                            onChange={(e) => updateReturnLine(idx, "returnQuantity", e.target.value)}
                            style={{
                              width: "100%",
                              borderColor: Number(line.returnQuantity) > 0 ? "#d97706" : undefined,
                              background: Number(line.returnQuantity) > 0 ? "#fffbeb" : undefined
                            }}
                          />
                        </td>
                        <td>
                          <select
                            value={line.reason}
                            disabled={line.returnableQuantity <= 0}
                            onChange={(e) => updateReturnLine(idx, "reason", e.target.value)}
                          >
                            <option value="Damaged in transit / shipment">Damaged in transit / shipment</option>
                            <option value="Spoiled / Expired food product">Spoiled / Expired food product</option>
                            <option value="Quality defect / substandard goods">Quality defect / substandard</option>
                            <option value="Rotten / Mold / Pest contamination">Rotten / Mold / Contaminated</option>
                            <option value="Wrong product variant delivered">Wrong product delivered</option>
                            <option value="Packaging torn or unsealed">Packaging torn or unsealed</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="field">
                <span>General Return Notes / Vendor Remarks</span>
                <input
                  type="text"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="e.g. Returned with driver; credit note or refund requested"
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setSelectedPurchase(null)} disabled={submittingReturn}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingReturn}
                  style={{ background: "#d97706", borderColor: "#b45309" }}
                >
                  <RotateCcw size={15} />
                  {submittingReturn ? "Processing Return & Reducing Stock..." : "Confirm Return & Deduct Stock"}
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
   6. LIVE INVENTORY VIEW (CALCULATED DATABASE STATUSES & SPOIL FOOD)
   ========================================================================== */
function LiveInventoryView({ user, branchId, onError, onSuccess, onNavigate }) {
  const canManage = ["Organization Admin", "Super Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager"].includes(user?.role);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Spoil Food modal state
  const [spoilModalOpen, setSpoilModalOpen] = useState(false);
  const [spoilForm, setSpoilForm] = useState({
    inventoryItemId: "",
    quantity: "",
    reason: "Expired / Past Best-Before Date",
    disposalMethod: "Discarded in Waste / Organic Compost",
    notes: ""
  });
  const [submittingSpoil, setSubmittingSpoil] = useState(false);

  // Edit item state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    itemCode: "",
    category: "",
    unit: "KG",
    minimumStock: "",
    reorderLevel: "",
    maximumStock: "",
    description: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getInventoryItems({ branchId: branchId || undefined, search: search || undefined });
      setItems(res || []);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId, search]);

  function handleOpenSpoilModal(item = null) {
    const defaultItemId = item ? String(item.id) : (items[0] ? String(items[0].id) : "");
    setSpoilForm({
      inventoryItemId: defaultItemId,
      quantity: "",
      reason: "Expired / Past Best-Before Date",
      disposalMethod: "Discarded in Waste / Organic Compost",
      notes: ""
    });
    setSpoilModalOpen(true);
  }

  function handleOpenEdit(item) {
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      itemCode: item.itemCode || "",
      category: item.category || "General",
      unit: item.unit || "KG",
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
      maximumStock: item.maximumStock != null ? String(item.maximumStock) : "",
      description: item.description || ""
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await api.updateInventoryItem(editingItem.id, {
        name: editForm.name.trim(),
        itemCode: editForm.itemCode?.trim() || null,
        category: editForm.category?.trim() || "General",
        unit: editForm.unit.trim().toUpperCase(),
        minimumStock: Number(editForm.minimumStock || 0),
        reorderLevel: Number(editForm.reorderLevel || editForm.minimumStock || 0),
        maximumStock: Number(editForm.maximumStock || 0),
        description: editForm.description?.trim() || null
      });
      if (onSuccess) onSuccess(`Inventory item "${editForm.name}" updated successfully.`);
      setEditingItem(null);
      await load();
    } catch (err) {
      onError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeactivateItem(item) {
    if (!window.confirm(`Deactivate inventory item "${item.name}" (${item.itemCode || `ITM-${item.id}`})?`)) return;
    try {
      await api.deactivateInventoryItem(item.id);
      if (onSuccess) onSuccess(`Item "${item.name}" deactivated.`);
      await load();
    } catch (err) {
      onError(err.message);
    }
  }

  async function handleSpoilSubmit(e) {
    e.preventDefault();
    if (!spoilForm.inventoryItemId) {
      onError("Please select an item.");
      return;
    }
    const qty = Number(spoilForm.quantity);
    if (!qty || qty <= 0) {
      onError("Please enter a valid spoiled quantity greater than 0.");
      return;
    }
    const selectedItem = items.find((i) => i.id === Number(spoilForm.inventoryItemId));
    if (selectedItem && qty > Number(selectedItem.currentStock)) {
      onError(`Spoiled quantity (${qty} ${selectedItem.unit}) cannot exceed available stock (${selectedItem.currentStock} ${selectedItem.unit}).`);
      return;
    }

    setSubmittingSpoil(true);
    try {
      const res = await api.recordSpoilage({
        inventoryItemId: Number(spoilForm.inventoryItemId),
        quantity: qty,
        reason: spoilForm.reason,
        disposalMethod: spoilForm.disposalMethod,
        notes: spoilForm.notes
      });
      if (onSuccess) onSuccess(res.message || "Spoiled food recorded and stock reduced successfully.");
      setSpoilModalOpen(false);
      await load();
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmittingSpoil(false);
    }
  }

  const activeSpoilItem = items.find((i) => i.id === Number(spoilForm.inventoryItemId));

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <div className="filter-input-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Filter live inventory by item, code or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /> Refresh</button>
        <button
          className="danger-btn compact"
          onClick={() => handleOpenSpoilModal(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <AlertOctagon size={16} /> Record Spoil Food / Wastage
        </button>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CENTRAL INVENTORY STOCK</span>
            <h3>Central Inventory Stock Levels ({items.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Fetching live data from MySQL through backend API...</div>
        ) : items.length === 0 ? (
          <div className="empty-row">No inventory items found.</div>
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
                {items.map((i) => {
                  const statusClass =
                    i.stockStatus === "OUT OF STOCK"
                      ? "status-out-of-stock"
                      : i.stockStatus === "LOW STOCK"
                      ? "status-low-stock"
                      : "status-in-stock";

                  return (
                    <tr key={i.id}>
                      <td><code>{i.itemCode}</code></td>
                      <td><strong>{i.name}</strong></td>
                      <td><span className="role-chip">{i.category}</span></td>
                      <td>
                        <strong style={{ fontSize: "14px" }}>
                          {Number(i.currentStock).toFixed(3)}
                        </strong>
                      </td>
                      <td>{i.unit}</td>
                      <td>{Number(i.minimumStock).toFixed(3)}</td>
                      <td>{Number(i.reorderLevel).toFixed(3)}</td>
                      <td>{Number(i.maximumStock).toFixed(3)}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {i.stockStatus}
                        </span>
                      </td>
                      <td>
                        {i.updatedAt ? new Date(i.updatedAt).toLocaleString() : new Date(i.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            className="secondary-btn compact"
                            style={{
                              color: "#dc2626",
                              borderColor: "#fca5a5",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              padding: "3px 8px"
                            }}
                            onClick={() => handleOpenSpoilModal(i)}
                            title="Record damaged or spoiled food to reduce inventory"
                            disabled={Number(i.currentStock) <= 0}
                          >
                            <AlertOctagon size={13} /> Spoil Food
                          </button>
                          {canManage && (
                            <button
                              className="secondary-btn compact"
                              onClick={() => handleOpenEdit(i)}
                              title="Edit item"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "3px 8px" }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          )}
                          {canManage && (
                            <button
                              className="danger-btn compact"
                              onClick={() => handleDeactivateItem(i)}
                              title="Deactivate item"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "3px 8px" }}
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
                <span className="eyebrow">EDIT INVENTORY ITEM</span>
                <h3>Edit Item: {editingItem.name}</h3>
              </div>
              <button className="icon-btn" onClick={() => setEditingItem(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="form-grid" style={{ padding: "20px 24px" }}>
              <label className="field">
                <span>Item Code</span>
                <input
                  type="text"
                  value={editForm.itemCode}
                  onChange={(e) => setEditForm({ ...editForm, itemCode: e.target.value })}
                  placeholder="e.g. ITM-1001"
                />
              </label>
              <label className="field">
                <span>Item Name *</span>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Chicken"
                />
              </label>
              <label className="field">
                <span>Category</span>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="Meat"
                />
              </label>
              <label className="field">
                <span>Unit *</span>
                <select
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                >
                  <option>KG</option><option>G</option><option>L</option><option>ML</option><option>PCS</option><option>BOX</option><option>PACK</option>
                </select>
              </label>
              <label className="field">
                <span>Minimum Stock</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={editForm.minimumStock}
                  onChange={(e) => setEditForm({ ...editForm, minimumStock: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Reorder Level</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={editForm.reorderLevel}
                  onChange={(e) => setEditForm({ ...editForm, reorderLevel: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Maximum Stock</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={editForm.maximumStock}
                  onChange={(e) => setEditForm({ ...editForm, maximumStock: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </label>
              <div className="form-action" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="secondary-btn" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="primary-btn compact" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"} <Check size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Spoil Food / Wastage Modal */}
      {spoilModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#dc2626" }}>FOOD LOSS & STOCK REDUCTION</span>
                <h3>Record Spoil Food / Wastage</h3>
              </div>
              <button className="icon-btn" onClick={() => setSpoilModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSpoilSubmit} className="form-stack">
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#991b1b" }}>
                <strong>Stock Reduction Notice:</strong> Recording spoiled food will immediately deduct the entered quantity from available branch inventory and write a <code>SPOILAGE</code> audit trail in MySQL.
              </div>

              <label className="field">
                <span>Select Inventory Product *</span>
                <select
                  required
                  value={spoilForm.inventoryItemId}
                  onChange={(e) => setSpoilForm({ ...spoilForm, inventoryItemId: e.target.value })}
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.category}) — Current Stock: {it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
              </label>

              {activeSpoilItem && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-subtle, #f8fafc)", padding: "10px 14px", borderRadius: "6px", fontSize: "13px" }}>
                  <span>Currently Available in Branch:</span>
                  <strong style={{ fontSize: "15px", color: "var(--forest-800, #0e3826)" }}>
                    {activeSpoilItem.currentStock} {activeSpoilItem.unit}
                  </strong>
                </div>
              )}

              <div className="two-col">
                <label className="field">
                  <span>Spoiled Quantity * ({activeSpoilItem?.unit || "Units"})</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={activeSpoilItem ? activeSpoilItem.currentStock : undefined}
                    required
                    value={spoilForm.quantity}
                    onChange={(e) => setSpoilForm({ ...spoilForm, quantity: e.target.value })}
                    placeholder="e.g. 2.500"
                  />
                </label>

                <label className="field">
                  <span>Spoilage Reason *</span>
                  <select
                    value={spoilForm.reason}
                    onChange={(e) => setSpoilForm({ ...spoilForm, reason: e.target.value })}
                  >
                    <option value="Expired / Past Best-Before Date">Expired / Past Best-Before Date</option>
                    <option value="Rotten / Mold / Biological Decay">Rotten / Mold / Biological Decay</option>
                    <option value="Refrigeration / Cold-Chain Breakdown">Cold Storage / Temperature Abuse</option>
                    <option value="Damaged in Kitchen Handling">Damaged in Kitchen Handling</option>
                    <option value="Overcooked / Burnt / Preparation Defect">Overcooked / Burnt / Production Defect</option>
                    <option value="Insect / Pest Infestation">Insect / Pest Infestation</option>
                    <option value="Unconsumed / Leftover Food Loss">Unconsumed / Leftover Food Loss</option>
                    <option value="Contaminated / Unhygienic">Contaminated / Unhygienic</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Disposal Method</span>
                <select
                  value={spoilForm.disposalMethod}
                  onChange={(e) => setSpoilForm({ ...spoilForm, disposalMethod: e.target.value })}
                >
                  <option value="Discarded in Waste / Organic Compost">Discarded in Waste / Organic Compost</option>
                  <option value="Dispatched to Waste Disposal Vendor">Dispatched to Waste Disposal Vendor</option>
                  <option value="Drain Discharged (Liquids)">Drain Discharged (Liquids)</option>
                  <option value="Incinerated / Biogas">Incinerated / Biogas</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="field">
                <span>Notes / Corrective Action</span>
                <input
                  type="text"
                  value={spoilForm.notes}
                  onChange={(e) => setSpoilForm({ ...spoilForm, notes: e.target.value })}
                  placeholder="Optional context, staff notes or batch no."
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setSpoilModalOpen(false)} disabled={submittingSpoil}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="danger-btn"
                  disabled={submittingSpoil}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <AlertOctagon size={16} />
                  {submittingSpoil ? "Deducting Stock in MySQL..." : "Confirm Spoilage & Reduce Stock"}
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
   6B. FOOD SPOILAGE & LOSS MANAGEMENT (DIRECT INVENTORY DEDUCTION & AUDIT)
   ========================================================================== */
function FoodSpoilageManagement({ user, branchId, canManage, onError, onSuccess, onNavigate }) {
  const [spoilageLogs, setSpoilageLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  // Record Spoilage Modal
  const [showModal, setShowModal] = useState(false);
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
      setSpoilageLogs(txs);
      setItems(itms);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  // Compute stats
  const totalEvents = spoilageLogs.length;
  const totalUnitsSpoiled = spoilageLogs.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const distinctItemsCount = new Set(spoilageLogs.map((l) => l.inventoryItemId)).size;

  const filteredLogs = spoilageLogs.filter((l) => {
    const matchesSearch =
      !search ||
      (l.itemName && l.itemName.toLowerCase().includes(search.toLowerCase())) ||
      (l.reference && l.reference.toLowerCase().includes(search.toLowerCase())) ||
      (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())) ||
      (l.createdBy && l.createdBy.toLowerCase().includes(search.toLowerCase()));
    const matchesReason = !reasonFilter || (l.notes && l.notes.toLowerCase().includes(reasonFilter.toLowerCase()));
    return matchesSearch && matchesReason;
  });

  function openSpoilModal(preselectedItem = null) {
    const defaultId = preselectedItem ? String(preselectedItem.id) : (items[0] ? String(items[0].id) : "");
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
      onError("Please select an inventory item.");
      return;
    }
    const qty = Number(spoilForm.quantity);
    if (!qty || qty <= 0) {
      onError("Please enter a valid spoiled quantity greater than 0.");
      return;
    }
    const targetItem = items.find((i) => i.id === Number(spoilForm.inventoryItemId));
    if (targetItem && qty > Number(targetItem.currentStock)) {
      onError(`Spoiled quantity (${qty} ${targetItem.unit}) cannot exceed available stock (${targetItem.currentStock} ${targetItem.unit}).`);
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
      onSuccess(res.message || "Spoiled food recorded and stock reduced successfully.");
      setShowModal(false);
      await load();
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const activeSpoilItem = items.find((i) => i.id === Number(spoilForm.inventoryItemId));

  return (
    <div className="page-grid">
      {/* Stat Cards for Food Spoilage */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-head">
            <span>SPOILAGE INCIDENTS</span>
            <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertOctagon size={18} /></div>
          </div>
          <strong style={{ color: "#dc2626" }}>{totalEvents}</strong>
          <small>Recorded loss incidents</small>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>TOTAL QUANTITY LOST</span>
            <div className="stat-icon" style={{ background: "#fff1f2", color: "#e11d48" }}><Boxes size={18} /></div>
          </div>
          <strong style={{ color: "#e11d48" }}>{Number(totalUnitsSpoiled).toFixed(2)}</strong>
          <small>Units deducted from inventory</small>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>DISTINCT ITEMS AFFECTED</span>
            <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><Package size={18} /></div>
          </div>
          <strong style={{ color: "#d97706" }}>{distinctItemsCount}</strong>
          <small>Raw materials or ingredients</small>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>TOTAL PRODUCTS</span>
            <div className="stat-icon"><Boxes size={18} /></div>
          </div>
          <strong>{items.length}</strong>
          <small>Branch inventory catalog</small>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="kitchen-filter-bar panel">
        <div className="filter-input-group" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by product name, ref code, reason, or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
          <option value="">All Spoilage Reasons</option>
          <option value="Expired">Expired / Past Best-Before</option>
          <option value="Rotten">Rotten / Mold / Biological</option>
          <option value="Refrigeration">Cold Storage / Temperature Abuse</option>
          <option value="Damaged">Damaged in Handling</option>
          <option value="Overcooked">Overcooked / Burnt</option>
          <option value="Insect">Insect / Pest Infestation</option>
          <option value="Leftover">Unconsumed / Leftover</option>
          <option value="Contaminated">Contaminated</option>
        </select>

        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /></button>

        {canManage && (
          <button
            className="danger-btn compact"
            onClick={() => openSpoilModal(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <AlertOctagon size={16} /> Record Spoil Food / Wastage
          </button>
        )}
      </div>

      {/* Spoilage Log Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow" style={{ color: "#dc2626" }}>FOOD LOSS & REDUCTION AUDIT</span>
            <h3>Food Spoilage & Wastage Log ({filteredLogs.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading spoilage transactions from MySQL...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-row" style={{ padding: "36px 16px", textAlign: "center" }}>
            <div style={{ color: "var(--text-muted)", marginBottom: "8px" }}>
              <AlertOctagon size={32} style={{ opacity: 0.5, marginBottom: "8px", color: "#dc2626" }} />
              <div>No food or inventory spoilage records found.</div>
            </div>
            {canManage && (
              <button
                className="secondary-btn compact"
                onClick={() => openSpoilModal(null)}
                style={{ marginTop: "12px", color: "#dc2626", borderColor: "#fca5a5" }}
              >
                <Plus size={14} /> Record Food Spoilage Now
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Spoiled Quantity</th>
                  <th>Previous Stock</th>
                  <th>New Stock</th>
                  <th>Reason & Remarks</th>
                  <th>Disposal Location</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id}>
                    <td><code>MOV-{l.id}</code></td>
                    <td>{new Date(l.createdAt).toLocaleString()}</td>
                    <td><strong>{l.itemName}</strong></td>
                    <td>{l.branchName}</td>
                    <td>
                      <strong style={{ color: "#dc2626" }}>
                        -{Number(l.quantity).toFixed(3)} {l.unit}
                      </strong>
                    </td>
                    <td>{Number(l.stockBefore).toFixed(3)}</td>
                    <td>
                      <strong style={{ color: "var(--forest-800, #0e3826)" }}>
                        {Number(l.stockAfter).toFixed(3)}
                      </strong>
                    </td>
                    <td>
                      <span className="role-chip" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", fontSize: "11px", fontWeight: 600 }}>
                        {l.notes || "Food Spoilage"}
                      </span>
                    </td>
                    <td>
                      <small style={{ color: "var(--text-muted)" }}>{l.destinationLocation || "Kitchen Waste / Scrap"}</small>
                    </td>
                    <td>{l.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Spoil Food Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#dc2626" }}>FOOD LOSS ENTRY</span>
                <h3>Record Spoil Food / Inventory Loss</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSpoilSubmit} className="form-stack">
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#991b1b" }}>
                <strong>Stock Reduction Notice:</strong> Recording spoiled food will immediately deduct the entered quantity from available inventory in MySQL and log a formal <code>SPOILAGE</code> audit trail.
              </div>

              <label className="field">
                <span>Select Inventory Product *</span>
                <select
                  required
                  value={spoilForm.inventoryItemId}
                  onChange={(e) => setSpoilForm({ ...spoilForm, inventoryItemId: e.target.value })}
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.category}) — Current Stock: {it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
              </label>

              {activeSpoilItem && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-subtle, #f8fafc)", padding: "10px 14px", borderRadius: "6px", fontSize: "13px" }}>
                  <span>Currently Available in Branch:</span>
                  <strong style={{ fontSize: "15px", color: "var(--forest-800, #0e3826)" }}>
                    {activeSpoilItem.currentStock} {activeSpoilItem.unit}
                  </strong>
                </div>
              )}

              <div className="two-col">
                <label className="field">
                  <span>Spoiled Quantity * ({activeSpoilItem?.unit || "Units"})</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={activeSpoilItem ? activeSpoilItem.currentStock : undefined}
                    required
                    value={spoilForm.quantity}
                    onChange={(e) => setSpoilForm({ ...spoilForm, quantity: e.target.value })}
                    placeholder="e.g. 2.500"
                  />
                </label>

                <label className="field">
                  <span>Spoilage Reason *</span>
                  <select
                    value={spoilForm.reason}
                    onChange={(e) => setSpoilForm({ ...spoilForm, reason: e.target.value })}
                  >
                    <option value="Expired / Past Best-Before Date">Expired / Past Best-Before Date</option>
                    <option value="Rotten / Mold / Biological Decay">Rotten / Mold / Biological Decay</option>
                    <option value="Refrigeration / Cold-Chain Breakdown">Cold Storage / Temperature Abuse</option>
                    <option value="Damaged in Kitchen Handling">Damaged in Kitchen Handling</option>
                    <option value="Overcooked / Burnt / Preparation Defect">Overcooked / Burnt / Production Defect</option>
                    <option value="Insect / Pest Infestation">Insect / Pest Infestation</option>
                    <option value="Unconsumed / Leftover Food Loss">Unconsumed / Leftover Food Loss</option>
                    <option value="Contaminated / Unhygienic">Contaminated / Unhygienic</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Disposal Method</span>
                <select
                  value={spoilForm.disposalMethod}
                  onChange={(e) => setSpoilForm({ ...spoilForm, disposalMethod: e.target.value })}
                >
                  <option value="Discarded in Waste / Organic Compost">Discarded in Waste / Organic Compost</option>
                  <option value="Dispatched to Waste Disposal Vendor">Dispatched to Waste Disposal Vendor</option>
                  <option value="Drain Discharged (Liquids)">Drain Discharged (Liquids)</option>
                  <option value="Incinerated / Biogas">Incinerated / Biogas</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="field">
                <span>Notes / Corrective Action</span>
                <input
                  type="text"
                  value={spoilForm.notes}
                  onChange={(e) => setSpoilForm({ ...spoilForm, notes: e.target.value })}
                  placeholder="Optional context, staff notes or batch no."
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="danger-btn"
                  disabled={submitting}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <AlertOctagon size={16} />
                  {submitting ? "Deducting Stock in MySQL..." : "Confirm Spoilage & Reduce Stock"}
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
   7. STOCK ENTRIES (AUDIT TRAIL)
   ========================================================================== */
function StockEntriesView({ branchId, onError }) {
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getInventoryTransactions(branchId || undefined, undefined, typeFilter || undefined);
      setTransactions(res);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId, typeFilter]);

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Movement Types</option>
          <option value="RECIPE_CONSUMPTION">RECIPE_CONSUMPTION (Food Preparation / Recipe Deduction)</option>
          <option value="PURCHASE">PURCHASE (Stock In)</option>
          <option value="PURCHASE_RETURN">PURCHASE_RETURN (Damaged / Spoiled Return)</option>
          <option value="SPOILAGE">SPOILAGE (Spoiled Food Wastage)</option>
          <option value="MATERIAL_ISSUE">MATERIAL_ISSUE (Store &rarr; Kitchen)</option>
          <option value="PRODUCTION_CONSUMPTION">PRODUCTION_CONSUMPTION</option>
          <option value="TRANSFER_IN">TRANSFER_IN</option>
          <option value="TRANSFER_OUT">TRANSFER_OUT</option>
          <option value="StockIn">StockIn</option>
          <option value="StockOut">StockOut</option>
          <option value="Usage">Usage</option>
          <option value="Wastage">Wastage</option>
          <option value="Opening">Opening</option>
          <option value="Adjustment">Adjustment</option>
        </select>
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">AUDIT TRAIL</span>
            <h3>Stock Movement Log ({transactions.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading stock movements from MySQL...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-row">No stock transactions found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Movement ID</th>
                  <th>Timestamp</th>
                  <th>Item</th>
                  <th>Branch</th>
                  <th>Movement Type</th>
                  <th>Quantity</th>
                  <th>Previous Stock</th>
                  <th>New Stock</th>
                  <th>Locations</th>
                  <th>Reference</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  let badgeStyle = { fontWeight: "700" };
                  let badgeText = t.type;
                  if (t.type === "PURCHASE_RETURN") {
                    badgeStyle = { fontWeight: "700", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
                    badgeText = "↩ PURCHASE RETURN";
                  } else if (t.type === "SPOILAGE") {
                    badgeStyle = { fontWeight: "700", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" };
                    badgeText = "⚠ SPOILAGE";
                  } else if (t.type === "RECIPE_CONSUMPTION") {
                    badgeStyle = { fontWeight: "700", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" };
                    badgeText = "🍳 RECIPE CONSUMPTION";
                  }

                  return (
                    <tr key={t.id}>
                      <td><code>MOV-{t.id}</code></td>
                      <td>{new Date(t.createdAt).toLocaleString()}</td>
                      <td><strong>{t.itemName}</strong></td>
                      <td>{t.branchName}</td>
                      <td>
                        <span className="role-chip" style={badgeStyle}>{badgeText}</span>
                      </td>
                      <td>
                        <strong>{Number(t.quantity).toFixed(3)} {t.unit}</strong>
                      </td>
                      <td>{Number(t.stockBefore).toFixed(3)}</td>
                      <td>
                        <strong style={{ color: "var(--forest-800, #0e3826)" }}>
                          {Number(t.stockAfter).toFixed(3)}
                        </strong>
                      </td>
                      <td>
                        <small>
                          {t.sourceLocation && `${t.sourceLocation} → `}
                          {t.destinationLocation || "Main"}
                        </small>
                      </td>
                      <td>
                        <small>{t.reference || "—"}</small>
                        {t.notes && <div><small style={{ color: "var(--text-muted)" }}>{t.notes}</small></div>}
                      </td>
                      <td>{t.createdBy}</td>
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
   8. REORDER ALERTS (WITH 1-CLICK PURCHASE REQUEST)
   ========================================================================== */
function ReorderAlertsView({ branchId, onError, onCreatePurchase }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getReorderAlerts(branchId || undefined);
      setAlerts(res);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  return (
    <div className="page-grid">
      <div className="page-intro">
        <div>
          <span className="eyebrow">STOCK MONITOR</span>
          <h1>Reorder Alerts</h1>
          <p>Real-time alerts automatically computed from MySQL database values when stock &le; reorder level or 0.</p>
        </div>
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">ACTION REQUIRED</span>
            <h3>Items Needing Replenishment ({alerts.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Evaluating stock alerts against MySQL...</div>
        ) : alerts.length === 0 ? (
          <div className="panel empty-row" style={{ background: "#f8fdf9", border: "1px solid #ccebd5", color: "#227544" }}>
            ✓ All inventory items are currently at healthy stock levels!
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Branch</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Maximum Stock</th>
                  <th>Status</th>
                  <th>Suggested Reorder Qty</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const isOut = a.stockStatus === "OUT OF STOCK";
                  return (
                    <tr key={a.id} style={{ background: isOut ? "rgba(255, 0, 0, 0.03)" : "inherit" }}>
                      <td><code>{a.itemCode}</code></td>
                      <td><strong>{a.name}</strong><span>{a.category}</span></td>
                      <td>{a.branchName}</td>
                      <td>
                        <strong style={{ color: isOut ? "#b22c39" : "#c28100", fontSize: "14px" }}>
                          {Number(a.currentStock).toFixed(3)} {a.unit}
                        </strong>
                      </td>
                      <td>{Number(a.reorderLevel).toFixed(3)} {a.unit}</td>
                      <td>{Number(a.maximumStock).toFixed(3)} {a.unit}</td>
                      <td>
                        <span className={`status-badge ${isOut ? "status-out-of-stock" : "status-low-stock"}`}>
                          {a.stockStatus}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--forest-800, #0e3826)" }}>
                          {Number(a.suggestedReorderQuantity).toFixed(2)} {a.unit}
                        </strong>
                      </td>
                      <td>
                        <button
                          className="primary-btn compact"
                          onClick={() => onCreatePurchase()}
                        >
                          <ShoppingCart size={13} /> Create Purchase
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
    </div>
  );
}

/* ==========================================================================
   9. PRODUCTION PLANNING
   ========================================================================== */
function ProductionPlanManagement({ user, branchId, branches, canManage, onError, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [menus, setMenus] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    branchId: branchId || (branches[0]?.id ? String(branches[0].id) : ""),
    menuItemId: "",
    plannedQuantity: 10,
    unit: "Portion",
    planDate: new Date().toISOString().split("T")[0],
    mealType: "Lunch",
    remarks: ""
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [pList, mList] = await Promise.all([
        api.getProductionPlans(branchId || undefined),
        api.getMenu(branchId || undefined)
      ]);
      setPlans(pList);
      setMenus(mList);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.menuItemId || Number(form.plannedQuantity) <= 0) {
      onError("Please select a menu item and planned quantity > 0.");
      return;
    }
    try {
      const res = await api.createProductionPlan({
        branchId: user.branchId ? Number(user.branchId) : Number(form.branchId),
        menuItemId: Number(form.menuItemId),
        plannedQuantity: Number(form.plannedQuantity),
        unit: form.unit,
        planDate: form.planDate ? new Date(form.planDate).toISOString() : new Date().toISOString(),
        mealType: form.mealType,
        remarks: form.remarks,
        status: "PLANNED"
      });
      onSuccess(res.message);
      setShowModal(false);
      setForm({ ...form, menuItemId: "", plannedQuantity: 10, remarks: "" });
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function handleStatus(id, nextStatus) {
    try {
      const res = await api.updateProductionPlanStatus(id, nextStatus);
      onSuccess(res.message);
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /></button>
        {canManage && (
          <button className="primary-btn compact" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Production Plan
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">SCHEDULE</span>
            <h3>Production Plans ({plans.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading production plans from MySQL...</div>
        ) : plans.length === 0 ? (
          <div className="empty-row">No production plans scheduled. Click "New Production Plan" to create one.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plan No.</th>
                  <th>Date</th>
                  <th>Kitchen / Branch</th>
                  <th>Menu Item</th>
                  <th>Planned Portions</th>
                  <th>Meal Type</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.planNumber}</code></td>
                    <td>{new Date(p.planDate).toLocaleDateString()}</td>
                    <td>{p.branchName}</td>
                    <td><strong>{p.menuItemName}</strong></td>
                    <td><strong>{Number(p.plannedQuantity).toFixed(1)} {p.unit}</strong></td>
                    <td><span className="role-chip">{p.mealType}</span></td>
                    <td>
                      <span className={`status ${p.status === "COMPLETED" ? "active" : p.status === "CANCELLED" ? "inactive" : ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.remarks || "—"}</td>
                    <td>
                      {canManage && p.status !== "COMPLETED" && (
                        <div style={{ display: "flex", gap: "5px" }}>
                          {p.status === "PLANNED" && (
                            <button className="secondary-btn compact" onClick={() => handleStatus(p.id, "IN_PROGRESS")}>
                              Start
                            </button>
                          )}
                          <button className="secondary-btn compact" onClick={() => handleStatus(p.id, "COMPLETED")}>
                            Complete
                          </button>
                          <button className="danger-btn compact" onClick={() => handleStatus(p.id, "CANCELLED")}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Create Production Plan</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              {!user.branchId && (
                <label className="field">
                  <span>Kitchen / Branch *</span>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="two-col">
                <label className="field">
                  <span>Menu Item to Produce *</span>
                  <select
                    value={form.menuItemId}
                    onChange={(e) => setForm({ ...form, menuItemId: e.target.value })}
                    required
                  >
                    <option value="">Select Food</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Planned Portions *</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.plannedQuantity}
                    onChange={(e) => setForm({ ...form, plannedQuantity: e.target.value })}
                  />
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Plan Date</span>
                  <input
                    type="date"
                    value={form.planDate}
                    onChange={(e) => setForm({ ...form, planDate: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Meal Type</span>
                  <select
                    value={form.mealType}
                    onChange={(e) => setForm({ ...form, mealType: e.target.value })}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Banquet">Banquet</option>
                    <option value="General">General</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Remarks</span>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="e.g. Expected party of 40"
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Plan to MySQL
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
   10. PRODUCTION ENTRY (ACTUAL PRODUCTION & INGREDIENT DEDUCTION)
   ========================================================================== */
function ProductionEntryManagement({ user, branchId, branches, canManage, onError, onSuccess }) {
  const [productions, setProductions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const initialForm = {
    branchId: branchId || (branches[0]?.id ? String(branches[0].id) : ""),
    productionPlanId: "",
    menuItemId: "",
    plannedQuantity: 10,
    actualQuantity: 10,
    wastageQuantity: 0,
    productionDate: new Date().toISOString().split("T")[0],
    mealType: "Lunch",
    remarks: ""
  };
  const [form, setForm] = useState(initialForm);
  const [stockValidation, setStockValidation] = useState(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const [validationError, setValidationError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [pList, mList, planList] = await Promise.all([
        api.getProductions(branchId || undefined),
        api.getMenu(branchId || undefined),
        api.getProductionPlans(branchId || undefined, "PLANNED")
      ]);
      setProductions(pList);
      setMenus(mList);
      setPlans(planList);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  async function checkStock(menuId, qty) {
    if (!menuId || !qty || Number(qty) <= 0) {
      setStockValidation(null);
      return;
    }
    setCheckingStock(true);
    setValidationError("");
    try {
      const targetBranch = user.branchId ? Number(user.branchId) : (form.branchId ? Number(form.branchId) : undefined);
      const res = await api.checkRecipeStock({
        branchId: targetBranch,
        kitchenName: "Main Kitchen",
        items: [{ menuItemId: Number(menuId), quantity: Number(qty) }]
      });
      setStockValidation(res);
      if (!res.isAvailable && res.message) {
        setValidationError(res.message);
      }
    } catch (e) {
      setValidationError(e.message || "Failed to check kitchen stock.");
    } finally {
      setCheckingStock(false);
    }
  }

  function handlePlanSelect(planId) {
    if (!planId) {
      setForm({ ...form, productionPlanId: "" });
      return;
    }
    const found = plans.find((p) => p.id === Number(planId));
    if (found) {
      const nextMenuId = found.menuItemId ? String(found.menuItemId) : form.menuItemId;
      const nextQty = found.plannedQuantity;
      setForm({
        ...form,
        productionPlanId: String(found.id),
        menuItemId: nextMenuId,
        plannedQuantity: nextQty,
        actualQuantity: nextQty,
        mealType: found.mealType || form.mealType
      });
      checkStock(nextMenuId, nextQty);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.menuItemId || Number(form.actualQuantity) <= 0) {
      onError("Please select a menu item and enter actual quantity > 0.");
      return;
    }

    try {
      const res = await api.createProduction({
        branchId: user.branchId ? Number(user.branchId) : Number(form.branchId),
        productionPlanId: form.productionPlanId ? Number(form.productionPlanId) : null,
        menuItemId: Number(form.menuItemId),
        plannedQuantity: Number(form.plannedQuantity || form.actualQuantity),
        actualQuantity: Number(form.actualQuantity),
        wastageQuantity: Number(form.wastageQuantity || 0),
        productionDate: form.productionDate ? new Date(form.productionDate).toISOString() : new Date().toISOString(),
        mealType: form.mealType,
        remarks: form.remarks
      });

      onSuccess(res.message);
      setShowModal(false);
      setForm(initialForm);
      setStockValidation(null);
      await load();
    } catch (e) {
      onError(e.message || "Failed to record production: Insufficient Kitchen Stock.");
      if (e.shortages) {
        setStockValidation({
          isAvailable: false,
          shortages: e.shortages,
          message: e.message
        });
      }
    }
  }

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /></button>
        {canManage && (
          <button className="primary-btn compact" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Record Production Entry
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">OPERATIONS</span>
            <h3>Completed Production Entries ({productions.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading production entries from MySQL...</div>
        ) : productions.length === 0 ? (
          <div className="empty-row">No production entries recorded yet. Click "Record Production Entry" to log completed food.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Production No.</th>
                  <th>Date</th>
                  <th>Kitchen</th>
                  <th>Menu Item</th>
                  <th>Planned</th>
                  <th>Actual Produced</th>
                  <th>Wastage</th>
                  <th>Ingredients Consumed</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {productions.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.productionNumber}</code></td>
                    <td>{new Date(p.productionDate).toLocaleDateString()}</td>
                    <td>{p.branchName}</td>
                    <td><strong>{p.menuItemName}</strong></td>
                    <td>{Number(p.plannedQuantity).toFixed(1)}</td>
                    <td>
                      <strong style={{ color: "#217844", fontSize: "14px" }}>
                        {Number(p.actualQuantity).toFixed(1)}
                      </strong>
                    </td>
                    <td>{Number(p.wastageQuantity).toFixed(1)}</td>
                    <td>
                      <small>
                        {p.ingredients?.map((i) => `${i.itemName}: ${Number(i.quantity).toFixed(2)} ${i.unit}`).join(" • ") || "Raw materials used"}
                      </small>
                    </td>
                    <td>{p.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Record Actual Kitchen Production</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="info-banner" style={{ background: "var(--brand-gold-light, #fbf6e8)", border: "1px solid var(--brand-gold-border, #e6cb7e)", padding: "10px", borderRadius: "8px", fontSize: "12px", color: "var(--brand-gold-active, #966e12)" }}>
                ℹ Submitting this production entry records the actual prepared quantity and wastage for kitchen operations.
              </div>

              {!user.branchId && (
                <label className="field">
                  <span>Kitchen / Branch *</span>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {plans.length > 0 && (
                <label className="field">
                  <span>Link to Existing Production Plan (Optional)</span>
                  <select
                    value={form.productionPlanId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                  >
                    <option value="">Select a planned batch</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.planNumber} — {p.menuItemName} ({p.plannedQuantity} portions)
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="two-col">
                <label className="field">
                  <span>Menu Item *</span>
                  <select
                    value={form.menuItemId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setForm({ ...form, menuItemId: newId });
                      checkStock(newId, form.actualQuantity);
                    }}
                    required
                  >
                    <option value="">Select Food</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Production Date</span>
                  <input
                    type="date"
                    value={form.productionDate}
                    onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                  />
                </label>
              </div>

              <div className="three-col">
                <label className="field">
                  <span>Planned Quantity</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.plannedQuantity}
                    onChange={(e) => setForm({ ...form, plannedQuantity: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Actual Produced *</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={form.actualQuantity}
                    onChange={(e) => {
                      const newQty = e.target.value;
                      setForm({ ...form, actualQuantity: newQty });
                      checkStock(form.menuItemId, newQty);
                    }}
                  />
                </label>

                <label className="field">
                  <span>Wastage Quantity</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.wastageQuantity}
                    onChange={(e) => setForm({ ...form, wastageQuantity: e.target.value })}
                  />
                </label>
              </div>

              {/* Live Kitchen Stock Checking status */}
              {checkingStock && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <RefreshCw size={13} className="spin" /> Checking Kitchen Stock availability...
                </div>
              )}

              {/* Shortage Error Box */}
              {stockValidation?.shortages && stockValidation.shortages.length > 0 && (
                <div className="recipe-shortage-box">
                  <div className="recipe-shortage-title">
                    <AlertTriangle size={16} /> Insufficient Kitchen Stock
                  </div>
                  <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                    Cannot confirm food production. The following recipe ingredient(s) are short in Kitchen Stock:
                  </div>
                  {stockValidation.shortages.map((s, idx) => (
                    <div key={idx} className="recipe-shortage-card">
                      <div className="shortage-card-name">
                        {s.itemName}
                      </div>
                      <div className="shortage-card-grid">
                        <div><span className="shortage-label">Required:</span> <strong className="shortage-val-req">{s.formattedRequired}</strong></div>
                        <div><span className="shortage-label">Available:</span> <strong className="shortage-val-avail">{s.formattedAvailable}</strong></div>
                        <div><span className="shortage-label">Shortage:</span> <strong className="shortage-val-diff">{s.formattedShortage}</strong></div>
                      </div>
                    </div>
                  ))}
                  <div className="shortage-helper-text">
                    • Issue raw materials from Central Store &rarr; Kitchen to replenish stock before confirming.
                  </div>
                </div>
              )}

              {stockValidation?.isAvailable && (
                <div className="recipe-safe-banner" style={{ margin: "6px 0 10px 0", padding: "10px 14px", fontSize: "12px" }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span>
                    All recipe ingredients are available in Kitchen Stock for {form.actualQuantity} portion(s).
                  </span>
                </div>
              )}

              <label className="field">
                <span>Remarks / Batch Notes</span>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="e.g. Standard morning preparation"
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={stockValidation && !stockValidation.isAvailable}
                  style={{
                    background: stockValidation && !stockValidation.isAvailable ? "var(--slate-400)" : undefined,
                    cursor: stockValidation && !stockValidation.isAvailable ? "not-allowed" : "pointer"
                  }}
                >
                  Complete Production & Deduct Ingredients
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
   11. MATERIAL ISSUE (STORE -> KITCHEN WITH STOCK VALIDATION)
   ========================================================================== */
export function MaterialIssueManagement({ user, branchId, branches = [], canManage, onError, onSuccess }) {
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Multi-Product Selection State
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [multiSearch, setMultiSearch] = useState("");
  const [multiCategory, setMultiCategory] = useState("");
  const [multiSelectedMap, setMultiSelectedMap] = useState({});

  const initialForm = {
    branchId: branchId || (branches[0]?.id ? String(branches[0].id) : ""),
    department: "Main Kitchen",
    reference: "",
    receivedBy: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ inventoryItemId: "", quantity: 1, unit: "KG" }]
  };
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const [issueList, itemList] = await Promise.all([
        api.getMaterialIssues(branchId || undefined),
        api.getInventoryItems(branchId || undefined)
      ]);
      setIssues(issueList);
      setItems(itemList);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  function addLine() {
    setForm({
      ...form,
      items: [...form.items, { inventoryItemId: "", quantity: 1, unit: "KG" }]
    });
  }

  function removeLine(idx) {
    if (form.items.length <= 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx)
    });
  }

  function updateLine(idx, field, val) {
    const next = [...form.items];
    next[idx][field] = val;
    if (field === "inventoryItemId") {
      const it = items.find((x) => x.id === Number(val));
      if (it) next[idx].unit = it.unit;
    }
    setForm({ ...form, items: next });
  }

  // Multi-Product Selection Helpers
  function openMultiSelect() {
    const initialMap = {};
    form.items.forEach((line) => {
      if (line.inventoryItemId) {
        initialMap[line.inventoryItemId] = {
          selected: true,
          quantity: Number(line.quantity) || 1
        };
      }
    });
    setMultiSelectedMap(initialMap);
    setMultiSearch("");
    setMultiCategory("");
    setShowMultiSelect(true);
  }

  function toggleMultiItem(id) {
    setMultiSelectedMap((prev) => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          selected: !current?.selected,
          quantity: current?.quantity || 1
        }
      };
    });
  }

  function updateMultiQuantity(id, qty) {
    setMultiSelectedMap((prev) => ({
      ...prev,
      [id]: {
        selected: prev[id]?.selected !== undefined ? prev[id].selected : true,
        quantity: qty
      }
    }));
  }

  function selectAllFiltered(filteredList) {
    setMultiSelectedMap((prev) => {
      const next = { ...prev };
      filteredList.forEach((it) => {
        if (Number(it.currentStock) > 0) {
          next[it.id] = {
            selected: true,
            quantity: next[it.id]?.quantity || 1
          };
        }
      });
      return next;
    });
  }

  function deselectAll() {
    setMultiSelectedMap({});
  }

  function applyMultiSelect() {
    const selectedIds = Object.keys(multiSelectedMap).filter((id) => multiSelectedMap[id]?.selected);
    if (selectedIds.length === 0) {
      onError("Please select at least one product with available stock.");
      return;
    }

    const newLines = selectedIds.map((idStr) => {
      const id = Number(idStr);
      const it = items.find((x) => x.id === id);
      const requestedQty = Number(multiSelectedMap[idStr]?.quantity || 1);
      const safeQty = it ? Math.min(requestedQty, Math.max(0.01, it.currentStock)) : requestedQty;
      return {
        inventoryItemId: id,
        quantity: safeQty,
        unit: it?.unit || "KG"
      };
    });

    setForm({
      ...form,
      items: newLines
    });
    setShowMultiSelect(false);
  }

  const multiCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const filteredMultiItems = items.filter((it) => {
    const matchesSearch =
      !multiSearch ||
      it.name.toLowerCase().includes(multiSearch.toLowerCase()) ||
      (it.itemCode && it.itemCode.toLowerCase().includes(multiSearch.toLowerCase()));
    const matchesCat = !multiCategory || it.category === multiCategory;
    return matchesSearch && matchesCat;
  });

  const selectedCount = Object.keys(multiSelectedMap).filter((id) => multiSelectedMap[id]?.selected).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.items.some((i) => !i.inventoryItemId || Number(i.quantity) <= 0)) {
      onError("Please select an item and valid quantity > 0 for all lines.");
      return;
    }

    try {
      const selectedItem = items.find((it) => it.id === Number(form.items[0]?.inventoryItemId));
      const targetBranch = user.branchId 
        ? Number(user.branchId) 
        : (Number(form.branchId) || (selectedItem ? Number(selectedItem.branchId) : (branches[0]?.id ? Number(branches[0].id) : undefined)));

      const res = await api.createMaterialIssue({
        branchId: targetBranch,
        department: form.department,
        reference: form.reference,
        receivedBy: form.receivedBy,
        remarks: form.remarks,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        items: form.items.map((i) => ({
          inventoryItemId: Number(i.inventoryItemId),
          quantity: Number(i.quantity),
          unit: i.unit
        }))
      });

      onSuccess(res.message || "Material issue confirmed. Inventory stock updated.");
      setShowModal(false);
      setForm({
        ...initialForm,
        branchId: branchId || (branches[0]?.id ? String(branches[0].id) : "")
      });
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /></button>
        {canManage && (
          <button className="primary-btn compact" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Issue Material to Kitchen
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">STORE DISPATCH</span>
            <h3>Material Issues ({issues.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading material issues from MySQL...</div>
        ) : issues.length === 0 ? (
          <div className="empty-row">No material issues recorded yet. Click "Issue Material to Kitchen" to dispatch store items.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Issue No.</th>
                  <th>Date</th>
                  <th>Kitchen / Dept</th>
                  <th>Reference</th>
                  <th>Total Qty</th>
                  <th>Issued Items</th>
                  <th>Issued By</th>
                  <th>Received By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((m) => (
                  <tr key={m.id}>
                    <td><code>{m.issueNumber}</code></td>
                    <td>{new Date(m.date).toLocaleDateString()}</td>
                    <td><span className="role-chip">{m.department}</span></td>
                    <td>{m.reference}</td>
                    <td><strong>{Number(m.quantity).toFixed(2)}</strong></td>
                    <td>
                      <small>
                        {m.items?.map((it) => `${it.itemName}: ${it.quantity} ${it.unit}`).join(" • ") || "Issued"}
                      </small>
                    </td>
                    <td>{m.issuedBy}</td>
                    <td>{m.receivedBy || "—"}</td>
                    <td><span className="status active">{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Material Issue Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <h3>Material Issue (Store &rarr; Kitchen)</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="two-col">
                {!user.branchId && (
                  <label className="field">
                    <span>Branch *</span>
                    <select
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="field">
                  <span>Kitchen / Department *</span>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="Main Kitchen">Main Kitchen</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Banquet">Banquet</option>
                    <option value="Bar">Bar</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Reference No.</span>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="e.g. Req-102"
                  />
                </label>

                <label className="field">
                  <span>Received By</span>
                  <input
                    type="text"
                    value={form.receivedBy}
                    onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                    placeholder="Chef / Kitchen staff name"
                  />
                </label>
              </div>

              {/* Line Items */}
              <div className="purchase-line-items">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <strong>Items to Issue ({form.items.length})</strong>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="secondary-btn compact"
                      onClick={openMultiSelect}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--brand-gold-active, #966e12)",
                        borderColor: "var(--brand-gold-border, #e6cb7e)",
                        background: "var(--brand-gold-light, #fbf6e8)",
                        fontWeight: 600
                      }}
                    >
                      <CheckSquare size={14} /> Select Multiple Products
                    </button>
                    <button type="button" className="secondary-btn compact" onClick={addLine}>
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "60%" }}>Item (Available Stock)</th>
                        <th style={{ width: "30%" }}>Quantity</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((line, idx) => {
                        const selectedItem = items.find((i) => i.id === Number(line.inventoryItemId));
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                required
                                value={line.inventoryItemId}
                                onChange={(e) => updateLine(idx, "inventoryItemId", e.target.value)}
                              >
                                <option value="">Select Item</option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Available: {it.currentStock} {it.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={selectedItem ? selectedItem.currentStock : undefined}
                                  required
                                  value={line.quantity}
                                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                                />
                                <span>{line.unit}</span>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="danger-btn compact"
                                onClick={() => removeLine(idx)}
                                disabled={form.items.length <= 1}
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Confirm Issue & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Multiple Products Modal */}
      {showMultiSelect && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card large">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>BULK STORE DISPATCH</span>
                <h3>Select Multiple Products for Material Issue</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                  Pick all raw materials needed for this kitchen batch at once.
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowMultiSelect(false)}><X size={18} /></button>
            </div>

            <div className="kitchen-filter-bar" style={{ marginBottom: "12px", padding: "10px 14px", background: "var(--bg-subtle, #f8fafc)", borderRadius: "8px" }}>
              <div className="filter-input-group" style={{ flex: 1 }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search product name or code..."
                  value={multiSearch}
                  onChange={(e) => setMultiSearch(e.target.value)}
                />
              </div>

              <select
                value={multiCategory}
                onChange={(e) => setMultiCategory(e.target.value)}
                style={{ minWidth: "160px" }}
              >
                <option value="">All Categories</option>
                {multiCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                type="button"
                className="secondary-btn compact"
                onClick={() => selectAllFiltered(filteredMultiItems)}
                style={{ fontSize: "12px" }}
              >
                Select In-Stock
              </button>
              <button
                type="button"
                className="secondary-btn compact"
                onClick={deselectAll}
                style={{ fontSize: "12px" }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: "var(--brand-gold-light, #fbf6e8)", border: "1px solid var(--brand-gold-border, #e6cb7e)", borderRadius: "6px", marginBottom: "10px", fontSize: "13px" }}>
              <span style={{ color: "var(--brand-gold-active, #966e12)", fontWeight: 600 }}>
                {selectedCount} product{selectedCount === 1 ? "" : "s"} selected
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                Showing {filteredMultiItems.length} products
              </span>
            </div>

            <div className="table-wrap" style={{ maxHeight: "380px", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>Select</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Available Stock</th>
                    <th style={{ width: "160px" }}>Issue Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMultiItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        No inventory products match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMultiItems.map((it) => {
                      const isSelected = !!multiSelectedMap[it.id]?.selected;
                      const currentQty = multiSelectedMap[it.id]?.quantity || 1;
                      const hasStock = Number(it.currentStock) > 0;

                      return (
                        <tr
                          key={it.id}
                          style={{
                            background: isSelected ? "var(--brand-gold-light, #fbf6e8)" : undefined,
                            opacity: hasStock ? 1 : 0.6
                          }}
                        >
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => hasStock && toggleMultiItem(it.id)}
                              disabled={!hasStock}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: hasStock ? "pointer" : "not-allowed",
                                color: isSelected ? "var(--brand-gold, #c99824)" : "var(--text-muted)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </td>
                          <td>
                            <strong>{it.name}</strong>
                            {it.itemCode && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{it.itemCode}</div>
                            )}
                          </td>
                          <td>
                            <span className="role-chip" style={{ fontSize: "11px" }}>{it.category}</span>
                          </td>
                          <td>
                            <strong style={{ color: hasStock ? (it.stockStatus === "LOW STOCK" ? "#d97706" : "#16a34a") : "#dc2626" }}>
                              {Number(it.currentStock).toFixed(3)} {it.unit}
                            </strong>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={Number(it.currentStock)}
                                disabled={!isSelected}
                                value={currentQty}
                                onChange={(e) => updateMultiQuantity(it.id, e.target.value)}
                                style={{
                                  width: "90px",
                                  borderColor: isSelected ? "var(--brand-gold, #c99824)" : undefined,
                                  background: !isSelected ? "var(--bg-subtle, #f1f5f9)" : "#fff"
                                }}
                              />
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{it.unit}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowMultiSelect(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={applyMultiSelect}
                disabled={selectedCount === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <CheckSquare size={15} />
                Apply {selectedCount} Selected Products to Material Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   11B. MATERIAL RETURN (RETURN UNUSED PRODUCT / RAW MATERIAL: KITCHEN -> STORE)
   ========================================================================== */
export function MaterialReturnManagement({ user, branchId, branches = [], canManage, onError, onSuccess }) {
  const [returns, setReturns] = useState([]);
  const [items, setItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Multi-Product Selection State for Returns
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [multiSearch, setMultiSearch] = useState("");
  const [multiCategory, setMultiCategory] = useState("");
  const [multiSelectedMap, setMultiSelectedMap] = useState({});

  const initialForm = {
    branchId: branchId || (branches[0]?.id ? String(branches[0].id) : ""),
    department: "Main Kitchen",
    returnType: "Kitchen Unused",
    materialIssueId: "",
    reference: "",
    reason: "Unused Product / Excess",
    returnedBy: "",
    receivedBy: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ inventoryItemId: "", quantity: 1, unit: "KG", notes: "Good condition unused" }]
  };
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const [returnList, itemList, issueList] = await Promise.all([
        api.getMaterialReturns(branchId || undefined),
        api.getInventoryItems(branchId || undefined),
        api.getMaterialIssues(branchId || undefined)
      ]);
      setReturns(returnList || []);
      setItems(itemList || []);
      setIssues(issueList || []);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  function handleIssueSelect(issueId) {
    if (!issueId) {
      setForm({ ...form, materialIssueId: "" });
      return;
    }
    const found = issues.find((i) => i.id === Number(issueId));
    if (found && found.items && found.items.length > 0) {
      setForm({
        ...form,
        materialIssueId: String(found.id),
        department: found.department || form.department,
        reference: `RET-${found.issueNumber}`,
        items: found.items.map((it) => ({
          inventoryItemId: it.inventoryItemId,
          quantity: it.quantity,
          unit: it.unit || "KG",
          notes: `Unused from ${found.issueNumber}`
        }))
      });
    } else {
      setForm({ ...form, materialIssueId: String(issueId) });
    }
  }

  function addLine() {
    setForm({
      ...form,
      items: [...form.items, { inventoryItemId: "", quantity: 1, unit: "KG", notes: "Good condition unused" }]
    });
  }

  function removeLine(idx) {
    if (form.items.length <= 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx)
    });
  }

  function updateLine(idx, field, val) {
    const next = [...form.items];
    next[idx][field] = val;
    if (field === "inventoryItemId") {
      const it = items.find((x) => x.id === Number(val));
      if (it) next[idx].unit = it.unit;
    }
    setForm({ ...form, items: next });
  }

  // Multi-Product Selection Helpers
  function openMultiSelect() {
    const initialMap = {};
    form.items.forEach((line) => {
      if (line.inventoryItemId) {
        initialMap[line.inventoryItemId] = {
          selected: true,
          quantity: Number(line.quantity) || 1
        };
      }
    });
    setMultiSelectedMap(initialMap);
    setMultiSearch("");
    setMultiCategory("");
    setShowMultiSelect(true);
  }

  function toggleMultiItem(id) {
    setMultiSelectedMap((prev) => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          selected: !current?.selected,
          quantity: current?.quantity || 1
        }
      };
    });
  }

  function updateMultiQuantity(id, qty) {
    setMultiSelectedMap((prev) => ({
      ...prev,
      [id]: {
        selected: prev[id]?.selected !== undefined ? prev[id].selected : true,
        quantity: qty
      }
    }));
  }

  function applyMultiSelect() {
    const selectedIds = Object.keys(multiSelectedMap).filter((id) => multiSelectedMap[id]?.selected);
    if (selectedIds.length === 0) {
      onError("Please select at least one product to return.");
      return;
    }

    const newLines = selectedIds.map((idStr) => {
      const id = Number(idStr);
      const it = items.find((x) => x.id === id);
      return {
        inventoryItemId: id,
        quantity: Number(multiSelectedMap[idStr]?.quantity || 1),
        unit: it?.unit || "KG",
        notes: "Good condition unused"
      };
    });

    setForm({
      ...form,
      items: newLines
    });
    setShowMultiSelect(false);
  }

  const multiCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const filteredMultiItems = items.filter((it) => {
    const matchesSearch =
      !multiSearch ||
      it.name.toLowerCase().includes(multiSearch.toLowerCase()) ||
      (it.itemCode && it.itemCode.toLowerCase().includes(multiSearch.toLowerCase()));
    const matchesCat = !multiCategory || it.category === multiCategory;
    return matchesSearch && matchesCat;
  });

  const selectedCount = Object.keys(multiSelectedMap).filter((id) => multiSelectedMap[id]?.selected).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.items.some((i) => !i.inventoryItemId || Number(i.quantity) <= 0)) {
      onError("Please select an item and valid unused quantity > 0 for all lines.");
      return;
    }

    try {
      const selectedItem = items.find((it) => it.id === Number(form.items[0]?.inventoryItemId));
      const targetBranch = user.branchId
        ? Number(user.branchId)
        : (Number(form.branchId) || (selectedItem ? Number(selectedItem.branchId) : (branches[0]?.id ? Number(branches[0].id) : undefined)));

      const res = await api.createMaterialReturn({
        branchId: targetBranch,
        department: form.department,
        returnType: form.returnType,
        materialIssueId: form.materialIssueId ? Number(form.materialIssueId) : null,
        reference: form.reference,
        reason: form.reason,
        returnedBy: form.returnedBy,
        receivedBy: form.receivedBy,
        remarks: form.remarks,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        items: form.items.map((i) => ({
          inventoryItemId: Number(i.inventoryItemId),
          quantity: Number(i.quantity),
          unit: i.unit,
          notes: i.notes
        }))
      });

      onSuccess(res.message || "Unused materials returned to store! Inventory stock restored.");
      setShowModal(false);
      setForm({
        ...initialForm,
        branchId: branchId || (branches[0]?.id ? String(branches[0].id) : "")
      });
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  const filteredReturns = returns.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.reference && r.reference.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q)) ||
      (r.returnedBy && r.returnedBy.toLowerCase().includes(q)) ||
      (r.items && r.items.some((it) => it.itemName && it.itemName.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
          <div className="search-field" style={{ maxWidth: "320px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search return #, item, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%", background: "transparent" }}
            />
          </div>
          <button className="secondary-btn compact" onClick={load} title="Reload returns"><RefreshCw size={16} /></button>
        </div>
        {canManage && (
          <button
            className="primary-btn compact"
            onClick={() => setShowModal(true)}
            style={{
              background: "#059669",
              borderColor: "#059669",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RotateCcw size={16} /> Return Unused Material to Store
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">STORE RESTORATION</span>
            <h3>Unused Material Returns ({filteredReturns.length})</h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Materials returned from kitchen back to Central Store immediately restore live inventory stock and maintain an audit trail.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading material returns from MySQL...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="empty-row">
            No material returns recorded yet. If the kitchen has unused raw materials or ingredients, click <strong>"Return Unused Material to Store"</strong>.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Return No.</th>
                  <th>Date</th>
                  <th>Kitchen / Dept</th>
                  <th>Linked Issue / Ref</th>
                  <th>Return Reason</th>
                  <th>Total Qty</th>
                  <th>Returned Items & Notes</th>
                  <th>Returned By</th>
                  <th>Store Receiver</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((r) => (
                  <tr key={r.id}>
                    <td><code style={{ color: "#059669", fontWeight: 700 }}>{r.returnNumber}</code></td>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td><span className="role-chip" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#065f46" }}>{r.department}</span></td>
                    <td>
                      {r.materialIssueNumber ? (
                        <span title={`Linked Issue #${r.materialIssueNumber}`}>
                          <code>{r.materialIssueNumber}</code>
                        </span>
                      ) : (
                        r.reference || "—"
                      )}
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{r.reason}</span></td>
                    <td>
                      <strong style={{ color: "#059669" }}>
                        +{Number(r.quantity).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {r.items?.map((it) => (
                          <small key={it.id || it.inventoryItemId} style={{ color: "var(--text-main)" }}>
                            • <strong>{it.itemName}</strong>: +{it.quantity} {it.unit}
                            {it.notes && <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>({it.notes})</span>}
                          </small>
                        ))}
                      </div>
                    </td>
                    <td>{r.returnedBy || "Kitchen"}</td>
                    <td>{r.receivedBy || "Store"}</td>
                    <td><span className="status active" style={{ background: "#d1fae5", color: "#065f46" }}>{r.status}</span></td>
                    <td>
                      <button
                        className="secondary-btn compact"
                        onClick={() => {
                          setSelectedReturn(r);
                          setShowSlipModal(true);
                        }}
                        title="View Return Slip"
                        style={{ padding: "4px 8px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Eye size={13} /> Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Material Return Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Return Unused Material (Kitchen &rarr; Store)</h3>
                  <small style={{ color: "var(--text-muted)" }}>Restores inventory stock for unused ingredients or products</small>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="two-col">
                {!user.branchId && (
                  <label className="field">
                    <span>Branch *</span>
                    <select
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="field">
                  <span>Kitchen / Department *</span>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="Main Kitchen">Main Kitchen</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Banquet">Banquet</option>
                    <option value="Bar">Bar</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                </label>
              </div>

              <div className="three-col">
                <label className="field">
                  <span>Link to Material Issue (Optional)</span>
                  <select
                    value={form.materialIssueId}
                    onChange={(e) => handleIssueSelect(e.target.value)}
                  >
                    <option value="">Select an Issue to prefill (Optional)</option>
                    {issues.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.issueNumber} ({i.department} • {new Date(i.date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Return Reason *</span>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  >
                    <option value="Unused Product / Excess">Unused Product / Excess</option>
                    <option value="Shift End Return">Shift End Return</option>
                    <option value="Over-requisitioned">Over-requisitioned</option>
                    <option value="Cancelled Order / Batch">Cancelled Order / Batch</option>
                    <option value="Good Condition Leftover">Good Condition Leftover</option>
                    <option value="Quality / Wrong Item">Quality / Wrong Item</option>
                  </select>
                </label>

                <label className="field">
                  <span>Reference No.</span>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="e.g. RET-BATCH-01"
                  />
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Returned By (Kitchen Staff / Chef)</span>
                  <input
                    type="text"
                    value={form.returnedBy}
                    onChange={(e) => setForm({ ...form, returnedBy: e.target.value })}
                    placeholder="Name of staff returning material"
                  />
                </label>

                <label className="field">
                  <span>Received By (Store Keeper)</span>
                  <input
                    type="text"
                    value={form.receivedBy}
                    onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                    placeholder="Name of store keeper receiving stock"
                  />
                </label>
              </div>

              {/* Line Items */}
              <div className="purchase-line-items">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <strong>Unused Items to Return ({form.items.length})</strong>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="secondary-btn compact"
                      onClick={openMultiSelect}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#059669",
                        borderColor: "#a7f3d0",
                        background: "rgba(16, 185, 129, 0.08)",
                        fontWeight: 600
                      }}
                    >
                      <CheckSquare size={14} /> Select Multiple Products
                    </button>
                    <button type="button" className="secondary-btn compact" onClick={addLine}>
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Product / Raw Material *</th>
                        <th style={{ width: "20%" }}>Return Quantity *</th>
                        <th style={{ width: "15%" }}>Unit</th>
                        <th style={{ width: "25%" }}>Condition / Notes</th>
                        <th style={{ width: "5%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((line, idx) => {
                        const currentItm = items.find((x) => x.id === Number(line.inventoryItemId));
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                value={line.inventoryItemId}
                                onChange={(e) => updateLine(idx, "inventoryItemId", e.target.value)}
                                required
                              >
                                <option value="">Select Item</option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Stock: {Number(it.currentStock).toFixed(2)} {it.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={line.quantity}
                                onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={line.unit}
                                readOnly
                                style={{ background: "var(--bg-subtle, #f1f5f9)", color: "var(--text-muted)" }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={line.notes}
                                onChange={(e) => updateLine(idx, "notes", e.target.value)}
                                placeholder="Condition e.g. Sealed / Unopened"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="icon-btn text-danger"
                                onClick={() => removeLine(idx)}
                                disabled={form.items.length <= 1}
                                title="Remove Line"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <label className="field">
                <span>General Remarks</span>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Additional notes about this return..."
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ background: "#059669", borderColor: "#059669" }}
                >
                  Confirm Material Return & Restore Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Product Selection Modal for Returns */}
      {showMultiSelect && (
        <div className="modal-overlay">
          <div className="modal-card large" style={{ maxWidth: "780px" }}>
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Select Unused Products to Return</h3>
                <small style={{ color: "var(--text-muted)" }}>
                  Select unused raw materials or ingredients to return to inventory
                </small>
              </div>
              <button className="icon-btn" onClick={() => setShowMultiSelect(false)}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", gap: "10px", margin: "14px 0", flexWrap: "wrap", alignItems: "center" }}>
              <div className="search-field" style={{ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={multiSearch}
                  onChange={(e) => setMultiSearch(e.target.value)}
                  style={{ border: "none", outline: "none", width: "100%", background: "transparent" }}
                />
              </div>

              {multiCategories.length > 0 && (
                <select
                  value={multiCategory}
                  onChange={(e) => setMultiCategory(e.target.value)}
                  style={{ width: "180px" }}
                >
                  <option value="">All Categories</option>
                  {multiCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="secondary-btn compact"
                onClick={() => {
                  const next = { ...multiSelectedMap };
                  filteredMultiItems.forEach((it) => {
                    next[it.id] = { selected: true, quantity: next[it.id]?.quantity || 1 };
                  });
                  setMultiSelectedMap(next);
                }}
              >
                Select All
              </button>
              <button
                type="button"
                className="secondary-btn compact"
                onClick={() => setMultiSelectedMap({})}
              >
                Clear
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: "380px", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>Select</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Store Stock</th>
                    <th style={{ width: "160px" }}>Unused Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMultiItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        No inventory products match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMultiItems.map((it) => {
                      const isSelected = !!multiSelectedMap[it.id]?.selected;
                      const currentQty = multiSelectedMap[it.id]?.quantity || 1;

                      return (
                        <tr
                          key={it.id}
                          style={{
                            background: isSelected ? "rgba(16, 185, 129, 0.05)" : undefined
                          }}
                        >
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => toggleMultiItem(it.id)}
                              style={{
                                background: isSelected ? "#059669" : "transparent",
                                color: isSelected ? "#fff" : "var(--text-muted)",
                                border: "1px solid",
                                borderColor: isSelected ? "#059669" : "#cbd5e1",
                                borderRadius: "4px",
                                width: "24px",
                                height: "24px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                            >
                              {isSelected ? <Check size={14} /> : null}
                            </button>
                          </td>
                          <td>
                            <strong>{it.name}</strong>
                            {it.itemCode && <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>{it.itemCode}</span>}
                          </td>
                          <td><span className="role-chip">{it.category || "General"}</span></td>
                          <td>
                            <span>{Number(it.currentStock).toFixed(2)} {it.unit}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                disabled={!isSelected}
                                value={currentQty}
                                onChange={(e) => updateMultiQuantity(it.id, e.target.value)}
                                style={{
                                  width: "90px",
                                  borderColor: isSelected ? "#059669" : undefined,
                                  background: !isSelected ? "var(--bg-subtle, #f1f5f9)" : "#fff"
                                }}
                              />
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{it.unit}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowMultiSelect(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={applyMultiSelect}
                disabled={selectedCount === 0}
                style={{ background: "#059669", borderColor: "#059669", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <CheckSquare size={15} />
                Apply {selectedCount} Selected Products to Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Slip / Voucher Modal */}
      {showSlipModal && selectedReturn && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "600px" }}>
            <div className="modal-head">
              <h3>Material Return Slip</h3>
              <button className="icon-btn" onClick={() => setShowSlipModal(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #059669", paddingBottom: "10px", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ margin: 0, color: "#059669" }}>ANNAMITHRA RESTAURANT OPERATIONS</h4>
                  <small style={{ color: "var(--text-muted)" }}>Store Material Return Voucher</small>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "16px", display: "block" }}>{selectedReturn.returnNumber}</strong>
                  <small>{new Date(selectedReturn.date).toLocaleDateString()}</small>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", marginBottom: "14px" }}>
                <div><strong>From Department:</strong> {selectedReturn.department}</div>
                <div><strong>To:</strong> Central Store / Inventory</div>
                <div><strong>Reason:</strong> {selectedReturn.reason}</div>
                <div><strong>Reference:</strong> {selectedReturn.reference || selectedReturn.materialIssueNumber || "—"}</div>
                <div><strong>Returned By:</strong> {selectedReturn.returnedBy || "Kitchen"}</div>
                <div><strong>Received By:</strong> {selectedReturn.receivedBy || "Store"}</div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle, #f8fafc)", borderBottom: "1px solid #cbd5e1" }}>
                    <th style={{ padding: "8px", textAlign: "left" }}>#</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Product Name</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Quantity Returned</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturn.items?.map((it, idx) => (
                    <tr key={it.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px" }}>{idx + 1}</td>
                      <td style={{ padding: "8px" }}><strong>{it.itemName}</strong></td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#059669", fontWeight: 700 }}>
                        +{it.quantity} {it.unit}
                      </td>
                      <td style={{ padding: "8px", color: "var(--text-muted)" }}>{it.notes || "Good condition"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1", fontSize: "12px" }}>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: "30px", marginBottom: "4px" }}></div>
                  <span>Returned By Signature</span>
                </div>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: "30px", marginBottom: "4px" }}></div>
                  <span>Store Receiver Signature</span>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button className="secondary-btn" onClick={() => window.print()}>
                Print Slip
              </button>
              <button className="primary-btn" onClick={() => setShowSlipModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   12. TRANSFERS MANAGEMENT (BRANCH TO BRANCH WITH MYSQL TRANSACTIONS)
   ========================================================================== */
function TransfersManagement({ branches, canManage, onError, onSuccess }) {
  const [transfers, setTransfers] = useState([]);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    fromBranchId: branches[0]?.id ? String(branches[0].id) : "",
    toBranchId: branches[1]?.id ? String(branches[1].id) : "",
    inventoryItemId: "",
    quantity: 1,
    notes: ""
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [tList, iList] = await Promise.all([
        api.getTransfers(),
        api.getInventoryItems(form.fromBranchId ? Number(form.fromBranchId) : undefined)
      ]);
      setTransfers(tList);
      setItems(iList);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [form.fromBranchId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.fromBranchId === form.toBranchId) {
      onError("Source and destination branch cannot be the same.");
      return;
    }
    if (!form.inventoryItemId || Number(form.quantity) <= 0) {
      onError("Please select an item and valid quantity > 0.");
      return;
    }

    try {
      const res = await api.createTransfer({
        fromBranchId: Number(form.fromBranchId),
        toBranchId: Number(form.toBranchId),
        inventoryItemId: Number(form.inventoryItemId),
        quantity: Number(form.quantity),
        notes: form.notes
      });
      onSuccess(res.message);
      setShowModal(false);
      setForm({ ...form, inventoryItemId: "", quantity: 1, notes: "" });
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function handleStatus(id, status) {
    if (status === "COMPLETED") {
      if (!window.confirm("Complete this transfer?\n\nThis will execute a MySQL database transaction:\n1. Decrease source branch stock\n2. Increase destination branch stock\n3. Record TRANSFER_OUT and TRANSFER_IN movements")) {
        return;
      }
    }
    try {
      const res = await api.updateTransferStatus(id, status);
      onSuccess(res.message);
      await load();
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="kitchen-filter-bar panel">
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /></button>
        {canManage && (
          <button className="primary-btn compact" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Transfer Request
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">INTER-BRANCH LOGISTICS</span>
            <h3>Stock Transfer Requests ({transfers.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Loading transfer records from MySQL...</div>
        ) : transfers.length === 0 ? (
          <div className="empty-row">No transfer requests logged. Click "New Transfer Request" to initiate one.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transfer No.</th>
                  <th>From Location</th>
                  <th>To Location</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.transferNumber}</code></td>
                    <td><strong>{t.fromBranchName}</strong></td>
                    <td><strong>{t.toBranchName}</strong></td>
                    <td>{t.itemName}</td>
                    <td><strong>{Number(t.quantity).toFixed(2)} {t.unit}</strong></td>
                    <td>
                      <span className={`status ${t.status === "COMPLETED" ? "active" : t.status === "REJECTED" ? "inactive" : ""}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>{t.requestedBy}</td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      {canManage && t.status !== "COMPLETED" && t.status !== "REJECTED" && (
                        <div style={{ display: "flex", gap: "5px" }}>
                          {t.status === "PENDING" && (
                            <button className="secondary-btn compact" onClick={() => handleStatus(t.id, "APPROVED")}>
                              Approve
                            </button>
                          )}
                          {t.status === "APPROVED" && (
                            <button className="secondary-btn compact" onClick={() => handleStatus(t.id, "IN_TRANSIT")}>
                              In Transit
                            </button>
                          )}
                          {(t.status === "APPROVED" || t.status === "IN_TRANSIT") && (
                            <button className="primary-btn compact" onClick={() => handleStatus(t.id, "COMPLETED")}>
                              Complete Transfer
                            </button>
                          )}
                          {t.status === "PENDING" && (
                            <button className="danger-btn compact" onClick={() => handleStatus(t.id, "REJECTED")}>
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Create Inter-Branch Transfer Request</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="two-col">
                <label className="field">
                  <span>From Branch (Source) *</span>
                  <select
                    value={form.fromBranchId}
                    onChange={(e) => setForm({ ...form, fromBranchId: e.target.value })}
                    required
                  >
                    <option value="">Select Source</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>To Branch (Destination) *</span>
                  <select
                    value={form.toBranchId}
                    onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}
                    required
                  >
                    <option value="">Select Destination</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Item to Transfer *</span>
                  <select
                    value={form.inventoryItemId}
                    onChange={(e) => setForm({ ...form, inventoryItemId: e.target.value })}
                    required
                  >
                    <option value="">Select Item</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} (Stock: {it.currentStock} {it.unit})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Quantity *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </label>
              </div>

              <label className="field">
                <span>Transfer Notes</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Reason for transfer, driver details, etc."
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Submit Transfer Request
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
   13. MENUS (DISH CATALOG & RECIPE MANAGEMENT)
   ========================================================================== */
function MenusManagement({ user, branchId, branches, canManage, onError, onSuccess }) {
  return (
    <MenuManagement
      user={user}
      embeddedBranchId={branchId}
      branches={branches}
      canManage={canManage}
      onError={onError}
      onSuccess={onSuccess}
      isKitchenModule={true}
    />
  );
}

/* ==========================================================================
   14. PLAN VS ACTUAL (COMPARATIVE ANALYSIS FROM MYSQL)
   ========================================================================== */
function PlanVsActualView({ branchId, onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPlanVsActual(branchId || undefined);
      setData(res);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  return (
    <div className="page-grid">
      <div className="page-intro">
        <div>
          <span className="eyebrow">VARIANCE ANALYSIS</span>
          <h1>Plan vs Actual Comparison</h1>
          <p>Real-time variance comparison calculated directly from MySQL production plans, production entries, and ingredient consumption.</p>
        </div>
        <button className="secondary-btn compact" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      {loading ? (
        <div className="panel empty-row">Calculating Plan vs Actual variance from MySQL...</div>
      ) : !data ? (
        <div className="panel empty-row">No comparison data available.</div>
      ) : (
        <>
          {/* Production Output Comparison */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">FOOD PRODUCTION</span>
                <h3>Planned vs Actual Portions</h3>
              </div>
              <ChefHat size={18} />
            </div>

            {data.productionComparison?.length === 0 ? (
              <div className="empty-row">No production records found in this period.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Menu Item</th>
                      <th>Planned Quantity</th>
                      <th>Actual Produced</th>
                      <th>Variance</th>
                      <th>Variance %</th>
                      <th>Total Wastage</th>
                      <th>Batch Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productionComparison.map((row) => {
                      const isNegative = row.difference < 0;
                      return (
                        <tr key={row.menuItemId || row.menuItemName}>
                          <td><strong>{row.menuItemName}</strong></td>
                          <td>{Number(row.plannedQuantity).toFixed(1)}</td>
                          <td><strong>{Number(row.actualQuantity).toFixed(1)}</strong></td>
                          <td style={{ color: isNegative ? "#b22c39" : "#217844", fontWeight: "700" }}>
                            {row.difference > 0 ? `+${row.difference}` : row.difference}
                          </td>
                          <td>
                            <span className={`status ${isNegative ? "inactive" : "active"}`}>
                              {row.differencePercentage}%
                            </span>
                          </td>
                          <td>{Number(row.totalWastage).toFixed(1)}</td>
                          <td>{row.batchCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ingredient Usage Comparison */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">RAW MATERIALS USAGE</span>
                <h3>Planned vs Actual Ingredient Consumption</h3>
              </div>
              <Package size={18} />
            </div>

            {data.ingredientComparison?.length === 0 ? (
              <div className="empty-row">No ingredient usage logs found.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ingredient Name</th>
                      <th>Planned Consumption</th>
                      <th>Actual Consumed</th>
                      <th>Variance</th>
                      <th>Variance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ingredientComparison.map((row) => (
                      <tr key={row.inventoryItemId || row.itemName}>
                        <td><strong>{row.itemName}</strong></td>
                        <td>{Number(row.plannedQuantity).toFixed(2)} {row.unit}</td>
                        <td><strong>{Number(row.actualQuantity).toFixed(2)} {row.unit}</strong></td>
                        <td style={{ color: row.difference > 0 ? "#b22c39" : "#217844", fontWeight: "700" }}>
                          {row.difference > 0 ? `+${Number(row.difference).toFixed(2)}` : Number(row.difference).toFixed(2)} {row.unit}
                        </td>
                        <td>
                          <span className={`status ${row.difference > 0 ? "inactive" : "active"}`}>
                            {row.differencePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   15. KITCHEN REPORTS SUITE (Live Stock, Recipe Deductions, Spoilage, Inwarding & Procurement)
   ========================================================================== */
export { KitchenReportsView };
export const KitchenReportsPage = KitchenReportsView;

/* ==========================================================================
   KITCHEN STOCK (Real-time Kitchen Inventory: Store -> Kitchen)
   ========================================================================== */
function KitchenStockView({ user, branchId, onError, onSuccess, onNavigate }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState("stock"); // "stock" | "recipe_history"
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getKitchenStock(branchId || undefined);
      setStocks(Array.isArray(data) ? data : []);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipeHistory() {
    setLoadingHistory(true);
    try {
      const data = await api.getRecipeConsumptionHistory(branchId || undefined);
      setRecipeHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (viewMode === "stock") {
      load();
    } else {
      loadRecipeHistory();
    }
  }, [branchId, viewMode]);

  const categories = useMemo(() => {
    const set = new Set(stocks.map(s => s.category).filter(Boolean));
    return Array.from(set);
  }, [stocks]);

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      const matchSearch = !search ||
        (s.itemName && s.itemName.toLowerCase().includes(search.toLowerCase())) ||
        (s.itemCode && s.itemCode.toLowerCase().includes(search.toLowerCase())) ||
        (s.kitchenName && s.kitchenName.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = !categoryFilter || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [stocks, search, categoryFilter]);

  const totalKitchenUnits = useMemo(() => stocks.reduce((sum, s) => sum + (Number(s.currentStock) || 0), 0), [stocks]);
  const totalKitchenValue = useMemo(() => stocks.reduce((sum, s) => sum + (Number(s.totalValue) || (Number(s.currentStock) * Number(s.unitCost)) || 0), 0), [stocks]);
  const lowStockCount = useMemo(() => stocks.filter(s => Number(s.currentStock) <= Number(s.reorderLevel)).length, [stocks]);

  return (
    <div className="page-grid">
      {/* Metric Cards */}
      <div className="kitchen-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div className="metric-card panel">
          <span className="eyebrow">TOTAL KITCHEN ITEMS</span>
          <h2 style={{ margin: "6px 0 0 0" }}>{stocks.length}</h2>
          <small style={{ color: "var(--text-muted)" }}>Active ingredients in kitchen</small>
        </div>
        <div className="metric-card panel">
          <span className="eyebrow">TOTAL KITCHEN STOCK</span>
          <h2 style={{ margin: "6px 0 0 0", color: "var(--forest-900, #072518)" }}>{totalKitchenUnits.toFixed(2)}</h2>
          <small style={{ color: "var(--text-muted)" }}>Combined ingredient quantities</small>
        </div>
        <div className="metric-card panel">
          <span className="eyebrow">KITCHEN STOCK VALUE</span>
          <h2 style={{ margin: "6px 0 0 0", color: "#059669" }}>₹{totalKitchenValue.toFixed(2)}</h2>
          <small style={{ color: "var(--text-muted)" }}>Valued at last purchase cost</small>
        </div>
        <div className="metric-card panel">
          <span className="eyebrow">LOW / OUT OF STOCK</span>
          <h2 style={{ margin: "6px 0 0 0", color: lowStockCount > 0 ? "#dc2626" : "#059669" }}>{lowStockCount}</h2>
          <small style={{ color: "var(--text-muted)" }}>Items below reorder threshold</small>
        </div>
      </div>

      {/* Mode Selector and Actions Bar */}
      <div className="kitchen-filter-bar panel" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className={viewMode === "stock" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => setViewMode("stock")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: viewMode === "stock" ? "var(--forest-900, #072518)" : undefined,
              color: viewMode === "stock" ? "#ffffff" : undefined
            }}
          >
            <Boxes size={14} /> Live Kitchen Stock
          </button>
          <button
            className={viewMode === "recipe_history" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => setViewMode("recipe_history")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: viewMode === "recipe_history" ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : undefined,
              borderColor: viewMode === "recipe_history" ? "#047857" : undefined,
              color: viewMode === "recipe_history" ? "#ffffff" : undefined
            }}
          >
            <ChefHat size={14} /> Recipe Consumption History
          </button>
        </div>

        {viewMode === "stock" ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, minWidth: "280px", justifyContent: "flex-end" }}>
            <div style={{ position: "relative", maxWidth: "260px" }}>
              <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search kitchen item or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "32px", width: "100%" }}
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ minWidth: "140px" }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="secondary-btn compact" onClick={load} title="Refresh Kitchen Stock">
              <RefreshCw size={15} /> Refresh
            </button>
            {onNavigate && (
              <>
                <button className="primary-btn compact" onClick={() => onNavigate("material_issue")}>
                  <Share2 size={15} /> Issue from Store
                </button>
                <button className="secondary-btn compact" onClick={() => onNavigate("material_return")} style={{ color: "#d97706" }}>
                  <RotateCcw size={15} /> Return to Store
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="secondary-btn compact" onClick={loadRecipeHistory} title="Refresh History">
              <RefreshCw size={15} /> Refresh History
            </button>
          </div>
        )}
      </div>

      {/* View 1: Real-time Stock Table */}
      {viewMode === "stock" && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">REAL-TIME INGREDIENT INVENTORY</span>
              <h3>Kitchen Stock Records ({filtered.length})</h3>
            </div>
            <small style={{ color: "var(--text-muted)" }}>
              Deducted automatically during production; replenished via Store Material Issue
            </small>
          </div>

          {loading ? (
            <div className="empty-row">Loading Kitchen Stock records...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-row">
              {stocks.length === 0 ? "No kitchen stock records found. Issue materials from Store to begin." : "No ingredients match search criteria."}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Kitchen</th>
                    <th style={{ textAlign: "right" }}>Kitchen Stock</th>
                    <th style={{ textAlign: "right" }}>Central Store Stock</th>
                    <th style={{ textAlign: "right" }}>Reorder Level</th>
                    <th style={{ textAlign: "right" }}>Unit Cost</th>
                    <th style={{ textAlign: "right" }}>Total Value</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const current = Number(s.currentStock) || 0;
                    const reorder = Number(s.reorderLevel) || 0;
                    const central = Number(s.centralStock) || 0;
                    const isOut = current <= 0;
                    const isLow = !isOut && current <= reorder;

                    return (
                      <tr key={s.id || s.inventoryItemId}>
                        <td><code>{s.itemCode || `ITM-${s.inventoryItemId}`}</code></td>
                        <td><strong>{s.itemName}</strong></td>
                        <td><span className="k-pill neutral">{s.category || "General"}</span></td>
                        <td><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{s.kitchenName || "Main Kitchen"}</span></td>
                        <td style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "14px", color: isOut ? "#dc2626" : isLow ? "#d97706" : "#059669" }}>
                            {current.toFixed(3)} {s.unit}
                          </strong>
                        </td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                          {central.toFixed(3)} {s.unit}
                        </td>
                        <td style={{ textAlign: "right" }}>{reorder.toFixed(3)} {s.unit}</td>
                        <td style={{ textAlign: "right" }}>₹{Number(s.unitCost || 0).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>
                          <strong>₹{Number(s.totalValue || (current * (s.unitCost || 0))).toFixed(2)}</strong>
                        </td>
                        <td>
                          {isOut ? (
                            <span className="k-pill red">Out of Stock</span>
                          ) : isLow ? (
                            <span className="k-pill amber">Low Stock</span>
                          ) : (
                            <span className="k-pill green">Adequate</span>
                          )}
                        </td>
                        <td>
                          <small style={{ color: "var(--text-muted)" }}>
                            {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}
                          </small>
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

      {/* View 2: Recipe Consumption History Table */}
      {viewMode === "recipe_history" && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">AUDITABLE RECIPE DEDUCTIONS</span>
              <h3>Recipe Consumption & Stock Deductions ({recipeHistory.length})</h3>
            </div>
            <small style={{ color: "var(--text-muted)" }}>
              Audited logs created automatically when food is prepared / confirmed
            </small>
          </div>

          {loadingHistory ? (
            <div className="empty-row">Loading recipe consumption history from MySQL...</div>
          ) : recipeHistory.length === 0 ? (
            <div className="empty-row">
              No recipe consumption movements recorded yet. Prepare food from the Menus or Kitchen production tab to trigger automatic deduction.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Movement ID</th>
                    <th>Action</th>
                    <th>Ingredient Deducted</th>
                    <th style={{ textAlign: "right" }}>Quantity Deducted</th>
                    <th style={{ textAlign: "right" }}>Kitchen Stock Before</th>
                    <th style={{ textAlign: "right" }}>Kitchen Stock After</th>
                    <th>Reason / Food Item Prepared</th>
                    <th>Kitchen / User</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeHistory.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                      <td><code>MOV-{h.id}</code></td>
                      <td>
                        <span
                          className="recipe-notice-pill"
                          style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }}
                        >
                          <Utensils size={11} /> Recipe Consumption
                        </span>
                      </td>
                      <td><strong>{h.itemName}</strong></td>
                      <td style={{ textAlign: "right" }}>
                        <strong style={{ color: "#dc2626", fontSize: "13.5px" }}>
                          -{Number(h.quantity).toFixed(3)} {h.unit}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {Number(h.stockBefore).toFixed(3)} {h.unit}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong style={{ color: "#059669" }}>
                          {Number(h.stockAfter).toFixed(3)} {h.unit}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {h.reason || h.notes || "Recipe Consumption"}
                        </div>
                        {h.reference && (
                          <small style={{ color: "var(--text-muted)" }}>Ref: {h.reference}</small>
                        )}
                      </td>
                      <td>
                        <div>{h.destinationLocation || "Main Kitchen"}</div>
                        <small style={{ color: "var(--text-muted)" }}>{h.createdBy}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   STOCK LEDGER (Requirement 8: Running balance Date | Type | Ref | In | Out | Bal)
   ========================================================================== */
function StockLedgerView({ user, branchId, onError, onSuccess }) {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ledgerData, setLedgerData] = useState({
    totalTransactions: 0,
    openingStock: 0,
    totalIn: 0,
    totalOut: 0,
    currentStock: 0,
    ledger: []
  });
  const [loading, setLoading] = useState(true);

  // Load items for the dropdown
  useEffect(() => {
    api.getInventoryItems(branchId || undefined)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [branchId]);

  async function loadLedger() {
    setLoading(true);
    try {
      const res = await api.getStockLedger(
        branchId || undefined,
        selectedItemId ? Number(selectedItemId) : undefined,
        fromDate || undefined,
        toDate || undefined
      );
      setLedgerData(res || { totalTransactions: 0, openingStock: 0, totalIn: 0, totalOut: 0, currentStock: 0, ledger: [] });
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, [branchId, selectedItemId, fromDate, toDate]);

  function setDatePreset(preset) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const wY = weekAgo.getFullYear();
      const wM = String(weekAgo.getMonth() + 1).padStart(2, "0");
      const wD = String(weekAgo.getDate()).padStart(2, "0");
      setFromDate(`${wY}-${wM}-${wD}`);
      setToDate(todayStr);
    } else if (preset === "month") {
      setFromDate(`${yyyy}-${mm}-01`);
      setToDate(todayStr);
    } else if (preset === "all") {
      setFromDate("");
      setToDate("");
    }
  }

  function exportCSV() {
    if (!ledgerData.ledger || ledgerData.ledger.length === 0) return;
    const headers = ["Date", "Item", "Category", "Transaction Type", "Reference", "In (+)", "Out (-)", "Balance", "From", "To", "User", "Notes"];
    const rows = ledgerData.ledger.map(r => [
      new Date(r.date).toLocaleString(),
      `"${r.itemName} (${r.unit})"`,
      `"${r.category || ""}"`,
      `"${r.transactionType}"`,
      `"${r.reference || ""}"`,
      r.inQuantity != null ? r.inQuantity : "",
      r.outQuantity != null ? r.outQuantity : "",
      r.balance != null ? r.balance : "",
      `"${r.sourceLocation || ""}"`,
      `"${r.destinationLocation || ""}"`,
      `"${r.createdBy || ""}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const selectedItemObj = items.find(i => i.id === Number(selectedItemId));

  return (
    <div className="page-grid">
      {/* Running Balance Metric Summary Cards */}
      <div className="kitchen-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div className="metric-card panel">
          <span className="eyebrow">OPENING STOCK</span>
          <h2 style={{ margin: "6px 0 0 0", color: "#4b5563" }}>
            {Number(ledgerData.openingStock || 0).toFixed(3)}
          </h2>
          <small style={{ color: "var(--text-muted)" }}>
            {selectedItemObj ? selectedItemObj.unit : "Units"} at start of period
          </small>
        </div>
        <div className="metric-card panel">
          <span className="eyebrow">TOTAL STOCK IN (+)</span>
          <h2 style={{ margin: "6px 0 0 0", color: "#059669" }}>
            +{Number(ledgerData.totalIn || 0).toFixed(3)}
          </h2>
          <small style={{ color: "var(--text-muted)" }}>Purchases, GRN &amp; Returns</small>
        </div>
        <div className="metric-card panel">
          <span className="eyebrow">TOTAL STOCK OUT (-)</span>
          <h2 style={{ margin: "6px 0 0 0", color: "#dc2626" }}>
            -{Number(ledgerData.totalOut || 0).toFixed(3)}
          </h2>
          <small style={{ color: "var(--text-muted)" }}>Issues, Consumptions &amp; Spoilage</small>
        </div>
        <div className="metric-card panel">
          <span className="eyebrow">CURRENT / CLOSING BALANCE</span>
          <h2 style={{ margin: "6px 0 0 0", color: "var(--forest-900, #072518)" }}>
            {Number(ledgerData.currentStock || 0).toFixed(3)}
          </h2>
          <small style={{ color: "var(--text-muted)" }}>
            {selectedItemObj ? selectedItemObj.unit : "Units"} live balance
          </small>
        </div>
      </div>

      {/* Filters and Date Presets */}
      <div className="kitchen-filter-bar panel" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            style={{ minWidth: "220px", fontWeight: "600" }}
          >
            <option value="">All Inventory Items</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.itemCode || `ITM-${i.id}`}) — {i.unit}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: "6px 8px" }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: "6px 8px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            <button className="secondary-btn compact" onClick={() => setDatePreset("today")}>Today</button>
            <button className="secondary-btn compact" onClick={() => setDatePreset("week")}>7 Days</button>
            <button className="secondary-btn compact" onClick={() => setDatePreset("month")}>Month</button>
            <button className="secondary-btn compact" onClick={() => setDatePreset("all")}>All</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary-btn compact" onClick={loadLedger}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="secondary-btn compact" onClick={exportCSV} disabled={!ledgerData.ledger || ledgerData.ledger.length === 0}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">AUDITABLE STOCK LEDGER</span>
            <h3>
              {selectedItemObj ? `Stock Ledger for "${selectedItemObj.name}"` : "Global Stock Movement Ledger"} ({ledgerData.ledger.length} entries)
            </h3>
          </div>
          <small style={{ color: "var(--text-muted)" }}>
            Formula: Opening Stock + Purchase / Return - Issue / Production / Spoilage = Balance
          </small>
        </div>

        {loading ? (
          <div className="empty-row">Calculating stock ledger running balances...</div>
        ) : ledgerData.ledger.length === 0 ? (
          <div className="empty-row">No stock transactions found for the selected criteria.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Item</th>
                  <th>Transaction Type</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>In (+)</th>
                  <th style={{ textAlign: "right" }}>Out (-)</th>
                  <th style={{ textAlign: "right" }}>Running Balance</th>
                  <th>Movement Path</th>
                  <th>Notes</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.ledger.map((row) => {
                  let typeBadgeClass = "neutral";
                  let raw = row.rawType || "";
                  if (raw.includes("ISSUE") || raw === "KITCHEN_ISSUE") typeBadgeClass = "blue";
                  else if (raw.includes("RETURN") || raw === "PURCHASE_RETURN") typeBadgeClass = "amber";
                  else if (raw.includes("CONSUMPTION") || raw === "PRODUCTION_CONSUMPTION") typeBadgeClass = "purple";
                  else if (raw.includes("PURCHASE") || raw === "StockIn") typeBadgeClass = "green";
                  else if (raw.includes("SPOILAGE") || raw.includes("WASTAGE")) typeBadgeClass = "red";

                  return (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: "600" }}>{new Date(row.date).toLocaleDateString()}</div>
                        <small style={{ color: "var(--text-muted)" }}>{new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </td>
                      <td>
                        <strong>{row.itemName}</strong>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{row.category}</div>
                      </td>
                      <td>
                        <span className={`k-pill ${typeBadgeClass}`}>
                          {row.transactionType}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: "12px", background: "var(--bg-surface-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
                          {row.reference}
                        </code>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {row.inQuantity != null ? (
                          <strong style={{ color: "#059669" }}>
                            +{Number(row.inQuantity).toFixed(3)} {row.unit}
                          </strong>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {row.outQuantity != null ? (
                          <strong style={{ color: "#dc2626" }}>
                            -{Number(row.outQuantity).toFixed(3)} {row.unit}
                          </strong>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "14px", color: "var(--forest-900, #072518)" }}>
                          {Number(row.balance).toFixed(3)} {row.unit}
                        </strong>
                      </td>
                      <td>
                        <small style={{ color: "var(--text-muted)" }}>
                          {row.sourceLocation || "Store"} &rarr; {row.destinationLocation || "Kitchen"}
                        </small>
                      </td>
                      <td>
                        <small style={{ color: "var(--text-muted)", maxWidth: "180px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.notes}>
                          {row.notes || "—"}
                        </small>
                      </td>
                      <td>
                        <small>{row.createdBy || "Staff"}</small>
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
