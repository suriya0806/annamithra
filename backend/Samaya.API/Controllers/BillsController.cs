using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/bills")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
    public class BillsController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        public BillsController(SamayaDbContext context) => _context = context;

        [HttpGet]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? branchId = null,
            [FromQuery] string? search = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            [FromQuery] string? paymentStatus = null,
            [FromQuery] string? saleType = null,
            [FromQuery] int limit = 100)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();
            if (AuthorizationHelper.IsBranchUser(User)) branchId = AuthorizationHelper.GetBranchId(User);

            var query = _context.Bills
                .AsNoTracking()
                .Include(b => b.Organization)
                .Include(b => b.Branch)
                .Include(b => b.Waiter)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Items)
                .Where(b => b.OrganizationId == orgId.Value);

            if (branchId.HasValue)
            {
                var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId.Value);
                if (branch?.ModuleType == "KMS Only")
                {
                    return Ok(new List<object>());
                }
                query = query.Where(b => b.BranchId == branchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(saleType))
            {
                query = query.Where(b => b.SaleType.ToLower() == saleType.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(b =>
                    b.BillNumber.ToLower().Contains(term) ||
                    (b.CustomerName != null && b.CustomerName.ToLower().Contains(term)) ||
                    (b.TableNumber != null && b.TableNumber.ToLower().Contains(term)) ||
                    (b.Order != null && b.Order.OrderNumber.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(paymentStatus))
            {
                query = query.Where(b => b.PaymentStatus.ToLower() == paymentStatus.Trim().ToLower());
            }

            if (DateTime.TryParse(from, out var fromDt))
            {
                query = query.Where(b => b.GeneratedAt >= fromDt);
            }

            if (DateTime.TryParse(to, out var toDt))
            {
                var endOfDay = toDt.Date.AddDays(1).AddTicks(-1);
                query = query.Where(b => b.GeneratedAt <= endOfDay);
            }

            var bills = await query
                .OrderByDescending(b => b.GeneratedAt)
                .Take(Math.Min(limit, 200))
                .Select(b => new
                {
                    b.Id,
                    b.BillNumber,
                    b.OrderId,
                    orderNumber = b.Order != null ? b.Order.OrderNumber : "—",
                    saleType = b.SaleType ?? "TABLE_SERVICE",
                    b.CustomerName,
                    b.TableNumber,
                    waiterId = b.WaiterId,
                    waiterName = b.Waiter != null ? b.Waiter.Name : "Staff",
                    organizationId = b.OrganizationId,
                    organizationName = b.Organization != null ? b.Organization.Name : "—",
                    branchId = b.BranchId,
                    branchName = b.Branch != null ? b.Branch.Name : "—",
                    branchAddress = b.Branch != null ? b.Branch.Address : "—",
                    branchCity = b.Branch != null ? b.Branch.City : "—",
                    branchPhone = b.Branch != null ? b.Branch.Phone : "—",
                    b.Subtotal,
                    cgst = Math.Round(b.Tax / 2, 2),
                    sgst = Math.Round(b.Tax / 2, 2),
                    b.Tax,
                    b.Discount,
                    b.GrandTotal,
                    b.PaymentStatus,
                    b.PaymentMethod,
                    amountTendered = b.AmountTendered,
                    changeGiven = b.ChangeGiven,
                    voidReason = b.VoidReason,
                    voidedAt = b.VoidedAt,
                    b.GeneratedAt,
                    b.PaidAt,
                    items = b.Order == null ? null : b.Order.Items.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal,
                        i.KOTNumber
                    })
                })
                .ToListAsync();

            return Ok(bills);
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> GetById(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var bill = await _context.Bills
                .AsNoTracking()
                .Include(b => b.Organization)
                .Include(b => b.Branch)
                .Include(b => b.Waiter)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Items)
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId.Value);

            if (bill == null) return NotFound(new { message = "Bill not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, bill.BranchId))
                return Forbid();

            return Ok(new
            {
                bill.Id,
                bill.BillNumber,
                bill.OrderId,
                orderNumber = bill.Order?.OrderNumber ?? "—",
                saleType = bill.SaleType ?? "TABLE_SERVICE",
                bill.CustomerName,
                bill.TableNumber,
                waiterId = bill.WaiterId,
                waiterName = bill.Waiter?.Name ?? "Waiter",
                organizationId = bill.OrganizationId,
                organizationName = bill.Organization?.Name ?? "—",
                branchId = bill.BranchId,
                branchName = bill.Branch?.Name ?? "—",
                branchAddress = bill.Branch?.Address ?? "—",
                branchCity = bill.Branch?.City ?? "—",
                branchPhone = bill.Branch?.Phone ?? "—",
                bill.Subtotal,
                cgst = Math.Round(bill.Tax / 2, 2),
                sgst = Math.Round(bill.Tax / 2, 2),
                bill.Tax,
                bill.Discount,
                bill.GrandTotal,
                bill.PaymentStatus,
                bill.PaymentMethod,
                amountTendered = bill.AmountTendered,
                changeGiven = bill.ChangeGiven,
                voidReason = bill.VoidReason,
                voidedAt = bill.VoidedAt,
                bill.GeneratedAt,
                bill.PaidAt,
                items = bill.Order?.Items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    i.MenuItemName,
                    i.Quantity,
                    i.UnitPrice,
                    i.LineTotal,
                    i.KOTNumber
                }) ?? Enumerable.Empty<object>()
            });
        }

        [HttpGet("order/{orderId:int}")]
        public async Task<IActionResult> GetByOrderId(int orderId)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var bill = await _context.Bills
                .AsNoTracking()
                .Include(b => b.Organization)
                .Include(b => b.Branch)
                .Include(b => b.Waiter)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Items)
                .FirstOrDefaultAsync(b => b.OrderId == orderId && b.OrganizationId == orgId.Value);

            if (bill == null) return NotFound(new { message = "Bill not found for this order." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, bill.BranchId))
                return Forbid();

            return Ok(new
            {
                bill.Id,
                bill.BillNumber,
                bill.OrderId,
                orderNumber = bill.Order?.OrderNumber ?? "—",
                saleType = bill.SaleType ?? "TABLE_SERVICE",
                bill.CustomerName,
                bill.TableNumber,
                waiterId = bill.WaiterId,
                waiterName = bill.Waiter?.Name ?? "Waiter",
                organizationId = bill.OrganizationId,
                organizationName = bill.Organization?.Name ?? "—",
                branchId = bill.BranchId,
                branchName = bill.Branch?.Name ?? "—",
                branchAddress = bill.Branch?.Address ?? "—",
                branchCity = bill.Branch?.City ?? "—",
                branchPhone = bill.Branch?.Phone ?? "—",
                bill.Subtotal,
                cgst = Math.Round(bill.Tax / 2, 2),
                sgst = Math.Round(bill.Tax / 2, 2),
                bill.Tax,
                bill.Discount,
                bill.GrandTotal,
                bill.PaymentStatus,
                bill.PaymentMethod,
                amountTendered = bill.AmountTendered,
                changeGiven = bill.ChangeGiven,
                voidReason = bill.VoidReason,
                voidedAt = bill.VoidedAt,
                bill.GeneratedAt,
                bill.PaidAt,
                items = bill.Order?.Items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    i.MenuItemName,
                    i.Quantity,
                    i.UnitPrice,
                    i.LineTotal,
                    i.KOTNumber
                }) ?? Enumerable.Empty<object>()
            });
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> GenerateBill([FromBody] GenerateBillRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Waiter)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.OrganizationId == orgId.Value);

            if (order == null) return NotFound(new { message = "Order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, order.BranchId))
                return Forbid();

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == order.BranchId && b.OrganizationId == orgId.Value);
            if (branch?.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "POS billing is disabled for KMS Only branches." });
            }

            var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId.Value);

            // Check if bill already exists (Section 16: Verify the bill cannot be generated twice)
            var existing = await _context.Bills
                .Include(b => b.Organization)
                .Include(b => b.Branch)
                .Include(b => b.Waiter)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Items)
                .FirstOrDefaultAsync(b => b.OrderId == order.Id);
            if (existing != null)
            {
                return Ok(new
                {
                    message = "Bill already exists for this order.",
                    bill = new
                    {
                        existing.Id,
                        existing.BillNumber,
                        existing.OrderId,
                        orderNumber = order.OrderNumber,
                        saleType = existing.SaleType ?? order.SaleType ?? "TABLE_SERVICE",
                        existing.CustomerName,
                        existing.TableNumber,
                        waiterId = existing.WaiterId,
                        waiterName = existing.Waiter?.Name ?? order.Waiter?.Name ?? "Waiter",
                        organizationId = existing.OrganizationId,
                        organizationName = existing.Organization?.Name ?? org?.Name ?? "—",
                        branchId = existing.BranchId,
                        branchName = existing.Branch?.Name ?? "—",
                        branchAddress = existing.Branch?.Address ?? "—",
                        branchCity = existing.Branch?.City ?? "—",
                        branchPhone = existing.Branch?.Phone ?? "—",
                        existing.Subtotal,
                        cgst = Math.Round(existing.Tax / 2, 2),
                        sgst = Math.Round(existing.Tax / 2, 2),
                        existing.Tax,
                        existing.Discount,
                        existing.GrandTotal,
                        existing.PaymentStatus,
                        existing.PaymentMethod,
                        amountTendered = existing.AmountTendered,
                        changeGiven = existing.ChangeGiven,
                        voidReason = existing.VoidReason,
                        voidedAt = existing.VoidedAt,
                        existing.GeneratedAt,
                        items = order.Items.Select(i => new
                        {
                            i.Id,
                            i.MenuItemId,
                            i.MenuItemName,
                            i.Quantity,
                            i.UnitPrice,
                            i.LineTotal
                        }).ToList()
                    }
                });
            }

            // Close table / finalize order
            order.Status = "Closed";
            order.ClosedAt ??= DateTime.UtcNow;
            order.Subtotal = order.Items.Sum(i => i.LineTotal);
            var discount = request.Discount ?? order.Discount;
            order.Discount = discount;
            order.Tax = Math.Round(Math.Max(0, order.Subtotal - discount) * 0.05m, 2);
            order.TotalAmount = Math.Max(0, order.Subtotal - discount) + order.Tax;

            var billSeq = (await _context.Bills.CountAsync(b => b.OrganizationId == orgId.Value && b.GeneratedAt.Year == DateTime.UtcNow.Year)) + 1;
            var bill = new Bill
            {
                OrganizationId = orgId.Value,
                BranchId = order.BranchId,
                OrderId = order.Id,
                BillNumber = $"BILL-{DateTime.UtcNow.Year}-{billSeq:D4}",
                SaleType = order.SaleType ?? "TABLE_SERVICE",
                CustomerName = order.CustomerName,
                TableNumber = order.TableNumber,
                WaiterId = order.WaiterId,
                Subtotal = order.Subtotal,
                Discount = order.Discount,
                Tax = order.Tax,
                GrandTotal = order.TotalAmount,
                PaymentStatus = "Pending",
                GeneratedAt = DateTime.UtcNow
            };

            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();

            if (branch == null)
            {
                branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == order.BranchId);
            }

            return Ok(new
            {
                message = "Final bill generated.",
                bill = new
                {
                    bill.Id,
                    bill.BillNumber,
                    bill.OrderId,
                    orderNumber = order.OrderNumber,
                    saleType = bill.SaleType,
                    bill.CustomerName,
                    bill.TableNumber,
                    waiterId = bill.WaiterId,
                    waiterName = order.Waiter?.Name ?? "Waiter",
                    organizationId = bill.OrganizationId,
                    organizationName = org?.Name ?? "—",
                    branchId = bill.BranchId,
                    branchName = branch?.Name ?? "—",
                    branchAddress = branch?.Address ?? "—",
                    branchCity = branch?.City ?? "—",
                    branchPhone = branch?.Phone ?? "—",
                    bill.Subtotal,
                    cgst = Math.Round(bill.Tax / 2, 2),
                    sgst = Math.Round(bill.Tax / 2, 2),
                    bill.Tax,
                    bill.Discount,
                    bill.GrandTotal,
                    bill.PaymentStatus,
                    bill.PaymentMethod,
                    amountTendered = bill.AmountTendered,
                    changeGiven = bill.ChangeGiven,
                    voidReason = bill.VoidReason,
                    voidedAt = bill.VoidedAt,
                    bill.GeneratedAt,
                    items = order.Items.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal
                    }).ToList()
                }
            });
        }

        [HttpPost("{id:int}/pay")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant,Cashier")]
        public async Task<IActionResult> PayBill(int id, [FromBody] PayBillRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var bill = await _context.Bills
                .Include(b => b.Order)
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId.Value);

            if (bill == null) return NotFound(new { message = "Bill not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, bill.BranchId))
                return Forbid();

            var method = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim();
            bill.PaymentStatus = "Paid";
            bill.PaymentMethod = method;
            bill.PaidAt = DateTime.UtcNow;

            if (request.AmountTendered.HasValue)
            {
                bill.AmountTendered = request.AmountTendered.Value;
                bill.ChangeGiven = Math.Max(0, request.AmountTendered.Value - bill.GrandTotal);
            }

            if (bill.Order != null)
            {
                bill.Order.Status = "Closed";
                bill.Order.ClosedAt ??= DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = bill.SaleType == "SELF_SERVICE" ? "Counter sale payment received." : "Payment received. Table is now available.",
                billId = bill.Id,
                billNumber = bill.BillNumber,
                saleType = bill.SaleType ?? "TABLE_SERVICE",
                paymentStatus = bill.PaymentStatus,
                paymentMethod = bill.PaymentMethod,
                amountTendered = bill.AmountTendered,
                changeGiven = bill.ChangeGiven,
                paidAt = bill.PaidAt,
                tableNumber = bill.TableNumber
            });
        }

        [HttpPost("{id:int}/void")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Accountant")]
        public async Task<IActionResult> VoidBill(int id, [FromBody] VoidBillRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var bill = await _context.Bills
                .Include(b => b.Order)
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId.Value);

            if (bill == null) return NotFound(new { message = "Bill not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, bill.BranchId))
                return Forbid();

            if (bill.PaymentStatus == "Voided")
                return BadRequest(new { message = "Bill is already voided." });

            bill.PaymentStatus = "Voided";
            bill.VoidReason = string.IsNullOrWhiteSpace(request.Reason) ? "Voided by manager/admin" : request.Reason.Trim();
            bill.VoidedAt = DateTime.UtcNow;

            if (bill.Order != null)
            {
                bill.Order.Status = "Cancelled";
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Bill voided successfully.",
                billId = bill.Id,
                billNumber = bill.BillNumber,
                paymentStatus = bill.PaymentStatus,
                voidReason = bill.VoidReason,
                voidedAt = bill.VoidedAt
            });
        }

        private int? GetUserId() => int.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value, out var id) ? id : null;
    }

    public class GenerateBillRequest
    {
        public int OrderId { get; set; }
        public decimal? Discount { get; set; }
    }

    public class PayBillRequest
    {
        public string PaymentMethod { get; set; } = "Cash";
        public decimal? AmountTendered { get; set; }
    }

    public class VoidBillRequest
    {
        public string? Reason { get; set; }
    }
}
