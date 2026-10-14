const http = require('http');

async function test() {
  // Login as org admin (admin@saravanas.com)
  const loginBody = JSON.stringify({ email: "admin@saravanas.com", password: "Password123!" });
  
  const req = (url, opts = {}, body = null) => new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });

  const loginRes = await req('http://localhost:5042/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, loginBody);

  console.log("Login status:", loginRes.status);
  const token = loginRes.data.token;
  if (!token) {
    console.log("No token:", loginRes.data);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const dailyRes = await req('http://localhost:5042/api/reports/daily', { headers: authHeaders });
  console.log("Daily Report status:", dailyRes.status);
  console.log("Daily Report sales:", dailyRes.data.sales, "totalOrders:", dailyRes.data.totalOrders);
  console.log("Daily Report topItems count:", dailyRes.data.topItems?.length);
  if (dailyRes.data.topItems?.length > 0) {
    console.log("Top item sample:", dailyRes.data.topItems[0]);
  }
  console.log("Daily Report hourly count:", dailyRes.data.hourly?.length);

  const ordersRes = await req('http://localhost:5042/api/orders', { headers: authHeaders });
  console.log("Orders count:", ordersRes.data.length);
  if (ordersRes.data.length > 0) {
    console.log("Sample order statuses:", ordersRes.data.slice(0, 5).map(o => ({ id: o.id, num: o.orderNumber, status: o.status, amount: o.totalAmount, date: o.createdAt })));
  }

  const billsRes = await req('http://localhost:5042/api/bills', { headers: authHeaders });
  console.log("Bills count:", billsRes.data?.length);
  if (billsRes.data?.length > 0) {
    console.log("Sample bills:", billsRes.data.slice(0, 3).map(b => ({ id: b.id, num: b.billNumber, total: b.grandTotal, status: b.paymentStatus, paidAt: b.paidAt })));
  }
}

test().catch(console.error);
