import React, { useState, useEffect } from "react";
import {
  Calendar,
  Share2,
  RotateCcw,
  Building2,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { api } from "./api";
import DailyProductionPlan from "./DailyProductionPlan";
import { MaterialIssueManagement, MaterialReturnManagement } from "./KitchenManagement";

/**
 * ProductionDashboard
 * 
 * Centralized Production Hub providing three core navigation options:
 * 1. Production Plan
 * 2. Material Issue
 * 3. Material Return
 */
export default function ProductionDashboard({ user, initialTab = "plan", onNavigate }) {
  // Normalize tab key to one of "plan" | "issue" | "return"
  const normalizeTab = (tab) => {
    if (tab === "material_issue" || tab === "issue") return "issue";
    if (tab === "material_return" || tab === "return") return "return";
    return "plan";
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
  const currentBranchObj = branches.find((b) => String(b.id) === String(activeBranchId));
  const branchModuleType = currentBranchObj?.moduleType || user?.branchModuleType || "Both POS + KMS";
  const isKmsOnly = branchModuleType === "KMS Only";
  const isPosOnly = branchModuleType === "POS Only";

  // Auto-switch tab if current tab is disabled for this module type
  useEffect(() => {
    if (isKmsOnly && activeTab === "plan") {
      setActiveTab("issue");
    } else if (isPosOnly && (activeTab === "issue" || activeTab === "return")) {
      setActiveTab("plan");
    }
  }, [isKmsOnly, isPosOnly, activeTab]);

  const canManage = [
    "Super Admin",
    "Organization Admin",
    "Branch Manager",
    "Kitchen Manager",
    "Chef",
    "Inventory Manager"
  ].includes(user?.role);

  // The 3 core navigation tabs for Production configured by branch module type:
  // KMS Only: Hide and disable Production Plan; keep Material Issue and Material Return
  // POS Only: Keep Production Plan available; hide and disable Material Issue and Material Return
  // Both: Keep all 3 tabs available
  const productionOptions = [
    !isKmsOnly && {
      id: "plan",
      title: "Production Plan",
      icon: Calendar,
      shortLabel: "Production Plan"
    },
    !isPosOnly && {
      id: "issue",
      title: "Material Issue",
      icon: Share2,
      shortLabel: "Material Issue"
    },
    !isPosOnly && {
      id: "return",
      title: "Material Return",
      icon: RotateCcw,
      shortLabel: "Material Return"
    }
  ].filter(Boolean);

  return (
    <div className="production-dashboard-wrapper">
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

      {/* Production Top Navigation Bar */}
      <div className="production-segmented-tabs-bar">
        <div className="segmented-tabs-track" role="tablist" aria-label="Production Navigation">
          {productionOptions.map((opt) => {
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
                  onNavigate?.(opt.id === "plan" ? "production" : opt.id === "issue" ? "material_issue" : "material_return");
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
      <div className="production-screen-wrapper">
        {activeTab === "plan" && !isKmsOnly && (
          <div className="production-screen-slide" key="screen-plan">
            <DailyProductionPlan
              user={user}
              branchId={activeBranchId}
              branches={branches}
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
            />
          </div>
        )}

        {activeTab === "issue" && !isPosOnly && (
          <div className="production-screen-slide" key="screen-issue">
            <MaterialIssueManagement
              user={user}
              branchId={activeBranchId}
              branches={branches}
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
            />
          </div>
        )}

        {activeTab === "return" && !isPosOnly && (
          <div className="production-screen-slide" key="screen-return">
            <MaterialReturnManagement
              user={user}
              branchId={activeBranchId}
              branches={branches}
              canManage={canManage}
              onError={(msg) => setToastError(msg)}
              onSuccess={(msg) => setToastMessage(msg)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
