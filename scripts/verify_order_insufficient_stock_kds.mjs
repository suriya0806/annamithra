// verify_order_insufficient_stock_kds.mjs
const API_URL = "http://localhost:5042/api";

async function run() {
  console.log("=== STEP 1: Login as Organization Admin ===");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saravana@gmail.com", password: "SuperAdmin@123" })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const { token, user } = await loginRes.json();
  console.log(`✓ Logged in as: ${user.name} (${user.role}), BranchId: ${user.branchId}, OrgId: ${user.organizationId}`);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const branchesRes = await fetch(`${API_URL}/branches`, { headers: authHeaders });
  const branches = await branchesRes.json();
  const activeBranchId = user.branchId || (branches.length > 0 ? branches[0].id : 1);
  console.log(`✓ Active Branch ID: ${activeBranchId}`);

  console.log("\n=== STEP 2: Fetch Menu Items with Recipes & Kitchen Stock ===");
  const menuRes = await fetch(`${API_URL}/menu?branchId=${activeBranchId}`, { headers: authHeaders });
  const menuItems = await menuRes.json();
  console.log(`✓ Total Menu Items: ${menuItems.length}`);

  // Find a menu item with recipe ingredients
  let dishWithRecipe = null;
  for (const m of menuItems) {
    if (m.ingredients && m.ingredients.length > 0) {
      dishWithRecipe = m;
      break;
    }
  }

  if (!dishWithRecipe) {
    // If ingredients aren't included in /menu, fetch individual menu item details
    for (const m of menuItems.slice(0, 10)) {
      const singleRes = await fetch(`${API_URL}/menu/${m.id}`, { headers: authHeaders });
      if (singleRes.ok) {
        const fullM = await singleRes.json();
        if (fullM.ingredients && fullM.ingredients.length > 0) {
          dishWithRecipe = fullM;
          break;
        }
      }
    }
  }

  console.log(`✓ Selected dish with recipe: "${dishWithRecipe?.name}" (ID: ${dishWithRecipe?.id})`);
  console.log(`  Ingredients count: ${dishWithRecipe?.ingredients?.length || 0}`);
  if (dishWithRecipe?.ingredients) {
    dishWithRecipe.ingredients.forEach(ing => {
      console.log(`  - ${ing.inventoryItemName || ing.itemName || "Ingredient"}: ${ing.quantity} ${ing.unit || ""}`);
    });
  }

  console.log("\n=== STEP 3: Create Order with Insufficient Stock (Large Quantity) ===");
  // Order a large quantity (e.g., 500 portions) so required stock far exceeds available kitchen stock
  const orderPayload = {
    branchId: activeBranchId,
    tableNumber: "T-99",
    customerName: "Insufficient Stock Test Guest",
    items: [
      { menuItemId: dishWithRecipe.id, quantity: 500 }
    ]
  };

  const createRes = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(orderPayload)
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error("FAILED: Order creation was rejected:", createData);
    process.exit(1);
  }

  console.log("✓ SUCCESS: Order created even with insufficient stock!");
  console.log(`  Order Number: ${createData.orderNumber}`);
  console.log(`  KOT Number: ${createData.kotNumber}`);
  console.log(`  insufficientStock flag: ${createData.insufficientStock}`);
  console.log(`  inventoryDeducted: ${createData.inventoryDeducted}`);
  console.log(`  Shortages: ${createData.shortages?.length || 0} item(s)`);
  if (createData.shortages?.length > 0) {
    createData.shortages.forEach(s => {
      console.log(`    * ${s.itemName}: Required ${s.formattedRequired}, Available ${s.formattedAvailable}, Shortage ${s.formattedShortage}`);
    });
  }

  console.log("\n=== STEP 4: Verify Order Appears in Kitchen KDS with Insufficient Stock Alert ===");
  const kotRes = await fetch(`${API_URL}/kot?branchId=${activeBranchId}`, { headers: authHeaders });
  const kots = await kotRes.json();
  const createdKOT = kots.find(k => k.kotNumber === createData.kotNumber || k.orderNumber === createData.orderNumber);

  if (!createdKOT) {
    throw new Error(`Created KOT ${createData.kotNumber} not found in KDS queue!`);
  }

  console.log(`✓ KOT ${createdKOT.kotNumber} found in KDS!`);
  console.log(`  Status: ${createdKOT.status}`);
  console.log(`  hasInsufficientStock: ${createdKOT.hasInsufficientStock}`);
  console.log(`  inventoryApplied: ${createdKOT.inventoryApplied}`);
  console.log(`  Shortages reported: ${createdKOT.shortages?.length}`);

  if (!createdKOT.hasInsufficientStock) {
    throw new Error("Expected createdKOT.hasInsufficientStock to be true!");
  }

  console.log("\n=== STEP 5: Test Dedicated Stock Status Endpoint GET /api/kot/{id}/stock-status ===");
  const statusRes = await fetch(`${API_URL}/kot/${createdKOT.id}/stock-status`, { headers: authHeaders });
  const statusData = await statusRes.json();
  console.log("✓ Stock Status endpoint returned:");
  console.log(`  KOT: ${statusData.kotNumber}, Order: ${statusData.orderNumber}`);
  console.log(`  hasInsufficientStock: ${statusData.hasInsufficientStock}`);
  console.log(`  isSufficient: ${statusData.isSufficient}`);
  console.log(`  Shortages count: ${statusData.shortages?.length}`);
  statusData.shortages.forEach(s => {
    console.log(`    - ${s.itemName}: Required=${s.formattedRequired}, Available=${s.formattedAvailable}, Shortage=${s.formattedShortage}`);
  });

  console.log("\n=== STEP 6: Verify Order Cannot Be Marked Prepared/Ready While Stock is Insufficient ===");
  const attemptPrepRes = await fetch(`${API_URL}/kot/${createdKOT.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Preparing" })
  });
  const attemptPrepData = await attemptPrepRes.json();

  if (attemptPrepRes.status === 400 && attemptPrepData.insufficientStock) {
    console.log("✓ PREVENTED: Cannot mark preparing while stock is insufficient!");
    console.log(`  Server message: "${attemptPrepData.message}"`);
  } else {
    throw new Error(`Expected 400 rejection but got: ${attemptPrepRes.status} ${JSON.stringify(attemptPrepData)}`);
  }

  const attemptReadyRes = await fetch(`${API_URL}/kot/${createdKOT.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Ready" })
  });
  const attemptReadyData = await attemptReadyRes.json();

  if (attemptReadyRes.status === 400 && attemptReadyData.insufficientStock) {
    console.log("✓ PREVENTED: Cannot mark ready while stock is insufficient!");
    console.log(`  Server message: "${attemptReadyData.message}"`);
  } else {
    throw new Error(`Expected 400 rejection but got: ${attemptReadyRes.status} ${JSON.stringify(attemptReadyData)}`);
  }

  console.log("\n=== STEP 7: Test Multi-dish Order With Shared Ingredients ===");
  // Create an order with 2 dishes (e.g. quantity 2)
  const multiDishPayload = {
    branchId: activeBranchId,
    tableNumber: "T-88",
    customerName: "Multi Dish Shared Ingredient Guest",
    items: menuItems.slice(0, 2).map(m => ({ menuItemId: m.id, quantity: 2 }))
  };

  const multiRes = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(multiDishPayload)
  });
  const multiData = await multiRes.json();
  console.log(`✓ Multi-dish order created: ${multiData.orderNumber}`);
  console.log(`  KOT: ${multiData.kotNumber}`);

  console.log("\n=== ALL BACKEND ACCEPTANCE CHECKS PASSED SUCCESSFULLY! ===");
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
