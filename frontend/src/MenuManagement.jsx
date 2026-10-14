import { useEffect, useMemo, useState } from "react";
import {
  Utensils,
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Package,
  Layers,
  ChevronRight,
  Filter,
  RefreshCw,
  Info,
  Check,
  AlertCircle,
  Globe,
  Image,
  ImageOff
} from "lucide-react";
import { api } from "./api";
import { getDishImage } from "./dishImages";
import FoodImageWebInput from "./FoodImageWebInput";

const CATEGORIES = [
  "Main Course",
  "Starters",
  "Biryani",
  "Curries",
  "Breads",
  "Rice",
  "Desserts",
  "Beverages",
  "Snacks",
  "Combos"
];

const COMMON_UNITS = ["g", "kg", "ml", "l", "pcs", "cup", "tbsp", "tsp", "portion"];

export default function MenuManagement({
  user,
  embeddedBranchId = null,
  branches: propBranches = null,
  canManage: propCanManage = null,
  onError: propOnError = null,
  onSuccess: propOnSuccess = null,
  isKitchenModule = false
}) {
  const [menu, setMenu] = useState([]);
  const [branches, setBranches] = useState(propBranches || []);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Branch resolution
  const effectiveBranchId = embeddedBranchId !== null && embeddedBranchId !== undefined
    ? String(embeddedBranchId)
    : (user.branchId ? String(user.branchId) : "");

  const [selectedBranch, setSelectedBranch] = useState(effectiveBranchId);

  // Permission check
  const canManage = propCanManage !== null
    ? propCanManage
    : ["Organization Admin", "Branch Manager", "Kitchen Manager"].includes(user.role);

  // Filters & search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [recipeFilter, setRecipeFilter] = useState("ALL"); // ALL, ADDED, NOT_ADDED

  // Messages
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const notifySuccess = (msg) => {
    setMessage(msg);
    if (propOnSuccess) propOnSuccess(msg);
    setTimeout(() => setMessage(""), 5000);
  };

  const notifyError = (err) => {
    setError(err);
    if (propOnError) propOnError(err);
    setTimeout(() => setError(""), 6000);
  };

  // Modals state
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [viewingFood, setViewingFood] = useState(null);

  // Recipe Modal state
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeFood, setRecipeFood] = useState(null);
  const [recipeData, setRecipeData] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState([]);
  const [recipeModalError, setRecipeModalError] = useState("");
  const [recipeModalMessage, setRecipeModalMessage] = useState("");

  // Prepare Food Modal state
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [prepareFoodItem, setPrepareFoodItem] = useState(null);
  const [prepareQuantity, setPrepareQuantity] = useState(1);
  const [prepareNotes, setPrepareNotes] = useState("");
  const [prepareStockCheck, setPrepareStockCheck] = useState(null);
  const [prepareChecking, setPrepareChecking] = useState(false);
  const [prepareSubmitting, setPrepareSubmitting] = useState(false);
  const [prepareError, setPrepareError] = useState("");
  const [prepareSuccess, setPrepareSuccess] = useState("");

  // Food Form State
  const initialFoodForm = {
    branchId: selectedBranch || (user.branchId ? String(user.branchId) : ""),
    name: "",
    category: "Main Course",
    price: "",
    description: "",
    code: "",
    imageUrl: "",
    isActive: true
  };
  const [foodForm, setFoodForm] = useState(initialFoodForm);
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [showPhotosInMenu, setShowPhotosInMenu] = useState(true);

  // Keep branch in sync
  useEffect(() => {
    if (embeddedBranchId !== null && embeddedBranchId !== undefined) {
      setSelectedBranch(String(embeddedBranchId));
    }
  }, [embeddedBranchId]);

  // Load menu items, branches, and inventory items
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const activeBranch = selectedBranch ? Number(selectedBranch) : (user.branchId ? Number(user.branchId) : undefined);
      
      const fetchBranches = propBranches && propBranches.length > 0 
        ? Promise.resolve(propBranches) 
        : api.getBranches();

      const [menuList, branchList, invItems] = await Promise.all([
        api.getMenu(activeBranch),
        fetchBranches,
        api.getInventoryItems(activeBranch ? { branchId: activeBranch } : {})
      ]);

      setMenu(menuList || []);
      if (!propBranches || propBranches.length === 0) {
        setBranches(branchList || []);
      }
      setInventoryItems(invItems || []);
    } catch (e) {
      notifyError(e.message || "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  // 1. CREATE FOOD HANDLER (pure food creation - no recipe forced)
  async function handleCreateFood(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const branchToUse = user.branchId 
      ? Number(user.branchId) 
      : (foodForm.branchId ? Number(foodForm.branchId) : (selectedBranch ? Number(selectedBranch) : branches[0]?.id));

    if (!branchToUse) {
      notifyError("Please select a branch for this food item.");
      return;
    }

    if (!foodForm.name.trim()) {
      notifyError("Food name is required.");
      return;
    }

    if (!foodForm.price || Number(foodForm.price) <= 0) {
      notifyError("Please enter a valid selling price greater than 0.");
      return;
    }

    try {
      await api.createMenuItem({
        branchId: branchToUse,
        name: foodForm.name.trim(),
        category: foodForm.category,
        price: Number(foodForm.price),
        description: foodForm.description?.trim() || null,
        code: foodForm.code?.trim() || null,
        imageUrl: foodForm.imageUrl?.trim() || null,
        isActive: foodForm.isActive !== false
      });

      const createdFoodName = foodForm.name.trim();
      notifySuccess(`"${createdFoodName}" created successfully! You can now select this food and add its recipe.`);
      setShowAddFoodModal(false);
      setFoodForm({
        ...initialFoodForm,
        branchId: selectedBranch || (user.branchId ? String(user.branchId) : "")
      });
      await loadData();
    } catch (e) {
      notifyError(e.message || "Failed to create food item.");
    }
  }

  // 2. EDIT FOOD DETAILS HANDLER
  async function handleUpdateFood(e) {
    e.preventDefault();
    if (!editingFoodId) return;

    try {
      await api.updateMenuItem(editingFoodId, {
        name: foodForm.name.trim(),
        category: foodForm.category,
        price: Number(foodForm.price),
        description: foodForm.description?.trim() || null,
        code: foodForm.code?.trim() || null,
        imageUrl: foodForm.imageUrl?.trim() || null,
        isActive: foodForm.isActive !== false
      });

      notifySuccess(`"${foodForm.name.trim()}" updated successfully.`);
      setShowEditFoodModal(false);
      setEditingFoodId(null);
      await loadData();
    } catch (e) {
      notifyError(e.message || "Failed to update food item.");
    }
  }

  // 3. DELETE FOOD HANDLER
  async function handleDeleteFood(food) {
    if (!window.confirm(`Are you sure you want to delete "${food.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteMenuItem(food.id);
      notifySuccess(`"${food.name}" deleted successfully.`);
      await loadData();
    } catch (e) {
      notifyError(e.message || "Failed to delete food item.");
    }
  }

  // Remove Photo from Food Item (Optional photo feature)
  async function handleRemoveFoodPhoto(foodId, foodName) {
    if (!window.confirm(`Are you sure you want to remove the photo for "${foodName}"? (Photos in menu are optional)`)) {
      return;
    }
    try {
      if (api.deleteMenuItemImage) {
        await api.deleteMenuItemImage(foodId);
      } else {
        await api.updateMenuItem(foodId, { imageUrl: null });
      }
      notifySuccess(`Photo removed for "${foodName}".`);
      await loadData();
      if (viewingFood && viewingFood.id === foodId) {
        setViewingFood((prev) => (prev ? { ...prev, imageUrl: null } : null));
      }
      if (editingFoodId === foodId) {
        setFoodForm((prev) => ({ ...prev, imageUrl: "" }));
      }
    } catch (e) {
      notifyError(e.message || "Failed to remove photo.");
    }
  }

  // 4. OPEN RECIPE MODAL FOR SELECTED FOOD
  async function handleOpenRecipe(food) {
    setRecipeFood(food);
    setShowRecipeModal(true);
    setRecipeLoading(true);
    setRecipeModalError("");
    setRecipeModalMessage("");
    setIsEditingRecipe(false);

    try {
      const res = await api.getRecipe(food.id);
      setRecipeData(res);

      if (res.hasRecipe && res.ingredients && res.ingredients.length > 0) {
        // Pre-populate draft with existing active recipe ingredients
        setRecipeDraft(
          res.ingredients.map((ing) => ({
            inventoryItemId: String(ing.inventoryItemId),
            quantity: String(ing.quantity),
            unit: ing.unit || "g",
            notes: ing.notes || ""
          }))
        );
        setIsEditingRecipe(false);
      } else {
        // No recipe yet
        setRecipeDraft([]);
        setIsEditingRecipe(false);
      }
    } catch (e) {
      setRecipeModalError(e.message || "Failed to fetch recipe details.");
    } finally {
      setRecipeLoading(false);
    }
  }

  // 5. START ADDING / EDITING RECIPE
  function handleStartRecipeEdit() {
    setIsEditingRecipe(true);
    setRecipeModalError("");
    setRecipeModalMessage("");

    // If draft is currently empty, initialize with 1 row
    if (recipeDraft.length === 0) {
      setRecipeDraft([
        {
          inventoryItemId: "",
          quantity: "",
          unit: "g",
          notes: ""
        }
      ]);
    }
  }

  // 6. RECIPE INGREDIENT ROW MANAGEMENT
  function handleAddIngredientRow() {
    setRecipeDraft([
      ...recipeDraft,
      {
        inventoryItemId: "",
        quantity: "",
        unit: "g",
        notes: ""
      }
    ]);
  }

  function handleRemoveIngredientRow(index) {
    const updated = recipeDraft.filter((_, i) => i !== index);
    setRecipeDraft(updated);
  }

  function handleIngredientChange(index, field, value) {
    const updated = [...recipeDraft];
    updated[index] = { ...updated[index], [field]: value };

    // When inventory item is picked, automatically set default unit from inventory item
    if (field === "inventoryItemId" && value) {
      const foundItem = inventoryItems.find((inv) => String(inv.id) === String(value));
      if (foundItem && foundItem.unit) {
        updated[index].unit = foundItem.unit;
      }
    }

    setRecipeDraft(updated);
  }

  // 7. SAVE RECIPE HANDLER (enforces One Food - One Active Recipe, Inventory item validation, and no duplicates)
  async function handleSaveRecipe() {
    if (!recipeFood) return;
    setRecipeModalError("");
    setRecipeModalMessage("");

    if (recipeDraft.length === 0) {
      setRecipeModalError("Please add at least one ingredient to the recipe.");
      return;
    }

    // Validation
    const seenItemIds = new Set();
    const formattedIngredients = [];

    for (let i = 0; i < recipeDraft.length; i++) {
      const row = recipeDraft[i];
      if (!row.inventoryItemId) {
        setRecipeModalError(`Row #${i + 1}: Please select an inventory ingredient.`);
        return;
      }

      if (seenItemIds.has(row.inventoryItemId)) {
        const itemObj = inventoryItems.find((inv) => String(inv.id) === String(row.inventoryItemId));
        setRecipeModalError(`Duplicate ingredient: "${itemObj?.name || 'Item'}" is added more than once. Please combine quantities instead.`);
        return;
      }
      seenItemIds.add(row.inventoryItemId);

      const qty = parseFloat(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        setRecipeModalError(`Row #${i + 1}: Recipe quantity must be a positive number greater than 0.`);
        return;
      }

      if (!row.unit || !row.unit.trim()) {
        setRecipeModalError(`Row #${i + 1}: Please specify a measurement unit.`);
        return;
      }

      formattedIngredients.push({
        inventoryItemId: Number(row.inventoryItemId),
        quantity: qty,
        unit: row.unit.trim(),
        notes: row.notes?.trim() || null
      });
    }

    try {
      setRecipeLoading(true);
      const res = await api.saveRecipe(recipeFood.id, {
        ingredients: formattedIngredients
      });

      setRecipeData(res);
      setIsEditingRecipe(false);
      setRecipeModalMessage(`Recipe for "${recipeFood.name}" saved successfully with ${formattedIngredients.length} ingredients.`);
      notifySuccess(`Recipe for "${recipeFood.name}" saved successfully!`);

      // Refresh food catalog so recipe status updates to 'Recipe Added'
      await loadData();
    } catch (e) {
      setRecipeModalError(e.message || "Failed to save recipe.");
    } finally {
      setRecipeLoading(false);
    }
  }

  // 8. DELETE RECIPE HANDLER
  async function handleDeleteRecipe() {
    if (!recipeFood) return;
    if (!window.confirm(`Are you sure you want to remove the recipe for "${recipeFood.name}"?`)) {
      return;
    }

    try {
      setRecipeLoading(true);
      await api.deleteRecipe(recipeFood.id);
      setRecipeData({ hasRecipe: false, ingredients: [] });
      setRecipeDraft([]);
      setIsEditingRecipe(false);
      setRecipeModalMessage(`Recipe for "${recipeFood.name}" removed.`);
      notifySuccess(`Recipe for "${recipeFood.name}" removed.`);
      await loadData();
    } catch (e) {
      setRecipeModalError(e.message || "Failed to remove recipe.");
    } finally {
      setRecipeLoading(false);
    }
  }

  // 9. PREPARE / PRODUCE FOOD HANDLERS (triggers atomic recipe stock deduction)
  async function handleOpenPrepareFood(food) {
    setPrepareFoodItem(food);
    setPrepareQuantity(1);
    setPrepareNotes("");
    setPrepareError("");
    setPrepareSuccess("");
    setShowPrepareModal(true);
    await checkPrepareStock(food.id, 1);
  }

  async function checkPrepareStock(foodId, qty) {
    if (!foodId) return;
    setPrepareChecking(true);
    setPrepareError("");
    try {
      const res = await api.checkFoodStock(foodId, { quantity: Number(qty) || 1 });
      setPrepareStockCheck(res);
      if (!res.isAvailable && res.message) {
        setPrepareError(res.message);
      }
    } catch (e) {
      setPrepareError(e.message || "Failed to check kitchen stock.");
    } finally {
      setPrepareChecking(false);
    }
  }

  async function handleConfirmPrepare() {
    if (!prepareFoodItem) return;
    const qty = Number(prepareQuantity);
    if (!qty || qty <= 0) {
      setPrepareError("Please enter a valid quantity greater than 0.");
      return;
    }

    setPrepareSubmitting(true);
    setPrepareError("");
    setPrepareSuccess("");

    try {
      const res = await api.prepareFood(prepareFoodItem.id, {
        quantity: qty,
        notes: prepareNotes
      });
      setPrepareSuccess(res.message);
      notifySuccess(res.message);
      setTimeout(async () => {
        setShowPrepareModal(false);
        await loadData();
      }, 1500);
    } catch (e) {
      setPrepareError(e.message || "Failed to prepare food due to insufficient stock.");
      if (e.shortages) {
        setPrepareStockCheck({
          isAvailable: false,
          shortages: e.shortages,
          message: e.message
        });
      }
    } finally {
      setPrepareSubmitting(false);
    }
  }

  // Open Edit Food Modal
  function handleOpenEditFood(food) {
    setEditingFoodId(food.id);
    setFoodForm({
      branchId: food.branchId ? String(food.branchId) : (selectedBranch || ""),
      name: food.name,
      category: food.category,
      price: String(food.price),
      description: food.description || "",
      code: food.code || "",
      imageUrl: food.imageUrl || "",
      isActive: food.isActive !== false
    });
    setShowEditFoodModal(true);
  }

  // Filtered Menu List
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        const matchesCode = item.code?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesCode) return false;
      }

      // Category
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }

      // Recipe Status filter
      if (recipeFilter === "ADDED" && !item.hasRecipe) return false;
      if (recipeFilter === "NOT_ADDED" && item.hasRecipe) return false;

      return true;
    });
  }, [menu, search, categoryFilter, recipeFilter]);

  // Statistics
  const totalCount = menu.length;
  const withRecipeCount = menu.filter((m) => m.hasRecipe).length;
  const withoutRecipeCount = totalCount - withRecipeCount;

  return (
    <div className="page-grid">
      {/* Top Action Toolbar */}
      {!isKitchenModule && canManage && (
        <div className="menu-header-actions-row" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "16px" }}>
          <button
            className="primary-btn"
            onClick={() => {
              setFoodForm({
                ...initialFoodForm,
                branchId: selectedBranch || (user.branchId ? String(user.branchId) : "")
              });
              setShowAddFoodModal(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Plus size={18} />
            Add Food
          </button>
        </div>
      )}

      {/* Global Alerts */}
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      {/* Workflow Guidance Banner */}
      <div className="food-recipe-flow-banner">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--brand-gold, #c99824)",
              color: "#072518",
              display: "grid",
              placeItems: "center",
              fontWeight: 800
            }}
          >
            <ChefHat size={22} />
          </div>
          <div>
            <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
              Food → Recipe Workflow
            </strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
              Step 1: <strong>Create Food</strong> → Step 2: <strong>Select Food</strong> → Step 3: <strong>Add Recipe</strong> → Step 4: <strong>Select Inventory Ingredients</strong> → Step 5: <strong>Save Recipe</strong>
            </p>
          </div>
        </div>
        {canManage && isKitchenModule && (
          <button
            className="primary-btn compact"
            onClick={() => {
              setFoodForm({
                ...initialFoodForm,
                branchId: selectedBranch || (user.branchId ? String(user.branchId) : "")
              });
              setShowAddFoodModal(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            Add Food
          </button>
        )}
      </div>

      {/* Branch Scope Selector (for Organization Admins) */}
      {!user.branchId && !embeddedBranchId && (
        <div className="branch-filter panel" style={{ marginBottom: "16px" }}>
          <div>
            <span className="eyebrow">BRANCH SCOPE</span>
            <strong>Select Menu Branch</strong>
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Catalog Panel */}
      <div className="panel">
        <div
          className="panel-head"
          style={{ flexWrap: "wrap", gap: "12px", alignItems: "center" }}
        >
          <div>
            <span className="eyebrow">FOOD CATALOG ({totalCount})</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
              <h3 style={{ margin: 0 }}>Available Food Dishes</h3>
              <span
                className="role-chip"
                style={{ background: "var(--status-active-bg)", color: "var(--status-active-text)", border: "1px solid var(--status-active-border)" }}
              >
                {withRecipeCount} with Recipe
              </span>
              <span
                className="role-chip"
                style={{ background: "var(--status-warning-bg)", color: "var(--status-warning-text)", border: "1px solid var(--status-warning-border)" }}
              >
                {withoutRecipeCount} No Recipe
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)"
                }}
              />
              <input
                type="text"
                placeholder="Search food or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "32px", height: "36px", fontSize: "13px" }}
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ height: "36px", fontSize: "13px" }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Recipe Filter */}
            <select
              value={recipeFilter}
              onChange={(e) => setRecipeFilter(e.target.value)}
              style={{ height: "36px", fontSize: "13px" }}
            >
              <option value="ALL">All Recipes</option>
              <option value="ADDED">Recipe Added ({withRecipeCount})</option>
              <option value="NOT_ADDED">Recipe Not Added ({withoutRecipeCount})</option>
            </select>

            <button
              type="button"
              className="secondary-btn compact"
              onClick={() => setShowPhotosInMenu(!showPhotosInMenu)}
              title={showPhotosInMenu ? "Hide photo column in menu" : "Show photo column in menu"}
              style={{
                height: "36px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                padding: "0 10px"
              }}
            >
              {showPhotosInMenu ? <Image size={15} color="var(--primary-600)" /> : <ImageOff size={15} />}
              Photos: {showPhotosInMenu ? "Shown" : "Hidden"}
            </button>

            <button
              className="icon-btn"
              onClick={loadData}
              title="Refresh Food List"
              style={{ height: "36px", width: "36px" }}
            >
              <RefreshCw size={16} />
            </button>

            {canManage && (
              <button
                className="primary-btn compact"
                onClick={() => {
                  setFoodForm({
                    ...initialFoodForm,
                    branchId: selectedBranch || (user.branchId ? String(user.branchId) : "")
                  });
                  setShowAddFoodModal(true);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Add Food
              </button>
            )}
          </div>
        </div>

        {/* Food Table */}
        {loading ? (
          <div className="empty-row" style={{ padding: "40px", textAlign: "center" }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: "8px" }} />
            <div>Loading food catalog...</div>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="empty-row" style={{ padding: "40px", textAlign: "center" }}>
            <Utensils size={32} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
            <div style={{ fontSize: "15px", fontWeight: 600 }}>No food items found</div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              {search || categoryFilter !== "ALL" || recipeFilter !== "ALL"
                ? "Try adjusting your filters or search query."
                : "Get started by adding your first food item using the 'Add Food' button."}
            </p>
            {canManage && (
              <button
                className="primary-btn compact"
                onClick={() => {
                  setFoodForm({
                    ...initialFoodForm,
                    branchId: selectedBranch || (user.branchId ? String(user.branchId) : "")
                  });
                  setShowAddFoodModal(true);
                }}
                style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Add Food Now
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {showPhotosInMenu && <th style={{ width: "56px" }}>Photo</th>}
                  <th>Food</th>
                  <th>Category</th>
                  <th>Selling Price</th>
                  <th>Recipe Status</th>
                  <th style={{ textAlign: "right", minWidth: "220px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenu.map((m) => {
                  const hasRecipe = !!m.hasRecipe;
                  const ingredientCount = m.recipeCount || (m.ingredients ? m.ingredients.length : 0);

                  return (
                    <tr key={m.id}>
                      {/* Optional Photo */}
                      {showPhotosInMenu && (
                        <td>
                          {m.imageUrl ? (
                            <div style={{ position: "relative", width: "44px", height: "44px" }}>
                              <img
                                src={m.imageUrl}
                                alt={m.name}
                                style={{
                                  width: "44px",
                                  height: "44px",
                                  borderRadius: "10px",
                                  objectFit: "cover",
                                  border: "1px solid var(--border-default)",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                                  display: "block"
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                                }}
                              />
                              <div
                                style={{
                                  display: "none",
                                  width: "44px",
                                  height: "44px",
                                  borderRadius: "10px",
                                  background: "var(--bg-surface-subtle)",
                                  border: "1px dashed var(--border-default)",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--text-muted)"
                                }}
                              >
                                <Utensils size={18} />
                              </div>
                            </div>
                          ) : (
                            <div
                              title="No photo attached (Photo is optional)"
                              style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "10px",
                                background: "var(--bg-surface-subtle)",
                                border: "1px dashed var(--border-default)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-muted)"
                              }}
                            >
                              <Utensils size={16} opacity={0.6} />
                            </div>
                          )}
                        </td>
                      )}

                      {/* Food Name & Details */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                            {m.name}
                          </strong>
                          {m.code && (
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.03em" }}>
                              SKU: {m.code}
                            </span>
                          )}
                          {m.description && (
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "var(--text-muted)",
                                maxWidth: "280px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                            >
                              {m.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          className="role-chip"
                          style={{
                            background: "#ebf7ee",
                            color: "#15803d",
                            border: "1px solid #ccecd4",
                            fontWeight: 700
                          }}
                        >
                          {m.category || "General"}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td>
                        <strong style={{ fontSize: "14.5px", color: "var(--primary-600)" }}>
                          ₹{Number(m.price).toFixed(2)}
                        </strong>
                      </td>

                      {/* Recipe Status */}
                      <td>
                        {hasRecipe ? (
                          <span className="recipe-badge recipe-badge-added" title={`${ingredientCount} ingredients in active recipe`}>
                            <CheckCircle2 size={13} />
                            Recipe Added ({ingredientCount})
                          </span>
                        ) : (
                          <span className="recipe-badge recipe-badge-not-added" title="No recipe configured yet">
                            <AlertTriangle size={13} />
                            Recipe Not Added
                          </span>
                        )}
                      </td>

                      {/* Actions: View / Edit / Recipe / Delete */}
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            justifyContent: "flex-end"
                          }}
                        >
                          {/* View Action */}
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => setViewingFood(m)}
                            title="View Food & Recipe"
                            style={{ padding: "5px 9px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Eye size={13} /> View
                          </button>

                          {/* Edit Action */}
                          {canManage && (
                            <button
                              type="button"
                              className="secondary-btn compact"
                              onClick={() => handleOpenEditFood(m)}
                              title="Edit Food Details"
                              style={{ padding: "5px 9px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          )}

                          {/* RECIPE Action (Prominent Chef Hat button) */}
                          <button
                            type="button"
                            className="recipe-action-btn"
                            onClick={() => handleOpenRecipe(m)}
                            title={hasRecipe ? "View / Edit Active Recipe" : "Add Recipe Ingredients"}
                            style={{
                              background: hasRecipe ? "linear-gradient(135deg, #072518 0%, #0d3e28 100%)" : "linear-gradient(135deg, #c99824 0%, #b38219 100%)",
                              color: hasRecipe ? "#ffffff" : "#072518",
                              borderColor: hasRecipe ? "#145a46" : "#a87814"
                            }}
                          >
                            <ChefHat size={14} />
                            Recipe
                          </button>

                          {/* PREPARE FOOD Action (Deducts Kitchen Stock) */}
                          {hasRecipe && (
                            <button
                              type="button"
                              className="primary-btn compact"
                              onClick={() => handleOpenPrepareFood(m)}
                              title="Prepare / Produce Food (Checks & Deducts Kitchen Stock)"
                              style={{
                                padding: "5px 10px",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                color: "#ffffff",
                                borderColor: "#047857"
                              }}
                            >
                              <Utensils size={13} /> Prepare
                            </button>
                          )}

                          {/* Remove Photo Action if photo exists */}
                          {canManage && m.imageUrl && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleRemoveFoodPhoto(m.id, m.name)}
                              title="Remove Photo (Make item photoless)"
                              style={{
                                color: "#e11d48",
                                borderColor: "rgba(225, 29, 72, 0.2)",
                                padding: "5px",
                                width: "28px",
                                height: "28px"
                              }}
                            >
                              <ImageOff size={13} />
                            </button>
                          )}

                          {/* Delete Action */}
                          {canManage && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleDeleteFood(m)}
                              title="Delete Food Item"
                              style={{
                                color: "var(--danger-600)",
                                borderColor: "rgba(220, 38, 38, 0.2)",
                                padding: "5px",
                                width: "28px",
                                height: "28px"
                              }}
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

      {/* =====================================================================
          MODAL 1: CREATE FOOD (PURE FOOD CREATION - NO RECIPE FORCED)
          ===================================================================== */}
      {showAddFoodModal && (
        <div className="modal-overlay" onClick={() => setShowAddFoodModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Utensils size={20} color="var(--brand-gold)" />
                <div>
                  <h3 style={{ margin: 0 }}>Add Food Item</h3>
                  <span style={{ fontSize: "11px", color: "#f6f3eb", opacity: 0.8 }}>
                    Create Food first. Recipe can be added after saving.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn modal-close-btn"
                onClick={() => setShowAddFoodModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFood}>
              <div className="modal-body">
                {/* Branch selection for Org Admin */}
                {!user.branchId && (
                  <label className="field">
                    <span>Branch *</span>
                    <select
                      required
                      value={foodForm.branchId}
                      onChange={(e) => setFoodForm({ ...foodForm, branchId: e.target.value })}
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="two-col">
                  {/* Food Name */}
                  <label className="field">
                    <span>Food Name *</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chicken Biryani"
                      value={foodForm.name}
                      onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                    />
                  </label>

                  {/* Category */}
                  <label className="field">
                    <span>Category *</span>
                    <select
                      required
                      value={foodForm.category}
                      onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="two-col">
                  {/* Selling Price */}
                  <label className="field">
                    <span>Selling Price (₹) *</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="180.00"
                      value={foodForm.price}
                      onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
                    />
                  </label>

                  {/* Dish Code / SKU */}
                  <label className="field">
                    <span>Item Code / SKU (Optional)</span>
                    <input
                      type="text"
                      placeholder="e.g. CHK-BIR-01"
                      value={foodForm.code}
                      onChange={(e) => setFoodForm({ ...foodForm, code: e.target.value })}
                    />
                  </label>
                </div>

                {/* Description */}
                <label className="field">
                  <span>Description (Optional)</span>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the dish, preparation style, or ingredients..."
                    value={foodForm.description}
                    onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                  />
                </label>

                {/* Add Image from Web (Optional) */}
                <FoodImageWebInput
                  imageUrl={foodForm.imageUrl}
                  onChange={(val) => setFoodForm({ ...foodForm, imageUrl: val })}
                  dishName={foodForm.name}
                  category={foodForm.category}
                />

                {/* Live Preview card */}
                {foodForm.name.trim() && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "12px 14px",
                      background: "var(--bg-surface-subtle)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)"
                    }}
                  >
                    {foodForm.imageUrl ? (
                      <img
                        src={foodForm.imageUrl}
                        alt="Preview"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: "1px solid var(--border-default)"
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "8px",
                          background: "var(--bg-surface)",
                          border: "1px dashed var(--border-default)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)"
                        }}
                      >
                        <Utensils size={20} opacity={0.6} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>
                          FOOD CATALOG PREVIEW
                        </span>
                        {!foodForm.imageUrl && (
                          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic" }}>
                            (No photo attached • Optional)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {foodForm.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--primary-600)", fontWeight: 600 }}>
                        {foodForm.category} • ₹{Number(foodForm.price || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#047857"
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Recipe Note:</strong> You do not need to enter ingredients right now. After creating this food, click the <strong>Recipe</strong> button in the food list to add its recipe and inventory requirements.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddFoodModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create Food <ChevronRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EDIT FOOD DETAILS
          ===================================================================== */}
      {showEditFoodModal && (
        <div className="modal-overlay" onClick={() => setShowEditFoodModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Edit2 size={18} color="var(--brand-gold)" />
                <h3 style={{ margin: 0 }}>Edit Food: {foodForm.name}</h3>
              </div>
              <button
                type="button"
                className="icon-btn modal-close-btn"
                onClick={() => setShowEditFoodModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateFood}>
              <div className="modal-body">
                <div className="two-col">
                  <label className="field">
                    <span>Food Name *</span>
                    <input
                      type="text"
                      required
                      value={foodForm.name}
                      onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Category *</span>
                    <select
                      required
                      value={foodForm.category}
                      onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="two-col">
                  <label className="field">
                    <span>Selling Price (₹) *</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={foodForm.price}
                      onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Item Code / SKU</span>
                    <input
                      type="text"
                      value={foodForm.code}
                      onChange={(e) => setFoodForm({ ...foodForm, code: e.target.value })}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Description</span>
                  <textarea
                    rows={2}
                    value={foodForm.description}
                    onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                  />
                </label>

                {/* Add Image from Web (Optional) */}
                <FoodImageWebInput
                  imageUrl={foodForm.imageUrl}
                  onChange={(val) => setFoodForm({ ...foodForm, imageUrl: val })}
                  dishName={foodForm.name}
                  category={foodForm.category}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowEditFoodModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: VIEW FOOD DETAILS
          ===================================================================== */}
      {viewingFood && (
        <div className="modal-overlay" onClick={() => setViewingFood(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: "620px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Utensils size={18} color="var(--brand-gold)" />
                <h3 style={{ margin: 0 }}>{viewingFood.name}</h3>
              </div>
              <button
                type="button"
                className="icon-btn modal-close-btn"
                onClick={() => setViewingFood(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
                {viewingFood.imageUrl ? (
                  <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
                    <img
                      src={viewingFood.imageUrl}
                      alt={viewingFood.name}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "12px",
                        objectFit: "cover",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        border: "1px solid var(--border-default)"
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "12px",
                      background: "var(--bg-surface-subtle)",
                      border: "1.5px dashed var(--border-default)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      color: "var(--text-muted)",
                      flexShrink: 0
                    }}
                  >
                    <Utensils size={24} opacity={0.6} />
                    <span style={{ fontSize: "10px", fontWeight: 600 }}>No Photo</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <h2 style={{ margin: "0 0 4px 0", fontSize: "18px" }}>{viewingFood.name}</h2>
                    {canManage && viewingFood.imageUrl && (
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={() => handleRemoveFoodPhoto(viewingFood.id, viewingFood.name)}
                        style={{
                          fontSize: "11px",
                          color: "#dc2626",
                          borderColor: "#fca5a5",
                          padding: "3px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Trash2 size={12} />
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span className="role-chip" style={{ background: "#ebf7ee", color: "#15803d", border: "1px solid #ccecd4", fontWeight: 700 }}>
                      {viewingFood.category}
                    </span>
                    <strong style={{ fontSize: "16px", color: "var(--primary-600)" }}>
                      ₹{Number(viewingFood.price).toFixed(2)}
                    </strong>
                    {viewingFood.code && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        SKU: {viewingFood.code}
                      </span>
                    )}
                    {!viewingFood.imageUrl && (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-surface-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
                        Photo: Optional (None)
                      </span>
                    )}
                  </div>
                  {viewingFood.description && (
                    <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                      {viewingFood.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Recipe Status Card */}
              <div
                style={{
                  background: viewingFood.hasRecipe ? "#ecfdf5" : "#fffbeb",
                  border: `1px solid ${viewingFood.hasRecipe ? "#a7f3d0" : "#fde68a"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "14px", color: viewingFood.hasRecipe ? "#047857" : "#b45309" }}>
                    {viewingFood.hasRecipe ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {viewingFood.hasRecipe ? "Recipe Added" : "No Recipe Configured"}
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: viewingFood.hasRecipe ? "#065f46" : "#92400e" }}>
                    {viewingFood.hasRecipe
                      ? `This food has an active recipe with ${viewingFood.recipeCount || viewingFood.ingredients?.length || 0} inventory ingredients configured.`
                      : "Add a recipe to define required ingredients for kitchen production and automatic inventory deduction."}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {viewingFood.hasRecipe && (
                    <button
                      className="primary-btn compact"
                      onClick={() => {
                        const target = viewingFood;
                        setViewingFood(null);
                        handleOpenPrepareFood(target);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        borderColor: "#047857",
                        color: "#ffffff"
                      }}
                      title="Prepare food and deduct ingredients from Kitchen Stock"
                    >
                      <Utensils size={15} /> Prepare Food
                    </button>
                  )}
                  <button
                    className={viewingFood.hasRecipe ? "secondary-btn compact" : "primary-btn compact"}
                    onClick={() => {
                      const target = viewingFood;
                      setViewingFood(null);
                      handleOpenRecipe(target);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                  >
                    <ChefHat size={15} />
                    {viewingFood.hasRecipe ? "View / Edit Recipe" : "+ Add Recipe"}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setViewingFood(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: RECIPE MODAL (FOOD → RECIPE → INGREDIENTS)
          ===================================================================== */}
      {showRecipeModal && recipeFood && (
        <div className="modal-overlay" onClick={() => setShowRecipeModal(false)}>
          <div
            className="modal-card large"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "880px" }}
          >
            {/* Modal Header */}
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(201, 152, 36, 0.2)",
                    border: "1px solid var(--brand-gold)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--brand-gold)"
                  }}
                >
                  <ChefHat size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    Food: {recipeFood.name}
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "rgba(255,255,255,0.12)",
                        color: "#f6f3eb",
                        fontWeight: 500
                      }}
                    >
                      {recipeFood.category} • ₹{Number(recipeFood.price).toFixed(2)}
                    </span>
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#f6f3eb", opacity: 0.85 }}>
                    Food → Recipe → Recipe Ingredients • Standard Single Serving / Portion
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn modal-close-btn"
                onClick={() => setShowRecipeModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {recipeModalError && <div className="error-box">{recipeModalError}</div>}
              {recipeModalMessage && <div className="success-box">{recipeModalMessage}</div>}

              {recipeLoading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: "8px" }} />
                  <div>Loading recipe details...</div>
                </div>
              ) : (
                <>
                  {/* CASE 1: NO RECIPE EXISTS AND NOT CURRENTLY EDITING */}
                  {!recipeData?.hasRecipe && !isEditingRecipe && (
                    <div
                      style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        background: "var(--bg-surface-subtle)",
                        borderRadius: "var(--radius-lg)",
                        border: "1.5px dashed var(--border-default)"
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          background: "#fffbeb",
                          color: "#b45309",
                          display: "grid",
                          placeItems: "center",
                          margin: "0 auto 16px auto",
                          border: "1px solid #fde68a"
                        }}
                      >
                        <ChefHat size={28} />
                      </div>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", color: "var(--text-primary)" }}>
                        No recipe has been added for this food.
                      </h3>
                      <p
                        style={{
                          margin: "0 auto 20px auto",
                          maxWidth: "460px",
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          lineHeight: "1.5"
                        }}
                      >
                        Add the ingredients, available stock items, and portion quantities required to prepare <strong>1 standard serving</strong> of {recipeFood.name}.
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={handleStartRecipeEdit}
                          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                        >
                          <Plus size={18} /> Add Recipe
                        </button>
                      )}
                    </div>
                  )}

                  {/* CASE 2: RECIPE EXISTS AND IN VIEW MODE (ONE ACTIVE RECIPE) */}
                  {recipeData?.hasRecipe && !isEditingRecipe && (
                    <div>
                      {/* Active Recipe Header info */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 18px",
                          background: "var(--bg-surface-subtle)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-default)",
                          marginBottom: "16px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="recipe-badge recipe-badge-added">
                            <CheckCircle2 size={13} /> Active Recipe
                          </span>
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                            Portion: <strong>1 Standard Serving</strong> • Ingredients: <strong>{recipeData.ingredients?.length || 0}</strong>
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            className="primary-btn compact"
                            onClick={() => {
                              const food = recipeFood;
                              setShowRecipeModal(false);
                              handleOpenPrepareFood(food);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                              borderColor: "#047857",
                              color: "#ffffff"
                            }}
                            title="Prepare this food and deduct recipe ingredients from Kitchen Stock"
                          >
                            <Utensils size={14} /> Prepare Food
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="secondary-btn compact"
                                onClick={handleStartRecipeEdit}
                                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                              >
                                <Edit2 size={14} /> Edit Recipe
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={handleDeleteRecipe}
                                title="Delete Recipe"
                                style={{ color: "var(--danger-600)", borderColor: "rgba(220, 38, 38, 0.2)" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Recipe Stock Rule Banner */}
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "var(--radius-md)",
                          marginBottom: "14px",
                          fontSize: "12px",
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <Info size={16} color="#059669" style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Recipe Definition Rule:</strong> Recipe creation defines the ingredients required for 1 portion. <strong>No kitchen stock is deducted on recipe save/edit.</strong> Stock is automatically deducted when food is prepared/produced.
                        </span>
                      </div>

                      {/* Ingredients List Table */}
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: "40px" }}>#</th>
                              <th>Ingredient Name</th>
                              <th>Recipe Quantity</th>
                              <th>Unit</th>
                              <th>Available Inventory Stock</th>
                              <th>Stock Status</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipeData.ingredients?.map((ing, idx) => {
                              const stockQty = ing.availableStock ?? 0;
                              const isLow = stockQty <= 5;
                              return (
                                <tr key={ing.id || idx}>
                                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                                  <td>
                                    <strong style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>
                                      {ing.inventoryItemName || ing.name}
                                    </strong>
                                    {ing.itemCode && (
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                        {ing.itemCode}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <strong style={{ fontSize: "14px", color: "var(--primary-600)" }}>
                                      {ing.quantity}
                                    </strong>
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: "12px",
                                        background: "var(--bg-surface-subtle)",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        border: "1px solid var(--border-default)"
                                      }}
                                    >
                                      {ing.unit}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                      {Number(stockQty).toFixed(2)} {ing.unit}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className="role-chip"
                                      style={{
                                        background: stockQty <= 0 ? "#fef2f2" : isLow ? "#fffbeb" : "#ecfdf5",
                                        color: stockQty <= 0 ? "#dc2626" : isLow ? "#b45309" : "#047857",
                                        border: `1px solid ${stockQty <= 0 ? "#fecaca" : isLow ? "#fde68a" : "#a7f3d0"}`
                                      }}
                                    >
                                      {stockQty <= 0 ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    {ing.notes || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: ADDING OR EDITING RECIPE INGREDIENTS */}
                  {isEditingRecipe && (
                    <div>
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "var(--radius-md)",
                          marginBottom: "16px",
                          fontSize: "12.5px",
                          color: "#047857",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Info size={16} />
                          <span>
                            Select existing inventory items. Enter the quantity required for <strong>1 standard portion</strong> of <strong>{recipeFood.name}</strong>.
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "12px" }}>
                          {recipeDraft.length} {recipeDraft.length === 1 ? "Ingredient" : "Ingredients"}
                        </span>
                      </div>

                      {/* Ingredients Builder List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {recipeDraft.map((row, index) => {
                          const selectedInvItem = inventoryItems.find(
                            (inv) => String(inv.id) === String(row.inventoryItemId)
                          );

                          // Inventory items already selected in OTHER rows (to prevent duplicates)
                          const selectedOtherItemIds = new Set(
                            recipeDraft
                              .filter((_, i) => i !== index)
                              .map((r) => String(r.inventoryItemId))
                              .filter(Boolean)
                          );

                          return (
                            <div
                              key={index}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "35px 2.2fr 1.2fr 1fr 1fr 1.2fr 40px",
                                gap: "10px",
                                alignItems: "center",
                                padding: "12px 14px",
                                background: "var(--bg-surface-subtle)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border-default)"
                              }}
                            >
                              {/* Row Index */}
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: "var(--text-muted)",
                                  textAlign: "center"
                                }}
                              >
                                #{index + 1}
                              </div>

                              {/* Ingredient Dropdown */}
                              <div>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                                  Select Ingredient *
                                </label>
                                <select
                                  required
                                  value={row.inventoryItemId}
                                  onChange={(e) => handleIngredientChange(index, "inventoryItemId", e.target.value)}
                                  style={{ height: "36px", fontSize: "12.5px" }}
                                >
                                  <option value="">-- Choose Ingredient --</option>
                                  {inventoryItems.map((inv) => {
                                    const isAlreadyUsed = selectedOtherItemIds.has(String(inv.id));
                                    return (
                                      <option
                                        key={inv.id}
                                        value={inv.id}
                                        disabled={isAlreadyUsed}
                                      >
                                        {inv.name} (Stock: {Number(inv.currentStock).toFixed(1)} {inv.unit || ""})
                                        {isAlreadyUsed ? " [Already Selected]" : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Available Stock Display */}
                              <div>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                                  Available Stock
                                </label>
                                <div
                                  style={{
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 10px",
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border-default)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: selectedInvItem ? "var(--text-primary)" : "var(--text-muted)"
                                  }}
                                >
                                  {selectedInvItem ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                      <Package size={13} color="var(--brand-gold)" />
                                      {Number(selectedInvItem.currentStock).toFixed(1)} {selectedInvItem.unit}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </div>
                              </div>

                              {/* Quantity */}
                              <div>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                                  Recipe Qty *
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0.001"
                                  required
                                  placeholder="e.g. 250"
                                  value={row.quantity}
                                  onChange={(e) => handleIngredientChange(index, "quantity", e.target.value)}
                                  style={{ height: "36px", fontSize: "13px" }}
                                />
                              </div>

                              {/* Unit */}
                              <div>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                                  Unit *
                                </label>
                                <input
                                  type="text"
                                  list={`units-list-${index}`}
                                  required
                                  placeholder="g, ml, pcs"
                                  value={row.unit}
                                  onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                                  style={{ height: "36px", fontSize: "12.5px" }}
                                />
                                <datalist id={`units-list-${index}`}>
                                  {COMMON_UNITS.map((u) => (
                                    <option key={u} value={u} />
                                  ))}
                                </datalist>
                              </div>

                              {/* Notes */}
                              <div>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                                  Prep Notes
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Marinated"
                                  value={row.notes}
                                  onChange={(e) => handleIngredientChange(index, "notes", e.target.value)}
                                  style={{ height: "36px", fontSize: "12px" }}
                                />
                              </div>

                              {/* Remove Row Button */}
                              <div style={{ paddingTop: "18px" }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => handleRemoveIngredientRow(index)}
                                  title="Remove Ingredient"
                                  disabled={recipeDraft.length === 1}
                                  style={{
                                    color: "var(--danger-600)",
                                    borderColor: "rgba(220, 38, 38, 0.2)",
                                    opacity: recipeDraft.length === 1 ? 0.4 : 1
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Ingredient Button */}
                      <div style={{ marginTop: "14px" }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={handleAddIngredientRow}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <Plus size={16} /> Add Ingredient
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              {isEditingRecipe ? (
                <>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      if (recipeData?.hasRecipe) {
                        setIsEditingRecipe(false);
                      } else {
                        setShowRecipeModal(false);
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveRecipe}
                    disabled={recipeLoading}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <Check size={16} /> Save Recipe
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowRecipeModal(false)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: PREPARE / PRODUCE FOOD (DEDUCTS INGREDIENTS FROM KITCHEN STOCK)
          ===================================================================== */}
      {showPrepareModal && prepareFoodItem && (
        <div className="modal-overlay" onClick={() => !prepareSubmitting && setShowPrepareModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: "780px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-head" style={{ background: "linear-gradient(135deg, #072518 0%, #0d3e28 100%)", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid #10b981",
                    display: "grid",
                    placeItems: "center",
                    color: "#10b981"
                  }}
                >
                  <Utensils size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff" }}>
                    Prepare Food: {prepareFoodItem.name}
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#f6f3eb", opacity: 0.85 }}>
                    Calculates recipe ingredients & deducts from Kitchen Stock in one transaction
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn modal-close-btn"
                onClick={() => !prepareSubmitting && setShowPrepareModal(false)}
                disabled={prepareSubmitting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {prepareError && (
                <div className="error-box" style={{ whiteSpace: "pre-line", marginBottom: "16px" }}>
                  {prepareError}
                </div>
              )}
              {prepareSuccess && (
                <div className="success-box" style={{ marginBottom: "16px" }}>
                  ✓ {prepareSuccess}
                </div>
              )}

              {/* Food & Preparation Inputs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px",
                  gap: "16px",
                  background: "var(--bg-surface-subtle)",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  marginBottom: "16px"
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Food Item
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                    {prepareFoodItem.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {prepareFoodItem.category} • Price: ₹{Number(prepareFoodItem.price).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="field" style={{ margin: 0 }}>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Quantity to Prepare *</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={prepareQuantity}
                      disabled={prepareSubmitting}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setPrepareQuantity(val);
                        checkPrepareStock(prepareFoodItem.id, val);
                      }}
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        textAlign: "center",
                        borderColor: "var(--primary-600)"
                      }}
                    />
                    <small style={{ color: "var(--text-muted)", fontSize: "11px", textAlign: "center", display: "block" }}>
                      portions / units
                    </small>
                  </label>
                </div>
              </div>

              {/* Dynamic Formula Display Banner */}
              <div className="recipe-formula-banner">
                <ChefHat size={20} color="var(--brand-gold)" />
                <div style={{ flex: 1, fontSize: "13px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Deduction Formula:</strong>{" "}
                  <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--primary-600)" }}>
                    Required Ingredient Quantity = Recipe Quantity × {prepareQuantity} ({prepareFoodItem.name} prepared)
                  </span>
                </div>
              </div>

              {/* Live Ingredient Requirements Table */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)" }}>
                    Recipe Ingredients & Kitchen Stock Availability
                  </h4>
                  {prepareChecking && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <RefreshCw size={12} className="spin" /> Checking stock...
                    </span>
                  )}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Ingredient</th>
                        <th>Recipe Qty (1 Portion)</th>
                        <th>Multiplier</th>
                        <th>Total Required</th>
                        <th>Kitchen Stock Available</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepareStockCheck?.requirements?.map((req, idx) => {
                        const isSufficient = req.isSufficient;
                        return (
                          <tr key={req.inventoryItemId || idx} style={{ background: !isSufficient ? "rgba(254, 242, 242, 0.5)" : "inherit" }}>
                            <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                            <td>
                              <strong>{req.itemName}</strong>
                              {req.itemCode && (
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{req.itemCode}</div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                {(req.requiredQuantity / (prepareQuantity || 1)).toFixed(3).replace(/\.?0+$/, "")} {req.unit}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                                × {prepareQuantity}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: !isSufficient ? "#dc2626" : "var(--primary-600)", fontSize: "13.5px" }}>
                                {req.requiredQuantity} {req.unit}
                              </strong>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: req.availableStock <= 0 ? "#dc2626" : "inherit" }}>
                                {req.availableStock} {req.unit}
                              </span>
                            </td>
                            <td>
                              {isSufficient ? (
                                <span
                                  className="recipe-notice-pill"
                                  style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }}
                                >
                                  <Check size={12} /> Available
                                </span>
                              ) : (
                                <span
                                  className="recipe-notice-pill"
                                  style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}
                                >
                                  <AlertTriangle size={12} /> Short: {req.shortage} {req.unit}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Exact Insufficient Kitchen Stock Message Box */}
              {prepareStockCheck?.shortages && prepareStockCheck.shortages.length > 0 && (
                <div className="recipe-shortage-box">
                  <div className="recipe-shortage-title">
                    <AlertTriangle size={16} /> Insufficient Kitchen Stock
                  </div>
                  <div style={{ fontSize: "12.5px", marginBottom: "10px", lineHeight: 1.4 }}>
                    Cannot confirm preparation of <strong>{prepareQuantity} {prepareFoodItem.name}</strong>. The following recipe ingredient(s) are short in Kitchen Stock:
                  </div>
                  {prepareStockCheck.shortages.map((s, idx) => (
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
                    • No ingredients have been deducted. Stock must be replenished via Store &rarr; Kitchen Material Issue before preparation can proceed.
                  </div>
                </div>
              )}

              {/* Sufficient Confirmation Banner */}
              {prepareStockCheck?.isAvailable && (
                <div className="recipe-safe-banner">
                  <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>All Recipe Ingredients Available in Kitchen Stock</strong>
                    <div style={{ fontSize: "12px", opacity: 0.9 }}>
                      Confirming will deduct {prepareQuantity} portion(s) worth of ingredients from Kitchen Stock and log an audited Recipe Consumption transaction.
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Preparation Notes */}
              <label className="field" style={{ marginTop: "10px" }}>
                <span>Preparation Notes (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Lunch batch prepared by chef"
                  value={prepareNotes}
                  disabled={prepareSubmitting}
                  onChange={(e) => setPrepareNotes(e.target.value)}
                />
              </label>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowPrepareModal(false)}
                disabled={prepareSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmPrepare}
                disabled={!prepareStockCheck?.isAvailable || prepareChecking || prepareSubmitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: !prepareStockCheck?.isAvailable ? "var(--slate-300)" : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  borderColor: !prepareStockCheck?.isAvailable ? "var(--slate-400)" : "#047857",
                  cursor: !prepareStockCheck?.isAvailable ? "not-allowed" : "pointer"
                }}
              >
                {prepareSubmitting ? (
                  <>
                    <RefreshCw size={15} className="spin" /> Deducting Stock...
                  </>
                ) : (
                  <>
                    <Check size={15} /> Confirm Preparation & Deduct Stock ({prepareQuantity} portions)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
