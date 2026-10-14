import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  ArrowDownToLine,
  RotateCcw,
  Clock,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Printer,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Building2,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { api } from "./api";

/**
 * KitchenReportsView
 *
 * Dedicated Kitchen Stock Report Section.
 * Strictly focused on displaying:
 * 1. Live Kitchen Stocks with last updated time
 * 2. Stocks Received into Kitchen (Material Inward from Central Store) with exact date & time
 * 3. Stocks Returned from Kitchen (Unused / Excess Return to Store) with exact date & time
 * 4. Combined Chronological Stock Movement Timeline
 */
export default function KitchenReportsView({
  user,
  branchId,
  branches = [],
  onError,
  onSuccess,
  defaultTab = "kitchen_stock"
}) {
  const isRestricted = ["Staff", "Waiter"]
    .map((r) => r.toLowerCase())
    .includes((user?.role || "").trim().toLowerCase());

  if (isRestricted) {
    return (
      <div className="panel error-box" style={{ padding: "24px", fontSize: "15px" }}>
        <strong>Access Restricted:</strong> {user?.role || "Your"} account is not authorized to view reports.
      </div>
    );
  }

  // Active Report Tab: "kitchen_stock" | "stocks_received" | "stocks_returned" | "timeline"
  const [reportTab, setReportTab] = useState(defaultTab || "kitchen_stock");

  // Raw data from APIs
  const [kitchenStocks, setKitchenStocks] = useState([]);
  const [materialIssues, setMaterialIssues] = useState([]);
  const [materialReturns, setMaterialReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Load all kitchen stock and movement records
  async function loadData() {
    setLoading(true);
    try {
      const [stocksRes, issuesRes, returnsRes] = await Promise.all([
        api.getKitchenStock(branchId || undefined).catch(() => []),
        api.getMaterialIssues(branchId || undefined).catch(() => []),
        api.getMaterialReturns(branchId || undefined).catch(() => [])
      ]);

      setKitchenStocks(Array.isArray(stocksRes) ? stocksRes : stocksRes?.data || []);
      setMaterialIssues(Array.isArray(issuesRes) ? issuesRes : issuesRes?.data || []);
      setMaterialReturns(Array.isArray(returnsRes) ? returnsRes : returnsRes?.data || []);
    } catch (e) {
      if (onError) onError(e.message || "Failed to load kitchen reports data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [branchId]);

  // Format Date and Time helpers
  function formatDateTime(val) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return String(val);
    }
  }

  function formatDateOnly(val) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return String(val);
    }
  }

  // Date range checker
  function isInDateRange(dateTimeStr) {
    if (!dateTimeStr) return true;
    const t = new Date(dateTimeStr).getTime();
    if (isNaN(t)) return true;
    const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;
    return t >= start && t <= end;
  }

  // 1. Flatten all Stocks Received (Material Issues line items)
  const allReceivedItems = useMemo(() => {
    const list = [];
    materialIssues.forEach((issue) => {
      const dt = issue.date || issue.createdAt;
      const issueNum = issue.issueNumber || `ISS-${issue.id}`;
      const dept = issue.department || "Kitchen";
      const userTxt = issue.receivedBy || issue.issuedBy || issue.processedBy || "Store Officer";

      if (Array.isArray(issue.items)) {
        issue.items.forEach((item) => {
          list.push({
            id: `issue-item-${item.id || Math.random()}`,
            issueId: issue.id,
            type: "RECEIVED",
            dateTime: dt,
            issueNumber: issueNum,
            reference: issue.reference || issueNum,
            department: dept,
            inventoryItemId: item.inventoryItemId,
            itemName: item.itemName || "Item",
            quantity: Number(item.quantity || 0),
            unit: item.unit || "KG",
            stockBefore: item.stockBefore,
            stockAfter: item.stockAfter,
            kitchenStockBefore: item.kitchenStockBefore,
            kitchenStockAfter: item.kitchenStockAfter,
            handledBy: userTxt,
            status: issue.status || "Completed",
            remarks: issue.remarks || ""
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [materialIssues]);

  // 2. Flatten all Stocks Returned (Material Returns line items)
  const allReturnedItems = useMemo(() => {
    const list = [];
    materialReturns.forEach((ret) => {
      const dt = ret.date || ret.createdAt;
      const returnNum = ret.returnNumber || `RET-${ret.id}`;
      const dept = ret.department || "Kitchen";
      const userTxt = ret.returnedBy || ret.processedBy || ret.receivedBy || "Chef / Kitchen";
      const reason = ret.reason || ret.remarks || "Unused return";

      if (Array.isArray(ret.items)) {
        ret.items.forEach((item) => {
          list.push({
            id: `return-item-${item.id || Math.random()}`,
            returnId: ret.id,
            type: "RETURNED",
            dateTime: dt,
            returnNumber: returnNum,
            reference: ret.reference || ret.materialIssueNumber || returnNum,
            linkedIssueNumber: ret.materialIssueNumber || "",
            department: dept,
            inventoryItemId: item.inventoryItemId,
            itemName: item.itemName || "Item",
            quantity: Number(item.quantity ?? item.returnedQuantity ?? 0),
            unit: item.unit || "KG",
            stockBefore: item.stockBefore,
            stockAfter: item.stockAfter,
            kitchenStockBefore: item.kitchenStockBefore,
            kitchenStockAfter: item.kitchenStockAfter,
            handledBy: userTxt,
            reason: reason,
            status: ret.status || "Confirmed",
            remarks: item.notes || ret.remarks || ""
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [materialReturns]);

  // 3. Combined Chronological Timeline (Received & Returned)
  const timelineMovements = useMemo(() => {
    const combined = [
      ...allReceivedItems.map((r) => ({
        ...r,
        movementType: "RECEIVED",
        badgeColor: "#15803d",
        badgeBg: "#dcfce7",
        docNumber: r.issueNumber
      })),
      ...allReturnedItems.map((r) => ({
        ...r,
        movementType: "RETURNED",
        badgeColor: "#b45309",
        badgeBg: "#fef3c7",
        docNumber: r.returnNumber
      }))
    ];
    return combined.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [allReceivedItems, allReturnedItems]);

  // Filtered Received Items
  const filteredReceived = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allReceivedItems.filter((item) => {
      if (!isInDateRange(item.dateTime)) return false;
      if (!q) return true;
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.issueNumber.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.handledBy.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q)
      );
    });
  }, [allReceivedItems, fromDate, toDate, search]);

  // Filtered Returned Items
  const filteredReturned = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allReturnedItems.filter((item) => {
      if (!isInDateRange(item.dateTime)) return false;
      if (!q) return true;
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.returnNumber.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.handledBy.toLowerCase().includes(q)
      );
    });
  }, [allReturnedItems, fromDate, toDate, search]);

  // Filtered Timeline
  const filteredTimeline = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timelineMovements.filter((mov) => {
      if (!isInDateRange(mov.dateTime)) return false;
      if (!q) return true;
      return (
        mov.itemName.toLowerCase().includes(q) ||
        mov.docNumber.toLowerCase().includes(q) ||
        mov.reference.toLowerCase().includes(q) ||
        mov.handledBy.toLowerCase().includes(q) ||
        (mov.reason || "").toLowerCase().includes(q)
      );
    });
  }, [timelineMovements, fromDate, toDate, search]);

  // 4. Summarized Kitchen Stocks Table (Balance with Received & Returned totals)
  const summarizedStocks = useMemo(() => {
    const receivedByItem = {};
    allReceivedItems.forEach((r) => {
      if (isInDateRange(r.dateTime)) {
        const id = r.inventoryItemId || r.itemName.toLowerCase();
        receivedByItem[id] = (receivedByItem[id] || 0) + Number(r.quantity || 0);
      }
    });

    const returnedByItem = {};
    allReturnedItems.forEach((r) => {
      if (isInDateRange(r.dateTime)) {
        const id = r.inventoryItemId || r.itemName.toLowerCase();
        returnedByItem[id] = (returnedByItem[id] || 0) + Number(r.quantity || 0);
      }
    });

    return kitchenStocks.map((stock) => {
      const id = stock.inventoryItemId || stock.itemName?.toLowerCase();
      const rec = receivedByItem[id] || 0;
      const ret = returnedByItem[id] || 0;
      const cur = Number(stock.currentStock || 0);
      const reorder = Number(stock.reorderLevel || 0);

      let status = "In Stock";
      if (cur <= 0) status = "Out of Stock";
      else if (cur <= reorder) status = "Low Stock";

      return {
        ...stock,
        periodReceived: rec,
        periodReturned: ret,
        status
      };
    });
  }, [kitchenStocks, allReceivedItems, allReturnedItems, fromDate, toDate]);

  // Extract Categories
  const categoriesList = useMemo(() => {
    return Array.from(new Set(kitchenStocks.map((s) => s.category).filter(Boolean)));
  }, [kitchenStocks]);

  // Filtered Stocks
  const filteredStocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summarizedStocks.filter((s) => {
      if (categoryFilter && (s.category || "") !== categoryFilter) return false;
      if (stockStatusFilter === "out" && s.currentStock > 0) return false;
      if (stockStatusFilter === "low" && (s.currentStock <= 0 || s.currentStock > s.reorderLevel)) return false;
      if (stockStatusFilter === "sufficient" && s.currentStock <= s.reorderLevel) return false;

      if (!q) return true;
      const name = (s.itemName || s.ingredientName || "").toLowerCase();
      const code = (s.itemCode || "").toLowerCase();
      const cat = (s.category || "").toLowerCase();
      return name.includes(q) || code.includes(q) || cat.includes(q);
    });
  }, [summarizedStocks, categoryFilter, stockStatusFilter, search]);

  // Metric aggregates
  const totalStockItems = kitchenStocks.length;
  const totalStockUnits = useMemo(() => {
    return kitchenStocks.reduce((sum, s) => sum + Number(s.currentStock || 0), 0);
  }, [kitchenStocks]);

  const totalReceivedQuantity = useMemo(() => {
    return filteredReceived.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [filteredReceived]);

  const totalReturnedQuantity = useMemo(() => {
    return filteredReturned.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [filteredReturned]);

  // Export to CSV
  function handleExportCSV() {
    let csvRows = [];
    let filename = "";

    if (reportTab === "kitchen_stock") {
      csvRows.push([
        "Item Code",
        "Item Name",
        "Category",
        "Current Kitchen Stock",
        "Period Received",
        "Period Returned",
        "Unit",
        "Central Stock",
        "Reorder Level",
        "Stock Status",
        "Last Updated Time"
      ].join(","));

      filteredStocks.forEach((s) => {
        csvRows.push([
          JSON.stringify(s.itemCode || ""),
          JSON.stringify(s.itemName || s.ingredientName || ""),
          JSON.stringify(s.category || ""),
          Number(s.currentStock || 0),
          Number(s.periodReceived || 0),
          Number(s.periodReturned || 0),
          JSON.stringify(s.unit || "KG"),
          Number(s.centralStock || 0),
          Number(s.reorderLevel || 0),
          JSON.stringify(s.status),
          JSON.stringify(formatDateTime(s.updatedAt))
        ].join(","));
      });
      filename = `ANNAMITHRA_Kitchen_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (reportTab === "stocks_received") {
      csvRows.push([
        "Date & Time",
        "Issue Voucher #",
        "Item Name",
        "Quantity Received",
        "Unit",
        "Department",
        "Store Stock Before",
        "Store Stock After",
        "Received / Issued By",
        "Status",
        "Remarks"
      ].join(","));

      filteredReceived.forEach((r) => {
        csvRows.push([
          JSON.stringify(formatDateTime(r.dateTime)),
          JSON.stringify(r.issueNumber),
          JSON.stringify(r.itemName),
          Number(r.quantity || 0),
          JSON.stringify(r.unit),
          JSON.stringify(r.department),
          Number(r.stockBefore ?? 0),
          Number(r.stockAfter ?? 0),
          JSON.stringify(r.handledBy),
          JSON.stringify(r.status),
          JSON.stringify(r.remarks || "")
        ].join(","));
      });
      filename = `ANNAMITHRA_Kitchen_Stocks_Received_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (reportTab === "stocks_returned") {
      csvRows.push([
        "Date & Time",
        "Return Slip #",
        "Item Name",
        "Quantity Returned",
        "Unit",
        "Return Reason",
        "Linked Issue #",
        "Returned By",
        "Status",
        "Remarks"
      ].join(","));

      filteredReturned.forEach((r) => {
        csvRows.push([
          JSON.stringify(formatDateTime(r.dateTime)),
          JSON.stringify(r.returnNumber),
          JSON.stringify(r.itemName),
          Number(r.quantity || 0),
          JSON.stringify(r.unit),
          JSON.stringify(r.reason),
          JSON.stringify(r.linkedIssueNumber || ""),
          JSON.stringify(r.handledBy),
          JSON.stringify(r.status),
          JSON.stringify(r.remarks || "")
        ].join(","));
      });
      filename = `ANNAMITHRA_Kitchen_Stocks_Returned_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      // Timeline
      csvRows.push([
        "Date & Time",
        "Movement Type",
        "Document #",
        "Item Name",
        "Quantity",
        "Unit",
        "Department",
        "Handled By",
        "Reason / Remarks"
      ].join(","));

      filteredTimeline.forEach((m) => {
        csvRows.push([
          JSON.stringify(formatDateTime(m.dateTime)),
          JSON.stringify(m.movementType),
          JSON.stringify(m.docNumber),
          JSON.stringify(m.itemName),
          Number(m.quantity || 0),
          JSON.stringify(m.unit),
          JSON.stringify(m.department),
          JSON.stringify(m.handledBy),
          JSON.stringify(m.reason || m.remarks || "")
        ].join(","));
      });
      filename = `ANNAMITHRA_Kitchen_Stock_Timeline_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="kitchen-reports-container" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Intro Header */}
      <div className="page-intro" style={{ margin: 0, padding: 0 }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--brand-gold, #f59e0b)", fontWeight: "700" }}>
            KITCHEN OPERATIONS & STOCK AUDIT
          </span>
          <h2 style={{ margin: "4px 0", fontSize: "24px", fontWeight: "800" }}>Kitchen Stock & Movement Report</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
            Real-time kitchen inventory stock balances, stocks received from central inventory, and stocks returned with exact timestamps.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="secondary-btn compact" onClick={loadData} title="Refresh data">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="secondary-btn compact" onClick={handleExportCSV} title="Export current view to CSV">
            <Download size={15} /> Export CSV
          </button>
          <button className="secondary-btn compact" onClick={() => window.print()} title="Print report">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px"
        }}
      >
        {/* Card 1: Live Kitchen Stock */}
        <div
          className="stat-card"
          style={{
            background: "var(--bg-surface)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(33, 120, 68, 0.12)",
              color: "#217844",
              display: "grid",
              placeItems: "center"
            }}
          >
            <Package size={22} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Current Kitchen Stock
            </span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1.2" }}>
              {totalStockUnits.toFixed(2)}
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              {totalStockItems} active item{totalStockItems !== 1 ? "s" : ""} on hand
            </small>
          </div>
        </div>

        {/* Card 2: Stocks Received */}
        <div
          className="stat-card"
          style={{
            background: "var(--bg-surface)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(21, 128, 61, 0.12)",
              color: "#15803d",
              display: "grid",
              placeItems: "center"
            }}
          >
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Stocks Received (Inward)
            </span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#15803d", lineHeight: "1.2" }}>
              +{totalReceivedQuantity.toFixed(2)}
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              {filteredReceived.length} received line{filteredReceived.length !== 1 ? "s" : ""} in period
            </small>
          </div>
        </div>

        {/* Card 3: Stocks Returned */}
        <div
          className="stat-card"
          style={{
            background: "var(--bg-surface)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(217, 119, 6, 0.12)",
              color: "#d97706",
              display: "grid",
              placeItems: "center"
            }}
          >
            <ArrowUpRight size={22} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Stocks Returned (Outward)
            </span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#d97706", lineHeight: "1.2" }}>
              -{totalReturnedQuantity.toFixed(2)}
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              {filteredReturned.length} return slip line{filteredReturned.length !== 1 ? "s" : ""} in period
            </small>
          </div>
        </div>

        {/* Card 4: Movements Logged */}
        <div
          className="stat-card"
          style={{
            background: "var(--bg-surface)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(2, 132, 199, 0.12)",
              color: "#0284c7",
              display: "grid",
              placeItems: "center"
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Stock Movements Logged
            </span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1.2" }}>
              {filteredTimeline.length}
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              From {formatDateOnly(fromDate)} to {formatDateOnly(toDate)}
            </small>
          </div>
        </div>
      </div>

      {/* Report Section Sub-Tabs (Strictly Kitchen Stock, Received, Returned, and Timeline) */}
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "12px 18px",
          marginBottom: 0
        }}
      >
        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={reportTab === "kitchen_stock" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => {
              setReportTab("kitchen_stock");
              setSearch("");
            }}
            style={{
              gap: "7px",
              fontWeight: reportTab === "kitchen_stock" ? "700" : "600",
              fontSize: "13px",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            <Package size={15} />
            <span>Kitchen Stock Balance ({summarizedStocks.length})</span>
          </button>

          <button
            type="button"
            className={reportTab === "stocks_received" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => {
              setReportTab("stocks_received");
              setSearch("");
            }}
            style={{
              gap: "7px",
              fontWeight: reportTab === "stocks_received" ? "700" : "600",
              fontSize: "13px",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            <ArrowDownToLine size={15} />
            <span>Stocks Received ({allReceivedItems.length})</span>
          </button>

          <button
            type="button"
            className={reportTab === "stocks_returned" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => {
              setReportTab("stocks_returned");
              setSearch("");
            }}
            style={{
              gap: "7px",
              fontWeight: reportTab === "stocks_returned" ? "700" : "600",
              fontSize: "13px",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            <RotateCcw size={15} />
            <span>Stocks Returned ({allReturnedItems.length})</span>
          </button>

          <button
            type="button"
            className={reportTab === "timeline" ? "primary-btn compact" : "secondary-btn compact"}
            onClick={() => {
              setReportTab("timeline");
              setSearch("");
            }}
            style={{
              gap: "7px",
              fontWeight: reportTab === "timeline" ? "700" : "600",
              fontSize: "13px",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            <Clock size={15} />
            <span>Stock Movement Timeline ({timelineMovements.length})</span>
          </button>
        </div>

        {/* Date Scope Filter */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: "5px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                fontSize: "12px",
                background: "var(--bg-canvas)",
                color: "var(--text-primary)"
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: "5px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                fontSize: "12px",
                background: "var(--bg-canvas)",
                color: "var(--text-primary)"
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="panel"
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "12px 18px",
          margin: 0
        }}
      >
        <div className="filter-input-group" style={{ flex: "1 1 240px", minWidth: "220px" }}>
          <Search size={16} />
          <input
            type="text"
            placeholder={
              reportTab === "kitchen_stock"
                ? "Search by Item Code, Item Name, or Category..."
                : reportTab === "stocks_received"
                ? "Search by Item, Issue #, Reference, User..."
                : reportTab === "stocks_returned"
                ? "Search by Item, Return #, Reason, User..."
                : "Search timeline by Item, Document #, Reason..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {reportTab === "kitchen_stock" && categoriesList.length > 0 && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
            >
              <option value="">All Categories</option>
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {reportTab === "kitchen_stock" && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Stock Level:
            </span>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
            >
              <option value="all">All Levels</option>
              <option value="sufficient">In Stock (&gt; Min)</option>
              <option value="low">Low Stock (≤ Reorder)</option>
              <option value="out">Out of Stock (= 0)</option>
            </select>
          </div>
        )}

        {(search || categoryFilter || stockStatusFilter !== "all") && (
          <button
            type="button"
            className="secondary-btn compact"
            onClick={() => {
              setSearch("");
              setCategoryFilter("");
              setStockStatusFilter("all");
            }}
            style={{ fontSize: "12px" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Report Table Container */}
      <div className="panel" style={{ padding: 0, overflow: "hidden", margin: 0 }}>
        {loading ? (
          <div className="empty-row" style={{ padding: "40px", textAlign: "center" }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: "8px" }} />
            <div>Loading kitchen stock reports...</div>
          </div>
        ) : (
          <>
            {/* VIEW 1: KITCHEN STOCK BALANCE */}
            {reportTab === "kitchen_stock" && (
              <div className="table-wrap">
                {filteredStocks.length === 0 ? (
                  <div className="empty-row" style={{ padding: "36px", textAlign: "center" }}>
                    No kitchen stock records match your filter criteria.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "110px", whiteSpace: "nowrap" }}>Item Code</th>
                        <th style={{ minWidth: "160px" }}>Item Name</th>
                        <th style={{ width: "120px" }}>Category</th>
                        <th style={{ width: "130px", textAlign: "right" }}>Current Kitchen Stock</th>
                        <th style={{ width: "130px", textAlign: "right", color: "#15803d" }}>
                          Stocks Received <small style={{ display: "block", fontSize: "10px", color: "var(--text-muted)" }}>(Period)</small>
                        </th>
                        <th style={{ width: "130px", textAlign: "right", color: "#d97706" }}>
                          Stocks Returned <small style={{ display: "block", fontSize: "10px", color: "var(--text-muted)" }}>(Period)</small>
                        </th>
                        <th style={{ width: "80px" }}>Unit</th>
                        <th style={{ width: "110px", textAlign: "right" }}>Central Stock</th>
                        <th style={{ width: "120px", whiteSpace: "nowrap" }}>Stock Status</th>
                        <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={13} /> Last Updated Time
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStocks.map((s) => {
                        const cur = Number(s.currentStock || 0);
                        const rec = Number(s.periodReceived || 0);
                        const ret = Number(s.periodReturned || 0);

                        return (
                          <tr key={s.id || s.inventoryItemId}>
                            <td>
                              <code>{s.itemCode || `ITM-${s.inventoryItemId || s.id}`}</code>
                            </td>
                            <td>
                              <strong>{s.itemName || s.ingredientName}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {s.category || "General"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong
                                style={{
                                  fontSize: "14px",
                                  color: cur <= 0 ? "#ef4444" : cur <= (s.reorderLevel || 0) ? "#d97706" : "#217844"
                                }}
                              >
                                {cur.toFixed(2)}
                              </strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span
                                className="role-chip"
                                style={{
                                  background: rec > 0 ? "rgba(21, 128, 61, 0.12)" : "transparent",
                                  color: rec > 0 ? "#15803d" : "var(--text-muted)",
                                  fontWeight: rec > 0 ? "700" : "500",
                                  fontSize: "12px"
                                }}
                              >
                                {rec > 0 ? `+${rec.toFixed(2)}` : "0.00"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span
                                className="role-chip"
                                style={{
                                  background: ret > 0 ? "rgba(217, 119, 6, 0.12)" : "transparent",
                                  color: ret > 0 ? "#d97706" : "var(--text-muted)",
                                  fontWeight: ret > 0 ? "700" : "500",
                                  fontSize: "12px"
                                }}
                              >
                                {ret > 0 ? `-${ret.toFixed(2)}` : "0.00"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                {s.unit || "KG"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "13px" }}>
                              {Number(s.centralStock || 0).toFixed(2)}
                            </td>
                            <td>
                              <span
                                className={`status ${
                                  s.status === "In Stock" ? "active" : s.status === "Low Stock" ? "warning" : "inactive"
                                }`}
                                style={{ fontSize: "11px", whiteSpace: "nowrap" }}
                              >
                                {s.status}
                              </span>
                            </td>
                            <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "var(--text-muted)" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <Clock size={12} color="var(--brand-gold)" />
                                {formatDateTime(s.updatedAt)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* VIEW 2: STOCKS RECEIVED (INWARD FROM CENTRAL STORE) */}
            {reportTab === "stocks_received" && (
              <div className="table-wrap">
                {filteredReceived.length === 0 ? (
                  <div className="empty-row" style={{ padding: "36px", textAlign: "center" }}>
                    No stocks received records found in the selected date range.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "170px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={13} /> Date & Time
                          </span>
                        </th>
                        <th style={{ width: "160px", whiteSpace: "nowrap" }}>Issue Voucher #</th>
                        <th style={{ minWidth: "160px" }}>Item Received</th>
                        <th style={{ width: "140px", textAlign: "right" }}>Received Quantity</th>
                        <th style={{ width: "80px" }}>Unit</th>
                        <th style={{ width: "140px" }}>Kitchen Dept</th>
                        <th style={{ width: "140px", textAlign: "right" }}>Store Stock (Before → After)</th>
                        <th style={{ width: "130px" }}>Received / Issued By</th>
                        <th style={{ width: "100px" }}>Status</th>
                        <th style={{ minWidth: "160px" }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceived.map((r) => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                            <strong style={{ display: "block", color: "var(--text-primary)" }}>
                              {formatDateOnly(r.dateTime)}
                            </strong>
                            <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={11} color="var(--brand-gold)" />
                              {new Date(r.dateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <code>{r.issueNumber}</code>
                            {r.reference && r.reference !== r.issueNumber && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ref: {r.reference}</div>
                            )}
                          </td>
                          <td>
                            <strong>{r.itemName}</strong>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span
                              className="role-chip"
                              style={{
                                background: "rgba(21, 128, 61, 0.12)",
                                color: "#15803d",
                                fontWeight: "700",
                                fontSize: "13px"
                              }}
                            >
                              +{Number(r.quantity || 0).toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", fontWeight: "600" }}>{r.unit}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{r.department}</span>
                          </td>
                          <td style={{ textAlign: "right", fontSize: "12px", color: "var(--text-muted)" }}>
                            {r.stockBefore !== undefined && r.stockAfter !== undefined
                              ? `${Number(r.stockBefore).toFixed(2)} → ${Number(r.stockAfter).toFixed(2)}`
                              : "—"}
                          </td>
                          <td style={{ fontSize: "12px" }}>{r.handledBy || "Store Officer"}</td>
                          <td>
                            <span className="role-chip" style={{ color: "#217844", background: "#eaf8ef", fontSize: "11px" }}>
                              ✓ {r.status}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* VIEW 3: STOCKS RETURNED (RETURN UNUSED TO STORE) */}
            {reportTab === "stocks_returned" && (
              <div className="table-wrap">
                {filteredReturned.length === 0 ? (
                  <div className="empty-row" style={{ padding: "36px", textAlign: "center" }}>
                    No stocks returned records found in the selected date range.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "170px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={13} /> Date & Time
                          </span>
                        </th>
                        <th style={{ width: "160px", whiteSpace: "nowrap" }}>Return Slip #</th>
                        <th style={{ minWidth: "160px" }}>Item Returned</th>
                        <th style={{ width: "140px", textAlign: "right" }}>Returned Quantity</th>
                        <th style={{ width: "80px" }}>Unit</th>
                        <th style={{ minWidth: "160px" }}>Return Reason</th>
                        <th style={{ width: "150px" }}>Linked Issue #</th>
                        <th style={{ width: "130px" }}>Returned By</th>
                        <th style={{ width: "100px" }}>Status</th>
                        <th style={{ minWidth: "140px" }}>Notes / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReturned.map((r) => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                            <strong style={{ display: "block", color: "var(--text-primary)" }}>
                              {formatDateOnly(r.dateTime)}
                            </strong>
                            <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={11} color="var(--brand-gold)" />
                              {new Date(r.dateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <code>{r.returnNumber}</code>
                          </td>
                          <td>
                            <strong>{r.itemName}</strong>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span
                              className="role-chip"
                              style={{
                                background: "rgba(217, 119, 6, 0.12)",
                                color: "#d97706",
                                fontWeight: "700",
                                fontSize: "13px"
                              }}
                            >
                              -{Number(r.quantity || 0).toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", fontWeight: "600" }}>{r.unit}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                background: "rgba(245, 158, 11, 0.1)",
                                color: "#b45309",
                                border: "1px solid rgba(245, 158, 11, 0.25)",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                display: "inline-block"
                              }}
                            >
                              {r.reason}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {r.linkedIssueNumber ? <code>{r.linkedIssueNumber}</code> : "—"}
                          </td>
                          <td style={{ fontSize: "12px" }}>{r.handledBy || "Chef / Kitchen"}</td>
                          <td>
                            <span className="role-chip" style={{ color: "#d97706", background: "#fef3c7", fontSize: "11px" }}>
                              ✓ {r.status}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* VIEW 4: ALL STOCK MOVEMENTS TIMELINE (CHRONOLOGICAL STREAM) */}
            {reportTab === "timeline" && (
              <div className="table-wrap">
                {filteredTimeline.length === 0 ? (
                  <div className="empty-row" style={{ padding: "36px", textAlign: "center" }}>
                    No stock movements recorded in the selected date range.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "170px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={13} /> Date & Time
                          </span>
                        </th>
                        <th style={{ width: "130px", whiteSpace: "nowrap" }}>Movement Type</th>
                        <th style={{ width: "160px", whiteSpace: "nowrap" }}>Document / Voucher #</th>
                        <th style={{ minWidth: "160px" }}>Item Name</th>
                        <th style={{ width: "140px", textAlign: "right" }}>Quantity & Unit</th>
                        <th style={{ width: "130px" }}>Department</th>
                        <th style={{ width: "140px" }}>Handled By</th>
                        <th style={{ minWidth: "180px" }}>Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimeline.map((mov) => {
                        const isRec = mov.movementType === "RECEIVED";
                        return (
                          <tr key={mov.id}>
                            <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                              <strong style={{ display: "block", color: "var(--text-primary)" }}>
                                {formatDateOnly(mov.dateTime)}
                              </strong>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Clock size={11} color="var(--brand-gold)" />
                                {new Date(mov.dateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: mov.badgeBg,
                                  color: mov.badgeColor,
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {isRec ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                {isRec ? "RECEIVED" : "RETURNED"}
                              </span>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <code>{mov.docNumber}</code>
                            </td>
                            <td>
                              <strong>{mov.itemName}</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "13px", color: isRec ? "#15803d" : "#d97706" }}>
                                {isRec ? `+${Number(mov.quantity || 0).toFixed(2)}` : `-${Number(mov.quantity || 0).toFixed(2)}`}{" "}
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{mov.unit}</span>
                              </strong>
                            </td>
                            <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{mov.department}</td>
                            <td style={{ fontSize: "12px" }}>{mov.handledBy}</td>
                            <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                              {mov.reason ? <span style={{ color: "#b45309", fontWeight: "600" }}>{mov.reason}: </span> : null}
                              {mov.remarks || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { KitchenReportsView };
export const KitchenReportsPage = KitchenReportsView;
