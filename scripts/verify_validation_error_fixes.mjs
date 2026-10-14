import assert from 'assert';

const API_BASE = 'http://localhost:5042';

async function testEdgeCases() {
  console.log('--- Testing Edge Cases that previously threw 400 Validation Errors ---');

  // Login
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'saravana@gmail.com', password: 'SuperAdmin@123' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const { token } = await loginRes.json();
  const headers = { 'Authorization': `Bearer ${token}` };

  const testEndpoints = [
    {
      name: 'Analytics report with [object Object] branchId',
      url: `${API_BASE}/api/reports/analytics?category=sales&type=daily_sales&branchId=%5Bobject+Object%5D`
    },
    {
      name: 'Analytics report with empty string branchId',
      url: `${API_BASE}/api/reports/analytics?category=sales&type=daily_sales&branchId=`
    },
    {
      name: 'Reports summary with [object Object] branchId',
      url: `${API_BASE}/api/reports/summary?branchId=%5Bobject+Object%5D`
    },
    {
      name: 'Daily sales with empty branchId and empty days',
      url: `${API_BASE}/api/reports/daily-sales?branchId=&days=`
    },
    {
      name: 'Daily report with [object Object] branchId and empty date',
      url: `${API_BASE}/api/reports/daily?branchId=%5Bobject+Object%5D&date=`
    },
    {
      name: 'Cashier shift with empty strings for cash amounts and branchId',
      url: `${API_BASE}/api/reports/cashier-shift?branchId=&openingCash=&actualCash=`
    },
    {
      name: 'Kitchen reports with [object Object] branchId',
      url: `${API_BASE}/api/kitchen/reports?branchId=%5Bobject+Object%5D`
    },
    {
      name: 'Inventory ledger with [object Object] branchId and empty item/dates',
      url: `${API_BASE}/api/inventory/ledger?branchId=%5Bobject+Object%5D&itemId=&fromDate=&toDate=`
    }
  ];

  for (const t of testEndpoints) {
    const res = await fetch(t.url, { headers });
    console.log(`Testing: ${t.name} -> HTTP ${res.status}`);
    const text = await res.text();
    assert.strictEqual(res.status, 200, `Expected 200 OK but got ${res.status}: ${text}`);
    assert(!text.includes('One or more validation errors occurred'), `Endpoint returned validation error: ${text}`);
    console.log(`  ✓ Passed without validation errors.`);
  }

  console.log('\n======================================================');
  console.log('ALL EDGE CASES PASSED! NO VALIDATION ERRORS OCCURRED.');
  console.log('======================================================');
}

testEdgeCases().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
