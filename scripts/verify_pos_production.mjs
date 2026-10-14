import assert from 'assert';

const API_BASE = 'http://localhost:5042';

async function test() {
  console.log('--- 1. Authenticating as Branch Manager (s@gmail.com) ---');
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 's@gmail.com', password: 'SuperAdmin@123' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const { token, user } = await loginRes.json();
  console.log('Logged in as:', user.name, 'Role:', user.role, 'Branch:', user.branchId);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('\n--- 2. Testing Production Plans with Edge-case query params ---');
  const tests = [
    {
      name: 'Normal query',
      url: `${API_BASE}/api/kitchen/production-plans?branchId=6&date=2026-10-13`
    },
    {
      name: 'BranchId [object Object]',
      url: `${API_BASE}/api/kitchen/production-plans?branchId=%5Bobject+Object%5D`
    },
    {
      name: 'Empty BranchId and Empty Date',
      url: `${API_BASE}/api/kitchen/production-plans?branchId=&date=`
    },
    {
      name: 'Productions with [object Object]',
      url: `${API_BASE}/api/kitchen/productions?branchId=%5Bobject+Object%5D`
    }
  ];

  for (const t of tests) {
    const res = await fetch(t.url, { headers });
    console.log(`Endpoint: ${t.name} -> HTTP ${res.status}`);
    const text = await res.text();
    assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${text}`);
    assert(!text.includes('One or more validation errors occurred'), `Got validation error: ${text}`);
    console.log(`  ✓ Passed without validation errors.`);
  }

  console.log('\n--- 3. Testing Sync Sales from POS on Production Plan ---');
  // Fetch existing plan
  const plansRes = await fetch(`${API_BASE}/api/kitchen/production-plans?branchId=6`, { headers });
  const plans = await plansRes.json();
  if (plans.length > 0) {
    const planId = plans[0].id;
    console.log(`Testing sync sales for Plan #${planId}...`);
    const syncRes = await fetch(`${API_BASE}/api/kitchen/production-plans/${planId}/sync-sales`, {
      method: 'POST',
      headers
    });
    console.log(`Sync sales status: HTTP ${syncRes.status}`);
    assert.strictEqual(syncRes.status, 200, 'Sync sales failed');
    console.log(`  ✓ POS sales synced successfully into production plan.`);
  }

  console.log('\n=============================================');
  console.log('ALL POS PRODUCTION TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================');
}

test().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
