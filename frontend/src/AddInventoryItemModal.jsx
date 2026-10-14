import React, { useState, useEffect } from "react";
import { X, Package, Check, AlertCircle } from "lucide-react";
import { api } from "./api";

/**
 * AddInventoryItemModal
 *
 * Dedicated, centered popup for creating a new Inventory Item from the Purchase module.
 * Conforms strictly to requirements:
 * 1. Branch * (Dropdown, shows current branch selection)
 * 2. Item Code (Optional input, auto-generated if empty)
 * 3. Item Name * (Required text input)
 * 4. Category (Dropdown / category master from database)
 * 5. Unit * (Dropdown: KG, G, L, ML, PCS, BOX, PACK, TIN, BOTTLE)
 * 6. Minimum Stock Reference (Numeric input, integrates with reorder logic)
 * 7. Description (Optional textarea)
 *
 * Does NOT set opening stock (CurrentStock stays 0).
 */
export default function AddInventoryItemModal({
  isOpen,
  onClose,
  user,
  branches = [],
  defaultBranchId = "",
  onSuccess,
  onError
}) {
  const [form, setForm] = useState({
    branchId: "",
    itemCode: "",
    name: "",
    category: "",
    unit: "KG",
    minimumStock: "",
    description: ""
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Common standard units
  const availableUnits = [
    { value: "KG", label: "KG (Kilograms)" },
    { value: "G", label: "G (Grams)" },
    { value: "L", label: "L (Litres)" },
    { value: "ML", label: "ML (Millilitres)" },
    { value: "PCS", label: "PCS (Pieces)" },
    { value: "BOX", label: "BOX" },
    { value: "PACK", label: "PACK" },
    { value: "TIN", label: "TIN" },
    { value: "BOTTLE", label: "BOTTLE" }
  ];

  // Initialize form branch and load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormError("");
      const initialBranch =
        (user?.branchId ? String(user.branchId) : "") ||
        (defaultBranchId ? String(defaultBranchId) : "") ||
        (branches.length > 0 ? String(branches[0].id) : "");

      setForm({
        branchId: initialBranch,
        itemCode: "",
        name: "",
        category: "",
        unit: "KG",
        minimumStock: "",
        description: ""
      });

      // Load master categories from database
      setLoadingCategories(true);
      api.getCategories()
        .then((cats) => {
          if (Array.isArray(cats)) {
            setCategories(cats);
            if (cats.length > 0) {
              setForm((prev) => ({ ...prev, category: prev.category || cats[0].name }));
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to load inventory categories:", err);
        })
        .finally(() => {
          setLoadingCategories(false);
        });
    }
  }, [isOpen, defaultBranchId, user?.branchId, branches]);

  // Support closing modal on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    // Validate Required Fields
    const branchIdNum = Number(form.branchId);
    if (!form.branchId || !branchIdNum) {
      setFormError("Please select a valid Branch.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Item Name is required.");
      return;
    }

    if (!form.unit.trim()) {
      setFormError("Unit is required.");
      return;
    }

    // Validate Minimum Stock Reference
    const minStockNum = form.minimumStock !== "" ? Number(form.minimumStock) : 0;
    if (isNaN(minStockNum) || minStockNum < 0) {
      setFormError("Minimum Stock Reference must be a valid positive number.");
      return;
    }

    // Match category ID if available
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === (form.category || "").trim().toLowerCase()
    );

    setSaving(true);
    try {
      const payload = {
        branchId: branchIdNum,
        itemCode: form.itemCode?.trim() || null,
        name: form.name.trim(),
        category: form.category?.trim() || "General",
        categoryId: matchedCategory ? matchedCategory.id : null,
        unit: form.unit.trim().toUpperCase(),
        minimumStock: minStockNum,
        reorderLevel: minStockNum, // Integrates with minimum-stock / reorder logic
        maximumStock: 0,
        openingStock: 0, // MUST NOT add opening stock or increase current stock
        reference: null,
        description: form.description?.trim() || null
      };

      const res = await api.createInventoryItem(payload);
      const successMsg = res.message || `Inventory item "${form.name.trim()}" created successfully.`;
      
      onSuccess?.(res, successMsg);
      onClose();
    } catch (err) {
      const errText = err.message || "Failed to save inventory item.";
      setFormError(errText);
      onError?.(errText);
    } finally {
      setSaving(false);
    }
  }

  const isBranchLocked = Boolean(user?.branchId && !["Super Admin", "Organization Admin"].includes(user?.role));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1200,
        backgroundColor: "rgba(4, 20, 13, 0.78)",
        backdropFilter: "blur(6px)"
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "680px",
          width: "100%",
          padding: 0,
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.4)",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          className="modal-head"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Package size={20} color="var(--brand-gold)" />
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#ffffff" }}>
              Add Inventory Item
            </h3>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Close (Escape)"
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              maxHeight: "calc(85vh - 130px)",
              overflowY: "auto"
            }}
          >
            {formError && (
              <div
                className="error-box"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  fontSize: "13px"
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Row 1: Branch * & Item Code */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px"
              }}
            >
              {/* Field 1: Branch * */}
              <div className="form-group">
                <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                  Branch *
                </label>
                {isBranchLocked ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-surface-subtle)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      fontWeight: "500"
                    }}
                  >
                    {user?.branchName || "Current Branch"}
                  </div>
                ) : (
                  <select
                    className="input-select"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field 2: Item Code */}
              <div className="form-group">
                <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                  Item Code
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. ITM-1001 (auto if empty)"
                  value={form.itemCode}
                  onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Row 2: Item Name * & Category */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px"
              }}
            >
              {/* Field 3: Item Name * */}
              <div className="form-group">
                <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Basmati Rice"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                  style={{ width: "100%" }}
                />
              </div>

              {/* Field 4: Category */}
              <div className="form-group">
                <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                  Category
                </label>
                {categories.length > 0 ? (
                  <select
                    className="input-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {!categories.some((c) => c.name.toLowerCase() === (form.category || "").toLowerCase()) && form.category && (
                      <option value={form.category}>{form.category}</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. Grains, Vegetables, Spices"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: "100%" }}
                  />
                )}
              </div>
            </div>

            {/* Row 3: Unit * & Minimum Stock Reference */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px"
              }}
            >
              {/* Field 5: Unit * */}
              <div className="form-group">
                <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                  Unit *
                </label>
                <select
                  className="input-select"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  required
                  style={{ width: "100%" }}
                >
                  {availableUnits.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 6: Minimum Stock Reference */}
              <div className="form-group">
                <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                  Minimum Stock Reference
                </label>
                <input
                  type="number"
                  className="input-text"
                  min="0"
                  step="any"
                  placeholder="e.g. 10 (reorder threshold)"
                  value={form.minimumStock}
                  onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Row 4: Description (Full Width) */}
            <div className="form-group">
              {/* Field 7: Description */}
              <label className="field-label" style={{ fontWeight: "600", fontSize: "13px" }}>
                Description
              </label>
              <textarea
                className="input-text"
                rows={3}
                placeholder="Optional description, specifications or notes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{
                  width: "100%",
                  resize: "vertical",
                  minHeight: "72px"
                }}
              />
            </div>
          </div>

          {/* Bottom Actions */}
          <div
            className="modal-footer"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              padding: "16px 24px",
              borderTop: "1px solid var(--border-default)",
              background: "var(--bg-surface-subtle)"
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
              style={{ minWidth: "120px" }}
            >
              {saving ? "Saving Item..." : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
