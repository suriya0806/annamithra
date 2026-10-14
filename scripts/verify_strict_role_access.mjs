// scripts/verify_strict_role_access.mjs
const API_URL = "http://localhost:5042/api";

const ACCOUNTS = [
  { role: "Kitchen Manager", email: "sa@gmail.com", pass: "SuperAdmin@123" },
  { role: "Chef", email: "j@gmail.com", pass: "SuperAdmin@123" },
  { role: "Inventory Manager", email: "r@gmail.com", pass: "SuperAdmin@123" },
  { role: "Waiter", email: "f@gmail.com", pass: "SuperAdmin@123" },
  { role: "Cashier", email: "ss@gmail.com", pass: "SuperAdmin@123" },
  { role: "Accountant", email: "sri@gmail.com", pass: "SuperAdmin@123" },
  { role: "Branch Manager", email: "s@gmail.com", pass: "SuperAdmin@123" },
  { role: "Organization Admin", email: "saravana@gmail.com", pass: "SuperAdmin@123" }
];

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

async function testEndpoint(name, url, token, expectedStatus, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const pass = res.status === expectedStatus;
  const mark = pass ? "✓" : "✗";
  console.log(`   ${mark} [${method}] ${name}: status ${res.status} (expected ${expectedStatus})`);
  if (!pass) {
    const text = await res.text().catch(() => "");
    console.error(`      -> FAILURE: Expected ${expectedStatus}, got ${res.status}. Response: ${text.slice(0, 150)}`);
  }
  return pass;
}

