import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight
} from "lucide-react";
import { api } from "./api";

// Preset date ranges helper
function computeDateRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const toIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dt}`;
  };

  switch (preset) {
    case "today": {
      const t = new Date(year, month, date);
      return { from: toIso(t), to: toIso(t) };
    }
    case "yesterday": {
      const y = new Date(year, month, date - 1);
      return { from: toIso(y), to: toIso(y) };
    }
    case "this_week": {
      const d = new Date(year, month, date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const monday = new Date(d.setDate(diff));
      return { from: toIso(monday), to: toIso(new Date(year, month, date)) };
    }
    case "this_month":
    default: {
      const start = new Date(year, month, 1);
      const today = new Date(year, month, date);
      return { from: toIso(start), to: toIso(today) };
    }
  }
}

// Category & Report Types Configuration
const REPORT_CATEGORIES = [
  {
    id: "sales",
    label: "Sales Reports",
    types: [
      { id: "daily_sales", label: "Daily Sales" },
      { id: "weekly_sales", label: "Weekly Sales" },
      { id: "monthly_sales", label: "Monthly Sales" },
      { id: "item_sales", label: "Item-wise Sales" },
      { id: "payment_methods", label: "Payment Method Breakdown" },
      { id: "sales_trend", label: "Sales Trend" },
      { id: "discounts_taxes", label: "Discounts and Taxes" },
      { id: "branch_sales", label: "Branch-wise Sales Comparison" }
    ]
  },
  {
    id: "orders",
    label: "Order Reports",
    types: [
      { id: "total_orders", label: "Total Orders" },
      { id: "completed_orders", label: "Completed Orders" },
      { id: "pending_orders", label: "Pending Orders" },
      { id: "cancelled_orders", label: "Cancelled Orders" },
      { id: "order_activity", label: "Order Activity" },
      { id: "order_type_breakdown", label: "Order Type Breakdown" }
    ]
  },
  {
    id: "inventory",
    label: "Inventory Reports",
    types: [
      { id: "current_stock", label: "Current Stock" },
      { id: "stock_ledger", label: "Stock Ledger" },
      { id: "stock_movement", label: "Stock Movement" },
      { id: "low_stock", label: "Low Stock" },
      { id: "out_of_stock", label: "Out of Stock" },
      { id: "stock_valuation", label: "Stock Valuation" }
    ]
  },
  {
    id: "purchase",
    label: "Purchase Reports",
    types: [
      { id: "purchase_orders", label: "Purchase Orders" },
      { id: "grn", label: "Goods Received Notes (GRN)" },
      { id: "supplier_purchases", label: "Supplier Purchases" },
      { id: "purchase_returns", label: "Purchase Returns" }
    ]
  },
  {
    id: "kitchen",
    label: "Kitchen & Production Reports",
    types: [
      { id: "production_plan_vs_actual", label: "Production Plan vs Actual" },
      { id: "ingredient_consumption", label: "Ingredient Consumption" },
      { id: "kitchen_activity", label: "Kitchen Activity" },
      { id: "preparation_status", label: "Preparation Status" }
    ]
  },
  {
    id: "wastage",
    label: "Wastage Reports",
    types: [
      { id: "wastage_quantity", label: "Wastage Quantity" },
      { id: "wastage_reasons", label: "Wastage Reasons" },
      { id: "wastage_cost", label: "Wastage Cost" }
    ]
  },
  {
    id: "finance",
    label: "Finance Reports",
    types: [
      { id: "expenses", label: "Expenses" },
      { id: "payments", label: "Payments" },
      { id: "cash_summary", label: "Cash Summary" },
      { id: "profit_summary", label: "Profit Summary" }
    ]
  },
  {
    id: "menu",
    label: "Menu & Food Cost Reports",
    types: [
      { id: "best_selling", label: "Best-Selling Items" },
      { id: "recipe_cost", label: "Recipe Cost" },
      { id: "food_cost_pct", label: "Food Cost Percentage" }
    ]
  },
  {
    id: "staff",
    label: "Staff & Operations Reports",
    types: [
      { id: "staff_activity", label: "Staff Activity" },
      { id: "operational_summary", label: "Operational Summary" }
    ]
  }
];

export default function ReportsAndAnalytics({
  user,
  initialBranchId = null,
  lockBranch = false,
  branchName = "",
  embedded = false
}) {
  // Authorization check
  const isRestricted = ["Staff", "Waiter", "Chef"]
    .map((r) => r.toLowerCase())
    .includes((user?.role || "").trim().toLowerCase());

  if (isRestricted) {
    return (
      <div className="panel error-box" style={{ padding: "24px", fontSize: "15px" }}>
        <strong>Access Restricted:</strong> {user?.role || "Your"} accounts are not authorized to view the reports section.
      </div>
    );
  }

  const userRole = (user?.role || "").trim();
  const availableCategories = useMemo(() => {
    if (userRole === "Kitchen Manager") {
      return REPORT_CATEGORIES.filter((c) => c.id === "kitchen" || c.id === "wastage");
    }
    if (userRole === "Inventory Manager") {
      return REPORT_CATEGORIES.filter((c) => c.id === "inventory" || c.id === "purchase" || c.id === "wastage");
    }
    return REPORT_CATEGORIES;
  }, [userRole]);

  // Branches list
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (initialBranchId) return String(initialBranchId);
    return user?.branchId ? String(user.branchId) : "";
  });

  useEffect(() => {
    if (initialBranchId) {
      setSelectedBranchId(String(initialBranchId));
    }
  }, [initialBranchId]);

  // Date Range state
  const [dateRangePreset, setDateRangePreset] = useState("this_month");
  const [customFrom, setCustomFrom] = useState(() => computeDateRange("this_month").from);
  const [customTo, setCustomTo] = useState(() => computeDateRange("this_month").to);

  // Category and Type state
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (userRole === "Kitchen Manager") return "kitchen";
    if (userRole === "Inventory Manager") return "inventory";
    return "sales";
  });
  const [selectedType, setSelectedType] = useState(() => {
    if (userRole === "Kitchen Manager") return "production_plan_vs_actual";
    if (userRole === "Inventory Manager") return "current_stock";
    return "daily_sales";
  });

  // Report Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState("");

  // Table Sorting & Pagination
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" | "desc"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchFilter, setSearchFilter] = useState("");

  // Load branches on mount
  useEffect(() => {
    let isMounted = true;
    api
      .getBranches()
      .then((b) => {
        if (isMounted && Array.isArray(b)) {
          setBranches(b);
          if (!selectedBranchId && b.length > 0) {
            const firstId = String(b[0].id);
            setSelectedBranchId(firstId);
            fetchReport(firstId);
          }
        }
      })
      .catch(() => {
        if (isMounted && user?.branchId) {
          setSelectedBranchId(String(user.branchId));
          fetchReport(String(user.branchId));
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Type options when Category changes
  useEffect(() => {
    const cat = availableCategories.find((c) => c.id === selectedCategory);
    if (cat && cat.types.length > 0) {
      if (!cat.types.some((t) => t.id === selectedType)) {
        setSelectedType(cat.types[0].id);
      }
    } else if (availableCategories.length > 0) {
      setSelectedCategory(availableCategories[0].id);
      setSelectedType(availableCategories[0].types[0].id);
    }
  }, [selectedCategory, availableCategories]);

  // Compute effective from & to dates
  const effectiveDates = useMemo(() => {
    if (dateRangePreset === "custom") {
      return { from: customFrom, to: customTo };
    }
    return computeDateRange(dateRangePreset);
  }, [dateRangePreset, customFrom, customTo]);

  // Load report data from API
  async function fetchReport(overrideBranchId = null) {
    setLoading(true);
    setError("");
    setExportNotice("");
    setCurrentPage(1);

    // Safeguard against React event object being passed when called from onClick={fetchReport}
    let activeBranchId = selectedBranchId;
    if (overrideBranchId !== null && typeof overrideBranchId !== "object" && typeof overrideBranchId !== "function") {
      const bStr = String(overrideBranchId).trim();
      activeBranchId = bStr === "" ? undefined : bStr;
    } else if (activeBranchId) {
      activeBranchId = String(activeBranchId).trim() || undefined;
    } else {
      activeBranchId = undefined;
    }

    try {
      const res = await api.getAnalyticsReport({
        category: selectedCategory,
        type: selectedType,
        branchId: activeBranchId,
        from: effectiveDates.from,
        to: effectiveDates.to
      });

      setReportData(res);
      // Auto-set default sort key if available
      if (res?.columns && res.columns.length > 0) {
        setSortKey(res.columns[0].key);
        setSortOrder("desc");
      }
    } catch (err) {
      setError(err.message || "Failed to load report data from server.");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }

  // Load report on first mount
  useEffect(() => {
    fetchReport();
  }, []);

  // Filtered & Sorted Records for table
  const processedRecords = useMemo(() => {
    if (!reportData?.records) return [];
    let list = [...reportData.records];

    // Search filter across text fields
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter((row) =>
        Object.values(row).some((val) => val != null && String(val).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA == null && valB == null) return 0;
        if (valA == null) return sortOrder === "asc" ? -1 : 1;
        if (valB == null) return sortOrder === "asc" ? 1 : -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortOrder === "asc" ? -1 : 1;
        if (strA > strB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [reportData?.records, searchFilter, sortKey, sortOrder]);

  // Pagination calculation
  const totalRecordsCount = processedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecordsCount / pageSize));
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return processedRecords.slice(startIdx, startIdx + pageSize);
  }, [processedRecords, currentPage, pageSize]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  // Export CSV handler (Exports ALL matching records, UTF-8 BOM, valid escaping)
  async function handleExportCSV() {
    if (!reportData || !reportData.records) {
      setExportNotice("No report data available to export.");
      return;
    }

    setExporting(true);
    setExportNotice("");

    try {
      const columns = reportData.columns || [];
      const records = reportData.records; // ALL matching records, not just visible page

      if (records.length === 0) {
        setExportNotice("The selected report has 0 records. Nothing to export.");
        setExporting(false);
        return;
      }

      const escapeField = (val) => {
        if (val == null) return '""';
        const str = String(val);
        if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      const lines = [];
      // Column Header
      lines.push(columns.map((c) => escapeField(c.label)).join(","));

      // Records
      for (const row of records) {
        const rowValues = columns.map((col) => escapeField(row[col.key]));
        lines.push(rowValues.join(","));
      }

      const csvContent = lines.join("\r\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      // Generate exact required file name: Category_Report_Branch_Dates.csv
      const cleanBranch = (reportData.branchName || "All_Branches").replace(/\s+/g, "_");
      const cleanCat = reportData.category ? reportData.category.charAt(0).toUpperCase() + reportData.category.slice(1) : "Report";
      const startStr = reportData.fromDate || effectiveDates.from;
      const endStr = reportData.toDate || effectiveDates.to;

      let filename = `${cleanCat}_Report_${cleanBranch}_${startStr}.csv`;
      if (startStr !== endStr) {
        filename = `${cleanCat}_Report_${cleanBranch}_${startStr}_to_${endStr}.csv`;
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${records.length} records successfully as ${filename}`);
      setTimeout(() => setExportNotice(""), 5000);
    } catch (e) {
      setExportNotice("Export failed: " + (e.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  }

  // Active category types
  const currentCategoryObj = REPORT_CATEGORIES.find((c) => c.id === selectedCategory) || REPORT_CATEGORIES[0];

  return (
    <div className="reports-analytics-container">
      {/* 1. Embedded Branch Reports Banner (if embedded in Branch Details) */}
      {embedded && (
        <div className="branch-reports-embedded-header" style={{ marginBottom: "16px", padding: "14px 18px", background: "linear-gradient(135deg, #072518 0%, #0a2e1f 100%)", border: "1px solid var(--border-gold, rgba(201, 152, 36, 0.35))", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#fef3c7", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--brand-gold, #c99824)", display: "inline-block", boxShadow: "0 0 8px rgba(201, 152, 36, 0.6)" }}></span>
              Branch Reports: {branchName || branches.find(b => String(b.id) === String(selectedBranchId))?.name || "Selected Branch"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary, #c9ded3)", marginTop: "3px" }}>
              All report categories and date ranges below are automatically filtered to this branch.
            </div>
          </div>
          <span style={{ padding: "5px 12px", background: "var(--metric-orange-bg)", border: "1px solid var(--metric-orange-border)", color: "var(--metric-orange-text)", borderRadius: "6px", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Branch Scoped
          </span>
        </div>
      )}

      {/* 2. Compact Filters and Actions Toolbar */}
      <div className="reports-filter-toolbar">
        {/* Organization (Read-only for authenticated user) */}
        <div className="filter-item">
          <label className="filter-label">Organization</label>
          <div className="filter-org-badge" title="Authenticated Organization">
            <Building2 size={15} className="filter-icon" />
            <span>{user?.organizationName || "ANNAMITHRA Hotel Group"}</span>
          </div>
        </div>

        {/* Branch Filter */}
        <div className="filter-item">
          <label className="filter-label" htmlFor="rep-branch-select">Branch</label>
          <select
            id="rep-branch-select"
            className="filter-select"
            value={selectedBranchId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBranchId(val);
              fetchReport(val);
            }}
            disabled={Boolean(user?.branchId || lockBranch || branches.length === 0)}
          >
            {!lockBranch && !user?.branchId && <option value="">All Branches</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            {branches.length === 0 && (
              <option value={user?.branchId || ""}>{user?.branchName || "Current Branch"}</option>
            )}
          </select>
        </div>

        {/* Date Range Preset */}
        <div className="filter-item">
          <label className="filter-label" htmlFor="rep-date-preset">Date Range</label>
          <select
            id="rep-date-preset"
            className="filter-select"
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Range Inputs (if Custom Range is active) */}
        {dateRangePreset === "custom" && (
          <div className="filter-item custom-date-inputs">
            <label className="filter-label">From & To</label>
            <div className="custom-date-group">
              <input
                type="date"
                className="filter-input-date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label="From date"
              />
              <span className="date-sep">to</span>
              <input
                type="date"
                className="filter-input-date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label="To date"
              />
            </div>
          </div>
        )}

        {/* Report Category */}
        <div className="filter-item">
          <label className="filter-label" htmlFor="rep-category-select">Report Category</label>
          <select
            id="rep-category-select"
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Report Type */}
        <div className="filter-item">
          <label className="filter-label" htmlFor="rep-type-select">Report Type</label>
          <select
            id="rep-type-select"
            className="filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {currentCategoryObj.types.map((typ) => (
              <option key={typ.id} value={typ.id}>
                {typ.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons: [ View Report ] [ Export CSV ] */}
        <div className="filter-actions-group">
          <button
            type="button"
            className="rep-btn-primary"
            onClick={() => fetchReport()}
            disabled={loading}
            id="btn-view-report"
          >
            {loading ? <RefreshCw size={15} className="spin" /> : <Search size={15} />}
            <span>View Report</span>
          </button>

          <button
            type="button"
            className="rep-btn-secondary"
            onClick={handleExportCSV}
            disabled={exporting || loading || !reportData || reportData.records?.length === 0}
            id="btn-export-csv"
            title="Download full dataset in CSV format (UTF-8 BOM for Excel)"
          >
            {exporting ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Export & Error Status Messages */}
      {exportNotice && (
        <div className="rep-alert success">
          <CheckCircle2 size={16} />
          <span>{exportNotice}</span>
        </div>
      )}
      {error && (
        <div className="rep-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. REPORT RESULTS TABLE (Directly below filters) */}
      <div className="reports-table-section">
        {/* Table Title and Metadata Bar */}
        <div className="reports-table-meta-bar">
          <div className="meta-left">
            <h2 className="report-results-title">
              {reportData?.title || `${currentCategoryObj.label} — ${currentCategoryObj.types.find((t) => t.id === selectedType)?.label || "Report"}`}
            </h2>
            <div className="report-sub-meta">
              <span className="meta-tag">
                <strong>Branch:</strong> {reportData?.branchName || (selectedBranchId ? branches.find((b) => String(b.id) === String(selectedBranchId))?.name || "Selected Branch" : "All Branches")}
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-tag">
                <strong>Period:</strong> {reportData?.period || `${effectiveDates.from} – ${effectiveDates.to}`}
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-tag">
                <strong>Records:</strong> {processedRecords.length}
                {searchFilter && ` (filtered from ${reportData?.records?.length || 0})`}
              </span>
            </div>
          </div>

          <div className="meta-right">
            {/* Quick table search */}
            <div className="table-search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search table..."
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="table-search-input"
              />
            </div>

            {/* Page size selector */}
            <div className="page-size-picker">
              <span className="page-size-label">Rows:</span>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Container */}
        {loading ? (
          <div className="report-loading-placeholder">
            <RefreshCw size={28} className="spin loading-icon" />
            <p>Loading report records...</p>
          </div>
        ) : reportData && reportData.columns && reportData.columns.length > 0 ? (
          <>
            <div className="report-table-scroll-wrap">
              <table className="report-results-table">
                <thead>
                  <tr>
                    {reportData.columns.map((col) => {
                      const isSorted = sortKey === col.key;
                      return (
                        <th
                          key={col.key}
                          className={`col-head align-${col.align || "left"} ${isSorted ? "sorted" : ""}`}
                          onClick={() => handleSort(col.key)}
                          title={`Click to sort by ${col.label}`}
                        >
                          <div className="th-content">
                            <span>{col.label}</span>
                            <ArrowUpDown size={12} className={`sort-icon ${isSorted ? "active" : ""}`} />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.columns.length} className="empty-table-cell">
                        <div className="empty-state-wrap">
                          <HelpCircle size={32} className="empty-icon" />
                          <p className="empty-title">No records found</p>
                          <p className="empty-desc">
                            {searchFilter
                              ? "No rows match your search filter."
                              : "No data recorded for the selected branch and date range."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((row, rowIdx) => (
                      <tr key={row.id != null ? row.id : rowIdx} className="report-data-row">
                        {reportData.columns.map((col) => {
                          const val = row[col.key];
                          return (
                            <td key={col.key} className={`col-cell align-${col.align || "left"}`}>
                              {renderTableCell(val, col.type)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalRecordsCount > 0 && (
              <div className="table-pagination-toolbar">
                <div className="pagination-info">
                  Showing {Math.min(totalRecordsCount, (currentPage - 1) * pageSize + 1)}–
                  {Math.min(totalRecordsCount, currentPage * pageSize)} of {totalRecordsCount} records
                </div>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="pager-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                  <span className="pager-page-indicator">
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    className="pager-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    title="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="report-loading-placeholder">
            <HelpCircle size={32} className="empty-icon" />
            <p>Select criteria above and click <strong>View Report</strong> to generate results.</p>
          </div>
        )}
      </div>

      {/* 4. GRAPHS AND BAR CHARTS (AT THE BOTTOM ONLY) */}
      {reportData?.charts && reportData.charts.length > 0 && (
        <div className="reports-analytics-charts-section">
          <div className="charts-section-header">
            <div className="charts-title-wrap">
              <span className="charts-eyebrow">VISUAL ANALYTICS</span>
              <h3 className="charts-section-title">Graphs & Analytics</h3>
              <p className="charts-subtitle">Interactive data visualizations for the selected report criteria.</p>
            </div>
          </div>

          <div className="charts-grid-container">
            {reportData.charts.map((chart) => (
              <div key={chart.id} className="chart-render-card">
                <div className="chart-card-header">
                  <div>
                    <h4 className="chart-title">{chart.title}</h4>
                    {chart.subtitle && <p className="chart-desc">{chart.subtitle}</p>}
                  </div>
                  <BarChart3 size={18} className="chart-icon" />
                </div>

                <div className="chart-visual-body">
                  {renderInteractiveChart(chart)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Cell value renderer based on column type
function renderTableCell(value, type) {
  if (value == null || value === "") return <span className="cell-muted">—</span>;

  switch (type) {
    case "currency": {
      const num = Number(value);
      if (isNaN(num)) return value;
      return <span className="cell-currency">₹{num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    }
    case "number": {
      const num = Number(value);
      if (isNaN(num)) return value;
      return <span className="cell-number">{Number.isInteger(num) ? num.toLocaleString("en-IN") : num.toFixed(3)}</span>;
    }
    case "badge": {
      const str = String(value);
      const strLower = str.toLowerCase();
      let badgeClass = "badge-neutral";

      if (
        strLower.includes("served") ||
        strLower.includes("paid") ||
        strLower.includes("completed") ||
        strLower.includes("in stock") ||
        strLower.includes("optimal") ||
        strLower.includes("active") ||
        strLower.includes("received")
      ) {
        badgeClass = "badge-success";
      } else if (
        strLower.includes("pending") ||
        strLower.includes("low stock") ||
        strLower.includes("moderate") ||
        strLower.includes("preparing") ||
        strLower.includes("open") ||
        strLower.includes("partial")
      ) {
        badgeClass = "badge-warning";
      } else if (
        strLower.includes("cancelled") ||
        strLower.includes("out of stock") ||
        strLower.includes("high cost") ||
        strLower.includes("voided") ||
        strLower.includes("returned")
      ) {
        badgeClass = "badge-danger";
      }

      return <span className={`report-status-badge ${badgeClass}`}>{str}</span>;
    }
    case "date": {
      return <span className="cell-date">{String(value)}</span>;
    }
    default:
      return <span>{String(value)}</span>;
  }
}

// Chart visualizer supporting bar, line, donut, and horizontal_bar
function renderInteractiveChart(chart) {
  const data = chart.Data || chart.data || [];
  if (!data || data.length === 0) {
    return <div className="chart-empty-state">No graphical data recorded for this period.</div>;
  }

  const maxValue = Math.max(...data.map((d) => Number(d.Value || d.value || 0)), 1);

  if (chart.ChartType === "horizontal_bar" || chart.chartType === "horizontal_bar") {
    return (
      <div className="horizontal-bar-chart-container">
        {data.map((item, idx) => {
          const val = Number(item.Value || item.value || 0);
          const pct = Math.min(100, Math.max(4, Math.round((val / maxValue) * 100)));
          const label = item.Label || item.label || `Item ${idx + 1}`;
          const tip = item.Tooltip || item.tooltip;

          return (
            <div key={label + idx} className="h-bar-row">
              <div className="h-bar-label" title={label}>
                {label}
              </div>
              <div className="h-bar-track">
                <div
                  className="h-bar-fill"
                  style={{ width: `${pct}%` }}
                  title={tip ? `${label}: ₹${val.toLocaleString()} (${tip})` : `${label}: ₹${val.toLocaleString()}`}
                />
              </div>
              <div className="h-bar-value">₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chart.ChartType === "donut" || chart.chartType === "donut") {
    const total = data.reduce((sum, d) => sum + Number(d.Value || d.value || 0), 0);
    const colors = ["#072518", "#c99824", "#247b56", "#144d35", "#b08218", "#33996d", "#7a705c"];

    return (
      <div className="donut-chart-container">
        <div className="donut-bars-list">
          {data.map((item, idx) => {
            const val = Number(item.Value || item.value || 0);
            const share = total > 0 ? Math.round((val / total) * 100) : 0;
            const label = item.Label || item.label || `Item ${idx + 1}`;
            const color = colors[idx % colors.length];

            return (
              <div key={label + idx} className="donut-item-row">
                <div className="donut-item-color-pill" style={{ background: color }} />
                <span className="donut-item-name">{label}</span>
                <div className="donut-item-track">
                  <div className="donut-item-fill" style={{ width: `${share}%`, background: color }} />
                </div>
                <span className="donut-item-share">{share}%</span>
                <span className="donut-item-val">₹{val.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Vertical Bar Chart
  return (
    <div className="vertical-bar-chart-container">
      <div className="v-bars-wrapper">
        {data.map((item, idx) => {
          const val = Number(item.Value || item.value || 0);
          const heightPct = Math.min(100, Math.max(6, Math.round((val / maxValue) * 100)));
          const label = item.Label || item.label || `Bar ${idx + 1}`;
          const tip = item.Tooltip || item.tooltip;

          return (
            <div key={label + idx} className="v-bar-col" title={tip ? `${label}: ₹${val.toLocaleString()} (${tip})` : `${label}: ₹${val.toLocaleString()}`}>
              <div className="v-bar-tooltip">₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toLocaleString()}</div>
              <div className="v-bar-track">
                <div className="v-bar-fill" style={{ height: `${heightPct}%` }} />
              </div>
              <div className="v-bar-label">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
