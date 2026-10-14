const assert = require("assert");

async function main() {
  console.log("==================================================");
  console.log("STARTING FINAL SPECIFICATION VERIFICATION TEST");
  console.log("==================================================\n");

  const baseUrl = "http://localhost:5042/api";

  // Login Org Admin (Central Inventory Manager / Admin)
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saravana@gmail.com", password: "SuperAdmin@123" })
  });
  assert.strictEqual(adminLoginRes.status, 200, "Admin login must succeed");
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;
  console.log("✓ Logged in as Organization Admin / Central Manager");

  // Login Madurai Branch User (Branch Manager)
  const maduraiLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "madurai_mgr@samaya.com", password: "SuperAdmin@123" })
  });
  assert.strictEqual(maduraiLoginRes.status, 200, "Madurai manager login must succeed");
  const maduraiData = await maduraiLoginRes.json();
  const maduraiToken = maduraiData.token;
  console.log("✓ Logged in as authorized Madurai Branch Manager");

  // PRE-CONDITION CHECK: Central Chicken = 100 KG, Madurai Chicken = 10 KG
  const items6Res = await fetch(`${baseUrl}/inventory/items?branchId=6`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const items6 = await items6Res.json();
  const centralChicken = items6.find(i => i.name.toLowerCase() === "chicken");
  assert(centralChicken, "Central Chicken item must exist");
  console.log(`Central Chicken initial stock: ${centralChicken.currentStock} ${centralChicken.unit}`);

  const items7Res = await fetch(`${baseUrl}/inventory/items?branchId=7`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const items7 = await items7Res.json();
  const maduraiChicken = items7.find(i => i.name.toLowerCase() === "chicken");
  assert(maduraiChicken, "Madurai Chicken item must exist");
  console.log(`Madurai Chicken initial stock: ${maduraiChicken.currentStock} ${maduraiChicken.unit}`);

  assert.strictEqual(Number(centralChicken.currentStock), 100, "Central Chicken stock must initially be 100 KG");
  assert.strictEqual(Number(maduraiChicken.currentStock), 10, "Madurai Chicken stock must initially be 10 KG");
  console.log("✓ Initial condition confirmed: Central Chicken = 100 KG, Madurai Chicken = 10 KG\n");

  // Step 1 - 6: Create Transfer Central -> Madurai, Chicken = 20 KG
  console.log("Creating transfer: Central Inventory -> Madurai Branch (Chicken = 20 KG)...");
  const createRes = await fetch(`${baseUrl}/kitchen/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fromBranchId: 6,
      toBranchId: 7,
      transferDate: new Date().toISOString(),
      notes: "Spec Verification Transfer TRF test",
      items: [
        { inventoryItemId: centralChicken.id, quantity: 20 }
      ]
    })
  });
  assert.strictEqual(createRes.status, 200, "Create transfer should return 200");
  const createData = await createRes.json();
  const transferId = createData.transferId;
  const transferNumber = createData.transferNumber;

  // Step 7: Verify unique Transfer ID
  console.log(`✓ Step 7: Unique Transfer ID generated: ${transferNumber} (Id: ${transferId})`);
  assert(transferNumber.startsWith("TRF-"), "Transfer ID must follow format TRF-XXXXX");

  // Step 8: Verify status = REQUESTED
  console.log(`✓ Step 8: Transfer status immediately after creation: ${createData.status}`);
  assert.strictEqual(createData.status, "REQUESTED", "Initial status must be REQUESTED");

  // Step 7b (Critical Rule): Verify destination branch stock has NOT increased
  const checkMaduraiStockAfterCreate = await fetch(`${baseUrl}/inventory/items/${maduraiChicken.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const mStockAfterCreate = await checkMaduraiStockAfterCreate.json();
  console.log(`✓ Step 7b (CRITICAL RULE): Madurai Chicken stock after creation: ${mStockAfterCreate.currentStock} KG`);
  assert.strictEqual(Number(mStockAfterCreate.currentStock), 10, "Madurai Chicken stock MUST NOT change upon transfer creation!");

  // Step 9: Approve transfer
  console.log("Approving transfer...");
  const approveRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(approveRes.status, 200, "Approve transfer should return 200");
  console.log("✓ Step 9: Transfer approved successfully");

  // Step 10: Dispatch transfer
  console.log("Dispatching transfer...");
  const dispatchRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}/dispatch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(dispatchRes.status, 200, "Dispatch transfer should return 200");
  const dispatchData = await dispatchRes.json();

  // Step 11: Verify status = IN TRANSIT
  console.log(`✓ Step 11: Status after dispatch: ${dispatchData.status}`);
  assert.strictEqual(dispatchData.status, "IN TRANSIT", "Status must be IN TRANSIT after dispatch");

  // Verify Central stock is deducted by 20 KG (100 -> 80 KG)
  const checkCentralStockAfterDispatch = await fetch(`${baseUrl}/inventory/items/${centralChicken.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const cStockAfterDispatch = await checkCentralStockAfterDispatch.json();
  console.log(`Central Chicken stock after dispatch: ${cStockAfterDispatch.currentStock} KG`);
  assert.strictEqual(Number(cStockAfterDispatch.currentStock), 80, "Central Chicken stock must be reduced to 80 KG");

  // Step 12: Verify Madurai Chicken is STILL 10 KG
  const checkMaduraiStockAfterDispatch = await fetch(`${baseUrl}/inventory/items/${maduraiChicken.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const mStockAfterDispatch = await checkMaduraiStockAfterDispatch.json();
  console.log(`✓ Step 12 (CRITICAL RULE): Madurai Chicken stock after dispatch: ${mStockAfterDispatch.currentStock} KG`);
  assert.strictEqual(Number(mStockAfterDispatch.currentStock), 10, "Madurai Chicken stock MUST STILL be 10 KG after dispatch!");

  // Step 13 - 15: Login as authorized Madurai user and check incoming transfers
  console.log("Checking incoming transfers as Madurai Branch Manager...");
  const incomingRes = await fetch(`${baseUrl}/kitchen/transfers?branchId=7&status=IN%20TRANSIT`, {
    headers: { Authorization: `Bearer ${maduraiToken}` }
  });
  assert.strictEqual(incomingRes.status, 200, "Fetch incoming transfers should succeed");
  const incomingList = await incomingRes.json();
  const incomingTrf = incomingList.find(t => t.id === transferId || t.transferNumber === transferNumber);
  assert(incomingTrf, "Transfer must be present in incoming transfers for Madurai branch");
  console.log(`✓ Step 14 - 15: Found incoming transfer: ${incomingTrf.transferNumber} status=${incomingTrf.status}`);

  // Step 16 - 17: Confirm Receive
  console.log("Confirming receipt of stock at destination branch...");
  const receiveRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}/receive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${maduraiToken}` }
  });
  assert.strictEqual(receiveRes.status, 200, "Receive transfer should return 200");
  console.log("✓ Step 17: Confirm Receive executed successfully");

  // Step 18: Verify status = RECEIVED
  const detailsRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}`, {
    headers: { Authorization: `Bearer ${maduraiToken}` }
  });
  const trfDetails = await detailsRes.json();
  console.log(`✓ Step 18: Transfer status after receipt: ${trfDetails.status}`);
  assert.strictEqual(trfDetails.status, "RECEIVED", "Transfer status must be RECEIVED");

  // Step 19: Verify Madurai Chicken = 30 KG
  const checkMaduraiStockAfterReceive = await fetch(`${baseUrl}/inventory/items/${maduraiChicken.id}`, {
    headers: { Authorization: `Bearer ${maduraiToken}` }
  });
  const mStockAfterReceive = await checkMaduraiStockAfterReceive.json();
  console.log(`✓ Step 19: Madurai Chicken stock after Confirm Receive: ${mStockAfterReceive.currentStock} KG`);
  assert.strictEqual(Number(mStockAfterReceive.currentStock), 30, "Madurai Chicken stock MUST be 30 KG (10 + 20)!");

  // Step 20: Verify stock transaction exists
  const txRes = await fetch(`${baseUrl}/inventory/transactions?branchId=7`, {
    headers: { Authorization: `Bearer ${maduraiToken}` }
  });
  const txList = await txRes.json();
  const transferInTx = txList.find(t => t.type === "TRANSFER_IN" && t.reference === transferNumber);
  assert(transferInTx, "TRANSFER_IN transaction must exist for transfer");
  console.log(`✓ Step 20: Stock transaction verified: Type=${transferInTx.type}, Reference=${transferInTx.reference}, Quantity=${transferInTx.quantity}`);

  // Step 21: Verify the same transfer cannot be received twice
  console.log("Attempting to receive the same transfer a second time...");
  const doubleReceiveRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}/receive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${maduraiToken}` }
  });
  assert.strictEqual(doubleReceiveRes.status, 400, "Second receive attempt must fail with 400 Bad Request");
  const doubleReceiveError = await doubleReceiveRes.json();
  console.log(`✓ Step 21: Double receive correctly rejected: "${doubleReceiveError.message}"`);

  // Verify Waiter cannot access transfer endpoint (Role permission check)
  const waiterLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "k@gmail.com", password: "SuperAdmin@123" }) // Waiter
  });
  if (waiterLoginRes.status === 200) {
    const waiterData = await waiterLoginRes.json();
    const waiterToken = waiterData.token;
    const waiterAccessRes = await fetch(`${baseUrl}/kitchen/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${waiterToken}` },
      body: JSON.stringify({ toBranchId: 7, items: [{ inventoryItemId: centralChicken.id, quantity: 5 }] })
    });
    assert.strictEqual(waiterAccessRes.status, 403, "Waiter must receive 403 Forbidden");
    console.log("✓ Role permission check: Waiter blocked with 403 Forbidden");
  }

  console.log("\n==================================================");
  console.log("ALL 21 VERIFICATION POINTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

main().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