async function run() {
  console.log("================================================================================");
  console.log("ANNAMITHRA — Strict Role-Based Access Control Verification");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  const results = {};

  for (const acc of ACCOUNTS) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Testing Role: ${acc.role} (${acc.email})`);
    console.log(`--------------------------------------------------------------------------------`);
    
    let token, user;
    try {
      const loginData = await login(acc.email, acc.pass);
      token = loginData.token;
      user = loginData.user;
      console.log(`✓ Logged in as: ${user.name} | OrgId: ${user.organizationId} | BranchId: ${user.branchId}`);
    } catch (e) {
      console.error(`✗ Login failed: ${e.message}`);
      continue;
    }

    const branchId = user.branchId || 6;
    let rolePassed = true;

    async function check(name, url, expected) {
      totalTests++;
      const ok = await testEndpoint(name, url, token, expected);
      if (ok) passedTests++;
      else rolePassed = false;
      return ok;
    }

    if (acc.role === "Kitchen Manager") {
      // PERMITTED: Central Inventory, KDS, Menu, Orders, Production, Kitchen, Reports (kitchen-related only)
      await check("Orders Access", `${API_URL}/orders?branchId=${branchId}`, 200);
      await check("KOT Access", `${API_URL}/kot?branchId=${branchId}`, 200);
      await check("Menu Access", `${API_URL}/menu?branchId=${branchId}`, 200);
      await check("Inventory Items", `${API_URL}/inventory/items?branchId=${branchId}`, 200);
      await check("Kitchen Dashboard", `${API_URL}/kitchen/dashboard?branchId=${branchId}`, 200);
      await check("Kitchen Report (Kitchen)", `${API_URL}/reports/analytics?category=kitchen&type=production_plan_vs_actual&branchId=${branchId}`, 200);
      await check("Kitchen Report (Wastage)", `${API_URL}/reports/analytics?category=wastage&type=wastage_quantity&branchId=${branchId}`, 200);

      // RESTRICTED: Sales reports, Billing, Purchase, Branches, Users
      await check("Reports (Sales - Restricted)", `${API_URL}/reports/analytics?category=sales&type=daily_sales&branchId=${branchId}`, 403);
      await check("Reports (Summary - Restricted)", `${API_URL}/reports/summary?branchId=${branchId}`, 403);
      await check("Bills (Restricted)", `${API_URL}/bills?branchId=${branchId}`, 403);
      await check("Purchase Vendors (Restricted)", `${API_URL}/kitchen/vendors?branchId=${branchId}`, 403);
      await check("Branches Management (Restricted)", `${API_URL}/branches/${branchId}/overview`, 403);
      await check("Users Management (Restricted)", `${API_URL}/users?branchId=${branchId}`, 403);
    } else if (acc.role === "Chef") {
      // PERMITTED: KDS, Kitchen, Inventory, Orders, Menu, Production
      await check("Orders Access", `${API_URL}/orders?branchId=${branchId}`, 200);
      await check("KOT Access", `${API_URL}/kot?branchId=${branchId}`, 200);
      await check("Menu Access", `${API_URL}/menu?branchId=${branchId}`, 200);
      await check("Inventory Items", `${API_URL}/inventory/items?branchId=${branchId}`, 200);
      await check("Kitchen Dashboard", `${API_URL}/kitchen/dashboard?branchId=${branchId}`, 200);

      // RESTRICTED: Reports, Purchase, Branches, Users, Bills
      await check("Reports (Kitchen - Restricted)", `${API_URL}/reports/analytics?category=kitchen&branchId=${branchId}`, 403);
      await check("Reports (Sales - Restricted)", `${API_URL}/reports/analytics?category=sales&branchId=${branchId}`, 403);
      await check("Purchase Vendors (Restricted)", `${API_URL}/kitchen/vendors?branchId=${branchId}`, 403);
      await check("Bills (Restricted)", `${API_URL}/bills?branchId=${branchId}`, 403);
      await check("Branches Management (Restricted)", `${API_URL}/branches/${branchId}/overview`, 403);
      await check("Users Management (Restricted)", `${API_URL}/users?branchId=${branchId}`, 403);
    } else if (acc.role === "Inventory Manager") {
      // PERMITTED: Production, Purchase, Kitchen, Central Inventory, Branches, Reports (inventory-related only)
      await check("Inventory Items", `${API_URL}/inventory/items?branchId=${branchId}`, 200);
      await check("Purchase Vendors", `${API_URL}/kitchen/vendors?branchId=${branchId}`, 200);
      await check("Kitchen Dashboard", `${API_URL}/kitchen/dashboard?branchId=${branchId}`, 200);
      await check("Branches Overview", `${API_URL}/branches/${branchId}/overview`, 200);
      await check("Inventory Report (Inventory)", `${API_URL}/reports/analytics?category=inventory&type=current_stock&branchId=${branchId}`, 200);
      await check("Inventory Report (Purchase)", `${API_URL}/reports/analytics?category=purchase&type=purchase_orders&branchId=${branchId}`, 200);
      await check("Inventory Report (Wastage)", `${API_URL}/reports/analytics?category=wastage&type=wastage_quantity&branchId=${branchId}`, 200);

      // RESTRICTED: Orders, KDS, Menu, Bills, Users, Sales Reports
      await check("Reports (Sales - Restricted)", `${API_URL}/reports/analytics?category=sales&type=daily_sales&branchId=${branchId}`, 403);
      await check("Orders (Restricted)", `${API_URL}/orders?branchId=${branchId}`, 403);
      await check("KOT (Restricted)", `${API_URL}/kot?branchId=${branchId}`, 403);
      await check("Menu (Restricted)", `${API_URL}/menu?branchId=${branchId}`, 403);
      await check("Bills (Restricted)", `${API_URL}/bills?branchId=${branchId}`, 403);
      await check("Users Management (Restricted)", `${API_URL}/users?branchId=${branchId}`, 403);
    } else if (acc.role === "Waiter") {
      // PERMITTED: Menu, Orders, KDS
      await check("Menu Access", `${API_URL}/menu?branchId=${branchId}`, 200);
      await check("Orders Access", `${API_URL}/orders?branchId=${branchId}`, 200);
      await check("KOT Access", `${API_URL}/kot?branchId=${branchId}`, 200);

      // RESTRICTED: Central Inventory, Kitchen, Purchase, Reports, Bills, Branches, Users
      await check("Inventory Items (Restricted)", `${API_URL}/inventory/items?branchId=${branchId}`, 403);
      await check("Kitchen Dashboard (Restricted)", `${API_URL}/kitchen/dashboard?branchId=${branchId}`, 403);
      await check("Purchase Vendors (Restricted)", `${API_URL}/kitchen/vendors?branchId=${branchId}`, 403);
      await check("Reports (Restricted)", `${API_URL}/reports/analytics?category=sales&branchId=${branchId}`, 403);
      await check("Bills (Restricted)", `${API_URL}/bills?branchId=${branchId}`, 403);
      await check("Branches Management (Restricted)", `${API_URL}/branches/${branchId}/overview`, 403);
      await check("Users Management (Restricted)", `${API_URL}/users?branchId=${branchId}`, 403);
    } else if (acc.role === "Cashier" || acc.role === "Accountant") {
      // PERMITTED: All except Branches and Users
      await check("Bills Access", `${API_URL}/bills?branchId=${branchId}`, 200);
      await check("Orders Access", `${API_URL}/orders?branchId=${branchId}`, 200);
      await check("KOT Access", `${API_URL}/kot?branchId=${branchId}`, 200);
      await check("Menu Access", `${API_URL}/menu?branchId=${branchId}`, 200);
      await check("Inventory Items", `${API_URL}/inventory/items?branchId=${branchId}`, 200);
      await check("Purchase Vendors", `${API_URL}/kitchen/vendors?branchId=${branchId}`, 200);
      await check("Reports Analytics", `${API_URL}/reports/analytics?category=sales&branchId=${branchId}`, 200);

      // RESTRICTED: Branches and Users
      await check("Branches Management (Restricted)", `${API_URL}/branches/${branchId}/overview`, 403);
      await check("Users Management (Restricted)", `${API_URL}/users?branchId=${branchId}`, 403);
    } else if (acc.role === "Branch Manager") {
      // PERMITTED: All branch operations including Branches & Users
      await check("Bills Access", `${API_URL}/bills?branchId=${branchId}`, 200);
      await check("Orders Access", `${API_URL}/orders?branchId=${branchId}`, 200);
      await check("KOT Access", `${API_URL}/kot?branchId=${branchId}`, 200);
      await check("Inventory Items", `${API_URL}/inventory/items?branchId=${branchId}`, 200);
      await check("Branches Overview", `${API_URL}/branches/${branchId}/overview`, 200);
      await check("Users Access", `${API_URL}/users?branchId=${branchId}`, 200);
      await check("Reports Analytics", `${API_URL}/reports/analytics?category=sales&branchId=${branchId}`, 200);
    } else if (acc.role === "Organization Admin") {
      await check("Branches Overview", `${API_URL}/branches/${branchId}/overview`, 200);
      await check("Users Access", `${API_URL}/users?branchId=${branchId}`, 200);
      await check("Reports Analytics", `${API_URL}/reports/analytics?category=sales&branchId=${branchId}`, 200);
    }

    results[acc.role] = rolePassed;
  }

  console.log("\n================================================================================");
  console.log(`SUMMARY: ${passedTests} / ${totalTests} endpoints passed.`);
  console.log("================================================================================");
  for (const [role, ok] of Object.entries(results)) {
    console.log(`${ok ? "✓" : "✗"} ${role}: ${ok ? "ALL PERMISSION TESTS PASSED" : "FAILED"}`);
  }
}

run().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
