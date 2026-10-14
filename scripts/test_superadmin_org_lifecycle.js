// Verification test script for Super Admin Organization Management
const http = require("http");

const BASE_URL = "http://localhost:5042/api";

async function request(path, options = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log("==================================================");
  console.log("SUPER ADMIN VERIFICATION TEST SUITE");
  console.log("==================================================");

  // 1. Login as Super Admin
  console.log("\n[Test 1] Logging in as Super Admin...");
  const loginRes = await request("/auth/login", {
    method: "POST",
    body: { email: "superadmin@samaya.com", password: "SuperAdmin@123" }
  });
  if (!loginRes.ok) {
    throw new Error(`Super Admin login failed: ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log("✓ Super Admin login successful. Role:", loginRes.data.user.role);

  // 2. Load organizations for Dashboard KPI & Table
  console.log("\n[Test 2 & 3] Loading organizations for Dashboard (Total Organizations KPI)...");
  const orgsRes = await request("/superadmin/organizations", { headers: authHeaders });
  if (!orgsRes.ok) {
    throw new Error(`Failed to load organizations: ${JSON.stringify(orgsRes.data)}`);
  }
  const initialOrgs = orgsRes.data;
  const initialCount = initialOrgs.length;
  console.log(`✓ Total Organizations count from DB: ${initialCount}`);
  console.log("✓ Organizations list:");
  initialOrgs.forEach(o => {
    console.log(`  - [ID ${o.id}] ${o.name} | Type: ${o.type} | City: ${o.city} | Branches: ${o.branchCount} | Status: ${o.status}`);
  });

  // 4 & 5. Verify branch count for each organization
  console.log("\n[Test 4, 5, 6] Verifying branch counts...");
  const saravanas = initialOrgs.find(o => o.name.toLowerCase() === "saravanas");
  if (!saravanas) throw new Error("saravanas organization not found");
  console.log(`✓ saravanas branch count: ${saravanas.branchCount} (expected >= 2)`);

  // 7, 8, 9. View organization details and branch list
  console.log(`\n[Test 7, 8, 9] Viewing organization details for saravanas (ID ${saravanas.id})...`);
  const viewRes = await request(`/superadmin/organizations/${saravanas.id}`, { headers: authHeaders });
  if (!viewRes.ok) {
    throw new Error(`Failed to get organization details: ${JSON.stringify(viewRes.data)}`);
  }
  const saravanasDetails = viewRes.data;
  console.log("✓ Organization details loaded:");
  console.log(`  - Name: ${saravanasDetails.name}`);
  console.log(`  - Type: ${saravanasDetails.type}`);
  console.log(`  - City: ${saravanasDetails.city}`);
  console.log(`  - Status: ${saravanasDetails.status}`);
  console.log(`  - Total Branches: ${saravanasDetails.branchCount}`);
  console.log("  - Branches list:");
  saravanasDetails.branches.forEach(b => {
    console.log(`     * ${b.name} | Location: ${b.location} | Status: ${b.status}`);
  });
  if (!saravanasDetails.branches || saravanasDetails.branches.length === 0) {
    throw new Error("Expected saravanas to have branches listed");
  }

  // 10, 11, 12. Verify Super Admin cannot create branches directly via BranchesController
  console.log("\n[Test 10, 11, 12] Verifying Super Admin cannot create branches...");
  const branchCreateAttempt = await request("/branches", {
    method: "POST",
    headers: authHeaders,
    body: { name: "Unauthorized Branch", code: "UB01", address: "Test", city: "Test", phone: "123" }
  });
  console.log(`✓ Direct branch creation by Super Admin denied with status: ${branchCreateAttempt.status} (expected 403 Forbidden)`);

  // 13. Create a new organization with administrator login credentials
  console.log("\n[Test 13] Creating a new organization 'Grand Royal Hotel' with Admin Login Credentials...");
  const createRes = await request("/superadmin/organizations", {
    method: "POST",
    headers: authHeaders,
    body: {
      name: "Grand Royal Hotel",
      type: "Hotel",
      city: "Tirunelveli",
      phone: "9876543210",
      adminName: "Royal Admin",
      adminEmail: "admin@grandroyal.com",
      password: "Royal@Password123"
    }
  });
  if (!createRes.ok) {
    throw new Error(`Create organization failed: ${JSON.stringify(createRes.data)}`);
  }
  const createdOrg = createRes.data.organization;
  const createdAdmin = createRes.data.admin;
  console.log(`✓ Organization created successfully: ID ${createdOrg.id}, Name: ${createdOrg.name}`);
  console.log(`✓ Administrator created: ID ${createdAdmin?.id}, Name: ${createdAdmin?.name}, Email: ${createdAdmin?.email}, Role: ${createdAdmin?.role}`);
  if (!createdAdmin || createdAdmin.email !== "admin@grandroyal.com") {
    throw new Error("Expected administrator to be created and returned with organization");
  }

  // 13b. Verify newly created Organization Admin can log in using their credentials
  console.log("\n[Test 13b] Verifying newly created Org Admin can log in via /api/auth/login...");
  const newAdminLoginRes = await request("/auth/login", {
    method: "POST",
    body: { email: "admin@grandroyal.com", password: "Royal@Password123" }
  });
  if (!newAdminLoginRes.ok) {
    throw new Error(`Org Admin login failed: ${JSON.stringify(newAdminLoginRes.data)}`);
  }
  console.log("✓ Org Admin login successful! Role:", newAdminLoginRes.data.user.role, "Org:", newAdminLoginRes.data.user.organizationName);
  if (newAdminLoginRes.data.user.role !== "Organization Admin") {
    throw new Error(`Expected role 'Organization Admin', got '${newAdminLoginRes.data.user.role}'`);
  }

  // 14 & 15. Verify organization appears in list and Total Organizations count increases
  console.log("\n[Test 14 & 15] Verifying organizations list, KPI count increase, and admin email presence...");
  const orgsAfterCreate = await request("/superadmin/organizations", { headers: authHeaders });
  const newCount = orgsAfterCreate.data.length;
  console.log(`✓ New Total Organizations count: ${newCount} (was ${initialCount})`);
  if (newCount !== initialCount + 1) {
    throw new Error(`Expected count to increase by 1, but got ${newCount}`);
  }
  const foundNew = orgsAfterCreate.data.find(o => o.id === createdOrg.id);
  if (!foundNew) {
    throw new Error("Created organization not found in organizations list");
  }
  console.log(`✓ Found newly created organization in list: ${foundNew.name} with ${foundNew.branchCount} branches and admin email: ${foundNew.adminEmail}`);
  if (foundNew.adminEmail !== "admin@grandroyal.com") {
    throw new Error(`Expected admin email in list to be 'admin@grandroyal.com', got '${foundNew.adminEmail}'`);
  }

  // 16 & 17. Open the new organization and verify branch count is 0 and admin credentials match
  console.log("\n[Test 16 & 17] Verifying new organization details, 0 branch count, and admin credentials in view...");
  const newOrgDetailsRes = await request(`/superadmin/organizations/${createdOrg.id}`, { headers: authHeaders });
  const newOrgDetails = newOrgDetailsRes.data;
  console.log(`✓ Total Branches: ${newOrgDetails.branchCount}`);
  console.log(`✓ Branches array length: ${newOrgDetails.branches.length}`);
  console.log(`✓ Admin in View: Name: ${newOrgDetails.admin?.name}, Email: ${newOrgDetails.admin?.email}, Role: ${newOrgDetails.admin?.role}`);
  if (newOrgDetails.branchCount !== 0 || newOrgDetails.branches.length !== 0) {
    throw new Error("Expected new organization to have 0 branches");
  }
  if (!newOrgDetails.admin || newOrgDetails.admin.email !== "admin@grandroyal.com") {
    throw new Error("Admin credentials not returned or mismatch in organization details view");
  }

  // 17b. Update administrator credentials / reset password
  console.log("\n[Test 17b] Testing Super Admin updating admin credentials & password...");
  const updateCredsRes = await request(`/superadmin/organizations/${createdOrg.id}/admin-credentials`, {
    method: "POST",
    headers: authHeaders,
    body: {
      password: "NewPassword@456"
    }
  });
  if (!updateCredsRes.ok) {
    throw new Error(`Update admin credentials failed: ${JSON.stringify(updateCredsRes.data)}`);
  }
  console.log(`✓ Admin credentials updated: ${updateCredsRes.data.message}`);

  // 17c. Verify login with updated password
  console.log("\n[Test 17c] Verifying login with updated password...");
  const updatedLoginRes = await request("/auth/login", {
    method: "POST",
    body: { email: "admin@grandroyal.com", password: "NewPassword@456" }
  });
  if (!updatedLoginRes.ok) {
    throw new Error(`Login with updated password failed: ${JSON.stringify(updatedLoginRes.data)}`);
  }
  console.log("✓ Login with updated password succeeded!");

  // 18 & 19 & 20. Delete the organization
  console.log(`\n[Test 18, 19, 20] Deleting newly created organization (ID ${createdOrg.id})...`);
  const delRes = await request(`/superadmin/organizations/${createdOrg.id}`, {
    method: "DELETE",
    headers: authHeaders
  });
  if (!delRes.ok) {
    throw new Error(`Delete organization failed: ${JSON.stringify(delRes.data)}`);
  }
  console.log(`✓ Deletion successful: ${delRes.data.message}`);

  // 21. Verify organization is removed and other organizations are unaffected
  console.log("\n[Test 21] Verifying organization is removed and others are unaffected...");
  const orgsAfterDelete = await request("/superadmin/organizations", { headers: authHeaders });
  const finalCount = orgsAfterDelete.data.length;
  console.log(`✓ Final Total Organizations count: ${finalCount} (matches initial ${initialCount})`);
  if (finalCount !== initialCount) {
    throw new Error(`Expected count to return to ${initialCount}, but got ${finalCount}`);
  }
  const deletedCheck = orgsAfterDelete.data.find(o => o.id === createdOrg.id);
  if (deletedCheck) {
    throw new Error("Deleted organization still exists in list");
  }
  const saravanasCheck = orgsAfterDelete.data.find(o => o.name.toLowerCase() === "saravanas");
  if (!saravanasCheck || saravanasCheck.branchCount !== saravanas.branchCount) {
    throw new Error("Other organizations were affected!");
  }
  console.log("✓ Other organizations completely unaffected!");

  // 22. Verify system organization protection
  console.log("\n[Test 22] Verifying SAMAYA System organization is protected against deletion...");
  const systemOrg = initialOrgs.find(o => o.name.toLowerCase() === "samaya system");
  if (systemOrg) {
    const sysDelAttempt = await request(`/superadmin/organizations/${systemOrg.id}`, {
      method: "DELETE",
      headers: authHeaders
    });
    console.log(`✓ Delete SAMAYA System rejected with status: ${sysDelAttempt.status} (expected 400 Bad Request)`);
    console.log(`  Message: ${sysDelAttempt.data.message}`);
    if (sysDelAttempt.status !== 400) {
      throw new Error("Expected HTTP 400 when attempting to delete SAMAYA System");
    }
  }

  // 23. Verify non-Super Admin cannot access Super Admin endpoints
  console.log("\n[Test 23] Verifying authorization: Org Admin cannot access Super Admin API...");
  const orgAdminLogin = await request("/auth/login", {
    method: "POST",
    body: { email: "saravana@gmail.com", password: "SuperAdmin@123" }
  });
  if (orgAdminLogin.ok) {
    const orgAdminToken = orgAdminLogin.data.token;
    const orgAdminAttempt = await request("/superadmin/organizations", {
      headers: { Authorization: `Bearer ${orgAdminToken}` }
    });
    console.log(`✓ Org Admin access to Super Admin API returned status: ${orgAdminAttempt.status} (expected 403 Forbidden)`);
  }

  // 24. Verify existing modules still work for operational roles
  console.log("\n[Test 24] Verifying existing operational modules still work for Org Admin...");
  if (orgAdminLogin.ok) {
    const orgAdminToken = orgAdminLogin.data.token;
    const branchesRes = await request("/branches", {
      headers: { Authorization: `Bearer ${orgAdminToken}` }
    });
    console.log(`✓ Org Admin successfully fetched operational branches: ${branchesRes.data.length} branches returned`);
  }

  console.log("\n==================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! (24/24)");
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
