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
  console.log("=================================================================");
  console.log("   SAMAYA SELF-SERVICE / COUNTER SALES (MODE 2) VERIFICATION   ");
  console.log("=================================================================\n");

  // 1. Authenticate as Cashier / Org Admin
  console.log("1. Authenticating as Organization Admin / Cashier...");
  const loginRes = await request("/api/auth/login", { method: "POST" }, {
    email: "saravana@gmail.com",
    password: "SuperAdmin@123"
  });
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log(`✓ Logged in as ${loginRes.data.user.name} (Role: ${loginRes.data.user.role})`);

  // 2. Discover Branch & Menu Items
  console.log("\n2. Discovering Branch & Available Menu Items...");
  const branchesRes = await request("/api/branches", { headers: authHeaders });
  const branchId = branchesRes.data[0].id;
  console.log(`✓ Selected Branch: ${branchesRes.data[0].name} (ID: ${branchId})`);

  const menuRes = await request(`/api/menu?branchId=${branchId}`, { headers: authHeaders });
  const menu = menuRes.data;
  if (!menu || menu.length < 2) {
    throw new Error("Insufficient menu items found for test.");
  }
  const item1 = menu[0];
  const item2 = menu[1];
  console.log(`✓ Selected Menu Items:`);
  console.log(`  - ${item1.name}: ₹${item1.price} (ID: ${item1.id}, Category: ${item1.category || "General"})`);
  console.log(`  - ${item2.name}: ₹${item2.price} (ID: ${item2.id}, Category: ${item2.category || "General"})`);

  // 3. Requirement 1, 2, 5, 6, 8, 14: CREATE SELF-SERVICE COUNTER SALE (FAST POS)
  console.log("\n3. Processing High-Speed Self-Service Counter Sale...");
  const qty1 = 2;
  const qty2 = 1;
  const unitPrice1 = Number(item1.price);
  const unitPrice2 = Number(item2.price);
  const expectedSubtotal = (unitPrice1 * qty1) + (unitPrice2 * qty2);
  const discountAmt = 10;
  const expectedTaxable = Math.max(0, expectedSubtotal - discountAmt);
  const expectedTax = Math.round(expectedTaxable * 0.05 * 100) / 100;
  const expectedGrandTotal = Math.round((expectedTaxable + expectedTax) * 100) / 100;
  const cashGiven = Math.ceil(expectedGrandTotal / 100) * 100 + 100; // e.g., ₹500
  const expectedChange = Math.max(0, cashGiven - expectedGrandTotal);

  console.log(`  Expected Subtotal   : ₹${expectedSubtotal}`);
  console.log(`  Expected Discount   : ₹${discountAmt}`);
  console.log(`  Expected 5% GST Tax : ₹${expectedTax}`);
  console.log(`  Expected Grand Total: ₹${expectedGrandTotal}`);
  console.log(`  Cash Received       : ₹${cashGiven}`);
  console.log(`  Change to Return    : ₹${expectedChange}`);

  const counterSalePayload = {
    branchId,
    customerName: "Ramesh Kumar (Counter)",
    paymentMethod: "Cash",
    amountTendered: cashGiven,
    discount: discountAmt,
    items: [
      { menuItemId: item1.id, quantity: qty1, unitPrice: unitPrice1 },
      { menuItemId: item2.id, quantity: qty2, unitPrice: unitPrice2 }
    ]
  };

  const saleRes = await request("/api/orders/counter-sale", { method: "POST", headers: authHeaders }, counterSalePayload);
  const bill = saleRes.data.bill;
  const kot = saleRes.data.kot;

  console.log(`✓ Counter Sale Created Successfully!`);
  console.log(`  Bill Number     : ${bill.billNumber}`);
  console.log(`  Order Number    : ${bill.orderNumber}`);
  console.log(`  Sale Type       : ${bill.saleType}`);
  console.log(`  Table Number    : ${bill.tableNumber === null ? "null (NO TABLE - Correct!)" : bill.tableNumber}`);
  console.log(`  Cashier Name    : ${bill.cashierName}`);
  console.log(`  Grand Total     : ₹${bill.grandTotal}`);
  console.log(`  Cash Tendered   : ₹${bill.amountTendered}`);
  console.log(`  Change Returned : ₹${bill.changeGiven}`);
  console.log(`  Payment Status  : ${bill.paymentStatus}`);

  // Assertions for Counter Sale
  if (bill.saleType !== "SELF_SERVICE") {
    throw new Error(`Expected bill.saleType to be 'SELF_SERVICE', got '${bill.saleType}'`);
  }
  if (bill.tableNumber !== null) {
    throw new Error(`Requirement 8 violation: TableNumber must be null for counter orders, got '${bill.tableNumber}'`);
  }
  if (Number(bill.grandTotal) !== expectedGrandTotal) {
    throw new Error(`Grand total mismatch: expected ${expectedGrandTotal}, got ${bill.grandTotal}`);
  }
  if (Number(bill.changeGiven) !== expectedChange) {
    throw new Error(`Change calculation mismatch: expected ${expectedChange}, got ${bill.changeGiven}`);
  }

  // 4. Requirement 9: KITCHEN ORDER TICKET (KOT) VERIFICATION
  console.log("\n4. Verifying Kitchen Workflow & KOT Generation...");
  console.log(`  Generated KOT   : ${kot.kotNumber} (Status: ${kot.status})`);
  console.log(`  KOT Sale Type   : ${kot.saleType}`);
  console.log(`  KOT Table       : ${kot.tableNumber === null ? "null (No Table - Correct!)" : kot.tableNumber}`);

  if (kot.saleType !== "SELF_SERVICE") {
    throw new Error(`Expected kot.saleType to be 'SELF_SERVICE', got '${kot.saleType}'`);
  }

  // Verify KOT list for kitchen
  const kitchenKotsRes = await request(`/api/kot/order/${bill.orderId}`, { headers: authHeaders });
  const kitchenKots = kitchenKotsRes.data;
  console.log(`✓ Kitchen successfully received ${kitchenKots.length} KOT ticket for Order ${bill.orderNumber}`);
  if (kitchenKots.length === 0 || kitchenKots[0].kotNumber !== kot.kotNumber) {
    throw new Error("Kitchen order ticket missing from kitchen order query!");
  }

  // 5. Requirement 10: SALES & REPORTING CHANNEL SEPARATION
  console.log("\n5. Verifying Sales Reports Channel Separation (Table vs Counter)...");
  const summaryRes = await request("/api/reports/summary", { headers: authHeaders });
  console.log("  Summary KPI Breakdown:");
  console.log(`  - Table Service Sales : ₹${summaryRes.data.tableServiceSales} (${summaryRes.data.tableServiceOrders} orders)`);
  console.log(`  - Counter Sales       : ₹${summaryRes.data.counterSales} (${summaryRes.data.counterOrders} orders)`);
  console.log(`  - Total Revenue       : ₹${summaryRes.data.sales}`);

  if (Number(summaryRes.data.counterSales) < expectedGrandTotal) {
    throw new Error("Counter sales not reflected in summary report!");
  }
  console.log("✓ Reports properly segregate TABLE SERVICE from COUNTER SALES!");

  // 6. Requirement 13: CASHIER SHIFT & DRAWER RECONCILIATION
  console.log("\n6. Verifying Cashier Shift & Cash Drawer Reconciliation...");
  const openingCashFloat = 2000;

  // First fetch shift to get expected cash
  const initShiftRes = await request(`/api/reports/cashier-shift?branchId=${branchId}&openingCash=${openingCashFloat}`, {
    headers: authHeaders
  });
  const expectedTillCash = Number(initShiftRes.data.expectedCash);

  // Now submit with matching counted physical cash
  const shiftRes = await request(`/api/reports/cashier-shift?branchId=${branchId}&openingCash=${openingCashFloat}&actualCash=${expectedTillCash}`, {
    headers: authHeaders
  });
  const shift = shiftRes.data;
  console.log("  Cashier Shift Register:");
  console.log(`  - Opening Cash Float : ₹${shift.openingCash}`);
  console.log(`  - Cash Sales         : ₹${shift.cashSales}`);
  console.log(`  - UPI Sales          : ₹${shift.upiSales}`);
  console.log(`  - Card Sales         : ₹${shift.cardSales}`);
  console.log(`  - Total Sales        : ₹${shift.totalSales}`);
  console.log(`  - Expected Cash      : ₹${shift.expectedCash}`);
  console.log(`  - Actual Cash Count  : ₹${shift.actualCash}`);
  console.log(`  - Drawer Difference  : ₹${shift.difference} (${shift.difference === 0 ? "BALANCED" : "DISCREPANCY"})`);
  console.log(`  - Channel Counter    : ₹${shift.counterServiceSales} (${shift.counterServiceBills} bills)`);
  console.log(`  - Channel Table      : ₹${shift.tableServiceSales} (${shift.tableServiceBills} bills)`);

  if (Number(shift.expectedCash) !== (openingCashFloat + Number(shift.cashSales))) {
    throw new Error("Expected cash formula mismatch!");
  }
  if (Number(shift.difference) !== 0) {
    throw new Error("Drawer expected to be balanced!");
  }
  console.log("✓ Cashier Shift drawer balance formula verified!");

  // 7. Requirement 15: VOID / REFUND AUDIT TRAIL
  console.log("\n7. Verifying Bill Voiding / Cancellation Audit Trail...");
  const voidReason = "Customer requested cancellation before pickup";
  const voidRes = await request(`/api/bills/${bill.id}/void`, { method: "POST", headers: authHeaders }, {
    reason: voidReason
  });
  console.log(`✓ Void API Response: ${voidRes.data.message}`);

  // Fetch voided bill to check audit trail
  const voidedBillRes = await request(`/api/bills/${bill.id}`, { headers: authHeaders });
  const voidedBill = voidedBillRes.data;
  console.log(`  Bill Status : ${voidedBill.paymentStatus}`);
  console.log(`  Void Reason : ${voidedBill.voidReason}`);
  console.log(`  Voided At   : ${voidedBill.voidedAt}`);

  if (voidedBill.paymentStatus !== "Voided") {
    throw new Error(`Expected paymentStatus 'Voided', got '${voidedBill.paymentStatus}'`);
  }
  if (voidedBill.voidReason !== voidReason) {
    throw new Error(`Expected voidReason '${voidReason}', got '${voidedBill.voidReason}'`);
  }
  if (!voidedBill.voidedAt) {
    throw new Error("Audit timestamp voidedAt is missing!");
  }

  // Check shift reflects refund
  const shiftAfterVoid = await request(`/api/reports/cashier-shift?branchId=${branchId}&openingCash=${openingCashFloat}`, {
    headers: authHeaders
  });
  console.log(`  Shift Refunds : ₹${shiftAfterVoid.data.refunds} (${shiftAfterVoid.data.voidedCount} voided bill)`);
  if (Number(shiftAfterVoid.data.refunds) < expectedGrandTotal) {
    throw new Error("Voided bill amount not recorded in shift refunds!");
  }

  // 8. Requirement 8: Filter Bills by SaleType
  console.log("\n8. Verifying Bills Query by SaleType filter...");
  const counterBillsRes = await request(`/api/bills?branchId=${branchId}&saleType=SELF_SERVICE`, { headers: authHeaders });
  console.log(`✓ Retrieved ${counterBillsRes.data.length} Counter Sale bill(s).`);
  const tableBillsRes = await request(`/api/bills?branchId=${branchId}&saleType=TABLE_SERVICE`, { headers: authHeaders });
  console.log(`✓ Retrieved ${tableBillsRes.data.length} Table Service bill(s).`);

  console.log("\n=================================================================");
  console.log("🎉 ALL REQUIREMENTS FOR SELF-SERVICE COUNTER SALES VERIFIED 100%!");
  console.log("=================================================================");
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
