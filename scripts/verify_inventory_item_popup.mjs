// Verification script for Add Inventory Item Popup in Purchase module
import fs from "fs";

const API_BASE = "http://localhost:5042/api";

async function run() {
  console.log("=== 1. Checking Central Inventory Page Source ===");
  const appJsx = fs.readFileSync("frontend/src/App.jsx", "utf-8");
  
  // Verify Central Inventory's Add item button is removed
  const hasCentralInventoryAddBtn = appJsx.includes('<Plus size={17} /> Add item');
  console.log("Central Inventory 'Add item' button present?", hasCentralInventoryAddBtn);
  if (hasCentralInventoryAddBtn) {
    throw new Error("FAIL: Central Inventory still contains Add item button!");
  }
  console.log("✓ PASS: Central Inventory Add item button has been removed.");

  console.log("\n=== 2. Checking Purchase Module & Add Item Modal Integration ===");
  const kmJsx = fs.readFileSync("frontend/src/KitchenManagement.jsx", "utf-8");
  const pdJsx = fs.readFileSync("frontend/src/PurchaseDashboard.jsx", "utf-8");
  const modalJsx = fs.readFileSync("frontend/src/AddInventoryItemModal.jsx", "utf-8");

  if (!kmJsx.includes("AddInventoryItemModal")) {
    throw new Error("FAIL: AddInventoryItemModal not imported in KitchenManagement!");
  }
  if (!kmJsx.includes("<Plus size={16} /> Add Item")) {
    throw new Error("FAIL: 'Add Item' button not found in PurchasesManagement toolbar!");
  }
  if (pdJsx.includes("<Plus size={16} /> Add Item")) {
    throw new Error("FAIL: Unnecessary Add Item button still present near branch select!");
  }
  console.log("✓ PASS: 'Add Item' button present in Purchase toolbar and removed from top bar near branch select.");

  // Check 7 fields in AddInventoryItemModal
  const requiredFields = [
    "Branch *",
    "Item Code",
    "Item Name *",
    "Category",
    "Unit *",
    "Minimum Stock Reference",
    "Description"
  ];
  for (const field of requiredFields) {
    if (!modalJsx.includes(field)) {
      throw new Error(`FAIL: Field '${field}' not found in AddInventoryItemModal!`);
    }
  }
  console.log("✓ PASS: All 7 specified fields appear in AddInventoryItemModal:", requiredFields);

  // Check units
  const units = ["KG", "G", "L", "ML", "PCS", "BOX", "PACK"];
  for (const u of units) {
    if (!modalJsx.includes(`value: "${u}"`)) {
      throw new Error(`FAIL: Unit '${u}' not found in AddInventoryItemModal units!`);
    }
  }
  console.log("✓ PASS: Units (KG, G, L, ML, PCS, BOX, PACK) supported.");

  // Check bottom actions
  if (!modalJsx.includes("Cancel") || !modalJsx.includes("Save Item")) {
    throw new Error("FAIL: Bottom actions [ Cancel ] [ Save Item ] missing!");
  }
  console.log("✓ PASS: Bottom actions [ Cancel ] [ Save Item ] present.");

  // Check Escape key support
  if (!modalJsx.includes('e.key === "Escape"')) {
    throw new Error("FAIL: Escape key close support missing!");
  }
  console.log("✓ PASS: Escape key support verified.");

  // Check zero opening stock rule
  if (!modalJsx.includes("openingStock: 0")) {
    throw new Error("FAIL: openingStock: 0 rule missing!");
  }
  console.log("✓ PASS: openingStock: 0 strictly enforced (no stock increase on create).");

  console.log("\n=== 3. Testing Backend Inventory Item APIs ===");
  // Login as admin
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saravana@gmail.com", password: "SuperAdmin@123" })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  const user = loginData.user;
  console.log("Logged in as:", user.email, "Role:", user.role, "Org:", user.organizationId);

  // Fetch branches
  const branchesRes = await fetch(`${API_BASE}/branches`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const branches = await branchesRes.json();
  const branchId = branches[0]?.id;
  console.log("Using branch ID:", branchId, branches[0]?.name);

  // Test creating a new inventory item via the existing API (simulating modal submission)
  const testItemName = `Test Item ${Date.now()}`;
  const createPayload = {
    branchId: branchId,
    itemCode: "", // Test auto-generated
    name: testItemName,
    category: "Provisions",
    unit: "KG",
    minimumStock: 15,
    reorderLevel: 15,
    maximumStock: 0,
    openingStock: 0, // Must NOT add stock
    description: "Created via Purchase Add Item popup"
  };

  const createRes = await fetch(`${API_BASE}/inventory/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create inventory item: ${createRes.status} ${errText}`);
  }
  const createdItem = await createRes.json();
  console.log("✓ PASS: Item created successfully:", createdItem);

  if (createdItem.currentStock !== 0) {
    throw new Error(`FAIL: Current stock is ${createdItem.currentStock}, expected 0!`);
  }
  console.log("✓ PASS: Current stock is strictly 0 (no stock increased).");

  // Verify item is retrieved in inventory items list
  const getItemsRes = await fetch(`${API_BASE}/inventory/items?branchId=${branchId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const itemsList = await getItemsRes.json();
  const found = itemsList.find(i => i.id === createdItem.id || i.name === testItemName);
  if (!found) {
    throw new Error("FAIL: Created item not found in GET /inventory/items!");
  }
  console.log("✓ PASS: Created item is retrievable in inventory & purchase items list:", found.name, "CurrentStock:", found.currentStock);

  // Test duplicate prevention
  const dupRes = await fetch(`${API_BASE}/inventory/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(createPayload)
  });
  if (dupRes.status !== 400) {
    throw new Error(`FAIL: Duplicate item creation did not return 400! Status: ${dupRes.status}`);
  }
  const dupErr = await dupRes.json();
  console.log("✓ PASS: Duplicate item creation correctly rejected:", dupErr.message);

  // Test validation: empty name
  const invalidRes = await fetch(`${API_BASE}/inventory/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ ...createPayload, name: "" })
  });
  if (invalidRes.status !== 400) {
    throw new Error("FAIL: Empty name did not return 400!");
  }
  console.log("✓ PASS: Required field validation (Item name) works.");

  console.log("\n==========================================");
  console.log("ALL ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!");
  console.log("==========================================");
}

run().catch(err => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
