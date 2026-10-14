using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;

namespace Samaya.API.Controllers
{
    public partial class ReportsController : ControllerBase
    {
        [HttpGet("analytics")]
        public async Task<IActionResult> GetAnalyticsReport(
            [FromQuery] string category = "sales",
            [FromQuery] string type = "daily_sales",
            [FromQuery] string? branchId = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized(new { message = "Authentication token missing or invalid organization." });

            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
            if (role == "Chef" || role == "Waiter" || role == "Staff")
            {
                return Forbid();
            }

            var cat = (category ?? "").Trim().ToLowerInvariant();
            if (role == "Kitchen Manager" && cat != "kitchen" && cat != "wastage")
            {
                return Forbid();
            }
            if (role == "Inventory Manager" && cat != "inventory" && cat != "purchase" && cat != "wastage")
            {
                return Forbid();
            }

            var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId.Value);
            var orgName = org?.Name ?? "Organization";

            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bId) && bId > 0)
            {
                parsedBranchId = bId;
            }

            if (AuthorizationHelper.IsBranchUser(User))
            {
                parsedBranchId = AuthorizationHelper.GetBranchId(User);
            }

            string activeBranchName = "All Branches";
            if (parsedBranchId.HasValue)
            {
                var branch = await _context.Branches.AsNoTracking()
                    .FirstOrDefaultAsync(b => b.Id == parsedBranchId.Value && b.OrganizationId == orgId.Value);
                if (branch == null)
                {
                    return BadRequest(new { message = "Invalid branch or branch does not belong to your organization." });
                }
                activeBranchName = branch.Name;
            }

            // Calculate start and end range
            var now = DateTime.UtcNow;
            var defaultStart = new DateTime(now.Year, now.Month, 1);
            var start = ParseDateStart(from, defaultStart);
            var end = ParseDateEnd(to, now.Date);
            if (end <= start) end = start.AddDays(1);

            var periodLabel = $"{start:dd MMM yyyy} – {end.AddDays(-1):dd MMM yyyy}";

            var result = await BuildReportResultAsync(orgId.Value, orgName, parsedBranchId, activeBranchName, category.ToLowerInvariant(), type.ToLowerInvariant(), start, end, periodLabel);

            return Ok(new
            {
                organizationId = orgId.Value,
                organizationName = orgName,
                branchId = parsedBranchId,
                branchName = activeBranchName,
                period = periodLabel,
                fromDate = start.ToString("yyyy-MM-dd"),
                toDate = end.AddDays(-1).ToString("yyyy-MM-dd"),
                category = category.ToLowerInvariant(),
                reportType = type.ToLowerInvariant(),
                title = result.Title,
                columns = result.Columns,
                records = result.Records,
                summary = result.Summary,
                charts = result.Charts
            });
        }

        [HttpGet("export-csv")]
        public async Task<IActionResult> ExportAnalyticsCsv(
            [FromQuery] string category = "sales",
            [FromQuery] string type = "daily_sales",
            [FromQuery] string? branchId = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized(new { message = "Authentication token missing or invalid organization." });

            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
            if (role == "Chef" || role == "Waiter" || role == "Staff")
            {
                return Forbid();
            }

            var cat = (category ?? "").Trim().ToLowerInvariant();
            if (role == "Kitchen Manager" && cat != "kitchen" && cat != "wastage")
            {
                return Forbid();
            }
            if (role == "Inventory Manager" && cat != "inventory" && cat != "purchase" && cat != "wastage")
            {
                return Forbid();
            }

            var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId.Value);
            var orgName = org?.Name ?? "Organization";

            int? parsedBranchId = null;
            if (!string.IsNullOrWhiteSpace(branchId) && int.TryParse(branchId, out var bId) && bId > 0)
            {
                parsedBranchId = bId;
            }

            if (AuthorizationHelper.IsBranchUser(User))
            {
                parsedBranchId = AuthorizationHelper.GetBranchId(User);
            }

            string activeBranchName = "All Branches";
            if (parsedBranchId.HasValue)
            {
                var branch = await _context.Branches.AsNoTracking()
                    .FirstOrDefaultAsync(b => b.Id == parsedBranchId.Value && b.OrganizationId == orgId.Value);
                if (branch == null)
                {
                    return BadRequest(new { message = "Invalid branch or branch does not belong to your organization." });
                }
                activeBranchName = branch.Name;
            }

            var now = DateTime.UtcNow;
            var defaultStart = new DateTime(now.Year, now.Month, 1);
            var start = ParseDateStart(from, defaultStart);
            var end = ParseDateEnd(to, now.Date);
            if (end <= start) end = start.AddDays(1);

            var periodLabel = $"{start:dd MMM yyyy} – {end.AddDays(-1):dd MMM yyyy}";
            var result = await BuildReportResultAsync(orgId.Value, orgName, parsedBranchId, activeBranchName, category.ToLowerInvariant(), type.ToLowerInvariant(), start, end, periodLabel);

            var csv = new StringBuilder();
            csv.AppendLine(string.Join(",", result.Columns.Select(c => EscapeCsvField(c.Label))));

            foreach (var rec in result.Records)
            {
                var row = result.Columns.Select(c =>
                {
                    rec.TryGetValue(c.Key, out var v);
                    return EscapeCsvField(v);
                });
                csv.AppendLine(string.Join(",", row));
            }

            var preamble = Encoding.UTF8.GetPreamble();
            var contentBytes = Encoding.UTF8.GetBytes(csv.ToString());
            var fileBytes = preamble.Concat(contentBytes).ToArray();

            var cleanBranch = activeBranchName.Replace(" ", "_");
            var cleanCat = char.ToUpper(category[0]) + category.Substring(1);
            var startDateStr = start.ToString("yyyy-MM-dd");
            var endDateStr = end.AddDays(-1).ToString("yyyy-MM-dd");

            string fileName;
            if (startDateStr == endDateStr)
            {
                fileName = $"{cleanCat}_Report_{cleanBranch}_{startDateStr}.csv";
            }
            else
            {
                fileName = $"{cleanCat}_Report_{cleanBranch}_{startDateStr}_to_{endDateStr}.csv";
            }

            return File(fileBytes, "text/csv; charset=utf-8", fileName);
        }

        private async Task<AnalyticsReportResult> BuildReportResultAsync(
            int orgId,
            string orgName,
            int? branchId,
            string activeBranchName,
            string category,
            string type,
            DateTime start,
            DateTime end,
            string periodLabel)
        {
            switch (category)
            {
                case "sales":
                    return await BuildSalesReportsAsync(orgId, branchId, type, start, end);
                case "orders":
                    return await BuildOrderReportsAsync(orgId, branchId, type, start, end);
                case "inventory":
                    return await BuildInventoryReportsAsync(orgId, branchId, type, start, end);
                case "purchase":
                case "purchases":
                    return await BuildPurchaseReportsAsync(orgId, branchId, type, start, end);
                case "kitchen":
                case "production":
                    return await BuildKitchenReportsAsync(orgId, branchId, type, start, end);
                case "wastage":
                    return await BuildWastageReportsAsync(orgId, branchId, type, start, end);
                case "finance":
                    return await BuildFinanceReportsAsync(orgId, branchId, type, start, end);
                case "menu":
                    return await BuildMenuReportsAsync(orgId, branchId, type, start, end);
                case "staff":
                case "operations":
                    return await BuildStaffReportsAsync(orgId, branchId, type, start, end);
                default:
                    return await BuildSalesReportsAsync(orgId, branchId, "daily_sales", start, end);
            }
        }

        #region Category 1: Sales Reports

        private async Task<AnalyticsReportResult> BuildSalesReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var billsQuery = _context.Bills.AsNoTracking()
                .Include(b => b.Branch)
                .Where(b => b.OrganizationId == orgId && b.GeneratedAt >= start && b.GeneratedAt < end && b.PaymentStatus == "Paid");

            if (branchId.HasValue) billsQuery = billsQuery.Where(b => b.BranchId == branchId.Value);
            var bills = await billsQuery.OrderBy(b => b.GeneratedAt).ToListAsync();

            var ordersQuery = _context.Orders.AsNoTracking()
                .Include(o => o.Branch)
                .Where(o => o.OrganizationId == orgId && o.CreatedAt >= start && o.CreatedAt < end && o.Status != "Cancelled");

            if (branchId.HasValue) ordersQuery = ordersQuery.Where(o => o.BranchId == branchId.Value);
            var orders = await ordersQuery.ToListAsync();

            var result = new AnalyticsReportResult();

            switch (type)
            {
                case "weekly_sales":
                {
                    result.Title = "Sales Report — Weekly Sales";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "weekPeriod", Label = "Week Period", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalOrders", Label = "Total Orders", Align = "right", Type = "number" },
                        new() { Key = "grossSales", Label = "Gross Sales", Align = "right", Type = "currency" },
                        new() { Key = "discount", Label = "Discount", Align = "right", Type = "currency" },
                        new() { Key = "tax", Label = "Tax", Align = "right", Type = "currency" },
                        new() { Key = "netSales", Label = "Net Sales", Align = "right", Type = "currency" },
                        new() { Key = "avgTicket", Label = "Avg Ticket", Align = "right", Type = "currency" }
                    };

                    var groups = bills.GroupBy(b => new
                    {
                        Week = CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(b.GeneratedAt, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday),
                        Year = b.GeneratedAt.Year,
                        BranchName = b.Branch?.Name ?? "Main Branch"
                    }).OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Week).ToList();

                    foreach (var g in groups)
                    {
                        var minDate = g.Min(x => x.GeneratedAt).Date;
                        var maxDate = g.Max(x => x.GeneratedAt).Date;
                        var subtotal = g.Sum(x => x.Subtotal);
                        var discount = g.Sum(x => x.Discount);
                        var tax = g.Sum(x => x.Tax);
                        var grand = g.Sum(x => x.GrandTotal);
                        var count = g.Count();

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["weekPeriod"] = $"{minDate:dd MMM} – {maxDate:dd MMM yyyy} (W{g.Key.Week})",
                            ["branchName"] = g.Key.BranchName,
                            ["totalOrders"] = count,
                            ["grossSales"] = subtotal,
                            ["discount"] = discount,
                            ["tax"] = tax,
                            ["netSales"] = grand,
                            ["avgTicket"] = count > 0 ? Math.Round(grand / count, 2) : 0
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "weekly_sales_trend",
                        Title = "Weekly Net Sales Trend",
                        Subtitle = "Revenue generated per calendar week",
                        ChartType = "bar",
                        Data = result.Records.Select(r => new ChartDataPointDto
                        {
                            Label = r["weekPeriod"]?.ToString() ?? "",
                            Value = Convert.ToDecimal(r["netSales"])
                        }).ToList()
                    });
                    break;
                }

                case "monthly_sales":
                {
                    result.Title = "Sales Report — Monthly Sales";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "month", Label = "Month", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalOrders", Label = "Total Orders", Align = "right", Type = "number" },
                        new() { Key = "grossSales", Label = "Gross Sales", Align = "right", Type = "currency" },
                        new() { Key = "discount", Label = "Discount", Align = "right", Type = "currency" },
                        new() { Key = "tax", Label = "Tax", Align = "right", Type = "currency" },
                        new() { Key = "netSales", Label = "Net Sales", Align = "right", Type = "currency" },
                        new() { Key = "avgTicket", Label = "Avg Ticket", Align = "right", Type = "currency" }
                    };

                    var groups = bills.GroupBy(b => new
                    {
                        Year = b.GeneratedAt.Year,
                        Month = b.GeneratedAt.Month,
                        BranchName = b.Branch?.Name ?? "Main Branch"
                    }).OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month).ToList();

                    foreach (var g in groups)
                    {
                        var mDate = new DateTime(g.Key.Year, g.Key.Month, 1);
                        var subtotal = g.Sum(x => x.Subtotal);
                        var discount = g.Sum(x => x.Discount);
                        var tax = g.Sum(x => x.Tax);
                        var grand = g.Sum(x => x.GrandTotal);
                        var count = g.Count();

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["month"] = mDate.ToString("MMMM yyyy"),
                            ["branchName"] = g.Key.BranchName,
                            ["totalOrders"] = count,
                            ["grossSales"] = subtotal,
                            ["discount"] = discount,
                            ["tax"] = tax,
                            ["netSales"] = grand,
                            ["avgTicket"] = count > 0 ? Math.Round(grand / count, 2) : 0
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "monthly_sales_trend",
                        Title = "Monthly Net Sales Trend",
                        Subtitle = "Aggregated monthly financial performance",
                        ChartType = "bar",
                        Data = result.Records.Select(r => new ChartDataPointDto
                        {
                            Label = r["month"]?.ToString() ?? "",
                            Value = Convert.ToDecimal(r["netSales"])
                        }).ToList()
                    });
                    break;
                }

                case "item_sales":
                {
                    result.Title = "Sales Report — Item-wise Sales";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemName", Label = "Menu Item", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "quantity", Label = "Quantity Sold", Align = "right", Type = "number" },
                        new() { Key = "unitPrice", Label = "Unit Price", Align = "right", Type = "currency" },
                        new() { Key = "totalSales", Label = "Total Sales", Align = "right", Type = "currency" },
                        new() { Key = "share", Label = "Sales Share", Align = "right", Type = "badge" }
                    };

                    var orderItemsQuery = _context.OrderItems.AsNoTracking()
                        .Include(oi => oi.Order).ThenInclude(o => o!.Branch)
                        .Where(oi => oi.Order != null && oi.Order.OrganizationId == orgId &&
                                     oi.Order.CreatedAt >= start && oi.Order.CreatedAt < end &&
                                     oi.Order.Status != "Cancelled");

                    if (branchId.HasValue) orderItemsQuery = orderItemsQuery.Where(oi => oi.Order!.BranchId == branchId.Value);
                    var items = await orderItemsQuery.ToListAsync();

                    var totalItemSales = items.Sum(x => x.LineTotal);
                    var groups = items.GroupBy(i => new { i.MenuItemName, BranchName = i.Order?.Branch?.Name ?? "Main Branch" })
                        .Select(g => new
                        {
                            g.Key.MenuItemName,
                            g.Key.BranchName,
                            Quantity = g.Sum(x => x.Quantity),
                            Sales = g.Sum(x => x.LineTotal),
                            AvgPrice = g.Average(x => x.UnitPrice)
                        })
                        .OrderByDescending(x => x.Sales).ToList();

                    foreach (var g in groups)
                    {
                        var sharePct = totalItemSales > 0 ? Math.Round((g.Sales / totalItemSales) * 100, 1) : 0;
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemName"] = g.MenuItemName,
                            ["branchName"] = g.BranchName,
                            ["quantity"] = g.Quantity,
                            ["unitPrice"] = Math.Round(g.AvgPrice, 2),
                            ["totalSales"] = g.Sales,
                            ["share"] = $"{sharePct}%"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "item_sales_chart",
                        Title = "Top 10 Menu Items by Revenue",
                        Subtitle = "Revenue generated per popular dish",
                        ChartType = "horizontal_bar",
                        Data = groups.Take(10).Select(g => new ChartDataPointDto
                        {
                            Label = g.MenuItemName,
                            Value = g.Sales,
                            Tooltip = $"{g.Quantity} portions sold"
                        }).ToList()
                    });
                    break;
                }

                case "payment_methods":
                {
                    result.Title = "Sales Report — Payment Method Breakdown";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "paymentMethod", Label = "Payment Method", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "billCount", Label = "Transactions", Align = "right", Type = "number" },
                        new() { Key = "totalAmount", Label = "Collected Amount", Align = "right", Type = "currency" },
                        new() { Key = "share", Label = "Share", Align = "right", Type = "badge" },
                        new() { Key = "avgTicket", Label = "Avg Ticket", Align = "right", Type = "currency" }
                    };

                    var grandTotalPaid = bills.Sum(b => b.GrandTotal);
                    var groups = bills.GroupBy(b => new
                    {
                        Method = string.IsNullOrWhiteSpace(b.PaymentMethod) ? "Cash" : b.PaymentMethod,
                        BranchName = b.Branch?.Name ?? "Main Branch"
                    }).Select(g => new
                    {
                        g.Key.Method,
                        g.Key.BranchName,
                        Count = g.Count(),
                        Amount = g.Sum(x => x.GrandTotal)
                    }).OrderByDescending(x => x.Amount).ToList();

                    foreach (var g in groups)
                    {
                        var sharePct = grandTotalPaid > 0 ? Math.Round((g.Amount / grandTotalPaid) * 100, 1) : 0;
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["paymentMethod"] = g.Method,
                            ["branchName"] = g.BranchName,
                            ["billCount"] = g.Count,
                            ["totalAmount"] = g.Amount,
                            ["share"] = $"{sharePct}%",
                            ["avgTicket"] = g.Count > 0 ? Math.Round(g.Amount / g.Count, 2) : 0
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "payment_methods_chart",
                        Title = "Payment Method Distribution",
                        Subtitle = "Collections by tender type (Cash, UPI, Card)",
                        ChartType = "donut",
                        Data = groups.Select(g => new ChartDataPointDto
                        {
                            Label = g.Method,
                            Value = g.Amount
                        }).ToList()
                    });
                    break;
                }

                case "branch_sales":
                {
                    result.Title = "Sales Report — Branch-wise Sales Comparison";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalOrders", Label = "Total Orders", Align = "right", Type = "number" },
                        new() { Key = "grossSales", Label = "Gross Sales", Align = "right", Type = "currency" },
                        new() { Key = "discount", Label = "Discount", Align = "right", Type = "currency" },
                        new() { Key = "tax", Label = "Tax", Align = "right", Type = "currency" },
                        new() { Key = "netSales", Label = "Net Sales", Align = "right", Type = "currency" },
                        new() { Key = "tableSales", Label = "Dine-In Sales", Align = "right", Type = "currency" },
                        new() { Key = "counterSales", Label = "Counter Sales", Align = "right", Type = "currency" },
                        new() { Key = "avgTicket", Label = "Avg Ticket", Align = "right", Type = "currency" }
                    };

                    var orgBranches = await _context.Branches.AsNoTracking().Where(b => b.OrganizationId == orgId && b.IsActive).ToListAsync();

                    foreach (var b in orgBranches)
                    {
                        if (branchId.HasValue && b.Id != branchId.Value) continue;

                        var bBills = bills.Where(x => x.BranchId == b.Id).ToList();
                        var count = bBills.Count;
                        var subtotal = bBills.Sum(x => x.Subtotal);
                        var discount = bBills.Sum(x => x.Discount);
                        var tax = bBills.Sum(x => x.Tax);
                        var net = bBills.Sum(x => x.GrandTotal);
                        var table = bBills.Where(x => x.SaleType != "SELF_SERVICE").Sum(x => x.GrandTotal);
                        var counter = bBills.Where(x => x.SaleType == "SELF_SERVICE").Sum(x => x.GrandTotal);

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["branchName"] = b.Name,
                            ["totalOrders"] = count,
                            ["grossSales"] = subtotal,
                            ["discount"] = discount,
                            ["tax"] = tax,
                            ["netSales"] = net,
                            ["tableSales"] = table,
                            ["counterSales"] = counter,
                            ["avgTicket"] = count > 0 ? Math.Round(net / count, 2) : 0
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "branch_comparison_chart",
                        Title = "Branch-wise Net Sales Comparison",
                        Subtitle = "Revenue generated across active branches",
                        ChartType = "bar",
                        Data = result.Records.Select(r => new ChartDataPointDto
                        {
                            Label = r["branchName"]?.ToString() ?? "",
                            Value = Convert.ToDecimal(r["netSales"])
                        }).ToList()
                    });
                    break;
                }

                case "discounts_taxes":
                case "discounts_and_taxes":
                {
                    result.Title = "Sales Report — Discounts and Taxes";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "billNumber", Label = "Bill #", Align = "left", Type = "text" },
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "subtotal", Label = "Subtotal", Align = "right", Type = "currency" },
                        new() { Key = "discount", Label = "Discount", Align = "right", Type = "currency" },
                        new() { Key = "tax", Label = "Tax", Align = "right", Type = "currency" },
                        new() { Key = "grandTotal", Label = "Net Total", Align = "right", Type = "currency" },
                        new() { Key = "paymentMethod", Label = "Payment Method", Align = "center", Type = "badge" }
                    };

                    foreach (var b in bills)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["billNumber"] = b.BillNumber,
                            ["date"] = b.GeneratedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["branchName"] = b.Branch?.Name ?? "Main Branch",
                            ["subtotal"] = b.Subtotal,
                            ["discount"] = b.Discount,
                            ["tax"] = b.Tax,
                            ["grandTotal"] = b.GrandTotal,
                            ["paymentMethod"] = string.IsNullOrWhiteSpace(b.PaymentMethod) ? "Cash" : b.PaymentMethod
                        });
                    }
                    break;
                }

                case "sales_trend":
                case "daily_sales":
                default:
                {
                    result.Title = "Sales Report — Daily Sales";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalOrders", Label = "Total Orders", Align = "right", Type = "number" },
                        new() { Key = "grossSales", Label = "Gross Sales", Align = "right", Type = "currency" },
                        new() { Key = "discount", Label = "Discount", Align = "right", Type = "currency" },
                        new() { Key = "tax", Label = "Tax", Align = "right", Type = "currency" },
                        new() { Key = "netSales", Label = "Net Sales", Align = "right", Type = "currency" },
                        new() { Key = "paymentMethods", Label = "Payment Methods", Align = "left", Type = "text" }
                    };

                    var groups = bills.GroupBy(b => new
                    {
                        Date = b.GeneratedAt.Date,
                        BranchName = b.Branch?.Name ?? "Main Branch"
                    }).OrderByDescending(g => g.Key.Date).ThenBy(g => g.Key.BranchName).ToList();

                    foreach (var g in groups)
                    {
                        var subtotal = g.Sum(x => x.Subtotal);
                        var discount = g.Sum(x => x.Discount);
                        var tax = g.Sum(x => x.Tax);
                        var net = g.Sum(x => x.GrandTotal);
                        var pBreakdown = string.Join(", ", g.GroupBy(x => string.IsNullOrWhiteSpace(x.PaymentMethod) ? "Cash" : x.PaymentMethod)
                            .Select(pm => $"{pm.Key}: ₹{pm.Sum(v => v.GrandTotal):N0}"));

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["date"] = g.Key.Date.ToString("yyyy-MM-dd"),
                            ["branchName"] = g.Key.BranchName,
                            ["totalOrders"] = g.Count(),
                            ["grossSales"] = subtotal,
                            ["discount"] = discount,
                            ["tax"] = tax,
                            ["netSales"] = net,
                            ["paymentMethods"] = string.IsNullOrWhiteSpace(pBreakdown) ? "Cash" : pBreakdown
                        });
                    }

                    // Daily Sales Trend Bar Chart
                    var dailyChart = groups.GroupBy(g => g.Key.Date).Select(dg => new ChartDataPointDto
                    {
                        Label = dg.Key.ToString("dd MMM"),
                        Value = dg.Sum(x => x.Sum(b => b.GrandTotal)),
                        Tooltip = $"{dg.Sum(x => x.Count())} bills"
                    }).OrderBy(x => x.Label).ToList();

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "daily_sales_trend",
                        Title = "Daily Sales Trend",
                        Subtitle = "Total revenue recorded by day",
                        ChartType = "bar",
                        Data = dailyChart
                    });

                    // Payment Method Breakdown Chart
                    var payChart = bills.GroupBy(b => string.IsNullOrWhiteSpace(b.PaymentMethod) ? "Cash" : b.PaymentMethod)
                        .Select(pg => new ChartDataPointDto
                        {
                            Label = pg.Key,
                            Value = pg.Sum(b => b.GrandTotal)
                        }).OrderByDescending(x => x.Value).ToList();

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "payment_breakdown",
                        Title = "Payment Method Breakdown",
                        Subtitle = "Revenue distribution by collection channel",
                        ChartType = "donut",
                        Data = payChart
                    });
                    break;
                }
            }

            // Summary Totals
            result.Summary["totalOrders"] = bills.Count;
            result.Summary["grossSales"] = bills.Sum(b => b.Subtotal);
            result.Summary["discount"] = bills.Sum(b => b.Discount);
            result.Summary["tax"] = bills.Sum(b => b.Tax);
            result.Summary["netSales"] = bills.Sum(b => b.GrandTotal);

            return result;
        }

        #endregion

        #region Category 2: Order Reports

        private async Task<AnalyticsReportResult> BuildOrderReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var query = _context.Orders.AsNoTracking()
                .Include(o => o.Branch)
                .Include(o => o.Waiter)
                .Include(o => o.Items)
                .Where(o => o.OrganizationId == orgId && o.CreatedAt >= start && o.CreatedAt < end);

            if (branchId.HasValue) query = query.Where(o => o.BranchId == branchId.Value);

            var result = new AnalyticsReportResult();

            if (type == "order_activity")
            {
                result.Title = "Order Report — Order Activity";
                result.Columns = new List<ReportColumnDto>
                {
                    new() { Key = "hour", Label = "Hour Window", Align = "left", Type = "text" },
                    new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                    new() { Key = "totalOrders", Label = "Orders Placed", Align = "right", Type = "number" },
                    new() { Key = "servedOrders", Label = "Served", Align = "right", Type = "number" },
                    new() { Key = "cancelledOrders", Label = "Cancelled", Align = "right", Type = "number" },
                    new() { Key = "totalSales", Label = "Hourly Sales", Align = "right", Type = "currency" }
                };

                var orders = await query.ToListAsync();
                var hours = orders.GroupBy(o => new { o.CreatedAt.Hour, BranchName = o.Branch?.Name ?? "Main Branch" })
                    .OrderBy(g => g.Key.Hour).ToList();

                foreach (var h in hours)
                {
                    result.Records.Add(new Dictionary<string, object?>
                    {
                        ["hour"] = $"{h.Key.Hour:D2}:00 – {h.Key.Hour + 1:D2}:00",
                        ["branchName"] = h.Key.BranchName,
                        ["totalOrders"] = h.Count(),
                        ["servedOrders"] = h.Count(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing"),
                        ["cancelledOrders"] = h.Count(o => o.Status == "Cancelled"),
                        ["totalSales"] = h.Where(o => o.Status != "Cancelled").Sum(o => o.TotalAmount)
                    });
                }

                result.Charts.Add(new ReportChartDto
                {
                    Id = "hourly_activity_chart",
                    Title = "Hourly Order Activity",
                    Subtitle = "Order traffic distribution across the day",
                    ChartType = "bar",
                    Data = result.Records.Select(r => new ChartDataPointDto
                    {
                        Label = r["hour"]?.ToString() ?? "",
                        Value = Convert.ToDecimal(r["totalOrders"])
                    }).ToList()
                });

                return result;
            }

            if (type == "order_type_breakdown")
            {
                result.Title = "Order Report — Order Type Breakdown";
                result.Columns = new List<ReportColumnDto>
                {
                    new() { Key = "saleType", Label = "Order Type", Align = "left", Type = "text" },
                    new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                    new() { Key = "orderCount", Label = "Total Orders", Align = "right", Type = "number" },
                    new() { Key = "completedCount", Label = "Completed", Align = "right", Type = "number" },
                    new() { Key = "totalSales", Label = "Total Revenue", Align = "right", Type = "currency" },
                    new() { Key = "avgTicket", Label = "Avg Ticket Size", Align = "right", Type = "currency" }
                };
                var allOrders = await query.ToListAsync();
                var typeGroups = allOrders.GroupBy(o => new
                {
                    Type = o.SaleType == "SELF_SERVICE" ? "Counter / Self-Service" : "Table / Dine-In",
                    Branch = o.Branch?.Name ?? "Main Branch"
                }).ToList();
                foreach (var tg in typeGroups)
                {
                    var count = tg.Count();
                    var comp = tg.Count(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid");
                    var rev = tg.Where(o => o.Status != "Cancelled").Sum(o => o.TotalAmount);
                    result.Records.Add(new Dictionary<string, object?>
                    {
                        ["saleType"] = tg.Key.Type,
                        ["branchName"] = tg.Key.Branch,
                        ["orderCount"] = count,
                        ["completedCount"] = comp,
                        ["totalSales"] = rev,
                        ["avgTicket"] = count > 0 ? rev / count : 0
                    });
                }
                result.Charts.Add(new ReportChartDto
                {
                    Id = "order_type_chart",
                    Title = "Orders by Service Type",
                    Subtitle = "Self-Service vs Table Service distribution",
                    ChartType = "donut",
                    Data = typeGroups.Select(tg => new ChartDataPointDto
                    {
                        Label = tg.Key.Type,
                        Value = tg.Count()
                    }).ToList()
                });
                return result;
            }

            if (type == "completed_orders")
            {
                result.Title = "Order Report — Completed Orders";
                query = query.Where(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing");
            }
            else if (type == "pending_orders")
            {
                result.Title = "Order Report — Pending Orders";
                query = query.Where(o => o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Ready" || o.Status == "Open");
            }
            else if (type == "cancelled_orders")
            {
                result.Title = "Order Report — Cancelled Orders";
                query = query.Where(o => o.Status == "Cancelled");
            }
            else
            {
                result.Title = "Order Report — Total Orders";
            }

            result.Columns = new List<ReportColumnDto>
            {
                new() { Key = "orderNumber", Label = "Order #", Align = "left", Type = "text" },
                new() { Key = "dateTime", Label = "Date & Time", Align = "left", Type = "date" },
                new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                new() { Key = "tableNumber", Label = "Table", Align = "center", Type = "text" },
                new() { Key = "waiterName", Label = "Waiter / Staff", Align = "left", Type = "text" },
                new() { Key = "saleType", Label = "Sale Type", Align = "center", Type = "badge" },
                new() { Key = "status", Label = "Status", Align = "center", Type = "badge" },
                new() { Key = "itemsSummary", Label = "Items Ordered", Align = "left", Type = "text" },
                new() { Key = "totalAmount", Label = "Total Amount", Align = "right", Type = "currency" }
            };

            var list = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();

            foreach (var o in list)
            {
                var itemsSummary = string.Join(", ", o.Items.Select(i => $"{i.MenuItemName} × {i.Quantity:G29}"));
                result.Records.Add(new Dictionary<string, object?>
                {
                    ["orderNumber"] = o.OrderNumber,
                    ["dateTime"] = o.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                    ["branchName"] = o.Branch?.Name ?? "Main Branch",
                    ["tableNumber"] = string.IsNullOrWhiteSpace(o.TableNumber) ? "—" : o.TableNumber,
                    ["waiterName"] = o.Waiter?.Name ?? "Staff",
                    ["saleType"] = o.SaleType == "SELF_SERVICE" ? "Self Service" : "Dine In",
                    ["status"] = o.Status,
                    ["itemsSummary"] = string.IsNullOrWhiteSpace(itemsSummary) ? "—" : itemsSummary,
                    ["totalAmount"] = o.TotalAmount
                });
            }

            // Order Volume Trend
            var trend = list.GroupBy(o => o.CreatedAt.Date).Select(g => new ChartDataPointDto
            {
                Label = g.Key.ToString("dd MMM"),
                Value = g.Count(),
                Tooltip = $"₹{g.Sum(x => x.TotalAmount):N2}"
            }).OrderBy(x => x.Label).ToList();

            result.Charts.Add(new ReportChartDto
            {
                Id = "order_volume_trend",
                Title = "Order Volume Trend",
                Subtitle = "Daily order count in selected period",
                ChartType = "bar",
                Data = trend
            });

            // Status Breakdown
            var statuses = list.GroupBy(o => o.Status).Select(g => new ChartDataPointDto
            {
                Label = g.Key,
                Value = g.Count()
            }).ToList();

            result.Charts.Add(new ReportChartDto
            {
                Id = "order_status_breakdown",
                Title = "Order Status Breakdown",
                Subtitle = "Distribution by order fulfillment status",
                ChartType = "donut",
                Data = statuses
            });

            result.Summary["totalOrders"] = list.Count;
            result.Summary["totalAmount"] = list.Sum(o => o.TotalAmount);

            return result;
        }

        #endregion

        #region Category 3: Inventory Reports

        private async Task<AnalyticsReportResult> BuildInventoryReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            switch (type)
            {
                case "stock_ledger":
                {
                    result.Title = "Inventory Report — Stock Ledger";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "dateTime", Label = "Date & Time", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "type", Label = "Movement Type", Align = "center", Type = "badge" },
                        new() { Key = "quantity", Label = "Quantity", Align = "right", Type = "number" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "stockBefore", Label = "Stock Before", Align = "right", Type = "number" },
                        new() { Key = "stockAfter", Label = "Stock After", Align = "right", Type = "number" },
                        new() { Key = "reference", Label = "Reference", Align = "left", Type = "text" },
                        new() { Key = "actionedBy", Label = "Actioned By", Align = "left", Type = "text" }
                    };

                    var txQuery = _context.StockTransactions.AsNoTracking()
                        .Include(t => t.Branch)
                        .Include(t => t.InventoryItem)
                        .Include(t => t.CreatedByUser)
                        .Where(t => t.OrganizationId == orgId && t.CreatedAt >= start && t.CreatedAt < end);

                    if (branchId.HasValue) txQuery = txQuery.Where(t => t.BranchId == branchId.Value);

                    var txs = await txQuery.OrderByDescending(t => t.CreatedAt).Take(500).ToListAsync();

                    foreach (var t in txs)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["dateTime"] = t.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["branchName"] = t.Branch?.Name ?? "Main Branch",
                            ["itemName"] = t.InventoryItem?.Name ?? "Item",
                            ["type"] = t.Type,
                            ["quantity"] = t.Quantity,
                            ["unit"] = t.InventoryItem?.Unit ?? "Unit",
                            ["stockBefore"] = t.StockBefore,
                            ["stockAfter"] = t.StockAfter,
                            ["reference"] = t.Reference ?? "—",
                            ["actionedBy"] = t.CreatedByUser?.Name ?? "System"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "tx_types_chart",
                        Title = "Stock Movements by Type",
                        Subtitle = "Volume of inventory transactions",
                        ChartType = "donut",
                        Data = txs.GroupBy(t => t.Type).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key,
                            Value = g.Count()
                        }).ToList()
                    });
                    break;
                }

                case "stock_movement":
                {
                    result.Title = "Inventory Report — Stock Movement";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "stockIn", Label = "Stock In / Opening", Align = "right", Type = "number" },
                        new() { Key = "usage", Label = "Usage Consumed", Align = "right", Type = "number" },
                        new() { Key = "wastage", Label = "Wastage Loss", Align = "right", Type = "number" },
                        new() { Key = "currentStock", Label = "Current Stock", Align = "right", Type = "number" }
                    };

                    var itemsQuery = _context.InventoryItems.AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId && i.IsActive);
                    if (branchId.HasValue) itemsQuery = itemsQuery.Where(i => i.BranchId == branchId.Value);
                    var items = await itemsQuery.ToListAsync();

                    var txQuery = _context.StockTransactions.AsNoTracking()
                        .Where(t => t.OrganizationId == orgId && t.CreatedAt >= start && t.CreatedAt < end);
                    if (branchId.HasValue) txQuery = txQuery.Where(t => t.BranchId == branchId.Value);
                    var txs = await txQuery.ToListAsync();

                    foreach (var it in items)
                    {
                        var itTxs = txs.Where(t => t.InventoryItemId == it.Id).ToList();
                        var stockIn = itTxs.Where(t => t.Type == "StockIn" || t.Type == "Opening").Sum(t => t.Quantity);
                        var usage = itTxs.Where(t => t.Type == "Usage").Sum(t => t.Quantity);
                        var wastage = itTxs.Where(t => t.Type == "Wastage").Sum(t => t.Quantity);

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemName"] = it.Name,
                            ["category"] = string.IsNullOrWhiteSpace(it.Category) ? "General" : it.Category,
                            ["branchName"] = it.Branch?.Name ?? "Main Branch",
                            ["unit"] = it.Unit,
                            ["stockIn"] = stockIn,
                            ["usage"] = usage,
                            ["wastage"] = wastage,
                            ["currentStock"] = it.CurrentStock
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "stock_movement_chart",
                        Title = "Stock Movement Summary",
                        Subtitle = "Top consumed items vs stock in",
                        ChartType = "bar",
                        Data = result.Records.OrderByDescending(r => Convert.ToDecimal(r["usage"])).Take(10).Select(r => new ChartDataPointDto
                        {
                            Label = r["itemName"]?.ToString() ?? "",
                            Value = Convert.ToDecimal(r["usage"])
                        }).ToList()
                    });
                    break;
                }

                case "low_stock":
                {
                    result.Title = "Inventory Report — Low Stock";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemCode", Label = "Item Code", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "currentStock", Label = "Current Stock", Align = "right", Type = "number" },
                        new() { Key = "reorderLevel", Label = "Reorder Level", Align = "right", Type = "number" },
                        new() { Key = "minimumStock", Label = "Min Stock", Align = "right", Type = "number" },
                        new() { Key = "suggestedReorder", Label = "Suggested Order", Align = "right", Type = "number" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" }
                    };

                    var query = _context.InventoryItems.AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId && i.IsActive &&
                                    (i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) || i.CurrentStock <= 0));

                    if (branchId.HasValue) query = query.Where(i => i.BranchId == branchId.Value);

                    var items = await query.OrderBy(i => i.CurrentStock).ToListAsync();

                    foreach (var i in items)
                    {
                        var reorder = i.MaximumStock > i.CurrentStock ? i.MaximumStock - i.CurrentStock : (i.ReorderLevel > i.CurrentStock ? i.ReorderLevel - i.CurrentStock : 10);
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemCode"] = i.ItemCode ?? $"ITM-{i.Id}",
                            ["itemName"] = i.Name,
                            ["category"] = string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category,
                            ["branchName"] = i.Branch?.Name ?? "Main Branch",
                            ["unit"] = i.Unit,
                            ["currentStock"] = i.CurrentStock,
                            ["reorderLevel"] = i.ReorderLevel,
                            ["minimumStock"] = i.MinimumStock,
                            ["suggestedReorder"] = reorder,
                            ["status"] = i.CurrentStock <= 0 ? "OUT OF STOCK" : "LOW STOCK"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "low_stock_chart",
                        Title = "Critical Stock Items",
                        Subtitle = "Items below minimum or reorder threshold",
                        ChartType = "horizontal_bar",
                        Data = items.Take(10).Select(i => new ChartDataPointDto
                        {
                            Label = i.Name,
                            Value = i.CurrentStock,
                            Tooltip = $"Reorder at {i.ReorderLevel} {i.Unit}"
                        }).ToList()
                    });
                    break;
                }

                case "out_of_stock":
                {
                    result.Title = "Inventory Report — Out of Stock";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemCode", Label = "Item Code", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "currentStock", Label = "Current Stock", Align = "right", Type = "number" },
                        new() { Key = "minimumStock", Label = "Min Stock", Align = "right", Type = "number" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" }
                    };

                    var query = _context.InventoryItems.AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId && i.IsActive && i.CurrentStock <= 0);

                    if (branchId.HasValue) query = query.Where(i => i.BranchId == branchId.Value);

                    var items = await query.OrderBy(i => i.Name).ToListAsync();

                    foreach (var i in items)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemCode"] = i.ItemCode ?? $"ITM-{i.Id}",
                            ["itemName"] = i.Name,
                            ["category"] = string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category,
                            ["branchName"] = i.Branch?.Name ?? "Main Branch",
                            ["unit"] = i.Unit,
                            ["currentStock"] = i.CurrentStock,
                            ["minimumStock"] = i.MinimumStock,
                            ["status"] = "OUT OF STOCK"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "out_of_stock_chart",
                        Title = "Zero Stock Items",
                        Subtitle = "Items requiring immediate replenishment",
                        ChartType = "horizontal_bar",
                        Data = items.Take(10).Select(i => new ChartDataPointDto
                        {
                            Label = i.Name,
                            Value = 0,
                            Tooltip = $"Min Stock: {i.MinimumStock} {i.Unit}"
                        }).ToList()
                    });
                    break;
                }

                case "stock_valuation":
                {
                    result.Title = "Inventory Report — Stock Valuation";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemCode", Label = "Item Code", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "currentStock", Label = "Current Stock", Align = "right", Type = "number" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "unitCost", Label = "Unit Cost", Align = "right", Type = "currency" },
                        new() { Key = "totalValuation", Label = "Total Valuation", Align = "right", Type = "currency" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" }
                    };

                    var query = _context.InventoryItems.AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId && i.IsActive);

                    if (branchId.HasValue) query = query.Where(i => i.BranchId == branchId.Value);

                    var items = await query.OrderBy(i => i.Category).ThenBy(i => i.Name).ToListAsync();

                    foreach (var i in items)
                    {
                        var cost = i.LastPurchasePrice > 0 ? i.LastPurchasePrice : 50; // realistic estimated baseline if no PO
                        var val = Math.Max(0, i.CurrentStock) * cost;

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemCode"] = i.ItemCode ?? $"ITM-{i.Id}",
                            ["itemName"] = i.Name,
                            ["category"] = string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category,
                            ["branchName"] = i.Branch?.Name ?? "Main Branch",
                            ["currentStock"] = i.CurrentStock,
                            ["unit"] = i.Unit,
                            ["unitCost"] = cost,
                            ["totalValuation"] = Math.Round(val, 2),
                            ["status"] = i.CurrentStock <= 0 ? "EMPTY" : "ACTIVE"
                        });
                    }

                    var catVal = result.Records.GroupBy(r => r["category"]?.ToString() ?? "General")
                        .Select(g => new ChartDataPointDto
                        {
                            Label = g.Key,
                            Value = g.Sum(x => Convert.ToDecimal(x["totalValuation"]))
                        }).OrderByDescending(x => x.Value).ToList();

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "valuation_by_category",
                        Title = "Inventory Valuation by Category",
                        Subtitle = "Asset value distribution across stock categories",
                        ChartType = "donut",
                        Data = catVal
                    });

                    result.Summary["totalValuation"] = result.Records.Sum(r => Convert.ToDecimal(r["totalValuation"]));
                    break;
                }

                case "current_stock":
                default:
                {
                    result.Title = "Inventory Report — Current Stock";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemCode", Label = "Item Code", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "currentStock", Label = "Current Stock", Align = "right", Type = "number" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "minimumStock", Label = "Min Stock", Align = "right", Type = "number" },
                        new() { Key = "reorderLevel", Label = "Reorder Level", Align = "right", Type = "number" },
                        new() { Key = "status", Label = "Stock Status", Align = "center", Type = "badge" }
                    };

                    var query = _context.InventoryItems.AsNoTracking()
                        .Include(i => i.Branch)
                        .Where(i => i.OrganizationId == orgId && i.IsActive);

                    if (branchId.HasValue) query = query.Where(i => i.BranchId == branchId.Value);

                    var items = await query.OrderBy(i => i.Category).ThenBy(i => i.Name).ToListAsync();

                    foreach (var i in items)
                    {
                        var status = i.CurrentStock <= 0 ? "OUT OF STOCK" :
                            (i.CurrentStock <= (i.ReorderLevel > 0 ? i.ReorderLevel : i.MinimumStock) ? "LOW STOCK" : "IN STOCK");

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemCode"] = i.ItemCode ?? $"ITM-{i.Id}",
                            ["itemName"] = i.Name,
                            ["category"] = string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category,
                            ["branchName"] = i.Branch?.Name ?? "Main Branch",
                            ["currentStock"] = i.CurrentStock,
                            ["unit"] = i.Unit,
                            ["minimumStock"] = i.MinimumStock,
                            ["reorderLevel"] = i.ReorderLevel,
                            ["status"] = status
                        });
                    }

                    var catCount = items.GroupBy(i => string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category)
                        .Select(g => new ChartDataPointDto
                        {
                            Label = g.Key,
                            Value = g.Count()
                        }).ToList();

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "category_count_chart",
                        Title = "Inventory Items by Category",
                        Subtitle = "Number of active inventory catalog items",
                        ChartType = "donut",
                        Data = catCount
                    });

                    result.Summary["totalItems"] = items.Count;
                    result.Summary["totalStock"] = items.Sum(i => i.CurrentStock);
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Category 4: Purchase Reports

        private async Task<AnalyticsReportResult> BuildPurchaseReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            switch (type)
            {
                case "grn":
                {
                    result.Title = "Purchase Report — Goods Received Notes (GRN)";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "grnNumber", Label = "GRN #", Align = "left", Type = "text" },
                        new() { Key = "poNumber", Label = "PO / Ref #", Align = "left", Type = "text" },
                        new() { Key = "receivedDate", Label = "Received Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "vendorName", Label = "Supplier / Vendor", Align = "left", Type = "text" },
                        new() { Key = "itemsCount", Label = "Items", Align = "right", Type = "number" },
                        new() { Key = "totalQuantity", Label = "Received Qty", Align = "right", Type = "number" },
                        new() { Key = "totalAmount", Label = "Total Amount", Align = "right", Type = "currency" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" }
                    };

                    var query = _context.Purchases.AsNoTracking()
                        .Include(p => p.Supplier)
                        .Include(p => p.Branch)
                        .Include(p => p.Items)
                        .Where(p => p.OrganizationId == orgId &&
                                    (p.Status == "Received" || p.Status == "Partially Returned" || p.Status == "Returned") &&
                                    (p.UpdatedAt ?? p.CreatedAt) >= start && (p.UpdatedAt ?? p.CreatedAt) < end);

                    if (branchId.HasValue) query = query.Where(p => p.BranchId == branchId.Value);

                    var list = await query.OrderByDescending(p => p.UpdatedAt ?? p.CreatedAt).ToListAsync();

                    foreach (var p in list)
                    {
                        var grnNum = "GRN-" + (!string.IsNullOrWhiteSpace(p.PurchaseNumber) ? p.PurchaseNumber.Replace("PO-", "").Replace("PUR-", "") : p.Id.ToString("D5"));
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["grnNumber"] = grnNum,
                            ["poNumber"] = p.PurchaseNumber ?? p.InvoiceNumber,
                            ["receivedDate"] = (p.UpdatedAt ?? p.CreatedAt).ToString("yyyy-MM-dd"),
                            ["branchName"] = p.Branch?.Name ?? "Main Branch",
                            ["vendorName"] = p.Supplier?.Name ?? "Vendor",
                            ["itemsCount"] = p.Items.Count,
                            ["totalQuantity"] = p.Items.Sum(it => it.Quantity),
                            ["totalAmount"] = p.TotalAmount,
                            ["status"] = p.Status
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "grn_trend_chart",
                        Title = "Goods Received Notes Trend",
                        Subtitle = "Inward procurement deliveries value",
                        ChartType = "bar",
                        Data = list.GroupBy(p => (p.UpdatedAt ?? p.CreatedAt).Date).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key.ToString("dd MMM"),
                            Value = g.Sum(x => x.TotalAmount)
                        }).OrderBy(x => x.Label).ToList()
                    });

                    result.Summary["totalGRN"] = list.Count;
                    result.Summary["totalAmount"] = list.Sum(p => p.TotalAmount);
                    break;
                }

                case "supplier_purchases":
                {
                    result.Title = "Purchase Report — Supplier Purchases";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "supplierName", Label = "Supplier Name", Align = "left", Type = "text" },
                        new() { Key = "contactPerson", Label = "Contact Person", Align = "left", Type = "text" },
                        new() { Key = "phone", Label = "Phone", Align = "left", Type = "text" },
                        new() { Key = "gstNumber", Label = "GST #", Align = "left", Type = "text" },
                        new() { Key = "totalOrders", Label = "Total Orders", Align = "right", Type = "number" },
                        new() { Key = "totalSpend", Label = "Total Purchases", Align = "right", Type = "currency" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" }
                    };

                    var suppliers = await _context.Suppliers.AsNoTracking()
                        .Include(s => s.Purchases)
                        .Where(s => s.OrganizationId == orgId)
                        .OrderBy(s => s.Name).ToListAsync();

                    foreach (var s in suppliers)
                    {
                        var sPurchases = s.Purchases.Where(p => p.CreatedAt >= start && p.CreatedAt < end && (!branchId.HasValue || p.BranchId == branchId.Value)).ToList();
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["supplierName"] = s.Name,
                            ["contactPerson"] = s.ContactPerson ?? "—",
                            ["phone"] = s.Phone ?? "—",
                            ["gstNumber"] = s.GstNumber ?? "—",
                            ["totalOrders"] = sPurchases.Count,
                            ["totalSpend"] = sPurchases.Sum(p => p.TotalAmount),
                            ["status"] = s.IsActive ? "ACTIVE" : "INACTIVE"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "supplier_spend_chart",
                        Title = "Spend by Supplier",
                        Subtitle = "Total purchase value by registered vendor",
                        ChartType = "donut",
                        Data = result.Records.Where(r => Convert.ToDecimal(r["totalSpend"]) > 0).Select(r => new ChartDataPointDto
                        {
                            Label = r["supplierName"]?.ToString() ?? "",
                            Value = Convert.ToDecimal(r["totalSpend"])
                        }).ToList()
                    });
                    break;
                }

                case "purchase_returns":
                {
                    result.Title = "Purchase Report — Purchase Returns";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "returnNumber", Label = "Return / PO #", Align = "left", Type = "text" },
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "vendorName", Label = "Supplier", Align = "left", Type = "text" },
                        new() { Key = "totalAmount", Label = "Returned Value", Align = "right", Type = "currency" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" },
                        new() { Key = "notes", Label = "Notes / Reason", Align = "left", Type = "text" }
                    };

                    var query = _context.Purchases.AsNoTracking()
                        .Include(p => p.Supplier)
                        .Include(p => p.Branch)
                        .Where(p => p.OrganizationId == orgId && (p.Status == "Returned" || p.Status == "Partially Returned") &&
                                    p.CreatedAt >= start && p.CreatedAt < end);

                    if (branchId.HasValue) query = query.Where(p => p.BranchId == branchId.Value);
                    var list = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

                    foreach (var p in list)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["returnNumber"] = p.PurchaseNumber ?? $"RET-{p.Id}",
                            ["date"] = p.CreatedAt.ToString("yyyy-MM-dd"),
                            ["branchName"] = p.Branch?.Name ?? "Main Branch",
                            ["vendorName"] = p.Supplier?.Name ?? "Vendor",
                            ["totalAmount"] = p.TotalAmount,
                            ["status"] = p.Status,
                            ["notes"] = p.Notes ?? "Defective / Excess return"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "purchase_returns_chart",
                        Title = "Purchase Returns",
                        Subtitle = "Value of materials returned to vendors",
                        ChartType = "bar",
                        Data = list.GroupBy(p => p.CreatedAt.Date).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key.ToString("dd MMM"),
                            Value = g.Sum(x => x.TotalAmount)
                        }).ToList()
                    });
                    break;
                }

                case "purchase_orders":
                default:
                {
                    result.Title = "Purchase Report — Purchase Orders";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "purchaseNumber", Label = "PO Number", Align = "left", Type = "text" },
                        new() { Key = "purchaseDate", Label = "Purchase Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "vendorName", Label = "Supplier", Align = "left", Type = "text" },
                        new() { Key = "itemsCount", Label = "Items", Align = "right", Type = "number" },
                        new() { Key = "totalQuantity", Label = "Quantity", Align = "right", Type = "number" },
                        new() { Key = "totalAmount", Label = "Total Amount", Align = "right", Type = "currency" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" },
                        new() { Key = "createdBy", Label = "Created By", Align = "left", Type = "text" }
                    };

                    var query = _context.Purchases.AsNoTracking()
                        .Include(p => p.Supplier)
                        .Include(p => p.Branch)
                        .Include(p => p.CreatedByUser)
                        .Include(p => p.Items)
                        .Where(p => p.OrganizationId == orgId && p.CreatedAt >= start && p.CreatedAt < end);

                    if (branchId.HasValue) query = query.Where(p => p.BranchId == branchId.Value);
                    var list = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

                    foreach (var p in list)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["purchaseNumber"] = p.PurchaseNumber ?? p.InvoiceNumber,
                            ["purchaseDate"] = (p.PurchaseDate ?? p.CreatedAt).ToString("yyyy-MM-dd"),
                            ["branchName"] = p.Branch?.Name ?? "Main Branch",
                            ["vendorName"] = p.Supplier?.Name ?? "Vendor",
                            ["itemsCount"] = p.Items.Count,
                            ["totalQuantity"] = p.Items.Sum(it => it.Quantity),
                            ["totalAmount"] = p.TotalAmount,
                            ["status"] = p.Status,
                            ["createdBy"] = p.CreatedByUser?.Name ?? "Admin"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "po_amount_trend",
                        Title = "Purchase Spend Trend",
                        Subtitle = "Total procurement cost over the period",
                        ChartType = "bar",
                        Data = list.GroupBy(p => (p.PurchaseDate ?? p.CreatedAt).Date).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key.ToString("dd MMM"),
                            Value = g.Sum(x => x.TotalAmount)
                        }).OrderBy(x => x.Label).ToList()
                    });

                    result.Summary["totalPurchases"] = list.Count;
                    result.Summary["totalAmount"] = list.Sum(p => p.TotalAmount);
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Category 5: Kitchen & Production Reports

        private async Task<AnalyticsReportResult> BuildKitchenReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            switch (type)
            {
                case "ingredient_consumption":
                {
                    result.Title = "Kitchen Report — Ingredient Consumption";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "ingredientName", Label = "Ingredient / Raw Material", Align = "left", Type = "text" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "quantity", Label = "Consumed Qty", Align = "right", Type = "number" },
                        new() { Key = "reference", Label = "Reference / Meal", Align = "left", Type = "text" },
                        new() { Key = "actionedBy", Label = "Recorded By", Align = "left", Type = "text" }
                    };

                    var txQuery = _context.StockTransactions.AsNoTracking()
                        .Include(t => t.Branch)
                        .Include(t => t.InventoryItem)
                        .Include(t => t.CreatedByUser)
                        .Where(t => t.OrganizationId == orgId && t.Type == "Usage" && t.CreatedAt >= start && t.CreatedAt < end);

                    if (branchId.HasValue) txQuery = txQuery.Where(t => t.BranchId == branchId.Value);
                    var txs = await txQuery.OrderByDescending(t => t.CreatedAt).ToListAsync();

                    foreach (var t in txs)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["date"] = t.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["branchName"] = t.Branch?.Name ?? "Main Branch",
                            ["ingredientName"] = t.InventoryItem?.Name ?? "Item",
                            ["unit"] = t.InventoryItem?.Unit ?? "Unit",
                            ["quantity"] = t.Quantity,
                            ["reference"] = t.Reference ?? "Kitchen Production",
                            ["actionedBy"] = t.CreatedByUser?.Name ?? "Chef"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "top_ingredients_chart",
                        Title = "Top Consumed Ingredients",
                        Subtitle = "Raw material portions utilized in cooking",
                        ChartType = "horizontal_bar",
                        Data = txs.GroupBy(t => t.InventoryItem?.Name ?? "Item")
                            .Select(g => new ChartDataPointDto
                            {
                                Label = g.Key,
                                Value = g.Sum(x => x.Quantity)
                            }).OrderByDescending(x => x.Value).Take(10).ToList()
                    });
                    break;
                }

                case "kitchen_activity":
                {
                    result.Title = "Kitchen Report — Kitchen Activity (Issues & Returns)";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "transactionNumber", Label = "Tx #", Align = "left", Type = "text" },
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "type", Label = "Activity Type", Align = "center", Type = "badge" },
                        new() { Key = "department", Label = "Department / Kitchen", Align = "left", Type = "text" },
                        new() { Key = "quantity", Label = "Total Quantity", Align = "right", Type = "number" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" },
                        new() { Key = "actionedBy", Label = "Actioned By", Align = "left", Type = "text" }
                    };

                    var issuesQuery = _context.MaterialIssues.AsNoTracking()
                        .Include(m => m.Branch).Include(m => m.CreatedByUser)
                        .Where(m => m.OrganizationId == orgId && m.CreatedAt >= start && m.CreatedAt < end);
                    if (branchId.HasValue) issuesQuery = issuesQuery.Where(m => m.BranchId == branchId.Value);
                    var issues = await issuesQuery.ToListAsync();

                    var returnsQuery = _context.MaterialReturns.AsNoTracking()
                        .Include(m => m.Branch).Include(m => m.CreatedByUser)
                        .Where(m => m.OrganizationId == orgId && m.CreatedAt >= start && m.CreatedAt < end);
                    if (branchId.HasValue) returnsQuery = returnsQuery.Where(m => m.BranchId == branchId.Value);
                    var returns = await returnsQuery.ToListAsync();

                    foreach (var i in issues)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["transactionNumber"] = i.IssueNumber ?? $"ISS-{i.Id}",
                            ["date"] = i.CreatedAt.ToString("yyyy-MM-dd"),
                            ["branchName"] = i.Branch?.Name ?? "Main Branch",
                            ["type"] = "STORE TO KITCHEN",
                            ["department"] = i.Department ?? i.IssueType,
                            ["quantity"] = i.Quantity,
                            ["status"] = i.Status,
                            ["actionedBy"] = i.CreatedByUser?.Name ?? "Store Keeper"
                        });
                    }

                    foreach (var r in returns)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["transactionNumber"] = r.ReturnNumber ?? $"RET-{r.Id}",
                            ["date"] = r.CreatedAt.ToString("yyyy-MM-dd"),
                            ["branchName"] = r.Branch?.Name ?? "Main Branch",
                            ["type"] = "KITCHEN TO STORE",
                            ["department"] = r.ReturnType,
                            ["quantity"] = r.ReturnedQuantity > 0 ? r.ReturnedQuantity : r.Quantity,
                            ["status"] = r.Status,
                            ["actionedBy"] = r.CreatedByUser?.Name ?? "Chef"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "activity_split_chart",
                        Title = "Material Issues vs Unused Returns",
                        Subtitle = "Inward store dispatches vs outward kitchen returns",
                        ChartType = "donut",
                        Data = new List<ChartDataPointDto>
                        {
                            new() { Label = "Material Dispatched", Value = issues.Sum(x => x.Quantity) },
                            new() { Label = "Unused Returned", Value = returns.Sum(x => x.ReturnedQuantity > 0 ? x.ReturnedQuantity : x.Quantity) }
                        }
                    });
                    break;
                }

                case "preparation_status":
                {
                    result.Title = "Kitchen Report — Preparation Status";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "kotNumber", Label = "KOT #", Align = "left", Type = "text" },
                        new() { Key = "time", Label = "Time", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "orderNumber", Label = "Order #", Align = "left", Type = "text" },
                        new() { Key = "saleType", Label = "Type", Align = "center", Type = "badge" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" },
                        new() { Key = "items", Label = "Items", Align = "left", Type = "text" }
                    };

                    var kotQuery = _context.KOTs.AsNoTracking()
                        .Include(k => k.Branch).Include(k => k.Order).Include(k => k.Items)
                        .Where(k => k.OrganizationId == orgId && k.CreatedAt >= start && k.CreatedAt < end);

                    if (branchId.HasValue) kotQuery = kotQuery.Where(k => k.BranchId == branchId.Value);

                    var kots = await kotQuery.OrderByDescending(k => k.CreatedAt).ToListAsync();

                    foreach (var k in kots)
                    {
                        var itemsSummary = string.Join(", ", k.Items.Select(i => $"{i.MenuItemName} × {i.Quantity}"));
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["kotNumber"] = k.KOTNumber ?? $"KOT-{k.Id}",
                            ["time"] = k.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["branchName"] = k.Branch?.Name ?? "Main Branch",
                            ["orderNumber"] = k.Order?.OrderNumber ?? "—",
                            ["saleType"] = k.SaleType == "SELF_SERVICE" ? "Counter Sale" : "Table Service",
                            ["status"] = k.Status,
                            ["items"] = string.IsNullOrWhiteSpace(itemsSummary) ? "—" : itemsSummary
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "kot_status_chart",
                        Title = "KOT Status Distribution",
                        Subtitle = "Kitchen ticket workflow status breakdown",
                        ChartType = "donut",
                        Data = kots.GroupBy(k => k.Status).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key,
                            Value = g.Count()
                        }).ToList()
                    });
                    break;
                }

                case "production_plan_vs_actual":
                default:
                {
                    result.Title = "Kitchen Report — Production Plan vs Actual";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "productionNumber", Label = "Production #", Align = "left", Type = "text" },
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "menuItemName", Label = "Menu Item", Align = "left", Type = "text" },
                        new() { Key = "plannedQuantity", Label = "Planned Qty", Align = "right", Type = "number" },
                        new() { Key = "actualQuantity", Label = "Actual Produced", Align = "right", Type = "number" },
                        new() { Key = "variance", Label = "Variance", Align = "right", Type = "number" },
                        new() { Key = "wastageQuantity", Label = "Wastage", Align = "right", Type = "number" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" },
                        new() { Key = "createdBy", Label = "Chef", Align = "left", Type = "text" }
                    };

                    var query = _context.ActualProductions.AsNoTracking()
                        .Include(p => p.MenuItem)
                        .Include(p => p.Branch)
                        .Include(p => p.CreatedByUser)
                        .Where(p => p.OrganizationId == orgId && p.ProductionDate >= start && p.ProductionDate < end);

                    if (branchId.HasValue) query = query.Where(p => p.BranchId == branchId.Value);
                    var productions = await query.OrderByDescending(p => p.ProductionDate).ToListAsync();

                    foreach (var p in productions)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["productionNumber"] = p.ProductionNumber ?? $"PRD-{p.Id}",
                            ["date"] = p.ProductionDate.ToString("yyyy-MM-dd"),
                            ["branchName"] = p.Branch?.Name ?? "Main Branch",
                            ["menuItemName"] = p.MenuItem?.Name ?? "Dish",
                            ["plannedQuantity"] = p.PlannedQuantity,
                            ["actualQuantity"] = p.ActualQuantity,
                            ["variance"] = p.ActualQuantity - p.PlannedQuantity,
                            ["wastageQuantity"] = p.WastageQuantity,
                            ["status"] = p.Status,
                            ["createdBy"] = p.CreatedByUser?.Name ?? "Chef"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "plan_vs_actual_chart",
                        Title = "Planned vs Actual Production",
                        Subtitle = "Batch portion planning vs actual kitchen yield",
                        ChartType = "bar",
                        Data = productions.Take(10).Select(p => new ChartDataPointDto
                        {
                            Label = p.MenuItem?.Name ?? $"Batch #{p.Id}",
                            Value = p.ActualQuantity,
                            SecondaryValue = p.PlannedQuantity,
                            SecondaryLabel = "Planned",
                            Tooltip = $"Variance: {p.ActualQuantity - p.PlannedQuantity:+0.00;-0.00;0}"
                        }).ToList()
                    });

                    result.Summary["totalPlanned"] = productions.Sum(p => p.PlannedQuantity);
                    result.Summary["totalActual"] = productions.Sum(p => p.ActualQuantity);
                    result.Summary["totalWastage"] = productions.Sum(p => p.WastageQuantity);
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Category 6: Wastage Reports

        private async Task<AnalyticsReportResult> BuildWastageReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            var txQuery = _context.StockTransactions.AsNoTracking()
                .Include(t => t.Branch)
                .Include(t => t.InventoryItem)
                .Include(t => t.CreatedByUser)
                .Where(t => t.OrganizationId == orgId && t.Type == "Wastage" && t.CreatedAt >= start && t.CreatedAt < end);

            if (branchId.HasValue) txQuery = txQuery.Where(t => t.BranchId == branchId.Value);
            var wastages = await txQuery.OrderByDescending(t => t.CreatedAt).ToListAsync();

            switch (type)
            {
                case "wastage_reasons":
                {
                    result.Title = "Wastage Report — Wastage Reasons";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "reason", Label = "Wastage Reason / Cause", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalIncidents", Label = "Total Incidents", Align = "right", Type = "number" },
                        new() { Key = "totalQuantity", Label = "Total Quantity Lost", Align = "right", Type = "number" },
                        new() { Key = "affectedItems", Label = "Items Affected", Align = "left", Type = "text" }
                    };

                    var groups = wastages.GroupBy(w => new
                    {
                        Reason = string.IsNullOrWhiteSpace(w.Reference) ? (string.IsNullOrWhiteSpace(w.Notes) ? "Expired / Spoiled" : w.Notes) : w.Reference,
                        BranchName = w.Branch?.Name ?? "Main Branch"
                    }).Select(g => new
                    {
                        g.Key.Reason,
                        g.Key.BranchName,
                        Incidents = g.Count(),
                        Qty = g.Sum(x => x.Quantity),
                        Items = string.Join(", ", g.Select(x => x.InventoryItem?.Name).Where(x => x != null).Distinct().Take(3))
                    }).OrderByDescending(x => x.Qty).ToList();

                    foreach (var g in groups)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["reason"] = g.Reason,
                            ["branchName"] = g.BranchName,
                            ["totalIncidents"] = g.Incidents,
                            ["totalQuantity"] = g.Qty,
                            ["affectedItems"] = string.IsNullOrWhiteSpace(g.Items) ? "Assorted" : g.Items
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "wastage_reasons_chart",
                        Title = "Wastage by Reason",
                        Subtitle = "Breakdown of kitchen spoilage causes",
                        ChartType = "donut",
                        Data = groups.Select(g => new ChartDataPointDto
                        {
                            Label = g.Reason,
                            Value = g.Qty
                        }).ToList()
                    });
                    break;
                }

                case "wastage_cost":
                {
                    result.Title = "Wastage Report — Wastage Cost";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "quantity", Label = "Quantity Lost", Align = "right", Type = "number" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "unitCost", Label = "Unit Cost", Align = "right", Type = "currency" },
                        new() { Key = "totalCost", Label = "Wastage Cost", Align = "right", Type = "currency" },
                        new() { Key = "reason", Label = "Reason", Align = "left", Type = "text" }
                    };

                    decimal totalWastageCost = 0;
                    foreach (var w in wastages)
                    {
                        var cost = w.InventoryItem?.LastPurchasePrice > 0 ? w.InventoryItem.LastPurchasePrice : 45;
                        var costAmount = w.Quantity * cost;
                        totalWastageCost += costAmount;

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["date"] = w.CreatedAt.ToString("yyyy-MM-dd"),
                            ["branchName"] = w.Branch?.Name ?? "Main Branch",
                            ["itemName"] = w.InventoryItem?.Name ?? "Item",
                            ["quantity"] = w.Quantity,
                            ["unit"] = w.InventoryItem?.Unit ?? "Unit",
                            ["unitCost"] = cost,
                            ["totalCost"] = Math.Round(costAmount, 2),
                            ["reason"] = w.Reference ?? "Spoilage"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "wastage_cost_chart",
                        Title = "Wastage Cost Impact (INR)",
                        Subtitle = "Monetary loss incurred from spoiled ingredients",
                        ChartType = "bar",
                        Data = result.Records.GroupBy(r => r["date"]?.ToString() ?? "").Select(g => new ChartDataPointDto
                        {
                            Label = g.Key,
                            Value = g.Sum(x => Convert.ToDecimal(x["totalCost"]))
                        }).ToList()
                    });

                    result.Summary["totalCost"] = totalWastageCost;
                    break;
                }

                case "wastage_quantity":
                default:
                {
                    result.Title = "Wastage Report — Wastage Quantity";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "date", Label = "Date & Time", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "itemName", Label = "Item Name", Align = "left", Type = "text" },
                        new() { Key = "quantity", Label = "Quantity Lost", Align = "right", Type = "number" },
                        new() { Key = "unit", Label = "Unit", Align = "center", Type = "text" },
                        new() { Key = "reason", Label = "Reason / Notes", Align = "left", Type = "text" },
                        new() { Key = "actionedBy", Label = "Recorded By", Align = "left", Type = "text" }
                    };

                    foreach (var w in wastages)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["date"] = w.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["branchName"] = w.Branch?.Name ?? "Main Branch",
                            ["itemName"] = w.InventoryItem?.Name ?? "Item",
                            ["quantity"] = w.Quantity,
                            ["unit"] = w.InventoryItem?.Unit ?? "Unit",
                            ["reason"] = w.Reference ?? (w.Notes ?? "Defective / Spoilage"),
                            ["actionedBy"] = w.CreatedByUser?.Name ?? "Chef"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "wastage_qty_trend",
                        Title = "Wastage Volume Trend",
                        Subtitle = "Units of food waste recorded over time",
                        ChartType = "bar",
                        Data = wastages.GroupBy(w => w.CreatedAt.Date).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key.ToString("dd MMM"),
                            Value = g.Sum(x => x.Quantity)
                        }).OrderBy(x => x.Label).ToList()
                    });

                    result.Summary["totalQuantity"] = wastages.Sum(w => w.Quantity);
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Category 7: Finance Reports

        private async Task<AnalyticsReportResult> BuildFinanceReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            var billsQuery = _context.Bills.AsNoTracking()
                .Include(b => b.Branch)
                .Where(b => b.OrganizationId == orgId && b.GeneratedAt >= start && b.GeneratedAt < end && b.PaymentStatus == "Paid");
            if (branchId.HasValue) billsQuery = billsQuery.Where(b => b.BranchId == branchId.Value);
            var bills = await billsQuery.ToListAsync();

            var purQuery = _context.Purchases.AsNoTracking()
                .Include(p => p.Branch).Include(p => p.Supplier)
                .Where(p => p.OrganizationId == orgId && p.CreatedAt >= start && p.CreatedAt < end);
            if (branchId.HasValue) purQuery = purQuery.Where(p => p.BranchId == branchId.Value);
            var purchases = await purQuery.ToListAsync();

            switch (type)
            {
                case "expenses":
                {
                    result.Title = "Finance Report — Expenses (Procurement)";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "expenseRef", Label = "Invoice / PO #", Align = "left", Type = "text" },
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Expense Category", Align = "left", Type = "text" },
                        new() { Key = "vendorName", Label = "Supplier", Align = "left", Type = "text" },
                        new() { Key = "amount", Label = "Amount", Align = "right", Type = "currency" },
                        new() { Key = "status", Label = "Status", Align = "center", Type = "badge" }
                    };

                    foreach (var p in purchases)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["expenseRef"] = p.InvoiceNumber ?? p.PurchaseNumber,
                            ["date"] = (p.PurchaseDate ?? p.CreatedAt).ToString("yyyy-MM-dd"),
                            ["branchName"] = p.Branch?.Name ?? "Main Branch",
                            ["category"] = "Raw Materials & Supplies",
                            ["vendorName"] = p.Supplier?.Name ?? "Vendor",
                            ["amount"] = p.TotalAmount,
                            ["status"] = p.Status
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "expenses_trend_chart",
                        Title = "Procurement Expense Trend",
                        Subtitle = "Cost of inventory materials purchased",
                        ChartType = "bar",
                        Data = purchases.GroupBy(p => (p.PurchaseDate ?? p.CreatedAt).Date).Select(g => new ChartDataPointDto
                        {
                            Label = g.Key.ToString("dd MMM"),
                            Value = g.Sum(x => x.TotalAmount)
                        }).OrderBy(x => x.Label).ToList()
                    });

                    result.Summary["totalExpenses"] = purchases.Sum(p => p.TotalAmount);
                    break;
                }

                case "cash_summary":
                {
                    result.Title = "Finance Report — Cash Summary";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "date", Label = "Date", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalBills", Label = "Total Bills", Align = "right", Type = "number" },
                        new() { Key = "cashSales", Label = "Cash Sales", Align = "right", Type = "currency" },
                        new() { Key = "upiSales", Label = "UPI Sales", Align = "right", Type = "currency" },
                        new() { Key = "cardSales", Label = "Card Sales", Align = "right", Type = "currency" },
                        new() { Key = "totalSales", Label = "Total Collections", Align = "right", Type = "currency" }
                    };

                    var dailyGroups = bills.GroupBy(b => new { b.GeneratedAt.Date, BranchName = b.Branch?.Name ?? "Main Branch" })
                        .OrderByDescending(g => g.Key.Date).ToList();

                    foreach (var g in dailyGroups)
                    {
                        var cash = g.Where(x => string.Equals(x.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase)).Sum(x => x.GrandTotal);
                        var upi = g.Where(x => string.Equals(x.PaymentMethod, "UPI", StringComparison.OrdinalIgnoreCase)).Sum(x => x.GrandTotal);
                        var card = g.Where(x => string.Equals(x.PaymentMethod, "Card", StringComparison.OrdinalIgnoreCase)).Sum(x => x.GrandTotal);
                        var total = g.Sum(x => x.GrandTotal);

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["date"] = g.Key.Date.ToString("yyyy-MM-dd"),
                            ["branchName"] = g.Key.BranchName,
                            ["totalBills"] = g.Count(),
                            ["cashSales"] = cash,
                            ["upiSales"] = upi,
                            ["cardSales"] = card,
                            ["totalSales"] = total
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "cash_vs_digital_chart",
                        Title = "Cash vs Digital Payment Collections",
                        Subtitle = "Breakdown of cash vs electronic payments",
                        ChartType = "donut",
                        Data = new List<ChartDataPointDto>
                        {
                            new() { Label = "Cash", Value = bills.Where(b => string.Equals(b.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal) },
                            new() { Label = "UPI", Value = bills.Where(b => string.Equals(b.PaymentMethod, "UPI", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal) },
                            new() { Label = "Card", Value = bills.Where(b => string.Equals(b.PaymentMethod, "Card", StringComparison.OrdinalIgnoreCase)).Sum(b => b.GrandTotal) }
                        }
                    });

                    result.Summary["totalSales"] = bills.Sum(b => b.GrandTotal);
                    break;
                }

                case "profit_summary":
                {
                    result.Title = "Finance Report — Profit Summary";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "period", Label = "Period", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "totalRevenue", Label = "Total Revenue", Align = "right", Type = "currency" },
                        new() { Key = "materialCost", Label = "Procurement Cost", Align = "right", Type = "currency" },
                        new() { Key = "grossProfit", Label = "Gross Profit", Align = "right", Type = "currency" },
                        new() { Key = "marginPct", Label = "Gross Margin", Align = "right", Type = "badge" }
                    };

                    var rev = bills.Sum(b => b.GrandTotal);
                    var cost = purchases.Sum(p => p.TotalAmount);
                    var profit = rev - cost;
                    var margin = rev > 0 ? Math.Round((profit / rev) * 100, 1) : 0;

                    result.Records.Add(new Dictionary<string, object?>
                    {
                        ["period"] = $"{start:dd MMM yyyy} – {end.AddDays(-1):dd MMM yyyy}",
                        ["branchName"] = branchId.HasValue ? (bills.FirstOrDefault()?.Branch?.Name ?? "Selected Branch") : "All Branches",
                        ["totalRevenue"] = rev,
                        ["materialCost"] = cost,
                        ["grossProfit"] = profit,
                        ["marginPct"] = $"{margin}%"
                    });

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "profit_summary_chart",
                        Title = "Revenue vs Material Cost & Profit",
                        Subtitle = "Operating profit margin comparison",
                        ChartType = "bar",
                        Data = new List<ChartDataPointDto>
                        {
                            new() { Label = "Total Revenue", Value = rev },
                            new() { Label = "Procurement Cost", Value = cost },
                            new() { Label = "Gross Profit", Value = Math.Max(0, profit) }
                        }
                    });
                    break;
                }

                case "payments":
                default:
                {
                    result.Title = "Finance Report — Payments Ledger";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "billNumber", Label = "Bill #", Align = "left", Type = "text" },
                        new() { Key = "dateTime", Label = "Date & Time", Align = "left", Type = "date" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "paymentMethod", Label = "Payment Mode", Align = "center", Type = "badge" },
                        new() { Key = "subtotal", Label = "Subtotal", Align = "right", Type = "currency" },
                        new() { Key = "discount", Label = "Discount", Align = "right", Type = "currency" },
                        new() { Key = "tax", Label = "GST / Tax", Align = "right", Type = "currency" },
                        new() { Key = "grandTotal", Label = "Net Paid", Align = "right", Type = "currency" }
                    };

                    foreach (var b in bills.Take(250))
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["billNumber"] = b.BillNumber,
                            ["dateTime"] = b.GeneratedAt.ToString("yyyy-MM-dd HH:mm"),
                            ["branchName"] = b.Branch?.Name ?? "Main Branch",
                            ["paymentMethod"] = string.IsNullOrWhiteSpace(b.PaymentMethod) ? "Cash" : b.PaymentMethod,
                            ["subtotal"] = b.Subtotal,
                            ["discount"] = b.Discount,
                            ["tax"] = b.Tax,
                            ["grandTotal"] = b.GrandTotal
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "payments_chart",
                        Title = "Payment Collections by Method",
                        Subtitle = "Collection mode distribution",
                        ChartType = "donut",
                        Data = bills.GroupBy(b => string.IsNullOrWhiteSpace(b.PaymentMethod) ? "Cash" : b.PaymentMethod)
                            .Select(g => new ChartDataPointDto
                            {
                                Label = g.Key,
                                Value = g.Sum(x => x.GrandTotal)
                            }).ToList()
                    });

                    result.Summary["totalPaid"] = bills.Sum(b => b.GrandTotal);
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Category 8: Menu & Food Cost Reports

        private async Task<AnalyticsReportResult> BuildMenuReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            var menuQuery = _context.MenuItems.AsNoTracking()
                .Include(m => m.Branch)
                .Include(m => m.Ingredients).ThenInclude(r => r.InventoryItem)
                .Where(m => m.OrganizationId == orgId && m.IsActive);
            if (branchId.HasValue) menuQuery = menuQuery.Where(m => m.BranchId == branchId.Value);
            var menuItems = await menuQuery.ToListAsync();

            switch (type)
            {
                case "recipe_cost":
                {
                    result.Title = "Menu Report — Recipe Cost";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemName", Label = "Menu Item", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "sellingPrice", Label = "Selling Price", Align = "right", Type = "currency" },
                        new() { Key = "ingredientCount", Label = "Ingredients", Align = "center", Type = "number" },
                        new() { Key = "recipeCost", Label = "Recipe Cost", Align = "right", Type = "currency" },
                        new() { Key = "contributionMargin", Label = "Margin (Profit)", Align = "right", Type = "currency" },
                        new() { Key = "marginPct", Label = "Margin %", Align = "right", Type = "badge" }
                    };

                    foreach (var m in menuItems)
                    {
                        decimal rCost = 0;
                        foreach (var ing in m.Ingredients)
                        {
                            var unitCost = ing.InventoryItem?.LastPurchasePrice > 0 ? ing.InventoryItem.LastPurchasePrice : 40;
                            rCost += ing.Quantity * unitCost;
                        }
                        if (rCost == 0 && m.Price > 0) rCost = Math.Round(m.Price * 0.32m, 2); // standard 32% food cost benchmark

                        var margin = m.Price - rCost;
                        var marginPct = m.Price > 0 ? Math.Round((margin / m.Price) * 100, 1) : 0;

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemName"] = m.Name,
                            ["category"] = m.Category,
                            ["branchName"] = m.Branch?.Name ?? "Main Branch",
                            ["sellingPrice"] = m.Price,
                            ["ingredientCount"] = m.Ingredients.Count,
                            ["recipeCost"] = Math.Round(rCost, 2),
                            ["contributionMargin"] = Math.Round(margin, 2),
                            ["marginPct"] = $"{marginPct}%"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "margin_comparison_chart",
                        Title = "Selling Price vs Recipe Cost Margin",
                        Subtitle = "Cost breakdown for high-volume items",
                        ChartType = "bar",
                        Data = result.Records.Take(10).Select(r => new ChartDataPointDto
                        {
                            Label = r["itemName"]?.ToString() ?? "",
                            Value = Convert.ToDecimal(r["sellingPrice"]),
                            SecondaryValue = Convert.ToDecimal(r["recipeCost"]),
                            SecondaryLabel = "Food Cost",
                            Tooltip = $"Profit: ₹{r["contributionMargin"]}"
                        }).ToList()
                    });
                    break;
                }

                case "food_cost_pct":
                {
                    result.Title = "Menu Report — Food Cost Percentage";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "itemName", Label = "Menu Item", Align = "left", Type = "text" },
                        new() { Key = "category", Label = "Category", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "sellingPrice", Label = "Selling Price", Align = "right", Type = "currency" },
                        new() { Key = "foodCost", Label = "Food Cost", Align = "right", Type = "currency" },
                        new() { Key = "foodCostPct", Label = "Food Cost %", Align = "right", Type = "badge" },
                        new() { Key = "status", Label = "Efficiency", Align = "center", Type = "badge" }
                    };

                    foreach (var m in menuItems)
                    {
                        decimal rCost = 0;
                        foreach (var ing in m.Ingredients)
                        {
                            var unitCost = ing.InventoryItem?.LastPurchasePrice > 0 ? ing.InventoryItem.LastPurchasePrice : 40;
                            rCost += ing.Quantity * unitCost;
                        }
                        if (rCost == 0 && m.Price > 0) rCost = Math.Round(m.Price * 0.30m, 2);

                        var pct = m.Price > 0 ? Math.Round((rCost / m.Price) * 100, 1) : 0;
                        var status = pct <= 32 ? "OPTIMAL" : (pct <= 42 ? "ACCEPTABLE" : "HIGH COST");

                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["itemName"] = m.Name,
                            ["category"] = m.Category,
                            ["branchName"] = m.Branch?.Name ?? "Main Branch",
                            ["sellingPrice"] = m.Price,
                            ["foodCost"] = Math.Round(rCost, 2),
                            ["foodCostPct"] = $"{pct}%",
                            ["status"] = status
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "food_cost_pct_chart",
                        Title = "Food Cost Percentage by Dish",
                        Subtitle = "Cost of ingredients as a percentage of menu price",
                        ChartType = "bar",
                        Data = result.Records.Take(12).Select(r => new ChartDataPointDto
                        {
                            Label = r["itemName"]?.ToString() ?? "",
                            Value = decimal.Parse(r["foodCostPct"]?.ToString()?.Replace("%", "") ?? "0")
                        }).ToList()
                    });
                    break;
                }

                case "best_selling":
                default:
                {
                    result.Title = "Menu Report — Best-Selling Items";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "rank", Label = "#", Align = "center", Type = "number" },
                        new() { Key = "itemName", Label = "Menu Item", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "quantitySold", Label = "Portions Sold", Align = "right", Type = "number" },
                        new() { Key = "unitPrice", Label = "Unit Price", Align = "right", Type = "currency" },
                        new() { Key = "totalRevenue", Label = "Total Revenue", Align = "right", Type = "currency" },
                        new() { Key = "salesShare", Label = "Sales Share", Align = "right", Type = "badge" }
                    };

                    var orderItemsQuery = _context.OrderItems.AsNoTracking()
                        .Include(oi => oi.Order).ThenInclude(o => o!.Branch)
                        .Where(oi => oi.Order != null && oi.Order.OrganizationId == orgId &&
                                     oi.Order.CreatedAt >= start && oi.Order.CreatedAt < end &&
                                     oi.Order.Status != "Cancelled");

                    if (branchId.HasValue) orderItemsQuery = orderItemsQuery.Where(oi => oi.Order!.BranchId == branchId.Value);
                    var items = await orderItemsQuery.ToListAsync();

                    var totalSales = items.Sum(x => x.LineTotal);
                    var grouped = items.GroupBy(i => new { i.MenuItemName, BranchName = i.Order?.Branch?.Name ?? "Main Branch" })
                        .Select(g => new
                        {
                            g.Key.MenuItemName,
                            g.Key.BranchName,
                            Quantity = g.Sum(x => x.Quantity),
                            Sales = g.Sum(x => x.LineTotal),
                            Price = g.Average(x => x.UnitPrice)
                        })
                        .OrderByDescending(x => x.Sales).ToList();

                    int rank = 1;
                    foreach (var g in grouped)
                    {
                        var share = totalSales > 0 ? Math.Round((g.Sales / totalSales) * 100, 1) : 0;
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["rank"] = rank++,
                            ["itemName"] = g.MenuItemName,
                            ["branchName"] = g.BranchName,
                            ["quantitySold"] = g.Quantity,
                            ["unitPrice"] = Math.Round(g.Price, 2),
                            ["totalRevenue"] = g.Sales,
                            ["salesShare"] = $"{share}%"
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "best_sellers_chart",
                        Title = "Top 10 Dishes by Revenue",
                        Subtitle = "Revenue generated by best performing culinary items",
                        ChartType = "horizontal_bar",
                        Data = grouped.Take(10).Select(g => new ChartDataPointDto
                        {
                            Label = g.MenuItemName,
                            Value = g.Sales,
                            Tooltip = $"{g.Quantity} orders"
                        }).ToList()
                    });

                    result.Summary["totalPortions"] = grouped.Sum(g => g.Quantity);
                    result.Summary["totalRevenue"] = totalSales;
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Category 9: Staff & Operations Reports

        private async Task<AnalyticsReportResult> BuildStaffReportsAsync(int orgId, int? branchId, string type, DateTime start, DateTime end)
        {
            var result = new AnalyticsReportResult();

            var ordersQuery = _context.Orders.AsNoTracking()
                .Include(o => o.Branch)
                .Include(o => o.Waiter).ThenInclude(w => w!.Role)
                .Where(o => o.OrganizationId == orgId && o.CreatedAt >= start && o.CreatedAt < end);

            if (branchId.HasValue) ordersQuery = ordersQuery.Where(o => o.BranchId == branchId.Value);
            var orders = await ordersQuery.ToListAsync();

            switch (type)
            {
                case "operational_summary":
                {
                    result.Title = "Operations Report — Operational Summary";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "metric", Label = "Operational Channel / Metric", Align = "left", Type = "text" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "orderCount", Label = "Order Count", Align = "right", Type = "number" },
                        new() { Key = "totalSales", Label = "Total Revenue", Align = "right", Type = "currency" },
                        new() { Key = "avgTicket", Label = "Avg Ticket", Align = "right", Type = "currency" },
                        new() { Key = "share", Label = "Share", Align = "right", Type = "badge" }
                    };

                    var served = orders.Where(o => o.Status != "Cancelled").ToList();
                    var totalRevenue = served.Sum(o => o.TotalAmount);
                    var tableOrders = served.Where(o => o.SaleType != "SELF_SERVICE").ToList();
                    var counterOrders = served.Where(o => o.SaleType == "SELF_SERVICE").ToList();

                    var tableShare = totalRevenue > 0 ? Math.Round((tableOrders.Sum(x => x.TotalAmount) / totalRevenue) * 100, 1) : 0;
                    var counterShare = totalRevenue > 0 ? Math.Round((counterOrders.Sum(x => x.TotalAmount) / totalRevenue) * 100, 1) : 0;

                    result.Records.Add(new Dictionary<string, object?>
                    {
                        ["metric"] = "Dine-In (Table Service)",
                        ["branchName"] = branchId.HasValue ? (orders.FirstOrDefault()?.Branch?.Name ?? "Selected Branch") : "All Branches",
                        ["orderCount"] = tableOrders.Count,
                        ["totalSales"] = tableOrders.Sum(x => x.TotalAmount),
                        ["avgTicket"] = tableOrders.Count > 0 ? Math.Round(tableOrders.Sum(x => x.TotalAmount) / tableOrders.Count, 2) : 0,
                        ["share"] = $"{tableShare}%"
                    });

                    result.Records.Add(new Dictionary<string, object?>
                    {
                        ["metric"] = "Takeaway / Self-Service Counter",
                        ["branchName"] = branchId.HasValue ? (orders.FirstOrDefault()?.Branch?.Name ?? "Selected Branch") : "All Branches",
                        ["orderCount"] = counterOrders.Count,
                        ["totalSales"] = counterOrders.Sum(x => x.TotalAmount),
                        ["avgTicket"] = counterOrders.Count > 0 ? Math.Round(counterOrders.Sum(x => x.TotalAmount) / counterOrders.Count, 2) : 0,
                        ["share"] = $"{counterShare}%"
                    });

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "operational_channels_chart",
                        Title = "Dine-In vs Self-Service Channel Sales",
                        Subtitle = "Revenue distribution by order fulfilment channel",
                        ChartType = "donut",
                        Data = new List<ChartDataPointDto>
                        {
                            new() { Label = "Dine-In (Table Service)", Value = tableOrders.Sum(x => x.TotalAmount) },
                            new() { Label = "Takeaway / Self-Service", Value = counterOrders.Sum(x => x.TotalAmount) }
                        }
                    });
                    break;
                }

                case "staff_activity":
                default:
                {
                    result.Title = "Staff Report — Staff Activity";
                    result.Columns = new List<ReportColumnDto>
                    {
                        new() { Key = "staffName", Label = "Staff Name", Align = "left", Type = "text" },
                        new() { Key = "role", Label = "Role", Align = "center", Type = "badge" },
                        new() { Key = "branchName", Label = "Branch", Align = "left", Type = "text" },
                        new() { Key = "ordersHandled", Label = "Orders Handled", Align = "right", Type = "number" },
                        new() { Key = "servedOrders", Label = "Served Orders", Align = "right", Type = "number" },
                        new() { Key = "totalSales", Label = "Total Sales Generated", Align = "right", Type = "currency" },
                        new() { Key = "avgTicket", Label = "Avg Ticket Size", Align = "right", Type = "currency" }
                    };

                    var groups = orders.GroupBy(o => new
                    {
                        StaffName = o.Waiter?.Name ?? "Counter Staff",
                        Role = o.Waiter?.Role?.Name ?? "Staff",
                        BranchName = o.Branch?.Name ?? "Main Branch"
                    }).Select(g => new
                    {
                        g.Key.StaffName,
                        g.Key.Role,
                        g.Key.BranchName,
                        Total = g.Count(),
                        Served = g.Count(o => o.Status == "Served" || o.Status == "Closed" || o.Status == "Paid" || o.Status == "Ready for Billing"),
                        Sales = g.Where(o => o.Status != "Cancelled").Sum(o => o.TotalAmount)
                    }).OrderByDescending(x => x.Sales).ToList();

                    foreach (var g in groups)
                    {
                        result.Records.Add(new Dictionary<string, object?>
                        {
                            ["staffName"] = g.StaffName,
                            ["role"] = g.Role,
                            ["branchName"] = g.BranchName,
                            ["ordersHandled"] = g.Total,
                            ["servedOrders"] = g.Served,
                            ["totalSales"] = g.Sales,
                            ["avgTicket"] = g.Served > 0 ? Math.Round(g.Sales / g.Served, 2) : 0
                        });
                    }

                    result.Charts.Add(new ReportChartDto
                    {
                        Id = "staff_sales_chart",
                        Title = "Staff Sales Performance",
                        Subtitle = "Revenue generated by service personnel",
                        ChartType = "horizontal_bar",
                        Data = groups.Take(10).Select(g => new ChartDataPointDto
                        {
                            Label = g.StaffName,
                            Value = g.Sales,
                            Tooltip = $"{g.Served} served orders"
                        }).ToList()
                    });
                    break;
                }
            }

            return result;
        }

        #endregion

        #region Helpers

        private static DateTime ParseDateStart(string? value, DateTime defaultVal)
        {
            if (string.IsNullOrWhiteSpace(value)) return defaultVal;
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) return d.Date;
            if (DateTime.TryParse(value, out var d2)) return d2.Date;
            return defaultVal;
        }

        private static DateTime ParseDateEnd(string? value, DateTime defaultVal)
        {
            if (string.IsNullOrWhiteSpace(value)) return defaultVal.Date.AddDays(1);
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) return d.Date.AddDays(1);
            if (DateTime.TryParse(value, out var d2)) return d2.Date.AddDays(1);
            return defaultVal.Date.AddDays(1);
        }

        private static string EscapeCsvField(object? value)
        {
            if (value == null) return "\"\"";
            var str = value.ToString() ?? "";
            if (str.Contains("\"") || str.Contains(",") || str.Contains("\n") || str.Contains("\r"))
            {
                return $"\"{str.Replace("\"", "\"\"")}\"";
            }
            return $"\"{str}\"";
        }

        #endregion
    }

    public class ReportColumnDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Align { get; set; } = "left"; // left, right, center
        public string Type { get; set; } = "text";  // text, currency, number, date, badge
    }

    public class ChartDataPointDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public decimal? SecondaryValue { get; set; }
        public string? SecondaryLabel { get; set; }
        public string? Tooltip { get; set; }
    }

    public class ReportChartDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Subtitle { get; set; } = string.Empty;
        public string ChartType { get; set; } = "bar"; // bar, line, donut, horizontal_bar
        public List<ChartDataPointDto> Data { get; set; } = new();
    }

    public class AnalyticsReportResult
    {
        public string Title { get; set; } = string.Empty;
        public List<ReportColumnDto> Columns { get; set; } = new();
        public List<Dictionary<string, object?>> Records { get; set; } = new();
        public Dictionary<string, object?> Summary { get; set; } = new();
        public List<ReportChartDto> Charts { get; set; } = new();
    }
}
