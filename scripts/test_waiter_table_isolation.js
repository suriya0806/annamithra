// test_waiter_table_isolation.js
// Verification of waiter assigned table isolation logic

const assert = require("assert");

// Simulate the helper functions implemented in WaiterOrderPage
function getTableAssignment(tableNum, assignments) {
  if (!tableNum || !assignments) return null;
  if (assignments[tableNum]) return assignments[tableNum];
  const upper = String(tableNum).trim().toUpperCase();
  for (const [k, val] of Object.entries(assignments)) {
    if (String(k).trim().toUpperCase() === upper) return val;
  }
  return null;
}

function isTableAssignedToCurrentUser(tableNumOrObj, userObj, assignments) {
  if (!userObj) return false;
  const tableNum = typeof tableNumOrObj === "string" ? tableNumOrObj : (tableNumOrObj?.tableNumber || "");
  const activeOrder = typeof tableNumOrObj === "object" ? tableNumOrObj?.activeOrder : null;

  // 1. Check branch table allocation mapping
  const assigned = getTableAssignment(tableNum, assignments);
  if (assigned) {
    if (assigned.id != null && String(assigned.id) === String(userObj.id)) {
      return true;
    }
    const myName = (userObj.fullName || userObj.username || userObj.name || "").toLowerCase().trim();
    if (assigned.name && myName && assigned.name.toLowerCase().trim() === myName) {
      return true;
    }
  }

  // 2. Check active order waiter attribution
  if (activeOrder) {
    if (activeOrder.waiterId != null && String(activeOrder.waiterId) === String(userObj.id)) {
      return true;
    }
    const myName = (userObj.fullName || userObj.username || userObj.name || "").toLowerCase().trim();
    if (activeOrder.waiterName && myName && activeOrder.waiterName.toLowerCase().trim() === myName) {
      return true;
    }
  }

  return false;
}

console.log("=== VERIFYING WAITER ASSIGNED TABLE ISOLATION ===");

// 1. Mock users
const waiter1 = { id: 101, username: "waiter_ramesh", fullName: "Ramesh Kumar", role: "Waiter" };
const waiter2 = { id: 102, username: "waiter_suresh", fullName: "Suresh Patel", role: "Waiter" };
const manager = { id: 50, username: "mgr_anita", fullName: "Anita Sharma", role: "Branch Manager" };

// 2. Mock tables in branch
const allTables = [
  { tableNumber: "T01", status: "AVAILABLE", activeOrder: null },
  { tableNumber: "T02", status: "OCCUPIED", activeOrder: { id: 1, orderNumber: "ORD-1", waiterId: 101, waiterName: "Ramesh Kumar" } },
  { tableNumber: "T03", status: "AVAILABLE", activeOrder: null },
  { tableNumber: "T04", status: "OCCUPIED", activeOrder: { id: 2, orderNumber: "ORD-2", waiterId: 102, waiterName: "Suresh Patel" } },
  { tableNumber: "T05", status: "AVAILABLE", activeOrder: null },
];

// 3. Mock table assignments: T01 & T02 assigned to Ramesh (waiter1), T03 & T04 assigned to Suresh (waiter2), T05 unassigned
const tableAssignments = {
  "T01": { id: 101, name: "Ramesh Kumar" },
  "T02": { id: 101, name: "Ramesh Kumar" },
  "T03": { id: 102, name: "Suresh Patel" },
  "T04": { id: 102, name: "Suresh Patel" },
};

// Test 1: Ramesh only sees T01 and T02
const visibleTablesWaiter1 = (waiter1.role === "Waiter")
  ? allTables.filter((t) => isTableAssignedToCurrentUser(t, waiter1, tableAssignments))
  : allTables;

assert.strictEqual(visibleTablesWaiter1.length, 2, "Waiter 1 should only see 2 assigned tables");
assert.deepStrictEqual(visibleTablesWaiter1.map(t => t.tableNumber), ["T01", "T02"]);
console.log("✓ Waiter 1 (Ramesh) only views assigned tables: T01, T02");

// Test 2: Suresh only sees T03 and T04
const visibleTablesWaiter2 = (waiter2.role === "Waiter")
  ? allTables.filter((t) => isTableAssignedToCurrentUser(t, waiter2, tableAssignments))
  : allTables;

