import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  ChefHat,
  UtensilsCrossed,
  Plus,
  RefreshCw,
  CheckCircle2,
  Printer,
  X,
  Trash2,
  Search,
  ArrowRight,
  ArrowLeft,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  Check,
  Layers,
  Sparkles,
  Save,
  Filter,
  PackageCheck
} from "lucide-react";
import { api } from "./api";
import { getDishImage } from "./dishImages";

export default function DailyProductionPlan({
  user,
  branchId,
  branches = [],
  canManage,
  onError,
  onSuccess
}) {
  // Current Selected Date (default: Today in local time YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedBranchId, setSelectedBranchId] = useState(
    () => branchId || (branches?.[0]?.id ? String(branches[0].id) : "")
  );

  // Data state
  const [plans, setPlans] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [kitchenStocks, setKitchenStocks] = useState([]);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [syncingSales, setSyncingSales] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Inline pending edits for targets: { [menuItemId]: quantity }
  const [pendingTargets, setPendingTargets] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Quick single dish add bar
  const [quickDishId, setQuickDishId] = useState("");
  const [quickTargetQty, setQuickTargetQty] = useState(25);

  // Modals & Drawers
  const [showAddProductionModal, setShowAddProductionModal] = useState(false);
  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [multiSelectedDishes, setMultiSelectedDishes] = useState({}); // { [id]: targetQty }
  const [multiSearchTerm, setMultiSearchTerm] = useState("");
  const [multiCategoryFilter, setMultiCategoryFilter] = useState("All");

  // Secondary Kitchen Tools Drawer
  const [showKitchenDrawer, setShowKitchenDrawer] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showProduceModal, setShowProduceModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Produce modal state
  const [produceForm, setProduceForm] = useState({
    menuItemId: null,
    menuItemName: "",
    actualQuantity: 1,
    plannedQuantity: 0,
    alreadyProduced: 0
  });
  const [produceStockCheck, setProduceStockCheck] = useState(null);
  const [checkingProduceStock, setCheckingProduceStock] = useState(false);

  // Material Issue Modal state
  const [issueLines, setIssueLines] = useState([]);
  const [issueReceivedBy, setIssueReceivedBy] = useState("Kitchen Staff");
  const [issueNotes, setIssueNotes] = useState("");

  // Material Return Modal state
  const [returnLines, setReturnLines] = useState([]);
  const [returnReason, setReturnReason] = useState("Unused Product / Shift End Return");
  const [returnNotes, setReturnNotes] = useState("");

  // Sync selectedBranchId if prop changes
  useEffect(() => {
    if (branchId) setSelectedBranchId(branchId);
  }, [branchId]);

  // ESC key handler for Add Production modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && showAddProductionModal) {
        setShowAddProductionModal(false);
      }
    }
    if (showAddProductionModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showAddProductionModal]);

  // Load data for selected date and branch
  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const activeBranch = selectedBranchId || undefined;
      const [plansData, menuData, invData, kStockData] = await Promise.all([
        api.getProductionPlans(activeBranch, undefined, selectedDate),
        api.getMenu(activeBranch),
        api.getInventoryItems({ branchId: activeBranch }),
        api.getKitchenStock ? api.getKitchenStock(activeBranch) : Promise.resolve([])
      ]);

      setPlans(plansData || []);
      setMenuItems(menuData || []);
      setInventoryItems(invData || []);
      setKitchenStocks(kStockData || []);
      setPendingTargets({});
      setIsDirty(false);
    } catch (err) {
      onError?.(err.message || "Failed to load daily production data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedBranchId]);

  // Active primary plan for today (or first one)
  const activePlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [plans]);

  // Consolidated dishes for the whole day
  // Maps all dishes from plans on this date, grouped by MenuItemId
  const dailyDishes = useMemo(() => {
    const dishMap = new Map();

    // 1. Add dishes from existing plans for the day
    for (const plan of plans) {
      if (plan.items && Array.isArray(plan.items)) {
        for (const item of plan.items) {
          const menuId = item.menuItemId;
          const menu = menuItems.find((m) => m.id === menuId);
          const dishName = item.dish || item.menuItemName || menu?.name || `Dish #${menuId}`;
          const category = menu?.category || "General";
          const price = menu?.price || 0;

          if (!dishMap.has(menuId)) {
            dishMap.set(menuId, {
              menuItemId: menuId,
              dish: dishName,
              category: category,
              price: price,
              plannedQuantity: Number(item.plannedQuantity || 0),
              actualSales: Number(item.actualSales || item.orderedQuantity || 0),
              actualQuantity: Number(item.actualQuantity || item.producedQuantity || 0),
              unit: item.unit || "Portion",
              planId: plan.id,
              planItemId: item.id
            });
          } else {
            // Aggregate if multiple plans exist
            const existing = dishMap.get(menuId);
            existing.plannedQuantity += Number(item.plannedQuantity || 0);
            existing.actualSales += Number(item.actualSales || item.orderedQuantity || 0);
            existing.actualQuantity += Number(item.actualQuantity || item.producedQuantity || 0);
          }
        }
      }
    }

    return Array.from(dishMap.values()).map((d) => {
      // Check if there are local unsaved pending edits
      const effectivePlanned = pendingTargets[d.menuItemId] !== undefined
        ? Number(pendingTargets[d.menuItemId])
        : d.plannedQuantity;

      // Difference for whole day = Target to Sell - Actually Sold
      const difference = effectivePlanned - d.actualSales;
      const isCompleted = difference <= 0 && effectivePlanned > 0;
      const isOverSold = difference < 0;

      let status = "Planned";
      if (isOverSold) {
        status = "Over Sold";
      } else if (isCompleted) {
        status = "Target Met / Sold Out";
      } else if (d.actualSales > 0) {
        status = "In Progress";
      }

      return {
        ...d,
        plannedQuantity: effectivePlanned,
        originalPlanned: d.plannedQuantity,
        difference: difference,
        remainingQuantity: Math.max(0, difference),
        status: status,
        salesPercent: effectivePlanned > 0
          ? Math.min(100, Math.round((d.actualSales / effectivePlanned) * 100))
          : 0
      };
    });
  }, [plans, menuItems, pendingTargets]);

  // Filtered dishes for search & category
  const filteredDishes = useMemo(() => {
    return dailyDishes.filter((d) => {
      const matchesSearch = !searchTerm || d.dish.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "All" || d.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [dailyDishes, searchTerm, categoryFilter]);

  // Categories list
  const availableCategories = useMemo(() => {
    const cats = new Set(["All"]);
    menuItems.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [menuItems]);

  // Whole Day Summary Totals
  const daySummary = useMemo(() => {
    const totalToSell = dailyDishes.reduce((sum, d) => sum + d.plannedQuantity, 0);
    const totalActuallySold = dailyDishes.reduce((sum, d) => sum + d.actualSales, 0);
    const totalProduced = dailyDishes.reduce((sum, d) => sum + d.actualQuantity, 0);
    const totalDifference = totalToSell - totalActuallySold;
    const overallRate = totalToSell > 0
      ? Math.min(100, Math.round((totalActuallySold / totalToSell) * 100))
      : 0;

    return {
      totalToSell,
      totalActuallySold,
      totalProduced,
      totalDifference,
      overallRate
    };
  }, [dailyDishes]);

  // Date Navigation Helpers
  function handlePrevDay() {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  }

  function handleNextDay() {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  }

  function handleToday() {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }

  // Live Sync POS Sales for all plans on this date
  async function handleSyncPOSSales() {
    if (!activePlan) {
      onError?.("No active plan to sync sales for on this date.");
      return;
    }
    setSyncingSales(true);
    try {
      for (const p of plans) {
        await api.syncSalesFromPOS(p.id);
      }
      await loadData(false);
      onSuccess?.("Live POS orders synced successfully!");
    } catch (err) {
      onError?.(err.message || "Failed to sync sales from POS orders.");
    } finally {
      setSyncingSales(false);
    }
  }

  // Handle changing target quantity inline
  function handleTargetChange(menuItemId, newQty) {
    const val = Math.max(0, Number(newQty) || 0);
    setPendingTargets((prev) => ({
      ...prev,
      [menuItemId]: val
    }));
    setIsDirty(true);
  }

  function handleAdjustStepper(menuItemId, currentVal, delta) {
    const newVal = Math.max(0, Number(currentVal || 0) + delta);
    handleTargetChange(menuItemId, newVal);
  }

  // Save All Target Changes
  async function handleSaveAllChanges() {
    if (dailyDishes.length === 0) return;
    setSavingPlan(true);

    try {
      const itemsPayload = dailyDishes.map((d) => ({
        menuItemId: d.menuItemId,
        plannedQuantity: pendingTargets[d.menuItemId] !== undefined
          ? Number(pendingTargets[d.menuItemId])
          : d.plannedQuantity,
        expectedSales: pendingTargets[d.menuItemId] !== undefined
          ? Number(pendingTargets[d.menuItemId])
          : d.plannedQuantity,
        actualQuantity: d.actualQuantity,
        actualSales: d.actualSales,
        unit: d.unit || "Portion"
      }));

      if (activePlan) {
        // Update existing plan
        await api.updateProductionPlan(activePlan.id, {
          planDate: selectedDate,
          items: itemsPayload
        });
        onSuccess?.("Daily production targets updated successfully!");
      } else {
        // Create new plan for this date
        await api.createProductionPlan({
          planDate: selectedDate,
          branchId: selectedBranchId ? Number(selectedBranchId) : undefined,
          kitchenName: "Main Kitchen",
          shift: "All Day",
          mealType: "General",
          items: itemsPayload
        });
        onSuccess?.("Daily production plan created successfully!");
      }

      await loadData(false);
    } catch (err) {
      onError?.(err.message || "Failed to save production plan changes.");
    } finally {
      setSavingPlan(false);
    }
  }

  // Discard pending edits
  function handleDiscardChanges() {
    setPendingTargets({});
    setIsDirty(false);
  }

  // Quick Add Single Dish
  async function handleQuickAddDish() {
    if (!quickDishId) {
      onError?.("Please select a dish to add to today's plan.");
      return;
    }
    const dishId = Number(quickDishId);
    const existing = dailyDishes.find((d) => d.menuItemId === dishId);
    if (existing) {
      onError?.("This dish is already in today's production plan.");
      return;
    }

    const dish = menuItems.find((m) => m.id === dishId);
    if (!dish) return;

    const targetQty = Number(quickTargetQty) > 0 ? Number(quickTargetQty) : 25;
    setSavingPlan(true);

    try {
      const updatedItems = [
        ...dailyDishes.map((d) => ({
          menuItemId: d.menuItemId,
          plannedQuantity: pendingTargets[d.menuItemId] !== undefined
            ? Number(pendingTargets[d.menuItemId])
            : d.plannedQuantity,
          expectedSales: d.plannedQuantity,
          actualQuantity: d.actualQuantity,
          actualSales: d.actualSales,
          unit: d.unit || "Portion"
        })),
        {
          menuItemId: dish.id,
          plannedQuantity: targetQty,
          expectedSales: targetQty,
          actualQuantity: 0,
          actualSales: 0,
          unit: "Portion"
        }
      ];

      if (activePlan) {
        await api.updateProductionPlan(activePlan.id, {
          planDate: selectedDate,
          items: updatedItems
        });
      } else {
        await api.createProductionPlan({
          planDate: selectedDate,
          branchId: selectedBranchId ? Number(selectedBranchId) : undefined,
          kitchenName: "Main Kitchen",
          shift: "All Day",
          mealType: "General",
          items: updatedItems
        });
      }

      setQuickDishId("");
      setQuickTargetQty(25);
      onSuccess?.(`Added '${dish.name}' (Target: ${targetQty}) to today's plan.`);
      await loadData(false);
      setShowAddProductionModal(false);
    } catch (err) {
      onError?.(err.message || "Failed to add dish to plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  // Remove Dish from Today's Plan
  async function handleRemoveDish(menuItemId, dishName) {
    if (!window.confirm(`Are you sure you want to remove '${dishName}' from today's plan?`)) {
      return;
    }
    setSavingPlan(true);
    try {
      const remainingItems = dailyDishes
        .filter((d) => d.menuItemId !== menuItemId)
        .map((d) => ({
          menuItemId: d.menuItemId,
          plannedQuantity: d.plannedQuantity,
          expectedSales: d.plannedQuantity,
          actualQuantity: d.actualQuantity,
          actualSales: d.actualSales,
          unit: d.unit || "Portion"
        }));

      if (activePlan) {
        await api.updateProductionPlan(activePlan.id, {
          planDate: selectedDate,
          items: remainingItems
        });
      }

      onSuccess?.(`Removed '${dishName}' from today's plan.`);
      await loadData(false);
    } catch (err) {
      onError?.(err.message || "Failed to remove dish.");
    } finally {
      setSavingPlan(false);
    }
  }

  // Open Multi-Select Modal
  function openMultiSelectModal() {
    const initialSelected = {};
    dailyDishes.forEach((d) => {
      initialSelected[d.menuItemId] = d.plannedQuantity;
    });
    setMultiSelectedDishes(initialSelected);
    setShowMultiSelectModal(true);
  }

  // Toggle multi-select dish
  function toggleMultiSelectDish(dishId, defaultQty = 25) {
    setMultiSelectedDishes((prev) => {
      const next = { ...prev };
      if (next[dishId] !== undefined) {
        delete next[dishId];
      } else {
        next[dishId] = defaultQty;
      }
      return next;
    });
  }

  // Save Multi-Selected Dishes to Plan
  async function handleSaveMultiSelectDishes() {
    const selectedIds = Object.keys(multiSelectedDishes).map(Number);
    if (selectedIds.length === 0) {
      onError?.("Please select at least one dish.");
      return;
    }

    setSavingPlan(true);
    try {
      const itemsPayload = selectedIds.map((id) => {
        const existing = dailyDishes.find((d) => d.menuItemId === id);
        const qty = Number(multiSelectedDishes[id]) > 0 ? Number(multiSelectedDishes[id]) : 20;
        return {
          menuItemId: id,
          plannedQuantity: qty,
          expectedSales: qty,
          actualQuantity: existing ? existing.actualQuantity : 0,
          actualSales: existing ? existing.actualSales : 0,
          unit: "Portion"
        };
      });

      if (activePlan) {
        await api.updateProductionPlan(activePlan.id, {
          planDate: selectedDate,
          items: itemsPayload
        });
      } else {
        await api.createProductionPlan({
          planDate: selectedDate,
          branchId: selectedBranchId ? Number(selectedBranchId) : undefined,
          kitchenName: "Main Kitchen",
          shift: "All Day",
          mealType: "General",
          items: itemsPayload
        });
      }

      setShowMultiSelectModal(false);
      onSuccess?.(`Updated plan with ${selectedIds.length} dishes.`);
      await loadData(false);
    } catch (err) {
      onError?.(err.message || "Failed to save selected dishes.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function checkDishProduceStock(menuItemId, qty) {
    if (!menuItemId || !qty || Number(qty) <= 0) {
      setProduceStockCheck(null);
      return;
    }
    setCheckingProduceStock(true);
    try {
      const res = await api.checkRecipeStock({
        branchId: selectedBranchId ? Number(selectedBranchId) : undefined,
        kitchenName: "Main Kitchen",
        items: [{ menuItemId: Number(menuItemId), quantity: Number(qty) }]
      });
      setProduceStockCheck(res);
    } catch {
      // ignore preview check errors
    } finally {
      setCheckingProduceStock(false);
    }
  }

  // Open Produce Modal (Kitchen batch cooking)
  function openProduceModal(dish) {
    const defaultQty = Math.max(1, dish.remainingQuantity || 5);
    setProduceForm({
      menuItemId: dish.menuItemId,
      menuItemName: dish.dish,
      actualQuantity: defaultQty,
      plannedQuantity: dish.plannedQuantity,
      alreadyProduced: dish.actualQuantity
    });
    setProduceStockCheck(null);
    setShowProduceModal(true);
    checkDishProduceStock(dish.menuItemId, defaultQty);
  }

  async function handleProduceSubmit(e) {
    e.preventDefault();
    if (!activePlan) return;
    setSavingPlan(true);
    try {
      await api.recordActualProduction(activePlan.id, {
        menuItemId: produceForm.menuItemId,
        quantity: Number(produceForm.actualQuantity)
      });
      setShowProduceModal(false);
      onSuccess?.(`Recorded ${produceForm.actualQuantity} portions of ${produceForm.menuItemName}. Ingredients consumed from Kitchen Stock.`);
      await loadData(false);
    } catch (err) {
      onError?.(err.message || "Failed to record production: Insufficient Kitchen Stock.");
      if (err.shortages) {
        setProduceStockCheck({
          isAvailable: false,
          shortages: err.shortages,
          message: err.message
        });
      }
    } finally {
      setSavingPlan(false);
    }
  }

  // Open Material Issue Modal
  function openIssueModal() {
    if (!activePlan) {
      onError?.("Please create or select today's plan first before issuing materials.");
      return;
    }
    const lines = inventoryItems.map((inv) => {
      const kStock = kitchenStocks.find((k) => k.inventoryItemId === inv.id);
      return {
        inventoryItemId: inv.id,
        itemName: inv.name,
        unit: inv.unit,
        centralStock: Number(inv.currentStock || 0),
        kitchenStock: Number(kStock?.currentStock || 0),
        issueQuantity: 0
      };
    });
    setIssueLines(lines);
    setShowIssueModal(true);
  }

  async function handleIssueSubmit(e) {
    e.preventDefault();
    const toIssue = issueLines.filter((l) => Number(l.issueQuantity) > 0);
    if (toIssue.length === 0) {
      onError?.("Please enter issue quantities greater than 0.");
      return;
    }
    setSavingPlan(true);
    try {
      await api.createMaterialIssue({
        branchId: selectedBranchId ? Number(selectedBranchId) : undefined,
        kitchenName: "Main Kitchen",
        department: "Kitchen",
        productionPlanId: activePlan.id,
        receivedByStaff: issueReceivedBy,
        notes: issueNotes || "Materials issued for daily production plan",
        items: toIssue.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          issuedQuantity: Number(l.issueQuantity),
          requestedQuantity: Number(l.issueQuantity)
        }))
      });
      setShowIssueModal(false);
      onSuccess?.(`Issued ${toIssue.length} ingredient item(s) to Kitchen Stock.`);
      await loadData(false);
    } catch (err) {
      onError?.(err.message || "Failed to create material issue.");
    } finally {
      setSavingPlan(false);
    }
  }

  // Open Material Return Modal
  function openReturnModal() {
    if (!activePlan) {
      onError?.("No active plan to return materials for.");
      return;
    }
    const lines = kitchenStocks.map((k) => {
      const inv = inventoryItems.find((i) => i.id === k.inventoryItemId);
      return {
        inventoryItemId: k.inventoryItemId,
        itemName: inv?.name || `Item #${k.inventoryItemId}`,
        unit: inv?.unit || "KG",
        kitchenStock: Number(k.currentStock || 0),
        returnedQuantity: 0
      };
    }).filter((l) => l.kitchenStock > 0);

    if (lines.length === 0) {
      onError?.("Kitchen Stock is empty. No materials available to return to store.");
      return;
    }

    setReturnLines(lines);
    setShowReturnModal(true);
  }

  async function handleReturnSubmit(e) {
    e.preventDefault();
    const toReturn = returnLines.filter((l) => Number(l.returnedQuantity) > 0);
    if (toReturn.length === 0) {
      onError?.("Please specify return quantities greater than 0.");
      return;
    }
    setSavingPlan(true);
    try {
      await api.createMaterialReturn({
        branchId: selectedBranchId ? Number(selectedBranchId) : undefined,
        kitchenName: "Main Kitchen",
        department: "Kitchen",
        productionPlanId: activePlan.id,
        reason: returnReason,
        notes: returnNotes || "Returned unused stock at end of shift",
        items: toReturn.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          returnedQuantity: Number(l.returnedQuantity)
        }))
      });
      setShowReturnModal(false);
      onSuccess?.(`Returned ${toReturn.length} item(s) from Kitchen to Central Store.`);
      await loadData(false);
    } catch (err) {
      onError?.(err.message || "Failed to process material return.");
    } finally {
      setSavingPlan(false);
    }
  }

  // Format date display
  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(selectedDate + "T00:00:00");
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", paddingBottom: "60px" }}>
      {/* 1. TOP HEADER & DATE BAR */}
      <div
        className="panel"
        style={{
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid var(--slate-200)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "var(--forest-900, #072518)",
                  background: "var(--brand-gold-light, #fbf6e8)",
                  border: "1px solid var(--brand-gold-border, #e6cb7e)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                Daily Production & Sales Plan
              </span>
              {activePlan && (
                <span style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 }}>
                  • Plan #{activePlan.planNumber || activePlan.id}
                </span>
              )}
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)" }}>
              {formattedDateTitle}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--slate-500)" }}>
              Select dishes, set target portions to sell, and track actual sales vs planned difference for the whole day.
            </p>
          </div>

          {/* Primary Action Button: + Add Production */}
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowAddProductionModal(true)}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.9rem",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            <Plus size={16} /> + Add Production
          </button>
        </div>

        {/* Date Selector Navigation & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", borderTop: "1px solid var(--slate-100)", paddingTop: "12px" }}>
          {!user.branchId && branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="compact-input"
              style={{ fontWeight: 600 }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <div style={{ display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid var(--slate-300)", borderRadius: "8px", padding: "2px" }}>
            <button
              className="icon-btn"
              onClick={handlePrevDay}
              title="Previous Day"
              style={{ padding: "6px 8px", borderRadius: "6px" }}
            >
              <ArrowLeft size={16} />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontWeight: 700,
                fontSize: "0.9rem",
                padding: "4px 8px",
                color: "var(--slate-800)",
                background: "transparent"
              }}
            />

            <button
              className="icon-btn"
              onClick={handleNextDay}
              title="Next Day"
              style={{ padding: "6px 8px", borderRadius: "6px" }}
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <button className="secondary-btn compact" onClick={handleToday} title="Jump to Today">
            Today
          </button>

          <button
            className="secondary-btn compact"
            onClick={handleSyncPOSSales}
            disabled={syncingSales || !activePlan}
            title="Sync latest customer orders and actual sales"
            style={{ fontWeight: 700, color: "var(--forest-900, #072518)" }}
          >
            <RefreshCw size={14} className={syncingSales ? "spin" : ""} />
            {syncingSales ? "Syncing Sales..." : "Sync POS Sales"}
          </button>

          <button
            className="secondary-btn compact"
            onClick={() => window.print()}
            title="Print Production Sheet"
          >
            <Printer size={14} /> Print
          </button>

          <button
            className="secondary-btn compact"
            onClick={() => setShowKitchenDrawer(!showKitchenDrawer)}
            title="Toggle Material Issues & Kitchen Stock"
            style={{
              background: showKitchenDrawer ? "var(--brand-gold-light, #fbf6e8)" : undefined,
              borderColor: showKitchenDrawer ? "var(--brand-gold, #c99824)" : undefined,
              color: showKitchenDrawer ? "var(--forest-900, #072518)" : undefined
            }}
          >
            <Boxes size={14} /> Kitchen Inventory
          </button>
        </div>
      </div>

      {/* 4. THE SIMPLE MASTER TABLE: TARGET TO SELL | ACTUALLY SOLD | DIFFERENCE */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table Toolbar */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--slate-200)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--slate-400)" }} />
              <input
                type="text"
                placeholder="Search dish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="compact-input"
                style={{ paddingLeft: "28px", width: "180px" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
              <Filter size={14} style={{ color: "var(--slate-400)" }} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="compact-input"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-600)", fontWeight: 600 }}>
              Showing {filteredDishes.length} of {dailyDishes.length} Dishes
            </span>
            {isDirty && (
              <button
                className="primary-btn compact"
                onClick={handleSaveAllChanges}
                disabled={savingPlan}
                style={{ background: "#059669" }}
              >
                <Save size={14} /> {savingPlan ? "Saving..." : "Save Targets"}
              </button>
            )}
          </div>
        </div>

        {/* Table Body */}
        {filteredDishes.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", background: "#ffffff" }}>
            <UtensilsCrossed size={42} style={{ margin: "0 auto 12px", color: "var(--slate-300)" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "var(--slate-800)" }}>
              No Dishes in Production Plan for {selectedDate}
            </h3>
            <p style={{ color: "var(--slate-500)", margin: "0 0 16px", fontSize: "0.88rem" }}>
              Select dishes from your menu and set how many portions you plan to sell today.
            </p>
            <button className="primary-btn" onClick={openMultiSelectModal}>
              <Plus size={16} /> Select Dishes to Start Today's Plan
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: "0.92rem", width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--brand-gold-border, rgba(201, 152, 36, 0.3))" }}>
                  <th style={{ width: "40px", textAlign: "center" }}>#</th>
                  <th>Dish Name</th>
                  <th style={{ textAlign: "center", width: "180px", color: "var(--brand-gold-light, #fbf6e8)" }}>
                    To Be Sold (Target)
                  </th>
                  <th style={{ textAlign: "center", width: "140px", color: "var(--brand-gold, #c99824)" }}>
                    Actually Sold
                  </th>
                  <th style={{ textAlign: "center", width: "160px" }}>
                    Difference
                  </th>
                  <th style={{ width: "140px", textAlign: "center" }}>Progress</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Status</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map((item, idx) => {
                  const isPending = pendingTargets[item.menuItemId] !== undefined &&
                    pendingTargets[item.menuItemId] !== item.originalPlanned;

                  return (
                    <tr
                      key={item.menuItemId}
                      style={{
                        borderBottom: "1px solid var(--slate-100)",
                        background: isPending ? "rgba(254, 243, 199, 0.25)" : undefined,
                        transition: "background 0.2s"
                      }}
                    >
                      {/* # */}
                      <td style={{ textAlign: "center", color: "var(--slate-400)", fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Dish Name & Info */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.dish}
                              style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--slate-200)" }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                background: "#f1f5f9",
                                border: "1px dashed #cbd5e1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#94a3b8",
                                flexShrink: 0
                              }}
                            >
                              <UtensilsCrossed size={16} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--slate-900)", fontSize: "0.95rem" }}>
                              {item.dish}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "var(--slate-500)", display: "flex", gap: "6px", alignItems: "center" }}>
                              <span>{item.category}</span>
                              <span>•</span>
                              <span style={{ fontWeight: 600, color: "var(--slate-700)" }}>₹{item.price}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* HOW MANY TO BE SOLD (TARGET) */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleAdjustStepper(item.menuItemId, item.plannedQuantity, -5)}
                            className="icon-btn"
                            title="Decrease target by 5"
                            style={{ width: "26px", height: "26px", borderRadius: "4px", border: "1px solid var(--slate-300)", background: "#ffffff" }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.plannedQuantity}
                            onChange={(e) => handleTargetChange(item.menuItemId, e.target.value)}
                            style={{
                              width: "65px",
                              padding: "4px 6px",
                              textAlign: "center",
                              fontWeight: 800,
                              fontSize: "1rem",
                              borderRadius: "6px",
                              border: isPending ? "2px solid #d97706" : "1px solid var(--slate-300)",
                              background: isPending ? "#fffbeb" : "#ffffff",
                              color: "var(--forest-900, #072518)"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustStepper(item.menuItemId, item.plannedQuantity, 5)}
                            className="icon-btn"
                            title="Increase target by 5"
                            style={{ width: "26px", height: "26px", borderRadius: "4px", border: "1px solid var(--slate-300)", background: "#ffffff" }}
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* HOW MANY ACTUALLY SOLD */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--brand-gold-active, #966e12)" }}>
                            {item.actualSales}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                            sold
                          </span>
                        </div>
                      </td>

                      {/* DIFFERENCE FOR WHOLE DAY */}
                      <td style={{ textAlign: "center" }}>
                        {item.difference > 0 ? (
                          <span
                            style={{
                              display: "inline-block",
                              fontWeight: 800,
                              fontSize: "0.88rem",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              background: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a"
                            }}
                          >
                            +{item.difference} remaining
                          </span>
                        ) : item.difference === 0 ? (
                          <span
                            style={{
                              display: "inline-block",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              background: "#dcfce7",
                              color: "#15803d",
                              border: "1px solid #bbf7d0"
                            }}
                          >
                            Target Met (0)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              background: "var(--forest-50, #f0f7f3)",
                              color: "var(--forest-800, #0e3826)",
                              border: "1px solid var(--forest-200, #a8d5be)"
                            }}
                          >
                            Over Sold (+{Math.abs(item.difference)})
                          </span>
                        )}
                      </td>

                      {/* Progress Bar */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", fontWeight: 700, color: "var(--slate-600)" }}>
                            <span>{item.actualSales} / {item.plannedQuantity}</span>
                            <span>{item.salesPercent}%</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${item.salesPercent}%`,
                                height: "100%",
                                background: item.difference <= 0 ? "var(--success-500, #10b981)" : "var(--brand-gold, #c99824)",
                                borderRadius: "3px"
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: "center" }}>
                        <span
                          className="role-chip"
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: "12px",
                            background:
                              item.difference <= 0
                                ? "rgba(16, 185, 129, 0.15)"
                                : item.actualSales > 0
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(201, 152, 36, 0.15)",
                            color:
                              item.difference <= 0
                                ? "#059669"
                                : item.actualSales > 0
                                ? "#b45309"
                                : "var(--brand-gold-active, #966e12)"
                          }}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => openProduceModal(item)}
                            title="Record kitchen cooked portions"
                            style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                          >
                            <ChefHat size={13} /> Cook
                          </button>

                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleRemoveDish(item.menuItemId, item.dish)}
                            title="Remove dish from plan"
                            style={{ padding: "4px 6px", color: "#dc2626" }}
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* 5. STICKY FLOATING UN-SAVED EDITS BAR */}
      {isDirty && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--forest-900, #072518)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "30px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
            zIndex: 100,
            border: "1px solid var(--border-gold, rgba(201, 152, 36, 0.4))"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              You have modified dish target quantities.
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="primary-btn compact"
              onClick={handleSaveAllChanges}
              disabled={savingPlan}
              style={{ background: "#10b981", borderRadius: "20px", padding: "6px 16px" }}
            >
              <Check size={15} /> {savingPlan ? "Saving..." : "Save All Changes"}
            </button>
            <button
              className="secondary-btn compact"
              onClick={handleDiscardChanges}
              style={{ borderRadius: "20px", color: "#e2e8f0", borderColor: "#475569" }}
            >
              <X size={15} /> Discard
            </button>
          </div>
        </div>
      )}

      {/* 6. ADVANCED KITCHEN TOOLS & MATERIAL ISSUE/RETURN SECTION (COLLAPSIBLE) */}
      {showKitchenDrawer && (
        <div
          className="panel"
          style={{
            padding: "20px",
            border: "1.5px solid var(--brand-gold, #c99824)",
            background: "var(--bg-surface)",
            borderRadius: "12px",
            boxShadow: "var(--card-shadow)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>KITCHEN INVENTORY INTEGRATION</span>
              <h3 style={{ margin: "2px 0 0", fontSize: "1.15rem", color: "var(--forest-900, #072518)" }}>
                Material Issue (Store → Kitchen) & Stock Return (Kitchen → Store)
              </h3>
            </div>
            <button className="icon-btn" onClick={() => setShowKitchenDrawer(false)}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button
              className="primary-btn"
              onClick={openIssueModal}
            >
              <ArrowDownToLine size={16} /> Issue Ingredients (Store → Kitchen)
            </button>
            <button
              className="secondary-btn"
              onClick={openReturnModal}
              style={{ borderColor: "#d97706", color: "#b45309" }}
            >
              <ArrowUpFromLine size={16} /> Return Unused Materials (Kitchen → Store)
            </button>
          </div>

          {/* Real-time Kitchen Stock Mini Overview */}
          <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid var(--slate-200)" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>
              Real-Time Kitchen Stock Level ({kitchenStocks.length} items present in kitchen)
            </h4>
            {kitchenStocks.length === 0 ? (
              <p style={{ color: "var(--slate-500)", margin: 0, fontSize: "0.85rem" }}>
                No raw materials currently stored in Kitchen Stock. Use "Issue Ingredients" to send stock from Central Store to Kitchen.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                {kitchenStocks.map((k) => {
                  const inv = inventoryItems.find((i) => i.id === k.inventoryItemId);
                  return (
                    <div
                      key={k.id || k.inventoryItemId}
                      style={{
                        padding: "8px 12px",
                        background: "#f1f5f9",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--slate-800)" }}>
                        {inv?.name || `Item #${k.inventoryItemId}`}
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
                        {Number(k.currentStock || 0).toFixed(2)}{" "}
                        <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>{inv?.unit || "KG"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BOTTOM SUMMARY SECTION: WHOLE DAY KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {/* Card 1: Target to Sell (Planned) */}
        <div
          className="panel"
          style={{
            padding: "16px 20px",
            borderLeft: "5px solid var(--brand-gold, #c99824)",
            background: "var(--bg-surface)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
              Dishes To Sell (Planned)
            </span>
            <UtensilsCrossed size={18} style={{ color: "var(--brand-gold, #c99824)" }} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--forest-900, #072518)", marginTop: "4px" }}>
            {daySummary.totalToSell}
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--slate-500)", marginLeft: "6px" }}>portions</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "4px" }}>
            Total target scheduled for whole day
          </div>
        </div>

        {/* Card 2: Actually Sold */}
        <div
          className="panel"
          style={{
            padding: "16px 20px",
            borderLeft: "5px solid var(--brand-gold, #c99824)",
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
              Actually Sold
            </span>
            <ShoppingBag size={18} style={{ color: "var(--brand-gold, #c99824)" }} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--brand-gold-active, #966e12)", marginTop: "4px" }}>
            {daySummary.totalActuallySold}
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--slate-500)", marginLeft: "6px" }}>portions</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "4px" }}>
            Live customer orders from POS
          </div>
        </div>

        {/* Card 3: Difference for Whole Day */}
        <div
          className="panel"
          style={{
            padding: "16px 20px",
            borderLeft: `5px solid ${daySummary.totalDifference > 0 ? "#f59e0b" : daySummary.totalDifference === 0 ? "#10b981" : "#ef4444"}`,
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
              Difference (Whole Day)
            </span>
            <TrendingUp size={18} style={{ color: daySummary.totalDifference > 0 ? "#f59e0b" : "#10b981" }} />
          </div>
          <div
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: daySummary.totalDifference > 0 ? "#b45309" : daySummary.totalDifference === 0 ? "#047857" : "#b91c1c",
              marginTop: "4px"
            }}
          >
            {daySummary.totalDifference > 0 ? `+${daySummary.totalDifference}` : daySummary.totalDifference}
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--slate-500)", marginLeft: "6px" }}>
              {daySummary.totalDifference > 0 ? "portions remaining" : daySummary.totalDifference === 0 ? "target met" : "over target"}
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "4px" }}>
            Target to Sell minus Actually Sold
          </div>
        </div>

        {/* Card 4: Day Completion Rate */}
        <div
          className="panel"
          style={{
            padding: "16px 20px",
            borderLeft: "5px solid #10b981",
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
              Sales Completion
            </span>
            <CheckCircle2 size={18} style={{ color: "#10b981" }} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#065f46", marginTop: "4px" }}>
            {daySummary.overallRate}%
          </div>
          <div style={{ marginTop: "6px", width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
            <div
              style={{
                width: `${daySummary.overallRate}%`,
                height: "100%",
                background: daySummary.overallRate >= 100 ? "#10b981" : "var(--brand-gold, #c99824)",
                borderRadius: "3px",
                transition: "width 0.4s ease"
              }}
            />
          </div>
        </div>
      </div>

      {/* MODAL: ADD PRODUCTION POPUP */}
      {showAddProductionModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddProductionModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "16px",
            animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
              width: "100%",
              maxWidth: "640px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderTop: "4px solid #059669",
              animation: "slideInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--slate-100)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "#059669",
                      background: "rgba(5, 150, 105, 0.12)",
                      border: "1px solid rgba(5, 150, 105, 0.25)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}
                  >
                    Production Target
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#064e3b",
                    letterSpacing: "-0.01em"
                  }}
                >
                  ADD PRODUCTION
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "0.83rem", color: "var(--slate-500)" }}>
                  Add dishes to today's production plan
                </p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddProductionModal(false)}
                aria-label="Close modal"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "1px solid var(--slate-200)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--slate-500)",
                  background: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "22px 24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                background: "#ffffff"
              }}
            >
              {/* Context Description */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)",
                  border: "1px solid rgba(5, 150, 105, 0.15)",
                  borderRadius: "10px",
                  padding: "14px 16px"
                }}
              >
                <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 700, color: "#065f46" }}>
                  Dishes To Be Sold for Whole Day
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--slate-600)", lineHeight: 1.45 }}>
                  Pick dishes and specify how many portions should be produced today.
                </p>
              </div>

              {/* Quick Add Form Section */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  padding: "16px 18px",
                  borderRadius: "10px",
                  border: "1px solid var(--slate-200)",
                  background: "#f8fafc"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--slate-800)",
                      marginBottom: "6px"
                    }}
                  >
                    Quick Add Dish
                  </label>
                  <select
                    value={quickDishId}
                    onChange={(e) => setQuickDishId(e.target.value)}
                    className="compact-input"
                    style={{
                      width: "100%",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--slate-300)"
                    }}
                  >
                    <option value="">-- Choose a Dish from Menu --</option>
                    {menuItems.map((m) => {
                      const inPlan = dailyDishes.some((d) => d.menuItemId === m.id);
                      return (
                        <option key={m.id} value={m.id} disabled={inPlan}>
                          {m.name} ({m.category || "General"}) - ₹{m.price} {inPlan ? "✓ (in plan)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--slate-800)",
                      marginBottom: "6px"
                    }}
                  >
                    Target Quantity
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quickTargetQty}
                      onChange={(e) => setQuickTargetQty(Number(e.target.value) || 1)}
                      style={{
                        width: "100px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--slate-300)",
                        fontWeight: 800,
                        fontSize: "1.05rem",
                        textAlign: "center",
                        color: "var(--forest-900, #072518)",
                        background: "#ffffff"
                      }}
                    />
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--slate-600)" }}>
                      portions
                    </span>
                  </div>
                </div>
              </div>

              {/* Bulk Multi-Select Button Option */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#ffffff",
                  border: "1px dashed var(--slate-300)",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--slate-800)", display: "block" }}>
                    Bulk Selection
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--slate-500)" }}>
                    Select multiple menu dishes in bulk
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-btn compact"
                  onClick={() => {
                    setShowAddProductionModal(false);
                    openMultiSelectModal();
                  }}
                  style={{
                    fontWeight: 700,
                    borderColor: "#059669",
                    color: "#059669",
                    background: "rgba(5, 150, 105, 0.06)",
                    padding: "6px 14px"
                  }}
                >
                  <Plus size={14} /> + Select Multiple Dishes
                </button>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--slate-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                background: "linear-gradient(180deg, #ffffff 0%, #fafbfb 100%)"
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowAddProductionModal(false)}
                disabled={savingPlan}
                style={{ padding: "8px 18px", borderRadius: "8px", fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={handleQuickAddDish}
                disabled={!quickDishId || savingPlan}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#ffffff",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  border: "none",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Plus size={15} /> {savingPlan ? "Adding..." : "Add to Today's Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Multi-Dish Selector */}
      {showMultiSelectModal && (
        <div className="modal-backdrop">
          <div className="modal-card wide" style={{ maxWidth: "780px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>SELECT DISHES FOR TODAY</span>
                <h3 style={{ margin: "2px 0 0" }}>Pick Menu Dishes & Set Daily Target</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowMultiSelectModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--slate-200)", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
                <Search size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--slate-400)" }} />
                <input
                  type="text"
                  placeholder="Filter dishes..."
                  value={multiSearchTerm}
                  onChange={(e) => setMultiSearchTerm(e.target.value)}
                  className="compact-input"
                  style={{ paddingLeft: "28px", width: "100%" }}
                />
              </div>

              <select
                value={multiCategoryFilter}
                onChange={(e) => setMultiCategoryFilter(e.target.value)}
                className="compact-input"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--slate-700)" }}>
                Selected: {Object.keys(multiSelectedDishes).length}
              </span>
            </div>

            {/* Dishes Grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
              {menuItems
                .filter((m) => {
                  const matchesSearch = !multiSearchTerm || m.name.toLowerCase().includes(multiSearchTerm.toLowerCase());
                  const matchesCategory = multiCategoryFilter === "All" || m.category === multiCategoryFilter;
                  return matchesSearch && matchesCategory;
                })
                .map((m) => {
                  const isChecked = multiSelectedDishes[m.id] !== undefined;
                  const targetQty = multiSelectedDishes[m.id] || 25;

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMultiSelectDish(m.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: isChecked ? "2px solid var(--brand-gold, #c99824)" : "1px solid var(--border-default)",
                        background: isChecked ? "var(--brand-gold-light, #fbf6e8)" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        transition: "all 0.15s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: "pointer" }}
                          />
                          <strong style={{ fontSize: "0.92rem", color: "var(--slate-900)" }}>{m.name}</strong>
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--slate-600)" }}>
                          ₹{m.price}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                        {m.category || "General"}
                      </div>

                      {isChecked && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginTop: "4px",
                            paddingTop: "6px",
                            borderTop: "1px dashed #cbd5e1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Target:</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={targetQty}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              setMultiSelectedDishes((prev) => ({
                                ...prev,
                                [m.id]: val
                              }));
                            }}
                            style={{ width: "65px", padding: "2px 6px", textAlign: "center", fontWeight: 700, borderRadius: "4px", border: "1px solid #94a3b8" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ padding: "14px 18px", borderTop: "1px solid var(--slate-200)" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowMultiSelectModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveMultiSelectDishes}
                disabled={savingPlan || Object.keys(multiSelectedDishes).length === 0}
              >
                {savingPlan ? "Saving Plan..." : `Add ${Object.keys(multiSelectedDishes).length} Selected Dishes to Plan`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Batch Cooked Portions (Chef/Kitchen) */}
      {showProduceModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "460px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#059669" }}>KITCHEN PRODUCTION</span>
                <h3 style={{ margin: "2px 0 0" }}>Record Dish Cooked / Produced</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowProduceModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProduceSubmit} className="form-stack">
              <div style={{ padding: "12px", background: "var(--slate-50)", borderRadius: "8px", border: "1px solid var(--slate-200)" }}>
                <strong style={{ fontSize: "1.1rem", color: "var(--slate-900)" }}>{produceForm.menuItemName}</strong>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.85rem", color: "var(--slate-600)" }}>
                  <span>Target to Sell: <strong>{produceForm.plannedQuantity} portions</strong></span>
                  <span>Already Produced: <strong>{produceForm.alreadyProduced} portions</strong></span>
                </div>
              </div>

              <label className="field">
                <span>Portions Cooked Now *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={produceForm.actualQuantity}
                  onChange={(e) => {
                    const newQty = Number(e.target.value);
                    setProduceForm({ ...produceForm, actualQuantity: newQty });
                    checkDishProduceStock(produceForm.menuItemId, newQty);
                  }}
                  style={{ fontSize: "1.2rem", fontWeight: 800, textAlign: "center" }}
                />
              </label>

              <div className="recipe-formula-banner" style={{ padding: "8px 12px", fontSize: "12px", margin: "4px 0" }}>
                <span>📐 <strong>Formula:</strong> Required Ingredient Quantity = Recipe Quantity × {produceForm.actualQuantity || 1} Portions</span>
              </div>

              {checkingProduceStock && (
                <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--slate-500)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <RefreshCw size={14} className="spin" /> Checking Kitchen Stock availability...
                </div>
              )}

              {/* INSUFFICIENT STOCK DISPLAY */}
              {produceStockCheck && !produceStockCheck.isAvailable && produceStockCheck.shortages?.length > 0 && (
                <div className="recipe-shortage-box">
                  <div className="recipe-shortage-title">
                    <AlertTriangle size={18} /> Insufficient Kitchen Stock
                  </div>
                  <p className="shortage-helper-text" style={{ margin: "0 0 10px 0" }}>
                    Production cannot be confirmed. Insufficient stock in Kitchen:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {produceStockCheck.shortages.map((s, idx) => (
                      <div key={idx} className="recipe-shortage-card">
                        <div className="shortage-card-name">
                          {s.ingredientName || s.IngredientName || s.itemName || "Ingredient"}
                        </div>
                        <div className="shortage-card-grid">
                          <div>
                            <span className="shortage-label">Required: </span>
                            <strong className="shortage-val-req">{s.requiredFormatted || s.formattedRequired || `${s.requiredQuantity || s.required} ${s.unit}`}</strong>
                          </div>
                          <div>
                            <span className="shortage-label">Available: </span>
                            <strong className="shortage-val-avail">{s.availableFormatted || s.formattedAvailable || `${s.availableQuantity || s.available} ${s.unit}`}</strong>
                          </div>
                          <div>
                            <span className="shortage-label">Shortage: </span>
                            <strong className="shortage-val-diff">{s.shortageFormatted || s.formattedShortage || `${s.shortageQuantity || s.shortage} ${s.unit}`}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUFFICIENT STOCK BADGE */}
              {produceStockCheck && produceStockCheck.isAvailable && produceStockCheck.requirements?.length > 0 && (
                <div className="recipe-safe-banner" style={{ padding: "10px 14px", margin: "8px 0", fontSize: "12px" }}>
                  <CheckCircle2 size={16} /> Sufficient Kitchen Stock available for all {produceStockCheck.requirements.length} recipe ingredients.
                </div>
              )}

              <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                💡 Recipe ingredients will automatically be consumed from <strong>Kitchen Stock</strong> as an atomic transaction.
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowProduceModal(false)} disabled={savingPlan}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingPlan || checkingProduceStock || (produceStockCheck && !produceStockCheck.isAvailable)}
                  style={{ background: produceStockCheck && !produceStockCheck.isAvailable ? "#94a3b8" : "#059669" }}
                >
                  {savingPlan ? "Recording..." : "Confirm Cooked Portions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Material Issue (Store -> Kitchen) */}
      {showIssueModal && (
        <div className="modal-backdrop">
          <div className="modal-card wide" style={{ maxWidth: "760px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-gold, #c99824)" }}>STORE → KITCHEN MATERIAL ISSUE</span>
                <h3 style={{ margin: "2px 0 0" }}>Issue Raw Materials to Kitchen</h3>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setShowIssueModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="form-stack">
              <div className="two-col">
                <label className="field">
                  <span>Received By</span>
                  <input
                    type="text"
                    value={issueReceivedBy}
                    onChange={(e) => setIssueReceivedBy(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <input
                    type="text"
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    placeholder="e.g. Morning shift raw ingredients"
                  />
                </label>
              </div>

              <div className="table-wrap" style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table className="data-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Material / Ingredient</th>
                      <th style={{ textAlign: "right" }}>Store Stock</th>
                      <th style={{ textAlign: "right" }}>Kitchen Stock</th>
                      <th style={{ textAlign: "right", width: "130px" }}>Issue Qty *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueLines.map((line, idx) => (
                      <tr key={line.inventoryItemId}>
                        <td><strong>{line.itemName}</strong></td>
                        <td style={{ textAlign: "right" }}>{line.centralStock.toFixed(2)} {line.unit}</td>
                        <td style={{ textAlign: "right", color: "#059669", fontWeight: 700 }}>
                          {line.kitchenStock.toFixed(2)} {line.unit}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            max={line.centralStock}
                            step="0.01"
                            value={line.issueQuantity}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setIssueLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, issueQuantity: val } : l))
                              );
                            }}
                            style={{ width: "90px", padding: "4px 8px", textAlign: "right", fontWeight: 700 }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowIssueModal(false)} disabled={savingPlan}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={savingPlan}>
                  {savingPlan ? "Issuing..." : "Confirm Material Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Material Return (Kitchen -> Store) */}
      {showReturnModal && (
        <div className="modal-backdrop">
          <div className="modal-card wide" style={{ maxWidth: "760px" }}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: "#d97706" }}>KITCHEN → STORE MATERIAL RETURN</span>
                <h3 style={{ margin: "2px 0 0" }}>Return Unused Materials to Store</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowReturnModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="form-stack">
              <div className="two-col">
                <label className="field">
                  <span>Return Reason</span>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="Unused Product / Shift End Return">Unused Product / Shift End Return</option>
                    <option value="Excess Issued Stock">Excess Issued Stock</option>
                    <option value="Cancelled Production">Cancelled Production</option>
                  </select>
                </label>

                <label className="field">
                  <span>Return Notes</span>
                  <input
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </label>
              </div>

              <div className="table-wrap" style={{ maxHeight: "280px", overflowY: "auto" }}>
                <table className="data-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Material / Ingredient</th>
                      <th style={{ textAlign: "right" }}>Kitchen Stock</th>
                      <th style={{ textAlign: "right", width: "130px" }}>Return Qty *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnLines.map((line, idx) => (
                      <tr key={line.inventoryItemId}>
                        <td><strong>{line.itemName}</strong></td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>
                          {line.kitchenStock.toFixed(2)} {line.unit}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            max={line.kitchenStock}
                            step="0.01"
                            value={line.returnedQuantity}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setReturnLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, returnedQuantity: val } : l))
                              );
                            }}
                            style={{ width: "90px", padding: "4px 8px", textAlign: "right", fontWeight: 700 }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowReturnModal(false)} disabled={savingPlan}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={savingPlan} style={{ background: "#d97706" }}>
                  {savingPlan ? "Returning..." : "Confirm Return to Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
