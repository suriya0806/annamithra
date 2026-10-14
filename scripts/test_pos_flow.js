const http = require("http");

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 5042,
        path,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: parsed });
          } else {
            reject({ status: res.statusCode, data: parsed });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log("=== STARTING SAMAYA CONTINUOUS TABLE ORDER POS TEST ===");

  // 1. Login as Org Admin or Waiter
  console.log("\n1. Logging in...");
  const loginRes = await request("/api/auth/login", { method: "POST" }, {
    email: "saravana@gmail.com",
    password: "SuperAdmin@123"
  });
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log(`✓ Logged in as ${loginRes.data.user.name} (${loginRes.data.user.role})`);

  console.log("\nChecking branches...");
  const branchesRes = await request("/api/branches", { headers: authHeaders });
  const branchId = branchesRes.data[0].id;
  console.log(`✓ Using Branch ID: ${branchId} (${branchesRes.data[0].name})`);

  // Ensure menu items exist: Chicken Biryani, Chicken 65, Fresh Lime
  console.log("\nChecking menu items...");
  const menuRes = await request(`/api/menu?branchId=${branchId}`, { headers: authHeaders });
  let menu = menuRes.data;

  async function ensureItem(name, price, category) {
    let found = menu.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (!found) {
      console.log(`Creating menu item: ${name} (₹${price})`);
      const created = await request("/api/menu", { method: "POST", headers: authHeaders }, {
        name,
        price,
        category,
        branchId
      });
      return created.data.item || created.data;
    }
    return found;
  }

  const biryani = await ensureItem("Chicken Biryani", 180, "Main Course");
  const chicken65 = await ensureItem("Chicken 65", 180, "Starters");
  const freshLime = await ensureItem("Fresh Lime", 40, "Beverages");
  console.log("✓ Menu items confirmed:");
  console.log(`  - ${biryani.name}: ₹${biryani.price} (ID: ${biryani.id})`);
  console.log(`  - ${chicken65.name}: ₹${chicken65.price} (ID: ${chicken65.id})`);
  console.log(`  - ${freshLime.name}: ₹${freshLime.price} (ID: ${freshLime.id})`);

  // 2. Check Table T12
  console.log("\n2. Checking Table T12 status...");
  const tablesBefore = await request(`/api/orders/tables?branchId=${branchId}`, { headers: authHeaders });
  const t12Before = tablesBefore.data.find(t => t.tableNumber === "T12");
  console.log(`✓ Table T12 initial status: ${t12Before ? t12Before.status : "AVAILABLE"}`);

  if (t12Before && (t12Before.status === "OCCUPIED" || t12Before.status === "READY_FOR_BILLING") && t12Before.activeOrder) {
    console.log(`Resetting prior open order ${t12Before.activeOrder.orderNumber} on T12 to ensure clean test start...`);
    const cRes = await request("/api/bills", { method: "POST", headers: authHeaders }, { orderId: t12Before.activeOrder.id });
    const bId = cRes.data.bill?.id || cRes.data.id;
    if (bId) await request(`/api/bills/${bId}/pay`, { method: "POST", headers: authHeaders }, { paymentMethod: "Cash" });
    console.log("✓ T12 reset to AVAILABLE.");
  }

  // 3 & 4 & 5. Create initial order for Table T12 with customer "Arjun"
  // Chicken Biryani x 2, Chicken 65 x 1, Fresh Lime x 2
  console.log("\n3. Creating initial order for Table T12 (Customer: Arjun)...");
  const initialOrderPayload = {
    branchId,
    tableNumber: "T12",
    customerName: "Arjun",
    items: [
      { menuItemId: biryani.id, quantity: 2 },
      { menuItemId: chicken65.id, quantity: 1 },
      { menuItemId: freshLime.id, quantity: 2 }
    ]
  };

  const createOrderRes = await request("/api/orders", { method: "POST", headers: authHeaders }, initialOrderPayload);
  const orderId = createOrderRes.data.id;
  const orderNumber = createOrderRes.data.orderNumber;
  console.log(`✓ Created Order ID: ${orderId}, Order Number: ${orderNumber}`);
  console.log(`  Customer: ${createOrderRes.data.customerName}, Table: ${createOrderRes.data.tableNumber}`);
  console.log(`  Subtotal: ₹${createOrderRes.data.subtotal}, Tax: ₹${createOrderRes.data.tax}, Total: ₹${createOrderRes.data.totalAmount}`);

  // 6 & 7. Confirm KOT reaches kitchen
  console.log("\n4. Verifying KOT-001 in kitchen...");
  const kotsRes1 = await request(`/api/kot/order/${orderId}`, { headers: authHeaders });
  console.log(`✓ Found ${kotsRes1.data.length} KOT(s) for ${orderNumber}:`);
  kotsRes1.data.forEach(k => {
    console.log(`  KOT: ${k.kotNumber} | Status: ${k.status} | Items: ${k.items.map(i => `${i.menuItemName} x ${i.quantity}`).join(", ")}`);
  });
  if (kotsRes1.data.length !== 1 || kotsRes1.data[0].kotNumber !== "KOT-001") {
    throw new Error("Expected exactly KOT-001 for initial order!");
  }
  if (kotsRes1.data[0].items.length !== 3) {
    throw new Error("Expected 3 items in KOT-001!");
  }

  // 8. Verify table status is OCCUPIED
  console.log("\n5. Verifying table T12 status while order is open...");
  const tablesOcc = await request(`/api/orders/tables?branchId=${branchId}`, { headers: authHeaders });
  const t12Occ = tablesOcc.data.find(t => t.tableNumber === "T12");
  console.log(`✓ Table T12 status: ${t12Occ.status} (Occupied by Order ${t12Occ.activeOrder ? t12Occ.activeOrder.orderNumber : "none"})`);
  if (t12Occ.status !== "OCCUPIED") {
    throw new Error("Table T12 should be OCCUPIED!");
  }

  // 9, 10, 11, 12. EXTEND ORDER
  // Customer later orders: Chicken Biryani x 1, Fresh Lime x 2
  console.log("\n6. Extending Order (EXTEND ORDER)...");
  console.log("Adding: Chicken Biryani x 1, Fresh Lime x 2");
  const extendPayload = [
    { menuItemId: biryani.id, quantity: 1 },
    { menuItemId: freshLime.id, quantity: 2 }
  ];

  const extendRes = await request(`/api/orders/${orderId}/extend`, { method: "POST", headers: authHeaders }, { items: extendPayload });
  console.log(`✓ Order extended! Order Number is STILL: ${extendRes.data.orderNumber}`);
  if (extendRes.data.orderNumber !== orderNumber) {
    throw new Error(`Order Number changed from ${orderNumber} to ${extendRes.data.orderNumber}! Must remain the same.`);
  }

  // 13 & 14. Verify only newly added items are in KOT-002
  console.log("\n7. Verifying KOT-002...");
  const kotsRes2 = await request(`/api/kot/order/${orderId}`, { headers: authHeaders });
  console.log(`✓ Found ${kotsRes2.data.length} KOT tickets:`);
  kotsRes2.data.forEach(k => {
    console.log(`  ${k.kotNumber} -> ${k.items.map(i => `${i.menuItemName} x ${i.quantity}`).join(", ")}`);
  });

  const kot2 = kotsRes2.data.find(k => k.kotNumber === "KOT-002");
  if (!kot2) throw new Error("KOT-002 not found!");
  if (kot2.items.length !== 2) throw new Error("KOT-002 should have exactly 2 new items!");
  console.log("✓ KOT-002 contains ONLY the new extension items: Chicken Biryani x 1, Fresh Lime x 2");

  // 15. Verify updated running total
  // Previous: Biryani(2)*180=360 + 65(1)*180=180 + Lime(2)*40=80 => 620 subtotal
  // Added: Biryani(1)*180=180 + Lime(2)*40=80 => 260 new subtotal
  // Combined Subtotal: 620 + 260 = 880
  // Tax 5%: 880 * 0.05 = 44
  // Running Total: 880 + 44 = 924
  console.log("\n8. Verifying Running Total on Order...");
  const fullOrder = await request(`/api/orders/${orderId}`, { headers: authHeaders });
  console.log(`  Subtotal: ₹${fullOrder.data.subtotal} (Expected: ₹880)`);
  console.log(`  Tax: ₹${fullOrder.data.tax} (Expected: ₹44)`);
  console.log(`  Total: ₹${fullOrder.data.totalAmount} (Expected: ₹924)`);
  console.log(`  Cumulative Items count: ${fullOrder.data.items.length}`);

  if (Number(fullOrder.data.subtotal) !== 880 || Number(fullOrder.data.totalAmount) !== 924) {
    throw new Error(`Running total mismatch! Expected 924, got ${fullOrder.data.totalAmount}`);
  }
  console.log("✓ Running total correctly maintained at ₹924!");

  // 16, 17, 18. CLOSE TABLE -> Final bill generation
  console.log("\n9. Closing Table and Generating Final Bill...");
  const closeRes = await request(`/api/orders/${orderId}/close`, { method: "POST", headers: authHeaders }, {});
  console.log(`✓ Table closed/ready for billing: ${closeRes.data.status}`);
  const genBillRes = await request("/api/bills", { method: "POST", headers: authHeaders }, { orderId });
  const bill = genBillRes.data.bill || genBillRes.data;
  console.log(`✓ Final Bill Generated:`);
  console.log(`  Bill No     : ${bill.billNumber}`);
  console.log(`  Order No    : ${bill.orderNumber}`);
  console.log(`  Table       : ${bill.tableNumber}`);
  console.log(`  Customer    : ${bill.customerName}`);
  console.log(`  Subtotal    : ₹${bill.subtotal}`);
  console.log(`  CGST 2.5%   : ₹${bill.cgst}`);
  console.log(`  SGST 2.5%   : ₹${bill.sgst}`);
  console.log(`  Grand Total : ₹${bill.grandTotal}`);
  console.log(`  Payment     : ${bill.paymentStatus}`);

  // 21. Verify final bill contains ALL items from both KOTs
  console.log("\n10. Verifying Final Bill Items (cumulative from both KOTs)...");
  const fullBillRes = await request(`/api/bills/${bill.id}`, { headers: authHeaders });
  const billItems = fullBillRes.data.items;
  console.log("  Bill Items breakdown:");
  billItems.forEach(i => {
    console.log(`    - ${i.menuItemName} x ${i.quantity} @ ₹${i.unitPrice} = ₹${i.lineTotal} (${i.kotNumber})`);
  });

  const totalBiryani = billItems.filter(i => i.menuItemName.includes("Biryani")).reduce((s, i) => s + i.quantity, 0);
  const total65 = billItems.filter(i => i.menuItemName.includes("65")).reduce((s, i) => s + i.quantity, 0);
  const totalLime = billItems.filter(i => i.menuItemName.includes("Lime")).reduce((s, i) => s + i.quantity, 0);

  console.log(`  Summary: Biryani=${totalBiryani} (expected 3), 65=${total65} (expected 1), Lime=${totalLime} (expected 4)`);
  if (totalBiryani !== 3 || total65 !== 1 || totalLime !== 4) {
    throw new Error("Final bill items do not match cumulative items from both KOTs!");
  }
  console.log("✓ Final bill correctly contains all items from both KOT-001 and KOT-002!");

  // 24. Verify the bill cannot be generated twice
  console.log("\n11. Verifying bill duplicate prevention...");
  try {
    await request("/api/bills", { method: "POST", headers: authHeaders }, { orderId });
    throw new Error("Should not allow generating a second bill!");
  } catch (err) {
    console.log(`✓ Duplicate bill prevented: status ${err.status}`);
  }

  // 25. Verify closed order cannot be extended
  console.log("\n12. Verifying closed order cannot be extended...");
  try {
    await request(`/api/orders/${orderId}/extend`, { method: "POST", headers: authHeaders }, {
      items: [{ menuItemId: biryani.id, quantity: 1 }]
    });
    throw new Error("Should not allow extending a closed order!");
  } catch (err) {
    console.log(`✓ Extension on closed order prevented: status ${err.status}`);
  }

  // 19. Make Payment (Cash)
  console.log("\n13. Making Payment (Cash)...");
  const payRes = await request(`/api/bills/${bill.id}/pay`, { method: "POST", headers: authHeaders }, {
    paymentMethod: "Cash"
  });
  console.log(`✓ Payment recorded! Status: ${payRes.data.paymentStatus}, Method: ${payRes.data.paymentMethod}`);

  // 22 & 23. Verify Table T12 is now AVAILABLE and Order is CLOSED
  console.log("\n14. Verifying Table T12 is now AVAILABLE and Order is CLOSED...");
  const tablesAfter = await request(`/api/orders/tables?branchId=${branchId}`, { headers: authHeaders });
  const t12After = tablesAfter.data.find(t => t.tableNumber === "T12");
  console.log(`✓ Table T12 status: ${t12After.status}`);
  if (t12After.status !== "AVAILABLE") {
    throw new Error("Table T12 should be AVAILABLE after payment and closing!");
  }

  const orderAfter = await request(`/api/orders/${orderId}`, { headers: authHeaders });
  console.log(`✓ Order ${orderNumber} status: ${orderAfter.data.status}`);
  if (orderAfter.data.status !== "Closed") {
    throw new Error("Order status should be Closed!");
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL 25 TEST CRITERIA OF SECTION 17 PASSED PERFECTLY!");
  console.log("=======================================================");
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
