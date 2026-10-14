// Automated test: Verify branch manager branch visibility in inventory transfer vs general app
const http = require('http');

function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respBody) });
        } catch {
          resolve({ status: res.statusCode, data: respBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respBody) });
        } catch {
          resolve({ status: res.statusCode, data: respBody });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log("=== STEP 1: Log in as Simmakkal Branch Manager ===");
  const loginRes = await post('http://localhost:5042/api/auth/login', {
    email: 'simmakkal@samaya.com',
    password: 'SuperAdmin@123'
  });
  
  if (loginRes.status !== 200) {
    console.error("Login failed:", loginRes.data);
    process.exit(1);
  }

  const token = loginRes.data.token;
  const user = loginRes.data.user;
  console.log(`Logged in as: ${user.name} (${user.role}), Branch: ${user.branchName} (ID: ${user.branchId})`);

  console.log("\n=== STEP 2: General GET /api/branches (Standard App Behavior) ===");
  const standardBranchesRes = await get('http://localhost:5042/api/branches', token);
  console.log(`Status: ${standardBranchesRes.status}`);
  console.log(`Branches count: ${standardBranchesRes.data.length}`);
  console.log(`Branches returned:`, standardBranchesRes.data.map(b => ({ id: b.id, name: b.name })));

  if (standardBranchesRes.data.length !== 1 || standardBranchesRes.data[0].id !== user.branchId) {
    console.error("FAILURE: General /api/branches should ONLY return the branch manager's own branch!");
    process.exit(1);
  }
  console.log("SUCCESS: Standard app branch isolation is preserved (only 1 branch returned).");

  console.log("\n=== STEP 3: Transfer-specific GET /api/branches?forTransfer=true ===");
  const transferBranchesRes = await get('http://localhost:5042/api/branches?forTransfer=true', token);
  console.log(`Status: ${transferBranchesRes.status}`);
  console.log(`Branches count: ${transferBranchesRes.data.length}`);
  console.log(`Branches returned:`, transferBranchesRes.data.map(b => ({ id: b.id, name: b.name })));

  if (transferBranchesRes.data.length <= 1) {
    console.error("FAILURE: /api/branches?forTransfer=true should return other branches in the organization!");
    process.exit(1);
  }

  const otherBranches = transferBranchesRes.data.filter(b => b.id !== user.branchId);
  console.log(`Other branches available for transfer destination:`, otherBranches.map(b => ({ id: b.id, name: b.name })));
  if (otherBranches.length === 0) {
    console.error("FAILURE: No destination branches found for transfer!");
    process.exit(1);
  }
  console.log("SUCCESS: Branch Manager can see destination branches for Inventory Transfer!");

  console.log("\n=== STEP 4: Test Create Transfer as Branch Manager using discovered destination branch ===");
  // Fetch Simmakkal inventory items
  const itemsRes = await get('http://localhost:5042/api/inventory/items', token);
  const items = itemsRes.data;
  console.log(`Found ${items.length} inventory items in Simmakkal branch.`);
  
  const destBranch = otherBranches[0];
  console.log(`Selected destination branch: ${destBranch.name} (ID: ${destBranch.id})`);

  // Choose an item with stock, or if none has stock, add stock or create transfer
  let itemToTransfer = items.find(i => Number(i.currentStock) >= 1);
  if (!itemToTransfer && items.length > 0) {
    itemToTransfer = items[0];
    console.log(`Item ${itemToTransfer.name} has ${itemToTransfer.currentStock} stock. Adding stock via StockIn...`);
    await post('http://localhost:5042/api/inventory/transactions', {
      inventoryItemId: itemToTransfer.id,
      type: 'StockIn',
      quantity: 50,
      notes: 'Initial test stock'
    }, token);
    itemToTransfer.currentStock = 50;
  }

  if (itemToTransfer) {
    const createTrfRes = await post('http://localhost:5042/api/inventory/transfers', {
      fromBranchId: user.branchId,
      toBranchId: destBranch.id,
      itemId: itemToTransfer.id,
      quantity: 2,
      unit: itemToTransfer.unit || 'KG',
      remarks: 'Automated test inter-branch transfer from branch manager'
    }, token);

    console.log(`Create transfer response status: ${createTrfRes.status}`);
    console.log(`Create transfer result:`, createTrfRes.data);
    if (createTrfRes.status !== 200 && createTrfRes.status !== 201) {
      console.error("FAILURE: Could not create stock transfer:", createTrfRes.data);
      process.exit(1);
    }
    console.log(`SUCCESS: Stock transfer created! Transfer Number: ${createTrfRes.data.transferNumber}`);
  }

  console.log("\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===");
}

runTest().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
