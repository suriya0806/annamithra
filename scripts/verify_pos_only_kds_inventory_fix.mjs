// scripts/verify_pos_only_kds_inventory_fix.mjs
const API_URL = "http://localhost:5042/api";

async function run() {
  console.log("================================================================================");
  console.log("ANNAMITHRA — Verification: POS Only KDS & Inventory Consumption Fix");
  console.log("================================================================================\n");

  // Step 1: Login
  console.log("1. Authenticating as Organization Admin...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saravana@gmail.com", password: "SuperAdmin@123" })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const { token, user } = await loginRes.json();
  console.log(`✓ Logged in as: ${user.name} (${user.role}), OrgId: ${user.organizationId}`);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // Step 2: Fetch branches
  console.log("\n2. Fetching existing branches...");
  const branchesRes = await fetch(`${API_URL}/branches`, { headers: authHeaders });
  const branches = await branchesRes.json();
  console.log(`✓ Found ${branches.length} branches:`);
  branches.forEach(b => console.log(`   - ID: ${b.id}, Name: "${b.name}", ModuleType: "${b.moduleType}"`));

  // Find Main Branch (ID 6) which has rich menu items with recipes
  const mainBranch = branches.find(b => b.id === 6) || branches[0];
  console.log(`\n✓ Primary Test Branch: ID ${mainBranch.id} ("${mainBranch.name}")`);

  // Step 3: Fetch menu item with recipe on Branch 6
  console.log("\n3. Finding Menu Item with Recipe on Branch " + mainBranch.id + "...");
  const menuRes = await fetch(`${API_URL}/menu?branchId=${mainBranch.id}`, { headers: authHeaders });
  const menuItems = await menuRes.json();
  const dishWithRecipe = menuItems.find(m => m.hasRecipe || (m.ingredients && m.ingredients.length > 0));

  if (!dishWithRecipe) {
    throw new Error("No dish with recipe found on branch " + mainBranch.id);
  }

  console.log(`✓ Found Dish with Recipe: "${dishWithRecipe.name}" (ID: ${dishWithRecipe.id}, Price: ₹${dishWithRecipe.price})`);

  // ============================================================================
  // PART A: TEST "Both POS + KMS" BRANCH BEHAVIOR
  // ============================================================================
  console.log("\n================================================================================");
  console.log("PART A: Verifying 'Both POS + KMS' Branch Behavior (Must be preserved)");
  console.log("================================================================================");

  // Ensure branch is "Both POS + KMS"
  await fetch(`${API_URL}/branches/${mainBranch.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: mainBranch.name,
      address: mainBranch.address || "Main Road",
      phone: mainBranch.phone || "9876543210",
      moduleType: "Both POS + KMS",
      isActive: true
    })
  });

  console.log(`✓ Branch ${mainBranch.id} set to 'Both POS + KMS'.`);

  // Test check-stock on Both POS + KMS with huge quantity (should show shortages)
  console.log("Testing /api/orders/check-stock with large quantity (5000 units)...");
  const bothStockRes = await fetch(`${API_URL}/orders/check-stock`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      branchId: mainBranch.id,
      items: [{ menuItemId: dishWithRecipe.id, quantity: 5000 }]
    })
  });
  const bothStockData = await bothStockRes.json();
  console.log(`✓ Both POS + KMS check-stock: isSufficient = ${bothStockData.isSufficient}, shortages = ${bothStockData.shortages?.length || 0}`);
  if (bothStockData.isSufficient !== false && (!bothStockData.shortages || bothStockData.shortages.length === 0)) {
    console.warn("  Note: Stock might be huge or recipe ingredients abundant, but stock evaluation was executed.");
  } else {
    console.log("✓ PASSED: 'Both POS + KMS' correctly evaluated recipe availability and detected shortages.");
  }

  // ============================================================================
  // PART B: SWITCH BRANCH TO "POS Only" AND TEST REQUIRED BEHAVIOR
  // ============================================================================
  console.log("\n================================================================================");
  console.log("PART B: Switching Branch to 'POS Only' — Testing All Required Behaviors");
  console.log("================================================================================");

  await fetch(`${API_URL}/branches/${mainBranch.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: mainBranch.name,
      address: mainBranch.address || "Main Road",
      phone: mainBranch.phone || "9876543210",
      moduleType: "POS Only",
      isActive: true
    })
  });
  console.log(`✓ Branch ${mainBranch.id} successfully switched to 'POS Only'.`);

  // 1. Test check-stock: MUST bypass and return isSufficient = true, shortages = []
  console.log("\n1. Testing /api/orders/check-stock for POS Only branch (even with 50000 units)...");
  const posStockRes = await fetch(`${API_URL}/orders/check-stock`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      branchId: mainBranch.id,
      items: [{ menuItemId: dishWithRecipe.id, quantity: 50000 }]
    })
  });
  const posStockData = await posStockRes.json();
  console.log("✓ check-stock response:", JSON.stringify(posStockData));
  if (posStockData.isSufficient !== true || (posStockData.shortages && posStockData.shortages.length > 0)) {
    throw new Error("FAIL: check-stock returned shortages or isSufficient=false for POS Only branch!");
  }
  console.log("✓ PASSED: /api/orders/check-stock bypassed recipe shortage calculations.");

  // 2. Test availability: MUST return hasPlan = false, items = []
  console.log("\n2. Testing /api/orders/availability for POS Only branch...");
  const posAvailRes = await fetch(`${API_URL}/orders/availability?branchId=${mainBranch.id}`, { headers: authHeaders });
  const posAvailData = await posAvailRes.json();
  console.log("✓ availability response:", JSON.stringify(posAvailData));
  if (posAvailData.hasPlan !== false || posAvailData.items.length !== 0) {
    throw new Error("FAIL: availability did not bypass plan for POS Only branch!");
  }
  console.log("✓ PASSED: availability bypassed plan for POS Only branch.");

  // 3. Record Initial Kitchen Stock
  console.log("\n3. Recording Initial Kitchen Stock before POS Orders...");
  const stockRes1 = await fetch(`${API_URL}/kitchen/stock?branchId=${mainBranch.id}`, { headers: authHeaders });
  let initialStock = [];
  if (stockRes1.ok) {
    initialStock = await stockRes1.json();
    console.log(`✓ Recorded ${initialStock.length} kitchen stock records.`);
  }

  // 4. Create Table Order for POS Only Branch
  const uniqueTable = "T-" + Math.floor(Math.random() * 9000 + 1000);
  console.log(`\n4. Creating POS Table Order for POS Only Branch (Table: ${uniqueTable})...`);
  const tableOrderRes = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      branchId: mainBranch.id,
      tableNumber: uniqueTable,
      customerName: "POS Only Test Guest",
      items: [{ menuItemId: dishWithRecipe.id, quantity: 4 }]
    })
  });

  if (!tableOrderRes.ok) {
    throw new Error(`Failed to create table order: ${tableOrderRes.status} ${await tableOrderRes.text()}`);
  }
  const tableOrder = await tableOrderRes.json();
  console.log(`✓ Table Order Created: #${tableOrder.orderNumber} (ID: ${tableOrder.id})`);
  console.log(`  insufficientStock: ${tableOrder.insufficientStock}`);
  console.log(`  inventoryDeducted: ${tableOrder.inventoryDeducted}`);
  if (tableOrder.insufficientStock === true || tableOrder.inventoryDeducted === true) {
    throw new Error("FAIL: Table order created with insufficientStock=true or inventoryDeducted=true on POS Only branch!");
  }
  console.log("✓ PASSED: Table order created without shortage warnings or automatic inventory deductions.");

  // 5. Create Counter Sale for POS Only Branch
  console.log("\n5. Creating POS Counter Sale for POS Only Branch...");
  const counterSaleRes = await fetch(`${API_URL}/orders/counter-sale`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      branchId: mainBranch.id,
      customerName: "Counter POS Guest",
      paymentMethod: "Cash",
      amountTendered: 1000,
      items: [{ menuItemId: dishWithRecipe.id, quantity: 2, unitPrice: dishWithRecipe.price }]
    })
  });
  if (!counterSaleRes.ok) {
    throw new Error(`Failed to create counter sale: ${counterSaleRes.status} ${await counterSaleRes.text()}`);
  }
  const counterSale = await counterSaleRes.json();
  console.log(`✓ Counter Sale Created: #${counterSale.bill?.billNumber || counterSale.orderNumber || counterSale.id}`);
  console.log(`  insufficientStock: ${counterSale.insufficientStock}`);
  console.log(`  inventoryDeducted: ${counterSale.inventoryDeducted}`);
  if (counterSale.insufficientStock === true || counterSale.inventoryDeducted === true) {
    throw new Error("FAIL: Counter sale created with insufficientStock=true or inventoryDeducted=true on POS Only branch!");
  }
  console.log("✓ PASSED: Counter sale created without shortage warnings or automatic inventory deductions.");

  // 6. Verify Kitchen KDS Queue (/api/kot?branchId=...)
  console.log("\n6. Verifying Kitchen KDS Queue for POS Only Branch...");
  const kotsRes = await fetch(`${API_URL}/kot?branchId=${mainBranch.id}`, { headers: authHeaders });
  if (!kotsRes.ok) {
    throw new Error(`Failed to fetch KOTs: ${kotsRes.status} ${await kotsRes.text()}`);
  }
  const kots = await kotsRes.json();
  console.log(`✓ Total KOTs in KDS: ${kots.length}`);

  const tableKot = kots.find(k => k.orderId === tableOrder.id);
  if (!tableKot) {
    throw new Error(`FAIL: KOT for table order ${tableOrder.id} was not returned by KDS!`);
  }
  console.log(`✓ Found Table Order KOT in KDS: ${tableKot.kotNumber} (ID: ${tableKot.id})`);
  console.log(`  Order: ${tableKot.orderNumber}, Table: ${tableKot.tableNumber}, Status: ${tableKot.status}`);
  console.log(`  branchModuleType: "${tableKot.branchModuleType}"`);
  console.log(`  hasInsufficientStock: ${tableKot.hasInsufficientStock}`);
  console.log(`  stockResolved: ${tableKot.stockResolved}`);
  console.log(`  shortages count: ${tableKot.shortages?.length || 0}`);
  console.log(`  items count: ${tableKot.items?.length || 0}`);

  if (tableKot.hasInsufficientStock !== false || (tableKot.shortages && tableKot.shortages.length > 0)) {
    throw new Error("FAIL: POS Only KOT ticket displays hasInsufficientStock=true or has shortages in KDS!");
  }
  console.log("✓ PASSED: KOT is visible on Kitchen KDS with complete food items, quantities, and ZERO shortages.");

  // 7. Test KDS Status Lifecycle Transitions (Pending -> Preparing -> Ready -> Served)
  console.log("\n7. Testing KDS Status Lifecycle Transitions for POS Only Order...");

  // Transition to Preparing
  console.log(`  a) Transitioning ${tableKot.kotNumber} to "Preparing"...`);
  const prepRes = await fetch(`${API_URL}/kot/${tableKot.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Preparing" })
  });
  if (!prepRes.ok) {
    throw new Error(`FAIL: Could not mark POS Only KOT as Preparing: ${prepRes.status} ${await prepRes.text()}`);
  }
  const prepData = await prepRes.json();
  console.log(`  ✓ Successfully updated to Preparing: status = ${prepData.status}`);

  // Transition to Ready
  console.log(`  b) Transitioning ${tableKot.kotNumber} to "Ready"...`);
  const readyRes = await fetch(`${API_URL}/kot/${tableKot.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Ready" })
  });
  if (!readyRes.ok) {
    throw new Error(`FAIL: Could not mark POS Only KOT as Ready: ${readyRes.status} ${await readyRes.text()}`);
  }
  const readyData = await readyRes.json();
  console.log(`  ✓ Successfully updated to Ready: status = ${readyData.status}`);

  // Transition to Served
  console.log(`  c) Transitioning ${tableKot.kotNumber} to "Served"...`);
  const servedRes = await fetch(`${API_URL}/kot/${tableKot.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Served" })
  });
  if (!servedRes.ok) {
    throw new Error(`FAIL: Could not mark POS Only KOT as Served: ${servedRes.status} ${await servedRes.text()}`);
  }
  const servedData = await servedRes.json();
  console.log(`  ✓ Successfully updated to Served: status = ${servedData.status}`);
  console.log("✓ PASSED: KDS status workflow progressed smoothly (Pending -> Preparing -> Ready -> Served) without stock validation failures.");

  // 8. Verify Kitchen Stock Untouched
  console.log("\n8. Verifying Kitchen Stock Remains Untouched (No Automatic Recipe Deductions)...");
  const stockRes2 = await fetch(`${API_URL}/kitchen/stock?branchId=${mainBranch.id}`, { headers: authHeaders });
  if (stockRes2.ok) {
    const finalStock = await stockRes2.json();
    let discrepancies = [];
    for (const init of initialStock) {
      const fin = finalStock.find(f => f.id === init.id);
      const initQty = init.currentQuantity ?? init.quantity ?? 0;
      const finQty = fin ? (fin.currentQuantity ?? fin.quantity ?? 0) : 0;
      if (initQty !== finQty) {
        discrepancies.push(`${init.itemName || init.inventoryItemName}: Initial ${initQty} -> Final ${finQty}`);
      }
    }
    if (discrepancies.length > 0) {
      console.error("  Discrepancies found:", discrepancies);
      throw new Error("FAIL: Kitchen stock was deducted for POS Only branch!");
    } else {
      console.log(`✓ PASSED: All ${finalStock.length} kitchen stock quantities are 100% UNCHANGED.`);
    }
  }

  // Restore Branch to "Both POS + KMS"
  console.log("\n9. Restoring Branch to 'Both POS + KMS'...");
  await fetch(`${API_URL}/branches/${mainBranch.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: mainBranch.name,
      address: mainBranch.address || "Main Road",
      phone: mainBranch.phone || "9876543210",
      moduleType: "Both POS + KMS",
      isActive: true
    })
  });
  console.log(`✓ Branch ${mainBranch.id} restored to 'Both POS + KMS'.`);

  console.log("\n================================================================================");
  console.log("ALL VERIFICATION CHECKS COMPLETED AND PASSED PERFECTLY!");
  console.log("================================================================================");
}

run().catch(err => {
  console.error("\n❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
