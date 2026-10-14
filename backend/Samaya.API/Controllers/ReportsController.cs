using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Inventory Manager,Kitchen Manager,Accountant,Cashier")]
    public partial class ReportsController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        public ReportsController(SamayaDbContext context) => _context = context;

        [HttpGet("summary")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> Summary([FromQuery] string? branchId = null, [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();
            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bid) && bid > 0) parsedBranchId = bid;
            if (AuthorizationHelper.IsBranchUser(User)) parsedBranchId = AuthorizationHelper.GetBranchId(User);

            var start = ParseDate(from) ?? DateTime.UtcNow.Date;
            var end = (ParseDate(to) ?? start).Date.AddDays(1);

            var orders = _context.Orders.AsNoTracking()
                .Where(o => o.OrganizationId == orgId.Value && o.CreatedAt >= start && o.CreatedAt < end);
            if (parsedBranchId.HasValue) orders = orders.Where(o => o.BranchId == parsedBranchId.Value);

            var orderRows = await orders.Select(o => new { o.Id, o.Status, o.TotalAmount, o.SaleType }).ToListAsync();
            var itemRows = await _context.OrderItems.AsNoTracking()
                .Where(i => i.Order != null && i.Order.OrganizationId == orgId.Value && i.Order.CreatedAt >= start && i.Order.CreatedAt < end &&
                    (!parsedBranchId.HasValue || i.Order.BranchId == parsedBranchId.Value))
                .Select(i => new { i.MenuItemName, i.Quantity, i.LineTotal })
                .ToListAsync();

            var transactions = _context.StockTransactions.AsNoTracking()
                .Where(t => t.OrganizationId == orgId.Value && t.CreatedAt >= start && t.CreatedAt < end);
            if (parsedBranchId.HasValue) transactions = transactions.Where(t => t.BranchId == parsedBranchId.Value);
            var txRows = await transactions.Select(t => new { t.Type, t.Quantity, t.StockAfter, t.InventoryItemId, t.InventoryItem!.Name, t.InventoryItem.Unit }).ToListAsync();

            var served = orderRows.Where(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing").ToList();
            var tableServed = served.Where(o => o.SaleType != "SELF_SERVICE").ToList();
            var counterServed = served.Where(o => o.SaleType == "SELF_SERVICE").ToList();
            var top = itemRows.GroupBy(i => i.MenuItemName).Select(g => new { name = g.Key, quantity = g.Sum(x => x.Quantity), sales = g.Sum(x => x.LineTotal) }).OrderByDescending(x => x.quantity).Take(10).ToList();

            return Ok(new {
                totalOrders = orderRows.Count,
                servedOrders = served.Count,
                pendingOrders = orderRows.Count(o => o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Ready" || o.Status == "Open"),
                sales = served.Sum(o => o.TotalAmount),
                tableServiceOrders = tableServed.Count,
                tableServiceSales = tableServed.Sum(o => o.TotalAmount),
                counterOrders = counterServed.Count,
                counterSales = counterServed.Sum(o => o.TotalAmount),
                averageOrder = served.Count == 0 ? 0 : served.Sum(o => o.TotalAmount) / served.Count,
                usage = txRows.Where(t => t.Type == "Usage").Sum(t => t.Quantity),
                wastage = txRows.Where(t => t.Type == "Wastage").Sum(t => t.Quantity),
                stockIn = txRows.Where(t => t.Type == "StockIn" || t.Type == "Opening").Sum(t => t.Quantity),
                topItems = top
            });
        }

        [HttpGet("daily-sales")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> DailySales([FromQuery] string? branchId = null, [FromQuery] string? days = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();
            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bid) && bid > 0) parsedBranchId = bid;
            if (AuthorizationHelper.IsBranchUser(User)) parsedBranchId = AuthorizationHelper.GetBranchId(User);
            int numDays = 7;
            if (!string.IsNullOrWhiteSpace(days) && int.TryParse(days, out var d)) numDays = d;
            numDays = Math.Clamp(numDays, 1, 31);
            var start = DateTime.UtcNow.Date.AddDays(-(numDays - 1));

            var q = _context.Orders.AsNoTracking().Where(o => o.OrganizationId == orgId.Value && o.CreatedAt >= start && (o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing"));
            if (parsedBranchId.HasValue) q = q.Where(o => o.BranchId == parsedBranchId.Value);
            var rows = await q.Select(o => new { o.CreatedAt, o.TotalAmount, o.SaleType }).ToListAsync();
            var result = Enumerable.Range(0, numDays).Select(i => {
                var date = start.AddDays(i).Date;
                var same = rows.Where(x => x.CreatedAt.Date == date).ToList();
                return new {
                    date = date.ToString("yyyy-MM-dd"),
                    orders = same.Count,
                    sales = same.Sum(x => x.TotalAmount),
                    tableSales = same.Where(x => x.SaleType != "SELF_SERVICE").Sum(x => x.TotalAmount),
                    counterSales = same.Where(x => x.SaleType == "SELF_SERVICE").Sum(x => x.TotalAmount)
                };
            });
            return Ok(result);
        }

        [HttpGet("daily")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> DailyReport([FromQuery] string? branchId = null, [FromQuery] string? date = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();
            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bid) && bid > 0) parsedBranchId = bid;
            if (AuthorizationHelper.IsBranchUser(User)) parsedBranchId = AuthorizationHelper.GetBranchId(User);

            var targetDate = ParseDate(date) ?? DateTime.UtcNow.Date;
            var nextDay = targetDate.AddDays(1);

            var ordersQuery = _context.Orders.AsNoTracking()
                .Include(o => o.Items)
                .Include(o => o.Waiter)
                .Include(o => o.Branch)
                .Where(o => o.OrganizationId == orgId.Value && o.CreatedAt >= targetDate && o.CreatedAt < nextDay);

            if (parsedBranchId.HasValue) ordersQuery = ordersQuery.Where(o => o.BranchId == parsedBranchId.Value);

            var orders = await ordersQuery.OrderByDescending(o => o.CreatedAt).ToListAsync();

            var servedOrders = orders.Where(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing").ToList();
            var cancelledOrders = orders.Where(o => o.Status == "Cancelled").ToList();
            var activeOrders = orders.Where(o => o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Ready" || o.Status == "Open").ToList();

            var tableServed = servedOrders.Where(o => o.SaleType != "SELF_SERVICE").ToList();
            var counterServed = servedOrders.Where(o => o.SaleType == "SELF_SERVICE").ToList();

            var totalRevenue = servedOrders.Sum(o => o.TotalAmount);
            var avgOrderValue = servedOrders.Count == 0 ? 0 : totalRevenue / servedOrders.Count;

            var itemsSold = orders
                .Where(o => o.Status != "Cancelled")
                .SelectMany(o => o.Items)
                .GroupBy(i => i.MenuItemName)
                .Select(g => new {
                    name = g.Key,
                    quantity = g.Sum(x => x.Quantity),
                    sales = g.Sum(x => x.LineTotal),
                    unitPrice = g.FirstOrDefault() != null ? g.FirstOrDefault()!.UnitPrice : 0
                })
                .OrderByDescending(x => x.quantity)
                .ToList();

            var hourly = Enumerable.Range(0, 24).Select(hour => {
                var inHour = orders.Where(o => o.CreatedAt.Hour == hour).ToList();
                return new {
                    hour = $"{hour:D2}:00",
                    orders = inHour.Count,
                    served = inHour.Count(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing"),
                    sales = inHour.Where(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing").Sum(o => o.TotalAmount)
                };
            }).ToList();

            var txQuery = _context.StockTransactions.AsNoTracking()
                .Include(t => t.InventoryItem)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Branch)
                .Where(t => t.OrganizationId == orgId.Value && t.CreatedAt >= targetDate && t.CreatedAt < nextDay);

            if (parsedBranchId.HasValue) txQuery = txQuery.Where(t => t.BranchId == parsedBranchId.Value);

            var transactions = await txQuery.OrderByDescending(t => t.CreatedAt).ToListAsync();

            var usageQty = transactions.Where(t => t.Type == "Usage").Sum(t => t.Quantity);
            var wastageQty = transactions.Where(t => t.Type == "Wastage").Sum(t => t.Quantity);
            var stockInQty = transactions.Where(t => t.Type == "StockIn" || t.Type == "Opening").Sum(t => t.Quantity);

            return Ok(new
            {
                date = targetDate.ToString("yyyy-MM-dd"),
                totalOrders = orders.Count,
                servedOrders = servedOrders.Count,
                cancelledOrders = cancelledOrders.Count,
                activeOrders = activeOrders.Count,
                sales = totalRevenue,
                tableServiceOrders = tableServed.Count,
                tableServiceSales = tableServed.Sum(o => o.TotalAmount),
                counterOrders = counterServed.Count,
                counterSales = counterServed.Sum(o => o.TotalAmount),
                averageOrder = avgOrderValue,
                usage = usageQty,
                wastage = wastageQty,
                stockIn = stockInQty,
                topItems = itemsSold,
                hourly,
                orders = orders.Select(o => new {
                    id = o.Id,
                    orderNumber = o.OrderNumber,
                    saleType = o.SaleType ?? "TABLE_SERVICE",
                    tableNumber = o.TableNumber ?? "—",
                    waiterName = o.Waiter?.Name ?? "—",
                    branchName = o.Branch?.Name ?? "—",
                    status = o.Status,
                    totalAmount = o.TotalAmount,
                    time = o.CreatedAt.ToString("HH:mm:ss"),
                    itemSummary = string.Join(", ", o.Items.Select(i => $"{i.MenuItemName} × {i.Quantity}"))
                }),
                transactions = transactions.Select(t => new {
                    id = t.Id,
                    time = t.CreatedAt.ToString("HH:mm:ss"),
                    itemName = t.InventoryItem?.Name ?? "—",
                    unit = t.InventoryItem?.Unit ?? "—",
                    type = t.Type,
                    quantity = t.Quantity,
                    stockAfter = t.StockAfter,
                    reference = t.Reference ?? "—",
                    userName = t.CreatedByUser?.Name ?? "System"
                })
            });
        }

        [HttpGet("cashier-shift")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> CashierShift([FromQuery] string? branchId = null, [FromQuery] string? date = null, [FromQuery] string? openingCash = null, [FromQuery] string? actualCash = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();
            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bid) && bid > 0) parsedBranchId = bid;
            if (AuthorizationHelper.IsBranchUser(User)) parsedBranchId = AuthorizationHelper.GetBranchId(User);

            decimal parsedOpeningCash = 0;
            if (!string.IsNullOrWhiteSpace(openingCash) && decimal.TryParse(openingCash, out var oc)) parsedOpeningCash = oc;
            decimal? parsedActualCash = null;
            if (!string.IsNullOrWhiteSpace(actualCash) && decimal.TryParse(actualCash, out var ac)) parsedActualCash = ac;

            var targetDate = ParseDate(date) ?? DateTime.UtcNow.Date;
            var nextDay = targetDate.AddDays(1);

            var billsQuery = _context.Bills.AsNoTracking()
                .Include(b => b.Branch)
                .Where(b => b.OrganizationId == orgId.Value && b.GeneratedAt >= targetDate && b.GeneratedAt < nextDay);

            if (parsedBranchId.HasValue) billsQuery = billsQuery.Where(b => b.BranchId == parsedBranchId.Value);

            var bills = await billsQuery.ToListAsync();

            var paidBills = bills.Where(b => b.PaymentStatus == "Paid").ToList();
            var voidedBills = bills.Where(b => b.PaymentStatus == "Voided").ToList();

            var cashSales = paidBills.Where(b => string.Equals(b.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal);
            var upiSales = paidBills.Where(b => string.Equals(b.PaymentMethod, "UPI", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal);
            var cardSales = paidBills.Where(b => string.Equals(b.PaymentMethod, "Card", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal);
            var otherSales = paidBills.Where(b => !string.Equals(b.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase)
                                               && !string.Equals(b.PaymentMethod, "UPI", StringComparison.OrdinalIgnoreCase)
                                               && !string.Equals(b.PaymentMethod, "Card", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal);

            var totalSales = paidBills.Sum(b => b.GrandTotal);
            var refunds = voidedBills.Sum(b => b.GrandTotal);

            var counterBills = paidBills.Where(b => b.SaleType == "SELF_SERVICE").ToList();
            var tableBills = paidBills.Where(b => b.SaleType != "SELF_SERVICE").ToList();

            var expectedCash = parsedOpeningCash + cashSales;
            var difference = parsedActualCash.HasValue ? parsedActualCash.Value - expectedCash : 0;

            return Ok(new
            {
                date = targetDate.ToString("yyyy-MM-dd"),
                openingCash = parsedOpeningCash,
                cashSales,
                upiSales,
                cardSales,
                otherSales,
                totalSales,
                refunds,
                voidedCount = voidedBills.Count,
                totalBills = paidBills.Count,
                tableServiceBills = tableBills.Count,
                tableServiceSales = tableBills.Sum(b => b.GrandTotal),
                counterServiceBills = counterBills.Count,
                counterServiceSales = counterBills.Sum(b => b.GrandTotal),
                expectedCash,
                actualCash = parsedActualCash ?? expectedCash,
                difference
            });
        }

        private static DateTime? ParseDate(string? value) => DateTime.TryParse(value, out var d) ? d.Date : null;
    }
}
