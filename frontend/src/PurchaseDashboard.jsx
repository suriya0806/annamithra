import React, { useState, useEffect } from "react";
import {
  Truck,
  ShoppingCart,
  RotateCcw,
  PackageCheck,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowDownToLine,
  Search,
  RefreshCw,
  Printer,
  FileText,
  Calendar,
  Layers,
  Check,
  Download,
  DollarSign,
  Clock
} from "lucide-react";
import { api } from "./api";
import {
  VendorsManagement,
  PurchasesManagement,
  PurchaseReturnsManagement
} from "./KitchenManagement";

/**
 * PurchaseDashboard
 * 
 * Centralized Procurement Hub providing ONLY five core options:
 * 1. Vendors
 * 2. Purchase
 * 3. Purchase Return
 * 4. GRN
 * 5. Reports
 */
export default function PurchaseDashboard({ user, initialTab = "purchase", onNavigate }) {
  // Normalize tab key to one of "vendors" | "purchase" | "purchase_return" | "grn" | "reports"
  const normalizeTab = (tab) => {
    if (tab === "vendors" || tab === "vendor") return "vendors";
    if (tab === "purchases" || tab === "purchase" || tab === "po") return "purchase";
    if (tab === "purchase_return" || tab === "purchase_returns" || tab === "returns" || tab === "return") return "purchase_return";
    if (tab === "grn" || tab === "goods_receipt" || tab === "receipt") return "grn";
    if (tab === "reports" || tab === "report" || tab === "purchase_reports" || tab === "purchasereports") return "reports";
    return "purchase";
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user.branchId ? String(user.branchId) : "");
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
        if (!user.branchId && data?.length > 0 && !selectedBranch) {
          setSelectedBranch(String(data[0].id));
        }
      })
      .catch(() => {});
  }, [user.branchId]);

  // Auto-dismiss feedback toasts
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

  const activeBranchId = user.branchId ? String(user.branchId) : selectedBranch;
  const canManage = [
    "Super Admin",
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Inventory Manager"
  ].includes(user?.role);

  // The 5 core navigation options for Purchase
  const purchaseOptions = [
    {
      id: "vendors",
      title: "Vendors",
      icon: Truck,
      shortLabel: "Vendors"
    },
    {
      id: "purchase",
      title: "Purchase",
      icon: ShoppingCart,
      shortLabel: "Purchase"
    },
    {
      id: "purchase_return",
      title: "Purchase Return",
      icon: RotateCcw,
      shortLabel: "Purchase Return"
    },
    {
      id: "grn",
      title: "GRN",
      icon: PackageCheck,
      shortLabel: "GRN"
    },
    {
      id: "reports",
      title: "Reports",
      icon: FileSpreadsheet,
      shortLabel: "Reports"
    }
  ];

  return (
    <div className="purchase-dashboard-wrapper">
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

      {/* Purchase Top Navigation Bar */}
      <div className="purchase-segmented-tabs-bar">
        <div className="segmented-tabs-track" role="tablist" aria-label="Purchase Navigation">
          {purchaseOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeTab === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`segmented-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(opt.id);
                  onNavigate?.(
                    opt.id === "purchase"
                      ? "purchase"
                      : opt.id === "vendors"
                      ? "vendors"
                      : opt.id === "grn"
                      ? "grn"
                      : opt.id === "purchase_return"
                      ? "purchase_returns"
                      : "purchase_reports"
                  );
                }}
              >
                <Icon size={16} />
                <span>{opt.shortLabel}</span>
                {isActive && <span className="tab-active-dot" />}
              </button>
            );
          })}
        </div>

        {!user.branchId && branches.length > 1 && (
          <div className="production-branch-select-wrap">
            <Building2 size={15} className="branch-select-icon" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="production-branch-select"
              aria-label="Select Branch Scope"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Screen / Slide Content Section */}
      <div className="purchase-screen-wrapper">
        {activeTab === "vendors" && (
          <div className="purchase-screen-slide" key="screen-vendors">
            <VendorsManagement
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
            />
          </div>
        )}

        {activeTab === "purchase" && (
          <div className="purchase-screen-slide" key="screen-purchase">
            <PurchasesManagement
              user={user}
              branchId={activeBranchId}
              branches={branches}
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
            />
          </div>
        )}

        {activeTab === "purchase_return" && (
          <div className="purchase-screen-slide" key="screen-purchase-return">
            <PurchaseReturnsManagement
              user={user}
              branchId={activeBranchId}
              branches={branches}
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
              onNavigate={(target) => {
                if (target === "purchases" || target === "purchase") setActiveTab("purchase");
                else if (target === "vendors") setActiveTab("vendors");
                else if (target === "reports") setActiveTab("reports");
              }}
            />
          </div>
        )}

        {activeTab === "grn" && (
          <div className="purchase-screen-slide" key="screen-grn">
            <GRNManagement
              user={user}
              branchId={activeBranchId}
              branches={branches}
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
              onOpenPurchase={() => setActiveTab("purchase")}
            />
          </div>
        )}

        {activeTab === "reports" && (
          <div className="purchase-screen-slide" key="screen-reports">
            <PurchaseReportsManagement
              user={user}
              branchId={activeBranchId}
              branches={branches}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * GRNManagement
 * 
 * Goods Received Note (GRN) Management Component
 * Dedicated inwarding screen for receiving goods into central inventory,
 * inspecting batch/expiry details, and printing formal GRN vouchers.
 */
function GRNManagement({ user, branchId, branches, canManage, onError, onSuccess, onOpenPurchase }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "received"
  const [receivingId, setReceivingId] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getPurchases(branchId || undefined);
      setPurchases(data || []);
    } catch (e) {
      onError?.(e.message || "Failed to load purchase records for GRN.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchId]);

  async function handleReceiveGoods(id, purchaseNumber) {
    if (
      !window.confirm(
        `Confirm Goods Receipt (GRN) for ${purchaseNumber}?\n\nThis will execute a MySQL database transaction:\n1. Update PO status to Received\n2. Inward and increase central inventory stock\n3. Record Stock Movement audit records`
      )
    ) {
      return;
    }

    setReceivingId(id);
    try {
      const res = await api.receiveGoods(id);
      onSuccess?.(res.message || `Goods receipt confirmed for ${purchaseNumber}. Inventory stock updated.`);
      await load();
    } catch (e) {
      onError?.(e.message || "Failed to confirm goods receipt.");
    } finally {
      setReceivingId(null);
    }
  }

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const isReceived = p.status === "Received" || p.status === "Partially Returned" || p.status === "Returned";
    if (statusFilter === "pending" && isReceived) return false;
    if (statusFilter === "received" && !isReceived) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.purchaseNumber && p.purchaseNumber.toLowerCase().includes(q)) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
      (p.vendorName && p.vendorName.toLowerCase().includes(q)) ||
      (p.items && p.items.some((it) => it.itemName && it.itemName.toLowerCase().includes(q)))
    );
  });

  const totalReceipts = purchases.length;
  const pendingReceipts = purchases.filter((p) => p.status !== "Received" && p.status !== "Partially Returned" && p.status !== "Returned").length;
  const completedGRNs = purchases.filter((p) => p.status === "Received" || p.status === "Partially Returned").length;

  return (
    <div className="grn-module-wrapper">
      {/* GRN Summary Metrics */}
      <div className="grn-metrics-grid">
        <div className="grn-metric-card">
          <div className="metric-icon-wrap blue">
            <PackageCheck size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">TOTAL SHIPMENTS</span>
            <strong className="metric-value">{totalReceipts}</strong>
            <small className="metric-hint">All purchase orders</small>
          </div>
        </div>

        <div className="grn-metric-card">
          <div className="metric-icon-wrap amber">
            <ArrowDownToLine size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">AWAITING GRN</span>
            <strong className="metric-value" style={{ color: "var(--metric-orange-text)" }}>{pendingReceipts}</strong>
            <small className="metric-hint">Pending store inwarding</small>
          </div>
        </div>

        <div className="grn-metric-card">
          <div className="metric-icon-wrap green">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">GRN COMPLETED</span>
            <strong className="metric-value" style={{ color: "var(--metric-green-text)" }}>{completedGRNs}</strong>
            <small className="metric-hint">Stock received &amp; logged</small>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grn-filter-bar panel">
        <div className="search-field" style={{ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by GRN/PO #, Invoice #, Vendor or Item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: "none", outline: "none", background: "transparent" }}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="grn-filter-select">
          <option value="all">All Goods Receipts ({purchases.length})</option>
          <option value="pending">Awaiting Inward / GRN ({pendingReceipts})</option>
          <option value="received">GRN Completed ({completedGRNs})</option>
        </select>

        <button className="secondary-btn compact" onClick={load} title="Refresh records">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* GRN Records Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">GOODS RECEIVED NOTES</span>
            <h3>Inward Shipments &amp; GRN Log ({filteredPurchases.length})</h3>
          </div>
          {pendingReceipts > 0 && (
            <span className="status warning" style={{ fontSize: "12px", padding: "4px 10px" }}>
              {pendingReceipts} Shipments Awaiting Receipt
            </span>
          )}
        </div>

        {loading ? (
          <div className="empty-row">Loading Goods Receipt records...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="empty-row">
            No Goods Receipt records match your filter.
            {statusFilter === "pending" && " All shipments have been received!"}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>GRN / PO Reference</th>
                  <th>Vendor / Supplier</th>
                  <th>Branch</th>
                  <th>PO Date</th>
                  <th>Total Amount</th>
                  <th>Received Items &amp; Batch Details</th>
                  <th>Receipt Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => {
                  const isReceived = p.status === "Received" || p.status === "Partially Returned" || p.status === "Returned";

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong><code>{p.purchaseNumber}</code></strong>
                        {p.invoiceNumber && p.invoiceNumber !== p.purchaseNumber && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Inv: <strong>{p.invoiceNumber}</strong>
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{p.vendorName}</strong>
                      </td>
                      <td>{p.branchName || "Main Branch"}</td>
                      <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                      <td>
                        <strong>₹{Number(p.totalAmount).toFixed(2)}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {p.items?.map((it, idx) => (
                            <span key={idx} style={{ fontSize: "12px" }}>
                              • <strong>{it.itemName}</strong>: {it.quantity} {it.unit}
                              {it.batchNumber && (
                                <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                                  (Batch: {it.batchNumber})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status ${
                            isReceived ? "active" : "warning"
                          }`}
                          style={
                            isReceived
                              ? { background: "var(--status-active-bg)", color: "var(--status-active-text)", borderColor: "var(--status-active-border)" }
                              : { background: "var(--status-warning-bg)", color: "var(--status-warning-text)", borderColor: "var(--status-warning-border)" }
                          }
                        >
                          {isReceived ? "GRN Received" : "Awaiting GRN"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {!isReceived && canManage && (
                            <button
                              type="button"
                              className="primary-btn compact"
                              onClick={() => handleReceiveGoods(p.id, p.purchaseNumber)}
                              disabled={receivingId === p.id}
                              style={{ gap: "5px" }}
                            >
                              <ArrowDownToLine size={13} />
                              {receivingId === p.id ? "Inwarding..." : "Receive (GRN)"}
                            </button>
                          )}

                          {isReceived && (
                            <button
                              type="button"
                              className="secondary-btn compact"
                              onClick={() => {
                                setSelectedGRN(p);
                                setShowSlipModal(true);
                              }}
                              style={{ gap: "5px" }}
                              title="View & Print Goods Received Note Voucher"
                            >
                              <FileText size={13} /> View GRN Slip
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

      {/* Printable GRN Voucher Slip Modal */}
      {showSlipModal && selectedGRN && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "680px" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <PackageCheck size={20} style={{ color: "var(--brand-gold, #c99824)" }} />
                <h3 style={{ margin: 0 }}>Goods Received Note (GRN) Voucher</h3>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setShowSlipModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="grn-voucher-sheet" style={{ padding: "16px", background: "var(--bg-canvas)", borderRadius: "8px", border: "1px solid var(--border-default)" }}>
              {/* Slip Header */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid var(--brand-gold, #c99824)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "var(--forest-900, #072518)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ANNAMITHRA ENTERPRISE
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {selectedGRN.branchName || "Central Kitchen & Store"}
                  </div>
                  <strong style={{ fontSize: "13px", color: "var(--forest-900, #072518)", display: "block", marginTop: "4px" }}>
                    GOODS RECEIVED NOTE (GRN)
                  </strong>
                </div>
                <div style={{ textAlign: "right", fontSize: "12px" }}>
                  <div><strong>GRN / PO Ref:</strong> <code>{selectedGRN.purchaseNumber}</code></div>
                  {selectedGRN.invoiceNumber && <div><strong>Invoice Ref:</strong> {selectedGRN.invoiceNumber}</div>}
                  <div><strong>Date Received:</strong> {new Date(selectedGRN.purchaseDate).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Vendor Information */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "12px" }}>
                <div style={{ padding: "8px 12px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-default)" }}>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>SUPPLIER / VENDOR:</span>
                  <strong style={{ fontSize: "13px" }}>{selectedGRN.vendorName}</strong>
                </div>
                <div style={{ padding: "8px 12px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-default)" }}>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>INWARDING STATUS:</span>
                  <strong style={{ color: "var(--status-active-text)" }}>VERIFIED &amp; RECEIVED INTO STOCK</strong>
                </div>
              </div>

              {/* Received Items Table */}
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ background: "rgba(37, 99, 235, 0.08)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "8px", textAlign: "left" }}>#</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Item Description</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Received Qty</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGRN.items?.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-default)" }}>
                      <td style={{ padding: "8px" }}>{idx + 1}</td>
                      <td style={{ padding: "8px" }}>
                        <strong>{it.itemName}</strong>
                        {it.batchNumber && (
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                            Batch: {it.batchNumber} {it.expiryDate ? `| Exp: ${new Date(it.expiryDate).toLocaleDateString()}` : ""}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <strong>{it.quantity} {it.unit}</strong>
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>₹{Number(it.rate || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <strong>₹{(Number(it.quantity || 0) * Number(it.rate || 0)).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "rgba(0,0,0,0.02)", fontWeight: "bold" }}>
                    <td colSpan={4} style={{ padding: "8px", textAlign: "right" }}>Total Inwarded Value:</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--forest-900, #072518)" }}>
                      ₹{Number(selectedGRN.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature section */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #94a3b8", fontSize: "11px" }}>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid var(--border-default)", height: "32px", marginBottom: "4px" }}></div>
                  <span>Store Inward Officer Signature</span>
                </div>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid var(--border-default)", height: "32px", marginBottom: "4px" }}></div>
                  <span>Vendor Delivery Representative</span>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button className="secondary-btn" onClick={() => window.print()} style={{ gap: "6px" }}>
                <Printer size={15} /> Print GRN Slip
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

/**
 * PurchaseReportsManagement
 * 
 * Specialized procurement reporting module displaying:
 * 1. Purchase Report (Purchase Orders Log & Status)
 * 2. GRN Report (Goods Received Notes Inwarding Log)
 */
function PurchaseReportsManagement({ user, branchId, branches, onError, onSuccess }) {
  const isRestricted = ["Staff", "Waiter", "Chef"].map(r => r.toLowerCase()).includes((user?.role || "").trim().toLowerCase());
  if (isRestricted) {
    return (
      <div className="panel error-box" style={{ padding: "24px", fontSize: "15px" }}>
        <strong>Access Restricted:</strong> {user?.role || "Your"} accounts are not authorized to view procurement reports.
      </div>
    );
  }

  const [reportSubTab, setReportSubTab] = useState("purchases"); // "purchases" | "grn"
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  // GRN Voucher modal state
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.getKitchenReports(reportSubTab, branchId || undefined, fromDate, toDate);
      setReportData(res.data || []);
    } catch (e) {
      onError?.(e.message || "Failed to load report records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [reportSubTab, branchId, fromDate, toDate]);

  // Client-side filtering by status and search keyword
  const filteredData = React.useMemo(() => {
    return reportData.filter((row) => {
      if (statusFilter !== "all" && (row.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      const num = (row.purchaseNumber || row.grnNumber || row.poNumber || "").toLowerCase();
      const inv = (row.invoiceNumber || "").toLowerCase();
      const vendor = (row.vendorName || "").toLowerCase();
      const branch = (row.branchName || "").toLowerCase();
      const items = (row.itemsSummary || "").toLowerCase();
      const userTxt = (row.createdBy || row.receivedBy || "").toLowerCase();
      return num.includes(q) || inv.includes(q) || vendor.includes(q) || branch.includes(q) || items.includes(q) || userTxt.includes(q);
    });
  }, [reportData, statusFilter, search]);

  // Purchase Metrics
  const totalPurchaseOrders = filteredData.length;
  const totalPurchaseSpend = filteredData.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
  const fulfilledOrders = filteredData.filter(r => (r.status || "").toLowerCase() === "received").length;
  const pendingOrders = filteredData.filter(r => (r.status || "").toLowerCase() === "ordered" || (r.status || "").toLowerCase() === "draft").length;

  // GRN Metrics
  const totalGRNs = filteredData.length;
  const totalInwardValue = filteredData.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
  const totalItemsReceived = filteredData.reduce((acc, r) => acc + Number(r.itemsCount || 0), 0);
  const suppliersInwardedCount = new Set(filteredData.map(r => r.vendorName).filter(Boolean)).size;

  function exportCsv() {
    if (!filteredData || filteredData.length === 0) return;
    
    let csvRows = [];
    if (reportSubTab === "purchases") {
      csvRows.push(["Purchase ID", "Invoice Ref", "Supplier", "Branch", "Purchase Date", "Items", "Quantity", "Amount (INR)", "Status", "Created By", "Created At"].join(","));
      filteredData.forEach(r => {
        const qty = r.totalQuantity != null ? r.totalQuantity : (r.itemsCount || 0);
        csvRows.push([
          JSON.stringify(r.purchaseNumber || (r.id ? `PUR-${r.id}` : "")),
          JSON.stringify(r.invoiceNumber || ""),
          JSON.stringify(r.vendorName || ""),
          JSON.stringify(r.branchName || ""),
          JSON.stringify(r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : ""),
          JSON.stringify(r.itemsSummary || ""),
          qty,
          Number(r.totalAmount || 0).toFixed(2),
          JSON.stringify(r.status || ""),
          JSON.stringify(r.createdBy || ""),
          JSON.stringify(r.createdAt ? new Date(r.createdAt).toLocaleString() : "")
        ].join(","));
      });
    } else {
      csvRows.push(["GRN Number", "Purchase Reference", "Invoice Ref", "Supplier", "Branch", "Received Items", "Quantity", "Inward Value (INR)", "Received Date", "Received By", "Status"].join(","));
      filteredData.forEach(r => {
        const qty = r.totalQuantity != null ? r.totalQuantity : (r.itemsCount || 0);
        csvRows.push([
          JSON.stringify(r.grnNumber || (r.id ? `GRN-${r.id}` : "")),
          JSON.stringify(r.poNumber || r.purchaseNumber || ""),
          JSON.stringify(r.invoiceNumber || ""),
          JSON.stringify(r.vendorName || ""),
          JSON.stringify(r.branchName || ""),
          JSON.stringify(r.itemsSummary || ""),
          qty,
          Number(r.totalAmount || 0).toFixed(2),
          JSON.stringify(r.receivedDate ? new Date(r.receivedDate).toLocaleString() : ""),
          JSON.stringify(r.receivedBy || ""),
          JSON.stringify(r.status || "")
        ].join(","));
      });
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ANNAMITHRA_${reportSubTab === "purchases" ? "Purchase" : "GRN"}_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="grn-module-wrapper" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Purchase Reports Header Card & 2 Tabs */}
      <div className="panel" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="eyebrow" style={{ margin: 0 }}>PURCHASE MODULE</span>
              <span style={{ color: "var(--border-default)" }}>•</span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500" }}>Procurement &amp; Inwarding</span>
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
              Purchase Reports
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              Centralized purchase orders and verified Goods Received Notes (GRN) reports.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="secondary-btn compact" onClick={loadReport} title="Refresh report data">
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="secondary-btn compact" onClick={exportCsv} disabled={filteredData.length === 0} title="Export to CSV Spreadsheet">
              <Download size={15} /> Export CSV
            </button>
            <button className="secondary-btn compact" onClick={() => window.print()} disabled={filteredData.length === 0} title="Print report table">
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        {/* The 2 Tabs: [ Purchase Report ] [ GRN Report ] */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "16px", borderTop: "1px solid var(--border-default)", paddingTop: "14px" }}>
          <button
            type="button"
            className={reportSubTab === "purchases" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => { setReportSubTab("purchases"); setStatusFilter("all"); setSearch(""); }}
            style={{
              gap: "8px",
              fontWeight: reportSubTab === "purchases" ? "700" : "600",
              fontSize: "13px",
              padding: "9px 20px",
              borderRadius: "var(--radius-sm, 6px)"
            }}
          >
            <ShoppingCart size={16} />
            <span>Purchase Report</span>
          </button>
          <button
            type="button"
            className={reportSubTab === "grn" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => { setReportSubTab("grn"); setStatusFilter("all"); setSearch(""); }}
            style={{
              gap: "8px",
              fontWeight: reportSubTab === "grn" ? "700" : "600",
              fontSize: "13px",
              padding: "9px 20px",
              borderRadius: "var(--radius-sm, 6px)"
            }}
          >
            <PackageCheck size={16} />
            <span>GRN Report</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {reportSubTab === "purchases" ? (
        <div className="grn-metrics-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="grn-metric-card">
            <div className="metric-icon-wrap blue">
              <ShoppingCart size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">TOTAL PURCHASE ORDERS</span>
              <strong className="metric-value">{totalPurchaseOrders}</strong>
              <small className="metric-hint">Across selected date range</small>
            </div>
          </div>

          <div className="grn-metric-card">
            <div className="metric-icon-wrap amber">
              <DollarSign size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">TOTAL PURCHASE SPEND</span>
              <strong className="metric-value" style={{ color: "var(--metric-orange-text)" }}>₹{totalPurchaseSpend.toFixed(2)}</strong>
              <small className="metric-hint">Cumulative order value</small>
            </div>
          </div>

          <div className="grn-metric-card">
            <div className="metric-icon-wrap green">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">FULFILLED / RECEIVED</span>
              <strong className="metric-value" style={{ color: "var(--metric-green-text)" }}>{fulfilledOrders}</strong>
              <small className="metric-hint">Goods inwarded into stock</small>
            </div>
          </div>

          <div className="grn-metric-card">
            <div className="metric-icon-wrap" style={{ background: "var(--metric-blue-bg)", color: "var(--metric-blue-text)" }}>
              <Clock size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">PENDING / IN-TRANSIT</span>
              <strong className="metric-value" style={{ color: "var(--metric-blue-text)" }}>{pendingOrders}</strong>
              <small className="metric-hint">Awaiting store delivery</small>
            </div>
          </div>
        </div>
      ) : (
        <div className="grn-metrics-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="grn-metric-card">
            <div className="metric-icon-wrap blue">
              <PackageCheck size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">TOTAL GRN INWARDINGS</span>
              <strong className="metric-value">{totalGRNs}</strong>
              <small className="metric-hint">Verified goods receipts</small>
            </div>
          </div>

          <div className="grn-metric-card">
            <div className="metric-icon-wrap green">
              <DollarSign size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">INWARDED STOCK VALUE</span>
              <strong className="metric-value" style={{ color: "var(--metric-green-text)" }}>₹{totalInwardValue.toFixed(2)}</strong>
              <small className="metric-hint">Added to central inventory</small>
            </div>
          </div>

          <div className="grn-metric-card">
            <div className="metric-icon-wrap amber">
              <Layers size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">LINE ITEMS INWARDED</span>
              <strong className="metric-value" style={{ color: "var(--metric-orange-text)" }}>{totalItemsReceived}</strong>
              <small className="metric-hint">Distinct inventory items</small>
            </div>
          </div>

          <div className="grn-metric-card">
            <div className="metric-icon-wrap" style={{ background: "var(--metric-orange-bg)", color: "var(--metric-orange-text)" }}>
              <Truck size={20} />
            </div>
            <div className="metric-info">
              <span className="metric-label">SUPPLIERS INWARDED</span>
              <strong className="metric-value" style={{ color: "var(--metric-orange-text)" }}>{suppliersInwardedCount}</strong>
              <small className="metric-hint">Active vendors fulfilled</small>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Date Bar */}
      <div className="panel" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", padding: "12px 18px" }}>
        {/* Search */}
        <div className="search-field" style={{ flex: "1 1 240px", minWidth: "220px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder={reportSubTab === "purchases" ? "Search by Purchase ID, Supplier, Items, User..." : "Search by GRN #, Purchase Ref, Supplier, Items, User..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
          />
        </div>

        {/* Date Range: From Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "13px" }}
          />
        </div>

        {/* Date Range: To Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "13px" }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "13px" }}
          >
            <option value="all">All Statuses</option>
            {reportSubTab === "purchases" ? (
              <>
                <option value="Draft">Draft</option>
                <option value="Ordered">Ordered</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </>
            ) : (
              <>
                <option value="Received">Received</option>
                <option value="Partially Returned">Partially Returned</option>
                <option value="Returned">Returned</option>
              </>
            )}
          </select>
        </div>

        {(search || statusFilter !== "all") && (
          <button
            className="secondary-btn compact"
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
            style={{ fontSize: "12px" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Report Table Panel */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">{reportSubTab === "purchases" ? "PROCUREMENT LOG" : "INWARDING LOG"}</span>
            <h3>
              {reportSubTab === "purchases" ? "Purchase Report" : "GRN Report"} ({filteredData.length} records)
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-row">Running report query against MySQL...</div>
        ) : filteredData.length === 0 ? (
          <div className="empty-row">
            No records found for this report criteria. Try adjusting date filters or search terms.
          </div>
        ) : (
          <div className="table-wrap">
            {reportSubTab === "purchases" ? (
              <table>
                <thead>
                  <tr>
                    <th>Purchase ID</th>
                    <th>Supplier</th>
                    <th>Items</th>
                    <th style={{ textAlign: "right" }}>Quantity</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Purchase Date</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th>Branch</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row) => {
                    const isReceived = (row.status || "").toLowerCase() === "received";
                    const isOrdered = (row.status || "").toLowerCase() === "ordered";
                    const isDraft = (row.status || "").toLowerCase() === "draft";
                    const qty = row.totalQuantity != null
                      ? Number(row.totalQuantity).toFixed(row.totalQuantity % 1 === 0 ? 0 : 2)
                      : (row.itemsCount ? `${row.itemsCount} lines` : "—");

                    return (
                      <tr key={row.id}>
                        <td>
                          <strong><code>{row.purchaseNumber || `PUR-${row.id}`}</code></strong>
                          {row.invoiceNumber && row.invoiceNumber !== (row.purchaseNumber || `PUR-${row.id}`) && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                              Inv: {row.invoiceNumber}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{row.vendorName || "—"}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            {row.itemsSummary || (row.itemsCount ? `${row.itemsCount} items` : "—")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{qty}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong>₹{Number(row.totalAmount || 0).toFixed(2)}</strong>
                        </td>
                        <td>
                          <span style={{ whiteSpace: "nowrap" }}>
                            {row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString() : "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`status ${
                              isReceived ? "active" : isOrdered ? "info" : isDraft ? "draft" : "inactive"
                            }`}
                            style={
                              isReceived
                                ? { background: "var(--status-active-bg)", color: "var(--status-active-text)", borderColor: "var(--status-active-border)" }
                                : isOrdered
                                ? { background: "var(--metric-blue-bg)", color: "var(--metric-blue-text)", borderColor: "var(--metric-blue-border)" }
                                : {}
                            }
                          >
                            {row.status || "Draft"}
                          </span>
                        </td>
                        <td>{row.branchName || "Main Branch"}</td>
                        <td>
                          <span style={{ fontSize: "12px" }}>{row.createdBy || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>GRN Number</th>
                    <th>Purchase Reference</th>
                    <th>Supplier</th>
                    <th>Received Items</th>
                    <th style={{ textAlign: "right" }}>Quantity</th>
                    <th style={{ textAlign: "right" }}>Inward Value</th>
                    <th>Received Date</th>
                    <th>Received By</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th>Branch</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row) => {
                    const qty = row.totalQuantity != null
                      ? Number(row.totalQuantity).toFixed(row.totalQuantity % 1 === 0 ? 0 : 2)
                      : (row.itemsCount ? `${row.itemsCount} received` : "—");

                    return (
                      <tr key={row.id}>
                        <td>
                          <strong style={{ color: "var(--brand-gold, #c99824)" }}>
                            <code>{row.grnNumber || `GRN-${row.id}`}</code>
                          </strong>
                        </td>
                        <td>
                          <strong><code>{row.poNumber || row.purchaseNumber}</code></strong>
                          {row.invoiceNumber && row.invoiceNumber !== (row.poNumber || row.purchaseNumber) && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                              Inv: {row.invoiceNumber}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{row.vendorName || "—"}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            {row.itemsSummary || (row.itemsCount ? `${row.itemsCount} items inwarded` : "—")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{qty}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong style={{ color: "var(--status-active-text)" }}>₹{Number(row.totalAmount || 0).toFixed(2)}</strong>
                        </td>
                        <td>
                          <span style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                            {row.receivedDate ? new Date(row.receivedDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px" }}>{row.receivedBy || "Store Officer"}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className="status active"
                            style={{ background: "var(--status-active-bg)", color: "var(--status-active-text)", borderColor: "var(--status-active-border)" }}
                          >
                            {row.status || "Received"}
                          </span>
                        </td>
                        <td>{row.branchName || "Main Branch"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => {
                              setSelectedGRN(row);
                              setShowSlipModal(true);
                            }}
                            style={{ gap: "5px", fontSize: "12px" }}
                            title="View & Print Official Goods Received Note Voucher"
                          >
                            <FileText size={13} /> View GRN Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Printable GRN Voucher Slip Modal */}
      {showSlipModal && selectedGRN && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "680px" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <PackageCheck size={20} style={{ color: "var(--brand-gold, #c99824)" }} />
                <h3 style={{ margin: 0 }}>Goods Received Note (GRN) Voucher</h3>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setShowSlipModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="grn-voucher-sheet" style={{ padding: "16px", background: "var(--bg-canvas)", borderRadius: "8px", border: "1px solid var(--border-default)" }}>
              {/* Slip Header */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid var(--brand-gold, #c99824)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "var(--forest-900, #072518)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ANNAMITHRA ENTERPRISE
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {selectedGRN.branchName || "Central Kitchen & Store"}
                  </div>
                  <strong style={{ fontSize: "13px", color: "var(--forest-900, #072518)", display: "block", marginTop: "4px" }}>
                    GOODS RECEIVED NOTE (GRN)
                  </strong>
                </div>
                <div style={{ textAlign: "right", fontSize: "12px" }}>
                  <div><strong>GRN Number:</strong> <code style={{ color: "var(--brand-gold, #c99824)" }}>{selectedGRN.grnNumber || `GRN-${selectedGRN.id}`}</code></div>
                  <div><strong>PO Reference:</strong> <code>{selectedGRN.poNumber || selectedGRN.purchaseNumber}</code></div>
                  {selectedGRN.invoiceNumber && <div><strong>Invoice Ref:</strong> {selectedGRN.invoiceNumber}</div>}
                  <div><strong>Date Received:</strong> {selectedGRN.receivedDate ? new Date(selectedGRN.receivedDate).toLocaleString() : (selectedGRN.purchaseDate ? new Date(selectedGRN.purchaseDate).toLocaleDateString() : "—")}</div>
                </div>
              </div>

              {/* Vendor & Receiving Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "12px" }}>
                <div style={{ padding: "8px 12px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-default)" }}>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>SUPPLIER / VENDOR:</span>
                  <strong style={{ fontSize: "13px" }}>{selectedGRN.vendorName}</strong>
                </div>
                <div style={{ padding: "8px 12px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-default)" }}>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>INWARDING STATUS:</span>
                  <strong style={{ color: "var(--status-active-text)" }}>VERIFIED &amp; RECEIVED INTO CENTRAL STOCK</strong>
                </div>
              </div>

              {/* Received Items Table */}
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ background: "rgba(37, 99, 235, 0.08)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "8px", textAlign: "left" }}>#</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Item Description</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Received Qty</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGRN.items && selectedGRN.items.length > 0 ? (
                    selectedGRN.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-default)" }}>
                        <td style={{ padding: "8px" }}>{idx + 1}</td>
                        <td style={{ padding: "8px" }}>
                          <strong>{it.itemName}</strong>
                          {it.batchNumber && (
                            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                              Batch: {it.batchNumber} {it.expiryDate ? `| Exp: ${new Date(it.expiryDate).toLocaleDateString()}` : ""}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <strong>{it.quantity} {it.unit}</strong>
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>₹{Number(it.unitCost || it.rate || 0).toFixed(2)}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <strong>₹{(Number(it.totalCost || (Number(it.quantity || 0) * Number(it.unitCost || it.rate || 0)))).toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: "12px", textAlign: "center" }}>
                        {selectedGRN.itemsSummary || "All purchase order items verified and received."}
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: "rgba(0,0,0,0.02)", fontWeight: "bold" }}>
                    <td colSpan={4} style={{ padding: "8px", textAlign: "right" }}>Total Inwarded Value:</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--forest-900, #072518)" }}>
                      ₹{Number(selectedGRN.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature section */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #94a3b8", fontSize: "11px" }}>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid var(--border-default)", height: "32px", marginBottom: "4px" }}></div>
                  <span>Store Inward Officer ({selectedGRN.receivedBy || "Authorized Officer"})</span>
                </div>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid var(--border-default)", height: "32px", marginBottom: "4px" }}></div>
                  <span>Vendor Delivery Representative</span>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button className="secondary-btn" onClick={() => window.print()} style={{ gap: "6px" }}>
                <Printer size={15} /> Print GRN Slip
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

