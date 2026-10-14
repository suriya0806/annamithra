import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Users,
  RefreshCw,
  AlertCircle,
  Layers
} from "lucide-react";
import { api } from "./api";
import ReportsAndAnalytics from "./ReportsAndAnalytics";

export default function BranchDetailsPage({ branchId, user, onBack }) {
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBranchDetails = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await api.getBranch(branchId);
      setBranch(data);
    } catch (err) {
      setError(err.message || "Failed to load branch details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBranchDetails();
  }, [branchId]);

  if (loading) {
    return (
      <div className="branch-details-loading" style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
        <RefreshCw size={24} className="spin-icon" style={{ marginBottom: "12px", animation: "spin 1s linear infinite" }} />
        <div>Loading branch details and reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel error-box" style={{ padding: "28px", margin: "20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <AlertCircle size={20} color="#ef4444" />
          <h3 style={{ margin: 0, color: "#ef4444" }}>Branch Error</h3>
        </div>
        <p style={{ margin: "6px 0 16px 0" }}>{error}</p>
        <button type="button" className="secondary-btn compact" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Branches
        </button>
      </div>
    );
  }

  const isBranchActive = branch?.isActive !== false;

  return (
    <div className="branch-details-container">
      {/* 1. Header with Back Action */}
      <div className="branch-details-top-nav">
        <button type="button" className="branch-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Branches</span>
        </button>
        <div className="branch-nav-path">
          <span className="path-org">{user?.organizationName || "ANNAMITHRA Hotel Group"}</span>
          <span className="path-divider">/</span>
          <span className="path-branches" onClick={onBack}>Branches</span>
          <span className="path-divider">/</span>
          <span className="path-current">{branch?.name}</span>
        </div>
      </div>

      {/* 2. Selected Branch Information Card */}
      <div className="branch-hero-card">
        <div className="branch-hero-main">
          <div className="branch-title-row">
            <div className="branch-name-wrap">
              <h1 className="branch-hero-title">{branch?.name}</h1>
              {branch?.code && <span className="branch-code-badge">{branch.code}</span>}
              <span className={`branch-status-pill ${isBranchActive ? "active" : "inactive"}`}>
                <span className="status-dot"></span>
                {isBranchActive ? "Active Branch" : "Inactive"}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background:
                    branch?.moduleType === "KMS Only"
                      ? "var(--metric-blue-bg)"
                      : branch?.moduleType === "POS Only"
                      ? "var(--status-active-bg)"
                      : "var(--metric-orange-bg)",
                  color:
                    branch?.moduleType === "KMS Only"
                      ? "var(--metric-blue-text)"
                      : branch?.moduleType === "POS Only"
                      ? "var(--status-active-text)"
                      : "var(--metric-orange-text)",
                  border:
                    branch?.moduleType === "KMS Only"
                      ? "1px solid var(--metric-blue-border)"
                      : branch?.moduleType === "POS Only"
                      ? "1px solid var(--status-active-border)"
                      : "1px solid var(--metric-orange-border)"
                }}
              >
                Module: {branch?.moduleType || "Both POS + KMS"}
              </span>
            </div>
            <button
              type="button"
              className="refresh-mini-btn"
              onClick={() => loadBranchDetails(true)}
              disabled={refreshing}
              title="Refresh branch details"
            >
              <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
            </button>
          </div>

          <div className="branch-meta-row">
            <div className="branch-meta-item">
              <MapPin size={15} className="meta-icon" />
              <span>{branch?.address ? `${branch.address}, ` : ""}{branch?.city || "—"}</span>
            </div>
            {branch?.phone && (
              <div className="branch-meta-item">
                <Phone size={15} className="meta-icon" />
                <span>{branch.phone}</span>
              </div>
            )}
            <div className="branch-meta-item">
              <Users size={15} className="meta-icon" />
              <span>
                Manager: <strong>{branch?.managerName || "Not assigned"}</strong>
                {branch?.managerPhone ? ` (${branch.managerPhone})` : ""}
              </span>
            </div>
            <div className="branch-meta-item">
              <Layers size={15} className="meta-icon" />
              <span>
                Module Type: <strong>{branch?.moduleType || "Both POS + KMS"}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Reports Belonging to this Branch */}
      <div className="branch-reports-section" style={{ marginTop: "8px" }}>
        <ReportsAndAnalytics
          user={user}
          initialBranchId={branchId}
          lockBranch={true}
          branchName={branch?.name}
          embedded={true}
        />
      </div>
    </div>
  );
}
