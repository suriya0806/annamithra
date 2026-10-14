const fs = require("fs");
const path = require("path");

console.log("=== VERIFYING PURCHASE SECTION RESTRUCTURING ===");

const appPath = path.join(__dirname, "../frontend/src/App.jsx");
const purchaseDashPath = path.join(__dirname, "../frontend/src/PurchaseDashboard.jsx");
const kitchenPath = path.join(__dirname, "../frontend/src/KitchenManagement.jsx");

const appSrc = fs.readFileSync(appPath, "utf8");
const purchaseDashSrc = fs.readFileSync(purchaseDashPath, "utf8");
const kitchenSrc = fs.readFileSync(kitchenPath, "utf8");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ FAILED: ${message}`);
  }
}

// 1. Sidebar checks in App.jsx
console.log("\n1. Sidebar Menu Verification:");
assert(appSrc.includes('id: "purchase"'), "App.jsx has 'purchase' menu item");
assert(appSrc.includes('label: "Purchase"'), "App.jsx has label 'Purchase'");

// Check that navSections does NOT contain separate items for Vendors, Purchase Return, GRN, Reports
const navSectionMatch = appSrc.match(/title:\s*"KITCHEN & PRODUCTION",[\s\S]*?items:\s*\[([\s\S]*?)\]\s*\}/);
assert(Boolean(navSectionMatch), "Found 'KITCHEN & PRODUCTION' in navSections");

if (navSectionMatch) {
  const itemsBlock = navSectionMatch[1];
  assert(!itemsBlock.includes('label: "Vendors"'), "Sidebar does NOT have separate 'Vendors' item");
  assert(!itemsBlock.includes('label: "Purchase Return"'), "Sidebar does NOT have separate 'Purchase Return' item");
  assert(!itemsBlock.includes('label: "GRN"'), "Sidebar does NOT have separate 'GRN' item");
  assert(!itemsBlock.includes('label: "Purchase Reports"'), "Sidebar does NOT have separate 'Purchase Reports' item");
  assert(itemsBlock.includes('id: "purchase"'), "Sidebar has ONLY 'purchase' item for purchase section");
}

// 2. Purchase Dashboard Component Verification
console.log("\n2. Purchase Dashboard Component Verification:");
assert(fs.existsSync(purchaseDashPath), "PurchaseDashboard.jsx exists");
assert(appSrc.includes('import PurchaseDashboard from "./PurchaseDashboard"'), "App.jsx imports PurchaseDashboard");
assert(appSrc.includes('<PurchaseDashboard'), "App.jsx mounts PurchaseDashboard");

// Verify Purchase Dashboard contains ONLY the 5 options
assert(purchaseDashSrc.includes('title: "Vendors"'), "Contains 'Vendors' option");
assert(purchaseDashSrc.includes('title: "Purchase"'), "Contains 'Purchase' option");
assert(purchaseDashSrc.includes('title: "Purchase Return"'), "Contains 'Purchase Return' option");
assert(purchaseDashSrc.includes('title: "GRN"'), "Contains 'GRN' option");
assert(purchaseDashSrc.includes('title: "Reports"'), "Contains 'Reports' option");

// Verify screen / slide rendering
assert(purchaseDashSrc.includes('<VendorsManagement'), "Renders VendorsManagement for Vendors screen");
assert(purchaseDashSrc.includes('<PurchasesManagement'), "Renders PurchasesManagement for Purchase screen");
assert(purchaseDashSrc.includes('<PurchaseReturnsManagement'), "Renders PurchaseReturnsManagement for Purchase Return screen");
assert(purchaseDashSrc.includes('<GRNManagement'), "Renders GRNManagement for GRN screen");
assert(purchaseDashSrc.includes('<KitchenReportsView'), "Renders KitchenReportsView for Reports screen");

// 3. KitchenManagement Component Exports
console.log("\n3. KitchenManagement Component Exports:");
assert(kitchenSrc.includes('export function VendorsManagement'), "KitchenManagement exports VendorsManagement");
assert(kitchenSrc.includes('export function PurchasesManagement'), "KitchenManagement exports PurchasesManagement");
assert(kitchenSrc.includes('export function PurchaseReturnsManagement'), "KitchenManagement exports PurchaseReturnsManagement");
assert(kitchenSrc.includes('export function KitchenReportsView'), "KitchenManagement exports KitchenReportsView");

console.log(`\n=======================================================`);
console.log(`Results: ${passed}/${total} criteria passed (${Math.round((passed/total)*100)}%)`);
console.log(`=======================================================`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