assert.strictEqual(visibleTablesWaiter2.length, 2, "Waiter 2 should only see 2 assigned tables");
assert.deepStrictEqual(visibleTablesWaiter2.map(t => t.tableNumber), ["T03", "T04"]);
console.log("✓ Waiter 2 (Suresh) only views assigned tables: T03, T04");

// Test 3: Branch Manager sees ALL tables
const visibleTablesManager = (manager.role === "Waiter")
  ? allTables.filter((t) => isTableAssignedToCurrentUser(t, manager, tableAssignments))
  : allTables;

assert.strictEqual(visibleTablesManager.length, 5, "Manager should see all 5 tables");
console.log("✓ Branch Manager sees all tables in the floor plan");

// Test 4: Unassigned waiter sees empty list (triggering empty station state)
const waiter3 = { id: 103, username: "waiter_new", fullName: "New Waiter", role: "Waiter" };
const visibleTablesWaiter3 = (waiter3.role === "Waiter")
  ? allTables.filter((t) => isTableAssignedToCurrentUser(t, waiter3, tableAssignments))
  : allTables;

assert.strictEqual(visibleTablesWaiter3.length, 0, "Unassigned waiter should see 0 tables");
console.log("✓ Unassigned waiter correctly sees 0 tables (triggers elegant 'No Tables Assigned' prompt)");

// Test 5: Order isolation in Continuous Table Orders Register
const mockOrders = [
  { id: 1, orderNumber: "ORD-1", tableNumber: "T02", waiterId: 101, waiterName: "Ramesh Kumar", status: "Open" },
  { id: 2, orderNumber: "ORD-2", tableNumber: "T04", waiterId: 102, waiterName: "Suresh Patel", status: "Open" },
  { id: 3, orderNumber: "ORD-3", tableNumber: "T01", waiterId: 101, waiterName: "Ramesh Kumar", status: "Closed" }
];

const visibleOrdersWaiter1 = (waiter1.role === "Waiter")
  ? mockOrders.filter((o) => {
      if (o.waiterId != null && String(o.waiterId) === String(waiter1.id)) return true;
      if (o.tableNumber && isTableAssignedToCurrentUser(o.tableNumber, waiter1, tableAssignments)) return true;
      return false;
    })
  : mockOrders;

assert.strictEqual(visibleOrdersWaiter1.length, 2, "Waiter 1 only sees their own table orders");
assert.deepStrictEqual(visibleOrdersWaiter1.map(o => o.orderNumber), ["ORD-1", "ORD-3"]);
console.log("✓ Waiter 1 only sees orders for their assigned tables (ORD-1, ORD-3)");

// Test 6: Ready KOT queue isolation
const mockKOTs = [
  { id: 10, kotNumber: "KOT-001", tableNumber: "T02", waiterId: 101, status: "Ready" },
  { id: 11, kotNumber: "KOT-002", tableNumber: "T04", waiterId: 102, status: "Ready" }
];

const myReadyKOTsWaiter1 = mockKOTs.filter((k) => {
  return isTableAssignedToCurrentUser(k.tableNumber, waiter1, tableAssignments) ||
    (k.waiterId != null && String(k.waiterId) === String(waiter1.id));
});

assert.strictEqual(myReadyKOTsWaiter1.length, 1, "Waiter 1 only receives KOTs for their assigned tables");
assert.strictEqual(myReadyKOTsWaiter1[0].kotNumber, "KOT-001");
console.log("✓ Waiter 1 only receives kitchen notifications for their assigned table (KOT-001)");

// Test 7: Case insensitivity and whitespace tolerance in table numbers
assert.strictEqual(isTableAssignedToCurrentUser(" t01 ", waiter1, tableAssignments), true, "Table lookup must be case and whitespace insensitive");
assert.strictEqual(isTableAssignedToCurrentUser("T04", waiter1, tableAssignments), false, "Waiter 1 must not be assigned T04");
console.log("✓ Case insensitivity & whitespace trimming verified");

console.log("\n=======================================================");
console.log("🎉 ALL WAITER TABLE ISOLATION VERIFICATION CHECKS PASSED!");
console.log("=======================================================");
