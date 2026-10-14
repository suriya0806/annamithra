const assert = require("assert");

async function run() {
  console.log("==================================================================");
  console.log("TESTING END-TO-END INVENTORY TRANSFER (MAIN -> SIMMAKKAL)");
  console.log("==================================================================\n");

  const baseUrl = "http://localhost:5042/api";

  // 1. Reset initial stock for Rice in both branches if needed
  // Login as SuperAdmin / Main Branch
  const mainLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saravana@gmail.com", password: "SuperAdmin@123" })
  });
  assert.strictEqual(mainLoginRes.status, 200, "Main user login failed");
  const mainUser = await mainLoginRes.json();
  const mainToken = mainUser.token;
  console.log("✓ Logged into Main Branch (Admin: saravana@gmail.com)");

  // Login as Simmakkal Branch Manager
  const simLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "simmakkal@samaya.com", password: "SuperAdmin@123" })
  });
  assert.strictEqual(simLoginRes.status, 200, "Simmakkal user login failed");
  const simUser = await simLoginRes.json();
  const simToken = simUser.token;
  console.log("✓ Logged into Simmakkal Branch (simmakkal@samaya.com)");

  // Fetch Rice items in Branch 6 and Branch 7
  const b6ItemsRes = await fetch(`${baseUrl}/inventory/items?branchId=6`, {
    headers: { Authorization: `Bearer ${mainToken}` }
  });
  const b6Items = await b6ItemsRes.json();
  let mainRice = b6Items.find(i => i.name.toLowerCase() === "rice");
  assert(mainRice, "Main Branch Rice item must exist");

  const b7ItemsRes = await fetch(`${baseUrl}/inventory/items?branchId=7`, {
    headers: { Authorization: `Bearer ${mainToken}` }
  });
  const b7Items = await b7ItemsRes.json();
  let simRice = b7Items.find(i => i.name.toLowerCase() === "rice");
  assert(simRice, "Simmakkal Rice item must exist");

  // Adjust stock via movement or direct check so Main Rice = 100, Simmakkal Rice = 50
  if (Number(mainRice.currentStock) !== 100) {
    console.log(`Resetting Main Rice stock from ${mainRice.currentStock} to 100.000 KG...`);
    const diff = 100 - Number(mainRice.currentStock);
    await fetch(`${baseUrl}/inventory/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mainToken}` },
      body: JSON.stringify({
        inventoryItemId: mainRice.id,
        type: diff > 0 ? "StockIn" : "StockOut",
        quantity: Math.abs(diff),
        notes: "Reset for spec verification"
      })
    });
  }

  if (Number(simRice.currentStock) !== 50) {
    console.log(`Resetting Simmakkal Rice stock from ${simRice.currentStock} to 50.000 KG...`);
    const diff = 50 - Number(simRice.currentStock);
    await fetch(`${baseUrl}/inventory/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mainToken}` },
      body: JSON.stringify({
        inventoryItemId: simRice.id,
        type: diff > 0 ? "StockIn" : "StockOut",
        quantity: Math.abs(diff),
        notes: "Reset for spec verification"
      })
    });
  }

  // Refresh items
  const r6 = await (await fetch(`${baseUrl}/inventory/items/${mainRice.id}`, { headers: { Authorization: `Bearer ${mainToken}` } })).json();
  const r7 = await (await fetch(`${baseUrl}/inventory/items/${simRice.id}`, { headers: { Authorization: `Bearer ${mainToken}` } })).json();
  console.log(`\nINITIAL STATE:`);
  console.log(`- Main Branch Rice: ${r6.currentStock} ${r6.unit}`);
  console.log(`- Simmakkal Rice: ${r7.currentStock} ${r7.unit}`);
  assert.strictEqual(Number(r6.currentStock), 100, "Main Branch Rice must be 100 KG");
  assert.strictEqual(Number(r7.currentStock), 50, "Simmakkal Rice must be 50 KG");

  // =========================================================================
  // STEP 1 & 2: Main Branch user creates transfer of 25 KG Rice to Simmakkal
  // =========================================================================
  console.log("\nSTEP 2: Creating Transfer (From: Main Branch, To: Simmakkal, Item: Rice, Qty: 25 KG)...");
  const createRes = await fetch(`${baseUrl}/kitchen/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mainToken}`
    },
    body: JSON.stringify({
      fromBranchId: 6,
      toBranchId: 7,
      itemId: mainRice.id,
      quantity: 25,
      unit: "KG",
      remarks: "25 KG Rice transfer to Simmakkal"
    })
  });
  assert.strictEqual(createRes.status, 200, "Create transfer API should succeed");
  const createData = await createRes.json();
  console.log(`✓ Transfer created: ID ${createData.transferNumber || createData.transferId}, Status: ${createData.status}`);
  const transferId = createData.id || createData.transferId;

  // =========================================================================
  // STEP 3: Verify Main Branch Stock Updated immediately (100 -> 75 KG)
  // And Simmakkal stock remains UNTOUCHED at 50 KG!
  // =========================================================================
  const r6AfterCreate = await (await fetch(`${baseUrl}/inventory/items/${mainRice.id}`, { headers: { Authorization: `Bearer ${mainToken}` } })).json();
  const r7AfterCreate = await (await fetch(`${baseUrl}/inventory/items/${simRice.id}`, { headers: { Authorization: `Bearer ${mainToken}` } })).json();

  console.log("\nSTEP 3: Checking inventory immediately after transfer creation:");
  console.log(`- Main Branch Rice: ${r6AfterCreate.currentStock} KG (Expected: 75 KG)`);
  console.log(`- Simmakkal Rice: ${r7AfterCreate.currentStock} KG (Expected: 50 KG)`);

  assert.strictEqual(Number(r6AfterCreate.currentStock), 75, "Main Branch Rice must be deducted to 75 KG");
  assert.strictEqual(Number(r7AfterCreate.currentStock), 50, "Simmakkal Rice MUST NOT change yet!");
  console.log("✓ Requirement satisfied: Stock deducted from sender branch immediately, receiver stock NOT added yet.");

  // Check transfer record details (TransferredAt stored, ReceivedAt is null, Status is Pending)
  const transferDetailsRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}`, {
    headers: { Authorization: `Bearer ${mainToken}` }
  });
  const transferDetails = await transferDetailsRes.json();
  console.log(`- Transfer Status: ${transferDetails.status}`);
  console.log(`- TransferredAt: ${transferDetails.transferredAt}`);
  console.log(`- TransferredBy: ${transferDetails.transferredBy}`);
  console.log(`- ReceivedAt: ${transferDetails.receivedAt}`);
  assert.strictEqual(transferDetails.status, "Pending", "Status must be Pending");
  assert(transferDetails.transferredAt, "TransferredAt must be recorded");
  assert.strictEqual(transferDetails.receivedAt, null, "ReceivedAt must be null for pending transfer");

  // =========================================================================
  // STEP 4 & 5: Simmakkal Login & View Received Transfers
  // =========================================================================
  console.log("\nSTEP 4: Simmakkal user views Received Transfers:");
  const simTransfersRes = await fetch(`${baseUrl}/kitchen/transfers`, {
    headers: { Authorization: `Bearer ${simToken}` }
  });
  const simTransfers = await simTransfersRes.json();
  const pendingInSimmakkal = simTransfers.find(t => t.id === transferId || t.transferNumber === transferDetails.transferNumber);
  assert(pendingInSimmakkal, "Transfer must appear in Simmakkal Received Transfers");
  console.log(`✓ Simmakkal sees pending transfer: ${pendingInSimmakkal.transferNumber}, From: ${pendingInSimmakkal.fromBranchName}, Item: ${pendingInSimmakkal.itemName}, Qty: ${pendingInSimmakkal.quantity} ${pendingInSimmakkal.unit}`);

  // =========================================================================
  // STEP 6: Simmakkal User clicks "Receive"
  // =========================================================================
  console.log("\nSTEP 6: Simmakkal user clicks 'Receive'...");
  const receiveRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}/receive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${simToken}` }
  });
  assert.strictEqual(receiveRes.status, 200, "Receive transfer should return 200");
  const receiveData = await receiveRes.json();
  console.log(`✓ Received successfully: ${receiveData.message}`);

  // =========================================================================
  // STEP 7: Verify Simmakkal Stock Updated (50 -> 75 KG) & Main Branch Stock = 75 KG
  // =========================================================================
  const r6AfterReceive = await (await fetch(`${baseUrl}/inventory/items/${mainRice.id}`, { headers: { Authorization: `Bearer ${mainToken}` } })).json();
  const r7AfterReceive = await (await fetch(`${baseUrl}/inventory/items/${simRice.id}`, { headers: { Authorization: `Bearer ${mainToken}` } })).json();

  console.log("\nSTEP 7: Checking inventory after receiving:");
  console.log(`- Main Branch Rice: ${r6AfterReceive.currentStock} KG (Expected: 75 KG)`);
  console.log(`- Simmakkal Rice: ${r7AfterReceive.currentStock} KG (Expected: 75 KG)`);

  assert.strictEqual(Number(r6AfterReceive.currentStock), 75, "Main Branch Rice must remain 75 KG");
  assert.strictEqual(Number(r7AfterReceive.currentStock), 75, "Simmakkal Rice must now be 75 KG (50 + 25)");
  console.log("✓ Requirement satisfied: Simmakkal inventory received exact 25 KG.");

  // Verify dual timestamps & users
  const completedDetailsRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}`, {
    headers: { Authorization: `Bearer ${simToken}` }
  });
  const completedDetails = await completedDetailsRes.json();
  console.log("\nSTEP 8: Verifying dual timestamps & duplicate protection:");
  console.log(`- Status: ${completedDetails.status}`);
  console.log(`- TransferredAt: ${completedDetails.transferredAt}`);
  console.log(`- TransferredBy: ${completedDetails.transferredBy}`);
  console.log(`- ReceivedAt: ${completedDetails.receivedAt}`);
  console.log(`- ReceivedBy: ${completedDetails.receivedBy}`);

  assert.strictEqual(completedDetails.status, "Received", "Status must be Received");
  assert.strictEqual(completedDetails.transferredAt, transferDetails.transferredAt, "TransferredAt must NOT be overwritten!");
  assert(completedDetails.receivedAt, "ReceivedAt must now be recorded");
  assert(completedDetails.receivedBy, "ReceivedBy must now be recorded");

  // Duplicate Receive Protection: Attempting to receive again must fail!
  console.log("Attempting to receive the same transfer a second time (Duplicate protection test)...");
  const dupReceiveRes = await fetch(`${baseUrl}/kitchen/transfers/${transferId}/receive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${simToken}` }
  });
  assert.strictEqual(dupReceiveRes.status, 400, "Second receive attempt MUST be rejected with 400 Bad Request");
  const dupErr = await dupReceiveRes.json();
  console.log(`✓ Duplicate receive successfully blocked: "${dupErr.message}"`);

  // Verify stock was NOT added again
  const r7AfterDup = await (await fetch(`${baseUrl}/inventory/items/${simRice.id}`, { headers: { Authorization: `Bearer ${simToken}` } })).json();
  assert.strictEqual(Number(r7AfterDup.currentStock), 75, "Simmakkal Rice MUST still be 75 KG after duplicate attempt");
  console.log("✓ Duplicate protection confirmed: Stock was NOT duplicated.");

  console.log("\n==================================================================");
  console.log("ALL INVENTORY TRANSFER SPECIFICATION REQUIREMENTS PASSED PERFECTLY!");
  console.log("==================================================================");
}

run().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
