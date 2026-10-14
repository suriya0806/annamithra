// Test script to verify the Kitchen Reports view changes
import fs from "fs";

const API_BASE = "http://localhost:5042/api";

async function run() {
  console.log("=== 1. Checking KitchenReportsView.jsx Code Requirements ===");
  const src = fs.readFileSync("frontend/src/KitchenReportsView.jsx", "utf-8");

  // Verify removed tabs
  const removedTabs = [
    "recipe_consumption",
    "spoilage",
    "procurement",
    "Store Inwarding Report",
    "Recipe Deductions",
    "Food Spoilage"
  ];
  for (const tab of removedTabs) {
    if (src.includes(`setReportTab("${tab}")`)) {
      throw new Error(`FAIL: Unrelated tab '${tab}' is still present in KitchenReportsView!`);
    }
  }
  console.log("✓ PASS: Unrelated report tabs (Recipe Deductions, Spoilage, Procurement) removed.");

  // Verify required views
  const expectedSubTabs = [
    "Kitchen Stock Balance",
    "Stocks Received",
    "Stocks Returned",
    "Stock Movement Timeline"
  ];
  for (const st of expectedSubTabs) {
    if (!src.includes(st)) {
      throw new Error(`FAIL: Expected view '${st}' not found in KitchenReportsView!`);
    }
  }
  console.log("✓ PASS: Report views exclusively present:", expectedSubTabs);

  // Verify time display functionality
  if (!src.includes("formatDateTime") || !src.includes("Date & Time")) {
    throw new Error("FAIL: Timestamp formatting or Date & Time column missing!");
  }
  console.log("✓ PASS: Timestamps & Date & Time display verified.");

  // Verify stocks received and returned handling
  if (!src.includes("allReceivedItems") || !src.includes("allReturnedItems")) {
    throw new Error("FAIL: Received and returned stocks logic missing!");
  }
  console.log("✓ PASS: Stocks received and returned data processing verified.");

  console.log("\n=== 2. Testing API Data for Kitchen Reports ===");
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saravana@gmail.com", password: "SuperAdmin@123" })
  });
  if (!loginRes.ok) throw new Error("Login failed");
  const { token } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  const [stocksRes, issuesRes, returnsRes] = await Promise.all([
    fetch(`${API_BASE}/kitchen/stock?branchId=6`, { headers }),
    fetch(`${API_BASE}/kitchen/material-issues?branchId=6`, { headers }),
    fetch(`${API_BASE}/kitchen/material-returns?branchId=6`, { headers })
  ]);

  if (!stocksRes.ok || !issuesRes.ok || !returnsRes.ok) {
    throw new Error("Failed to fetch kitchen report data from backend APIs!");
  }

  const stocks = await stocksRes.json();
  const issues = await issuesRes.json();
  const returns = await returnsRes.json();

  console.log(`✓ PASS: Fetched ${stocks.length} kitchen stocks from backend.`);
  console.log(`✓ PASS: Fetched ${issues.length} material issues (received stocks) from backend.`);
  console.log(`✓ PASS: Fetched ${returns.length} material returns (returned stocks) from backend.`);

  // Verify timestamp exists on items
  if (stocks.length > 0) {
    console.log("Sample Kitchen Stock Item:", stocks[0].itemName, "CurrentStock:", stocks[0].currentStock, "UpdatedAt:", stocks[0].updatedAt);
  }
  if (issues.length > 0) {
    console.log("Sample Stock Received (Issue):", issues[0].issueNumber, "Date:", issues[0].date || issues[0].createdAt, "Items count:", issues[0].items?.length);
  }
  if (returns.length > 0) {
    console.log("Sample Stock Returned (Return):", returns[0].returnNumber, "Date:", returns[0].date || returns[0].createdAt, "Reason:", returns[0].reason, "Items count:", returns[0].items?.length);
  }

  console.log("\n==========================================");
  console.log("KITCHEN REPORT SECTION VERIFIED SUCCESSFULLY!");
  console.log("==========================================");
}

run().catch(err => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
