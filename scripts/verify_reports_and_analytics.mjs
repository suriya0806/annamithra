import assert from 'assert';

const API_BASE = 'http://localhost:5042';

async function main() {
  console.log('--- 1. Authenticating as Organization Admin ---');
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'saravana@gmail.com', password: 'SuperAdmin@123' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Logged in as:', loginData.user.name, 'Org ID:', loginData.user.organizationId, 'Role:', loginData.user.role);
  assert.strictEqual(loginData.user.organizationId, 6, 'Organization ID should be 6');

  const headers = {
    'Authorization': `Bearer ${token}`
  };

  console.log('\n--- 2. Testing Branches for Org 6 ---');
  const branchesRes = await fetch(`${API_BASE}/api/branches`, { headers });
  assert.strictEqual(branchesRes.status, 200);
  const branches = await branchesRes.json();
  console.log('Branches found:', branches.map(b => ({ id: b.id, name: b.name, orgId: b.organizationId })));
  const orgBranches = branches.filter(b => b.organizationId === 6);
  assert(orgBranches.length >= 2, 'Should have at least 2 branches for org 6');
  const mainBranchId = orgBranches.find(b => b.name === 'Main Branch')?.id || 6;
  const simmakkalBranchId = orgBranches.find(b => b.name.includes('Simmakkal'))?.id || 7;

  console.log('\n--- 3. Testing All Branches vs Specific Branch (Sales Report) ---');
  // All branches
  const allRes = await fetch(`${API_BASE}/api/reports/analytics?category=sales&type=daily_sales&datePreset=this_month`, { headers });
  assert.strictEqual(allRes.status, 200);
  const allData = await allRes.json();
  console.log('All branches sales records count:', allData.records.length);
  console.log('All branches columns:', allData.columns.map(c => c.key));
  assert(allData.columns.some(c => c.key === 'branchName'), 'All branches report should have branchName column');

  // Specific branch (Main Branch)
  const mbRes = await fetch(`${API_BASE}/api/reports/analytics?category=sales&type=daily_sales&datePreset=this_month&branchId=${mainBranchId}`, { headers });
  assert.strictEqual(mbRes.status, 200);
  const mbData = await mbRes.json();
  console.log('Main branch sales records count:', mbData.records.length);

  // Specific branch (Simmakkal - 0 orders)
  const simRes = await fetch(`${API_BASE}/api/reports/analytics?category=sales&type=daily_sales&datePreset=this_month&branchId=${simmakkalBranchId}`, { headers });
  assert.strictEqual(simRes.status, 200);
  const simData = await simRes.json();
  console.log('Simmakkal sales records count:', simData.records.length);
  assert.strictEqual(simData.records.length, 0, 'Simmakkal should have 0 sales records');

  console.log('\n--- 4. Testing Multi-Tenant Data Isolation ---');
  // Attempt to access another branch not belonging to org 6 (e.g., branchId = 9999 or branch from other org)
  const unauthorizedBranchRes = await fetch(`${API_BASE}/api/reports/analytics?category=sales&type=daily_sales&branchId=9999`, { headers });
  console.log('Access with invalid/unauthorized branchId HTTP status:', unauthorizedBranchRes.status);
  assert(unauthorizedBranchRes.status === 400 || unauthorizedBranchRes.status === 404 || unauthorizedBranchRes.status === 403, 'Should reject invalid branch');

  console.log('\n--- 5. Testing All 9 Categories and Types ---');
  const testCategories = [
    { cat: 'sales', types: ['daily_sales', 'weekly_sales', 'monthly_sales', 'item_wise_sales', 'payment_method_breakdown', 'branch_sales_comparison'] },
    { cat: 'orders', types: ['total_orders', 'completed_orders', 'pending_orders', 'cancelled_orders', 'order_activity'] },
    { cat: 'inventory', types: ['current_stock', 'stock_ledger', 'stock_movement', 'low_stock', 'stock_valuation'] },
    { cat: 'purchase', types: ['purchase_orders', 'goods_received_notes', 'supplier_purchases', 'purchase_returns'] },
    { cat: 'kitchen', types: ['production_plan_vs_actual', 'ingredient_consumption', 'kitchen_activity'] },
    { cat: 'wastage', types: ['wastage_quantity', 'wastage_reasons', 'wastage_cost'] },
    { cat: 'finance', types: ['expenses', 'payments', 'cash_summary', 'profit_summary'] },
    { cat: 'menu', types: ['best_selling_items', 'recipe_cost', 'food_cost_percentage'] },
    { cat: 'staff', types: ['staff_activity', 'operational_summary'] }
  ];

  for (const { cat, types } of testCategories) {
    for (const t of types) {
      const res = await fetch(`${API_BASE}/api/reports/analytics?category=${cat}&type=${t}&datePreset=this_month`, { headers });
      assert.strictEqual(res.status, 200, `Failed on ${cat} - ${t}`);
      const data = await res.json();
      assert(Array.isArray(data.records), `${cat} - ${t} missing records array`);
      assert(Array.isArray(data.columns), `${cat} - ${t} missing columns array`);
      assert(Array.isArray(data.charts), `${cat} - ${t} missing charts array`);
      console.log(`  ✓ ${cat} [${t}] -> ${data.records.length} records, ${data.columns.length} columns, ${data.charts.length} charts`);
    }
  }

  console.log('\n--- 6. Testing CSV Export Endpoint ---');
  const csvRes = await fetch(`${API_BASE}/api/reports/export-csv?category=sales&type=daily_sales&datePreset=this_month`, { headers });
  assert.strictEqual(csvRes.status, 200);
  const csvHeader = csvRes.headers.get('content-disposition');
  console.log('Content-Disposition:', csvHeader);
  assert(csvHeader.includes('Sales_Report_'), 'CSV header should contain Sales_Report_');
  const csvText = await csvRes.text();
  console.log('CSV sample (first 200 chars):', csvText.substring(0, 200));
  assert(csvText.includes('Branch'), 'CSV text should contain Branch');
  assert(csvText.includes('Net Sales'), 'CSV text should contain Net Sales');

  console.log('\n=============================================');
  console.log('ALL BACKEND ANALYTICS & CSV TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
