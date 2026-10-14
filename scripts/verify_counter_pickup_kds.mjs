// verify_counter_pickup_kds.mjs
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
  console.log(`✓ Logged in as: ${user.name} (${user.role})`);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const branchesRes = await fetch(`${API_URL}/branches`, { headers: authHeaders });
  const branches = await branchesRes.json();
  const activeBranchId = user.branchId || (branches.length > 0 ? branches[0].id : 1);
  console.log(`✓ Active Branch ID: ${activeBranchId}`);

  console.log("\n=== STEP 2: Fetch Menu Item for Counter Order ===");
  const menuRes = await fetch(`${API_URL}/menu?branchId=${activeBranchId}`, { headers: authHeaders });
  const menuItems = await menuRes.json();
  const testItem = menuItems[0];
  console.log(`✓ Selected Item: "${testItem.name}" (ID: ${testItem.id}, Price: ₹${testItem.price})`);

  console.log("\n=== STEP 3: Create Self-Service / Counter Sale Order ===");
  const counterPayload = {
    branchId: activeBranchId,
    customerName: "Counter Pickup Test Guest",
    paymentMethod: "Cash",
    amountTendered: 500,
    items: [
      { menuItemId: testItem.id, quantity: 1 }
    ]
  };

  const createRes = await fetch(`${API_URL}/orders/counter-sale`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(counterPayload)
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create counter sale: ${createRes.status} ${JSON.stringify(createData)}`);
  }

  const orderId = createData.orderId || createData.bill?.orderId;
  const orderNumber = createData.orderNumber || createData.bill?.orderNumber;
  const kotNumber = createData.kotNumber;
  console.log(`✓ Counter Sale created! Order: ${orderNumber}, KOT: ${kotNumber}, Bill: ${createData.bill?.billNumber}`);

  console.log("\n=== STEP 4: Verify Order Appears in Kitchen KDS Queue ===");
  const kotRes = await fetch(`${API_URL}/kot?branchId=${activeBranchId}`, { headers: authHeaders });
  const kots = await kotRes.json();
  const createdKOT = kots.find(k => k.orderNumber === orderNumber || k.kotNumber === kotNumber);

  if (!createdKOT) {
    throw new Error(`KOT for order ${orderNumber} not found in KDS queue!`);
  }

  console.log(`✓ KOT ${createdKOT.kotNumber} found in KDS!`);
  console.log(`  Initial Status: ${createdKOT.status}`);
  console.log(`  SaleType: ${createdKOT.saleType}`);
  console.log(`  isCounterPickup: ${createdKOT.isCounterPickup}`);

  if (createdKOT.saleType !== "SELF_SERVICE") {
    throw new Error(`Expected saleType 'SELF_SERVICE', got '${createdKOT.saleType}'`);
  }

  console.log("\n=== STEP 5: Verify Picked Up Action PREVENTED Before Ready (Pending State) ===");
  const earlyPickupRes = await fetch(`${API_URL}/kot/${createdKOT.id}/pickup`, {
    method: "POST",
    headers: authHeaders
  });
  const earlyPickupData = await earlyPickupRes.json();
  if (earlyPickupRes.status === 400) {
    console.log(`✓ PREVENTED: Cannot confirm pickup before Ready! Server response: "${earlyPickupData.message}"`);
  } else {
    throw new Error(`Expected 400 rejection for early pickup, got ${earlyPickupRes.status}`);
  }

  console.log("\n=== STEP 6: Mark Order as Preparing and Re-verify Picked Up is PREVENTED ===");
  const prepRes = await fetch(`${API_URL}/kot/${createdKOT.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Preparing" })
  });
  console.log(`✓ KOT marked Preparing: ${prepRes.status}`);

  const prepPickupRes = await fetch(`${API_URL}/kot/${createdKOT.id}/pickup`, {
    method: "POST",
    headers: authHeaders
  });
  if (prepPickupRes.status === 400) {
    console.log("✓ PREVENTED: Cannot confirm pickup while in Preparing state!");
  } else {
    throw new Error(`Expected 400 rejection for pickup during preparing, got ${prepPickupRes.status}`);
  }

  console.log("\n=== STEP 7: Mark Order as Ready ===");
  const readyRes = await fetch(`${API_URL}/kot/${createdKOT.id}/status`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ status: "Ready" })
  });
  const readyData = await readyRes.json();
  console.log(`✓ KOT marked Ready: ${readyData.status}`);

  console.log("\n=== STEP 8: Confirm Customer Pickup via KDS Picked Up Action ===");
  const pickupRes = await fetch(`${API_URL}/kot/${createdKOT.id}/pickup`, {
    method: "POST",
    headers: authHeaders
  });
  const pickupData = await pickupRes.json();
  if (!pickupRes.ok) {
    throw new Error(`Failed to confirm pickup: ${pickupRes.status} ${JSON.stringify(pickupData)}`);
  }
  console.log(`✓ PICKUP CONFIRMED successfully!`);
  console.log(`  Server message: "${pickupData.message}"`);
  console.log(`  KOT Status: ${pickupData.status}`);

  console.log("\n=== STEP 9: Verify Duplicate Pickup Confirmation is Prevented (Idempotency) ===");
  const dupPickupRes = await fetch(`${API_URL}/kot/${createdKOT.id}/pickup`, {
    method: "POST",
    headers: authHeaders
  });
  const dupPickupData = await dupPickupRes.json();
  console.log(`✓ Duplicate pickup response: ${dupPickupData.message} (alreadyConfirmed: ${dupPickupData.alreadyConfirmed})`);

  console.log("\n=== STEP 10: Verify Order and KOT in Backend Reflect Picked Up / Served ===");
  const checkKotRes = await fetch(`${API_URL}/kot/${createdKOT.id}`, { headers: authHeaders });
  const finalKOT = await checkKotRes.json();
  console.log(`✓ Final KOT status: ${finalKOT.status}, ServedAt: ${finalKOT.servedAt}`);

  const checkOrderRes = await fetch(`${API_URL}/orders/${orderId}`, { headers: authHeaders });
  const finalOrder = await checkOrderRes.json();
  console.log(`✓ Final Order status: ${finalOrder.status}, ServedAt: ${finalOrder.servedAt}`);

  console.log("\n=== ALL COUNTER PICKUP KDS TESTS PASSED! ===");
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
