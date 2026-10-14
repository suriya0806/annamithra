import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  ChevronRight,
  RefreshCw,
  MapPin,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { api } from "./api";

export default function BranchesPage({ canManage, onSelectBranch, initialCreate = false }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(initialCreate);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    phone: "",
    moduleType: "Both POS + KMS"
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadBranches(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await api.getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load branches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await api.createBranch({
        name: form.name.trim(),
        code: form.code.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        moduleType: form.moduleType
      });
      setForm({ name: "", code: "", address: "", city: "", phone: "", moduleType: "Both POS + KMS" });
      setMessage("Branch created successfully.");
      setShowCreateForm(false);
      await loadBranches();
    } catch (e) {
      setError(e.message || "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredBranches = branches.filter((b) => {
    // Status filter
    if (statusFilter === "active" && b.isActive === false) return false;
    if (statusFilter === "inactive" && b.isActive !== false) return false;

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      const match =
        (b.name || "").toLowerCase().includes(s) ||
        (b.code || "").toLowerCase().includes(s) ||
        (b.address || "").toLowerCase().includes(s) ||
        (b.city || "").toLowerCase().includes(s) ||
        (b.phone || "").toLowerCase().includes(s) ||
        (b.managerName || "").toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="branches-page-wrapper">
      {/* 1. Action Toolbar */}
      <div className="branches-header-actions-row" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "16px", gap: "10px" }}>
        <button
          type="button"
          className="secondary-btn compact"
          onClick={() => loadBranches(true)}
          disabled={refreshing}
          title="Refresh branch directory"
        >
          <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>

        {canManage && (
          <button
            type="button"
            className="primary-btn compact"
            onClick={() => setShowCreateForm((prev) => !prev)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>{showCreateForm ? "Cancel Create" : "Create Branch"}</span>
          </button>
        )}
      </div>

      {/* 2. Messages */}
      {error && <div className="panel error-box" style={{ margin: "12px 0" }}>{error}</div>}
      {message && <div className="panel success-box" style={{ margin: "12px 0" }}>{message}</div>}

      {/* 3. Create Branch Panel (Collapsible) */}
      {canManage && showCreateForm && (
        <div className="panel form-panel create-branch-box" style={{ marginBottom: "20px", border: "1px solid var(--primary-gold, #d97706)" }}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">NEW LOCATION</span>
              <h3>Add New Branch</h3>
            </div>
            <button type="button" className="text-btn compact" onClick={() => setShowCreateForm(false)}>✕ Close</button>
          </div>

          <form className="form-grid" onSubmit={handleCreate} style={{ marginTop: "14px" }}>
            <label className="field">
              <span>Branch Name</span>
              <input
                type="text"
                required
                placeholder="e.g. Madurai Main Branch"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Branch Code</span>
              <input
                type="text"
                placeholder="e.g. MAD001"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Address</span>
              <input
                type="text"
                placeholder="e.g. 124 West Masi Street"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>

            <label className="field">
              <span>City</span>
              <input
                type="text"
                placeholder="e.g. Madurai"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Phone / Contact</span>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Module Type *</span>
              <select
                required
                value={form.moduleType}
                onChange={(e) => setForm({ ...form, moduleType: e.target.value })}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--card-bg)",
                  color: "var(--text-color)"
                }}
              >
                <option value="Both POS + KMS">Both POS + KMS</option>
                <option value="KMS Only">KMS Only</option>
                <option value="POS Only">POS Only</option>
              </select>
            </label>

            <div className="form-action" style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <button type="submit" className="primary-btn compact" disabled={submitting}>
                {submitting ? "Creating..." : "Save Branch"}
                <ChevronRight size={16} />
              </button>
              <button type="button" className="secondary-btn compact" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Search and Filter Bar */}
      <div className="branches-filter-bar" style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <div className="search-box-wrap" style={{ position: "relative", flex: "1", minWidth: "240px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search branches by name, code, city, phone, manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 38px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--card-bg)", color: "var(--text-color)" }}
          />
        </div>

        <div className="filter-select-wrap" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Filter size={15} style={{ color: "var(--text-muted)" }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--card-bg)", color: "var(--text-color)" }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="branches-count-chip" style={{ padding: "8px 14px", borderRadius: "8px", background: "var(--metric-orange-bg)", border: "1px solid var(--metric-orange-border)", color: "var(--metric-orange-text)", fontSize: "13px", fontWeight: "700" }}>
          {filteredBranches.length} of {branches.length} Branch{branches.length !== 1 ? "es" : ""}
        </div>
      </div>

      {/* 5. Branch List / Table */}
      <div className="panel branches-table-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">LOCATIONS DIRECTORY</span>
            <h3>Registered Branches</h3>
          </div>
          <Building2 size={20} className="panel-head-icon" />
        </div>

        {loading ? (
          <div className="loading" style={{ padding: "40px", textAlign: "center" }}>
            <RefreshCw size={20} className="spin-icon" style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
            <div>Loading organization branches...</div>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="empty-row" style={{ padding: "40px", textAlign: "center" }}>
            {search || statusFilter !== "all"
              ? "No branches matching your filter criteria."
              : "No branches registered in this organization yet."}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="branches-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Branch Code</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Branch Manager</th>
                  <th>Contact Details</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                  <th style={{ textAlign: "center" }}>Module Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((b) => (
                  <tr
                    key={b.id}
                    className="clickable-branch-row"
                    onClick={() => onSelectBranch && onSelectBranch(b.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="branch-title-cell">
                        <strong>{b.name}</strong>
                        {b.userCount !== undefined && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>
                            ({b.userCount} staff)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {b.code ? (
                        <span className="code-chip">{b.code}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>{b.address || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td>{b.city || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td>
                      {b.managerName ? (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "600" }}>{b.managerName}</span>
                          {b.managerEmail && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{b.managerEmail}</span>}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Not assigned</span>
                      )}
                    </td>
                    <td>
                      {b.phone ? (
                        <span>{b.phone}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status ${b.isActive !== false ? "active" : "inactive"}`}>
                        {b.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectBranch) onSelectBranch(b.id);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className="code-chip"
                        style={{
                          fontWeight: "600",
                          background:
                            b.moduleType === "KMS Only"
                              ? "rgba(59, 130, 246, 0.15)"
                              : b.moduleType === "POS Only"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(217, 119, 6, 0.15)",
                          color:
                            b.moduleType === "KMS Only"
                              ? "#3b82f6"
                              : b.moduleType === "POS Only"
                              ? "#10b981"
                              : "#d97706",
                          border: "1px solid currentColor",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          display: "inline-block"
                        }}
                      >
                        {b.moduleType || "Both POS + KMS"}
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
