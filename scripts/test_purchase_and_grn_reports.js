// Automated test: Verify Purchase Report and GRN Report in Purchase Module
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

async function run() {
  console.log("=== STEP 1: Log in ===");
  const loginRes = await post('http://localhost:5042/api/auth/login', {
    email: 'saravana@gmail.com',
    password: 'SuperAdmin@123'
  });

  if (loginRes.status !== 200) {
    console.error("Login failed:", loginRes.data);
    process.exit(1);
  }

  const token = loginRes.data.token;
  console.log("Login successful! User:", loginRes.data.user.name, "(Role:", loginRes.data.user.role + ")");

  console.log("\n=== STEP 2: Fetch Purchase Report (type=purchases) ===");
  const purchaseRepRes = await get('http://localhost:5042/api/kitchen/reports?type=purchases', token);
  console.log("Purchase Report Status:", purchaseRepRes.status);
  console.log("Report Type:", purchaseRepRes.data.reportType);
  console.log("Total Records:", purchaseRepRes.data.totalRecords);

  if (purchaseRepRes.status !== 200 || purchaseRepRes.data.reportType !== 'purchases') {
    console.error("FAILURE: Purchase Report failed to return expected data structure:", purchaseRepRes.data);
    process.exit(1);
  }

  if (purchaseRepRes.data.data && purchaseRepRes.data.data.length > 0) {
    const sample = purchaseRepRes.data.data[0];
    console.log("Sample Purchase Record:");
    console.log("  PO Number:", sample.purchaseNumber);
    console.log("  Vendor:", sample.vendorName);
    console.log("  Branch:", sample.branchName);
    console.log("  Amount:", sample.totalAmount);
    console.log("  Status:", sample.status);
    console.log("  Items Count:", sample.itemsCount);
    console.log("  Items Summary:", sample.itemsSummary);
  }
  console.log("✓ Purchase Report endpoint validated successfully!");

  console.log("\n=== STEP 3: Fetch GRN Report (type=grn) ===");
  const grnRepRes = await get('http://localhost:5042/api/kitchen/reports?type=grn', token);
  console.log("GRN Report Status:", grnRepRes.status);
  console.log("Report Type:", grnRepRes.data.reportType);
  console.log("Total GRN Records:", grnRepRes.data.totalRecords);

  if (grnRepRes.status !== 200 || grnRepRes.data.reportType !== 'grn') {
    console.error("FAILURE: GRN Report failed to return expected data structure:", grnRepRes.data);
    process.exit(1);
  }

  if (grnRepRes.data.data && grnRepRes.data.data.length > 0) {
    const sampleGRN = grnRepRes.data.data[0];
    console.log("Sample GRN Record:");
    console.log("  GRN Number:", sampleGRN.grnNumber);
    console.log("  PO Number:", sampleGRN.poNumber);
    console.log("  Vendor:", sampleGRN.vendorName);
    console.log("  Branch:", sampleGRN.branchName);
    console.log("  Received Date:", sampleGRN.receivedDate);
    console.log("  Inward Value:", sampleGRN.totalAmount);
    console.log("  Status:", sampleGRN.status);
    console.log("  Items Summary:", sampleGRN.itemsSummary);
  }
  console.log("✓ GRN Report endpoint validated successfully!");

  console.log("\n=== ALL REPORT TESTS PASSED ===");
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
