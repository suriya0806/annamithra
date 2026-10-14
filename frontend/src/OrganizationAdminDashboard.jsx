import React, { useState, useEffect } from "react";
import {
  Store,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { api } from "./api";
import { RoleDashboardHeader } from "./RoleDashboards";

export default function OrganizationAdminDashboard({ user, onNavigate }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await api.getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load branches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="role-dashboard-view" style={{ maxWidth: "860px" }}>
        <div className="role-empty-state" style={{ minHeight: "260px" }}>
          <RefreshCw size={24} className="spin-icon" style={{ animation: "spin 1s linear infinite" }} />
          <p>Loading organization overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="role-dashboard-view" style={{ maxWidth: "860px" }}>
        <div className="role-panel error-box" style={{ padding: "24px" }}>
          <strong>Error loading dashboard:</strong> {error}
          <button
            onClick={() => loadData(true)}
            className="role-action-btn primary"
            style={{ marginTop: "14px" }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const totalBranches = branches.length;

  return (
    <div className="role-dashboard-view" style={{ maxWidth: "860px" }}>
      {/* Clear, well-aligned Page Title */}
      <RoleDashboardHeader
        eyebrow="ORGANIZATION HEADQUARTERS"
        title={`${user?.organizationName || "Organization"} Overview`}
        subtitle="Registered branch locations across your enterprise"
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
        statusText="Active Enterprise"
      />

      {/* Total Branch Count Card (ONLY metric requested) */}
      <div className="role-panel" style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <div className="org-branch-icon-badge">
              <Store size={28} />
            </div>
            <div>
              <span className="role-kpi-label" style={{ display: "block", marginBottom: "4px" }}>
                Total Registered Branches
              </span>
              <div className="org-branch-count-val">
                {totalBranches}
                <span className="org-branch-count-unit">
                  Branch{totalBranches !== 1 ? "es" : ""}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                Active physical operational branches connected to {user?.organizationName || "your enterprise"}.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="role-action-btn primary"
            onClick={() => onNavigate("branches")}
            style={{ padding: "12px 22px", fontSize: "13.5px" }}
          >
            <Store size={16} />
            <span>View & Manage Branches</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
