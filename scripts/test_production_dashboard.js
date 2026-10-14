const fs = require("fs");
const path = require("path");

console.log("=== VERIFYING PRODUCTION SECTION RESTRUCTURING ===");

const appPath = path.join(__dirname, "../frontend/src/App.jsx");
const prodDashPath = path.join(__dirname, "../frontend/src/ProductionDashboard.jsx");
const kitchenPath = path.join(__dirname, "../frontend/src/KitchenManagement.jsx");

const appSrc = fs.readFileSync(appPath, "utf8");
const prodDashSrc = fs.readFileSync(prodDashPath, "utf8");
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
assert(appSrc.includes('id: "production"'), "App.jsx has single 'production' menu item");
assert(appSrc.includes('label: "Production"'), "App.jsx has label 'Production'");

// Check that navSections does NOT contain production_plan, material_issue, material_return
const navSectionMatch = appSrc.match(/title:\s*"KITCHEN & PRODUCTION",[\s\S]*?items:\s*\[([\s\S]*?)\]\s*\}/);
assert(Boolean(navSectionMatch), "Found 'KITCHEN & PRODUCTION' in navSections");

if (navSectionMatch) {
  const itemsBlock = navSectionMatch[1];
  assert(!itemsBlock.includes('id: "production_plan"'), "Sidebar does NOT have separate 'production_plan' item");
  assert(!itemsBlock.includes('id: "material_issue"'), "Sidebar does NOT have separate 'material_issue' item");
  assert(!itemsBlock.includes('id: "material_return"'), "Sidebar does NOT have separate 'material_return' item");
  assert(itemsBlock.includes('id: "production"'), "Sidebar has ONLY 'production' item for production section");
}

// 2. Production Dashboard Component Verification
console.log("\n2. Production Dashboard Component Verification:");
assert(fs.existsSync(prodDashPath), "ProductionDashboard.jsx exists");
assert(appSrc.includes('import ProductionDashboard from "./ProductionDashboard"'), "App.jsx imports ProductionDashboard");
assert(appSrc.includes('<ProductionDashboard'), "App.jsx mounts ProductionDashboard");

// Verify Production Dashboard contains ONLY the 3 options
assert(prodDashSrc.includes('title: "Production Plan"'), "Contains 'Production Plan' option");
assert(prodDashSrc.includes('title: "Material Issue"'), "Contains 'Material Issue' option");
assert(prodDashSrc.includes('title: "Material Return"'), "Contains 'Material Return' option");

// Verify screen / slide rendering
assert(prodDashSrc.includes('<DailyProductionPlan'), "Renders DailyProductionPlan for Production Plan screen");
assert(prodDashSrc.includes('<MaterialIssueManagement'), "Renders MaterialIssueManagement for Material Issue screen");
assert(prodDashSrc.includes('<MaterialReturnManagement'), "Renders MaterialReturnManagement for Material Return screen");

// Verify KitchenManagement exports
console.log("\n3. KitchenManagement Component Exports:");
assert(kitchenSrc.includes('export function MaterialIssueManagement'), "KitchenManagement exports MaterialIssueManagement");
assert(kitchenSrc.includes('export function MaterialReturnManagement'), "KitchenManagement exports MaterialReturnManagement");

console.log(`\n=======================================================`);
console.log(`Results: ${passed}/${total} criteria passed (${Math.round((passed/total)*100)}%)`);
console.log(`=======================================================`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
